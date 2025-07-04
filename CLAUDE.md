# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Yoda is a comprehensive YouTube channel automation and optimization platform built with Node.js/TypeScript. The project enables creators to optimize video metadata, manage channels via CLI, and implement growth strategies through YouTube API integration.

## Core Architecture

The project follows a hybrid structure with both TypeScript modules (`src/`) and standalone JavaScript automation scripts:

### Main Components
- **`src/`** - TypeScript codebase with CLI tools and API clients
- **Root Scripts** - JavaScript automation tools for YouTube optimization
- **`data/`** - Structured storage for channel data, analysis reports, and backups
- **Authentication** - OAuth2 flow with YouTube API using manager/owner permissions

### Key Concepts
- **Channel Management**: Scripts can read/write to YouTube channels with proper authentication
- **Optimization Workflows**: Multi-phase approach to video SEO (titles, tags, descriptions)
- **Episode Number Preservation**: Critical requirement to maintain episode numbering (e.g., T4#13, T5#025)
- **Rate Limiting**: 3-second delays between API calls to avoid quota issues
- **Manager vs Owner Permissions**: Project supports both owner and manager-level YouTube channel access

## Development Commands

### Setup and Authentication
```bash
npm install                          # Install dependencies
node authenticate.js                 # YouTube OAuth authentication flow
node quick-setup.js                 # Quick project setup
```

### Core Operations
```bash
# Channel data extraction and analysis
node extract-channel-data.js        # Extract all channel video metadata
node analyze-optimization-opportunities.js  # Analyze optimization potential
node comprehensive-channel-analysis.js      # Full channel audit

# Implementation workflows
node phase1-preview-all-changes.js   # Preview changes before implementation
node phase1-implementation-fixed.js  # Execute Phase 1 optimizations
node check-implementation-status.js  # Verify optimization progress
```

### Development Tools
```bash
npm run dev                         # Development server with nodemon
npm run build                       # TypeScript compilation
npm run test                        # Jest test suite
npm run lint                        # ESLint code checking
npm run typecheck                   # TypeScript type checking
```

### CLI Interface
```bash
node src/cli/youtube-cli.ts         # Full-featured YouTube CLI
node resumocast-cli.js              # ResumoCast-specific CLI commands
```

## Authentication Requirements

### Environment Variables (.env)
```
YOUTUBE_CLIENT_ID=your_google_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Token Storage
- Tokens stored in `~/.youtube-tokens.json`
- Supports both channel owner and manager permissions
- Automatic token refresh handled by googleapis library

### Required YouTube API Scopes
- `https://www.googleapis.com/auth/youtube`
- `https://www.googleapis.com/auth/youtube.force-ssl`
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

## Data Architecture

### Storage Structure
```
data/
├── analysis/           # Optimization reports and implementation logs
├── channel-export/     # Raw channel data (videos, playlists, metadata)
├── backups/           # Timestamped data backups
└── processed/         # Processed/transformed data
```

### Key Data Files
- `channel-export/videos-metadata.json` - Complete video data for analysis
- `analysis/comprehensive-opportunities-report.json` - Optimization opportunities
- `analysis/phase1-implementation-report-*.json` - Implementation tracking

## YouTube Optimization Workflows

### Phase-Based Optimization
1. **Analysis Phase**: Extract and analyze channel data for opportunities
2. **Preview Phase**: Show all planned changes for approval  
3. **Implementation Phase**: Execute optimizations with progress tracking
4. **Monitoring Phase**: Track results and performance improvements

### Critical Implementation Rules
- **Always preserve episode numbers** in titles (T4#13, T5#025, etc.)
- **Use 3-second delays** between API calls for rate limiting
- **Verify manager permissions** before attempting video updates
- **Create backups** before bulk operations
- **Track all changes** in detailed implementation reports

### Video Optimization Types
- **Title Optimization**: Add ResumoCast branding, improve SEO keywords
- **Tag Implementation**: Add 10-15 relevant Brazilian SEO tags
- **Description Enhancement**: Rich descriptions with CTAs, links, hashtags

## Common Debugging Commands

```bash
# Authentication troubleshooting
node check-auth-scope.js            # Verify API scopes and permissions
node check-manager-permissions.js   # Test manager account capabilities
node test-channel-access.js         # Test access to specific channel

# API diagnostics
node diagnose-api-error.js          # Debug specific API errors
node test-youtube.js                # Basic YouTube API connectivity test
```

## Integration Points

### YouTube API Integration
- Uses `googleapis` library for all YouTube operations
- Implements retry logic and error handling for API limits
- Supports bulk operations with proper rate limiting

### ResumoCast Channel Specifics
- Channel ID: `UC-_86oFtIIsl7sfcJSxmpYQ`
- Brazilian Portuguese content optimization
- Business/entrepreneurship focus for SEO keywords
- Episode numbering format: T4#13, T5#025, etc.

## Important Constraints

- **Never remove compleatly episode numbers** in existing title, you can add words but keep the episode and season somewhere in the tile when present.
- **Manager accounts can update videos** but require proper API project setup
- **Rate limiting is critical** - always use delays between API calls
- **Backup data before bulk operations** to enable rollback if needed
- **Test with single video** before bulk implementations

## Content Optimization Analysis Guidelines

### When Analyzing Videos for Optimization

1. **Check Existing Quality First**
   - Don't assume content needs optimization just because it lacks one keyword
   - High-performing videos (>10K views) likely have good optimization already
   - Look for multiple quality indicators, not single missing elements

2. **Description Analysis**
   - Check for various CTA formats: "inscreva", "apoiador", "apoie", "participe", "junte-se", "faça parte"
   - Preserve existing high-quality descriptions (>800 chars with good structure)
   - Only enhance what's truly missing, don't replace good content with generic templates

3. **Tag Analysis**
   - Videos with 10+ relevant tags don't need optimization
   - Keep existing good tags when adding new ones
   - Generate topic-specific tags based on actual content

4. **Smart Detection Patterns**
   ```javascript
   // Good CTA detection example
   const hasSubscribeCTA = description.toLowerCase().match(/(inscrev|apoiador|apoie|particip|junte-se|faça parte)/);
   
   // Check multiple quality indicators
   const isWellOptimized = hasSubscribeCTA && hasSocialLinks && hasHashtags && description.length > 500;
   ```

5. **Preserve Existing Content**
   - Never replace affiliate links, custom CTAs, or unique content
   - Add missing elements at the end rather than rewriting
   - Keep timestamps, links, and structured content intact

## Interactive Optimization Tools

### Creating User-Friendly Approval Panels

1. **Show Full Context**
   - Always display current content, not just metadata
   - Side-by-side comparison for easy review
   - Clear indication of what's changing

2. **Smart Filtering**
   - Only show videos that truly need optimization
   - Sort by priority (views + recency + severity)
   - Skip already well-optimized content

3. **Low Friction Implementation**
   - Web-based panels instead of file management
   - Direct API execution without intermediate files
   - Edit capabilities for on-the-fly adjustments

## YouTube SEO Best Practices

### Tag Optimization Strategy

1. **Quantity and Quality**
   - Optimal: 15-30 tags (YouTube indexes all, but ranks by relevance)
   - Mix of broad and specific terms
   - Include variations of the main topic

2. **Tag Types to Include**
   - **Primary keyword** (exact match of what people search)
   - **Variations** (different ways to say the same thing)
   - **Long-tail keywords** (3-4 word specific phrases)
   - **Brand tags** (channel name, series name)
   - **Category tags** (broad topic areas)
   - **Language/location tags** (português, brasil)

3. **Good Tag Examples for "O Poder da Ação"**
   ```
   GOOD: o poder da ação, o poder da ação paulo vieira, o poder da ação livro, 
         livro o poder da ação resumo, paulo vieira coach, método cis
   BAD:  livros, coaching, desenvolvimento (too generic alone)
   ```

4. **Tag Research Methods**
   - Look at what similar successful videos use
   - Use YouTube search suggestions
   - Include common misspellings
   - Add year for timely content

### Title SEO Guidelines

1. **Structure**: `[Hook/Keyword] - [Benefit/Description] | [Brand]`
2. **Length**: 60-70 characters optimal (shows fully in search)
3. **Keywords**: Front-load most important keywords
4. **Episode numbers**: Keep at beginning for series (T4#13)

### Description SEO Rules

1. **First 125 characters** are crucial (shows in search)
2. **Include keywords naturally** in first 2-3 sentences
3. **Structure**:
   - Hook/Summary (125 chars)
   - Value proposition
   - Timestamps (increases engagement)
   - Links and CTAs
   - Social media
   - Relevant hashtags (3-5)

### When NOT to Optimize

- **Already optimized content**: 20+ relevant tags, good CTR
- **High-performing videos**: Don't fix what isn't broken
- **Recent optimizations**: Wait for data before re-optimizing

## YouTube Tag SEO Intelligence

### What Makes a Good YouTube Tag

1. **Search Intent Focused**
   - Tags should be terms people actually search for
   - Bad: "português", "brasil", "todos", "para", "com" (too generic)
   - Good: "plano de negócios", "como fazer vendas", "marketing digital 2025"

2. **Optimal Tag Structure**
   - **2-3 word phrases** perform best for SEO
   - Single words are usually too broad (except brand names)
   - 4+ words can be too specific (lower search volume)

3. **Tag Categories to Include**
   ```
   Primary Keyword:     plano de negócios
   Variations:          como fazer plano de negócios, modelo plano de negócios
   Problem-solving:     erros plano de negócios, problemas planejamento
   Educational:         tutorial plano de negócios, aprenda plano de negócios
   Comparisons:         plano de negócios vs modelo de negócios
   Year/Location:       plano de negócios 2025, plano de negócios brasil
   Long-tail:           plano de negócios para pequenas empresas
   ```

4. **Bad Tag Patterns to Avoid**
   - Generic single words: brasil, português, todos, para, com
   - Language identifiers alone: pt, br, pt-br
   - Too broad terms alone: negócio, empresa, dinheiro
   - Stop words: o, a, de, do, em, na

5. **Business Content Specific Tags**
   ```javascript
   // High-value searchable business tags
   const businessTags = [
     'plano de negócios', 'modelo de negócio', 'análise de mercado',
     'estratégia empresarial', 'gestão de pessoas', 'liderança empresarial',
     'marketing digital', 'vendas b2b', 'vendas b2c', 'pitch de vendas',
     'captação de clientes', 'fidelização de clientes', 'precificação',
     'margem de lucro', 'fluxo de caixa', 'roi retorno investimento',
     'kpis empresariais', 'cultura organizacional', 'inovação empresarial',
     'startup brasil', 'empreendedorismo digital', 'mei como abrir'
   ];
   ```

6. **Tag Quality Evaluation**
   ```javascript
   // Good tag must have:
   // - 2+ words (unless brand name)
   // - Searchable terms or patterns
   // - Not in bad patterns list
   // - Relevant to video content
   
   function isGoodTag(tag) {
     const wordCount = tag.split(' ').length;
     const hasSearchIntent = /como|tutorial|dicas|melhor|aprenda/.test(tag);
     const isBusinessTerm = businessTags.includes(tag);
     return (wordCount >= 2 || isBusinessTerm) && !isBadPattern(tag);
   }
   ```

## Development Best Practices

- **Always use desktop commander terminal inputs when needed and CLI into the places that are necessary.**
- **Create interactive panels for user approval workflows to avoid file clutter**
- **Implement smart content analysis that preserves existing quality content**
- **Check YouTube SEO best practices before suggesting optimizations**