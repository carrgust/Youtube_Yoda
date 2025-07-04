#!/usr/bin/env node

/**
 * Interactive YouTube Video Optimization Panel
 * Web-based tool for reviewing and applying YouTube metadata optimizations
 */

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const open = require('open');
require('dotenv').config();

const app = express();
const PORT = 8888;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Global variables
let youtube = null;
let auth = null;
let videoData = [];
let processedVideos = new Set();

// Initialize YouTube API
async function initializeAPI() {
  try {
    const TOKEN_PATH = path.join(process.env.HOME || '', '.youtube-tokens.json');
    const tokens = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf-8'));
    
    auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'http://localhost:3000/auth/youtube/callback'
    );
    
    auth.setCredentials(tokens);
    youtube = google.youtube({ version: 'v3', auth: auth });
    
    console.log('✅ YouTube API initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize YouTube API:', error.message);
    console.error('Please run: node authenticate.js');
    return false;
  }
}

// Load video data from channel export
async function loadVideoData() {
  try {
    const videoPath = path.join(__dirname, 'data/channel-export/videos-metadata.json');
    const data = await fs.readFile(videoPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load video data:', error.message);
    return [];
  }
}

// Business-focused SEO tags for ResumoCast
const businessTopicTags = [
  'plano de negócios', 'modelo de negócio', 'análise de mercado',
  'estratégia empresarial', 'gestão de pessoas', 'liderança empresarial',
  'marketing digital', 'vendas b2b', 'vendas b2c', 'pitch de vendas',
  'captação de clientes', 'fidelização de clientes', 'precificação',
  'margem de lucro', 'fluxo de caixa', 'roi retorno investimento',
  'kpis empresariais', 'cultura organizacional', 'inovação empresarial',
  'startup brasil', 'empreendedorismo digital', 'mei como abrir',
  'negócios online', 'transformação digital', 'gestão financeira',
  'canvas modelo negócio', 'mvp produto mínimo', 'growth hacking',
  'networking empresarial', 'mentoria negócios', 'aceleração startups'
];

// Analyze video for optimization opportunities
function analyzeVideo(video) {
  const opportunities = {
    needsOptimization: false,
    reasons: [],
    suggestions: {},
    priority: 0
  };
  
  const title = video.snippet?.title || '';
  const description = video.snippet?.description || '';
  const tags = video.snippet?.tags || [];
  const views = parseInt(video.statistics?.viewCount || 0);
  
  // Skip high-performing videos (>10K views with good optimization)
  if (views > 10000 && tags.length > 10 && description.length > 800) {
    return opportunities;
  }
  
  // Check title optimization
  if (!title.includes('ResumoCast') && !title.includes('| ResumoCast')) {
    opportunities.needsOptimization = true;
    opportunities.reasons.push('Missing ResumoCast branding in title');
    
    // Preserve episode numbers (T4#13, T5#025, etc)
    let suggestedTitle = title;
    if (!title.includes('|')) {
      suggestedTitle = title + ' | ResumoCast';
    }
    opportunities.suggestions.title = suggestedTitle;
  }
  
  // Check description optimization
  const descLower = description.toLowerCase();
  const hasSubscribeCTA = descLower.match(/(inscrev|apoiador|apoie|particip|junte-se|faça parte)/);
  const hasSocialLinks = description.includes('instagram.com') || description.includes('linkedin.com') || 
                        description.includes('twitter.com') || description.includes('site:');
  const hasHashtags = (description.match(/#\w+/g) || []).length >= 3;
  const descriptionLength = description.length;
  
  // Only optimize if truly lacking content
  if (descriptionLength < 300 || (!hasSubscribeCTA && !hasSocialLinks && !hasHashtags)) {
    opportunities.needsOptimization = true;
    
    let enhancedDescription = description;
    
    // Preserve existing content, add missing elements at the end
    if (!hasSubscribeCTA && descriptionLength < 300) {
      enhancedDescription += '\n\n📺 INSCREVA-SE NO CANAL\nSe você gostou deste conteúdo, inscreva-se no ResumoCast e ative as notificações para não perder nenhum episódio!';
      opportunities.reasons.push('Missing subscribe CTA');
    }
    
    if (!hasSocialLinks) {
      enhancedDescription += '\n\n🔗 CONECTE-SE CONOSCO:\n';
      enhancedDescription += '• Instagram: @resumocast\n';
      enhancedDescription += '• LinkedIn: ResumoCast\n';
      enhancedDescription += '• Site: resumocast.com.br';
      opportunities.reasons.push('Missing social media links');
    }
    
    if (!hasHashtags) {
      enhancedDescription += '\n\n#ResumoCast #Empreendedorismo #NegóciosDigitais #EducaçãoEmpresarial #PodcastBrasil';
      opportunities.reasons.push('Missing hashtags');
    }
    
    opportunities.suggestions.description = enhancedDescription.trim();
  }
  
  // Check tag optimization
  if (tags.length < 10) {
    opportunities.needsOptimization = true;
    opportunities.reasons.push(`Only ${tags.length} tags (optimal: 15-20)`);
    
    // Generate smart tags based on video title and existing tags
    const titleLower = title.toLowerCase();
    const suggestedTags = [...new Set(tags)]; // Remove duplicates
    
    // Always include brand tags
    const brandTags = ['resumocast', 'resumocast podcast', 'podcast resumocast'];
    brandTags.forEach(tag => {
      if (!suggestedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
        suggestedTags.push(tag);
      }
    });
    
    // Add relevant business tags based on title content
    businessTopicTags.forEach(tag => {
      if (suggestedTags.length >= 20) return;
      
      const tagWords = tag.split(' ');
      const titleHasRelevance = tagWords.some(word => 
        word.length > 3 && titleLower.includes(word.toLowerCase())
      );
      
      if (titleHasRelevance && !suggestedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
        suggestedTags.push(tag);
      }
    });
    
    // Add year-specific tags if recent
    const currentYear = new Date().getFullYear();
    const yearTags = [`empreendedorismo ${currentYear}`, `negócios ${currentYear}`, `podcast brasil ${currentYear}`];
    yearTags.forEach(tag => {
      if (suggestedTags.length < 20 && !suggestedTags.includes(tag)) {
        suggestedTags.push(tag);
      }
    });
    
    // Add generic but relevant tags to fill up to 15-20
    const genericRelevantTags = [
      'educação empresarial', 'desenvolvimento profissional', 'carreira e negócios',
      'dicas de empreendedorismo', 'casos de sucesso', 'histórias inspiradoras'
    ];
    
    genericRelevantTags.forEach(tag => {
      if (suggestedTags.length < 15 && !suggestedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
        suggestedTags.push(tag);
      }
    });
    
    opportunities.suggestions.tags = suggestedTags.slice(0, 20);
  }
  
  // Calculate priority score (higher = more important)
  const daysSincePublish = (Date.now() - new Date(video.snippet.publishedAt)) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 100 - (daysSincePublish / 3)); // Recent videos get higher priority
  const viewScore = Math.min(100, views / 100); // Popular videos get priority
  const optimizationNeedScore = opportunities.reasons.length * 20;
  
  opportunities.priority = (viewScore + recencyScore + optimizationNeedScore) / 3;
  
  return opportunities;
}

// API Routes
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await loadVideoData();
    const analyzedVideos = [];
    
    for (const video of videos) {
      // Skip if already processed in this session
      if (processedVideos.has(video.id)) continue;
      
      const analysis = analyzeVideo(video);
      
      if (analysis.needsOptimization) {
        analyzedVideos.push({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description || '',
          tags: video.snippet.tags || [],
          thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
          publishedAt: video.snippet.publishedAt,
          viewCount: video.statistics?.viewCount || 0,
          categoryId: video.snippet.categoryId || '27',
          analysis: analysis
        });
      }
    }
    
    // Sort by priority (highest first)
    analyzedVideos.sort((a, b) => b.analysis.priority - a.analysis.priority);
    
    // Return top 50 videos needing optimization
    res.json(analyzedVideos.slice(0, 50));
  } catch (error) {
    console.error('Error loading videos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-video', async (req, res) => {
  try {
    const { videoId, updates } = req.body;
    
    // Mark as processed
    processedVideos.add(videoId);
    
    // Get current video data first
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId]
    });
    
    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const currentVideo = videoResponse.data.items[0];
    const updateData = {
      id: videoId,
      snippet: {
        title: updates.title || currentVideo.snippet.title,
        description: updates.description || currentVideo.snippet.description,
        tags: updates.tags || currentVideo.snippet.tags,
        categoryId: currentVideo.snippet.categoryId
      }
    };
    
    // Apply 3-second rate limit
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Execute update
    const response = await youtube.videos.update({
      part: ['snippet'],
      requestBody: updateData
    });
    
    console.log(`✅ Updated video: ${updates.title || currentVideo.snippet.title}`);
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    youtube: youtube ? 'connected' : 'disconnected',
    processedCount: processedVideos.size
  });
});

// Serve the HTML interface
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ResumoCast - YouTube Optimization Panel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            background: #1a1a1a;
            color: white;
            padding: 1.5rem 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: #ff0000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .stats {
            display: flex;
            gap: 2rem;
            font-size: 0.9rem;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #ff0000;
        }
        
        .container {
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        
        .progress-bar {
            background: white;
            border-radius: 10px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        
        .progress-track {
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff0000, #ff4444);
            transition: width 0.3s ease;
        }
        
        .video-card {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 20px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            opacity: 0;
            animation: fadeIn 0.5s ease forwards;
        }
        
        @keyframes fadeIn {
            to {
                opacity: 1;
            }
        }
        
        .video-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 30px rgba(0,0,0,0.12);
        }
        
        .video-header {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .video-thumbnail {
            width: 200px;
            height: 112px;
            border-radius: 10px;
            object-fit: cover;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .video-info {
            flex: 1;
        }
        
        .video-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
        }
        
        .video-meta {
            display: flex;
            gap: 1rem;
            color: #666;
            font-size: 0.9rem;
        }
        
        .optimization-reasons {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 2rem;
        }
        
        .reason-item {
            color: #856404;
            margin-bottom: 0.3rem;
        }
        
        .comparison-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        @media (max-width: 968px) {
            .comparison-section {
                grid-template-columns: 1fr;
            }
        }
        
        .comparison-panel {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 1.5rem;
            position: relative;
        }
        
        .comparison-header {
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .current-header {
            color: #666;
        }
        
        .proposed-header {
            color: #28a745;
        }
        
        .field-group {
            margin-bottom: 1.5rem;
        }
        
        .field-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #555;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .field-content {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 0.75rem;
            font-size: 0.95rem;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .field-content.editable {
            border: 2px solid #28a745;
            background: #f0fff4;
        }
        
        textarea.field-content {
            width: 100%;
            resize: vertical;
            font-family: inherit;
            min-height: 100px;
        }
        
        .tags-display {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .tag {
            background: #e9ecef;
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            font-size: 0.85rem;
            color: #495057;
        }
        
        .tag.new {
            background: #d4edda;
            color: #155724;
            font-weight: 500;
            border: 1px solid #c3e6cb;
        }
        
        .action-buttons {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }
        
        .btn {
            padding: 0.75rem 2rem;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .btn-approve {
            background: #28a745;
            color: white;
        }
        
        .btn-approve:hover:not(:disabled) {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .btn-skip {
            background: #6c757d;
            color: white;
        }
        
        .btn-skip:hover:not(:disabled) {
            background: #5a6268;
        }
        
        .btn-edit {
            background: #007bff;
            color: white;
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
        }
        
        .btn-edit:hover {
            background: #0056b3;
        }
        
        .loading {
            text-align: center;
            padding: 4rem 0;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #ff0000;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .empty-state {
            text-align: center;
            padding: 4rem 0;
            color: #666;
        }
        
        .empty-state h3 {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 1rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            display: none;
            animation: slideDown 0.3s ease;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            display: none;
            animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .priority-badge {
            background: #ff0000;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .edit-mode {
            background: #f0f8ff;
            border: 2px dashed #007bff;
            padding: 1rem;
            border-radius: 5px;
            margin-top: 1rem;
        }
        
        .tag-editor {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 0.5rem;
            background: white;
            border: 2px solid #28a745;
            border-radius: 5px;
            min-height: 60px;
        }
        
        .tag-editor .tag {
            cursor: pointer;
            position: relative;
        }
        
        .tag-editor .tag:hover {
            background: #dc3545;
            color: white;
        }
        
        .tag-input {
            flex: 1;
            min-width: 200px;
            border: none;
            outline: none;
            padding: 0.25rem;
            font-size: 0.9rem;
        }
        
        .char-count {
            text-align: right;
            font-size: 0.8rem;
            color: #666;
            margin-top: 0.3rem;
        }
        
        .char-count.warning {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">
                <span>🎬</span>
                <span>ResumoCast Optimization Panel</span>
            </div>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value" id="totalVideos">0</div>
                    <div>Videos to Optimize</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="completed">0</div>
                    <div>Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="skipped">0</div>
                    <div>Skipped</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="container">
        <div class="progress-bar">
            <div class="progress-header">
                <h3>Optimization Progress</h3>
                <span id="progressText">0%</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
        </div>
        
        <div id="messageArea"></div>
        
        <div id="videoList">
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading videos for optimization...</p>
            </div>
        </div>
    </div>
    
    <script>
        let videos = [];
        let currentIndex = 0;
        let stats = {
            total: 0,
            completed: 0,
            skipped: 0
        };
        let isEditing = false;
        
        // Load videos on page load
        document.addEventListener('DOMContentLoaded', loadVideos);
        
        async function loadVideos() {
            try {
                const response = await fetch('/api/videos');
                if (!response.ok) throw new Error('Failed to fetch videos');
                
                videos = await response.json();
                stats.total = videos.length;
                updateStats();
                
                if (videos.length > 0) {
                    displayVideo(0);
                } else {
                    document.getElementById('videoList').innerHTML = 
                        '<div class="empty-state"><h3>🎉 All videos are well optimized!</h3><p>No optimization opportunities found.</p></div>';
                }
            } catch (error) {
                showError('Failed to load videos: ' + error.message);
            }
        }
        
        function displayVideo(index) {
            if (index >= videos.length) {
                document.getElementById('videoList').innerHTML = 
                    '<div class="empty-state"><h3>✅ Optimization Complete!</h3><p>All videos have been processed.</p></div>';
                return;
            }
            
            const video = videos[index];
            const currentTags = video.tags || [];
            const proposedTags = video.analysis.suggestions.tags || currentTags;
            const newTags = proposedTags.filter(tag => !currentTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
            
            const html = \`
                <div class="video-card" id="video-\${video.id}">
                    <div class="video-header">
                        <img src="\${video.thumbnail}" alt="Thumbnail" class="video-thumbnail">
                        <div class="video-info">
                            <h3 class="video-title">\${escapeHtml(video.title)}</h3>
                            <div class="video-meta">
                                <span>👁 \${Number(video.viewCount).toLocaleString()} views</span>
                                <span>📅 \${new Date(video.publishedAt).toLocaleDateString('pt-BR')}</span>
                                <span class="priority-badge">Priority: \${Math.round(video.analysis.priority)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="optimization-reasons">
                        <strong>🔍 Optimization Opportunities:</strong>
                        \${video.analysis.reasons.map(reason => \`<div class="reason-item">• \${reason}</div>\`).join('')}
                    </div>
                    
                    <div class="comparison-section">
                        <div class="comparison-panel">
                            <h4 class="comparison-header current-header">📝 Current</h4>
                            
                            <div class="field-group">
                                <div class="field-label">Title</div>
                                <div class="field-content">\${escapeHtml(video.title)}</div>
                            </div>
                            
                            <div class="field-group">
                                <div class="field-label">Description (\${video.description?.length || 0} chars)</div>
                                <div class="field-content">\${escapeHtml(video.description || 'No description')}</div>
                            </div>
                            
                            <div class="field-group">
                                <div class="field-label">Tags (\${currentTags.length})</div>
                                <div class="field-content">
                                    <div class="tags-display">
                                        \${currentTags.length > 0 ? 
                                          currentTags.map(tag => \`<span class="tag">\${escapeHtml(tag)}</span>\`).join('') :
                                          '<span style="color: #999;">No tags</span>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="comparison-panel">
                            <h4 class="comparison-header proposed-header">✨ Proposed Changes</h4>
                            
                            <div class="field-group">
                                <div class="field-label">Title</div>
                                <textarea class="field-content editable" id="title-\${video.id}" maxlength="100">\${escapeHtml(video.analysis.suggestions.title || video.title)}</textarea>
                                <div class="char-count" id="title-count-\${video.id}"></div>
                            </div>
                            
                            <div class="field-group">
                                <div class="field-label">Description</div>
                                <textarea class="field-content editable" id="description-\${video.id}" style="min-height: 150px;" maxlength="5000">\${escapeHtml(video.analysis.suggestions.description || video.description)}</textarea>
                                <div class="char-count" id="desc-count-\${video.id}"></div>
                            </div>
                            
                            <div class="field-group">
                                <div class="field-label">Tags (\${proposedTags.length})</div>
                                <div class="field-content editable" id="tags-container-\${video.id}">
                                    <div class="tags-display" id="tags-display-\${video.id}">
                                        \${proposedTags.map((tag, i) => \`<span class="tag \${newTags.includes(tag) ? 'new' : ''}">\${escapeHtml(tag)}</span>\`).join('')}
                                    </div>
                                    <button class="btn btn-edit" onclick="editTags('\${video.id}')">Edit Tags</button>
                                    <input type="hidden" id="tags-\${video.id}" value="\${escapeHtml(JSON.stringify(proposedTags))}">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-skip" onclick="skipVideo('\${video.id}')">⏭ Skip</button>
                        <button class="btn btn-approve" onclick="approveChanges('\${video.id}')" id="approve-\${video.id}">✅ Approve & Update</button>
                    </div>
                </div>
            \`;
            
            document.getElementById('videoList').innerHTML = html;
            
            // Add character count listeners
            setupCharacterCounters(video.id);
        }
        
        function setupCharacterCounters(videoId) {
            const titleInput = document.getElementById(\`title-\${videoId}\`);
            const descInput = document.getElementById(\`description-\${videoId}\`);
            
            function updateCount(input, counterId, max) {
                const count = input.value.length;
                const counter = document.getElementById(counterId);
                counter.textContent = \`\${count}/\${max}\`;
                counter.classList.toggle('warning', count > max * 0.9);
            }
            
            titleInput.addEventListener('input', () => updateCount(titleInput, \`title-count-\${videoId}\`, 100));
            descInput.addEventListener('input', () => updateCount(descInput, \`desc-count-\${videoId}\`, 5000));
            
            // Initial count
            updateCount(titleInput, \`title-count-\${videoId}\`, 100);
            updateCount(descInput, \`desc-count-\${videoId}\`, 5000);
        }
        
        function editTags(videoId) {
            const container = document.getElementById(\`tags-container-\${videoId}\`);
            const currentTags = JSON.parse(document.getElementById(\`tags-\${videoId}\`).value);
            
            container.innerHTML = \`
                <div class="edit-mode">
                    <p style="margin-bottom: 0.5rem; font-size: 0.9rem;">Click tags to remove, press Enter to add new tags:</p>
                    <div class="tag-editor" id="tag-editor-\${videoId}">
                        \${currentTags.map(tag => \`<span class="tag" onclick="removeTag('\${videoId}', '\${escapeHtml(tag)}')">\${escapeHtml(tag)}</span>\`).join('')}
                        <input type="text" class="tag-input" id="tag-input-\${videoId}" placeholder="Add new tag..." onkeypress="handleTagInput(event, '\${videoId}')">
                    </div>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-approve" onclick="saveTags('\${videoId}')" style="padding: 0.5rem 1rem;">Save Tags</button>
                        <button class="btn btn-skip" onclick="cancelTagEdit('\${videoId}')" style="padding: 0.5rem 1rem;">Cancel</button>
                    </div>
                </div>
            \`;
            
            document.getElementById(\`tag-input-\${videoId}\`).focus();
        }
        
        function removeTag(videoId, tagToRemove) {
            const tags = JSON.parse(document.getElementById(\`tags-\${videoId}\`).value);
            const newTags = tags.filter(tag => tag !== tagToRemove);
            document.getElementById(\`tags-\${videoId}\`).value = JSON.stringify(newTags);
            editTags(videoId); // Refresh the editor
        }
        
        function handleTagInput(event, videoId) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const input = event.target;
                const newTag = input.value.trim();
                
                if (newTag) {
                    const tags = JSON.parse(document.getElementById(\`tags-\${videoId}\`).value);
                    if (!tags.map(t => t.toLowerCase()).includes(newTag.toLowerCase())) {
                        tags.push(newTag);
                        document.getElementById(\`tags-\${videoId}\`).value = JSON.stringify(tags);
                        input.value = '';
                        editTags(videoId); // Refresh the editor
                    }
                }
            }
        }
        
        function saveTags(videoId) {
            const video = videos[currentIndex];
            displayVideo(currentIndex); // Refresh display with new tags
        }
        
        function cancelTagEdit(videoId) {
            const video = videos[currentIndex];
            // Reset to original suggested tags
            document.getElementById(\`tags-\${videoId}\`).value = JSON.stringify(video.analysis.suggestions.tags || video.tags);
            displayVideo(currentIndex);
        }
        
        async function approveChanges(videoId) {
            const video = videos[currentIndex];
            const btn = document.getElementById(\`approve-\${videoId}\`);
            
            // Get edited values
            const updates = {
                title: document.getElementById(\`title-\${videoId}\`).value.trim(),
                description: document.getElementById(\`description-\${videoId}\`).value.trim(),
                tags: JSON.parse(document.getElementById(\`tags-\${videoId}\`).value)
            };
            
            // Check if there are actual changes
            const hasChanges = 
                updates.title !== video.title ||
                updates.description !== video.description ||
                JSON.stringify(updates.tags) !== JSON.stringify(video.tags);
            
            if (!hasChanges) {
                showMessage('No changes detected. Skipping...', 'warning');
                skipVideo(videoId);
                return;
            }
            
            // Show loading state
            btn.disabled = true;
            btn.innerHTML = '⏳ Updating...';
            
            try {
                const response = await fetch('/api/update-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId, updates })
                });
                
                if (response.ok) {
                    stats.completed++;
                    updateStats();
                    showMessage('✅ Video updated successfully!', 'success');
                    
                    // Move to next video after a short delay
                    setTimeout(() => {
                        currentIndex++;
                        displayVideo(currentIndex);
                    }, 1500);
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Update failed');
                }
            } catch (error) {
                showError('Failed to update video: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = '✅ Approve & Update';
            }
        }
        
        function skipVideo(videoId) {
            stats.skipped++;
            updateStats();
            showMessage('Video skipped', 'info');
            
            currentIndex++;
            displayVideo(currentIndex);
        }
        
        function updateStats() {
            document.getElementById('totalVideos').textContent = stats.total;
            document.getElementById('completed').textContent = stats.completed;
            document.getElementById('skipped').textContent = stats.skipped;
            
            const progress = stats.total > 0 ? 
                ((stats.completed + stats.skipped) / stats.total * 100) : 0;
            
            document.getElementById('progressText').textContent = Math.round(progress) + '%';
            document.getElementById('progressFill').style.width = progress + '%';
        }
        
        function showMessage(message, type) {
            const messageArea = document.getElementById('messageArea');
            const className = type === 'success' ? 'success-message' : 
                            type === 'error' ? 'error-message' : 'success-message';
            
            messageArea.innerHTML = \`<div class="\${className}" style="display: block;">\${message}</div>\`;
            
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 4000);
        }
        
        function showError(message) {
            showMessage(message, 'error');
        }
        
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return (text || '').toString().replace(/[&<>"']/g, m => map[m]);
        }
    </script>
</body>
</html>
    `);
});

// Start server
async function start() {
    console.log('🚀 Starting YouTube Optimization Panel...\n');
    
    // Check authentication first
    if (!(await initializeAPI())) {
        console.error('Failed to initialize YouTube API. Please ensure you are authenticated.');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`✅ Optimization Panel running at http://localhost:${PORT}`);
        console.log('📊 Opening in browser...\n');
        console.log('Instructions:');
        console.log('1. Review each video optimization opportunity');
        console.log('2. Edit the proposed changes if needed');
        console.log('3. Click "Approve & Update" to apply changes via YouTube API');
        console.log('4. Or click "Skip" to move to the next video\n');
        
        open(`http://localhost:${PORT}`);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down optimization panel...');
    process.exit(0);
});

// Start the application
start();