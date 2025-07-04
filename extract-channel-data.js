#!/usr/bin/env node

/**
 * ResumoCast Channel Data Extraction
 * Comprehensive data export for optimization analysis
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

const RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';
const DATA_DIR = path.join(__dirname, 'data');

class ChannelDataExtractor {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.extractedData = {
      channelInfo: null,
      videos: [],
      playlists: [],
      analytics: {},
      extractionTimestamp: new Date().toISOString()
    };
  }

  async initialize() {
    try {
      const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials(tokens);
      this.youtube = google.youtube({ version: 'v3', auth: this.auth });
      console.log('✅ YouTube API initialized');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async extractChannelInfo() {
    console.log('📺 Extracting channel information...');
    
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings', 'contentDetails'],
        id: [RESUMOCAST_CHANNEL_ID]
      });

      this.extractedData.channelInfo = response.data.items[0];
      console.log(`✅ Channel info extracted: ${this.extractedData.channelInfo.snippet.title}`);
      console.log(`📊 Stats: ${this.extractedData.channelInfo.statistics.subscriberCount} subscribers, ${this.extractedData.channelInfo.statistics.videoCount} videos`);
      
    } catch (error) {
      console.error('❌ Failed to extract channel info:', error.message);
    }
  }

  async extractAllVideos() {
    console.log('🎬 Extracting all videos (this may take a few minutes)...');
    
    let allVideos = [];
    let nextPageToken = null;
    let pageCount = 0;

    try {
      do {
        pageCount++;
        console.log(`📄 Processing page ${pageCount}...`);
        
        // Search for videos from this channel
        const searchResponse = await this.youtube.search.list({
          part: ['id', 'snippet'],
          channelId: RESUMOCAST_CHANNEL_ID,
          maxResults: 50,
          order: 'date',
          type: 'video',
          pageToken: nextPageToken
        });

        if (searchResponse.data.items) {
          // Get detailed video info for each video
          const videoIds = searchResponse.data.items.map(item => item.id.videoId);
          
          const detailsResponse = await this.youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails', 'status'],
            id: videoIds
          });

          allVideos = allVideos.concat(detailsResponse.data.items || []);
          console.log(`📊 Extracted ${allVideos.length} videos so far...`);
        }

        nextPageToken = searchResponse.data.nextPageToken;
        
        // Small delay to avoid rate limiting
        await this.delay(100);
        
      } while (nextPageToken);

      this.extractedData.videos = allVideos;
      console.log(`✅ Total videos extracted: ${allVideos.length}`);
      
    } catch (error) {
      console.error('❌ Failed to extract videos:', error.message);
      console.log(`📊 Partial extraction: ${allVideos.length} videos before error`);
      this.extractedData.videos = allVideos;
    }
  }

  async extractPlaylists() {
    console.log('📋 Extracting playlists...');
    
    try {
      const response = await this.youtube.playlists.list({
        part: ['snippet', 'contentDetails', 'status'],
        channelId: RESUMOCAST_CHANNEL_ID,
        maxResults: 50
      });

      this.extractedData.playlists = response.data.items || [];
      console.log(`✅ Playlists extracted: ${this.extractedData.playlists.length}`);
      
    } catch (error) {
      console.error('❌ Failed to extract playlists:', error.message);
    }
  }

  async analyzePerformance() {
    console.log('📈 Analyzing video performance...');
    
    const videos = this.extractedData.videos;
    if (videos.length === 0) return;

    // Calculate performance metrics
    const analytics = {
      totalVideos: videos.length,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      averageViews: 0,
      topPerformers: [],
      underPerformers: [],
      uploadFrequency: {},
      contentThemes: {}
    };

    // Process each video
    videos.forEach(video => {
      const stats = video.statistics || {};
      const views = parseInt(stats.viewCount || 0);
      const likes = parseInt(stats.likeCount || 0);
      const comments = parseInt(stats.commentCount || 0);

      analytics.totalViews += views;
      analytics.totalLikes += likes;
      analytics.totalComments += comments;

      // Track upload frequency by month
      const publishDate = new Date(video.snippet.publishedAt);
      const monthKey = `${publishDate.getFullYear()}-${publishDate.getMonth() + 1}`;
      analytics.uploadFrequency[monthKey] = (analytics.uploadFrequency[monthKey] || 0) + 1;

      // Analyze content themes from titles
      const title = video.snippet.title.toLowerCase();
      const themes = this.extractThemes(title);
      themes.forEach(theme => {
        analytics.contentThemes[theme] = (analytics.contentThemes[theme] || 0) + 1;
      });
    });

    analytics.averageViews = Math.round(analytics.totalViews / analytics.totalVideos);

    // Sort videos by performance
    const sortedByViews = videos
      .map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        views: parseInt(video.statistics?.viewCount || 0),
        likes: parseInt(video.statistics?.likeCount || 0),
        comments: parseInt(video.statistics?.commentCount || 0),
        publishedAt: video.snippet.publishedAt
      }))
      .sort((a, b) => b.views - a.views);

    analytics.topPerformers = sortedByViews.slice(0, 20);
    analytics.underPerformers = sortedByViews.slice(-20);

    this.extractedData.analytics = analytics;
    
    console.log(`✅ Performance analysis complete:`);
    console.log(`   📊 Average views per video: ${analytics.averageViews.toLocaleString()}`);
    console.log(`   🏆 Best performing video: ${analytics.topPerformers[0]?.title} (${analytics.topPerformers[0]?.views.toLocaleString()} views)`);
    console.log(`   📈 Total channel views: ${analytics.totalViews.toLocaleString()}`);
  }

  extractThemes(title) {
    const themes = [];
    const keywords = {
      'liderança': ['líder', 'liderança', 'leadership', 'gestão'],
      'empreendedorismo': ['empreendedor', 'startup', 'negócio', 'empresa'],
      'produtividade': ['produtividade', 'eficiência', 'tempo', 'gestão'],
      'mindset': ['mindset', 'mentalidade', 'psicologia', 'comportamento'],
      'investimentos': ['investimento', 'dinheiro', 'financeiro', 'rico'],
      'vendas': ['vendas', 'marketing', 'cliente', 'persuasão'],
      'sucesso': ['sucesso', 'vencer', 'vitória', 'conquista']
    };

    Object.entries(keywords).forEach(([theme, words]) => {
      if (words.some(word => title.includes(word))) {
        themes.push(theme);
      }
    });

    return themes;
  }

  async saveData() {
    console.log('💾 Saving extracted data...');
    
    try {
      // Save channel info
      await fs.writeFile(
        path.join(DATA_DIR, 'channel-export', 'channel-info.json'),
        JSON.stringify(this.extractedData.channelInfo, null, 2)
      );

      // Save videos metadata
      await fs.writeFile(
        path.join(DATA_DIR, 'channel-export', 'videos-metadata.json'),
        JSON.stringify(this.extractedData.videos, null, 2)
      );

      // Save playlists
      await fs.writeFile(
        path.join(DATA_DIR, 'channel-export', 'playlists.json'),
        JSON.stringify(this.extractedData.playlists, null, 2)
      );

      // Save analytics
      await fs.writeFile(
        path.join(DATA_DIR, 'analysis', 'performance-analysis.json'),
        JSON.stringify(this.extractedData.analytics, null, 2)
      );

      // Save complete export with timestamp
      await fs.writeFile(
        path.join(DATA_DIR, 'channel-export', `complete-export-${Date.now()}.json`),
        JSON.stringify(this.extractedData, null, 2)
      );

      console.log('✅ All data saved successfully!');
      console.log(`📁 Data location: ${DATA_DIR}`);
      
    } catch (error) {
      console.error('❌ Failed to save data:', error.message);
    }
  }

  async generateSummaryReport() {
    console.log('\n📋 EXTRACTION SUMMARY REPORT');
    console.log('============================\n');
    
    const { channelInfo, videos, analytics } = this.extractedData;
    
    if (channelInfo) {
      console.log('📺 CHANNEL OVERVIEW:');
      console.log(`   Name: ${channelInfo.snippet.title}`);
      console.log(`   Subscribers: ${parseInt(channelInfo.statistics.subscriberCount).toLocaleString()}`);
      console.log(`   Total Views: ${parseInt(channelInfo.statistics.viewCount).toLocaleString()}`);
      console.log(`   Videos: ${channelInfo.statistics.videoCount}\n`);
    }

    if (videos.length > 0) {
      console.log('🎬 VIDEO ANALYSIS:');
      console.log(`   Extracted: ${videos.length} videos`);
      console.log(`   Average Views: ${analytics.averageViews?.toLocaleString() || 'N/A'}`);
      console.log(`   Total Channel Views: ${analytics.totalViews?.toLocaleString() || 'N/A'}\n`);
    }

    if (analytics.topPerformers?.length > 0) {
      console.log('🏆 TOP 5 PERFORMING VIDEOS:');
      analytics.topPerformers.slice(0, 5).forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.title.substring(0, 50)}... (${video.views.toLocaleString()} views)`);
      });
      console.log('');
    }

    if (analytics.contentThemes) {
      console.log('📊 CONTENT THEMES:');
      const sortedThemes = Object.entries(analytics.contentThemes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      sortedThemes.forEach(([theme, count]) => {
        console.log(`   ${theme}: ${count} videos`);
      });
      console.log('');
    }

    console.log('📁 FILES CREATED:');
    console.log('   data/channel-export/channel-info.json');
    console.log('   data/channel-export/videos-metadata.json');
    console.log('   data/channel-export/playlists.json');
    console.log('   data/analysis/performance-analysis.json');
    console.log('   data/channel-export/complete-export-[timestamp].json\n');
    
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Review the extracted data in the JSON files');
    console.log('   2. Run optimization analysis on the data');
    console.log('   3. Apply improvements to underperforming content');
    console.log('   4. Set up automated optimization workflows\n');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  console.log('🚀 ResumoCast Channel Data Extraction');
  console.log('=====================================\n');

  const extractor = new ChannelDataExtractor();
  
  if (!(await extractor.initialize())) {
    console.log('❌ Failed to initialize. Please run: node authenticate.js');
    return;
  }

  console.log('⏱️  Starting comprehensive data extraction...\n');
  
  await extractor.extractChannelInfo();
  await extractor.extractAllVideos();
  await extractor.extractPlaylists();
  await extractor.analyzePerformance();
  await extractor.saveData();
  await extractor.generateSummaryReport();
  
  console.log('🎉 Data extraction completed successfully!');
}

main().catch(console.error);