#!/usr/bin/env node

/**
 * ResumoCast YouTube CLI
 * Custom CLI for managing ResumoCast channel
 */

const { google } = require('googleapis');
const fs = require('fs');

// Your ResumoCast channel ID
const RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';

class ResumoCastCLI {
  constructor() {
    this.youtube = null;
    this.auth = null;
  }

  async initialize() {
    try {
      const tokens = JSON.parse(fs.readFileSync(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials(tokens);
      this.youtube = google.youtube({ version: 'v3', auth: this.auth });
      return true;
    } catch (error) {
      console.error('❌ Authentication failed. Run: node authenticate.js');
      return false;
    }
  }

  async showChannelInfo() {
    console.log('📺 ResumoCast Channel Information');
    console.log('================================\n');

    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings'],
        id: [RESUMOCAST_CHANNEL_ID]
      });

      const channel = response.data.items[0];
      
      console.log(`📝 Name: ${channel.snippet.title}`);
      console.log(`🆔 Channel ID: ${channel.id}`);
      console.log(`👥 Subscribers: ${parseInt(channel.statistics.subscriberCount).toLocaleString()}`);
      console.log(`👀 Total Views: ${parseInt(channel.statistics.viewCount).toLocaleString()}`);
      console.log(`🎬 Videos: ${channel.statistics.videoCount}`);
      console.log(`📅 Created: ${new Date(channel.snippet.publishedAt).toLocaleDateString()}`);
      console.log(`🌍 Country: ${channel.snippet.country}`);
      console.log(`🔗 Custom URL: @${channel.snippet.customUrl}`);
      
      console.log(`\n📖 Description:`);
      console.log(channel.snippet.description.substring(0, 200) + '...');
      
    } catch (error) {
      console.error('❌ Error fetching channel info:', error.message);
    }
  }

  async listVideos(maxResults = 10) {
    console.log(`📹 Latest ${maxResults} Videos from ResumoCast`);
    console.log('===========================================\n');

    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId: RESUMOCAST_CHANNEL_ID,
        maxResults: maxResults,
        order: 'date',
        type: 'video'
      });

      response.data.items.forEach((video, index) => {
        console.log(`${index + 1}. ${video.snippet.title}`);
        console.log(`   📅 ${new Date(video.snippet.publishedAt).toLocaleDateString()}`);
        console.log(`   🔗 https://youtube.com/watch?v=${video.id.videoId}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error fetching videos:', error.message);
    }
  }

  async uploadVideo(videoPath, title, description, tags = []) {
    console.log('⬆️  Uploading video to ResumoCast...');

    try {
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title,
            description: description,
            tags: tags,
            categoryId: '27', // Education category
            defaultLanguage: 'pt',
            defaultAudioLanguage: 'pt'
          },
          status: {
            privacyStatus: 'private', // Start as private
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      });

      console.log('✅ Video uploaded successfully!');
      console.log(`🆔 Video ID: ${response.data.id}`);
      console.log(`🔗 URL: https://youtube.com/watch?v=${response.data.id}`);
      console.log('📝 Status: Private (ready for review)');

    } catch (error) {
      console.error('❌ Upload failed:', error.message);
    }
  }

  async getVideoAnalytics(videoId) {
    console.log(`📊 Analytics for Video: ${videoId}`);
    console.log('===============================\n');

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId]
      });

      const video = response.data.items[0];
      
      console.log(`📝 Title: ${video.snippet.title}`);
      console.log(`👀 Views: ${parseInt(video.statistics.viewCount || 0).toLocaleString()}`);
      console.log(`👍 Likes: ${parseInt(video.statistics.likeCount || 0).toLocaleString()}`);
      console.log(`💬 Comments: ${parseInt(video.statistics.commentCount || 0).toLocaleString()}`);
      console.log(`⏱️  Duration: ${video.contentDetails.duration}`);
      console.log(`📅 Published: ${new Date(video.snippet.publishedAt).toLocaleDateString()}`);

    } catch (error) {
      console.error('❌ Error fetching analytics:', error.message);
    }
  }

  async showCommands() {
    console.log('🎬 ResumoCast YouTube CLI Commands');
    console.log('==================================\n');
    console.log('Channel Management:');
    console.log('  node resumocast-cli.js info          - Show channel information');
    console.log('  node resumocast-cli.js videos [count] - List latest videos');
    console.log('');
    console.log('Video Operations:');
    console.log('  node resumocast-cli.js upload <file> <title> - Upload video');
    console.log('  node resumocast-cli.js analytics <videoId>   - Get video analytics');
    console.log('');
    console.log('Examples:');
    console.log('  node resumocast-cli.js info');
    console.log('  node resumocast-cli.js videos 5');
    console.log('  node resumocast-cli.js upload video.mp4 "Livro: Como Vencer"');
    console.log('');
  }
}

// CLI Interface
async function main() {
  const cli = new ResumoCastCLI();
  
  if (!(await cli.initialize())) {
    return;
  }

  const command = process.argv[2];
  
  switch (command) {
    case 'info':
      await cli.showChannelInfo();
      break;
      
    case 'videos':
      const count = parseInt(process.argv[3]) || 10;
      await cli.listVideos(count);
      break;
      
    case 'upload':
      const videoPath = process.argv[3];
      const title = process.argv[4];
      if (!videoPath || !title) {
        console.log('Usage: node resumocast-cli.js upload <video-file> <title>');
        return;
      }
      await cli.uploadVideo(videoPath, title, 'Uploaded via CLI');
      break;
      
    case 'analytics':
      const videoId = process.argv[3];
      if (!videoId) {
        console.log('Usage: node resumocast-cli.js analytics <video-id>');
        return;
      }
      await cli.getVideoAnalytics(videoId);
      break;
      
    default:
      await cli.showCommands();
  }
}

main().catch(console.error);