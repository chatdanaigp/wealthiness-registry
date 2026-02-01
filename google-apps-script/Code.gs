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
  
  // VIP Role ID to assign
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
      data.connext_id,          
      data.referal_ID,          
      data.nickname,            
      data.name,                
      data.surname,             
      data.province_country,    
      data.phone_number,        
      slipLink,                 
      'pending',                
      data.discord_id,          
      data.discord_username,    
      data.submitted_at,        
      '',                       
      '',                       
      false,                    
    ];
    
    sheet.appendRow(rowData);
    
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

function processApproval(sheet, row) {
  try {
    const rowData = sheet.getRange(row, 1, 1, 15).getValues()[0];
    const discordId = rowData[COLUMNS.DISCORD_ID];
    const roleAdded = rowData[COLUMNS.ROLE_ADDED];
    
    if (roleAdded === true || roleAdded === 'true' || roleAdded === 'TRUE') {
      return;
    }
    if (!discordId) return;
    
    // Add Discord Role
    const success = addDiscordRole(discordId);
    
    if (success) {
      const now = new Date();
      
      // *** TESTING: 5 MINUTES EXPIRY ***
      // const expiresAt = new Date(now.getTime() + (CONFIG.VIP_DURATION_DAYS * 24 * 60 * 60 * 1000));
      const expiresAt = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes from now
      
      sheet.getRange(row, COLUMNS.APPROVED_AT + 1).setValue(now.toISOString());
      sheet.getRange(row, COLUMNS.EXPIRES_AT + 1).setValue(expiresAt.toISOString());
      sheet.getRange(row, COLUMNS.ROLE_ADDED + 1).setValue(true);
      
      console.log(`✅ VIP role added involved (TESTING MODE: 5 MINS): ${discordId}`);
    }
  } catch (error) {
    console.error('Error processing approval:', error);
  }
}

function addDiscordRole(discordUserId) {
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
    return false;
  } catch (error) {
    return false;
  }
}

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
    return false;
  } catch (error) {
    return false;
  }
}

function checkExpiredMembers() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[COLUMNS.STATUS];
      const expiresAt = row[COLUMNS.EXPIRES_AT];
      const discordId = row[COLUMNS.DISCORD_ID];
      const roleAdded = row[COLUMNS.ROLE_ADDED];
      
      if (status !== 'approved' || !roleAdded) continue;
      
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        if (now > expiryDate) {
          console.log(`Expiring member: ${discordId}`);
          const success = kickDiscordUser(discordId);
          if (success) {
            sheet.getRange(i + 1, COLUMNS.STATUS + 1).setValue('expired');
            sheet.getRange(i + 1, COLUMNS.ROLE_ADDED + 1).setValue(false);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking expired members:', error);
  }
}
