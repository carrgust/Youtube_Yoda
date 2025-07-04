#!/usr/bin/env node

/**
 * ResumoCast Optimization Implementation
 * Applies the analyzed optimizations to the YouTube channel
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

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

  async implementTitleOptimizations(limit = 5, dryRun = true) {
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
            await this.delay(1000);
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
      } else {
        console.log('🔍 (Dry run - no changes made)');
      }
      
      console.log('');
    }
    
    console.log(`✅ Title optimization ${dryRun ? 'preview' : 'implementation'} completed!\n`);
  }

  async implementDescriptionEnhancements(limit = 3, dryRun = true) {
    console.log(`📝 Implementing description enhancements (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const descOpts = this.optimizationReport.optimizations.descriptionEnhancements
      .filter(opt => opt.priority === 'high')
      .slice(0, limit);
    
    console.log(`📋 Processing ${descOpts.length} high-priority description enhancements\n`);
    
    for (const opt of descOpts) {
      console.log(`📺 Video: ${opt.title}`);
      console.log(`📄 Current description length: ${opt.originalDescription.length} characters`);
      console.log(`📄 Enhanced description length: ${opt.enhancedDescription.length} characters`);
      console.log(`🔧 Improvements: ${opt.improvements.join(', ')}`);
      
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
                  description: opt.enhancedDescription
                }
              }
            });
            
            console.log('✅ Description updated successfully!');
            this.implementationLog.push({
              type: 'description_enhancement',
              videoId: opt.videoId,
              improvements: opt.improvements,
              timestamp: new Date().toISOString(),
              status: 'success'
            });
            
            await this.delay(1000);
          }
        } catch (error) {
          console.error(`❌ Failed to update description: ${error.message}`);
          this.implementationLog.push({
            type: 'description_enhancement',
            videoId: opt.videoId,
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 'failed'
          });
        }
      } else {
        console.log('🔍 (Dry run - no changes made)');
      }
      
      console.log('');
    }
    
    console.log(`✅ Description enhancement ${dryRun ? 'preview' : 'implementation'} completed!\n`);
  }

  async implementTagOptimizations(limit = 5, dryRun = true) {
    console.log(`🏷️ Implementing tag optimizations (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const tagOpts = this.optimizationReport.optimizations.tagSuggestions
      .filter(opt => opt.priority === 'high')
      .slice(0, limit);
    
    console.log(`📋 Processing ${tagOpts.length} high-priority tag optimizations\n`);
    
    for (const opt of tagOpts) {
      console.log(`📺 Video: ${opt.title}`);
      console.log(`🏷️ Current tags: ${opt.currentTags.length} tags`);
      console.log(`🏷️ Suggested tags: ${opt.suggestedTags.length} tags`);
      console.log(`➕ Missing important tags: ${opt.missingTags.slice(0, 5).join(', ')}`);
      
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
            
            await this.delay(1000);
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
      } else {
        console.log('🔍 (Dry run - no changes made)');
      }
      
      console.log('');
    }
    
    console.log(`✅ Tag optimization ${dryRun ? 'preview' : 'implementation'} completed!\n`);
  }

  async createOptimizedPlaylists(dryRun = true) {
    console.log(`📋 Creating optimized playlists (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const playlistRecs = this.optimizationReport.optimizations.playlistRecommendations;
    
    console.log(`📋 Creating ${playlistRecs.length} optimized playlists\n`);
    
    for (const playlist of playlistRecs) {
      console.log(`📋 Playlist: ${playlist.playlistName}`);
      console.log(`📊 Videos: ${playlist.videoCount}`);
      console.log(`📝 Description: ${playlist.description}`);
      
      if (!dryRun) {
        try {
          // Create playlist
          const playlistResponse = await this.youtube.playlists.insert({
            part: ['snippet', 'status'],
            requestBody: {
              snippet: {
                title: playlist.playlistName,
                description: playlist.description
              },
              status: {
                privacyStatus: 'public'
              }
            }
          });
          
          const playlistId = playlistResponse.data.id;
          console.log(`✅ Playlist created: ${playlistId}`);
          
          // Add videos to playlist
          for (const video of playlist.videos) {
            try {
              await this.youtube.playlistItems.insert({
                part: ['snippet'],
                requestBody: {
                  snippet: {
                    playlistId: playlistId,
                    resourceId: {
                      kind: 'youtube#video',
                      videoId: video.videoId
                    }
                  }
                }
              });
              
              await this.delay(500); // Smaller delay for playlist operations
            } catch (error) {
              console.error(`❌ Failed to add video ${video.videoId} to playlist: ${error.message}`);
            }
          }
          
          console.log(`✅ Added ${playlist.videoCount} videos to playlist`);
          this.implementationLog.push({
            type: 'playlist_creation',
            playlistName: playlist.playlistName,
            playlistId: playlistId,
            videoCount: playlist.videoCount,
            timestamp: new Date().toISOString(),
            status: 'success'
          });
          
        } catch (error) {
          console.error(`❌ Failed to create playlist: ${error.message}`);
          this.implementationLog.push({
            type: 'playlist_creation',
            playlistName: playlist.playlistName,
            error: error.message,
            timestamp: new Date().toISOString(),
            status: 'failed'
          });
        }
      } else {
        console.log('🔍 (Dry run - no playlist created)');
      }
      
      console.log('');
    }
    
    console.log(`✅ Playlist creation ${dryRun ? 'preview' : 'implementation'} completed!\n`);
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
  }

  async runInteractiveImplementation() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    
    console.log('\n🎯 INTERACTIVE OPTIMIZATION IMPLEMENTATION');
    console.log('==========================================\n');
    
    console.log('📊 OPTIMIZATION SUMMARY:');
    console.log(`   Title Optimizations: ${this.optimizationReport.optimizations.titleOptimizations.length}`);
    console.log(`   Description Enhancements: ${this.optimizationReport.optimizations.descriptionEnhancements.length}`);
    console.log(`   Tag Improvements: ${this.optimizationReport.optimizations.tagSuggestions.length}`);
    console.log(`   Playlist Recommendations: ${this.optimizationReport.optimizations.playlistRecommendations.length}\n`);
    
    // Ask for implementation preferences
    const dryRun = (await question('🔍 Run in dry-run mode first? (y/n): ')).toLowerCase() === 'y';
    const titleLimit = parseInt(await question('🔤 How many titles to optimize? (recommended: 5): ') || '5');
    const descLimit = parseInt(await question('📝 How many descriptions to enhance? (recommended: 3): ') || '3');
    const tagLimit = parseInt(await question('🏷️ How many videos to retag? (recommended: 5): ') || '5');
    const createPlaylists = (await question('📋 Create recommended playlists? (y/n): ')).toLowerCase() === 'y';
    
    console.log('\n🚀 Starting implementation...\n');
    
    // Create backup if not dry run
    if (!dryRun) {
      await this.createBackup();
    }
    
    // Run implementations
    await this.implementTitleOptimizations(titleLimit, dryRun);
    await this.implementDescriptionEnhancements(descLimit, dryRun);
    await this.implementTagOptimizations(tagLimit, dryRun);
    
    if (createPlaylists) {
      await this.createOptimizedPlaylists(dryRun);
    }
    
    // Save log if changes were made
    if (!dryRun && this.implementationLog.length > 0) {
      await this.saveImplementationLog();
    }
    
    console.log('\n🎉 IMPLEMENTATION COMPLETE!');
    console.log('============================\n');
    
    if (dryRun) {
      console.log('🔍 This was a dry run - no actual changes were made.');
      console.log('📋 Review the preview above and run again with live mode if satisfied.');
    } else {
      console.log(`✅ Successfully implemented ${this.implementationLog.filter(log => log.status === 'success').length} optimizations`);
      console.log(`❌ Failed to implement ${this.implementationLog.filter(log => log.status === 'failed').length} optimizations`);
      console.log('📊 Check your YouTube channel to see the improvements!');
    }
    
    rl.close();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  console.log('🔧 ResumoCast Optimization Implementation');
  console.log('=========================================\n');

  const implementer = new OptimizationImplementer();
  
  if (!(await implementer.initialize())) {
    console.log('❌ Failed to initialize. Please run: node authenticate.js');
    return;
  }
  
  if (!(await implementer.loadOptimizationReport())) {
    console.log('❌ Failed to load optimization report. Please run: node analyze-optimization-opportunities.js');
    return;
  }
  
  await implementer.runInteractiveImplementation();
}

main().catch(console.error);