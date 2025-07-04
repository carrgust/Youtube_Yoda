#!/usr/bin/env node

/**
 * Check manager permissions and channel management capabilities
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function checkManagerPermissions() {
  try {
    console.log('🔍 Checking Manager Account Permissions\n');

    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      console.error('❌ Missing YouTube API credentials');
      return;
    }

    const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
    
    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'http://localhost:3000/auth/youtube/callback'
    );
    
    auth.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: auth });
    
    console.log('📋 PERMISSION LEVELS IN YOUTUBE:');
    console.log('================================');
    console.log('• OWNER: Full access to everything');
    console.log('• MANAGER: Can edit videos, upload, manage channel');
    console.log('• EDITOR: Can edit video details but limited admin');
    console.log('• VIEWER: Read-only access\n');

    // Test 1: Check channel access via channelSections (managers can access)
    console.log('🧪 Test 1: Checking channel management access...');
    try {
      const sectionsResponse = await youtube.channelSections.list({
        part: ['snippet'],
        channelId: 'UC-_86oFtIIsl7sfcJSxmpYQ'
      });
      console.log('✅ Can access channel sections (indicates management access)\n');
    } catch (error) {
      console.log('❌ Cannot access channel sections\n');
    }

    // Test 2: Try to access via myRating (indicates some level of control)
    console.log('🧪 Test 2: Checking video management capabilities...');
    const testVideoId = 'J2XJKvtmrhg';
    
    try {
      // First get the video to ensure we have the right data
      const videoResponse = await youtube.videos.list({
        part: ['snippet', 'status'],
        id: [testVideoId]
      });

      if (videoResponse.data.items && videoResponse.data.items.length > 0) {
        const video = videoResponse.data.items[0];
        console.log(`✅ Can read video: "${video.snippet.title}"`);
        
        // Try a minimal update to test write permissions
        console.log('\n🧪 Test 3: Testing UPDATE permissions...');
        try {
          // Try to update just the title with minimal change
          const updateResponse = await youtube.videos.update({
            part: ['snippet'],
            requestBody: {
              id: testVideoId,
              snippet: {
                title: video.snippet.title, // Same title first
                categoryId: video.snippet.categoryId,
                defaultLanguage: video.snippet.defaultLanguage || 'pt'
              }
            }
          });
          
          console.log('✅ UPDATE TEST SUCCESSFUL - Manager can modify videos!');
          console.log('   Your manager account HAS write permissions.\n');
        } catch (updateError) {
          console.log('❌ UPDATE TEST FAILED');
          console.log(`   Error: ${updateError.message}`);
          
          if (updateError.code === 403) {
            console.log('\n⚠️  PERMISSION ISSUE DETECTED:');
            console.log('   Your account can READ but cannot WRITE.');
            console.log('   Possible reasons:');
            console.log('   1. Manager permissions may be restricted');
            console.log('   2. Channel owner may have limited manager capabilities');
            console.log('   3. API project may not be properly linked to channel\n');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in video test:', error.message);
    }

    // Test 4: Check what we CAN do
    console.log('🧪 Test 4: Checking alternative approaches...');
    console.log('\n📋 MANAGER WORKAROUNDS:');
    console.log('If direct updates fail, managers can sometimes:');
    console.log('1. Use YouTube Studio directly (manual updates)');
    console.log('2. Request owner to grant additional API permissions');
    console.log('3. Have owner create API project under channel\'s brand account');
    
    console.log('\n💡 RECOMMENDATION:');
    console.log('If you\'re getting permission errors as a manager:');
    console.log('1. The channel owner needs to do the updates, OR');
    console.log('2. The owner needs to create the API project under the channel\'s account');
    console.log('3. You could do manual updates through YouTube Studio');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

checkManagerPermissions();