#!/usr/bin/env node

/**
 * Smart Optimization Panel with YouTube SEO Intelligence
 * Only suggests improvements that actually help
 */

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const open = require('open');
require('dotenv').config();

const app = express();
const PORT = 3333;

app.use(express.json());

let optimizationQueue = [];
let currentIndex = 0;
let youtube = null;
let auth = null;

// YouTube SEO Intelligence
const SEO_KNOWLEDGE = {
  tags: {
    optimal: { min: 15, max: 30 },
    types: {
      primary: 'Exact match of main search term',
      variations: 'Different ways to say the same thing',
      longTail: '3-4 word specific phrases',
      brand: 'Channel name, series name',
      category: 'Broad topic areas',
      language: 'português, brasil, etc.'
    }
  },
  title: {
    optimalLength: { min: 60, max: 70 },
    structure: '[Hook/Keyword] - [Benefit] | [Brand]'
  },
  description: {
    firstLineChars: 125,
    minLength: 500,
    optimalLength: 1500
  }
};

async function initializeAPI() {
  try {
    const tokens = JSON.parse(await fs.readFile(process.env.HOME + '/.youtube-tokens.json', 'utf-8'));
    
    auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'http://localhost:3000/auth/youtube/callback'
    );
    
    auth.setCredentials(tokens);
    youtube = google.youtube({ version: 'v3', auth: auth });
    
    console.log('✅ YouTube API initialized with SEO intelligence');
    return true;
  } catch (error) {
    console.error('❌ API initialization failed:', error.message);
    return false;
  }
}

async function analyzeVideos() {
  try {
    const videosData = await fs.readFile(
      path.join(__dirname, 'data', 'channel-export', 'videos-metadata.json'),
      'utf-8'
    );
    const allVideos = JSON.parse(videosData);
    
    console.log(`📊 Analyzing ${allVideos.length} videos with YouTube SEO intelligence...\n`);
    
    const opportunities = [];
    
    for (const video of allVideos) {
      const titleOpts = analyzeTitleSmart(video);
      const tagOpts = analyzeTagsSmart(video);
      const descOpts = analyzeDescriptionSmart(video);
      
      opportunities.push(...titleOpts, ...tagOpts, ...descOpts);
    }
    
    // Sort by priority and views
    opportunities.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.views - a.views;
    });
    
    return opportunities;
  } catch (error) {
    console.error('Error analyzing videos:', error);
    return [];
  }
}

function analyzeTitleSmart(video) {
  const opportunities = [];
  const title = video.snippet.title;
  const views = parseInt(video.statistics.viewCount || 0);
  
  // High-performing videos are likely already optimized
  if (views > 50000) {
    return opportunities;
  }
  
  // Check if title already follows SEO best practices
  const hasGoodStructure = title.includes('-') || title.includes('|');
  const hasResumoCast = title.toLowerCase().includes('resumocast');
  const titleLength = title.length;
  
  // Only suggest if truly needed
  if (!hasResumoCast && titleLength < 100) {
    const startEpisodeMatch = title.match(/^(T\d+#\d+)\s+(.+)/);
    const endEpisodeMatch = title.match(/(.+)\s*\|\s*(T\d+#\d+)$/);
    
    let suggestedTitle = title;
    
    if (startEpisodeMatch) {
      const [, episode, restOfTitle] = startEpisodeMatch;
      suggestedTitle = `${episode} ${restOfTitle.replace(/\|.*$/, '').trim()} | ResumoCast`;
    } else if (endEpisodeMatch) {
      const [, titlePart, episode] = endEpisodeMatch;
      suggestedTitle = `${titlePart.trim()} | ${episode} | ResumoCast`;
    } else {
      if (title.includes('|')) {
        suggestedTitle = title.replace(/\|.*$/, '').trim() + ' | ResumoCast';
      } else {
        suggestedTitle = `${title} | ResumoCast`;
      }
    }
    
    opportunities.push({
      type: 'title',
      videoId: video.id,
      current: title,
      proposed: suggestedTitle,
      views: views,
      priority: views > 10000 ? 'HIGH' : views > 5000 ? 'MEDIUM' : 'LOW',
      reasons: ['Missing ResumoCast branding'],
      currentContent: title,
      improvement: 'Adding brand consistency'
    });
  }
  
  return opportunities;
}

function analyzeTagsSmart(video) {
  const opportunities = [];
  const currentTags = video.snippet.tags || [];
  const views = parseInt(video.statistics.viewCount || 0);
  const title = video.snippet.title;
  
  // Evaluate current tag quality
  const tagQuality = evaluateTagQuality(currentTags, title);
  
  // Skip if tags are already excellent
  if (tagQuality.score >= 8 && currentTags.length >= 15) {
    return opportunities;
  }
  
  // Only suggest improvements if really needed
  const issues = [];
  const missingTypes = [];
  
  if (currentTags.length === 0) {
    issues.push('No tags at all - critical SEO issue');
  } else {
    if (!tagQuality.hasPrimaryKeyword) {
      missingTypes.push('primary keyword variations');
    }
    if (!tagQuality.hasBrandTag && !currentTags.some(t => t.toLowerCase().includes('resumocast'))) {
      missingTypes.push('ResumoCast brand tag');
    }
    if (!tagQuality.hasLanguageTag) {
      missingTypes.push('Portuguese/Brazil tags');
    }
    if (currentTags.length < 10) {
      missingTypes.push('more specific variations');
    }
  }
  
  // Only create opportunity if we have real improvements
  if (issues.length > 0 || missingTypes.length > 0) {
    const enhancedTags = enhanceExistingTags(currentTags, title, video.snippet.description);
    
    // Only suggest if we're actually adding value
    if (enhancedTags.length > currentTags.length || missingTypes.length > 0) {
      opportunities.push({
        type: 'tags',
        videoId: video.id,
        title: title,
        current: currentTags,
        proposed: enhancedTags,
        views: views,
        priority: currentTags.length === 0 ? 'HIGH' : missingTypes.length > 2 ? 'MEDIUM' : 'LOW',
        reasons: issues.length > 0 ? issues : [`Missing: ${missingTypes.join(', ')}`],
        currentContent: currentTags.join(', '),
        improvement: `Adding ${enhancedTags.length - currentTags.length} missing tag types`,
        quality: {
          before: tagQuality.score,
          after: 'Improved coverage'
        }
      });
    }
  }
  
  return opportunities;
}

function evaluateTagQuality(tags, title) {
  const titleWords = title.toLowerCase().split(/\s+/);
  const tagString = tags.join(' ').toLowerCase();
  
  const quality = {
    score: 0,
    hasPrimaryKeyword: false,
    hasVariations: false,
    hasLongTail: false,
    hasBrandTag: false,
    hasLanguageTag: false,
    hasCategoryTags: false
  };
  
  // Check for primary keyword (words from title)
  quality.hasPrimaryKeyword = titleWords.some(word => 
    word.length > 3 && tags.some(tag => tag.toLowerCase().includes(word))
  );
  if (quality.hasPrimaryKeyword) quality.score += 2;
  
  // Check for variations
  quality.hasVariations = tags.length > 10;
  if (quality.hasVariations) quality.score += 2;
  
  // Check for long-tail keywords (3+ words)
  quality.hasLongTail = tags.some(tag => tag.split(' ').length >= 3);
  if (quality.hasLongTail) quality.score += 2;
  
  // Check for language tags
  quality.hasLanguageTag = tags.some(tag => 
    tag.toLowerCase().includes('português') || 
    tag.toLowerCase().includes('brasil') ||
    tag.toLowerCase().includes('pt-br')
  );
  if (quality.hasLanguageTag) quality.score += 1;
  
  // Check tag diversity
  if (tags.length >= 15) quality.score += 2;
  if (tags.length >= 20) quality.score += 1;
  
  return quality;
}

function enhanceExistingTags(currentTags, title, description = '') {
  // Start with existing tags (they're probably good!)
  const enhancedTags = new Set(currentTags.map(t => t.toLowerCase()));
  
  // Only add what's truly missing
  
  // Add ResumoCast if missing
  if (!Array.from(enhancedTags).some(t => t.includes('resumocast'))) {
    enhancedTags.add('resumocast');
  }
  
  // Add language tags if missing
  const hasPortuguese = Array.from(enhancedTags).some(t => 
    t.includes('português') || t.includes('portugues')
  );
  if (!hasPortuguese) {
    enhancedTags.add('português');
    enhancedTags.add('brasil');
  }
  
  // Add year if missing
  const currentYear = new Date().getFullYear().toString();
  if (!Array.from(enhancedTags).some(t => t.includes(currentYear))) {
    enhancedTags.add(currentYear);
  }
  
  // Add "resumo de livros" if it's a book summary
  if (title.toLowerCase().includes('livro') || title.toLowerCase().includes('resumo')) {
    if (!Array.from(enhancedTags).some(t => t.includes('resumo de livros'))) {
      enhancedTags.add('resumo de livros');
    }
  }
  
  // Convert back to array and limit to 30
  return Array.from(enhancedTags).slice(0, 30);
}

function analyzeDescriptionSmart(video) {
  const opportunities = [];
  const description = video.snippet.description || '';
  const views = parseInt(video.statistics.viewCount || 0);
  const title = video.snippet.title;
  
  // Evaluate current description quality
  const quality = evaluateDescriptionQuality(description);
  
  // Skip if already excellent
  if (quality.score >= 8) {
    return opportunities;
  }
  
  const issues = [];
  
  if (description.length === 0) {
    issues.push('No description - critical SEO issue');
  } else {
    if (!quality.hasGoodFirstLine) {
      issues.push('First 125 chars need optimization');
    }
    if (!quality.hasCTA) {
      issues.push('Missing clear call-to-action');
    }
    if (!quality.hasStructure && description.length < 500) {
      issues.push('Needs better structure and length');
    }
  }
  
  if (issues.length > 0) {
    const enhancedDescription = enhanceDescription(video, quality);
    
    opportunities.push({
      type: 'description',
      videoId: video.id,
      title: title,
      currentLength: description.length,
      current: description,
      proposed: enhancedDescription,
      views: views,
      priority: description.length === 0 ? 'HIGH' : issues.length >= 2 ? 'MEDIUM' : 'LOW',
      reasons: issues,
      currentContent: description,
      improvement: 'Enhancing for better SEO and engagement',
      quality: {
        before: quality.score,
        after: 'Optimized structure'
      }
    });
  }
  
  return opportunities;
}

function evaluateDescriptionQuality(description) {
  const quality = {
    score: 0,
    hasGoodFirstLine: false,
    hasCTA: false,
    hasLinks: false,
    hasHashtags: false,
    hasStructure: false,
    hasTimestamps: false
  };
  
  const firstLine = description.substring(0, 125).toLowerCase();
  
  // Check first line quality
  quality.hasGoodFirstLine = firstLine.length > 50 && 
    (firstLine.includes('neste') || firstLine.includes('aprenda') || firstLine.includes('descubra'));
  if (quality.hasGoodFirstLine) quality.score += 2;
  
  // Check for CTAs
  quality.hasCTA = description.toLowerCase().match(/(inscrev|apoiador|apoie|particip|junte|faça parte|clique|baixe)/);
  if (quality.hasCTA) quality.score += 2;
  
  // Check for links
  quality.hasLinks = description.includes('http');
  if (quality.hasLinks) quality.score += 1;
  
  // Check for hashtags
  quality.hasHashtags = description.includes('#');
  if (quality.hasHashtags) quality.score += 1;
  
  // Check for structure
  quality.hasStructure = description.includes('🎯') || description.includes('•') || description.includes('→');
  if (quality.hasStructure) quality.score += 2;
  
  // Check for timestamps
  quality.hasTimestamps = description.match(/\d{1,2}:\d{2}/);
  if (quality.hasTimestamps) quality.score += 1;
  
  // Length bonus
  if (description.length > 500) quality.score += 1;
  if (description.length > 1000) quality.score += 1;
  
  return quality;
}

function enhanceDescription(video, currentQuality) {
  const currentDesc = video.snippet.description || '';
  const title = video.snippet.title;
  
  // If description is already good, just add missing elements
  if (currentDesc.length > 800 && currentQuality.score >= 6) {
    let enhanced = currentDesc;
    
    if (!currentQuality.hasHashtags) {
      enhanced += '\n\n#ResumoCast #ResumosDeLivros #DesenvolvimentoPessoal';
    }
    
    if (!currentQuality.hasCTA) {
      enhanced += '\n\n🔔 INSCREVA-SE para mais conteúdo!';
    }
    
    return enhanced;
  }
  
  // For poor descriptions, create optimized structure
  // But preserve any existing valuable content
  const existingTimestamps = currentDesc.match(/\d{1,2}:\d{2}.*/g);
  const existingLinks = currentDesc.match(/https?:\/\/[^\s]+/g);
  
  let optimizedDesc = `📚 ${title}

${currentDesc.substring(0, 200)}${currentDesc.length > 200 ? '...' : ''}

🎯 DESTAQUES DO VÍDEO:
• Principais conceitos explicados
• Aplicações práticas
• Insights valiosos

${existingTimestamps ? existingTimestamps.join('\n') : ''}

💡 SOBRE O RESUMOCAST:
Canal especializado em resumos de livros de negócios e desenvolvimento pessoal.

🔔 INSCREVA-SE e ative as notificações
👍 Deixe seu LIKE se gostou
💬 COMENTE sua opinião

${existingLinks ? '🔗 Links mencionados:\n' + existingLinks.join('\n') : ''}

#ResumoCast #ResumosDeLivros #DesenvolvimentoPessoal`;

  return optimizedDesc.trim();
}

// API Routes
app.get('/api/current', (req, res) => {
  if (currentIndex >= optimizationQueue.length) {
    return res.json({ done: true });
  }
  
  const current = optimizationQueue[currentIndex];
  res.json({
    current: current,
    index: currentIndex + 1,
    total: optimizationQueue.length,
    progress: Math.round((currentIndex / optimizationQueue.length) * 100)
  });
});

app.post('/api/approve', async (req, res) => {
  const optimization = optimizationQueue[currentIndex];
  
  try {
    if (optimization.type === 'title') {
      const video = await youtube.videos.list({
        part: ['snippet'],
        id: [optimization.videoId]
      });
      
      if (video.data.items.length > 0) {
        await youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: optimization.videoId,
            snippet: {
              ...video.data.items[0].snippet,
              title: optimization.proposed,
              categoryId: video.data.items[0].snippet.categoryId
            }
          }
        });
      }
    } else if (optimization.type === 'tags') {
      const video = await youtube.videos.list({
        part: ['snippet'],
        id: [optimization.videoId]
      });
      
      if (video.data.items.length > 0) {
        await youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: optimization.videoId,
            snippet: {
              ...video.data.items[0].snippet,
              tags: optimization.proposed,
              categoryId: video.data.items[0].snippet.categoryId
            }
          }
        });
      }
    } else if (optimization.type === 'description') {
      const video = await youtube.videos.list({
        part: ['snippet'],
        id: [optimization.videoId]
      });
      
      if (video.data.items.length > 0) {
        await youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: optimization.videoId,
            snippet: {
              ...video.data.items[0].snippet,
              description: optimization.proposed,
              categoryId: video.data.items[0].snippet.categoryId
            }
          }
        });
      }
    }
    
    optimization.status = 'approved';
    currentIndex++;
    res.json({ success: true });
  } catch (error) {
    console.error('Error applying optimization:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/skip', (req, res) => {
  optimizationQueue[currentIndex].status = 'skipped';
  currentIndex++;
  res.json({ success: true });
});

app.post('/api/edit', async (req, res) => {
  const { newValue } = req.body;
  optimizationQueue[currentIndex].proposed = newValue;
  optimizationQueue[currentIndex].edited = true;
  res.json({ success: true });
});

// Enhanced HTML interface
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart YouTube Optimization Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            height: 100vh;
            overflow: hidden;
        }
        .container {
            display: flex;
            height: calc(100vh - 80px);
        }
        .panel {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
            border-right: 1px solid #333;
        }
        .panel:last-child { border-right: none; }
        .header {
            position: sticky;
            top: 0;
            background: #1a1a1a;
            padding-bottom: 1rem;
            border-bottom: 1px solid #333;
            margin-bottom: 1rem;
            z-index: 10;
        }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        h2 { 
            font-size: 1.2rem; 
            margin-bottom: 1rem;
            color: #888;
        }
        .progress-bar {
            width: 100%;
            height: 4px;
            background: #333;
            border-radius: 2px;
            overflow: hidden;
            margin: 1rem 0;
        }
        .progress-fill {
            height: 100%;
            background: #4CAF50;
            transition: width 0.3s ease;
        }
        .status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            background: #252525;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        .priority {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        .priority.HIGH { background: #f44336; }
        .priority.MEDIUM { background: #ff9800; }
        .priority.LOW { background: #4CAF50; }
        .content-box {
            background: #252525;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            border: 1px solid #333;
        }
        .current { border-left: 4px solid #f44336; }
        .proposed { border-left: 4px solid #4CAF50; }
        .current-content {
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 4px;
            margin-top: 1rem;
            border: 1px solid #444;
            max-height: 300px;
            overflow-y: auto;
        }
        .editable {
            width: 100%;
            background: #1a1a1a;
            color: #e0e0e0;
            border: 1px solid #444;
            padding: 0.75rem;
            border-radius: 4px;
            font-family: inherit;
            resize: vertical;
            min-height: 100px;
        }
        .actions {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1a1a1a;
            border-top: 1px solid #333;
            padding: 1rem 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
            z-index: 20;
        }
        button {
            padding: 0.75rem 2rem;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        button:hover { transform: translateY(-1px); }
        .approve { background: #4CAF50; color: white; }
        .skip { background: #666; color: white; }
        .edit { background: #2196F3; color: white; }
        .loading { opacity: 0.5; pointer-events: none; }
        .reasons {
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: #888;
        }
        .video-meta {
            display: flex;
            gap: 1rem;
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: #666;
        }
        .improvement-note {
            background: #2196F3;
            color: white;
            padding: 0.75rem;
            border-radius: 4px;
            margin: 1rem 0;
            font-size: 0.9rem;
        }
        .quality-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            font-size: 0.9rem;
        }
        .quality-score {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-weight: bold;
        }
        .quality-score.low { background: #f44336; }
        .quality-score.medium { background: #ff9800; }
        .quality-score.high { background: #4CAF50; }
        .complete {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
        }
        .complete h1 { font-size: 3rem; margin-bottom: 1rem; }
        .tag { 
            display: inline-block;
            background: #333;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            margin: 0.25rem;
            font-size: 0.9rem;
        }
        .tag.new {
            background: #4CAF50;
            color: #000;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
        }
        .content-preview {
            font-size: 0.9rem;
            line-height: 1.5;
            color: #ccc;
        }
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
        let currentOptimization = null;
        let isEditing = false;

        async function loadCurrent() {
            try {
                const response = await fetch('/api/current');
                const data = await response.json();
                
                if (data.done) {
                    showComplete();
                    return;
                }
                
                currentOptimization = data.current;
                renderOptimization(data);
            } catch (error) {
                console.error('Error loading:', error);
            }
        }

        function renderOptimization(data) {
            const { current, index, total, progress } = data;
            
            let currentContent = '';
            let proposedContent = '';
            
            if (current.type === 'title') {
                currentContent = \`
                    <h3>Current Title</h3>
                    <div class="current-content">
                        <pre>\${current.current}</pre>
                    </div>
                \`;
                proposedContent = \`
                    <h3>Proposed Title</h3>
                    <div class="current-content">
                        <pre id="proposed-value">\${current.proposed}</pre>
                    </div>
                \`;
            } else if (current.type === 'tags') {
                const currentTagsSet = new Set(current.current.map(t => t.toLowerCase()));
                const proposedTags = current.proposed.map(tag => {
                    const isNew = !currentTagsSet.has(tag.toLowerCase());
                    return \`<span class="tag \${isNew ? 'new' : ''}">\${tag}</span>\`;
                });
                
                currentContent = \`
                    <h3>Current Tags (\${current.current.length})</h3>
                    <div class="current-content">
                        \${current.current.length > 0 ? 
                            current.current.map(tag => \`<span class="tag">\${tag}</span>\`).join('') :
                            '<em style="color: #666;">No tags</em>'
                        }
                    </div>
                \`;
                proposedContent = \`
                    <h3>Proposed Tags (\${current.proposed.length})</h3>
                    <div class="current-content" id="proposed-value">
                        \${proposedTags.join('')}
                    </div>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #4CAF50;">
                        ✅ Keeping all existing tags, adding \${current.proposed.length - current.current.length} new ones
                    </p>
                \`;
            } else if (current.type === 'description') {
                currentContent = \`
                    <h3>Current Description (\${current.currentLength} chars)</h3>
                    <div class="current-content">
                        <pre class="content-preview">\${current.currentContent || 'No description'}</pre>
                    </div>
                \`;
                proposedContent = \`
                    <h3>Proposed Description</h3>
                    <div class="current-content">
                        <pre id="proposed-value" class="content-preview">\${current.proposed}</pre>
                    </div>
                \`;
            }
            
            document.getElementById('app').innerHTML = \`
                <div class="container">
                    <div class="panel">
                        <div class="header">
                            <h1>Current State</h1>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: \${progress}%"></div>
                            </div>
                            <div class="status">
                                <span>Optimization \${index} of \${total}</span>
                                <span class="priority \${current.priority}">\${current.priority} PRIORITY</span>
                            </div>
                        </div>
                        <div class="content-box current">
                            <h2>\${current.title || 'Video'}</h2>
                            <div class="video-meta">
                                <span>📊 Views: \${current.views.toLocaleString()}</span>
                                <span>🎯 Type: \${current.type.toUpperCase()}</span>
                            </div>
                            <div class="reasons">
                                <strong>Issues found:</strong> \${current.reasons.join(', ')}
                            </div>
                            \${current.quality ? \`
                                <div class="quality-indicator">
                                    <span>Quality Score:</span>
                                    <span class="quality-score \${current.quality.before < 5 ? 'low' : current.quality.before < 8 ? 'medium' : 'high'}">
                                        \${current.quality.before}/10
                                    </span>
                                </div>
                            \` : ''}
                            <hr style="margin: 1rem 0; border: none; border-top: 1px solid #444;">
                            \${currentContent}
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="header">
                            <h1>Proposed Optimization</h1>
                            <h2>Smart SEO improvements</h2>
                        </div>
                        <div class="content-box proposed">
                            <div class="improvement-note">
                                💡 <strong>Improvement:</strong> \${current.improvement}
                            </div>
                            \${proposedContent}
                            <button class="edit" onclick="enableEdit()" style="margin-top: 1rem;">✏️ Edit Proposal</button>
                        </div>
                    </div>
                </div>
                
                <div class="actions">
                    <button class="skip" onclick="skip()">⏭️ Skip</button>
                    <button class="approve" onclick="approve()">✅ Approve & Apply</button>
                </div>
            \`;
        }

        function enableEdit() {
            if (isEditing) return;
            isEditing = true;
            
            const proposedDiv = document.getElementById('proposed-value');
            let currentValue = '';
            
            if (currentOptimization.type === 'tags') {
                currentValue = currentOptimization.proposed.join(', ');
            } else {
                currentValue = currentOptimization.proposed;
            }
            
            proposedDiv.innerHTML = \`
                <textarea class="editable" id="edit-field" rows="10">\${currentValue}</textarea>
                <div style="margin-top: 0.5rem;">
                    <button onclick="saveEdit()" style="background: #4CAF50; color: white; padding: 0.5rem 1rem;">Save</button>
                    <button onclick="cancelEdit()" style="background: #666; color: white; padding: 0.5rem 1rem; margin-left: 0.5rem;">Cancel</button>
                </div>
            \`;
            
            document.getElementById('edit-field').focus();
        }

        async function saveEdit() {
            const newValue = document.getElementById('edit-field').value;
            
            if (currentOptimization.type === 'tags') {
                currentOptimization.proposed = newValue.split(',').map(t => t.trim()).filter(t => t);
            } else {
                currentOptimization.proposed = newValue;
            }
            
            await fetch('/api/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newValue: currentOptimization.proposed })
            });
            
            isEditing = false;
            loadCurrent();
        }

        function cancelEdit() {
            isEditing = false;
            loadCurrent();
        }

        async function approve() {
            document.body.classList.add('loading');
            try {
                await fetch('/api/approve', { method: 'POST' });
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
                loadCurrent();
            } catch (error) {
                alert('Error applying optimization: ' + error.message);
            } finally {
                document.body.classList.remove('loading');
            }
        }

        async function skip() {
            await fetch('/api/skip', { method: 'POST' });
            loadCurrent();
        }

        function showComplete() {
            document.getElementById('app').innerHTML = \`
                <div class="complete">
                    <h1>🎉</h1>
                    <h1>All Optimizations Complete!</h1>
                    <p style="font-size: 1.2rem; color: #888; margin-top: 1rem;">
                        All optimization opportunities have been reviewed.
                    </p>
                    <button onclick="window.close()" style="margin-top: 2rem; background: #4CAF50; color: white;">
                        Close Panel
                    </button>
                </div>
            \`;
        }

        // Start
        loadCurrent();
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(htmlContent);
});

async function startServer() {
  console.log('🚀 Starting Smart Optimization Panel with SEO Intelligence...\n');
  
  if (!(await initializeAPI())) {
    console.error('Failed to initialize API');
    return;
  }
  
  console.log('🔍 Analyzing videos with YouTube SEO best practices...');
  optimizationQueue = await analyzeVideos();
  
  if (optimizationQueue.length === 0) {
    console.log('✅ No significant optimization opportunities found!');
    console.log('Your videos are already well optimized.');
    return;
  }
  
  console.log(`📊 Found ${optimizationQueue.length} genuine optimization opportunities\n`);
  console.log('📋 Smart features:');
  console.log('   • Quality scoring for existing content');
  console.log('   • Only suggests real improvements');
  console.log('   • Preserves existing good tags');
  console.log('   • Shows what\'s being added (green tags)');
  console.log('   • Skips high-performing videos\n');
  
  app.listen(PORT, () => {
    console.log(`✅ Smart panel running at http://localhost:${PORT}`);
    console.log('🌐 Opening in browser...\n');
    open(`http://localhost:${PORT}`);
  });
}

startServer();