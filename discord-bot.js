/**
 * Wealthiness Registry - Discord Bot for Render.com
 * 
 * Features:
 * - Health check HTTP server (port 10000 for Render)
 * - Poll Google Apps Script for approved registrations
 * - Add Pending role when user joins server
 * - On approval: Remove Pending, add Trial Access
 * - Expiry timer (3 minutes for testing)
 * - Kick user when trial expires
 * 
 * Environment Variables Required:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - DISCORD_PENDING_ROLE_ID
 * - DISCORD_TRIAL_ROLE_ID
 * - GOOGLE_APPS_SCRIPT_URL
 * - PORT (default: 10000)
 * - TRIAL_DURATION_MINUTES (default: 3)
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const http = require('http');
const dns = require('node:dns');

// Force IPv4 for Discord connection stability on Render
dns.setDefaultResultOrder('ipv4first');

// Reliability: Prevent overlapping polls
let isPolling = false;
// ============================================
// Health Check & Trigger Server
// ============================================
const PORT = process.env.PORT || 10000;

const healthCheckServer = http.createServer(async (req, res) => {
    // Enable CORS for dashboard access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health Check
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'wealthiness-registry-bot',
            loginStatus: client.isReady() ? 'Logged In' : 'Connecting/Offline',
            ping: client.ws.ping,
            uptime: process.uptime(),
            activeTrials: activeTrials.size,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // Admin Dashboard (Simple UI)
    if (req.method === 'GET' && req.url === '/admin') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bot Admin</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                    .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
                    h2 { margin-top: 0; color: #333; }
                    button { background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; font-weight: 600; transition: background 0.2s; margin-top: 20px; }
                    button:hover { background: #4752C4; }
                    button:disabled { background: #99aab5; cursor: not-allowed; }
                    .status { margin-top: 20px; padding: 15px; border-radius: 6px; display: none; text-align: left; font-size: 14px; }
                    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                    .status-indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
                    .online { background-color: #3ba55c; }
                    .offline { background-color: #ed4245; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>🤖 Bot Admin Panel</h2>
                    <p style="color: #666; margin-bottom: 20px;">
                        Status: 
                        <span class="status-indicator ${client.isReady() ? 'online' : 'offline'}"></span>
                        <strong>${client.isReady() ? 'Online' : 'Connecting...'}</strong>
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px; color: #555; text-align: left;">
                        ℹ️ <strong>Manual Sync:</strong><br>
                        Click below to force the bot to check Google Sheets for new approved members immediately.
                    </div>
                    <button id="triggerBtn" onclick="triggerCheck()">⚡ Run Manual Check</button>
                    <div id="status" class="status"></div>
                </div>

                <div class="card" style="margin-top: 20px;">
                    <h2>🚀 Force Approve User</h2>
                    <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                        Manually grant Trial Access to a Discord User ID. This bypasses the Google Sheet check.
                    </p>
                    <input type="text" id="discordIdInput" placeholder="Discord User ID (e.g. 123456789)" 
                        style="width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 16px;">
                    
                    <button id="forceBtn" onclick="forceApprove()" style="background: #e67e22;">🚀 Force Approve</button>
                    <div id="forceStatus" class="status"></div>
                </div>

                <script>
                    async function triggerCheck() {
                        const btn = document.getElementById('triggerBtn');
                        const status = document.getElementById('status');
                        
                        btn.disabled = true;
                        btn.innerText = 'Running Sync...';
                        status.style.display = 'none';

                        try {
                            const res = await fetch('/trigger-check', { method: 'POST' });
                            const data = await res.json();
                            
                            status.innerHTML = (data.success ? '✅ ' : '❌ ') + '<strong>' + data.message + '</strong>';
                            status.className = 'status ' + (data.success ? 'success' : 'error');
                            
                            if (data.details) {
                                status.innerHTML += '<ul style="margin: 10px 0 0 0; padding-left: 20px;">' +
                                    '<li>Approved: ' + data.details.approved + '</li>' +
                                    '<li>Expired: ' + data.details.expired + '</li>' +
                                    '</ul>';
                            }
                            status.style.display = 'block';

                        } catch (err) {
                            status.innerText = '❌ Request failed: ' + err.message;
                            status.className = 'status error';
                            status.style.display = 'block';
                        } finally {
                            btn.disabled = false;
                            btn.innerText = '⚡ Run Manual Check';
                        }
                    }

                    async function forceApprove() {
                        const btn = document.getElementById('forceBtn');
                        const input = document.getElementById('discordIdInput');
                        const status = document.getElementById('forceStatus');
                        const discordId = input.value.trim();

                        if (!discordId) {
                            input.style.borderColor = 'red';
                            return;
                        }
                        input.style.borderColor = '#ddd';
                        
                        btn.disabled = true;
                        btn.innerText = 'Processing...';
                        status.style.display = 'none';

                        try {
                            const res = await fetch('/force-approve', { 
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ discordId })
                            });
                            const data = await res.json();
                            
                            status.innerHTML = (data.success ? '✅ ' : '❌ ') + '<strong> ' + data.message + '</strong>';
                            status.className = 'status ' + (data.success ? 'success' : 'error');
                            status.style.display = 'block';

                        } catch (err) {
                            status.innerText = '❌ Request failed: ' + err.message;
                            status.className = 'status error';
                            status.style.display = 'block';
                        } finally {
                            btn.disabled = false;
                            btn.innerText = '🚀 Force Approve';
                        }
                    }
                </script>
            </body>
            </html>
        `);
        return;
    }

    // Manual Trigger Endpoint
    if (req.method === 'POST' && req.url === '/trigger-check') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                console.log('⚡ Manual trigger received!');

                const results = {
                    approved: 'Skipped',
                    expired: 'Skipped'
                };

                // Run polling immediately (force even if not fully ready, as fetch is independent)
                if (GOOGLE_APPS_SCRIPT_URL) {
                    // Check Approved
                    if (!isPolling) {
                        // Check readiness before manual trigger
                        if (!client.isReady()) {
                            results.approved = 'Skipped (Bot not connected to Discord)';
                        } else {
                            // Note: We don't await the full process to keep response fast, 
                            // but we do await the fetch to confirm connectivity
                            fetchApprovedRegistrations().then(async (candidates) => {
                                if (candidates.length > 0) {
                                    console.log(`   Found ${candidates.length} candidates via trigger`);
                                    await processApprovedRegistrations();
                                }
                            });
                            results.approved = `Triggered (Async process started)`;
                        }
                    } else {
                        results.approved = 'Skipped (Polling in progress)';
                    }

                    // Check Expired
                    setTimeout(() => {
                        if (!isPolling) processExpiredRegistrations();
                    }, 2000);
                    results.expired = 'Triggered asynchronously';
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Manual polling triggered',
                    details: results
                }));
            } catch (error) {
                console.error('Trigger Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // Force Approve Endpoint
    if (req.method === 'POST' && req.url === '/force-approve') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { discordId } = JSON.parse(body);
                console.log(`🚀 Force approve requested for ID: ${discordId}`);

                if (!discordId) {
                    throw new Error('Missing Discord ID');
                }

                const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
                if (!guild) {
                    throw new Error('Guild not found');
                }

                const member = await guild.members.fetch(discordId).catch(() => null);
                if (!member) {
                    throw new Error('Member not found in server');
                }

                // Roles
                const trialRole = guild.roles.cache.get(TRIAL_ROLE_ID);
                const pendingRole = guild.roles.cache.get(PENDING_ROLE_ID);

                if (!trialRole) {
                    throw new Error('Trial Role not configured');
                }

                await member.roles.add(trialRole);
                console.log(`   Added Trial Role to ${discordId}`);

                if (pendingRole) {
                    await member.roles.remove(pendingRole).catch(() => { });
                    console.log(`   Removed Pending Role from ${discordId}`);
                }

                // Send DM
                await sendTrialWelcomeDM(member.user, member.user.username, TRIAL_DURATION_MINUTES);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Approved ${member.user.tag}`
                }));

            } catch (error) {
                console.error('Force Approve Error:', error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

healthCheckServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Health check server is READY on port ${PORT}`);
});

// ============================================
// Configuration
// ============================================
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

// Role IDs
const PENDING_ROLE_ID = process.env.DISCORD_PENDING_ROLE_ID || '1467623644380528832';
const TRIAL_ROLE_ID = process.env.DISCORD_TRIAL_ROLE_ID || '1467593168844361846';

// Trial Duration (in milliseconds)
const TRIAL_DURATION_MINUTES = parseInt(process.env.TRIAL_DURATION_MINUTES) || 10080; // Default 7 days (7 * 24 * 60)
const TRIAL_DURATION_MS = TRIAL_DURATION_MINUTES * 60 * 1000;

// Polling interval (30 seconds)
const POLL_INTERVAL = 30000;

// Track active trial users: discordId -> { timerId, userName, rowIndex, startTime }
const activeTrials = new Map();

// Track processed rows to avoid duplicate processing
const processedRows = new Set();




// ============================================
// Discord Client Setup
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,  // REQUIRES: "Server Members Intent" enabled in Discord Developer Portal
        GatewayIntentBits.MessageContent, // REQUIRES: "Message Content Intent" enabled
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
    ],
});

// Debug Discord connection events
client.on('debug', info => {
    // Only log important connection events
    if (info.includes('Heartbeat') || info.includes('Session') || info.includes('Connecting') || info.includes('Identifying')) {
        console.log(`[DEBUG] ${info}`);
    }
});

// ============================================
// Helper: Get Thailand Time
// ============================================
function getThailandTime(date = new Date()) {
    // Output format: YYYY-MM-DD HH:mm:ss (matches Google Apps Script format)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

// ============================================
// API: Fetch approved registrations
// ============================================
// Secure key to access Apps Script (Must match Apps Script CONFIG)
const BOT_SECRET = 'wealthiness-secure-v1';

async function fetchApprovedRegistrations() {
    if (!GOOGLE_APPS_SCRIPT_URL) {
        console.log('⚠️  GOOGLE_APPS_SCRIPT_URL not configured');
        return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        // Add secret to URL to bypass Ghost Bot block
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getApproved&bot_secret=${BOT_SECRET}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();

        if (result.success) {
            return result.data || [];
        } else {
            console.error('❌ Failed to fetch data:', result.error);
            return [];
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Fetch timed out (10s limit)');
        } else {
            console.error('❌ Fetch error:', error.message);
        }
        return [];
    }
}

// ============================================
// API: Fetch EXPIRED registrations (Robust 7-day check)
// ============================================
async function fetchExpiredRegistrations() {
    if (!GOOGLE_APPS_SCRIPT_URL) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getExpired&bot_secret=${BOT_SECRET}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();

        if (result.success) {
            return result.data || [];
        } else {
            console.error('❌ Failed to fetch expired:', result.error);
            return [];
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Fetch expired timed out (10s limit)');
        } else {
            console.error('❌ Fetch expired error:', error.message);
        }
        return [];
    }
}

// ============================================
// API: Update status in Google Sheets
// ============================================
async function updateStatus(rowIndex, newStatus, expireAt = null) {
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateStatus',
                rowIndex: rowIndex,
                newStatus: newStatus,
                expireAt: expireAt
            })
        });

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('❌ Update status error:', error.message);
        return false;
    }
}

// ============================================
// Send Trial Welcome DM
// ============================================
async function sendTrialWelcomeDM(user, userName, durationMinutes) {
    try {
        let durationText = `${durationMinutes} นาที`;
        if (durationMinutes >= 1440) {
            const days = Math.floor(durationMinutes / 1440);
            durationText = `${days} วัน`;
        } else if (durationMinutes >= 60) {
            const hours = Math.floor(durationMinutes / 60);
            durationText = `${hours} ชั่วโมง`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x2563EB) // Wealth Blue
            .setTitle(`⏱️ ยินดีต้อนรับสู่ Trial Access!`)
            .setDescription(`สวัสดีคุณ **${userName}**!\n\nคุณได้รับ **Trial Access** เรียบร้อยแล้ว`)
            .addFields(
                { name: '⏰ ระยะเวลาทดลองใช้งาน', value: `**${durationText}**`, inline: true },
                { name: '⚠️ หมายเหตุ', value: 'เมื่อหมดเวลาทดลองใช้งาน คุณจะถูกนำออกจาก Server โดยอัตโนมัติ', inline: false }
            )
            .setFooter({ text: 'Master Signal | Trial Access' })
            .setTimestamp();

        await user.send({ embeds: [embed] });
        console.log(`   ✅ Sent trial welcome DM to ${user.tag}`);
        return true;
    } catch (error) {
        console.error(`   ⚠️ Could not send DM to ${user.tag}:`, error.message);
        return false;
    }
}

// ============================================
// Send Trial Expiry DM
// ============================================
async function sendTrialExpiryDM(user, userName) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`⏱️ Trial Access หมดอายุแล้ว`)
            .setDescription(`คุณ **${userName}**\n\nระยะเวลาทดลองใช้งานของคุณสิ้นสุดลงแล้ว`)
            .addFields(
                { name: '🔓 ต้องการใช้งานต่อ?', value: 'หากต้องการสมัครสมาชิก กรุณาติดต่อแอดมิน', inline: false }
            )
            .setFooter({ text: 'Master Signal | Trial Access' })
            .setTimestamp();

        await user.send({ embeds: [embed] });
        console.log(`   ✅ Sent trial expiry DM to ${user.tag}`);
        return true;
    } catch (error) {
        console.error(`   ⚠️ Could not send expiry DM:`, error.message);
        return false;
    }
}

// ============================================
// Start Trial Timer
// ============================================
async function startTrialTimer(guild, discordId, userName, rowIndex) {
    console.log(`   ⏱️ Starting ${TRIAL_DURATION_MINUTES} minute trial timer for ${userName}`);

    // Clear existing timer if any
    if (activeTrials.has(discordId)) {
        const existing = activeTrials.get(discordId);
        clearTimeout(existing.timerId);
    }

    // Calculate expiry time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_MS);
    const expireAtStr = getThailandTime(expiresAt);

    // Update expire_at in sheet
    await updateStatus(rowIndex, 'Trial Access Active', expireAtStr);

    // Set timer to kick user when trial expires
    const timerId = setTimeout(async () => {
        await kickTrialUser(guild, discordId, userName, rowIndex);
    }, TRIAL_DURATION_MS);

    // Track the trial
    activeTrials.set(discordId, {
        timerId: timerId,
        userName: userName,
        rowIndex: rowIndex,
        startTime: now,
        expiresAt: expiresAt
    });

    return true;
}

// ============================================
// Process Expiry (Poll-based)
// ============================================
async function processExpiredRegistrations() {
    try {
        console.log('💀 Polling for expired registrations...');
        const expiredUsers = await fetchExpiredRegistrations();

        if (expiredUsers.length === 0) {
            return;
        }

        console.log(`   Found ${expiredUsers.length} expired users to kick`);

        for (const user of expiredUsers) {
            await kickExpiredUser(user);
        }
    } catch (error) {
        console.error('❌ Error in processExpiredRegistrations:', error.message);
    }
}

async function kickExpiredUser(userData) {
    const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild) return;

    try {
        const member = await guild.members.fetch(userData.discordId).catch(() => null);

        // Update Sheet first to prevent loops
        await updateStatus(userData.rowIndex, 'expired');

        if (member) {
            await member.send(`⛔ **หมดเวลาทดลองใช้งาน**\n\nสิทธิ์ Trial Access ของคุณหมดอายุแล้ว หากต้องการใช้งานต่อ กรุณาติดต่อทีมงานเพื่อสมัครสมาชิก\n\nขอบคุณที่สนใจ Master Signal ครับ! 🙏`).catch(() => { });
            await member.kick('Trial duration expired');
            console.log(`👢 Kicked user ${userData.name} (ID: ${userData.discordId}) - Expired`);
        } else {
            console.log(`👻 User ${userData.discordId} not found in server, but marked as expired in sheet.`);
        }

    } catch (error) {
        console.error(`❌ Error kicking user ${userData.discordId}:`, error.message);
    }
}

// ============================================
// Process Approved Registrations
// ============================================
async function processApprovedRegistrations() {
    try {
        if (!client.isReady()) {
            console.log('⏳ Bot not ready yet, skipping approved registration poll...');
            return;
        }
        console.log('🔄 Polling for approved registrations...');
        const registrations = await fetchApprovedRegistrations();

        if (registrations.length === 0) {
            console.log('   No pending approved registrations');
            return;
        }

        console.log(`   Found ${registrations.length} registrations to process`);

        for (const reg of registrations) {
            if (processedRows.has(reg.rowIndex)) continue; // Skip if already processing in this cycle

            await processApproval(reg);
        }
    } catch (error) {
        console.error('❌ Error in processApprovedRegistrations:', error.message);
    }
}

async function processApproval(reg) {
    processedRows.add(reg.rowIndex);
    console.log(`▶️  Processing: ${reg.name} ${reg.surname} (Discord: ${reg.discordInfo})`);

    const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild) {
        console.error('❌ Guild not found');
        return;
    }

    try {
        // 1. Find Member
        const member = await guild.members.fetch(reg.discordId).catch(() => null);

        if (!member) {
            console.log(`   ⏳ Member ${reg.discordId} not found in server yet.`);
            processedRows.delete(reg.rowIndex);
            return;
        }

        // 2. Add Trial Role
        const trialRole = guild.roles.cache.get(TRIAL_ROLE_ID);
        if (trialRole) {
            await member.roles.add(trialRole);
            console.log(`   Added Trial Role to ${reg.discordId}`);
        } else {
            console.error('❌ Trial Role not found');
        }

        // 3. Remove Pending Role
        const pendingRole = guild.roles.cache.get(PENDING_ROLE_ID);
        if (pendingRole) {
            try {
                await member.roles.remove(pendingRole);
                console.log(`   Removed Pending Role from ${reg.discordId}`);
            } catch (e) {
                // Ignore if they don't have it
            }
        }

        // 4. Calculate Expiry
        const startTime = Date.now();
        const endTime = startTime + TRIAL_DURATION_MS;
        const endTimeDate = new Date(endTime);
        const expireAtStr = getThailandTime(endTimeDate);

        // 5. Send DM
        await sendTrialWelcomeDM(member.user, reg.name, TRIAL_DURATION_MINUTES);

        // 6. Update Status in Sheet
        // Use "Trial Access Active" + Secret Indicator if needed? No, just Standard active is fine
        // because we block the ghost bot at the GET level.
        const success = await updateStatus(reg.rowIndex, 'Trial Access Active', expireAtStr);

        if (success) {
            console.log(`✅  Process Complete for ${reg.name}`);

            // Note: We NO LONGER set a setTimeout for 7 days because it's unreliable.
            // We rely on 'processExpiredRegistrations' polling.

        } else {
            console.error('❌ Failed to update status in sheet');
            // CRITICAL FIX: If update failed, remove from processedRows so we retry next poll!
            processedRows.delete(reg.rowIndex);
        }

    } catch (error) {
        console.error(`❌ Error processing ${reg.name}:`, error.message);
        processedRows.delete(reg.rowIndex);
    }
}

// Kick Trial User Legacy Function (Removed/Replaced)
// kept clean main logic below


// ============================================
// Main Bot Logic
// ============================================
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Bot is ready and polling every ${POLL_INTERVAL / 1000} seconds`);

    // Initial Poll
    if (GOOGLE_APPS_SCRIPT_URL) {
        processApprovedRegistrations();
        setTimeout(processExpiredRegistrations, 5000); // Check expiry shortly after start
    }

    // Set Interval
    setInterval(() => {
        if (GOOGLE_APPS_SCRIPT_URL) {
            processApprovedRegistrations();

            // Poll expiry every minute (every 2 cycles of 30s)
            if (Date.now() % 60000 < 35000) {
                processExpiredRegistrations();
            }
        }
    }, POLL_INTERVAL);
});

// Member Join Event (Add Pending Role AND Check Approval)
client.on('guildMemberAdd', async member => {
    console.log(`\n👋 User joined: ${member.user.tag} (${member.id})`);

    // 1. Add Pending Role
    const pendingRole = member.guild.roles.cache.get(PENDING_ROLE_ID);
    if (pendingRole) {
        try {
            await member.roles.add(pendingRole);
            console.log(`   ✅ Added Pending role`);
        } catch (error) {
            console.error(`   ❌ Failed to assign Pending role: ${error.message}`);
        }
    } else {
        console.error(`   ❌ Pending Role ID ${PENDING_ROLE_ID} not found`);
    }

    // 2. IMMEDIATE check if they are already approved!
    if (GOOGLE_APPS_SCRIPT_URL) {
        console.log(`   🔍 Checking if user is already approved...`);
        // Trigger a poll immediately. (It filters by processedRows, so safe to call)
        await processApprovedRegistrations();
    }
});

// Message Event (for testing/ping)
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        await message.reply('Pong! 🏓');
    }
});

// Login (Standard - No Timeout)
if (DISCORD_BOT_TOKEN) {
    console.log('🔑 Attempting Discord login...');
    console.log(`   Token prefix: ${DISCORD_BOT_TOKEN.slice(0, 10)}...`);

    client.login(DISCORD_BOT_TOKEN)
        .then(() => {
            console.log('🔐 Login successful');
        })
        .catch(err => {
            console.error('❌ Login failed:', err.message);
            console.error('   Full error:', err);
        });
} else {
    console.error('❌ DISCORD_BOT_TOKEN is missing in .env');
}

// Catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

client.on('error', error => {
    console.error('❌ Discord client error:', error.message);
});

