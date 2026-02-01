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
 * 1. User registers -> Gets "Pending" role automatically
 * 2. Admin approves (changes status to "approved" in sheet) -> "Pending" role removed, "Trial Access" role added
 * 3. After 5 minutes (or 7 days in production) -> User kicked from server
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
  
  // VIP duration (FOR TESTING: Override in code to use minutes)
  VIP_DURATION_DAYS: 7, 
};

// Column indices (0-based) matching Google Sheet
const COLUMNS = {
  CONNEXT_ID: 0,        // A - connext_id
  REFERAL_ID: 1,        // B - referal_ID
  NICKNAME: 2,          // C - nickname
  NAME: 3,              // D - name
  SURNAME: 4,           // E - surname
  PROVINCE_COUNTRY: 5,  // F - province_country
  PHONE_NUMBER: 6,      // G - phone_number
  TRANSFER_SLIP: 7,     // H - transfer_slip
  STATUS: 8,            // I - status (pending/approved/expired)
  DISCORD_ID: 9,        // J - discord_id
  DISCORD_USERNAME: 10, // K - discord_username
  SUBMITTED_AT: 11,     // L - submitted_at
  APPROVED_AT: 12,      // M - approved_at
  EXPIRES_AT: 13,       // N - expires_at
  ROLE_ADDED: 14,       // O - role_added
};

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
    
    // Search in Column K (Index 10)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[COLUMNS.DISCORD_USERNAME] === searchUsername) {
        return ContentService.createTextOutput(JSON.stringify({
          found: true,
          status: row[COLUMNS.STATUS],
          expiresAt: row[COLUMNS.EXPIRES_AT],
          discordId: row[COLUMNS.DISCORD_ID]
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
    
    const rowData = [
      data.connext_id,          // A
      data.referal_ID,          // B
      data.nickname,            // C
      data.name,                // D
      data.surname,             // E
      data.province_country,    // F
      data.phone_number,        // G
      slipLink,                 // H - transfer_slip
      'pending',                // I - status
      data.discord_id,          // J - discord_id
      data.discord_username,    // K - discord_username
      data.submitted_at,        // L - submitted_at
      '',                       // M - approved_at
      '',                       // N - expires_at
      false,                    // O - role_added
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
 * Trigger when admin edits the sheet (changes status to approved)
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;
  if (range.getColumn() !== COLUMNS.STATUS + 1) return;
  
  const newValue = e.value;
  const row = range.getRow();
  
  if (newValue && newValue.toLowerCase() === 'approved') {
    processApproval(sheet, row);
  }
}

/**
 * Process user approval - remove Pending role, add Trial Access role
 */
function processApproval(sheet, row) {
  try {
    const rowData = sheet.getRange(row, 1, 1, 15).getValues()[0];
    const discordId = rowData[COLUMNS.DISCORD_ID];
    const roleAdded = rowData[COLUMNS.ROLE_ADDED];
    
    if (roleAdded === true || roleAdded === 'true' || roleAdded === 'TRUE') {
      return;
    }
    if (!discordId) return;
    
    // Remove Pending role first
    removePendingRole(discordId);
    
    // Add Trial Access Role
    const success = addTrialAccessRole(discordId);
    
    if (success) {
      const now = new Date();
      
      // *** TESTING: 5 MINUTES EXPIRY ***
      // const expiresAt = new Date(now.getTime() + (CONFIG.VIP_DURATION_DAYS * 24 * 60 * 60 * 1000));
      const expiresAt = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes from now
      
      sheet.getRange(row, COLUMNS.APPROVED_AT + 1).setValue(now.toISOString());
      sheet.getRange(row, COLUMNS.EXPIRES_AT + 1).setValue(expiresAt.toISOString());
      sheet.getRange(row, COLUMNS.ROLE_ADDED + 1).setValue(true);
      
      console.log(`✅ Trial Access role added (TESTING MODE: 5 MINS): ${discordId}`);
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
 * Check for expired members and kick them (run every minute via time-driven trigger)
 */
function checkExpiredMembers() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    
    console.log(`Running expiry check at ${now.toISOString()}`);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[COLUMNS.STATUS];
      const expiresAt = row[COLUMNS.EXPIRES_AT];
      const discordId = row[COLUMNS.DISCORD_ID];
      const roleAdded = row[COLUMNS.ROLE_ADDED];
      
      if (status !== 'approved' || !roleAdded) continue;
      
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        console.log(`Checking user ${discordId}: expires at ${expiryDate.toISOString()}, now is ${now.toISOString()}`);
        
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
