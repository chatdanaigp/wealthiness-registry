/**
 * Wealthiness Registry - Google Apps Script (TEST VERSION - 5 MINUTE EXPIRY)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets: https://docs.google.com/spreadsheets/d/1m4lWxWdMOvKMQWMbbAB2UHvH4VOgbg1zBwBdRBXGWOM/edit
 * 2. Go to Extensions > Apps Script
 * 3. Delete existing code and paste this entire file
 * 4. Click Deploy > Manage deployments > Edit > New version > Deploy
 * 
 * !!! TESTING MODE !!!
 * - VIP Duration is set to 5 MINUTES
 * - You MUST set the Time-Driven Trigger to "Every Minute" to test this properly.
 * 
 * FLOW:
 * 1. User registers -> Gets "Pending" Role automatically -> Can see #waiting-room
 * 2. Admin approves (changes status to "Approved Trial Access" in sheet) -> "Pending" Role removed, "Trial Access" Role added
 * 3. After 5 minutes (or 7 days in production) -> User kicked from server
 * 
 * COLUMN STRUCTURE (A-N):
 * A: connext_id
 * B: referal_ID  
 * C: nickname
 * D: name
 * E: surname
 * F: province_country
 * G: phone_number
 * H: transfer_slip
 * I: status (pending / Approved Trial Access / expired)
 * J: discord_info (Discord ID และ Username รวมกัน)
 * K: expires_at (วันหมดอายุ)
 * L: submitted_at
 * M: approved_at
 * N: role_added
 */

// ============ CONFIGURATION ============
const CONFIG = {
  // Google Sheet ID
  SHEET_ID: '1m4lWxWdMOvKMQWMbbAB2UHvH4VOgbg1zBwBdRBXGWOM',
  
  // Sheet name for data
  SHEET_NAME: 'data',
  
  // Google Drive folder ID for slip images
  DRIVE_FOLDER_ID: '1UoPSQt47fRQVbn265BhSqHp0GRPFUIVy',
  
  // Discord Bot Token
  DISCORD_BOT_TOKEN: 'MTQ2NzU2OTk2MDg3OTUyMTg3Mg.G1v6vi.5n3X1HHAddneaa1YZIBT7PtcnnGQuaAB0HAjaw',
  
  // Discord Server (Guild) ID
  DISCORD_GUILD_ID: '1108710714253778945',
  
  // Pending Role ID (assigned when user registers, before admin approval)
  DISCORD_PENDING_ROLE_ID: '1467623644380528832',
  
  // Trial Access Role ID (assigned after admin approval)
  DISCORD_VIP_ROLE_ID: '1467593168844361846',
  
  // VIP duration in minutes (FOR TESTING: 5 minutes, PRODUCTION: 7 * 24 * 60 = 10080 minutes)
  VIP_DURATION_MINUTES: 5,
  
  // Timezone offset for Thailand (GMT+7)
  TIMEZONE: 'Asia/Bangkok',
};

// Column indices (0-based) - NEW STRUCTURE
const COLUMNS = {
  CONNEXT_ID: 0,        // A - connext_id
  REFERAL_ID: 1,        // B - referal_ID
  NICKNAME: 2,          // C - nickname
  NAME: 3,              // D - name
  SURNAME: 4,           // E - surname
  PROVINCE_COUNTRY: 5,  // F - province_country
  PHONE_NUMBER: 6,      // G - phone_number
  TRANSFER_SLIP: 7,     // H - transfer_slip
  STATUS: 8,            // I - status (pending/Approved Trial Access/expired)
  DISCORD_INFO: 9,      // J - discord info (ID + Username combined)
  EXPIRES_AT: 10,       // K - expires_at (Thailand time)
  SUBMITTED_AT: 11,     // L - submitted_at
  APPROVED_AT: 12,      // M - approved_at
  ROLE_ADDED: 13,       // N - role_added
};

/**
 * Get current Thailand time as formatted string
 */
function getThailandTime(date = new Date()) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Handle GET requests (Check status)
 */
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
    
    // Search in Column J (Discord Info - contains username)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const discordInfo = String(row[COLUMNS.DISCORD_INFO] || '');
      
      // Check if username is in the discord info
      if (discordInfo.includes(searchUsername)) {
        return ContentService.createTextOutput(JSON.stringify({
          found: true,
          status: row[COLUMNS.STATUS],
          expiresAt: row[COLUMNS.EXPIRES_AT],
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

/**
 * Handle POST requests from the web app
 */
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
    
    // Combine Discord ID and Username into one field
    const discordInfo = `${data.discord_id} (${data.discord_username})`;
    
    const rowData = [
      data.connext_id,                    // A - connext_id
      data.referal_ID,                    // B - referal_ID
      data.nickname,                      // C - nickname
      data.name,                          // D - name
      data.surname,                       // E - surname
      data.province_country,              // F - province_country
      data.phone_number,                  // G - phone_number
      slipLink,                           // H - transfer_slip
      'pending',                          // I - status
      discordInfo,                        // J - discord info (ID + Username)
      '',                                 // K - expires_at (set when approved)
      getThailandTime(),                  // L - submitted_at (Thailand time)
      '',                                 // M - approved_at
      false,                              // N - role_added
    ];
    
    sheet.appendRow(rowData);
    
    // Add Pending role to user when they register
    if (data.discord_id) {
      const pendingRoleAdded = addPendingRole(data.discord_id);
      console.log(`Pending role added for ${data.discord_id}: ${pendingRoleAdded}`);
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

/**
 * Save image to Google Drive
 */
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
 * Trigger when admin edits the sheet (changes status to "Approved Trial Access")
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  if (range.getColumn() !== COLUMNS.STATUS + 1) return;
  
  const newValue = e.value;
  const row = range.getRow();
  
  // Check for "Approved Trial Access" status
  if (newValue && newValue.toLowerCase().includes('approved')) {
    processApproval(sheet, row);
  }
}

/**
 * Extract Discord ID from discord info string like "123456789 (username)"
 */
function extractDiscordId(discordInfo) {
  const match = String(discordInfo).match(/^(\d+)/);
  return match ? match[1] : null;
}

/**
 * Process user approval - remove Pending role, add Trial Access role
 */
function processApproval(sheet, row) {
  try {
    const rowData = sheet.getRange(row, 1, 1, 14).getValues()[0];
    const discordInfo = rowData[COLUMNS.DISCORD_INFO];
    const roleAdded = rowData[COLUMNS.ROLE_ADDED];
    
    if (roleAdded === true || roleAdded === 'true' || roleAdded === 'TRUE') {
      return;
    }
    
    const discordId = extractDiscordId(discordInfo);
    if (!discordId) {
      console.log('No Discord ID found in:', discordInfo);
      return;
    }
    
    // Remove Pending role first
    removePendingRole(discordId);
    
    // Add Trial Access Role
    const success = addTrialAccessRole(discordId);
    
    if (success) {
      const now = new Date();
      
      // Calculate expiry time (Thailand timezone)
      const expiresAt = new Date(now.getTime() + (CONFIG.VIP_DURATION_MINUTES * 60 * 1000));
      
      sheet.getRange(row, COLUMNS.APPROVED_AT + 1).setValue(getThailandTime(now));
      sheet.getRange(row, COLUMNS.EXPIRES_AT + 1).setValue(getThailandTime(expiresAt));
      sheet.getRange(row, COLUMNS.ROLE_ADDED + 1).setValue(true);
      
      console.log(`✅ Trial Access role added for ${discordId}, expires at: ${getThailandTime(expiresAt)}`);
    }
  } catch (error) {
    console.error('Error processing approval:', error);
  }
}

/**
 * Add Pending role to user when they register
 */
function addPendingRole(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${CONFIG.DISCORD_PENDING_ROLE_ID}`;
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 204 || response.getResponseCode() === 200) return true;
    console.log(`Failed to add pending role: ${response.getContentText()}`);
    return false;
  } catch (error) {
    console.error('Error adding pending role:', error);
    return false;
  }
}

/**
 * Remove Pending role from user when approved
 */
function removePendingRole(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${CONFIG.DISCORD_PENDING_ROLE_ID}`;
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 204 || response.getResponseCode() === 200) {
      console.log(`Pending role removed: ${discordUserId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing pending role:', error);
    return false;
  }
}

/**
 * Add Trial Access role to user after admin approval
 */
function addTrialAccessRole(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${CONFIG.DISCORD_VIP_ROLE_ID}`;
    const options = {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 204 || response.getResponseCode() === 200) return true;
    console.log(`Failed to add trial access role: ${response.getContentText()}`);
    return false;
  } catch (error) {
    console.error('Error adding trial access role:', error);
    return false;
  }
}

/**
 * Kick user from Discord server
 */
function kickDiscordUser(discordUserId) {
  try {
    const url = `https://discord.com/api/v10/guilds/${CONFIG.DISCORD_GUILD_ID}/members/${discordUserId}`;
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${CONFIG.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 204 || response.getResponseCode() === 200) {
        console.log(`User kicked: ${discordUserId}`);
        return true;
    }
    console.log(`Failed to kick user ${discordUserId}: ${response.getContentText()}`);
    return false;
  } catch (error) {
    console.error('Error kicking user:', error);
    return false;
  }
}

/**
 * Parse Thailand time string back to Date object
 */
function parseThailandTime(timeString) {
  // Format: "yyyy-MM-dd HH:mm:ss"
  const parts = String(timeString).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return null;
  
  // Create date in Thailand timezone and convert to UTC
  const thaiDate = new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
  // Adjust for Thailand timezone (GMT+7 = -7 hours to get UTC)
  return new Date(thaiDate.getTime() - (7 * 60 * 60 * 1000));
}

/**
 * Check for expired members and kick them (run every minute via time-driven trigger)
 */
function checkExpiredMembers() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    
    console.log(`Running expiry check at ${getThailandTime(now)} (Thailand time)`);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = String(row[COLUMNS.STATUS] || '').toLowerCase();
      const expiresAt = row[COLUMNS.EXPIRES_AT];
      const discordInfo = row[COLUMNS.DISCORD_INFO];
      const roleAdded = row[COLUMNS.ROLE_ADDED];
      
      // Only check approved users with role added
      if (!status.includes('approved') || !roleAdded) continue;
      
      if (expiresAt) {
        const expiryDate = parseThailandTime(expiresAt);
        if (!expiryDate) {
          console.log(`Invalid expiry date for row ${i + 1}: ${expiresAt}`);
          continue;
        }
        
        const discordId = extractDiscordId(discordInfo);
        console.log(`Checking user ${discordId}: expires at ${expiresAt}, now is ${getThailandTime(now)}`);
        
        if (now > expiryDate) {
          console.log(`⏰ Expiring member: ${discordId}`);
          const success = kickDiscordUser(discordId);
          if (success) {
            sheet.getRange(i + 1, COLUMNS.STATUS + 1).setValue('expired');
            sheet.getRange(i + 1, COLUMNS.ROLE_ADDED + 1).setValue(false);
            console.log(`✅ Member expired and kicked: ${discordId}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking expired members:', error);
  }
}

/**
 * Manual test function - run this to test the expiry check
 */
function testCheckExpiredMembers() {
  checkExpiredMembers();
}

/**
 * Setup time-driven trigger (run once manually)
 */
function setupTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkExpiredMembers') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger - run every minute
  ScriptApp.newTrigger('checkExpiredMembers')
    .timeBased()
    .everyMinutes(1)
    .create();
    
  console.log('✅ Time-driven trigger created: checkExpiredMembers will run every minute');
}
