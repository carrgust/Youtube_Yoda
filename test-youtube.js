#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function testYouTube() {
  console.log('🧪 YouTube API Test');
  console.log('==================\n');

  try {
    // Load tokens
    const tokens = JSON.parse(fs.readFileSync(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
    console.log('✅ Authentication tokens found');

    // Create auth client
    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    console.log('✅ OAuth client configured');

    // Create YouTube client
    const youtube = google.youtube({ version: 'v3', auth });
    console.log('✅ YouTube API client created');

    // Test 1: Check for channels
    console.log('\n🔍 Checking for YouTube channels...');
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });

    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channel = channelResponse.data.items[0];
      console.log('✅ Found YouTube channel!');
      console.log(`📺 Name: ${channel.snippet.title}`);
      console.log(`👥 Subscribers: ${channel.statistics.subscriberCount}`);
      console.log(`👀 Total Views: ${channel.statistics.viewCount}`);
      console.log(`🎬 Videos: ${channel.statistics.videoCount}`);
      console.log(`🆔 Channel ID: ${channel.id}`);
    } else {
      console.log('⚠️  No YouTube channel found for this Google account.');
      console.log('\n💡 This means either:');
      console.log('   1. You signed in with the wrong Google account');
      console.log('   2. This Google account doesn\'t have a YouTube channel yet');
      console.log('   3. The channel isn\'t activated');
      
      console.log('\n🎯 Solutions:');
      console.log('   • Visit https://youtube.com and create a channel');
      console.log('   • Or re-authenticate with the correct Google account');
    }

    // Test 2: Try search (doesn't require channel)
    console.log('\n🔍 Testing general API access...');
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: 'test',
      maxResults: 1,
      type: 'video'
    });

    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      console.log('✅ General YouTube API access works!');
      console.log('🔍 Search test successful');
    } else {
      console.log('❌ Search test failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Token expired. Run: node authenticate.js');
    } else if (error.message.includes('quotaExceeded')) {
      console.log('\n💡 API quota exceeded. Try again tomorrow.');
    } else {
      console.log('\n💡 Check your API credentials in .env file');
    }
  }
}

testYouTube();