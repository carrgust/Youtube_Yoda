#!/usr/bin/env node

/**
 * Phase 1 Implementation - Execute All Approved Optimizations
 * Preserves episode numbers (T4#, T5#, etc.) as approved
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class Phase1Implementation {
  constructor() {
    this.youtube = null;
    this.auth = null;
    this.dataDir = path.join(__dirname, 'data');
    this.allVideos = [];
    this.implementationLog = {
      titleOptimizations: { success: 0, failed: 0, details: [] },
      tagImplementations: { success: 0, failed: 0, details: [] },
      descriptionEnhancements: { success: 0, failed: 0, details: [] }
    };
    this.startTime = new Date();
  }

  async initialize() {
    try {
      const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials(tokens);
      this.youtube = google.youtube({ version: 'v3', auth: this.auth });
      console.log('✅ YouTube API initialized for Phase 1 implementation');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async loadVideoData() {
    try {
      const videosData = await fs.readFile(
        path.join(this.dataDir, 'channel-export', 'videos-metadata.json'),
        'utf-8'
      );
      this.allVideos = JSON.parse(videosData);
      console.log(`✅ Loaded ${this.allVideos.length} videos for implementation\n`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load video data:', error.message);
      return false;
    }
  }

  extractEpisodeNumber(title) {
    const episodeMatch = title.match(/^(T\d+#\d+)/);
    return episodeMatch ? episodeMatch[1] : null;
  }

  generateOptimizedTitle(video, episodeNumber = null) {
    const title = video.snippet.title;
    const videoId = video.id;
    
    const titleOptimizations = {
      'Ue_3tyDPkNY': 'Napoleon Hill: Pense e Enriqueça | Resumo Completo | ResumoCast',
      'm50H8g8_-mk': 'Diagnóstico Empresarial: Como Analisar Sua Empresa | ResumoCast',
      'LtcwO_E9yxA': 'Como Despertar Criatividade: 5 Técnicas Comprovadas | ResumoCast',
      'pOiUVZXs0zE': 'Plano de Negócios vs. Mercado: A Verdade Revelada | ResumoCast',
      'J2XJKvtmrhg': '18 Livros Essenciais para Crescimento | ResumoCast',
      'FweAWn1gM8c': 'Impacto Positivo com Sua Marca: Dicas da Natura | ResumoCast',
      'O3wUx843dDE': 'Comunicação Empática: Transforme Relacionamentos | ResumoCast',
      '6fHiW36VjCQ': 'Ideias de Sucesso: 2 Características Essenciais | ResumoCast',
      'v8uCSUXHSi8': 'Vendas B2B: Estratégias que Funcionam | ResumoCast',
      'pVIJa2RyDxs': 'Energia e Produtividade: Segredos Revelados | ResumoCast',
      'zffZGbn30Zo': 'Hábitos Atômicos: Transforme Sua Vida | ResumoCast',
      'hqz1R8dhm4M': 'Liderança Eficaz: Princípios Fundamentais | ResumoCast',
      'J3dRuC4jZUs': 'Mindset de Crescimento: Como Desenvolver | ResumoCast',
      'vIhTJFCPjgM': 'Inteligência Emocional no Trabalho | ResumoCast',
      'tEOSbqicZGU': 'Negociação Eficaz: Técnicas Comprovadas | ResumoCast',
      '7tQuis8p1Dw': 'Gestão de Tempo: Maximize Produtividade | ResumoCast',
      'mv6Re7YBFMQ': 'Marketing Digital: Estratégias Vencedoras | ResumoCast',
      'EFppHbjNIUQ': '"Mais Esperto que o Diabo" por Napoleon Hill | ResumoCast',
      'CP-3YxgM_70': 'Sexta 06/01/23 Morning Jog by Viden Ventures e Gutenberg Ventures | ResumoCast',
      '9jdtRxLfwv4': 'Sexta 18.11.22 Morning Jog by Viden Ventures e Gutenberg Ventures | ResumoCast',
      'GsAfOVnPMYU': 'NEWS Sexta 20.05, Notícias para empreendedores | ResumoCast',
      '3ji7vBmtTFw': 'NEWS Terça 05.04, Notícias para emprendedores | ResumoCast',
      'OCdPx2tJhJY': 'NEWS Quarta 25-08, Notícias para empreendedores | ResumoCast',
      'aBDH1KHaIcQ': 'NEWS Segunda 02/08, Notícias para emprendedores AO VIVO | ResumoCast',
      '3ezK9RJn9Ew': 'O Poder da Ação - Resumo do livro de Paulo Vieira | ResumoCast',
      'RcUI2kAl4Xg': 'Avalie O Que Importa - John Doerr | ResumoCast',
      '5cHMKkpWXGY': 'O que é INTELIGÊNCIA EMOCIONAL? | ESTALO | ResumoCast'
    };

    let optimizedTitle = titleOptimizations[videoId];
    
    if (!optimizedTitle && episodeNumber) {
      // Preserve episode number in special cases
      if (videoId === '6IpDBNXPraQ') {
        optimizedTitle = 'T5#025 Mente de Aço, atitudes de ouro | ResumoCast';
      } else if (videoId === 'g4DszgJMbNI') {
        optimizedTitle = 'T5#022 Impérios de produto | ResumoCast';
      } else if (videoId === 'wPbBveKtzNI') {
        optimizedTitle = 'T4#13 Accountability: Responsabilidade e Sucesso | ResumoCast';
      } else if (videoId === 'lLTjNJzIbok') {
        optimizedTitle = 'T4#10 O Futuro do dinheiro | ResumoCast';
      } else {
        // Generic optimization preserving episode number
        const titleWithoutEpisode = title.replace(/^T\d+#\d+\s*/, '').trim();
        optimizedTitle = `${episodeNumber} ${titleWithoutEpisode} | ResumoCast`;
      }
    }

    return optimizedTitle || null;
  }

  generateOptimizedTags(video) {
    const title = video.snippet.title.toLowerCase();
    const baseTags = ['resumocast', 'resumo de livros', 'negócios', 'empreendedorismo'];
    let specificTags = [];

    if (title.includes('napoleon') || title.includes('hill')) {
      specificTags = ['napoleon hill', 'pense e enriqueça', 'desenvolvimento pessoal', 'sucesso', 'mindset'];
    } else if (title.includes('criatividade')) {
      specificTags = ['criatividade', 'inovação', 'pensamento criativo', 'produtividade', 'inspiração'];
    } else if (title.includes('diagnóstico') || title.includes('empresa')) {
      specificTags = ['gestão empresarial', 'diagnóstico empresarial', 'estratégia', 'análise de negócios'];
    } else if (title.includes('vendas') || title.includes('b2b')) {
      specificTags = ['vendas', 'vendas b2b', 'estratégias de vendas', 'marketing', 'relacionamento comercial'];
    } else if (title.includes('liderança')) {
      specificTags = ['liderança', 'gestão de pessoas', 'management', 'team leadership', 'desenvolvimento de líderes'];
    } else if (title.includes('hábitos')) {
      specificTags = ['hábitos', 'produtividade', 'autodesenvolvimento', 'mudança de comportamento'];
    } else if (title.includes('comunicação')) {
      specificTags = ['comunicação', 'relacionamentos', 'empatia', 'soft skills', 'inteligência emocional'];
    } else if (title.includes('inteligência emocional')) {
      specificTags = ['inteligência emocional', 'daniel goleman', 'soft skills', 'gestão emocional', 'liderança'];
    } else if (title.includes('poder da ação')) {
      specificTags = ['paulo vieira', 'coaching', 'desenvolvimento pessoal', 'mudança de vida', 'autodesenvolvimento'];
    } else if (title.includes('okr') || title.includes('avalie')) {
      specificTags = ['okr', 'gestão', 'metas', 'objetivos', 'john doerr', 'planejamento estratégico'];
    } else {
      specificTags = ['desenvolvimento pessoal', 'livros de negócios', 'educação', 'conhecimento'];
    }

    return [...baseTags, ...specificTags].slice(0, 15);
  }

  generateOptimizedDescription(video) {
    const title = video.snippet.title;
    let specificIntro = '';

    if (title.toLowerCase().includes('napoleon hill')) {
      specificIntro = '📚 Descubra os segredos de Napoleon Hill e transforme sua mentalidade para o sucesso!';
    } else if (title.toLowerCase().includes('criatividade')) {
      specificIntro = '💡 Aprenda técnicas comprovadas para despertar sua criatividade e inovar em qualquer área!';
    } else if (title.toLowerCase().includes('vendas')) {
      specificIntro = '💼 Domine as estratégias de vendas B2B que realmente funcionam no mercado atual!';
    } else if (title.toLowerCase().includes('poder da ação')) {
      specificIntro = '🚀 Transforme sua vida com os ensinamentos de Paulo Vieira sobre ação e resultados!';
    } else {
      specificIntro = '📚 Transforme conhecimento em ação com os melhores insights de livros de negócios!';
    }

    const baseDescription = `${specificIntro}

🎯 O QUE VOCÊ VAI APRENDER:
• Conceitos fundamentais explicados de forma clara e objetiva
• Estratégias práticas para implementar imediatamente
• Exemplos reais e casos de sucesso comprovados
• Dicas valiosas para aplicar no seu dia a dia
• Insights que farão diferença na sua carreira

💡 SOBRE O RESUMOCAST:
O ResumoCast é o canal que transforma os melhores livros de negócios e desenvolvimento pessoal em conteúdo prático e acessível. Nossa missão é democratizar o conhecimento e ajudar você a crescer pessoal e profissionalmente.

📊 Por que assistir ao ResumoCast?
• Resumos completos e detalhados
• Conteúdo em português de alta qualidade
• Foco em aplicação prática
• Comunidade engajada de empreendedores

🔔 INSCREVA-SE no canal e ative o sininho para não perder nenhum resumo!
👍 Se este conteúdo foi útil, deixe seu LIKE e ajude o canal a crescer!
💬 COMENTE: Qual foi seu principal aprendizado deste vídeo?
📢 COMPARTILHE com quem precisa deste conhecimento!

📱 CONECTE-SE CONOSCO:
• Website: www.resumocast.com.br
• Instagram: @resumocast
• LinkedIn: /company/resumocast
• Facebook: /resumocast
• Twitter: @resumocast

🏷️ TAGS:
#ResumoCast #ResumosDeLivros #Negócios #Empreendedorismo #DesenvolvimentoPessoal #Produtividade #Liderança #Sucesso #LivrosDeNegócios #Educação #Conhecimento #Inovação #Estratégia #Marketing #Vendas

📚 VÍDEOS RELACIONADOS QUE VOCÊ VAI GOSTAR:
• [Playlist: Melhores Resumos de Livros]
• [Playlist: Desenvolvimento Pessoal]
• [Playlist: Estratégias de Negócios]

⏰ TIMESTAMPS:
00:00 - Introdução e contexto
02:00 - Conceitos principais
[Adicionar timestamps específicos conforme o conteúdo]

📖 SOBRE O LIVRO/TEMA:
[Breve descrição do livro ou tema abordado]

🙏 Obrigado por assistir e por fazer parte da comunidade ResumoCast!
Juntos, transformamos conhecimento em ação e resultados.

➡️ Próximo vídeo: [Sugestão de vídeo relacionado]`;

    return baseDescription.trim();
  }

  async implementTitleOptimizations() {
    console.log('\n🔤 IMPLEMENTING TITLE OPTIMIZATIONS');
    console.log('===================================\n');

    const videosToOptimize = [
      'J2XJKvtmrhg', '6IpDBNXPraQ', 'g4DszgJMbNI', 'EFppHbjNIUQ',
      'CP-3YxgM_70', '9jdtRxLfwv4', 'wPbBveKtzNI', 'lLTjNJzIbok',
      'GsAfOVnPMYU', '3ji7vBmtTFw', 'OCdPx2tJhJY', 'aBDH1KHaIcQ',
      '3ezK9RJn9Ew', 'RcUI2kAl4Xg', '5cHMKkpWXGY'
    ];

    for (const videoId of videosToOptimize) {
      const video = this.allVideos.find(v => v.id === videoId);
      if (!video) continue;

      const episodeNumber = this.extractEpisodeNumber(video.snippet.title);
      const optimizedTitle = this.generateOptimizedTitle(video, episodeNumber);
      
      if (!optimizedTitle) continue;

      try {
        await this.youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: videoId,
            snippet: {
              ...video.snippet,
              title: optimizedTitle,
              categoryId: video.snippet.categoryId
            }
          }
        });

        this.implementationLog.titleOptimizations.success++;
        this.implementationLog.titleOptimizations.details.push({
          videoId,
          oldTitle: video.snippet.title,
          newTitle: optimizedTitle,
          episodePreserved: !!episodeNumber,
          status: 'SUCCESS'
        });

        console.log(`✅ Title updated: "${optimizedTitle}"`);
        if (episodeNumber) {
          console.log(`   📺 Episode number preserved: ${episodeNumber}`);
        }

        // Rate limiting
        await this.delay(2000);
      } catch (error) {
        this.implementationLog.titleOptimizations.failed++;
        this.implementationLog.titleOptimizations.details.push({
          videoId,
          oldTitle: video.snippet.title,
          error: error.message,
          status: 'FAILED'
        });
        console.error(`❌ Failed to update title for ${videoId}:`, error.message);
      }
    }

    console.log(`\n📊 Title Optimization Results:`);
    console.log(`   ✅ Success: ${this.implementationLog.titleOptimizations.success}`);
    console.log(`   ❌ Failed: ${this.implementationLog.titleOptimizations.failed}\n`);
  }

  async implementTagOptimizations() {
    console.log('\n🏷️ IMPLEMENTING TAG OPTIMIZATIONS');
    console.log('=================================\n');

    const videosToOptimize = [
      '6IpDBNXPraQ', 'EFppHbjNIUQ', 'CP-3YxgM_70', '9jdtRxLfwv4',
      'A6_5b3uzHzg', 'GsAfOVnPMYU', '3ji7vBmtTFw', 'OCdPx2tJhJY',
      'aBDH1KHaIcQ', 'fUgkiNiMF2w', '3ezK9RJn9Ew', 'RcUI2kAl4Xg',
      '5cHMKkpWXGY'
    ];

    for (const videoId of videosToOptimize) {
      const video = this.allVideos.find(v => v.id === videoId);
      if (!video) continue;

      const optimizedTags = this.generateOptimizedTags(video);

      try {
        await this.youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: videoId,
            snippet: {
              ...video.snippet,
              tags: optimizedTags,
              categoryId: video.snippet.categoryId
            }
          }
        });

        this.implementationLog.tagImplementations.success++;
        this.implementationLog.tagImplementations.details.push({
          videoId,
          title: video.snippet.title,
          oldTags: video.snippet.tags || [],
          newTags: optimizedTags,
          status: 'SUCCESS'
        });

        console.log(`✅ Tags updated for: "${video.snippet.title}"`);
        console.log(`   📊 New tags (${optimizedTags.length}): ${optimizedTags.slice(0, 5).join(', ')}...`);

        // Rate limiting
        await this.delay(2000);
      } catch (error) {
        this.implementationLog.tagImplementations.failed++;
        this.implementationLog.tagImplementations.details.push({
          videoId,
          title: video.snippet.title,
          error: error.message,
          status: 'FAILED'
        });
        console.error(`❌ Failed to update tags for ${videoId}:`, error.message);
      }
    }

    console.log(`\n📊 Tag Implementation Results:`);
    console.log(`   ✅ Success: ${this.implementationLog.tagImplementations.success}`);
    console.log(`   ❌ Failed: ${this.implementationLog.tagImplementations.failed}\n`);
  }

  async implementDescriptionEnhancements() {
    console.log('\n📝 IMPLEMENTING DESCRIPTION ENHANCEMENTS');
    console.log('========================================\n');

    const videosToOptimize = [
      'J2XJKvtmrhg', '6IpDBNXPraQ', 'g4DszgJMbNI', 'EFppHbjNIUQ',
      'CP-3YxgM_70', '9jdtRxLfwv4', 'wPbBveKtzNI', 'lLTjNJzIbok',
      'A6_5b3uzHzg', 'GsAfOVnPMYU', '3ji7vBmtTFw', 'OCdPx2tJhJY',
      'aBDH1KHaIcQ', 'fUgkiNiMF2w', '3ezK9RJn9Ew', 'RcUI2kAl4Xg',
      '5cHMKkpWXGY'
    ];

    for (const videoId of videosToOptimize) {
      const video = this.allVideos.find(v => v.id === videoId);
      if (!video) continue;

      const optimizedDescription = this.generateOptimizedDescription(video);

      try {
        await this.youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: videoId,
            snippet: {
              ...video.snippet,
              description: optimizedDescription,
              categoryId: video.snippet.categoryId
            }
          }
        });

        this.implementationLog.descriptionEnhancements.success++;
        this.implementationLog.descriptionEnhancements.details.push({
          videoId,
          title: video.snippet.title,
          oldLength: (video.snippet.description || '').length,
          newLength: optimizedDescription.length,
          status: 'SUCCESS'
        });

        console.log(`✅ Description updated for: "${video.snippet.title}"`);
        console.log(`   📏 Length: ${(video.snippet.description || '').length} → ${optimizedDescription.length} chars`);

        // Rate limiting
        await this.delay(2000);
      } catch (error) {
        this.implementationLog.descriptionEnhancements.failed++;
        this.implementationLog.descriptionEnhancements.details.push({
          videoId,
          title: video.snippet.title,
          error: error.message,
          status: 'FAILED'
        });
        console.error(`❌ Failed to update description for ${videoId}:`, error.message);
      }
    }

    console.log(`\n📊 Description Enhancement Results:`);
    console.log(`   ✅ Success: ${this.implementationLog.descriptionEnhancements.success}`);
    console.log(`   ❌ Failed: ${this.implementationLog.descriptionEnhancements.failed}\n`);
  }

  async saveImplementationReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000 / 60);

    const report = {
      phase: 'Phase 1 Implementation',
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration} minutes`,
      summary: {
        totalAttempted: 
          this.implementationLog.titleOptimizations.success + 
          this.implementationLog.titleOptimizations.failed +
          this.implementationLog.tagImplementations.success + 
          this.implementationLog.tagImplementations.failed +
          this.implementationLog.descriptionEnhancements.success + 
          this.implementationLog.descriptionEnhancements.failed,
        totalSuccess:
          this.implementationLog.titleOptimizations.success +
          this.implementationLog.tagImplementations.success +
          this.implementationLog.descriptionEnhancements.success,
        totalFailed:
          this.implementationLog.titleOptimizations.failed +
          this.implementationLog.tagImplementations.failed +
          this.implementationLog.descriptionEnhancements.failed
      },
      details: this.implementationLog,
      episodeNumbersPreserved: this.implementationLog.titleOptimizations.details
        .filter(d => d.episodePreserved).length
    };

    await fs.writeFile(
      path.join(this.dataDir, 'analysis', `phase1-implementation-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📋 IMPLEMENTATION REPORT SAVED');
    console.log('==============================');
    console.log(`📁 Report saved to data/analysis/`);
    console.log(`⏱️ Total duration: ${duration} minutes`);
    console.log(`📊 Success rate: ${Math.round(report.summary.totalSuccess / report.summary.totalAttempted * 100)}%`);

    return report;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executePhase1() {
    console.log('🚀 STARTING PHASE 1 IMPLEMENTATION');
    console.log('==================================\n');
    console.log('📋 Implementing all 45 approved optimizations');
    console.log('🔒 Episode numbers will be preserved as approved\n');

    if (!(await this.initialize())) {
      console.log('❌ Failed to initialize');
      return;
    }

    if (!(await this.loadVideoData())) {
      console.log('❌ Failed to load video data');
      return;
    }

    // Execute all optimizations
    await this.implementTitleOptimizations();
    await this.implementTagOptimizations();
    await this.implementDescriptionEnhancements();

    // Generate final report
    const report = await this.saveImplementationReport();

    console.log('\n🎉 PHASE 1 IMPLEMENTATION COMPLETE!');
    console.log('===================================');
    console.log(`✅ Total optimizations successful: ${report.summary.totalSuccess}`);
    console.log(`❌ Total failed: ${report.summary.totalFailed}`);
    console.log(`📺 Episode numbers preserved: ${report.episodeNumbersPreserved}`);
    console.log(`⏱️ Total time: ${report.duration}`);
    console.log('\n📈 Expected results will be visible in 7-14 days');
    console.log('📊 Monitor YouTube Analytics for performance improvements');
  }
}

async function main() {
  console.log('🔧 ResumoCast - Phase 1 Implementation');
  console.log('======================================\n');

  const implementation = new Phase1Implementation();
  await implementation.executePhase1();
}

main().catch(console.error);