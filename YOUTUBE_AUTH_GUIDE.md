# 🔐 YouTube Channel Authentication Guide

## Step-by-Step Instructions

### 1️⃣ Get YouTube API Credentials (5 minutes)

1. **Open Google Cloud Console:**
   ```bash
   open https://console.cloud.google.com/
   ```

2. **Create a New Project:**
   - Click "Select a project" dropdown
   - Click "New Project"
   - Project name: `YouTube Yoda` (or any name)
   - Click "Create"

3. **Enable YouTube Data API v3:**
   - In left menu, click "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it
   - Click "ENABLE" button

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   
   **If you see "Configure consent screen" first:**
   - Click it
   - Choose "External" (unless you have Google Workspace)
   - Fill in:
     - App name: "YouTube CLI"
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "SAVE AND CONTINUE"
   - On Scopes page, click "SAVE AND CONTINUE"
   - On Test users page, click "+ ADD USERS"
   - Add your Gmail address
   - Click "SAVE AND CONTINUE"
   - Click "BACK TO DASHBOARD"

5. **Now Create OAuth Client ID:**
   - Go back to "Credentials" → "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "YouTube CLI"
   - Under "Authorized redirect URIs", click "+ ADD URI"
   - Add: `http://localhost:3000/auth/youtube/callback`
   - Click "CREATE"

6. **Copy Your Credentials:**
   - A popup will show your credentials
   - Copy the "Client ID" and "Client secret"
   - Keep this window open!

### 2️⃣ Add Credentials to Your Project

1. **Open the .env file:**
   ```bash
   nano /Users/gustavocarriconde/github/Youtube_Yoda/.env
   ```

2. **Replace the placeholders with your actual credentials:**
   ```env
   YOUTUBE_CLIENT_ID=paste_your_client_id_here
   YOUTUBE_CLIENT_SECRET=paste_your_client_secret_here
   ```

3. **Save the file:**
   - Press `Ctrl+X`, then `Y`, then `Enter`

### 3️⃣ Authenticate Your YouTube Channel

1. **Run the authentication script:**
   ```bash
   cd /Users/gustavocarriconde/github/Youtube_Yoda
   node authenticate.js
   ```

2. **What will happen:**
   - Your browser will open automatically
   - You'll see Google's sign-in page
   - Sign in with your YouTube channel's Google account
   - Grant permissions when asked
   - You'll see "Authentication Successful!" 
   - Return to your terminal

3. **Verify Success:**
   - In the terminal, you should see your channel info:
   ```
   ✅ Successfully connected to YouTube!
   
   📺 Channel Information:
   ========================
   Name: Your Channel Name
   Subscribers: 1234
   Total Views: 56789
   Video Count: 42
   ```

### 4️⃣ Test Your Authentication

Run a simple test:
```bash
node -e "
const { google } = require('googleapis');
const auth = new google.auth.OAuth2();
const tokens = require(process.env.HOME + '/.youtube-tokens.json');
auth.setCredentials(tokens);
const youtube = google.youtube({ version: 'v3', auth });
youtube.channels.list({ part: ['snippet'], mine: true })
  .then(r => console.log('✅ Authenticated as:', r.data.items[0].snippet.title))
  .catch(e => console.error('❌ Error:', e.message));
"
```

## 🎯 Quick Commands After Authentication

### Using the Simple Script
```bash
# List your videos
node -e "require('./authenticate.js')"
```

### Direct API Access
```javascript
// In any JavaScript file:
const { google } = require('googleapis');
const tokens = require(process.env.HOME + '/.youtube-tokens.json');

const oauth2Client = new google.auth.OAuth2();
oauth2Client.setCredentials(tokens);

const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

// Now you can use any YouTube API method!
```

## 🚨 Troubleshooting

### "Access blocked" Error
- Make sure you added your email as a test user in OAuth consent screen
- Check that you're signing in with the correct Google account

### "Invalid redirect URI"
- Ensure the redirect URI in Google Cloud Console exactly matches:
  `http://localhost:3000/auth/youtube/callback`

### "Quota exceeded"
- YouTube API has daily limits (10,000 units)
- Wait until midnight Pacific Time for reset

### Token Expired
- Just run `node authenticate.js` again
- Tokens are saved in `~/.youtube-tokens.json`

## 🔒 Security Notes

- **Never commit** your `.env` file to Git
- **Never share** your Client Secret
- Tokens are stored in your home directory for security
- Tokens auto-refresh when needed

## ✅ You're Authenticated!

Your YouTube channel is now connected. You can:
- Upload videos programmatically
- Manage playlists
- Respond to comments
- View analytics
- Update video metadata
- And much more!

Next step: Try the YouTube CLI or build your own automations!