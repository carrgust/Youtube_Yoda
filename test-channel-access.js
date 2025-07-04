#!/usr/bin/env node

/**
 * Test channel access with specific channel ID
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function testChannelAccess() {
  try {
    console.log('🔍 Testing channel access...\n');

    // Check for credentials
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      console.error('❌ Missing YouTube API credentials in .env file');
      return;
    }

    // Load tokens
    const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
    
    // Create OAuth2 client
    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'http://localhost:3000/auth/youtube/callback'
    );
    
    auth.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: auth });
    
    // Test 1: Try to get "mine" channel
    console.log('📺 Test 1: Getting authenticated channel...');
    try {
      const mineResponse = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true
      });
      
      if (mineResponse.data.items && mineResponse.data.items.length > 0) {
        const channel = mineResponse.data.items[0];
        console.log('✅ Found authenticated channel:');
        console.log(`   Name: ${channel.snippet.title}`);
        console.log(`   ID: ${channel.id}`);
        console.log(`   Subscribers: ${channel.statistics.subscriberCount}\n`);
      } else {
        console.log('⚠️  No channel found with "mine" parameter\n');
      }
    } catch (error) {
      console.error('❌ Error with "mine" request:', error.message, '\n');
    }

    // Test 2: Try with specific ResumoCast channel ID
    console.log('📺 Test 2: Getting ResumoCast channel by ID...');
    const RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';
    
    try {
      const channelResponse = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [RESUMOCAST_CHANNEL_ID]
      });
      
      if (channelResponse.data.items && channelResponse.data.items.length > 0) {
        const channel = channelResponse.data.items[0];
        console.log('✅ Found ResumoCast channel:');
        console.log(`   Name: ${channel.snippet.title}`);
        console.log(`   ID: ${channel.id}`);
        console.log(`   Subscribers: ${channel.statistics.subscriberCount}\n`);
      } else {
        console.log('❌ ResumoCast channel not found\n');
      }
    } catch (error) {
      console.error('❌ Error accessing ResumoCast:', error.message, '\n');
    }

    // Test 3: Try to list videos from a specific video ID we know exists
    console.log('📺 Test 3: Testing video access...');
    const testVideoId = 'J2XJKvtmrhg'; // One of the videos to optimize
    
    try {
      const videoResponse = await youtube.videos.list({
        part: ['snippet', 'status'],
        id: [testVideoId]
      });
      
      if (videoResponse.data.items && videoResponse.data.items.length > 0) {
        const video = videoResponse.data.items[0];
        console.log('✅ Can access video:');
        console.log(`   Title: ${video.snippet.title}`);
        console.log(`   Channel ID: ${video.snippet.channelId}`);
        console.log(`   Privacy: ${video.status.privacyStatus}`);
        
        // Check if we can manage this video
        if (video.snippet.channelId === RESUMOCAST_CHANNEL_ID) {
          console.log('   ✅ This video belongs to ResumoCast');
        } else {
          console.log('   ⚠️  This video belongs to a different channel');
        }
      } else {
        console.log('❌ Video not found\n');
      }
    } catch (error) {
      console.error('❌ Error accessing video:', error.message, '\n');
    }

    console.log('\n💡 DIAGNOSTIC SUMMARY:');
    console.log('If you can see ResumoCast channel data but "mine" returns nothing,');
    console.log('it means the authenticated account may not be the channel owner.');
    console.log('To update videos, you need to authenticate with the Google account');
    console.log('that owns the ResumoCast channel.');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testChannelAccess();