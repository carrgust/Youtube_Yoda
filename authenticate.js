#!/usr/bin/env node

/**
 * Simple YouTube Authentication Script
 * Run this to authenticate with your YouTube channel
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/auth/youtube/callback`;
const TOKEN_PATH = path.join(process.env.HOME || '', '.youtube-tokens.json');

// Check for credentials
if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
  console.error('❌ Missing YouTube API credentials!');
  console.error('\n📝 Please add these to your .env file:');
  console.error('YOUTUBE_CLIENT_ID=your_client_id_here');
  console.error('YOUTUBE_CLIENT_SECRET=your_client_secret_here');
  console.error('\nGet them from: https://console.cloud.google.com/');
  process.exit(1);
}

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

// YouTube API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/yt-analytics.readonly'
];

async function authenticate() {
  console.log('🚀 YouTube Authentication');
  console.log('========================\n');

  // Check if we already have tokens
  try {
    const tokenData = await fs.readFile(TOKEN_PATH, 'utf-8');
    const tokens = JSON.parse(tokenData);
    oauth2Client.setCredentials(tokens);
    
    console.log('✅ Found existing authentication!');
    await testConnection();
    return;
  } catch (error) {
    console.log('📝 No existing authentication found. Starting OAuth flow...\n');
  }

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  // Create temporary server to handle callback
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/auth/youtube/callback')) {
        const queryObject = url.parse(req.url, true).query;
        
        if (queryObject.error) {
          res.end('Authentication failed: ' + queryObject.error);
          server.close();
          return;
        }

        const code = queryObject.code;
        console.log('\n✅ Authorization code received!');

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Save tokens
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('✅ Tokens saved successfully!');

        // Send success response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>✅ Authentication Successful!</h1>
              <p>You can now close this window and return to the terminal.</p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
          </html>
        `);

        server.close();

        // Test the connection
        await testConnection();
      }
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      res.end('Authentication failed. Please check the terminal.');
      server.close();
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 Local server started on port ${PORT}`);
    console.log('📋 Opening browser for authentication...\n');
    console.log('If browser doesn\'t open, visit this URL:');
    console.log(authUrl);
    console.log('\n');
    
    // Open browser
    open(authUrl);
  });
}

async function testConnection() {
  console.log('\n🔍 Testing YouTube connection...');
  
  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  try {
    // Get channel info
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      console.log('\n✅ Successfully connected to YouTube!\n');
      console.log('📺 Channel Information:');
      console.log('========================');
      console.log(`Name: ${channel.snippet.title}`);
      console.log(`Subscribers: ${channel.statistics.subscriberCount}`);
      console.log(`Total Views: ${channel.statistics.viewCount}`);
      console.log(`Video Count: ${channel.statistics.videoCount}`);
      console.log(`Channel ID: ${channel.id}`);
      console.log('\n🎉 You\'re all set! You can now use the YouTube CLI.\n');
    }
  } catch (error) {
    console.error('❌ Failed to connect to YouTube:', error.message);
    console.error('\nPlease try authenticating again.');
  }
}

// Run authentication
authenticate().catch(console.error);