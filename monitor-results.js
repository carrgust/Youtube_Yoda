#!/usr/bin/env node

/**
 * Results Monitoring Script
 * Tracks performance of optimized videos
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class ResultsMonitor {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.dataDir = path.join(__dirname, 'data');
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

  async checkOptimizedVideos() {
    console.log('🔍 Checking optimized videos status...\n');
    
    const optimizedVideos = [
      'm50H8g8_-mk', // Assim como um medico
      'Ue_3tyDPkNY', // Napolleon Hill  
      'LtcwO_E9yxA'  // Se você se sente sem criatividade
    ];

    for (const videoId of optimizedVideos) {
      try {
        const response = await this.youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: [videoId]
        });

        if (response.data.items && response.data.items.length > 0) {
          const video = response.data.items[0];
          console.log(`📺 Video ID: ${videoId}`);
          console.log(`📝 Current Title: ${video.snippet.title}`);
          console.log(`🏷️ Tags: ${video.snippet.tags ? video.snippet.tags.length : 0} tags`);
          console.log(`📊 Views: ${parseInt(video.statistics.viewCount || 0).toLocaleString()}`);
          console.log(`👍 Likes: ${parseInt(video.statistics.likeCount || 0).toLocaleString()}`);
          console.log(`💬 Comments: ${parseInt(video.statistics.commentCount || 0).toLocaleString()}`);
          console.log('---');
        }
      } catch (error) {
        console.error(`❌ Error checking video ${videoId}:`, error.message);
      }
    }
  }

  async generateMonitoringReport() {
    console.log('\n📊 MONITORING RECOMMENDATIONS');
    console.log('==============================\n');
    
    console.log('📈 MÉTRICAS PARA ACOMPANHAR:');
    console.log('   • Impressões (YouTube Studio > Analytics)');
    console.log('   • CTR (Click-through Rate)');
    console.log('   • Descoberta orgânica vs. Sugeridos');
    console.log('   • Tempo de visualização médio');
    console.log('   • Palavras-chave de busca\n');
    
    console.log('⏰ CRONOGRAMA DE VERIFICAÇÃO:');
    console.log('   • 24-48h: Verificar se mudanças apareceram');
    console.log('   • 1 semana: Primeira análise de performance');
    console.log('   • 2 semanas: Análise completa de impacto');
    console.log('   • 1 mês: Relatório de ROI das otimizações\n');
    
    console.log('🎯 BENCHMARKS ESPERADOS:');
    console.log('   • +20-30% em impressões orgânicas');
    console.log('   • +15-25% em CTR dos títulos');
    console.log('   • +10-20% em descoberta por busca');
    console.log('   • Melhor ranking para "resumo livros negócios"');
  }
}

async function main() {
  console.log('📊 ResumoCast Results Monitoring');
  console.log('=================================\n');

  const monitor = new ResultsMonitor();
  
  if (!(await monitor.initialize())) {
    console.log('❌ Failed to initialize. Please run: node authenticate.js');
    return;
  }
  
  await monitor.checkOptimizedVideos();
  await monitor.generateMonitoringReport();
}

main().catch(console.error);