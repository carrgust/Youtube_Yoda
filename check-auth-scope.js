#!/usr/bin/env node

/**
 * Check authentication scope and permissions
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

async function checkAuthScope() {
  try {
    console.log('🔍 Checking authentication and permissions...\n');

    // Load tokens
    const tokenPath = process.env.HOME + '/.youtube-tokens.json';
    const tokensContent = await fs.readFile(tokenPath, 'utf-8');
    const tokens = JSON.parse(tokensContent);
    
    console.log('📋 Token info:');
    console.log('- Access token present:', !!tokens.access_token);
    console.log('- Refresh token present:', !!tokens.refresh_token);
    console.log('- Token type:', tokens.token_type);
    
    if (tokens.scope) {
      console.log('\n🔐 Authorized scopes:');
      const scopes = tokens.scope.split(' ');
      scopes.forEach(scope => console.log(`  - ${scope}`));
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'http://localhost:3000/oauth2callback'
    );
    
    oauth2Client.setCredentials(tokens);

    // Check if we need the youtube.force-ssl scope for updates
    console.log('\n⚠️  Note: Video updates require the following scope:');
    console.log('   - https://www.googleapis.com/auth/youtube.force-ssl');
    console.log('   OR');
    console.log('   - https://www.googleapis.com/auth/youtube');
    
    // Try a simple API call to test authentication
    console.log('\n🧪 Testing API access...');
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    try {
      const channelResponse = await youtube.channels.list({
        part: ['snippet'],
        mine: true
      });
      
      if (channelResponse.data.items && channelResponse.data.items.length > 0) {
        console.log('✅ API access confirmed!');
        console.log(`📺 Channel: ${channelResponse.data.items[0].snippet.title}`);
      }
    } catch (error) {
      console.error('❌ API test failed:', error.message);
      if (error.code === 403) {
        console.log('\n⚠️  This appears to be a permission issue.');
        console.log('   You may need to re-authenticate with the correct scope.');
      }
    }

    console.log('\n💡 If you\'re getting "invalid_request" errors when updating videos:');
    console.log('   1. You may need the youtube.force-ssl scope');
    console.log('   2. Re-authenticate with: node authenticate.js');
    console.log('   3. Make sure to use the Google account that owns the channel');

  } catch (error) {
    console.error('❌ Error checking auth:', error.message);
  }
}

checkAuthScope();