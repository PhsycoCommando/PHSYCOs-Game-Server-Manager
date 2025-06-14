# Discord Webhook Setup Guide

This guide will walk you through setting up a Discord webhook to receive feedback from your Game Server Manager.

## 📋 **Step 1: Create a Discord Webhook**

### **Method 1: Server Settings (Recommended)**
1. **Open Discord** and go to your server
2. **Right-click** on the channel where you want to receive feedback
3. Click **"Edit Channel"**
4. Go to the **"Integrations"** tab
5. Click **"Create Webhook"**
6. **Name your webhook**: `GSM Feedback Bot`
7. **Set the avatar** (optional): Upload a gaming/server icon
8. **Copy the Webhook URL** - it should look like:
   ```
   https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz123456789
   ```

### **Method 2: Discord Developer Portal**
1. Go to https://discord.com/developers/applications
2. Create a new application or select an existing one
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Invite the bot to your server with webhook permissions

## 🔧 **Step 2: Configure the Webhook URL**

You have **two options** to set the webhook URL:

### **Option A: Environment Variable (Recommended)**
1. Create a `.env` file in the `GameServerManager/server/` directory:
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
   ```

2. Install the `dotenv` package:
   ```bash
   cd GameServerManager/server
   npm install dotenv
   ```

3. Update your `server/index.js` to load environment variables at the top:
   ```javascript
   require('dotenv').config();
   ```

### **Option B: Direct Configuration**
Edit the `server/routes/feedback.js` file and replace:
```javascript
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
```

With your actual webhook URL:
```javascript
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE';
```

## 🧪 **Step 3: Test the Webhook**

1. **Start your server**:
   ```bash
   cd GameServerManager/server
   npm start
   ```

2. **Test the webhook** by visiting:
   ```
   http://localhost:54321/api/feedback/test
   ```

3. **Check your Discord channel** - you should see a test message!

## 📝 **What the Discord Messages Look Like**

Your feedback will appear as rich embed messages with:

### **General Feedback** (Blue)
```
📝 New Feedback Received
┌─────────────────────────────────────┐
│ 📋 Type: General       👤 From: John │
│ 📌 Subject: Great tool!              │
│ 📧 Email: john@example.com           │
├─────────────────────────────────────┤
│ Message:                            │
│ Love this server manager! Could we  │
│ add support for Minecraft servers?  │
└─────────────────────────────────────┘
PHSYCO's Game Server Manager • Today at 2:30 PM
```

### **Bug Reports** (Red)
```
🐛 Bug Report Received
┌─────────────────────────────────────┐
│ 📋 Type: Bug          👤 From: Sarah │
│ 📌 Subject: Server won't start       │
├─────────────────────────────────────┤
│ Message:                            │
│ ARK server fails to start with      │
│ error code 1. Console shows...      │
└─────────────────────────────────────┘
```

### **Feature Requests** (Green)
```
💡 Feature Request Received
┌─────────────────────────────────────┐
│ 📋 Type: Feature      👤 From: Mike  │
│ 📌 Subject: Auto-restart feature     │
├─────────────────────────────────────┤
│ Message:                            │
│ Would be awesome to have scheduled  │
│ server restarts for maintenance...   │
└─────────────────────────────────────┘
```

## 🔒 **Security Best Practices**

1. **Keep your webhook URL secret** - don't share it publicly
2. **Use environment variables** instead of hardcoding the URL
3. **Add your `.env` file to `.gitignore`**:
   ```bash
   echo ".env" >> .gitignore
   ```
4. **Consider webhook rate limits** - Discord allows 30 requests per minute

## 🛠️ **Troubleshooting**

### **Webhook Not Working?**
- ✅ Check if the webhook URL is correct
- ✅ Verify the Discord channel permissions
- ✅ Test with: `http://localhost:54321/api/feedback/test`
- ✅ Check server console for error messages

### **Messages Not Appearing?**
- ✅ Make sure the bot/webhook has permission to send messages
- ✅ Check if the channel still exists
- ✅ Verify webhook hasn't been deleted

### **Getting 404 Errors?**
- ✅ Double-check the webhook URL format
- ✅ Make sure you copied the entire URL

## 📊 **Advanced Configuration**

You can customize the webhook messages by editing `server/routes/feedback.js`:

- **Change bot name**: Modify `username: 'GSM Feedback Bot'`
- **Change colors**: Modify the `color` hex values
- **Add more fields**: Add items to the `fields` array
- **Change footer**: Modify the `footer` object

## 🔄 **Webhook URL Update Process**

If you need to change the webhook URL later:

1. **Environment Variable Method**:
   - Just update the `.env` file
   - Restart the server

2. **Direct Configuration Method**:
   - Edit `server/routes/feedback.js`
   - Replace the webhook URL
   - Restart the server

---

## ✅ **Quick Setup Checklist**

- [ ] Created Discord webhook
- [ ] Copied webhook URL
- [ ] Set environment variable or updated code
- [ ] Installed dependencies (`npm install` in server directory)
- [ ] Tested webhook with `/api/feedback/test`
- [ ] Received test message in Discord
- [ ] Tested feedback form in the app

**You're all set!** 🎉 Your Game Server Manager will now send all feedback directly to your Discord channel! 