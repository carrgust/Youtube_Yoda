#!/usr/bin/env node

/**
 * YouTube Analytics Data Extraction and Comparison Tool
 * Compares API data with Dashboard analytics to find discrepancies
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class AnalyticsComparison {
  constructor() {
    this.youtube = null;
    this.youtubeAnalytics = null;
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
      this.youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: this.auth });
      
      console.log('✅ YouTube Analytics API initialized');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async getChannelAnalytics() {
    console.log('\n📊 EXTRACTING CHANNEL ANALYTICS DATA');
    console.log('=====================================\n');

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 30 days

    try {
      // 1. Channel Overview Metrics
      console.log('📈 Getting channel overview metrics...');
      const channelMetrics = await this.youtubeAnalytics.reports.query({
        ids: `channel==${this.RESUMOCAST_CHANNEL_ID}`,
        startDate: startDate,
        endDate: endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost',
        dimensions: 'day'
      });

      // 2. Top Performing Videos
      console.log('🎯 Getting top performing videos...');
      const topVideos = await this.youtubeAnalytics.reports.query({
        ids: `channel==${this.RESUMOCAST_CHANNEL_ID}`,
        startDate: startDate,
        endDate: endDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments',
        dimensions: 'video',
        sort: '-views',
        maxResults: 20
      });

      // 3. Traffic Sources
      console.log('🚦 Getting traffic sources...');
      const trafficSources = await this.youtubeAnalytics.reports.query({
        ids: `channel==${this.RESUMOCAST_CHANNEL_ID}`,
        startDate: startDate,
        endDate: endDate,
        metrics: 'views,estimatedMinutesWatched',
        dimensions: 'insightTrafficSourceType',
        sort: '-views'
      });

      // 4. Demographics
      console.log('👥 Getting audience demographics...');
      const demographics = await this.youtubeAnalytics.reports.query({
        ids: `channel==${this.RESUMOCAST_CHANNEL_ID}`,
        startDate: startDate,
        endDate: endDate,
        metrics: 'views,estimatedMinutesWatched',
        dimensions: 'ageGroup,gender',
        sort: '-views'
      });

      // 5. Device Types
      console.log('📱 Getting device analytics...');
      const devices = await this.youtubeAnalytics.reports.query({
        ids: `channel==${this.RESUMOCAST_CHANNEL_ID}`,
        startDate: startDate,
        endDate: endDate,
        metrics: 'views,estimatedMinutesWatched',
        dimensions: 'deviceType',
        sort: '-views'
      });

      return {
        channelMetrics: channelMetrics.data,
        topVideos: topVideos.data,
        trafficSources: trafficSources.data,
        demographics: demographics.data,
        devices: devices.data,
        dateRange: { startDate, endDate }
      };

    } catch (error) {
      console.error('❌ Error fetching analytics:', error.message);
      return null;
    }
  }

  async getVideoMetadata() {
    console.log('\n📹 EXTRACTING VIDEO METADATA VIA DATA API');
    console.log('==========================================\n');

    try {
      // Get all videos from the channel
      const channelResponse = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: [this.RESUMOCAST_CHANNEL_ID]
      });

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

      // Get all videos from uploads playlist
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
        
        // Get detailed video statistics
        const videosResponse = await this.youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: videoIds
        });

        allVideos = allVideos.concat(videosResponse.data.items);
        nextPageToken = playlistResponse.data.nextPageToken;

        await this.delay(1000); // Rate limiting
      } while (nextPageToken);

      console.log(`✅ Extracted metadata for ${allVideos.length} videos`);
      return allVideos;

    } catch (error) {
      console.error('❌ Error fetching video metadata:', error.message);
      return [];
    }
  }

  analyzePerformanceDiscrepancies(analyticsData, videoMetadata) {
    console.log('\n🔍 ANALYZING PERFORMANCE DISCREPANCIES');
    console.log('======================================\n');

    const analysis = {
      topPerformers: [],
      underperformers: [],
      optimizationOpportunities: [],
      dataDiscrepancies: []
    };

    // Analyze top videos from analytics vs metadata
    const analyticsTopVideos = analyticsData.topVideos.rows || [];
    
    analyticsTopVideos.forEach((row, index) => {
      const videoId = row[0];
      const analyticsViews = row[1];
      const watchTime = row[2];
      const avgViewDuration = row[3];
      const likes = row[4] || 0;
      const comments = row[5] || 0;

      // Find matching video in metadata
      const videoMeta = videoMetadata.find(v => v.id === videoId);
      
      if (videoMeta) {
        const metadataViews = parseInt(videoMeta.statistics.viewCount || 0);
        const metadataLikes = parseInt(videoMeta.statistics.likeCount || 0);
        const metadataComments = parseInt(videoMeta.statistics.commentCount || 0);

        // Check for discrepancies
        const viewDiscrepancy = Math.abs(analyticsViews - metadataViews);
        const likeDiscrepancy = Math.abs(likes - metadataLikes);
        const commentDiscrepancy = Math.abs(comments - metadataComments);

        if (viewDiscrepancy > 100 || likeDiscrepancy > 10 || commentDiscrepancy > 5) {
          analysis.dataDiscrepancies.push({
            videoId,
            title: videoMeta.snippet.title,
            analyticsViews,
            metadataViews,
            analyticsLikes: likes,
            metadataLikes,
            analyticsComments: comments,
            metadataComments
          });
        }

        // Performance analysis
        const engagementRate = ((likes + comments) / analyticsViews * 100).toFixed(2);
        const retentionRate = (avgViewDuration / this.parseDuration(videoMeta.contentDetails.duration) * 100).toFixed(2);

        const videoAnalysis = {
          videoId,
          title: videoMeta.snippet.title,
          views: analyticsViews,
          watchTime,
          avgViewDuration,
          engagementRate: parseFloat(engagementRate),
          retentionRate: parseFloat(retentionRate),
          publishedAt: videoMeta.snippet.publishedAt,
          tags: videoMeta.snippet.tags || [],
          hasResumoCastBranding: videoMeta.snippet.title.includes('ResumoCast')
        };

        if (engagementRate > 2 && retentionRate > 50) {
          analysis.topPerformers.push(videoAnalysis);
        } else if (engagementRate < 1 || retentionRate < 30) {
          analysis.underperformers.push(videoAnalysis);
        }

        // Optimization opportunities
        if (!videoMeta.snippet.title.includes('ResumoCast')) {
          analysis.optimizationOpportunities.push({
            type: 'Missing Branding',
            videoId,
            title: videoMeta.snippet.title,
            suggestion: 'Add ResumoCast branding to title'
          });
        }

        if (!videoMeta.snippet.tags || videoMeta.snippet.tags.length < 5) {
          analysis.optimizationOpportunities.push({
            type: 'Insufficient Tags',
            videoId,
            title: videoMeta.snippet.title,
            currentTags: videoMeta.snippet.tags?.length || 0,
            suggestion: 'Add more relevant tags (aim for 10-15)'
          });
        }

        if (videoMeta.snippet.description.length < 500) {
          analysis.optimizationOpportunities.push({
            type: 'Short Description',
            videoId,
            title: videoMeta.snippet.title,
            currentLength: videoMeta.snippet.description.length,
            suggestion: 'Expand description with more details and CTAs'
          });
        }
      }
    });

    return analysis;
  }

  parseDuration(duration) {
    // Parse ISO 8601 duration (PT4M13S) to seconds
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] ? parseInt(match[1]) : 0);
    const minutes = (match[2] ? parseInt(match[2]) : 0);
    const seconds = (match[3] ? parseInt(match[3]) : 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  async generateReport(analyticsData, videoMetadata, analysis) {
    console.log('\n📋 GENERATING COMPREHENSIVE ANALYTICS REPORT');
    console.log('============================================\n');

    const report = {
      generatedAt: new Date().toISOString(),
      dateRange: analyticsData.dateRange,
      summary: {
        totalVideos: videoMetadata.length,
        topPerformers: analysis.topPerformers.length,
        underperformers: analysis.underperformers.length,
        optimizationOpportunities: analysis.optimizationOpportunities.length,
        dataDiscrepancies: analysis.dataDiscrepancies.length
      },
      channelMetrics: analyticsData.channelMetrics,
      trafficSources: analyticsData.trafficSources,
      demographics: analyticsData.demographics,
      devices: analyticsData.devices,
      analysis: analysis,
      lowHangingFruit: this.identifyLowHangingFruit(analysis),
      recommendations: this.generateRecommendations(analysis)
    };

    // Save report
    await fs.writeFile(
      path.join(this.dataDir, 'analysis', `analytics-comparison-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  identifyLowHangingFruit(analysis) {
    const lowHangingFruit = [];

    // Videos missing ResumoCast branding
    const unbrandedVideos = analysis.optimizationOpportunities
      .filter(opp => opp.type === 'Missing Branding')
      .slice(0, 5);

    if (unbrandedVideos.length > 0) {
      lowHangingFruit.push({
        category: 'Branding',
        impact: 'High',
        effort: 'Low',
        description: `${unbrandedVideos.length} videos missing ResumoCast branding`,
        videos: unbrandedVideos
      });
    }

    // Videos with very few tags
    const lowTagVideos = analysis.optimizationOpportunities
      .filter(opp => opp.type === 'Insufficient Tags' && opp.currentTags < 3)
      .slice(0, 5);

    if (lowTagVideos.length > 0) {
      lowHangingFruit.push({
        category: 'Tags',
        impact: 'Medium',
        effort: 'Low',
        description: `${lowTagVideos.length} videos with very few tags`,
        videos: lowTagVideos
      });
    }

    // High-performing videos that could use better optimization
    const highPotentialVideos = analysis.topPerformers
      .filter(video => !video.hasResumoCastBranding || video.tags.length < 8)
      .slice(0, 3);

    if (highPotentialVideos.length > 0) {
      lowHangingFruit.push({
        category: 'High-Potential Videos',
        impact: 'High',
        effort: 'Medium',
        description: `${highPotentialVideos.length} top performers need optimization`,
        videos: highPotentialVideos
      });
    }

    return lowHangingFruit;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // General recommendations
    if (analysis.dataDiscrepancies.length > 0) {
      recommendations.push({
        priority: 'High',
        category: 'Data Accuracy',
        description: 'Significant discrepancies found between Analytics API and Dashboard',
        action: 'Review data collection methods and verify API access permissions'
      });
    }

    if (analysis.underperformers.length > 5) {
      recommendations.push({
        priority: 'Medium',
        category: 'Content Strategy',
        description: `${analysis.underperformers.length} videos have low engagement rates`,
        action: 'Analyze top performers and apply successful patterns to underperforming content'
      });
    }

    if (analysis.optimizationOpportunities.length > 10) {
      recommendations.push({
        priority: 'High',
        category: 'SEO Optimization',
        description: `${analysis.optimizationOpportunities.length} videos need immediate optimization`,
        action: 'Implement Phase 2 optimization focusing on tags and descriptions'
      });
    }

    return recommendations;
  }

  async displayResults(report) {
    console.log('\n🎯 ANALYTICS COMPARISON RESULTS');
    console.log('===============================\n');

    console.log('📊 SUMMARY:');
    console.log(`   Total Videos: ${report.summary.totalVideos}`);
    console.log(`   Top Performers: ${report.summary.topPerformers}`);
    console.log(`   Underperformers: ${report.summary.underperformers}`);
    console.log(`   Optimization Opportunities: ${report.summary.optimizationOpportunities}`);
    console.log(`   Data Discrepancies: ${report.summary.dataDiscrepancies}\n`);

    if (report.analysis.dataDiscrepancies.length > 0) {
      console.log('⚠️  DATA DISCREPANCIES FOUND:');
      report.analysis.dataDiscrepancies.slice(0, 3).forEach((disc, index) => {
        console.log(`${index + 1}. "${disc.title}"`);
        console.log(`   Views: Analytics=${disc.analyticsViews} vs API=${disc.metadataViews}`);
        console.log(`   Likes: Analytics=${disc.analyticsLikes} vs API=${disc.metadataLikes}\n`);
      });
    }

    console.log('🍎 LOW-HANGING FRUIT OPPORTUNITIES:');
    report.lowHangingFruit.forEach((fruit, index) => {
      console.log(`${index + 1}. ${fruit.category} (${fruit.impact} Impact, ${fruit.effort} Effort)`);
      console.log(`   ${fruit.description}\n`);
    });

    console.log('💡 TOP RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.category}`);
      console.log(`   ${rec.description}`);
      console.log(`   Action: ${rec.action}\n`);
    });

    console.log('📁 Full report saved to data/analysis/');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('🔍 YOUTUBE ANALYTICS COMPARISON TOOL');
    console.log('====================================\n');

    if (!(await this.initialize())) {
      console.log('❌ Failed to initialize');
      return;
    }

    // Extract data from both sources
    const analyticsData = await this.getChannelAnalytics();
    if (!analyticsData) {
      console.log('❌ Failed to get analytics data');
      return;
    }

    const videoMetadata = await this.getVideoMetadata();
    if (videoMetadata.length === 0) {
      console.log('❌ Failed to get video metadata');
      return;
    }

    // Analyze discrepancies and opportunities
    const analysis = this.analyzePerformanceDiscrepancies(analyticsData, videoMetadata);
    
    // Generate comprehensive report
    const report = await this.generateReport(analyticsData, videoMetadata, analysis);
    
    // Display results
    await this.displayResults(report);

    console.log('\n🎉 Analytics comparison complete!');
    console.log('Use the insights above to identify optimization opportunities.');
  }
}

async function main() {
  const analyzer = new AnalyticsComparison();
  await analyzer.run();
}

main().catch(console.error);