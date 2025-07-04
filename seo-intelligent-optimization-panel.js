const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const express = require('express');
const open = require('open');
const { YouTubeSEOTagger } = require('./youtube-seo-tags-intelligence');

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize YouTube API and SEO Tagger
let youtube = null;
let auth = null;
let seoTagger = null;
const RESUMOCAST_CHANNEL_ID = 'UC-_86oFtIIsl7sfcJSxmpYQ';

/**
 * Initialize YouTube API with authentication
 */
async function initializeYouTubeAPI() {
    const tokenPath = path.join(process.env.HOME, '.youtube-tokens.json');
    const tokenData = await fs.readFile(tokenPath, 'utf8');
    const tokens = JSON.parse(tokenData);
    
    auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    
    youtube = google.youtube({
        version: 'v3',
        auth: auth
    });
    
    // Initialize SEO Tagger
    seoTagger = new YouTubeSEOTagger();
    await seoTagger.initialize();
}

/**
 * Load existing video data with enhanced analysis
 */
async function loadAndAnalyzeVideos() {
    // Find the latest low-hanging-fruit file
    const analysisDir = path.join(__dirname, 'data', 'analysis');
    const files = await fs.readdir(analysisDir);
    const lowHangingFiles = files.filter(f => f.startsWith('low-hanging-fruit-') && f.endsWith('.json'));
    
    if (lowHangingFiles.length === 0) {
        throw new Error('No low-hanging fruit analysis files found. Please run low-hanging-fruit-analysis.js first.');
    }
    
    // Get the most recent file
    lowHangingFiles.sort((a, b) => b.localeCompare(a));
    const latestFile = lowHangingFiles[0];
    
    const dataPath = path.join(analysisDir, latestFile);
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    
    const opportunities = [];
    
    // Load video metadata
    const videoMap = {};
    if (data.videoData) {
        data.videoData.forEach(video => {
            videoMap[video.id] = video;
        });
    }
    
    // Process title optimizations with SEO intelligence
    if (data.opportunities.titles) {
        for (const titleOpp of data.opportunities.titles) {
            const video = videoMap[titleOpp.videoId];
            if (!video) continue;
            
            // Create a smart title suggestion that preserves episode numbers
            let suggestedTitle = titleOpp.suggestedTitle;
            
            // Double-check episode preservation
            const episodeMatch = titleOpp.currentTitle.match(/(T\d+#\d+)/);
            if (episodeMatch && !suggestedTitle.includes(episodeMatch[1])) {
                // Fix if episode was removed
                const [, episode] = episodeMatch;
                const cleanTitle = titleOpp.currentTitle.replace(episode, '').replace(/\|.*$/, '').trim();
                suggestedTitle = `${cleanTitle} | ${episode} | ResumoCast`;
            }
            
            opportunities.push({
                type: 'title',
                videoId: titleOpp.videoId,
                current: titleOpp.currentTitle,
                suggested: suggestedTitle,
                video: video,
                views: video.statistics.viewCount
            });
        }
    }
    
    // Process tag optimizations with SEO intelligence
    if (data.opportunities.tags) {
        for (const tagOpp of data.opportunities.tags) {
            const video = videoMap[tagOpp.videoId];
            if (!video) continue;
            
            // Use SEO intelligence to create optimized tags
            const currentTags = tagOpp.currentTags || [];
            const tagOptimization = seoTagger.createOptimizedTags(video.snippet.title, currentTags);
            
            // Only suggest if it's a real improvement
            if (tagOptimization.added.length > 0 || tagOptimization.qualityScore < 7) {
                opportunities.push({
                    type: 'tags',
                    videoId: tagOpp.videoId,
                    current: currentTags,
                    suggested: tagOptimization.tags,
                    added: tagOptimization.added,
                    removed: tagOptimization.removed,
                    kept: tagOptimization.kept,
                    qualityScore: tagOptimization.qualityScore,
                    video: video,
                    views: video.statistics.viewCount
                });
            }
        }
    }
    
    // Process description optimizations
    if (data.opportunities.descriptions) {
        for (const descOpp of data.opportunities.descriptions) {
            const video = videoMap[descOpp.videoId];
            if (!video) continue;
            
            // Only optimize descriptions that really need it
            const currentDesc = descOpp.currentDescription || '';
            const hasGoodDescription = currentDesc.length > 800 && 
                                     currentDesc.includes('ResumoCast') &&
                                     (currentDesc.includes('inscreva') || currentDesc.includes('apoie'));
            
            if (!hasGoodDescription) {
                const suggestedDescription = generateSmartDescription(video);
                opportunities.push({
                    type: 'description',
                    videoId: descOpp.videoId,
                    current: currentDesc,
                    suggested: suggestedDescription,
                    video: video,
                    views: video.statistics.viewCount
                });
            }
        }
    }
    
    // Sort by views (prioritize lower-performing videos that need help)
    opportunities.sort((a, b) => a.views - b.views);
    
    return opportunities;
}

/**
 * Generate smart description based on video content
 */
function generateSmartDescription(video) {
    const title = video.snippet.title.replace(/T\d+#\d+/g, '').replace(/\|.*$/, '').trim();
    
    // Extract key topics for description
    const topics = title.toLowerCase();
    let intro = "";
    
    if (topics.includes('plano de negócio')) {
        intro = "Aprenda a criar um plano de negócios profissional e estruturado. ";
    } else if (topics.includes('marketing')) {
        intro = "Descubra estratégias de marketing eficazes para o seu negócio. ";
    } else if (topics.includes('vendas')) {
        intro = "Melhore suas técnicas de vendas e aumente seu faturamento. ";
    } else if (topics.includes('liderança')) {
        intro = "Desenvolva habilidades de liderança essenciais para o sucesso. ";
    } else {
        intro = "Insights valiosos sobre empreendedorismo e gestão de negócios. ";
    }
    
    const description = `${intro}Neste episódio do ResumoCast, exploramos ${title.toLowerCase()}.

📚 O que você vai aprender:
• Conceitos fundamentais e aplicações práticas
• Estratégias comprovadas e casos de sucesso
• Dicas para implementar no seu negócio

🎯 ResumoCast - Resumos de livros de negócios
Transformamos os melhores livros de negócios em insights práticos para empreendedores e profissionais.

📱 Siga o ResumoCast:
• Site: resumocast.com.br
• Instagram: @resumocast
• LinkedIn: /company/resumocast

🔔 Inscreva-se para não perder nenhum episódio!

#ResumoCast #Empreendedorismo #Negócios #${title.split(' ')[0]}`;
    
    return description;
}

// HTML template for the panel
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>SEO Intelligent Optimization Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header h1 { color: #333; margin-bottom: 10px; }
        .stats { display: flex; gap: 30px; margin-top: 20px; }
        .stat { text-align: center; }
        .stat-value { font-size: 36px; font-weight: bold; color: #e53e3e; }
        .stat-label { color: #666; margin-top: 5px; }
        
        .filters { background: white; padding: 20px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .filter-group { display: flex; gap: 15px; flex-wrap: wrap; }
        .filter-btn { padding: 8px 16px; border: 2px solid #ddd; background: white; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .filter-btn.active { background: #e53e3e; color: white; border-color: #e53e3e; }
        .filter-btn:hover { border-color: #e53e3e; }
        
        .opportunity { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .opportunity-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .video-title { font-size: 18px; font-weight: 600; color: #333; }
        .video-stats { display: flex; gap: 20px; color: #666; font-size: 14px; }
        
        .optimization-type { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .type-title { background: #e53e3e; color: white; }
        .type-tags { background: #3182ce; color: white; }
        .type-description { background: #38a169; color: white; }
        
        .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
        .current, .suggested { padding: 15px; border-radius: 8px; }
        .current { background: #fff5f5; border: 1px solid #feb2b2; }
        .suggested { background: #f0fdf4; border: 1px solid #9ae6b4; }
        
        .section-title { font-weight: 600; margin-bottom: 8px; color: #555; }
        .content { color: #333; line-height: 1.5; }
        .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .tag { padding: 4px 10px; background: #e2e8f0; border-radius: 15px; font-size: 13px; }
        .tag.new { background: #c6f6d5; color: #22543d; }
        .tag.removed { background: #fed7d7; color: #742a2a; text-decoration: line-through; }
        .tag.kept { background: #e2e8f0; color: #2d3748; }
        
        .quality-score { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
        .score-bar { width: 100px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .score-fill { height: 100%; background: #48bb78; transition: width 0.3s; }
        
        .actions { display: flex; gap: 10px; margin-top: 15px; }
        .btn { padding: 8px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-approve { background: #48bb78; color: white; }
        .btn-approve:hover { background: #38a169; }
        .btn-reject { background: #e53e3e; color: white; }
        .btn-reject:hover { background: #c53030; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .progress { position: fixed; top: 0; left: 0; right: 0; height: 4px; background: #e2e8f0; z-index: 1000; }
        .progress-bar { height: 100%; background: #3182ce; transition: width 0.3s; }
        
        .notification { position: fixed; top: 20px; right: 20px; padding: 15px 25px; border-radius: 8px; background: #48bb78; color: white; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transform: translateX(400px); transition: transform 0.3s; z-index: 1001; }
        .notification.show { transform: translateX(0); }
        
        .info-box { background: #bee3f8; border: 1px solid #3182ce; color: #2c5282; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .info-box h3 { margin-bottom: 8px; }
        .info-box ul { margin-left: 20px; }
    </style>
</head>
<body>
    <div class="progress">
        <div class="progress-bar" style="width: 0%"></div>
    </div>
    
    <div class="container">
        <div class="header">
            <h1>🚀 SEO Intelligent Optimization Panel</h1>
            <p style="color: #666; margin-top: 10px;">Only showing genuine improvements based on YouTube SEO best practices</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value" id="totalOpportunities">0</div>
                    <div class="stat-label">Total Opportunities</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="approvedCount">0</div>
                    <div class="stat-label">Approved</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="rejectedCount">0</div>
                    <div class="stat-label">Rejected</div>
                </div>
            </div>
        </div>
        
        <div class="info-box">
            <h3>🎯 Smart SEO Features Active:</h3>
            <ul>
                <li>✅ Filters out generic tags like "português", "brasil", "todos"</li>
                <li>✅ Suggests searchable phrases people actually use</li>
                <li>✅ Preserves high-quality existing tags</li>
                <li>✅ Shows tag quality scores</li>
                <li>✅ Focuses on 2-3 word search phrases</li>
                <li>✅ Includes business-specific terms</li>
            </ul>
        </div>
        
        <div class="filters">
            <h3 style="margin-bottom: 15px;">Filter by optimization type:</h3>
            <div class="filter-group">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="title">Titles</button>
                <button class="filter-btn" data-filter="tags">Tags</button>
                <button class="filter-btn" data-filter="description">Descriptions</button>
            </div>
        </div>
        
        <div id="opportunities"></div>
    </div>
    
    <div class="notification" id="notification"></div>
    
    <script>
        let opportunities = [];
        let approvedCount = 0;
        let rejectedCount = 0;
        
        async function loadOpportunities() {
            const response = await fetch('/api/opportunities');
            opportunities = await response.json();
            renderOpportunities();
            updateStats();
        }
        
        function renderOpportunities() {
            const container = document.getElementById('opportunities');
            const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
            
            container.innerHTML = opportunities
                .filter(opp => !opp.processed && (activeFilter === 'all' || opp.type === activeFilter))
                .map((opp, index) => renderOpportunity(opp, index))
                .join('');
        }
        
        function renderOpportunity(opp, index) {
            const typeColors = {
                title: 'type-title',
                tags: 'type-tags',
                description: 'type-description'
            };
            
            let comparisonHtml = '';
            
            if (opp.type === 'title') {
                comparisonHtml = \`
                    <div class="comparison">
                        <div class="current">
                            <div class="section-title">Current Title</div>
                            <div class="content">\${escapeHtml(opp.current)}</div>
                        </div>
                        <div class="suggested">
                            <div class="section-title">Suggested Title</div>
                            <div class="content">\${escapeHtml(opp.suggested)}</div>
                        </div>
                    </div>
                \`;
            } else if (opp.type === 'tags') {
                const currentTagsHtml = opp.current.map(tag => 
                    opp.removed.includes(tag) 
                        ? \`<span class="tag removed">\${escapeHtml(tag)}</span>\`
                        : \`<span class="tag kept">\${escapeHtml(tag)}</span>\`
                ).join('');
                
                const suggestedTagsHtml = opp.suggested.map(tag => 
                    opp.added.includes(tag)
                        ? \`<span class="tag new">+ \${escapeHtml(tag)}</span>\`
                        : \`<span class="tag kept">\${escapeHtml(tag)}</span>\`
                ).join('');
                
                comparisonHtml = \`
                    <div class="comparison">
                        <div class="current">
                            <div class="section-title">Current Tags (\${opp.current.length})</div>
                            <div class="tags">\${currentTagsHtml || '<em>No tags</em>'}</div>
                            <div class="quality-score">
                                <span>Quality Score:</span>
                                <div class="score-bar">
                                    <div class="score-fill" style="width: \${opp.qualityScore * 10}%"></div>
                                </div>
                                <span>\${opp.qualityScore.toFixed(1)}/10</span>
                            </div>
                        </div>
                        <div class="suggested">
                            <div class="section-title">Optimized Tags (\${opp.suggested.length})</div>
                            <div class="tags">\${suggestedTagsHtml}</div>
                            <div style="margin-top: 10px; font-size: 13px; color: #48bb78;">
                                ✅ \${opp.added.length} searchable tags added<br>
                                ❌ \${opp.removed.length} generic tags removed
                            </div>
                        </div>
                    </div>
                \`;
            } else if (opp.type === 'description') {
                comparisonHtml = \`
                    <div class="comparison">
                        <div class="current">
                            <div class="section-title">Current Description</div>
                            <div class="content" style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                                \${escapeHtml(opp.current) || '<em>No description</em>'}
                            </div>
                        </div>
                        <div class="suggested">
                            <div class="section-title">Suggested Description</div>
                            <div class="content" style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                                \${escapeHtml(opp.suggested)}
                            </div>
                        </div>
                    </div>
                \`;
            }
            
            return \`
                <div class="opportunity" data-index="\${index}">
                    <div class="opportunity-header">
                        <div>
                            <span class="optimization-type \${typeColors[opp.type]}">\${opp.type.toUpperCase()}</span>
                            <div class="video-title">\${escapeHtml(opp.video.snippet.title)}</div>
                        </div>
                        <div class="video-stats">
                            <span>👁 \${formatNumber(opp.video.statistics.viewCount)} views</span>
                            <span>👍 \${formatNumber(opp.video.statistics.likeCount)} likes</span>
                            <span>💬 \${formatNumber(opp.video.statistics.commentCount)} comments</span>
                        </div>
                    </div>
                    
                    \${comparisonHtml}
                    
                    <div class="actions">
                        <button class="btn btn-approve" onclick="processOpportunity(\${index}, true)">
                            ✅ Approve & Apply
                        </button>
                        <button class="btn btn-reject" onclick="processOpportunity(\${index}, false)">
                            ❌ Reject
                        </button>
                    </div>
                </div>
            \`;
        }
        
        async function processOpportunity(index, approved) {
            const buttons = document.querySelectorAll(\`.opportunity[data-index="\${index}"] .btn\`);
            buttons.forEach(btn => btn.disabled = true);
            
            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ index, approved })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    opportunities[index].processed = true;
                    if (approved) {
                        approvedCount++;
                        showNotification('✅ Optimization applied successfully!');
                    } else {
                        rejectedCount++;
                        showNotification('❌ Optimization rejected');
                    }
                    
                    // Fade out and remove
                    const element = document.querySelector(\`.opportunity[data-index="\${index}"]\`);
                    element.style.transition = 'opacity 0.3s';
                    element.style.opacity = '0';
                    setTimeout(() => {
                        renderOpportunities();
                        updateStats();
                        updateProgress();
                    }, 300);
                }
            } catch (error) {
                console.error('Error processing opportunity:', error);
                buttons.forEach(btn => btn.disabled = false);
                showNotification('❌ Error: ' + error.message, 'error');
            }
        }
        
        function updateStats() {
            document.getElementById('totalOpportunities').textContent = opportunities.length;
            document.getElementById('approvedCount').textContent = approvedCount;
            document.getElementById('rejectedCount').textContent = rejectedCount;
        }
        
        function updateProgress() {
            const processed = opportunities.filter(o => o.processed).length;
            const percentage = (processed / opportunities.length) * 100;
            document.querySelector('.progress-bar').style.width = percentage + '%';
        }
        
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = 'notification show';
            if (type === 'error') notification.style.background = '#e53e3e';
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
        
        function formatNumber(num) {
            return new Intl.NumberFormat('pt-BR').format(num);
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderOpportunities();
            });
        });
        
        // Load opportunities on page load
        loadOpportunities();
    </script>
</body>
</html>
`;

// API endpoints
app.get('/', (req, res) => {
    res.send(htmlTemplate);
});

app.get('/api/opportunities', async (req, res) => {
    try {
        const opportunities = await loadAndAnalyzeVideos();
        res.json(opportunities);
    } catch (error) {
        console.error('Error loading opportunities:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/process', async (req, res) => {
    const { index, approved } = req.body;
    
    if (!approved) {
        return res.json({ success: true, message: 'Optimization rejected' });
    }
    
    try {
        const opportunities = await loadAndAnalyzeVideos();
        const opportunity = opportunities[index];
        
        if (!opportunity) {
            throw new Error('Opportunity not found');
        }
        
        console.log(`\n🎯 Applying ${opportunity.type} optimization to: ${opportunity.video.snippet.title}`);
        
        // Apply the optimization based on type
        let updateData = {};
        
        if (opportunity.type === 'title') {
            updateData.snippet = {
                title: opportunity.suggested,
                categoryId: opportunity.video.snippet.categoryId
            };
        } else if (opportunity.type === 'tags') {
            updateData.snippet = {
                title: opportunity.video.snippet.title,
                tags: opportunity.suggested,
                categoryId: opportunity.video.snippet.categoryId
            };
        } else if (opportunity.type === 'description') {
            updateData.snippet = {
                title: opportunity.video.snippet.title,
                description: opportunity.suggested,
                categoryId: opportunity.video.snippet.categoryId
            };
        }
        
        // Add required fields
        updateData.snippet.defaultLanguage = opportunity.video.snippet.defaultLanguage || 'pt';
        
        // Make the API call with retry logic
        await updateVideoWithRetry(opportunity.videoId, updateData);
        
        console.log(`✅ Successfully updated ${opportunity.type} for video: ${opportunity.video.snippet.title}`);
        
        res.json({ success: true, message: 'Optimization applied successfully' });
        
    } catch (error) {
        console.error('Error applying optimization:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update video with retry logic
 */
async function updateVideoWithRetry(videoId, updateData, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await youtube.videos.update({
                part: ['snippet'],
                requestBody: {
                    id: videoId,
                    ...updateData
                }
            });
            
            // Wait 3 seconds after successful update (rate limiting)
            await new Promise(resolve => setTimeout(resolve, 3000));
            return;
            
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error.message);
            
            if (error.code === 403 && error.message.includes('forbidden')) {
                throw new Error('Permission denied. Please check channel access.');
            }
            
            if (i === retries - 1) throw error;
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

/**
 * Start the server
 */
async function startServer() {
    try {
        console.log('🚀 Starting SEO Intelligent Optimization Panel...\n');
        
        // Initialize YouTube API
        await initializeYouTubeAPI();
        console.log('✅ YouTube API initialized with SEO intelligence');
        
        // Start Express server
        const PORT = 3333;
        app.listen(PORT, () => {
            console.log(`\n✅ SEO Intelligent panel running at http://localhost:${PORT}`);
            console.log('🌐 Opening in browser...\n');
            
            console.log('🎯 Key Features:');
            console.log('   • Only suggests searchable tags (2-3 word phrases)');
            console.log('   • Filters out generic tags like "português", "brasil"');
            console.log('   • Shows tag quality scores');
            console.log('   • Preserves high-quality existing tags');
            console.log('   • Focuses on terms people actually search for\n');
            
            // Open in browser
            open(`http://localhost:${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ Error starting server:', error);
        process.exit(1);
    }
}

// Start the application
startServer();