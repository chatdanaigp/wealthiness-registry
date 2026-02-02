# Deploy Discord Bot on Render.com (Free)

> **หมายเหตุ:** Render Free Tier จะเข้าโหมด Sleep หลัง 15 นาที ต้องใช้ **UptimeRobot** ช่วยปลุก

---

## ขั้นตอนที่ 1: สมัคร Render.com

1. ไปที่ [dashboard.render.com/register](https://dashboard.render.com/register)
2. เลือก **Sign up with GitHub**

---

## ขั้นตอนที่ 2: สร้าง Web Service

1. กด **New +** → **Web Service**
2. เลือก Repository: `wealthiness-registry`
3. ตั้งค่า:
   | Setting | Value |
   |---------|-------|
   | Name | `wealthiness-registry-bot` |
   | Region | `Singapore` (หรือใกล้ที่สุด) |
   | Branch | `main` |
   | Root Directory | `.` |
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm run start:bot` |
   | Instance Type | `Free` |

4. **Environment Variables:**
   ```
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_GUILD_ID=your_guild_id
   DISCORD_PENDING_ROLE_ID=1467623644380528832
   DISCORD_TRIAL_ROLE_ID=1467593168844361846
   GOOGLE_APPS_SCRIPT_URL=your_apps_script_url
   TRIAL_DURATION_MINUTES=3
   PORT=10000
   ```

5. กด **Create Web Service**

---

## ขั้นตอนที่ 3: ตั้งค่า UptimeRobot

เพื่อให้ Bot ไม่หลับ:

1. ไปที่ [uptimerobot.com](https://uptimerobot.com/) สมัครสมาชิกฟรี
2. กด **Add New Monitor**
   | Setting | Value |
   |---------|-------|
   | Monitor Type | `HTTP(s)` |
   | Friendly Name | `Wealthiness Registry Bot` |
   | URL | URL จาก Render.com (เช่น `https://wealthiness-registry-bot.onrender.com`) |
   | Monitoring Interval | `5 minutes` |

3. กด **Create Monitor**

---

## ✅ เสร็จสิ้น!

Bot จะทำงาน 24/7 บน Render ฟรี

### ทดสอบ Bot
1. เปลี่ยน status ใน Google Sheet เป็น `Approved Trial Access`
2. รอ 30 วินาที Bot จะ detect และให้ Trial Access role
3. รอ 3 นาที (หรือตาม TRIAL_DURATION_MINUTES) Bot จะเตะ User ออก
