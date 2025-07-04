#!/usr/bin/env node

/**
 * ResumoCast Optimization Analysis
 * Analyzes extracted data to identify optimization opportunities
 */

const fs = require('fs').promises;
const path = require('path');

class OptimizationAnalyzer {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.videos = [];
    this.analytics = {};
    this.optimizations = {
      titleOptimizations: [],
      descriptionEnhancements: [],
      tagSuggestions: [],
      playlistRecommendations: [],
      contentGaps: [],
      quickWins: []
    };
  }

  async loadData() {
    console.log('📂 Loading extracted data...');
    
    try {
      // Load videos metadata
      const videosData = await fs.readFile(
        path.join(this.dataDir, 'channel-export', 'videos-metadata.json'),
        'utf-8'
      );
      this.videos = JSON.parse(videosData);

      // Load analytics
      const analyticsData = await fs.readFile(
        path.join(this.dataDir, 'analysis', 'performance-analysis.json'),
        'utf-8'
      );
      this.analytics = JSON.parse(analyticsData);

      console.log(`✅ Loaded ${this.videos.length} videos for analysis`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load data:', error.message);
      return false;
    }
  }

  analyzeTitleOptimizations() {
    console.log('🔍 Analyzing title optimization opportunities...');
    
    const brazilianKeywords = [
      'resumo', 'livro', 'livros', 'negócios', 'empreendedorismo',
      'liderança', 'sucesso', 'dinheiro', 'rica', 'mindset',
      'produtividade', 'gestão', 'vendas', 'marketing'
    ];

    this.videos.forEach(video => {
      const title = video.snippet.title;
      const views = parseInt(video.statistics?.viewCount || 0);
      
      // Check for title optimization opportunities
      const issues = [];
      const suggestions = [];

      // Check length (optimal: 60-70 characters)
      if (title.length > 70) {
        issues.push('Título muito longo (pode ser cortado na busca)');
        suggestions.push(`Encurtar para: "${title.substring(0, 60)}..."`);
      }

      // Check for Brazilian keywords
      const hasKeywords = brazilianKeywords.some(keyword => 
        title.toLowerCase().includes(keyword)
      );
      if (!hasKeywords) {
        issues.push('Faltam palavras-chave brasileiras');
        suggestions.push('Adicionar: "Resumo", "Livro", "Negócios"');
      }

      // Check for brand mention
      if (!title.toLowerCase().includes('resumocast')) {
        suggestions.push('Considerar adicionar | ResumoCast');
      }

      // Check capitalization
      if (title === title.toUpperCase()) {
        issues.push('Título em caixa alta (pode parecer spam)');
      }

      // Generate optimized title
      let optimizedTitle = title;
      
      // Extract book/topic name
      const bookMatch = title.match(/(.+?)\s*[-|]/);
      const bookName = bookMatch ? bookMatch[1].trim() : title.split(' ').slice(0, 3).join(' ');
      
      if (issues.length > 0 || views < this.analytics.averageViews) {
        optimizedTitle = `${bookName} - Resumo Completo | Livros de Negócios | ResumoCast`;
        
        this.optimizations.titleOptimizations.push({
          videoId: video.id,
          originalTitle: title,
          optimizedTitle: optimizedTitle,
          currentViews: views,
          issues: issues,
          suggestions: suggestions,
          priority: views < this.analytics.averageViews ? 'high' : 'medium'
        });
      }
    });

    console.log(`✅ Found ${this.optimizations.titleOptimizations.length} title optimization opportunities`);
  }

  analyzeDescriptionEnhancements() {
    console.log('📝 Analyzing description enhancement opportunities...');
    
    this.videos.forEach(video => {
      const description = video.snippet.description || '';
      const title = video.snippet.title;
      
      const improvements = [];
      
      // Check description length
      if (description.length < 100) {
        improvements.push('Descrição muito curta (adicionar mais contexto)');
      }

      // Check for timestamps
      if (!description.includes('00:') && !description.includes('0:')) {
        improvements.push('Adicionar timestamps para melhor navegação');
      }

      // Check for call-to-action
      if (!description.toLowerCase().includes('inscrev')) {
        improvements.push('Adicionar call-to-action para inscrição');
      }

      // Check for related content links
      if (!description.includes('http') && !description.includes('www')) {
        improvements.push('Adicionar links para conteúdo relacionado');
      }

      // Check for hashtags
      if (!description.includes('#')) {
        improvements.push('Adicionar hashtags relevantes');
      }

      if (improvements.length > 0) {
        // Generate enhanced description
        const bookName = title.split(' ').slice(0, 3).join(' ');
        const enhancedDescription = this.generateEnhancedDescription(bookName, title);
        
        this.optimizations.descriptionEnhancements.push({
          videoId: video.id,
          title: title,
          originalDescription: description,
          enhancedDescription: enhancedDescription,
          improvements: improvements,
          priority: improvements.length > 3 ? 'high' : 'medium'
        });
      }
    });

    console.log(`✅ Found ${this.optimizations.descriptionEnhancements.length} description enhancement opportunities`);
  }

  generateEnhancedDescription(bookName, videoTitle) {
    return `🔥 Neste vídeo, apresentamos um resumo completo do livro "${bookName}"!

📚 SOBRE O LIVRO:
${videoTitle}

⏰ TIMESTAMPS:
00:00 Introdução
02:00 Conceitos principais
05:00 Lições práticas
08:00 Como aplicar
10:00 Conclusão

🎯 PRINCIPAIS APRENDIZADOS:
✅ [Ponto principal 1]
✅ [Ponto principal 2] 
✅ [Ponto principal 3]

📖 QUER MAIS RESUMOS DE LIVROS?
🔔 INSCREVA-SE no canal e ative o sininho!
👍 DEIXE SEU LIKE se o conteúdo foi útil!
💬 COMENTE que livro você quer ver resumido!

🎧 OUÇA NO PODCAST:
🎵 Spotify: https://open.spotify.com/show/resumocast
🍎 Apple Podcasts: [link]

🔗 LINKS ÚTEIS:
📚 Compre o livro: [link afiliado]
📝 Resumo em texto: [link blog]
🎬 Vídeos relacionados: [playlist]

#resumodelivros #negócios #empreendedorismo #liderança #produtividade #resumocast #livrosdeneg cio #desenvolvimentopessoal #sucesso

---
ResumoCast - O maior canal de resumos de livros para empreendedores do Brasil 🇧🇷`;
  }

  analyzeTagOptimization() {
    console.log('🏷️ Analyzing tag optimization opportunities...');
    
    const optimalTags = [
      'resumo de livros',
      'livros de negócios', 
      'empreendedorismo',
      'liderança',
      'desenvolvimento pessoal',
      'produtividade',
      'sucesso',
      'mindset',
      'gestão',
      'motivação',
      'resumocast',
      'podcast',
      'audiobook',
      'negócios'
    ];

    this.videos.forEach(video => {
      const currentTags = video.snippet.tags || [];
      const title = video.snippet.title.toLowerCase();
      
      // Generate contextual tags based on title
      const contextualTags = [];
      if (title.includes('líder') || title.includes('lider')) contextualTags.push('liderança');
      if (title.includes('vend')) contextualTags.push('vendas', 'marketing');
      if (title.includes('dinheiro') || title.includes('rico')) contextualTags.push('finanças', 'investimentos');
      if (title.includes('produtiv')) contextualTags.push('produtividade', 'eficiência');
      if (title.includes('empreend')) contextualTags.push('empreendedorismo', 'startup');

      const suggestedTags = [...new Set([...optimalTags, ...contextualTags])];
      
      // Check if tags need optimization
      const missingImportantTags = suggestedTags.filter(tag => 
        !currentTags.some(currentTag => 
          currentTag.toLowerCase().includes(tag.toLowerCase())
        )
      );

      if (missingImportantTags.length > 0 || currentTags.length < 10) {
        this.optimizations.tagSuggestions.push({
          videoId: video.id,
          title: video.snippet.title,
          currentTags: currentTags,
          suggestedTags: suggestedTags.slice(0, 15), // YouTube limit
          missingTags: missingImportantTags,
          priority: currentTags.length < 5 ? 'high' : 'medium'
        });
      }
    });

    console.log(`✅ Found ${this.optimizations.tagSuggestions.length} tag optimization opportunities`);
  }

  analyzePlaylistOpportunities() {
    console.log('📋 Analyzing playlist organization opportunities...');
    
    // Group videos by themes
    const themes = {
      'Liderança e Gestão': [],
      'Empreendedorismo e Startups': [],
      'Desenvolvimento Pessoal': [],
      'Produtividade e Eficiência': [],
      'Vendas e Marketing': [],
      'Finanças e Investimentos': [],
      'Mindset e Motivação': []
    };

    this.videos.forEach(video => {
      const title = video.snippet.title.toLowerCase();
      
      if (title.includes('líder') || title.includes('gestão') || title.includes('comando')) {
        themes['Liderança e Gestão'].push(video);
      }
      if (title.includes('empreend') || title.includes('startup') || title.includes('negócio')) {
        themes['Empreendedorismo e Startups'].push(video);
      }
      if (title.includes('desenvolv') || title.includes('hábito') || title.includes('disciplina')) {
        themes['Desenvolvimento Pessoal'].push(video);
      }
      if (title.includes('produtiv') || title.includes('tempo') || title.includes('eficien')) {
        themes['Produtividade e Eficiência'].push(video);
      }
      if (title.includes('vend') || title.includes('marketing') || title.includes('cliente')) {
        themes['Vendas e Marketing'].push(video);
      }
      if (title.includes('dinheiro') || title.includes('rico') || title.includes('invest')) {
        themes['Finanças e Investimentos'].push(video);
      }
      if (title.includes('mindset') || title.includes('mental') || title.includes('motivação')) {
        themes['Mindset e Motivação'].push(video);
      }
    });

    // Create playlist recommendations
    Object.entries(themes).forEach(([themeName, videos]) => {
      if (videos.length >= 3) {
        this.optimizations.playlistRecommendations.push({
          playlistName: themeName,
          description: `Coleção completa de resumos sobre ${themeName.toLowerCase()}`,
          videoCount: videos.length,
          videos: videos.map(v => ({
            videoId: v.id,
            title: v.snippet.title,
            views: parseInt(v.statistics?.viewCount || 0)
          })),
          priority: videos.length > 5 ? 'high' : 'medium'
        });
      }
    });

    console.log(`✅ Generated ${this.optimizations.playlistRecommendations.length} playlist recommendations`);
  }

  identifyQuickWins() {
    console.log('⚡ Identifying quick wins...');
    
    // High-impact, low-effort optimizations
    const quickWins = [];

    // Videos with good performance but poor titles
    this.analytics.topPerformers?.slice(0, 10).forEach(video => {
      const titleOpt = this.optimizations.titleOptimizations.find(opt => opt.videoId === video.videoId);
      if (titleOpt) {
        quickWins.push({
          type: 'title_optimization',
          videoId: video.videoId,
          title: video.title,
          currentViews: video.views,
          effort: 'low',
          impact: 'high',
          description: 'Otimizar título de vídeo com boa performance'
        });
      }
    });

    // Videos missing descriptions
    this.videos.forEach(video => {
      const description = video.snippet.description || '';
      if (description.length < 50) {
        quickWins.push({
          type: 'description_enhancement',
          videoId: video.id,
          title: video.snippet.title,
          effort: 'low',
          impact: 'medium',
          description: 'Adicionar descrição rica ao vídeo'
        });
      }
    });

    // Videos with no tags
    this.videos.forEach(video => {
      const tags = video.snippet.tags || [];
      if (tags.length < 3) {
        quickWins.push({
          type: 'tag_addition',
          videoId: video.id,
          title: video.snippet.title,
          effort: 'low',
          impact: 'medium',
          description: 'Adicionar tags relevantes'
        });
      }
    });

    this.optimizations.quickWins = quickWins;
    console.log(`✅ Identified ${quickWins.length} quick wins`);
  }

  async generateOptimizationReport() {
    console.log('📊 Generating comprehensive optimization report...');
    
    const report = {
      executiveSummary: {
        videosAnalyzed: this.videos.length,
        totalOptimizations: Object.values(this.optimizations).flat().length,
        highPriorityItems: 0,
        estimatedImpact: 'Potential 40-60% increase in organic discovery'
      },
      optimizations: this.optimizations,
      recommendations: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      },
      generatedAt: new Date().toISOString()
    };

    // Categorize recommendations by timeline
    report.recommendations.immediate = [
      'Otimizar títulos dos top 10 vídeos mais visualizados',
      'Adicionar descrições ricas aos vídeos sem descrição',
      'Criar 3 playlists temáticas principais'
    ];

    report.recommendations.shortTerm = [
      'Implementar template padrão para todas as descrições',
      'Organizar biblioteca em 7 séries temáticas',
      'Otimizar tags de todos os vídeos publicados'
    ];

    report.recommendations.longTerm = [
      'Estabelecer cronograma consistente de uploads',
      'Criar sistema automatizado de otimização',
      'Desenvolver estratégia de conteúdo multi-formato'
    ];

    // Count high priority items
    Object.values(this.optimizations).forEach(optimizationArray => {
      if (Array.isArray(optimizationArray)) {
        report.executiveSummary.highPriorityItems += optimizationArray.filter(
          opt => opt.priority === 'high'
        ).length;
      }
    });

    // Save report
    await fs.writeFile(
      path.join(this.dataDir, 'analysis', 'optimization-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('✅ Optimization report saved!');
    return report;
  }

  async generateActionPlan() {
    console.log('📋 Generating actionable implementation plan...');
    
    const actionPlan = {
      phase1_immediate: {
        title: 'Rescue Operação (Primeiras 24 horas)',
        actions: [],
        estimatedTime: '2-4 horas',
        expectedImpact: '+20-30% descoberta orgânica'
      },
      phase2_foundation: {
        title: 'Construção Base (1-2 semanas)', 
        actions: [],
        estimatedTime: '1-2 semanas',
        expectedImpact: '+40-50% engajamento'
      },
      phase3_automation: {
        title: 'Automação (2-4 semanas)',
        actions: [],
        estimatedTime: '2-4 semanas', 
        expectedImpact: 'Sistema sustentável de crescimento'
      }
    };

    // Phase 1: Immediate fixes
    if (this.optimizations.quickWins.length > 0) {
      actionPlan.phase1_immediate.actions.push(
        `Otimizar ${Math.min(10, this.optimizations.titleOptimizations.length)} títulos prioritários`,
        `Adicionar descrições ricas a ${Math.min(5, this.optimizations.descriptionEnhancements.length)} vídeos`,
        'Criar 3 playlists temáticas essenciais'
      );
    }

    // Phase 2: Foundation building
    actionPlan.phase2_foundation.actions.push(
      'Implementar template padrão de descrições',
      'Organizar todos os vídeos em séries temáticas',
      'Otimizar tags de todos os vídeos analisados',
      'Configurar sistema de monitoramento de performance'
    );

    // Phase 3: Automation
    actionPlan.phase3_automation.actions.push(
      'Criar pipeline automatizado de otimização',
      'Implementar sistema de upload programático',
      'Configurar alertas de performance',
      'Estabelecer workflow de manutenção contínua'
    );

    await fs.writeFile(
      path.join(this.dataDir, 'analysis', 'action-plan.json'),
      JSON.stringify(actionPlan, null, 2)
    );

    console.log('✅ Action plan generated!');
    return actionPlan;
  }

  async printSummary() {
    console.log('\n🎯 OPTIMIZATION ANALYSIS SUMMARY');
    console.log('=================================\n');
    
    console.log('📊 ANALYSIS RESULTS:');
    console.log(`   Videos Analyzed: ${this.videos.length}`);
    console.log(`   Title Optimizations: ${this.optimizations.titleOptimizations.length}`);
    console.log(`   Description Enhancements: ${this.optimizations.descriptionEnhancements.length}`);
    console.log(`   Tag Improvements: ${this.optimizations.tagSuggestions.length}`);
    console.log(`   Playlist Opportunities: ${this.optimizations.playlistRecommendations.length}`);
    console.log(`   Quick Wins Identified: ${this.optimizations.quickWins.length}\n`);
    
    console.log('🚨 HIGH PRIORITY OPTIMIZATIONS:');
    const highPriorityCount = Object.values(this.optimizations).flat().filter(
      opt => opt.priority === 'high'
    ).length;
    console.log(`   ${highPriorityCount} items need immediate attention\n`);
    
    console.log('⚡ TOP QUICK WINS:');
    this.optimizations.quickWins.slice(0, 5).forEach((win, index) => {
      console.log(`   ${index + 1}. ${win.description} (${win.effort} effort, ${win.impact} impact)`);
    });
    console.log('');
    
    console.log('📋 RECOMMENDED PLAYLISTS:');
    this.optimizations.playlistRecommendations.slice(0, 3).forEach(playlist => {
      console.log(`   • ${playlist.playlistName} (${playlist.videoCount} videos)`);
    });
    console.log('');
    
    console.log('📁 FILES GENERATED:');
    console.log('   data/analysis/optimization-report.json');
    console.log('   data/analysis/action-plan.json\n');
    
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Review the optimization report');
    console.log('   2. Implement Phase 1 quick wins');
    console.log('   3. Execute systematic optimizations');
    console.log('   4. Monitor performance improvements\n');
  }
}

async function main() {
  console.log('🔍 ResumoCast Optimization Analysis');
  console.log('===================================\n');

  const analyzer = new OptimizationAnalyzer();
  
  if (!(await analyzer.loadData())) {
    console.log('❌ Failed to load data. Please run: node extract-channel-data.js');
    return;
  }

  console.log('⚡ Running comprehensive optimization analysis...\n');
  
  analyzer.analyzeTitleOptimizations();
  analyzer.analyzeDescriptionEnhancements();
  analyzer.analyzeTagOptimization();
  analyzer.analyzePlaylistOpportunities();
  analyzer.identifyQuickWins();
  
  await analyzer.generateOptimizationReport();
  await analyzer.generateActionPlan();
  await analyzer.printSummary();
  
  console.log('🎉 Optimization analysis completed successfully!');
}

main().catch(console.error);