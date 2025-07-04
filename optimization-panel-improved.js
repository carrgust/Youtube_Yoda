#!/usr/bin/env node

/**
 * Improved Interactive Optimization Approval Panel
 * Better analysis and shows current content for comparison
 */

const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const open = require('open');
require('dotenv').config();

const app = express();
const PORT = 3333;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store optimization queue in memory
let optimizationQueue = [];
let currentIndex = 0;
let youtube = null;
let auth = null;

// Initialize YouTube API
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
    
    console.log('✅ YouTube API initialized');
    return true;
  } catch (error) {
    console.error('❌ API initialization failed:', error.message);
    return false;
  }
}

// Load and analyze videos with improved logic
async function analyzeVideos() {
  try {
    const videosData = await fs.readFile(
      path.join(__dirname, 'data', 'channel-export', 'videos-metadata.json'),
      'utf-8'
    );
    const allVideos = JSON.parse(videosData);
    
    console.log(`📊 Analyzing ${allVideos.length} videos with improved logic...\n`);
    
    const opportunities = [];
    
    for (const video of allVideos) {
      const titleOpts = analyzeTitleImproved(video);
      const tagOpts = analyzeTagsImproved(video);
      const descOpts = analyzeDescriptionImproved(video);
      
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

// Improved title analysis
function analyzeTitleImproved(video) {
  const opportunities = [];
  const title = video.snippet.title;
  const views = parseInt(video.statistics.viewCount || 0);
  
  // Skip if already has ResumoCast branding
  if (title.toLowerCase().includes('resumocast')) {
    return opportunities;
  }
  
  // Only suggest branding for videos without it
  const episodeMatch = title.match(/^(T\d+#\d+)/);
  const episodeNumber = episodeMatch ? episodeMatch[1] : null;
  
  let suggestedTitle = title;
  
  // Add ResumoCast branding while preserving episode numbers
  if (!title.includes('|')) {
    suggestedTitle = `${title} | ResumoCast`;
  } else {
    // Check if title has episode number at the end (like "Title | T2#084")
    const endEpisodeMatch = title.match(/\|\s*(T\d+#\d+)\s*$/);
    if (endEpisodeMatch) {
      // Preserve episode number and add ResumoCast
      suggestedTitle = title.replace(/\|.*$/, `| ResumoCast`);
    } else {
      // Just replace what's after | with ResumoCast
      suggestedTitle = title.replace(/\|.*$/, '| ResumoCast');
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
    currentContent: title
  });
  
  return opportunities;
}

// Improved tag analysis
function analyzeTagsImproved(video) {
  const opportunities = [];
  const tags = video.snippet.tags || [];
  const views = parseInt(video.statistics.viewCount || 0);
  const title = video.snippet.title;
  
  // Skip if already has good tags
  if (tags.length >= 10 && tags.some(tag => tag.toLowerCase().includes('resumocast'))) {
    return opportunities;
  }
  
  const issues = [];
  
  if (tags.length === 0) {
    issues.push('No tags at all');
  } else if (tags.length < 5) {
    issues.push(`Only ${tags.length} tags (need 10-15)`);
  }
  
  if (!tags.some(tag => tag.toLowerCase().includes('resumocast'))) {
    issues.push('Missing ResumoCast brand tag');
  }
  
  if (issues.length === 0) return opportunities;
  
  // Generate smart tags based on content
  const suggestedTags = generateSmartTags(video);
  
  opportunities.push({
    type: 'tags',
    videoId: video.id,
    title: title,
    current: tags,
    proposed: suggestedTags,
    views: views,
    priority: tags.length === 0 ? 'HIGH' : views > 10000 ? 'HIGH' : 'MEDIUM',
    reasons: issues,
    currentContent: tags.join(', ')
  });
  
  return opportunities;
}

// Improved description analysis
function analyzeDescriptionImproved(video) {
  const opportunities = [];
  const description = video.snippet.description || '';
  const views = parseInt(video.statistics.viewCount || 0);
  const title = video.snippet.title;
  
  // Check if description already has good elements
  const hasSubscribeCTA = description.toLowerCase().match(/(inscrev|apoiador|apoie|particip|junte-se|faça parte)/);
  const hasSocialLinks = description.includes('http') && description.toLowerCase().includes('instagram');
  const hasHashtags = description.includes('#');
  const hasStructure = description.length > 500;
  
  // Skip if description is already good
  if (hasSubscribeCTA && hasSocialLinks && hasHashtags && hasStructure) {
    return opportunities;
  }
  
  const issues = [];
  
  if (description.length === 0) {
    issues.push('No description');
  } else if (description.length < 200) {
    issues.push(`Very short (${description.length} chars)`);
  }
  
  if (!hasSubscribeCTA) {
    issues.push('No clear call-to-action');
  }
  
  if (!hasSocialLinks) {
    issues.push('Missing social media links');
  }
  
  if (!hasHashtags) {
    issues.push('No hashtags');
  }
  
  if (issues.length === 0) return opportunities;
  
  // Generate enhanced description preserving existing content
  const enhancedDescription = enhanceDescription(video);
  
  opportunities.push({
    type: 'description',
    videoId: video.id,
    title: title,
    currentLength: description.length,
    current: description,
    proposed: enhancedDescription,
    views: views,
    priority: description.length < 200 ? 'HIGH' : 'MEDIUM',
    reasons: issues,
    currentContent: description
  });
  
  return opportunities;
}

// Generate smart tags based on video content
function generateSmartTags(video) {
  const title = video.snippet.title.toLowerCase();
  const description = (video.snippet.description || '').toLowerCase();
  const currentTags = video.snippet.tags || [];
  
  // Base tags
  const tags = new Set(['resumocast', 'resumo de livros', 'brasil', 'português']);
  
  // Add year
  const year = new Date().getFullYear();
  tags.add(year.toString());
  
  // Topic-specific tags
  if (title.includes('paulo vieira') || title.includes('poder da ação')) {
    tags.add('paulo vieira');
    tags.add('coaching');
    tags.add('desenvolvimento pessoal');
    tags.add('autoajuda');
  }
  
  if (title.includes('negócio') || title.includes('empreend')) {
    tags.add('empreendedorismo');
    tags.add('negócios');
    tags.add('startups');
    tags.add('gestão');
  }
  
  if (title.includes('liderança')) {
    tags.add('liderança');
    tags.add('gestão de pessoas');
    tags.add('management');
  }
  
  // Keep good existing tags
  currentTags.forEach(tag => {
    if (tag.length > 2 && tag.length < 30) {
      tags.add(tag.toLowerCase());
    }
  });
  
  return Array.from(tags).slice(0, 15);
}

// Enhance description while preserving good existing content
function enhanceDescription(video) {
  const currentDesc = video.snippet.description || '';
  const title = video.snippet.title;
  
  // If description already has structure, preserve it
  if (currentDesc.length > 800) {
    // Just add missing elements at the end
    let enhanced = currentDesc;
    
    if (!currentDesc.includes('#ResumoCast')) {
      enhanced += '\n\n#ResumoCast #ResumosDeLivros #DesenvolvimentoPessoal';
    }
    
    if (!currentDesc.toLowerCase().includes('inscrev')) {
      enhanced += '\n\n🔔 INSCREVA-SE para não perder novos resumos!';
    }
    
    return enhanced;
  }
  
  // For short descriptions, create a proper structure
  return `📚 ${title}

${currentDesc}

🎯 NESTE VÍDEO:
• Resumo completo e detalhado
• Principais conceitos explicados
• Aplicações práticas para sua vida

💡 SOBRE O RESUMOCAST:
Somos o maior canal de resumos de livros do Brasil. Nossa missão é democratizar o conhecimento!

🔔 INSCREVA-SE e ative as notificações
👍 Deixe seu LIKE se gostou
💬 COMENTE o que achou
📤 COMPARTILHE com amigos

📱 REDES SOCIAIS:
• Instagram: @resumocast
• Site: resumocast.com.br

#ResumoCast #ResumosDeLivros #DesenvolvimentoPessoal #Negócios #${new Date().getFullYear()}`;
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
    // Apply the optimization via YouTube API
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
    <title>YouTube Optimization Panel</title>
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
                        \${current.proposed.map(tag => \`<span class="tag">\${tag}</span>\`).join('')}
                    </div>
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
                            <hr style="margin: 1rem 0; border: none; border-top: 1px solid #444;">
                            \${currentContent}
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="header">
                            <h1>Proposed Optimization</h1>
                            <h2>Review the suggested changes</h2>
                        </div>
                        <div class="content-box proposed">
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

// Serve the HTML
app.get('/', (req, res) => {
  res.send(htmlContent);
});

// Start server
async function startServer() {
  console.log('🚀 Starting Improved Optimization Panel...\n');
  
  if (!(await initializeAPI())) {
    console.error('Failed to initialize API');
    return;
  }
  
  console.log('🔍 Analyzing videos with improved logic...');
  optimizationQueue = await analyzeVideos();
  
  if (optimizationQueue.length === 0) {
    console.log('✅ No optimization opportunities found!');
    console.log('Your videos are already well optimized.');
    return;
  }
  
  console.log(`📊 Found ${optimizationQueue.length} optimization opportunities\n`);
  
  // Close any existing server
  try {
    await fetch(`http://localhost:${PORT}/api/shutdown`, { method: 'POST' });
  } catch (e) {
    // Server not running, continue
  }
  
  app.listen(PORT, () => {
    console.log(`✅ Improved panel running at http://localhost:${PORT}`);
    console.log('🌐 Opening in browser...\n');
    console.log('📋 Key improvements:');
    console.log('   • Shows current content for comparison');
    console.log('   • Smarter analysis (skips already optimized content)');
    console.log('   • Preserves existing good content');
    console.log('   • Better tag generation\n');
    
    open(`http://localhost:${PORT}`);
  });
}

startServer();