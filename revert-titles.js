#!/usr/bin/env node

/**
 * Revert Title Changes
 * Restore original titles and implement better strategy
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class TitleReverter {
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

  async revertTitles() {
    console.log('🔄 Reverting problematic titles to originals...\n');
    
    const revertData = [
      {
        videoId: 'm50H8g8_-mk',
        currentTitle: 'Assim como um - Resumo Completo | Livros de Negócios | ResumoCast',
        originalTitle: 'Assim como um medico da um diagnostico nossa empresa tambem tem.',
        betterTitle: 'Diagnóstico Empresarial: Como um Médico Analisa Sua Empresa | ResumoCast'
      },
      {
        videoId: 'LtcwO_E9yxA', 
        currentTitle: 'Se você se - Resumo Completo | Livros de Negócios | ResumoCast',
        originalTitle: 'Se você se sente sem criatividade, leia esse livro',
        betterTitle: 'Criatividade: Como Despertar Seu Potencial Criativo | Resumo de Livro | ResumoCast'
      },
      {
        videoId: 'Ue_3tyDPkNY',
        currentTitle: 'Napolleon Hill - Resumo Completo | Livros de Negócios | ResumoCast', 
        originalTitle: 'Napolleon Hill',
        betterTitle: 'Napoleon Hill: Pense e Enriqueça | Resumo Completo | ResumoCast'
      }
    ];

    for (const video of revertData) {
      console.log(`📺 Video: ${video.videoId}`);
      console.log(`❌ Título problemático: ${video.currentTitle}`);
      console.log(`✅ Novo título melhor: ${video.betterTitle}`);
      
      try {
        const videoResponse = await this.youtube.videos.list({
          part: ['snippet'],
          id: [video.videoId]
        });
        
        if (videoResponse.data.items && videoResponse.data.items.length > 0) {
          const videoData = videoResponse.data.items[0];
          
          await this.youtube.videos.update({
            part: ['snippet'],
            requestBody: {
              id: video.videoId,
              snippet: {
                ...videoData.snippet,
                title: video.betterTitle
              }
            }
          });
          
          console.log('✅ Título corrigido com sucesso!\n');
          await this.delay(2000);
        }
      } catch (error) {
        console.error(`❌ Erro ao corrigir título: ${error.message}\n`);
      }
    }
  }

  async generateBetterStrategy() {
    console.log('\n📋 NOVA ESTRATÉGIA DE TÍTULOS');
    console.log('=============================\n');
    
    console.log('❌ PROBLEMA IDENTIFICADO:');
    console.log('   • Títulos cortados no meio de frases');
    console.log('   • Perda do contexto original');
    console.log('   • Não faz sentido para humanos\n');
    
    console.log('✅ NOVA ABORDAGEM:');
    console.log('   • Manter essência do título original');
    console.log('   • Adicionar palavras-chave no FINAL');
    console.log('   • Usar | como separador claro');
    console.log('   • Máximo 60 caracteres na parte principal\n');
    
    console.log('📝 TEMPLATE MELHORADO:');
    console.log('   [TÍTULO ORIGINAL CLARO] | [TIPO] | ResumoCast\n');
    
    console.log('💡 EXEMPLOS CORRETOS:');
    console.log('   ❌ "Assim como um - Resumo..."');
    console.log('   ✅ "Diagnóstico Empresarial: Como um Médico Analisa Sua Empresa | ResumoCast"\n');
    
    console.log('   ❌ "Se você se - Resumo..."');
    console.log('   ✅ "Criatividade: Como Despertar Seu Potencial Criativo | Resumo de Livro | ResumoCast"\n');
    
    console.log('🎯 PRINCÍPIOS:');
    console.log('   1. Título deve fazer sentido isoladamente');
    console.log('   2. Palavras-chave brasileiras naturais');
    console.log('   3. Branding no final, não cortando conteúdo');
    console.log('   4. SEO sem sacrificar legibilidade');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  console.log('🔧 Correção de Títulos ResumoCast');
  console.log('==================================\n');

  const reverter = new TitleReverter();
  
  if (!(await reverter.initialize())) {
    console.log('❌ Failed to initialize.');
    return;
  }
  
  await reverter.revertTitles();
  await reverter.generateBetterStrategy();
}

main().catch(console.error);