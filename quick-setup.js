#!/usr/bin/env node

/**
 * Quick Setup Helper for YouTube Authentication
 * This script guides you through the fastest possible setup
 */

const open = require('open');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function quickSetup() {
  console.log('🚀 YouTube CLI Quick Setup');
  console.log('==========================\n');
  
  console.log('⚡ This will get you authenticated in under 3 minutes!\n');
  
  const hasCredentials = await ask('Do you already have YouTube API credentials? (y/n): ');
  
  if (hasCredentials.toLowerCase() === 'y') {
    console.log('\n✅ Great! Let\'s add them to your project.');
    
    const clientId = await ask('Paste your Client ID: ');
    const clientSecret = await ask('Paste your Client Secret: ');
    
    // Update .env file
    const fs = require('fs').promises;
    const envPath = '/Users/gustavocarriconde/github/Youtube_Yoda/.env';
    
    try {
      let envContent = await fs.readFile(envPath, 'utf-8');
      envContent = envContent.replace('YOUTUBE_CLIENT_ID=your_client_id_here', `YOUTUBE_CLIENT_ID=${clientId}`);
      envContent = envContent.replace('YOUTUBE_CLIENT_SECRET=your_client_secret_here', `YOUTUBE_CLIENT_SECRET=${clientSecret}`);
      await fs.writeFile(envPath, envContent);
      
      console.log('\n✅ Credentials saved!');
      console.log('\nNow run: node authenticate.js');
      
    } catch (error) {
      console.error('❌ Error saving credentials:', error.message);
    }
    
  } else {
    console.log('\n📋 No worries! I\'ll guide you through the fastest setup.');
    console.log('\n🌐 Opening Google Cloud Console...');
    
    await open('https://console.cloud.google.com/projectcreate');
    
    console.log('\n📝 Quick Steps:');
    console.log('1. Create project (name: "YouTube CLI")');
    console.log('2. Enable YouTube Data API v3');
    console.log('3. Create OAuth 2.0 credentials');
    console.log('4. Add redirect URI: http://localhost:3000/auth/youtube/callback');
    console.log('5. Copy Client ID and Secret');
    
    console.log('\n⏱️  This should take 2-3 minutes max.');
    
    await ask('\nPress Enter when you have your credentials...');
    
    const clientId = await ask('Paste your Client ID: ');
    const clientSecret = await ask('Paste your Client Secret: ');
    
    // Update .env file
    const fs = require('fs').promises;
    const envPath = '/Users/gustavocarriconde/github/Youtube_Yoda/.env';
    
    try {
      let envContent = await fs.readFile(envPath, 'utf-8');
      envContent = envContent.replace('YOUTUBE_CLIENT_ID=your_client_id_here', `YOUTUBE_CLIENT_ID=${clientId}`);
      envContent = envContent.replace('YOUTUBE_CLIENT_SECRET=your_client_secret_here', `YOUTUBE_CLIENT_SECRET=${clientSecret}`);
      await fs.writeFile(envPath, envContent);
      
      console.log('\n✅ Perfect! Credentials saved.');
      
    } catch (error) {
      console.error('❌ Error saving credentials:', error.message);
    }
  }
  
  console.log('\n🚀 Ready to authenticate! Run:');
  console.log('node authenticate.js');
  
  rl.close();
}

quickSetup().catch(console.error);