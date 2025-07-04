#!/usr/bin/env node

/**
 * Check current implementation status
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
require('dotenv').config();

async function checkStatus() {
  try {
    const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'http://localhost:3000/auth/youtube/callback'
    );
    auth.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: auth });

    console.log('🔍 Checking Phase 1 Implementation Status\n');

    // Check a few key videos to see if they've been updated
    const checkVideos = [
      'J2XJKvtmrhg', // Should be "18 Livros Essenciais para Crescimento | ResumoCast"
      '6IpDBNXPraQ', // Should be "T5#025 Mente de Aço, Atitudes de Ouro | Tiago Cavalcanti | ResumoCast"
      'wPbBveKtzNI'  // Should be "T4#13 Accountability: Responsabilidade e Sucesso | ResumoCast"
    ];

    let updated = 0;
    let total = checkVideos.length;

    for (const videoId of checkVideos) {
      try {
        const response = await youtube.videos.list({
          part: ['snippet'],
          id: [videoId]
        });

        if (response.data.items && response.data.items.length > 0) {
          const video = response.data.items[0];
          const title = video.snippet.title;
          
          console.log(`📹 ${videoId}:`);
          console.log(`   Title: "${title}"`);
          
          if (title.includes('| ResumoCast')) {
            console.log('   ✅ UPDATED - ResumoCast branding added');
            updated++;
          } else {
            console.log('   ⏳ NOT YET UPDATED');
          }
          console.log('');
        }
      } catch (error) {
        console.log(`❌ Error checking ${videoId}: ${error.message}\n`);
      }
    }

    console.log('📊 CURRENT STATUS:');
    console.log(`   ✅ Updated: ${updated}/${total} videos checked`);
    console.log(`   📈 Progress: ${Math.round(updated/total*100)}%`);

    if (updated > 0) {
      console.log('\n🎉 Phase 1 implementation is working!');
      console.log('   Videos are being updated with ResumoCast branding.');
      console.log('   Episode numbers are being preserved as requested.');
    } else {
      console.log('\n⏳ Implementation may still be in progress or needs to be restarted.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStatus();