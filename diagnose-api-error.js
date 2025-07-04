#!/usr/bin/env node

/**
 * Diagnose API Error - Test single video update to get detailed error
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

async function diagnoseError() {
  try {
    // Initialize API
    const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: auth });
    
    console.log('✅ API initialized\n');

    // Test with a single video
    const testVideoId = 'J2XJKvtmrhg';
    
    // First, get current video details
    console.log('📹 Getting current video details...');
    const currentVideo = await youtube.videos.list({
      part: ['snippet', 'status'],
      id: [testVideoId]
    });

    if (!currentVideo.data.items || currentVideo.data.items.length === 0) {
      console.log('❌ Video not found or no access');
      return;
    }

    const video = currentVideo.data.items[0];
    console.log('✅ Current title:', video.snippet.title);
    console.log('📂 Category ID:', video.snippet.categoryId);
    console.log('🔐 Privacy status:', video.status.privacyStatus);
    console.log('');

    // Try to update with minimal changes
    console.log('🔄 Attempting to update title...');
    try {
      const updateResponse = await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: testVideoId,
          snippet: {
            title: '18 Livros Essenciais para Crescimento | ResumoCast',
            description: video.snippet.description,
            tags: video.snippet.tags,
            categoryId: video.snippet.categoryId
          }
        }
      });

      console.log('✅ Update successful!');
      console.log('New title:', updateResponse.data.snippet.title);
    } catch (error) {
      console.error('❌ Update failed with error:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('\nDetailed error response:');
        console.error(JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.errors) {
        console.error('\nError details:');
        error.errors.forEach(err => {
          console.error(`- ${err.reason}: ${err.message}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Initialization error:', error.message);
  }
}

diagnoseError();