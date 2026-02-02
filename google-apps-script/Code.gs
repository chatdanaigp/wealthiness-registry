/**
 * Wealthiness Registry - Google Apps Script (TEST VERSION - 5 MINUTE EXPIRY)
 * 
 * !!! IMPORTANT: HEADER ROW STRUCTURE !!!
 * Row 1 MUST have these headers in exact order:
 * A: connext_id | B: referal_ID | C: nickname | D: name | E: surname
 * F: province_country | G: phone_number | H: transfer_slip | I: status
 * J: discord_id | K: expire_at | L: submitted_at | M: approved_at | N: role_added
 * 
 * FLOW:
 * 1. User registers -> Gets "Pending" Role -> Sees #waiting-room only
 * 2. Admin changes status to "Approved Trial Access" -> Pending removed, Trial Access added
 * 3. After 5 minutes -> User kicked from server
 * 
 * TRIGGERS NEEDED:
 * - onEdit: Installable trigger for editing (simple trigger doesn't work for external API calls)
 * - checkExpiredMembers: Time-driven trigger, every 1 minute
 */

// ============ CONFIGURATION ============
const CONFIG = {
  SHEET_ID: '1m4lWxWdMOvKMQWMbbAB2UHvH4VOgbg1zBwBdRBXGWOM',
  SHEET_NAME: 'data',
  DRIVE_FOLDER_ID: '1UoPSQt47fRQVbn265BhSqHp0GRPFUIVy',
  DISCORD_BOT_TOKEN: 'MTQ2NzU2OTk2MDg3OTUyMTg3Mg.G1v6vi.5n3X1HHAddneaa1YZIBT7PtcnnGQuaAB0HAjaw',
  DISCORD_GUILD_ID: '1108710714253778945',
  DISCORD_PENDING_ROLE_ID: '1467623644380528832',
  DISCORD_VIP_ROLE_ID: '1467593168844361846',
  VIP_DURATION_MINUTES: 5,
  TIMEZONE: 'Asia/Bangkok',
};

// Column indices (0-based)
const COLUMNS = {
  CONNEXT_ID: 0,        // A
  REFERAL_ID: 1,        // B
  NICKNAME: 2,          // C
  NAME: 3,              // D
  SURNAME: 4,           // E
  PROVINCE_COUNTRY: 5,  // F
  PHONE_NUMBER: 6,      // G
  TRANSFER_SLIP: 7,     // H
  STATUS: 8,            // I
  DISCORD_ID: 9,        // J - format: username (ID)
  EXPIRE_AT: 10,        // K - expiry time (Thailand)
  SUBMITTED_AT: 11,     // L
  APPROVED_AT: 12,      // M
  ROLE_ADDED: 13,       // N
};

function getThailandTime(date = new Date()) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function doGet(e) {
  try {
    const params = e.parameter;
    const searchUsername = params.username;
    
    if (!searchUsername) {
      return ContentService.createTextOutput(JSON.stringify({ 
        found: false, 
        message: 'No username provided' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const discordInfo = String(row[COLUMNS.DISCORD_ID] || '');
      
      if (discordInfo.toLowerCase().includes(searchUsername.toLowerCase())) {
        return ContentService.createTextOutput(JSON.stringify({
          found: true,
          status: row[COLUMNS.STATUS],
          expiresAt: row[COLUMNS.EXPIRE_AT],
          discordInfo: discordInfo
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      found: false,
      message: 'User not found'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    let slipLink = '';
    if (data.transferSlipBase64) {
      slipLink = saveImageToDrive(
        data.transferSlipBase64,
        data.transferSlipName,
        data.transferSlipType
      );
    }
    
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    // Format: username (ID)
    const discordInfo = `${data.discord_username} (${data.discord_id})`;
    
    const rowData = [
      data.connext_id,           // A
      data.referal_ID,           // B
      data.nickname,             // C
      data.name,                 // D
      data.surname,              // E
      data.province_country,     // F
      data.phone_number,         // G
      slipLink,                  // H
      'pending',                 // I - status
      discordInfo,               // J - discord info
      '',                        // K - expire_at (set when approved)
      getThailandTime(),         // L - submitted_at
      '',                        // M - approved_at
      'FALSE',                   // N - role_added
    ];
    
    sheet.appendRow(rowData);
    
    // Add Pending role
    if (data.discord_id) {
      const pendingRoleAdded = addPendingRole(data.discord_id);
      console.log(`📌 Pending role added for ${data.discord_id}: ${pendingRoleAdded}`);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Registration saved successfully',
        driveLink: slipLink,
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveImageToDrive(base64Data, fileName, mimeType) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (error) {
    return 'Error saving image';
  }
}

/**
 * IMPORTANT: This must be set up as an INSTALLABLE trigger, not just saved in code
 * Go to: Triggers (clock icon) > Add Trigger > onEditTrigger > From spreadsheet > On edit
 */
function onEditTrigger(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    console.log(`📝 onEditTrigger fired: Sheet=${sheet.getName()}, Column=${range.getColumn()}, Row=${range.getRow()}`);
    
    if (sheet.getName() !== CONFIG.SHEET_NAME) {
      console.log('❌ Wrong sheet, ignoring');
      return;
    }
    
    // Column I (STATUS) = index 9 (1-based)
    if (range.getColumn() !== COLUMNS.STATUS + 1) {
      console.log(`❌ Wrong column (${range.getColumn()}), expecting ${COLUMNS.STATUS + 1}`);
      return;
    }
    
    const newValue = String(e.value || '').toLowerCase();
    const row = range.getRow();
    
    console.log(`📋 Status changed to: "${newValue}" at row ${row}`);
    
    if (newValue.includes('approved')) {
      console.log('✅ Processing approval...');
      processApproval(sheet, row);
    }
  } catch (error) {
    console.error('❌ Error in onEditTrigger:', error);
  }
}

// Keep simple onEdit for backward compatibility (won't work for API calls though)
function onEdit(e) {
  onEditTrigger(e);
}

function extractDiscordId(discordInfo) {
  // Format: username (ID) or ID (username)
  const match = String(discordInfo).match(/\((\d+)\)/);
  if (match) return match[1];
  
  // Try format: ID (username)
  const match2 = String(discordInfo).match(/^(\d+)/);
  return match2 ? match2[1] : null;
}

function processApproval(sheet, row) {
  try {
    const rowData = sheet.getRange(row, 1, 1, 14).getValues()[0];
    const discordInfo = rowData[COLUMNS.DISCORD_ID];
    const roleAdded = String(rowData[COLUMNS.ROLE_ADDED]).toUpperCase();
    
    console.log(`🔍 Processing row ${row}: discordInfo=${discordInfo}, roleAdded=${roleAdded}`);
    
    if (roleAdded === 'TRUE') {
      console.log('⏭️ Role already added, skipping');
      return;
    }
    
    const discordId = extractDiscordId(discordInfo);
    if (!discordId) {
      console.log('❌ No Discord ID found in:', discordInfo);
      return;
    }
    
    console.log(`🎯 Discord ID: ${discordId}`);
    
    // Remove Pending role
    const pendingRemoved = removePendingRole(discordId);
    console.log(`🔴 Pending role removed: ${pendingRemoved}`);
    
    // Add Trial Access role
    const trialAdded = addTrialAccessRole(discordId);
    console.log(`🟢 Trial Access role added: ${trialAdded}`);
    
    if (trialAdded) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (CONFIG.VIP_DURATION_MINUTES * 60 * 1000));
      
      // Update cells
      sheet.getRange(row, COLUMNS.EXPIRE_AT + 1).setValue(getThailandTime(expiresAt));
      sheet.getRange(row, COLUMNS.APPROVED_AT + 1).setValue(getThailandTime(now));
      sheet.getRange(row, COLUMNS.ROLE_ADDED + 1).setValue('TRUE');
      
      console.log(`✅ Approved! Expires at: ${getThailandTime(expiresAt)}`);
    }
  } catch (error) {
    console.error('❌ Error processing approval:', error);
  }
}

function addPendingRole(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${CONFIG.DISCORD_PENDING_ROLE_ID}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    console.log(`addPendingRole response: ${code}`);
    return code === 204 || code === 200;
  } catch (error) {
    console.error('Error adding pending role:', error);
    return false;
  }
}

function removePendingRole(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${CONFIG.DISCORD_PENDING_ROLE_ID}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    console.log(`removePendingRole response: ${code}`);
    return code === 204 || code === 200;
  } catch (error) {
    console.error('Error removing pending role:', error);
    return false;
  }
}

function addTrialAccessRole(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${CONFIG.DISCORD_VIP_ROLE_ID}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    console.log(`addTrialAccessRole response: ${code}`);
    return code === 204 || code === 200;
  } catch (error) {
    console.error('Error adding trial access role:', error);
    return false;
  }
}

function kickDiscordUser(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    console.log(`kickDiscordUser response: ${code}`);
    return code === 204 || code === 200;
  } catch (error) {
    console.error('Error kicking user:', error);
    return false;
  }
}

function parseThailandTime(timeString) {
  const parts = String(timeString).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return null;
  const thaiDate = new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
  return new Date(thaiDate.getTime() - (7 * 60 * 60 * 1000)); // Convert to UTC
}

function checkExpiredMembers() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    
    console.log(`⏰ Running expiry check at ${getThailandTime(now)}`);
    
    let checkedCount = 0;
    let expiredCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = String(row[COLUMNS.STATUS] || '').toLowerCase();
      const expireAt = row[COLUMNS.EXPIRE_AT];
      const discordInfo = row[COLUMNS.DISCORD_ID];
      const roleAdded = String(row[COLUMNS.ROLE_ADDED]).toUpperCase();
      
      if (!status.includes('approved') || roleAdded !== 'TRUE') continue;
      
      checkedCount++;
      
      if (expireAt) {
        const expiryDate = parseThailandTime(expireAt);
        if (!expiryDate) {
          console.log(`⚠️ Row ${i + 1}: Invalid expire_at format: ${expireAt}`);
          continue;
        }
        
        const discordId = extractDiscordId(discordInfo);
        console.log(`🔍 Row ${i + 1}: ${discordId} expires at ${expireAt}`);
        
        if (now > expiryDate) {
          console.log(`⏰ EXPIRED: ${discordId}`);
          const kicked = kickDiscordUser(discordId);
          if (kicked) {
            sheet.getRange(i + 1, COLUMNS.STATUS + 1).setValue('expired');
            sheet.getRange(i + 1, COLUMNS.ROLE_ADDED + 1).setValue('FALSE');
            expiredCount++;
            console.log(`✅ Kicked and marked expired: ${discordId}`);
          }
        }
      }
    }
    
    console.log(`📊 Checked ${checkedCount} approved users, expired ${expiredCount}`);
  } catch (error) {
    console.error('❌ Error checking expired members:', error);
  }
}

function testCheckExpiredMembers() {
  checkExpiredMembers();
}

/**
 * Run this ONCE to set up triggers
 */
function setupAllTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create onEdit installable trigger
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(CONFIG.SHEET_ID)
    .onEdit()
    .create();
  console.log('✅ onEditTrigger installed');
  
  // Create time-driven trigger for expiry check
  ScriptApp.newTrigger('checkExpiredMembers')
    .timeBased()
    .everyMinutes(1)
    .create();
  console.log('✅ checkExpiredMembers trigger installed (every 1 minute)');
  
  console.log('🎉 All triggers set up successfully!');
}

/**
 * Manual test: Process approval for a specific row
 */
function testProcessApprovalRow2() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  processApproval(sheet, 2);
}
