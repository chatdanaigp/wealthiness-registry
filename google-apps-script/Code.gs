/**
 * Wealthiness Registry - Google Apps Script
 * 
 * Deploy as Web App:
 * 1. Deploy > New deployment
 * 2. Type: Web app
 * 3. Execute as: Me
 * 4. Who has access: Anyone
 * 5. Deploy > Copy URL
 * 
 * HEADER ROW (Row 1):
 * A: connext_id | B: referal_ID | C: nickname | D: name | E: surname
 * F: province_country | G: phone_number | H: discord_id | I: transfer_slip
 * J: status | K: submitted_at | L: expire_at
 */

// ============ CONFIGURATION ============
const CONFIG = {
  SHEET_ID: '1m4lWxWdMOvKMQWMbbAB2UHvH4VOgbg1zBwBdRBXGWOM',
  SHEET_NAME: 'data',
  DRIVE_FOLDER_ID: '1UoPSQt47fRQVbn265BhSqHp0GRPFUIVy',
  TIMEZONE: 'Asia/Bangkok',
  // Secret key to prevent unauthorized bots (Ghost Bots)
  BOT_SECRET: 'wealthiness-secure-v1'
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
  DISCORD_ID: 7,        // H - format: username (ID)
  TRANSFER_SLIP: 8,     // I - Drive link
  STATUS: 9,            // J - pending/Approved Trial Access/expired
  SUBMITTED_AT: 10,     // K
  EXPIRE_AT: 11,        // L
};

/**
 * Get current Thailand time as formatted string
 */
function getThailandTime(date = new Date()) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Handle GET requests - Return data for Discord bot polling
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    const secret = params.bot_secret;

    // Security Check: Block requests without correct secret
    // This stops the "Ghost Bot" from fetching approved users
    if (action === 'getApproved' && secret !== CONFIG.BOT_SECRET) {
       return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid Bot Secret'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Get approved registrations for bot
    if (action === 'getApproved') {
      return getApprovedRegistrations();
    }

    // Get expired registrations (New robust expiry logic)
    if (action === 'getExpired') {
      return getExpiredRegistrations();
    }

    // Get all pending for status check
    if (action === 'getPending') {
      return getPendingRegistrations();
    }

    // Default: return status
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Wealthiness Registry API',
      timestamp: getThailandTime()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get approved registrations (status contains "approved" but not processed)
 */
function getApprovedRegistrations() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  const approved = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = String(row[COLUMNS.STATUS] || '').toLowerCase().trim();
    
    // Only get "Approved Trial Access" that hasn't been processed yet
    // Exclude 'active', 'expired', 'done'
    if (status.includes('approved') && !status.includes('done') && !status.includes('active') && !status.includes('expired')) {
      const discordInfo = String(row[COLUMNS.DISCORD_ID] || '');
      const discordIdMatch = discordInfo.match(/\((\d+)\)/);
      const discordId = discordIdMatch ? discordIdMatch[1] : null;
      
      if (discordId) {
        approved.push({
          rowIndex: i + 1, // 1-based for sheets
          connextId: row[COLUMNS.CONNEXT_ID],
          name: row[COLUMNS.NAME],
          surname: row[COLUMNS.SURNAME],
          discordId: discordId,
          discordInfo: discordInfo,
          status: row[COLUMNS.STATUS],
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: approved,
    count: approved.length,
    timestamp: getThailandTime()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get expired registrations (status contains "active" and expire_at < now)
 */
function getExpiredRegistrations() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  const expired = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = String(row[COLUMNS.STATUS] || '').toLowerCase().trim();
    const expireAtStr = String(row[COLUMNS.EXPIRE_AT] || '');
    
    // Check if status is Active
    if (status.includes('active') && !status.includes('expired')) {
      if (expireAtStr) {
        // Parse expireAt (Assuming YYYY-MM-DD HH:mm:ss format from getThailandTime)
        // Note: Date.parse might need tweaks depending on locale, but standard ISO works mostly
        const expireDate = new Date(expireAtStr);
        
        // If expiry date is valid and in the past
        if (!isNaN(expireDate.getTime()) && expireDate < now) {
           const discordInfo = String(row[COLUMNS.DISCORD_ID] || '');
           const discordIdMatch = discordInfo.match(/\((\d+)\)/);
           const discordId = discordIdMatch ? discordIdMatch[1] : null;

           if (discordId) {
             expired.push({
               rowIndex: i + 1,
               discordId: discordId,
               name: row[COLUMNS.NAME],
               surname: row[COLUMNS.SURNAME],
               expireAt: expireAtStr
             });
           }
        }
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: expired,
    count: expired.length
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get pending registrations (for checking new users)
 */
function getPendingRegistrations() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  const pending = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = String(row[COLUMNS.STATUS] || '').toLowerCase().trim();
    
    // Status must be exactly 'pending'
    if (status === 'pending') {
      const discordInfo = String(row[COLUMNS.DISCORD_ID] || '');
      const discordIdMatch = discordInfo.match(/\((\d+)\)/);
      const discordId = discordIdMatch ? discordIdMatch[1] : null;
      
      if (discordId) {
        pending.push({
          rowIndex: i + 1,
          discordId: discordId,
          discordInfo: discordInfo,
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: pending,
    count: pending.length
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests - Save registration or update status
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Update status action (from Discord bot)
    if (data.action === 'updateStatus') {
      return updateStatus(data.rowIndex, data.newStatus, data.expireAt);
    }
    
    // Default: Save new registration
    return saveRegistration(data);
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message,
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Save new registration to sheet
 */
function saveRegistration(data) {
  // Save transfer slip to Drive
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
    data.connext_id,           // A - connext_id
    data.referal_ID || '',     // B - referal_ID
    data.nickname || '',       // C - nickname
    data.name,                 // D - name
    data.surname,              // E - surname
    data.province_country,     // F - province_country
    data.phone_number,         // G - phone_number
    discordInfo,               // H - discord_id
    slipLink,                  // I - transfer_slip
    'pending',                 // J - status
    getThailandTime(),         // K - submitted_at
    '',                        // L - expire_at (set when approved)
  ];
  
  sheet.appendRow(rowData);
  
  console.log(`✅ Registration saved: ${data.name} ${data.surname}`);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Registration saved successfully',
    driveLink: slipLink,
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Update status and expiry in sheet (called by Discord bot)
 */
function updateStatus(rowIndex, newStatus, expireAt) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    // Update status column (J = column 10)
    sheet.getRange(rowIndex, COLUMNS.STATUS + 1).setValue(newStatus);
    
    // Update expire_at if provided (L = column 12)
    if (expireAt) {
      sheet.getRange(rowIndex, COLUMNS.EXPIRE_AT + 1).setValue(expireAt);
    }
    
    console.log(`✅ Status updated: Row ${rowIndex} -> ${newStatus}`);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Status updated',
      rowIndex: rowIndex,
      newStatus: newStatus
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error updating status:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
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
    console.error('Error saving image:', error);
    return 'Error saving image';
  }
}

/**
 * Test function - View sheet data
 */
function testViewData() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  console.log(data);
}
