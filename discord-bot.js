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
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const http = require('http');

// ============================================
// Health Check HTTP Server for Render.com
// ============================================
const PORT = process.env.PORT || 10000;

const healthCheckServer = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'wealthiness-registry-bot',
            uptime: process.uptime(),
            activeTrials: activeTrials.size,
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
});

// ============================================
// Helper: Get Thailand Time
// ============================================
function getThailandTime(date = new Date()) {
    return date.toLocaleString('en-GB', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '').replace(/\//g, '-');
}

// ============================================
// API: Fetch approved registrations
// ============================================
async function fetchApprovedRegistrations() {
    if (!GOOGLE_APPS_SCRIPT_URL) {
        console.log('⚠️  GOOGLE_APPS_SCRIPT_URL not configured');
        return [];
    }

    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getApproved`);
        const result = await response.json();

        if (result.success) {
            return result.data || [];
        } else {
            console.error('❌ Failed to fetch data:', result.error);
            return [];
        }
    } catch (error) {
        console.error('❌ Fetch error:', error.message);
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
// Kick Trial User on Expiry
// ============================================
async function kickTrialUser(guild, discordId, userName, rowIndex) {
    console.log(`\n⏱️ Trial expired for ${userName}`);

    try {
        const member = await guild.members.fetch(discordId).catch(() => null);

        if (member) {
            // Send DM before kicking
            await sendTrialExpiryDM(member.user, userName);

            // Kick the member
            await member.kick('Trial Access period expired');
            console.log(`   ✅ Kicked ${member.user.tag} - Trial expired`);
        } else {
            console.log(`   ℹ️ Member ${discordId} already left the server`);
        }

        // Update status in Google Sheets
        const updated = await updateStatus(rowIndex, 'expired');
        if (updated) {
            console.log(`   ✅ Status updated to "expired"`);
        }

        // Remove from active trials
        activeTrials.delete(discordId);

    } catch (error) {
        console.error(`   ❌ Failed to kick trial user ${discordId}:`, error.message);
    }
}

// ============================================
// Process Approval: Remove Pending, Add Trial Access
// ============================================
async function processApproval(guild, registration) {
    const { rowIndex, discordId, name, surname, discordInfo } = registration;
    const userName = `${name} ${surname}`;

    console.log(`\n🔄 Processing approval: ${userName}`);
    console.log(`   Discord: ${discordInfo}`);
    console.log(`   Row: ${rowIndex}`);

    try {
        const member = await guild.members.fetch(discordId).catch(() => null);

        if (!member) {
            console.log(`   ❌ Member ${discordId} not found in server`);
            return false;
        }

        // Remove Pending role
        const pendingRole = guild.roles.cache.get(PENDING_ROLE_ID);
        if (pendingRole && member.roles.cache.has(PENDING_ROLE_ID)) {
            await member.roles.remove(pendingRole);
            console.log(`   ✅ Removed Pending role`);
        }

        // Add Trial Access role
        const trialRole = guild.roles.cache.get(TRIAL_ROLE_ID);
        if (trialRole) {
            await member.roles.add(trialRole);
            console.log(`   ✅ Added Trial Access role`);
        } else {
            console.log(`   ❌ Trial Access role not found: ${TRIAL_ROLE_ID}`);
            return false;
        }

        // Send welcome DM
        await sendTrialWelcomeDM(member.user, userName, TRIAL_DURATION_MINUTES);

        // Start expiry timer
        await startTrialTimer(guild, discordId, userName, rowIndex);

        return true;

    } catch (error) {
        console.error(`   ❌ Error processing approval:`, error.message);
        return false;
    }
}

// ============================================
// Main Polling Function
// ============================================
async function processApprovedRegistrations() {
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Polling for approved registrations...`);

    try {
        const approved = await fetchApprovedRegistrations();

        if (approved.length === 0) {
            console.log(`   ℹ️ No pending approved registrations`);
            return;
        }

        console.log(`📋 Found ${approved.length} approved registration(s)`);

        const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
        if (!guild) {
            console.log('❌ Guild not found. Check DISCORD_GUILD_ID');
            return;
        }

        for (const registration of approved) {
            const rowKey = `${registration.rowIndex}-${registration.connextId}`;

            // Skip if already processed
            if (processedRows.has(rowKey)) {
                continue;
            }

            const success = await processApproval(guild, registration);

            if (success) {
                processedRows.add(rowKey);
            }
        }
    } catch (error) {
        console.error('❌ Error processing registrations:', error.message);
    }
}

// ============================================
// Event: New Member Joins
// ============================================
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== DISCORD_GUILD_ID) return;

    console.log(`\n👋 New member joined: ${member.user.tag} (${member.id})`);

    try {
        // Add Pending role
        const pendingRole = member.guild.roles.cache.get(PENDING_ROLE_ID);
        if (pendingRole) {
            await member.roles.add(pendingRole);
            console.log(`   ✅ Added Pending role to ${member.user.tag}`);
        } else {
            console.log(`   ❌ Pending role not found: ${PENDING_ROLE_ID}`);
        }
    } catch (error) {
        console.error(`   ❌ Failed to add Pending role:`, error.message);
    }
});

// ============================================
// Event: Bot Ready
// ============================================
client.once('ready', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log(`🏠 Guild: ${DISCORD_GUILD_ID}`);
    console.log(`\n📋 Role Configuration:`);
    console.log(`   Pending: ${PENDING_ROLE_ID}`);
    console.log(`   Trial:   ${TRIAL_ROLE_ID}`);
    console.log(`\n⏱️  Trial Duration: ${TRIAL_DURATION_MINUTES} minutes (${process.env.TRIAL_DURATION_MINUTES ? 'from Env Var' : 'using Default'})`);
    console.log(`🔗 Apps Script: ${GOOGLE_APPS_SCRIPT_URL ? 'Configured ✓' : 'NOT CONFIGURED ❌'}`);
    console.log(`⏱️  Polling: Every ${POLL_INTERVAL / 1000}s`);
    console.log(`${'='.repeat(60)}\n`);

    // Initial check
    processApprovedRegistrations();

    // Set up polling interval
    setInterval(processApprovedRegistrations, POLL_INTERVAL);
});

// ============================================
// Error Handling
// ============================================
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// ============================================
// Start Bot
// ============================================
console.log('🚀 Starting Wealthiness Registry Bot...');

if (!DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN not found');
    process.exit(1);
}

if (!GOOGLE_APPS_SCRIPT_URL) {
    console.error('❌ GOOGLE_APPS_SCRIPT_URL not found');
    process.exit(1);
}

if (!DISCORD_GUILD_ID) {
    console.error('❌ DISCORD_GUILD_ID not found');
    process.exit(1);
}

client.login(DISCORD_BOT_TOKEN).catch((error) => {
    console.error('❌ Failed to login:', error.message);
    process.exit(1);
});
