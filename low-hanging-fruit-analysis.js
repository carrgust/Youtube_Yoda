#!/usr/bin/env node

/**
 * Low-Hanging Fruit Analysis - Find quick optimization opportunities
 * No new content creation required - just optimize what exists
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class LowHangingFruitAnalysis {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.dataDir = path.join(__dirname, 'data');
    this.RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';
    this.opportunities = {
      titles: [],
      tags: [],
      descriptions: [],
      thumbnails: [],
      endScreens: [],
      playlists: [],
      total: 0
    };
  }

  async initialize() {
    try {
      const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
      
      this.auth = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        'http://localhost:3000/auth/youtube/callback'
      );
      
      this.auth.setCredentials(tokens);
      this.youtube = google.youtube({ version: 'v3', auth: this.auth });
      
      console.log('✅ YouTube API initialized for low-hanging fruit analysis\n');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async analyzeVideos() {
    console.log('🔍 ANALYZING ALL VIDEOS FOR QUICK WINS');
    console.log('======================================\n');

    try {
      // Load existing video data from our previous analysis
      const videosData = await fs.readFile(
        path.join(this.dataDir, 'channel-export', 'videos-metadata.json'),
        'utf-8'
      );
      const allVideos = JSON.parse(videosData);

      console.log(`📊 Analyzing ${allVideos.length} videos for optimization opportunities...\n`);

      // Analyze each video for quick wins
      for (const video of allVideos) {
        await this.analyzeVideo(video);
      }

      return allVideos;

    } catch (error) {
      console.error('❌ Error loading video data:', error.message);
      return [];
    }
  }

  async analyzeVideo(video) {
    const title = video.snippet.title;
    const description = video.snippet.description || '';
    const tags = video.snippet.tags || [];
    const views = parseInt(video.statistics.viewCount || 0);
    const likes = parseInt(video.statistics.likeCount || 0);
    const publishedAt = new Date(video.snippet.publishedAt);
    const daysSincePublished = Math.floor((Date.now() - publishedAt) / (1000 * 60 * 60 * 24));

    // Priority based on views and age
    const priority = this.calculatePriority(views, daysSincePublished, likes);

    // 1. TITLE OPTIMIZATIONS
    this.analyzeTitleOpportunities(video, priority);

    // 2. TAG OPTIMIZATIONS
    this.analyzeTagOpportunities(video, priority);

    // 3. DESCRIPTION OPTIMIZATIONS
    this.analyzeDescriptionOpportunities(video, priority);

    // 4. THUMBNAIL OPPORTUNITIES (flagging only)
    this.analyzeThumbnailOpportunities(video, priority);

    // 5. END SCREEN OPPORTUNITIES
    this.analyzeEndScreenOpportunities(video, priority);
  }

  calculatePriority(views, daysSincePublished, likes) {
    // High priority: High views OR recent videos OR high engagement
    if (views > 10000 || daysSincePublished < 90 || likes > 500) return 'HIGH';
    if (views > 5000 || daysSincePublished < 180 || likes > 200) return 'MEDIUM';
    return 'LOW';
  }

  analyzeTitleOpportunities(video, priority) {
    const title = video.snippet.title;
    const opportunities = [];

    // Missing ResumoCast branding
    if (!title.toLowerCase().includes('resumocast')) {
      opportunities.push({
        type: 'ADD_BRANDING',
        reason: 'Missing ResumoCast branding'
      });
    }

    // Too short (less than 30 chars)
    if (title.length < 30) {
      opportunities.push({
        type: 'EXPAND_TITLE',
        reason: `Title too short (${title.length} chars)`
      });
    }

    // Too long (over 100 chars)
    if (title.length > 100) {
      opportunities.push({
        type: 'SHORTEN_TITLE',
        reason: `Title too long (${title.length} chars)`
      });
    }

    // Missing key SEO elements
    const seoKeywords = ['resumo', 'livro', 'completo', 'análise', 'guia', '2024', '2025'];
    const hasSeoKeyword = seoKeywords.some(keyword => title.toLowerCase().includes(keyword));
    if (!hasSeoKeyword && priority !== 'LOW') {
      opportunities.push({
        type: 'ADD_SEO_KEYWORDS',
        reason: 'Missing SEO keywords'
      });
    }

    // All caps (poor practice)
    if (title === title.toUpperCase() && title.length > 10) {
      opportunities.push({
        type: 'FIX_CAPITALIZATION',
        reason: 'Title in all caps'
      });
    }

    if (opportunities.length > 0) {
      this.opportunities.titles.push({
        videoId: video.id,
        currentTitle: title,
        views: parseInt(video.statistics.viewCount || 0),
        priority: priority,
        opportunities: opportunities,
        suggestedTitle: this.generateOptimizedTitle(video, opportunities)
      });
    }
  }

  generateOptimizedTitle(video, opportunities) {
    let title = video.snippet.title;
    
    // Preserve episode numbers
    const episodeMatch = title.match(/^(T\d+#\d+)/);
    const episodeNumber = episodeMatch ? episodeMatch[1] : null;
    
    // Remove episode number temporarily for processing
    if (episodeNumber) {
      title = title.replace(/^T\d+#\d+\s*/, '').trim();
    }

    // Fix capitalization
    if (opportunities.some(o => o.type === 'FIX_CAPITALIZATION')) {
      title = this.toTitleCase(title);
    }

    // Add ResumoCast branding
    if (opportunities.some(o => o.type === 'ADD_BRANDING')) {
      if (!title.includes('|')) {
        title = `${title} | ResumoCast`;
      } else {
        title = title.replace(/\|.*$/, '| ResumoCast');
      }
    }

    // Add SEO keywords if needed
    if (opportunities.some(o => o.type === 'ADD_SEO_KEYWORDS')) {
      if (title.toLowerCase().includes('livro') && !title.toLowerCase().includes('resumo')) {
        title = title.replace(/livro/i, 'Resumo do Livro');
      }
    }

    // Re-add episode number at the beginning
    if (episodeNumber) {
      title = `${episodeNumber} ${title}`;
    }

    // Ensure proper length
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title;
  }

  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  analyzeTagOpportunities(video, priority) {
    const tags = video.snippet.tags || [];
    const opportunities = [];

    // No tags at all
    if (tags.length === 0) {
      opportunities.push({
        type: 'NO_TAGS',
        reason: 'Video has no tags',
        urgency: 'CRITICAL'
      });
    }
    // Very few tags
    else if (tags.length < 5) {
      opportunities.push({
        type: 'FEW_TAGS',
        reason: `Only ${tags.length} tags`,
        urgency: 'HIGH'
      });
    }
    // Suboptimal number of tags
    else if (tags.length < 10) {
      opportunities.push({
        type: 'SUBOPTIMAL_TAGS',
        reason: `Only ${tags.length} tags (target: 10-15)`,
        urgency: 'MEDIUM'
      });
    }

    // Missing ResumoCast tag
    if (!tags.some(tag => tag.toLowerCase().includes('resumocast'))) {
      opportunities.push({
        type: 'MISSING_BRAND_TAG',
        reason: 'Missing ResumoCast tag',
        urgency: 'HIGH'
      });
    }

    if (opportunities.length > 0) {
      this.opportunities.tags.push({
        videoId: video.id,
        title: video.snippet.title,
        currentTags: tags,
        views: parseInt(video.statistics.viewCount || 0),
        priority: priority,
        opportunities: opportunities,
        suggestedTags: this.generateOptimizedTags(video)
      });
    }
  }

  generateOptimizedTags(video) {
    const title = video.snippet.title.toLowerCase();
    const currentTags = video.snippet.tags || [];
    
    // Base tags every video should have
    const baseTags = ['resumocast', 'resumo de livros', 'português', 'brasil'];
    
    // Topic-specific tags based on title
    let topicTags = [];
    
    if (title.includes('livro') || title.includes('resumo')) {
      topicTags.push('audiolivro', 'resenha', 'síntese');
    }
    
    if (title.includes('negócio') || title.includes('empreend')) {
      topicTags.push('negócios', 'empreendedorismo', 'startup', 'gestão');
    }
    
    if (title.includes('vendas') || title.includes('marketing')) {
      topicTags.push('vendas', 'marketing digital', 'estratégia', 'comercial');
    }
    
    if (title.includes('liderança') || title.includes('gestão')) {
      topicTags.push('liderança', 'gestão de pessoas', 'management', 'líder');
    }
    
    if (title.includes('produtividade') || title.includes('hábito')) {
      topicTags.push('produtividade', 'hábitos', 'desenvolvimento pessoal', 'eficiência');
    }

    // Year tags for relevance
    const year = new Date().getFullYear();
    topicTags.push(`${year}`, `resumos ${year}`);

    // Combine all tags and remove duplicates
    const allTags = [...new Set([...baseTags, ...topicTags, ...currentTags])];
    
    // Return top 15 tags
    return allTags.slice(0, 15);
  }

  analyzeDescriptionOpportunities(video, priority) {
    const description = video.snippet.description || '';
    const opportunities = [];

    // No description
    if (description.length === 0) {
      opportunities.push({
        type: 'NO_DESCRIPTION',
        reason: 'Video has no description',
        urgency: 'CRITICAL'
      });
    }
    // Very short description
    else if (description.length < 100) {
      opportunities.push({
        type: 'SHORT_DESCRIPTION',
        reason: `Only ${description.length} characters`,
        urgency: 'HIGH'
      });
    }
    // Suboptimal description
    else if (description.length < 500) {
      opportunities.push({
        type: 'SUBOPTIMAL_DESCRIPTION',
        reason: `Only ${description.length} characters (target: 800+)`,
        urgency: 'MEDIUM'
      });
    }

    // Missing key elements
    if (!description.includes('#')) {
      opportunities.push({
        type: 'NO_HASHTAGS',
        reason: 'No hashtags in description',
        urgency: 'MEDIUM'
      });
    }

    if (!description.toLowerCase().includes('inscrev')) {
      opportunities.push({
        type: 'NO_CTA',
        reason: 'No subscription call-to-action',
        urgency: 'MEDIUM'
      });
    }

    if (!description.includes('http')) {
      opportunities.push({
        type: 'NO_LINKS',
        reason: 'No links in description',
        urgency: 'LOW'
      });
    }

    if (opportunities.length > 0) {
      this.opportunities.descriptions.push({
        videoId: video.id,
        title: video.snippet.title,
        currentLength: description.length,
        views: parseInt(video.statistics.viewCount || 0),
        priority: priority,
        opportunities: opportunities,
        suggestedDescription: this.generateOptimizedDescription(video)
      });
    }
  }

  generateOptimizedDescription(video) {
    const title = video.snippet.title;
    const currentDesc = video.snippet.description || '';
    
    // Extract any existing timestamps or important info
    const timestampMatch = currentDesc.match(/\d{1,2}:\d{2}/g);
    const timestamps = timestampMatch ? '\n\n⏰ TIMESTAMPS:\n' + timestampMatch.join('\n') : '';

    return `📚 ${title}

Neste vídeo do ResumoCast, apresentamos um resumo completo e detalhado para você absorver o melhor conteúdo em menos tempo.

🎯 O QUE VOCÊ VAI APRENDER:
• Principais conceitos e ideias do conteúdo
• Aplicações práticas para o dia a dia
• Insights valiosos para sua vida pessoal e profissional

💡 SOBRE O RESUMOCAST:
Somos o maior canal de resumos de livros de negócios e desenvolvimento pessoal do Brasil. Nossa missão é democratizar o conhecimento e ajudar você a crescer!

🔔 INSCREVA-SE e ative as notificações para não perder nenhum resumo!
👍 Deixe seu LIKE se o conteúdo foi útil
💬 COMENTE sua principal lição deste vídeo
📤 COMPARTILHE com amigos que precisam deste conhecimento

📱 SIGA O RESUMOCAST:
• Instagram: @resumocast
• Site: www.resumocast.com.br
${timestamps}

🏷️ TAGS:
#ResumoCast #ResumoDeLivros #DesenvolvimentoPessoal #Negócios #Empreendedorismo #Livros #AudioLivro #Resumo #${new Date().getFullYear()}

📚 Outros vídeos que você vai gostar:
→ [Playlist de Resumos]
→ [Vídeos mais populares]

Obrigado por assistir! 🙏`;
  }

  analyzeThumbnailOpportunities(video, priority) {
    // We can't analyze thumbnail quality via API, but we can flag videos
    // that might benefit from thumbnail updates based on performance
    
    const views = parseInt(video.statistics.viewCount || 0);
    const daysSincePublished = Math.floor((Date.now() - new Date(video.snippet.publishedAt)) / (1000 * 60 * 60 * 24));
    const viewsPerDay = views / Math.max(daysSincePublished, 1);

    // Flag videos with low views per day relative to channel average
    if (viewsPerDay < 10 && priority !== 'LOW') {
      this.opportunities.thumbnails.push({
        videoId: video.id,
        title: video.snippet.title,
        views: views,
        viewsPerDay: viewsPerDay.toFixed(2),
        daysSincePublished: daysSincePublished,
        priority: priority,
        suggestion: 'Consider updating thumbnail for better CTR'
      });
    }
  }

  analyzeEndScreenOpportunities(video, priority) {
    // Flag older popular videos that could benefit from end screens
    const views = parseInt(video.statistics.viewCount || 0);
    
    if (views > 5000 && priority !== 'LOW') {
      this.opportunities.endScreens.push({
        videoId: video.id,
        title: video.snippet.title,
        views: views,
        priority: priority,
        suggestion: 'Add end screen to promote newer videos'
      });
    }
  }

  async generateReport() {
    console.log('\n📋 GENERATING LOW-HANGING FRUIT REPORT');
    console.log('======================================\n');

    // Sort opportunities by priority and views
    const sortByPriorityAndViews = (a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.views - a.views;
    };

    this.opportunities.titles.sort(sortByPriorityAndViews);
    this.opportunities.tags.sort(sortByPriorityAndViews);
    this.opportunities.descriptions.sort(sortByPriorityAndViews);
    this.opportunities.thumbnails.sort(sortByPriorityAndViews);
    this.opportunities.endScreens.sort(sortByPriorityAndViews);

    // Calculate totals
    this.opportunities.total = 
      this.opportunities.titles.length +
      this.opportunities.tags.length +
      this.opportunities.descriptions.length;

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpportunities: this.opportunities.total,
        titleOptimizations: this.opportunities.titles.length,
        tagOptimizations: this.opportunities.tags.length,
        descriptionOptimizations: this.opportunities.descriptions.length,
        thumbnailSuggestions: this.opportunities.thumbnails.length,
        endScreenSuggestions: this.opportunities.endScreens.length
      },
      opportunities: this.opportunities,
      estimatedTime: {
        titles: `${Math.round(this.opportunities.titles.length * 2)} minutes`,
        tags: `${Math.round(this.opportunities.tags.length * 3)} minutes`,
        descriptions: `${Math.round(this.opportunities.descriptions.length * 5)} minutes`,
        total: `${Math.round(this.opportunities.total * 3.3 / 60)} hours`
      }
    };

    await fs.writeFile(
      path.join(this.dataDir, 'analysis', `low-hanging-fruit-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  displayQuickWins() {
    console.log('🍎 LOW-HANGING FRUIT ANALYSIS COMPLETE');
    console.log('======================================\n');

    console.log(`📊 TOTAL OPTIMIZATION OPPORTUNITIES: ${this.opportunities.total}\n`);

    // Title Optimizations
    if (this.opportunities.titles.length > 0) {
      console.log(`🔤 TITLE OPTIMIZATIONS: ${this.opportunities.titles.length} videos`);
      console.log('Top 5 priorities:');
      this.opportunities.titles.slice(0, 5).forEach((opp, index) => {
        console.log(`${index + 1}. [${opp.priority}] "${opp.currentTitle}"`);
        console.log(`   Views: ${opp.views.toLocaleString()}`);
        console.log(`   Issues: ${opp.opportunities.map(o => o.reason).join(', ')}`);
        console.log(`   Suggested: "${opp.suggestedTitle}"\n`);
      });
    }

    // Tag Optimizations
    if (this.opportunities.tags.length > 0) {
      console.log(`\n🏷️ TAG OPTIMIZATIONS: ${this.opportunities.tags.length} videos`);
      console.log('Top 5 priorities:');
      this.opportunities.tags.slice(0, 5).forEach((opp, index) => {
        console.log(`${index + 1}. [${opp.priority}] "${opp.title}"`);
        console.log(`   Views: ${opp.views.toLocaleString()}`);
        console.log(`   Current tags: ${opp.currentTags.length}`);
        console.log(`   Issues: ${opp.opportunities.map(o => o.reason).join(', ')}`);
        console.log(`   Suggested tags: ${opp.suggestedTags.slice(0, 5).join(', ')}...\n`);
      });
    }

    // Description Optimizations
    if (this.opportunities.descriptions.length > 0) {
      console.log(`\n📝 DESCRIPTION OPTIMIZATIONS: ${this.opportunities.descriptions.length} videos`);
      console.log('Top 5 priorities:');
      this.opportunities.descriptions.slice(0, 5).forEach((opp, index) => {
        console.log(`${index + 1}. [${opp.priority}] "${opp.title}"`);
        console.log(`   Views: ${opp.views.toLocaleString()}`);
        console.log(`   Current length: ${opp.currentLength} chars`);
        console.log(`   Issues: ${opp.opportunities.map(o => o.reason).join(', ')}\n`);
      });
    }

    console.log('\n⏱️ ESTIMATED IMPLEMENTATION TIME:');
    console.log(`   Titles: ~${Math.round(this.opportunities.titles.length * 2)} minutes`);
    console.log(`   Tags: ~${Math.round(this.opportunities.tags.length * 3)} minutes`);
    console.log(`   Descriptions: ~${Math.round(this.opportunities.descriptions.length * 5)} minutes`);
    console.log(`   TOTAL: ~${Math.round(this.opportunities.total * 3.3 / 60)} hours`);

    console.log('\n💡 QUICK WIN STRATEGY:');
    console.log('1. Start with HIGH priority + high view videos');
    console.log('2. Focus on titles first (quickest impact)');
    console.log('3. Then tags (improves discoverability)');
    console.log('4. Finally descriptions (better engagement)');
    
    console.log('\n📁 Full detailed report saved to data/analysis/');
  }

  async run() {
    console.log('🔍 LOW-HANGING FRUIT ANALYZER');
    console.log('=============================\n');
    console.log('Finding quick optimization wins that don\'t require new content...\n');

    if (!(await this.initialize())) {
      console.log('❌ Failed to initialize');
      return;
    }

    await this.analyzeVideos();
    const report = await this.generateReport();
    this.displayQuickWins();

    console.log('\n✅ Analysis complete! Review the opportunities above.');
    console.log('📋 These are all quick wins that can be implemented without creating new content.');
  }
}

async function main() {
  const analyzer = new LowHangingFruitAnalysis();
  await analyzer.run();
}

main().catch(console.error);