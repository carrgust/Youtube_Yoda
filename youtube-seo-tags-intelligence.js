const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const express = require('express');
const open = require('open');

// Initialize YouTube API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY'
});

class YouTubeSEOTagger {
    constructor() {
        this.auth = null;
        this.youtube = null;
        this.RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';
        
        // Bad tag patterns to filter out
        this.badTagPatterns = [
            // Generic single words that nobody searches for
            /^(brasil|português|portugues|todos|para|com|por|que|como|mais|sobre|muito|pouco|novo|velho)$/i,
            // Language/country identifiers alone
            /^(pt|br|pt-br|brazil|portuguese)$/i,
            // Too generic business terms alone
            /^(negócio|empresa|trabalho|dinheiro|sucesso)$/i,
            // Stop words and articles
            /^(o|a|os|as|um|uma|de|da|do|dos|das|em|na|no|nas|nos)$/i,
            // Single letters or numbers
            /^[a-z0-9]$/i,
            // Year alone (unless it's current year for trending content)
            /^(2020|2021|2022|2023)$/i
        ];
        
        // Good tag patterns based on search intent
        this.goodTagTemplates = {
            howTo: [
                'como fazer {topic}',
                'como criar {topic}',
                'como melhorar {topic}',
                'tutorial de {topic}',
                'passo a passo {topic}'
            ],
            tips: [
                'dicas de {topic}',
                '{topic} para iniciantes',
                'melhores práticas {topic}',
                'estratégias de {topic}',
                'segredos do {topic}'
            ],
            problems: [
                'erros comuns {topic}',
                'problemas com {topic}',
                'soluções para {topic}',
                'como resolver {topic}',
                'como evitar {topic}'
            ],
            comparisons: [
                '{topic} vs {alternative}',
                'diferença entre {topic}',
                'qual melhor {topic}',
                'comparação {topic}',
                'vantagens {topic}'
            ],
            specific: [
                '{topic} {year}',
                '{topic} brasil',
                '{topic} português',
                '{topic} grátis',
                '{topic} online'
            ]
        };
        
        // Business/entrepreneurship specific good tags
        this.businessTopicTags = [
            'plano de negócios',
            'modelo de negócio',
            'análise de mercado',
            'estratégia empresarial',
            'gestão de pessoas',
            'liderança empresarial',
            'marketing digital',
            'vendas b2b',
            'vendas b2c',
            'pitch de vendas',
            'captação de clientes',
            'fidelização de clientes',
            'precificação de produtos',
            'margem de lucro',
            'fluxo de caixa',
            'investimento inicial',
            'retorno sobre investimento',
            'métricas de negócio',
            'kpis empresariais',
            'cultura organizacional',
            'inovação empresarial',
            'transformação digital',
            'startup brasil',
            'empreendedorismo digital',
            'negócios online',
            'e-commerce brasil',
            'marketplace brasil',
            'franquias brasil',
            'pequenas empresas',
            'microempreendedor',
            'mei como abrir',
            'impostos empresa',
            'contabilidade empresarial',
            'recursos humanos',
            'recrutamento e seleção',
            'treinamento empresarial',
            'desenvolvimento profissional',
            'networking empresarial',
            'parcerias estratégicas',
            'expansão de negócios',
            'internacionalização'
        ];
    }
    
    /**
     * Initialize YouTube API with authentication
     */
    async initialize() {
        const tokenPath = path.join(process.env.HOME, '.youtube-tokens.json');
        const tokenData = await fs.readFile(tokenPath, 'utf8');
        const tokens = JSON.parse(tokenData);
        
        this.auth = new google.auth.OAuth2();
        this.auth.setCredentials(tokens);
        
        this.youtube = google.youtube({
            version: 'v3',
            auth: this.auth
        });
    }
    
    /**
     * Evaluate if a tag is good for SEO
     */
    isGoodTag(tag) {
        // Remove extra spaces and normalize
        tag = tag.trim().toLowerCase();
        
        // Check if it's a bad tag
        for (const pattern of this.badTagPatterns) {
            if (pattern.test(tag)) {
                return false;
            }
        }
        
        // Good tags should be:
        // 1. At least 2 words (except for brand names)
        const wordCount = tag.split(/\s+/).length;
        if (wordCount < 2 && !tag.includes('resumocast')) {
            return false;
        }
        
        // 2. Not too long (max 5-6 words is ideal)
        if (wordCount > 6) {
            return false;
        }
        
        // 3. Contains searchable terms
        const searchablePatterns = [
            /como\s+(fazer|criar|melhorar|resolver|evitar)/i,
            /dicas?\s+de/i,
            /tutorial/i,
            /passo\s+a\s+passo/i,
            /melhor(es)?\s+práticas?/i,
            /estratégias?\s+de/i,
            /erros?\s+comuns?/i,
            /problemas?\s+com/i,
            /soluções?\s+para/i,
            /guia\s+(completo|definitivo|prático)/i,
            /aprenda?\s+(como|sobre)/i,
            /descubra?\s+(como|os?|as?)/i,
            /\d+\s+(dicas?|passos?|formas?|maneiras?)/i,
            /para\s+iniciantes?/i,
            /avançado/i,
            /profissional/i,
            /grátis/i,
            /online/i,
            /brasil(eiro)?/i,
            /português/i,
            /\d{4}$/i // Year at the end
        ];
        
        // Check if tag contains any searchable pattern
        const hasSearchablePattern = searchablePatterns.some(pattern => pattern.test(tag));
        
        // Business-specific terms are always good
        const hasBusinessTerm = this.businessTopicTags.some(term => 
            tag.includes(term) || term.includes(tag)
        );
        
        return hasSearchablePattern || hasBusinessTerm || wordCount >= 3;
    }
    
    /**
     * Generate smart tag suggestions based on video content
     */
    generateSmartTags(title, existingTags = []) {
        const suggestions = new Set();
        
        // Extract key topics from title
        const topics = this.extractTopics(title);
        
        // Generate tags using templates
        topics.forEach(topic => {
            // How-to tags
            if (!title.toLowerCase().includes('como')) {
                suggestions.add(`como fazer ${topic}`);
                suggestions.add(`tutorial ${topic}`);
            }
            
            // Tips and best practices
            suggestions.add(`dicas de ${topic}`);
            suggestions.add(`${topic} para iniciantes`);
            
            // Year-specific (current year)
            const currentYear = new Date().getFullYear();
            suggestions.add(`${topic} ${currentYear}`);
            
            // Location-specific
            suggestions.add(`${topic} brasil`);
            
            // Problem-solving
            suggestions.add(`erros comuns ${topic}`);
            suggestions.add(`como melhorar ${topic}`);
        });
        
        // Add relevant business tags based on title keywords
        const titleLower = title.toLowerCase();
        this.businessTopicTags.forEach(tag => {
            const tagWords = tag.split(' ');
            const hasRelevance = tagWords.some(word => 
                word.length > 4 && titleLower.includes(word)
            );
            if (hasRelevance) {
                suggestions.add(tag);
            }
        });
        
        // Filter out existing tags and bad tags
        const existingTagsLower = existingTags.map(t => t.toLowerCase());
        const finalSuggestions = Array.from(suggestions)
            .filter(tag => !existingTagsLower.includes(tag.toLowerCase()))
            .filter(tag => this.isGoodTag(tag))
            .slice(0, 15); // YouTube allows up to 500 chars in tags
        
        return finalSuggestions;
    }
    
    /**
     * Extract key topics from title
     */
    extractTopics(title) {
        const topics = [];
        
        // Remove episode numbers and channel name
        let cleanTitle = title
            .replace(/T\d+#\d+/gi, '')
            .replace(/\|.*$/, '')
            .replace(/ResumoCast/gi, '')
            .trim();
        
        // Common business topics to look for
        const topicPatterns = [
            /plano\s+de\s+negócios?/gi,
            /modelo\s+de\s+negócios?/gi,
            /estratégias?\s+de\s+\w+/gi,
            /gestão\s+de\s+\w+/gi,
            /marketing\s+\w*/gi,
            /vendas?\s+\w*/gi,
            /liderança/gi,
            /empreendedorismo/gi,
            /startup/gi,
            /investimento/gi,
            /inovação/gi,
            /negócios?\s+\w*/gi,
            /empresas?/gi,
            /clientes?/gi,
            /mercado/gi,
            /produtos?/gi,
            /serviços?/gi
        ];
        
        topicPatterns.forEach(pattern => {
            const matches = cleanTitle.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (match.length > 3) { // Avoid very short matches
                        topics.push(match.toLowerCase());
                    }
                });
            }
        });
        
        // If no specific topics found, use general title words
        if (topics.length === 0) {
            const words = cleanTitle.split(/\s+/)
                .filter(word => word.length > 4)
                .filter(word => !this.badTagPatterns.some(pattern => pattern.test(word)));
            
            if (words.length > 0) {
                topics.push(words.slice(0, 3).join(' '));
            }
        }
        
        return [...new Set(topics)]; // Remove duplicates
    }
    
    /**
     * Evaluate existing tags and identify which to keep
     */
    evaluateExistingTags(tags) {
        const evaluation = {
            keep: [],
            remove: [],
            score: 0
        };
        
        tags.forEach(tag => {
            if (this.isGoodTag(tag)) {
                evaluation.keep.push(tag);
                evaluation.score += 1;
            } else {
                evaluation.remove.push(tag);
            }
        });
        
        // Calculate quality score (0-10)
        evaluation.qualityScore = Math.min(10, 
            (evaluation.keep.length / Math.max(1, tags.length)) * 10
        );
        
        return evaluation;
    }
    
    /**
     * Create optimized tag set
     */
    createOptimizedTags(title, existingTags = []) {
        // Evaluate existing tags
        const evaluation = this.evaluateExistingTags(existingTags);
        
        // Generate new suggestions
        const newSuggestions = this.generateSmartTags(title, evaluation.keep);
        
        // Combine keeping good existing tags and adding new ones
        const optimizedTags = [
            ...evaluation.keep,
            ...newSuggestions
        ].slice(0, 30); // YouTube best practice: 10-15 tags, max 30
        
        return {
            tags: optimizedTags,
            added: newSuggestions,
            removed: evaluation.remove,
            kept: evaluation.keep,
            qualityScore: evaluation.qualityScore
        };
    }
}

// Export for use in other modules
module.exports = { YouTubeSEOTagger };

// Example usage
if (require.main === module) {
    async function demo() {
        const tagger = new YouTubeSEOTagger();
        
        // Example video title
        const title = "Como Criar um Plano de Negócios Vencedor | T4#025";
        const existingTags = ["brasil", "português", "todos", "plano", "negócios"];
        
        console.log("🎯 YouTube SEO Tag Analysis\n");
        console.log(`Title: ${title}`);
        console.log(`Existing tags: ${existingTags.join(', ')}\n`);
        
        // Evaluate existing tags
        const evaluation = tagger.evaluateExistingTags(existingTags);
        console.log("📊 Existing Tag Evaluation:");
        console.log(`✅ Good tags to keep: ${evaluation.keep.join(', ') || 'none'}`);
        console.log(`❌ Bad tags to remove: ${evaluation.remove.join(', ') || 'none'}`);
        console.log(`📈 Quality score: ${evaluation.qualityScore.toFixed(1)}/10\n`);
        
        // Generate optimized tags
        const optimized = tagger.createOptimizedTags(title, existingTags);
        console.log("🚀 Optimized Tag Set:");
        console.log(`📌 Final tags (${optimized.tags.length}): ${optimized.tags.join(', ')}`);
        console.log(`➕ New tags added: ${optimized.added.join(', ') || 'none'}`);
        console.log(`➖ Tags removed: ${optimized.removed.join(', ') || 'none'}`);
    }
    
    demo().catch(console.error);
}