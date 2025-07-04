#!/usr/bin/env node

/**
 * Channel Performance Analysis using YouTube Data API
 * Identifies optimization opportunities and performance insights
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class ChannelPerformanceAnalysis {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.dataDir = path.join(__dirname, 'data');
    this.RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';
  }

  async initialize() {
    try {
      if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
        console.error('❌ Missing YouTube API credentials');
        return false;
      }

      const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
      
      this.auth = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        'http://localhost:3000/auth/youtube/callback'
      );
      
      this.auth.setCredentials(tokens);
      this.youtube = google.youtube({ version: 'v3', auth: this.auth });
      
      console.log('✅ YouTube Data API initialized');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async getChannelInfo() {
    console.log('\n📺 EXTRACTING CHANNEL INFORMATION');
    console.log('==================================\n');

    try {
      const channelResponse = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails', 'brandingSettings'],
        id: [this.RESUMOCAST_CHANNEL_ID]
      });

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = channelResponse.data.items[0];
      console.log(`✅ Channel: ${channel.snippet.title}`);
      console.log(`📊 Subscribers: ${parseInt(channel.statistics.subscriberCount).toLocaleString()}`);
      console.log(`🎬 Total Videos: ${channel.statistics.videoCount}`);
      console.log(`👁️ Total Views: ${parseInt(channel.statistics.viewCount).toLocaleString()}\n`);

      return channel;
    } catch (error) {
      console.error('❌ Error fetching channel info:', error.message);
      return null;
    }
  }

  async getAllVideos() {
    console.log('📹 EXTRACTING ALL VIDEO DATA');
    console.log('=============================\n');

    try {
      // Get uploads playlist
      const channelResponse = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: [this.RESUMOCAST_CHANNEL_ID]
      });

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

      let allVideos = [];
      let nextPageToken = null;

      do {
        const playlistResponse = await this.youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: 50,
          pageToken: nextPageToken
        });

        const videoIds = playlistResponse.data.items.map(item => item.snippet.resourceId.videoId);
        
        // Get detailed video information in batches
        for (let i = 0; i < videoIds.length; i += 50) {
          const batchIds = videoIds.slice(i, i + 50);
          
          const videosResponse = await this.youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails', 'status'],
            id: batchIds
          });

          allVideos = allVideos.concat(videosResponse.data.items);
          await this.delay(500); // Rate limiting
        }

        nextPageToken = playlistResponse.data.nextPageToken;
        console.log(`📊 Processed ${allVideos.length} videos...`);
        
      } while (nextPageToken);

      console.log(`✅ Extracted complete data for ${allVideos.length} videos\n`);
      return allVideos;

    } catch (error) {
      console.error('❌ Error fetching videos:', error.message);
      return [];
    }
  }

  analyzePerformance(videos) {
    console.log('🔍 ANALYZING VIDEO PERFORMANCE');
    console.log('===============================\n');

    const analysis = {
      totalVideos: videos.length,
      performanceMetrics: {
        avgViews: 0,
        avgLikes: 0,
        avgComments: 0,
        totalViews: 0,
        totalEngagements: 0
      },
      topPerformers: [],
      underperformers: [],
      optimizationOpportunities: [],
      contentAnalysis: {
        withResumoCastBranding: 0,
        withoutBranding: 0,
        withEpisodeNumbers: 0,
        shortDescriptions: 0,
        fewTags: 0,
        noTags: 0
      },
      publishingTrends: {},
      lowHangingFruit: []
    };

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    videos.forEach(video => {
      const views = parseInt(video.statistics.viewCount || 0);
      const likes = parseInt(video.statistics.likeCount || 0);
      const comments = parseInt(video.statistics.commentCount || 0);
      const title = video.snippet.title;
      const description = video.snippet.description || '';
      const tags = video.snippet.tags || [];
      const publishedAt = new Date(video.snippet.publishedAt);

      totalViews += views;
      totalLikes += likes;
      totalComments += comments;

      // Content analysis
      if (title.toLowerCase().includes('resumocast')) {
        analysis.contentAnalysis.withResumoCastBranding++;
      } else {
        analysis.contentAnalysis.withoutBranding++;
      }

      if (title.match(/T\d+#\d+/)) {
        analysis.contentAnalysis.withEpisodeNumbers++;
      }

      if (description.length < 500) {
        analysis.contentAnalysis.shortDescriptions++;
      }

      if (tags.length < 5) {
        analysis.contentAnalysis.fewTags++;
      }

      if (tags.length === 0) {
        analysis.contentAnalysis.noTags++;
      }

      // Performance categorization
      const engagementRate = views > 0 ? ((likes + comments) / views * 100) : 0;
      const videoData = {
        id: video.id,
        title: title,
        views: views,
        likes: likes,
        comments: comments,
        engagementRate: engagementRate,
        publishedAt: publishedAt,
        duration: video.contentDetails.duration,
        hasResumoCastBranding: title.toLowerCase().includes('resumocast'),
        hasEpisodeNumber: !!title.match(/T\d+#\d+/),
        tagCount: tags.length,
        descriptionLength: description.length
      };

      // Classify performance (relative to channel average)
      if (views > 10000 && engagementRate > 1.5) {
        analysis.topPerformers.push(videoData);
      } else if (views < 1000 || engagementRate < 0.5) {
        analysis.underperformers.push(videoData);
      }

      // Publishing trends
      const monthYear = `${publishedAt.getFullYear()}-${(publishedAt.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!analysis.publishingTrends[monthYear]) {
        analysis.publishingTrends[monthYear] = { count: 0, totalViews: 0 };
      }
      analysis.publishingTrends[monthYear].count++;
      analysis.publishingTrends[monthYear].totalViews += views;

      // Optimization opportunities
      if (!title.toLowerCase().includes('resumocast')) {
        analysis.optimizationOpportunities.push({
          type: 'Missing Branding',
          videoId: video.id,
          title: title,
          priority: views > 5000 ? 'High' : 'Medium',
          suggestion: 'Add ResumoCast branding to title'
        });
      }

      if (tags.length < 8) {
        analysis.optimizationOpportunities.push({
          type: 'Insufficient Tags',
          videoId: video.id,
          title: title,
          currentTags: tags.length,
          priority: views > 5000 ? 'High' : 'Low',
          suggestion: `Add more tags (currently ${tags.length}, target 10-15)`
        });
      }

      if (description.length < 300) {
        analysis.optimizationOpportunities.push({
          type: 'Short Description',
          videoId: video.id,
          title: title,
          currentLength: description.length,
          priority: views > 5000 ? 'High' : 'Medium',
          suggestion: `Expand description (currently ${description.length} chars, target 800+)`
        });
      }
    });

    // Calculate averages
    analysis.performanceMetrics.avgViews = Math.round(totalViews / videos.length);
    analysis.performanceMetrics.avgLikes = Math.round(totalLikes / videos.length);
    analysis.performanceMetrics.avgComments = Math.round(totalComments / videos.length);
    analysis.performanceMetrics.totalViews = totalViews;
    analysis.performanceMetrics.totalEngagements = totalLikes + totalComments;

    // Sort performers
    analysis.topPerformers.sort((a, b) => b.views - a.views);
    analysis.underperformers.sort((a, b) => a.views - b.views);

    return analysis;
  }

  identifyLowHangingFruit(analysis) {
    const fruit = [];

    // High-impact, low-effort optimizations
    const highViewUnbrandedVideos = analysis.optimizationOpportunities
      .filter(opp => opp.type === 'Missing Branding' && opp.priority === 'High')
      .slice(0, 5);

    if (highViewUnbrandedVideos.length > 0) {
      fruit.push({
        category: 'Branding High-Performers',
        impact: 'High',
        effort: 'Low',
        count: highViewUnbrandedVideos.length,
        description: 'High-view videos missing ResumoCast branding',
        videos: highViewUnbrandedVideos
      });
    }

    // Videos with no tags at all
    const noTagVideos = analysis.optimizationOpportunities
      .filter(opp => opp.type === 'Insufficient Tags' && opp.currentTags === 0)
      .slice(0, 10);

    if (noTagVideos.length > 0) {
      fruit.push({
        category: 'No Tags',
        impact: 'Medium',
        effort: 'Low',
        count: noTagVideos.length,
        description: 'Videos with zero tags',
        videos: noTagVideos
      });
    }

    // Very short descriptions on popular videos
    const shortDescPopularVideos = analysis.optimizationOpportunities
      .filter(opp => opp.type === 'Short Description' && opp.currentLength < 100 && opp.priority === 'High')
      .slice(0, 5);

    if (shortDescPopularVideos.length > 0) {
      fruit.push({
        category: 'Short Descriptions on Popular Videos',
        impact: 'High',
        effort: 'Medium',
        count: shortDescPopularVideos.length,
        description: 'Popular videos with very short descriptions',
        videos: shortDescPopularVideos
      });
    }

    return fruit;
  }

  generateActionPlan(analysis) {
    const actionPlan = [];

    // Phase 2 Optimization Plan
    if (analysis.contentAnalysis.withoutBranding > 5) {
      actionPlan.push({
        phase: 'Phase 2A',
        priority: 'High',
        task: 'Complete Branding Implementation',
        description: `Add ResumoCast branding to ${analysis.contentAnalysis.withoutBranding} remaining videos`,
        estimatedTime: '2-3 hours',
        expectedImpact: 'Brand consistency, improved click-through rates'
      });
    }

    if (analysis.contentAnalysis.fewTags > 10) {
      actionPlan.push({
        phase: 'Phase 2B',
        priority: 'High',
        task: 'Tag Optimization',
        description: `Optimize tags for ${analysis.contentAnalysis.fewTags} videos with insufficient tags`,
        estimatedTime: '3-4 hours',
        expectedImpact: 'Improved search visibility and discovery'
      });
    }

    if (analysis.contentAnalysis.shortDescriptions > 15) {
      actionPlan.push({
        phase: 'Phase 2C',
        priority: 'Medium',
        task: 'Description Enhancement',
        description: `Expand descriptions for ${analysis.contentAnalysis.shortDescriptions} videos`,
        estimatedTime: '5-6 hours',
        expectedImpact: 'Better SEO, increased watch time'
      });
    }

    // Content strategy recommendations
    if (analysis.topPerformers.length > 0) {
      const topThemes = this.analyzeTopPerformerThemes(analysis.topPerformers);
      actionPlan.push({
        phase: 'Content Strategy',
        priority: 'Medium',
        task: 'Replicate Success Patterns',
        description: `Create more content similar to top performers: ${topThemes.join(', ')}`,
        estimatedTime: 'Ongoing',
        expectedImpact: 'Increased average video performance'
      });
    }

    return actionPlan;
  }

  analyzeTopPerformerThemes(topPerformers) {
    const themes = {};
    
    topPerformers.slice(0, 10).forEach(video => {
      const title = video.title.toLowerCase();
      
      // Common themes in ResumoCast content
      const patterns = [
        'livros', 'napoleon', 'empreendedorismo', 'negócios', 
        'liderança', 'produtividade', 'inteligência', 'vendas',
        'comunicação', 'hábitos', 'mindset', 'sucesso'
      ];

      patterns.forEach(pattern => {
        if (title.includes(pattern)) {
          themes[pattern] = (themes[pattern] || 0) + 1;
        }
      });
    });

    return Object.entries(themes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => theme);
  }

  async generateReport(channelInfo, analysis, lowHangingFruit, actionPlan) {
    const report = {
      generatedAt: new Date().toISOString(),
      channel: {
        name: channelInfo.snippet.title,
        id: channelInfo.id,
        subscribers: parseInt(channelInfo.statistics.subscriberCount),
        totalVideos: parseInt(channelInfo.statistics.videoCount),
        totalViews: parseInt(channelInfo.statistics.viewCount)
      },
      analysis: analysis,
      lowHangingFruit: lowHangingFruit,
      actionPlan: actionPlan,
      phaseOneResults: {
        implemented: true,
        brandingAdded: analysis.contentAnalysis.withResumoCastBranding,
        stillNeedsBranding: analysis.contentAnalysis.withoutBranding
      }
    };

    await fs.writeFile(
      path.join(this.dataDir, 'analysis', `performance-analysis-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  displayResults(report) {
    console.log('\n🎯 CHANNEL PERFORMANCE ANALYSIS RESULTS');
    console.log('=======================================\n');

    console.log('📊 CHANNEL OVERVIEW:');
    console.log(`   Channel: ${report.channel.name}`);
    console.log(`   Subscribers: ${report.channel.subscribers.toLocaleString()}`);
    console.log(`   Total Videos: ${report.channel.totalVideos}`);
    console.log(`   Total Views: ${report.channel.totalViews.toLocaleString()}\n`);

    console.log('📈 PERFORMANCE METRICS:');
    console.log(`   Average Views per Video: ${report.analysis.performanceMetrics.avgViews.toLocaleString()}`);
    console.log(`   Average Likes per Video: ${report.analysis.performanceMetrics.avgLikes}`);
    console.log(`   Average Comments per Video: ${report.analysis.performanceMetrics.avgComments}`);
    console.log(`   Top Performers: ${report.analysis.topPerformers.length}`);
    console.log(`   Underperformers: ${report.analysis.underperformers.length}\n`);

    console.log('🔄 PHASE 1 OPTIMIZATION RESULTS:');
    console.log(`   ✅ Videos with ResumoCast Branding: ${report.analysis.contentAnalysis.withResumoCastBranding}`);
    console.log(`   ⏳ Videos Still Missing Branding: ${report.analysis.contentAnalysis.withoutBranding}`);
    console.log(`   📺 Videos with Episode Numbers: ${report.analysis.contentAnalysis.withEpisodeNumbers}\n`);

    console.log('🍎 LOW-HANGING FRUIT OPPORTUNITIES:');
    report.lowHangingFruit.forEach((fruit, index) => {
      console.log(`${index + 1}. ${fruit.category} (${fruit.impact} Impact, ${fruit.effort} Effort)`);
      console.log(`   ${fruit.description} (${fruit.count} videos)\n`);
    });

    console.log('📋 RECOMMENDED ACTION PLAN:');
    report.actionPlan.forEach((action, index) => {
      console.log(`${index + 1}. [${action.priority}] ${action.phase}: ${action.task}`);
      console.log(`   ${action.description}`);
      console.log(`   Estimated Time: ${action.estimatedTime}`);
      console.log(`   Expected Impact: ${action.expectedImpact}\n`);
    });

    if (report.analysis.topPerformers.length > 0) {
      console.log('🌟 TOP 3 PERFORMING VIDEOS:');
      report.analysis.topPerformers.slice(0, 3).forEach((video, index) => {
        console.log(`${index + 1}. "${video.title}"`);
        console.log(`   Views: ${video.views.toLocaleString()} | Engagement: ${video.engagementRate.toFixed(2)}%\n`);
      });
    }

    console.log('💡 NEXT STEPS:');
    console.log('1. Review the low-hanging fruit opportunities above');
    console.log('2. Implement Phase 2 optimizations based on priority');
    console.log('3. Monitor performance changes in YouTube Analytics dashboard');
    console.log('4. Compare these API results with dashboard data for discrepancies\n');

    console.log('📁 Full detailed report saved to data/analysis/');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('🔍 RESUMOCAST CHANNEL PERFORMANCE ANALYSIS');
    console.log('==========================================\n');

    if (!(await this.initialize())) {
      console.log('❌ Failed to initialize');
      return;
    }

    const channelInfo = await this.getChannelInfo();
    if (!channelInfo) return;

    const videos = await this.getAllVideos();
    if (videos.length === 0) return;

    const analysis = this.analyzePerformance(videos);
    const lowHangingFruit = this.identifyLowHangingFruit(analysis);
    const actionPlan = this.generateActionPlan(analysis);

    const report = await this.generateReport(channelInfo, analysis, lowHangingFruit, actionPlan);
    this.displayResults(report);

    console.log('\n🎉 Performance analysis complete!');
    console.log('Now compare these insights with your YouTube Analytics dashboard.');
  }
}

async function main() {
  const analyzer = new ChannelPerformanceAnalysis();
  await analyzer.run();
}

main().catch(console.error);