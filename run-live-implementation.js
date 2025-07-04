#!/usr/bin/env node

/**
 * Live Implementation Script
 * Applies optimizations to ResumoCast channel
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

const RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';

class OptimizationImplementer {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.dataDir = path.join(__dirname, 'data');
    this.optimizationReport = null;
    this.implementationLog = [];
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

  async loadOptimizationReport() {
    try {
      const reportData = await fs.readFile(
        path.join(this.dataDir, 'analysis', 'optimization-report.json'),
        'utf-8'
      );
      this.optimizationReport = JSON.parse(reportData);
      console.log('✅ Optimization report loaded');
      return true;
    } catch (error) {
      console.error('❌ Failed to load optimization report:', error.message);
      return false;
    }
  }

  async createBackup() {
    console.log('💾 Creating backup before making changes...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.dataDir, 'backups', `backup-${timestamp}`);
      
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });
      
      // Copy current data files to backup
      const filesToBackup = [
        'channel-export/videos-metadata.json',
        'channel-export/channel-info.json',
        'analysis/optimization-report.json'
      ];
      
      for (const file of filesToBackup) {
        const sourcePath = path.join(this.dataDir, file);
        const backupPath = path.join(backupDir, path.basename(file));
        await fs.copyFile(sourcePath, backupPath);
      }
      
      console.log(`✅ Backup created: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error('❌ Failed to create backup:', error.message);
      return null;
    }
  }

  async implementTitleOptimizations(limit = 5, dryRun = false) {
    console.log(`🔤 Implementing title optimizations (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const titleOpts = this.optimizationReport.optimizations.titleOptimizations
      .filter(opt => opt.priority === 'high')
      .slice(0, limit);
    
    console.log(`📋 Processing ${titleOpts.length} high-priority title optimizations\n`);
    
    for (const opt of titleOpts) {
      console.log(`📺 Video: ${opt.originalTitle}`);
      console.log(`📊 Current views: ${opt.currentViews.toLocaleString()}`);
      console.log(`🔄 New title: ${opt.optimizedTitle}`);
      
      if (!dryRun) {
        try {
          // Get current video data
          const videoResponse = await this.youtube.videos.list({
            part: ['snippet'],
            id: [opt.videoId]
          });
          
          if (videoResponse.data.items && videoResponse.data.items.length > 0) {
            const video = videoResponse.data.items[0];
            
            // Update with optimized title
            await this.youtube.videos.update({
              part: ['snippet'],
              requestBody: {
                id: opt.videoId,
                snippet: {
                  ...video.snippet,
                  title: opt.optimizedTitle
                }
              }
            });
            
            console.log('✅ Title updated successfully!');
            this.implementationLog.push({
              type: 'title_optimization',
              videoId: opt.videoId,
              originalTitle: opt.originalTitle,
              newTitle: opt.optimizedTitle,
              timestamp: new Date().toISOString(),
              status: 'success'
            });
            
            // Small delay to avoid rate limiting
            await this.delay(2000);
          }
        } catch (error) {
          console.error(`❌ Failed to update title: ${error.message}`);
          this.implementationLog.push({
            type: 'title_optimization',
            videoId: opt.videoId,
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 'failed'
          });
        }
      }
      
      console.log('');
    }
    
    console.log(`✅ Title optimization ${dryRun ? 'preview' : 'implementation'} completed!\n`);
  }

  async implementTagOptimizations(limit = 5, dryRun = false) {
    console.log(`🏷️ Implementing tag optimizations (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const tagOpts = this.optimizationReport.optimizations.tagSuggestions
      .filter(opt => opt.priority === 'high')
      .slice(0, limit);
    
    console.log(`📋 Processing ${tagOpts.length} high-priority tag optimizations\n`);
    
    for (const opt of tagOpts) {
      console.log(`📺 Video: ${opt.title}`);
      console.log(`🏷️ Current tags: ${opt.currentTags.length} tags`);
      console.log(`🏷️ Suggested tags: ${opt.suggestedTags.length} tags`);
      console.log(`➕ New tags: ${opt.suggestedTags.slice(0, 8).join(', ')}`);
      
      if (!dryRun) {
        try {
          const videoResponse = await this.youtube.videos.list({
            part: ['snippet'],
            id: [opt.videoId]
          });
          
          if (videoResponse.data.items && videoResponse.data.items.length > 0) {
            const video = videoResponse.data.items[0];
            
            await this.youtube.videos.update({
              part: ['snippet'],
              requestBody: {
                id: opt.videoId,
                snippet: {
                  ...video.snippet,
                  tags: opt.suggestedTags
                }
              }
            });
            
            console.log('✅ Tags updated successfully!');
            this.implementationLog.push({
              type: 'tag_optimization',
              videoId: opt.videoId,
              oldTagCount: opt.currentTags.length,
              newTagCount: opt.suggestedTags.length,
              timestamp: new Date().toISOString(),
              status: 'success'
            });
            
            await this.delay(2000);
          }
        } catch (error) {
          console.error(`❌ Failed to update tags: ${error.message}`);
          this.implementationLog.push({
            type: 'tag_optimization',
            videoId: opt.videoId,
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 'failed'
          });
        }
      }
      
      console.log('');
    }
    
    console.log(`✅ Tag optimization ${dryRun ? 'preview' : 'implementation'} completed!\n`);
  }

  async saveImplementationLog() {
    const logData = {
      implementationDate: new Date().toISOString(),
      totalChanges: this.implementationLog.length,
      successfulChanges: this.implementationLog.filter(log => log.status === 'success').length,
      failedChanges: this.implementationLog.filter(log => log.status === 'failed').length,
      changes: this.implementationLog
    };
    
    await fs.writeFile(
      path.join(this.dataDir, 'analysis', `implementation-log-${Date.now()}.json`),
      JSON.stringify(logData, null, 2)
    );
    
    console.log('✅ Implementation log saved!');
    return logData;
  }

  async runLiveImplementation() {
    console.log('\n🚀 LIVE OPTIMIZATION IMPLEMENTATION');
    console.log('=====================================\n');
    
    // Create backup first
    const backupDir = await this.createBackup();
    if (!backupDir) {
      console.log('❌ Failed to create backup. Aborting implementation.');
      return;
    }
    
    console.log('🎯 Starting live implementation...\n');
    
    // Implement optimizations with conservative limits
    await this.implementTitleOptimizations(3, false);  // Start with 3 titles
    await this.implementTagOptimizations(3, false);     // Start with 3 tag updates
    
    // Save implementation log
    if (this.implementationLog.length > 0) {
      const logData = await this.saveImplementationLog();
      
      console.log('\n🎉 IMPLEMENTATION COMPLETE!');
      console.log('============================\n');
      
      console.log(`✅ Successfully implemented ${logData.successfulChanges} optimizations`);
      console.log(`❌ Failed to implement ${logData.failedChanges} optimizations`);
      console.log('📊 Check your YouTube channel to see the improvements!');
      
      if (logData.failedChanges > 0) {
        console.log('⚠️  Some optimizations failed. Check the implementation log for details.');
      }
    } else {
      console.log('ℹ️  No changes were made during implementation.');
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  console.log('🔧 ResumoCast Live Optimization Implementation');
  console.log('=============================================\n');

  const implementer = new OptimizationImplementer();
  
  if (!(await implementer.initialize())) {
    console.log('❌ Failed to initialize. Please run: node authenticate.js');
    return;
  }
  
  if (!(await implementer.loadOptimizationReport())) {
    console.log('❌ Failed to load optimization report. Please run: node analyze-optimization-opportunities.js');
    return;
  }
  
  await implementer.runLiveImplementation();
}

main().catch(console.error);