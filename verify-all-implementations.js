#!/usr/bin/env node

/**
 * Comprehensive Implementation Verification
 * Check all optimizations and identify issues
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class ImplementationVerifier {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.dataDir = path.join(__dirname, 'data');
    this.issues = [];
    this.successes = [];
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

  async verifyImplementedVideos() {
    console.log('🔍 COMPREHENSIVE IMPLEMENTATION VERIFICATION');
    console.log('============================================\n');
    
    // Videos that were optimized based on implementation log
    const implementedVideos = [
      'pOiUVZXs0zE', // Plano de Negócios vs. Mercado
      'm50H8g8_-mk', // Diagnóstico Empresarial (corrigido)
      'Ue_3tyDPkNY', // Napoleon Hill (corrigido)
      'LtcwO_E9yxA'  // Criatividade (corrigido)
    ];

    console.log('📊 CHECKING ALL IMPLEMENTED VIDEOS:\n');

    for (const videoId of implementedVideos) {
      try {
        const response = await this.youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: [videoId]
        });

        if (response.data.items && response.data.items.length > 0) {
          const video = response.data.items[0];
          const title = video.snippet.title;
          const tags = video.snippet.tags || [];
          const description = video.snippet.description || '';
          
          console.log(`📺 VIDEO: ${videoId}`);
          console.log(`📝 Title: ${title}`);
          console.log(`📊 Views: ${parseInt(video.statistics.viewCount || 0).toLocaleString()}`);
          console.log(`🏷️ Tags: ${tags.length} tags`);
          console.log(`📄 Description: ${description.length} characters`);
          
          // Analyze title quality
          if (this.analyzeTitleQuality(title, videoId)) {
            this.successes.push({
              videoId,
              type: 'title',
              title,
              status: 'good'
            });
          }
          
          // Analyze tags
          if (this.analyzeTagsQuality(tags, videoId)) {
            this.successes.push({
              videoId,
              type: 'tags',
              count: tags.length,
              status: 'good'
            });
          }
          
          // Analyze description
          this.analyzeDescriptionQuality(description, videoId, title);
          
          console.log('---\n');
        }
      } catch (error) {
        console.error(`❌ Error checking video ${videoId}:`, error.message);
        this.issues.push({
          videoId,
          type: 'api_error',
          error: error.message
        });
      }
    }
  }

  analyzeTitleQuality(title, videoId) {
    const issues = [];
    
    // Check if title makes sense (not cut off)
    if (title.includes(' - Resumo Completo') && title.length < 40) {
      issues.push('Title seems cut off or too short');
    }
    
    // Check for proper branding
    if (!title.includes('ResumoCast')) {
      issues.push('Missing ResumoCast branding');
    }
    
    // Check for Brazilian keywords
    const brazilianKeywords = ['resumo', 'livro', 'negócios', 'empreendedorismo'];
    const hasKeywords = brazilianKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
    
    if (!hasKeywords) {
      issues.push('Missing Brazilian SEO keywords');
    }
    
    // Check title length (should be under 100 chars)
    if (title.length > 100) {
      issues.push('Title too long (>100 characters)');
    }
    
    if (issues.length > 0) {
      console.log(`⚠️ Title Issues: ${issues.join(', ')}`);
      this.issues.push({
        videoId,
        type: 'title_issues',
        issues
      });
      return false;
    } else {
      console.log('✅ Title: Good quality');
      return true;
    }
  }

  analyzeTagsQuality(tags, videoId) {
    const issues = [];
    
    if (tags.length === 0) {
      issues.push('No tags present');
    } else if (tags.length < 5) {
      issues.push('Too few tags (less than 5)');
    }
    
    // Check for essential Brazilian tags
    const essentialTags = ['resumo de livros', 'negócios', 'empreendedorismo'];
    const hasEssential = essentialTags.some(tag => 
      tags.some(videoTag => videoTag.toLowerCase().includes(tag))
    );
    
    if (!hasEssential && tags.length > 0) {
      issues.push('Missing essential Brazilian tags');
    }
    
    if (issues.length > 0) {
      console.log(`⚠️ Tags Issues: ${issues.join(', ')}`);
      this.issues.push({
        videoId,
        type: 'tags_issues',
        issues
      });
      return false;
    } else {
      console.log('✅ Tags: Good quality');
      return true;
    }
  }

  analyzeDescriptionQuality(description, videoId, title) {
    const issues = [];
    
    if (description.length < 100) {
      issues.push('Description too short (less than 100 characters)');
    }
    
    if (!description.toLowerCase().includes('resumocast')) {
      issues.push('Missing ResumoCast mention in description');
    }
    
    if (!description.includes('#')) {
      issues.push('Missing hashtags');
    }
    
    if (issues.length > 0) {
      console.log(`⚠️ Description Issues: ${issues.join(', ')}`);
      this.issues.push({
        videoId,
        type: 'description_issues',
        issues
      });
    } else {
      console.log('✅ Description: Good quality');
      this.successes.push({
        videoId,
        type: 'description',
        length: description.length,
        status: 'good'
      });
    }
  }

  async generateVerificationReport() {
    console.log('\n📋 VERIFICATION SUMMARY');
    console.log('=======================\n');
    
    console.log(`✅ Successful optimizations: ${this.successes.length}`);
    console.log(`⚠️ Issues identified: ${this.issues.length}\n`);
    
    if (this.issues.length > 0) {
      console.log('🔧 ISSUES TO FIX:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Video ${issue.videoId}: ${issue.type}`);
        if (issue.issues) {
          issue.issues.forEach(i => console.log(`      • ${i}`));
        }
      });
      console.log('');
    }
    
    console.log('🎯 NEXT STEPS RECOMMENDATION:');
    
    if (this.issues.length > 3) {
      console.log('   ❌ CRITICAL: Fix current issues before proceeding');
      console.log('   1. Fix title and tag problems');
      console.log('   2. Add missing descriptions');
      console.log('   3. Verify all changes manually');
      console.log('   4. Wait for results before continuing');
    } else {
      console.log('   ✅ PROCEED: Current optimizations look good');
      console.log('   1. Monitor results for 3-7 days');
      console.log('   2. Continue with Phase 1 completion');
      console.log('   3. Add rich descriptions to 5 videos');
      console.log('   4. Create thematic playlists');
    }
    
    console.log('\n📊 MONITORING PRIORITY:');
    console.log('   • YouTube Studio Analytics (daily)');
    console.log('   • Search performance (weekly)');
    console.log('   • Click-through rates (weekly)');
    console.log('   • Organic discovery growth (bi-weekly)');
    
    // Save verification report
    const report = {
      verificationDate: new Date().toISOString(),
      totalChecked: this.successes.length + this.issues.length,
      successfulOptimizations: this.successes.length,
      issuesFound: this.issues.length,
      issues: this.issues,
      successes: this.successes,
      recommendation: this.issues.length > 3 ? 'fix_issues_first' : 'proceed_with_monitoring'
    };
    
    await fs.writeFile(
      path.join(this.dataDir, 'analysis', `verification-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n✅ Verification report saved to data/analysis/');
  }
}

async function main() {
  const verifier = new ImplementationVerifier();
  
  if (!(await verifier.initialize())) {
    console.log('❌ Failed to initialize.');
    return;
  }
  
  await verifier.verifyImplementedVideos();
  await verifier.generateVerificationReport();
}

main().catch(console.error);