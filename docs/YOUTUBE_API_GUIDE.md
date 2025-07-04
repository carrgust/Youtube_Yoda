# YouTube API Integration Guide

## Overview

This guide provides comprehensive documentation for integrating YouTube APIs into the YouTube Yoda platform. We'll cover all major YouTube APIs and best practices for implementation.

## Table of Contents

1. [YouTube Data API v3](#youtube-data-api-v3)
2. [YouTube Analytics API](#youtube-analytics-api)
3. [YouTube Reporting API](#youtube-reporting-api)
4. [Authentication & Authorization](#authentication--authorization)
5. [Rate Limiting & Quotas](#rate-limiting--quotas)
6. [Best Practices](#best-practices)

## YouTube Data API v3

The YouTube Data API lets you incorporate YouTube functionality into your application. You can use the API to fetch search results and to retrieve, insert, update, and delete YouTube resources such as videos, playlists, and channels.

### Key Features

- **Search**: Search for videos, playlists, and channels
- **Videos**: Upload, update, rate, like, and delete videos
- **Playlists**: Create, update, and delete playlists
- **Channels**: Retrieve channel information and statistics
- **Comments**: Moderate and respond to comments
- **Captions**: Manage video captions
- **Live Streaming**: Manage live broadcasts

### Implementation Example

```javascript
// Using YouTube.js library (recommended)
import { Innertube } from 'youtubei.js';

const youtube = await Innertube.create({
  cache: new UniversalCache(true)
});

// Search for videos
const searchResults = await youtube.search('your search query', {
  type: 'video',
  sort_by: 'relevance'
});

// Upload a video
const uploadResponse = await youtube.studio.upload(videoFile, {
  title: 'My Video Title',
  description: 'Video description',
  privacy: 'private',
  tags: ['tag1', 'tag2']
});

// Get video details
const videoInfo = await youtube.getInfo('VIDEO_ID');
```

### Using Official Google API

```javascript
const { google } = require('googleapis');
const youtube = google.youtube('v3');

// Authenticate
const auth = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

// Search videos
const searchResponse = await youtube.search.list({
  auth: auth,
  part: 'snippet',
  q: 'your search query',
  type: 'video',
  maxResults: 25
});

// Upload video
const uploadResponse = await youtube.videos.insert({
  auth: auth,
  part: 'snippet,status',
  requestBody: {
    snippet: {
      title: 'Video Title',
      description: 'Video Description',
      tags: ['tag1', 'tag2'],
      categoryId: '22'
    },
    status: {
      privacyStatus: 'private'
    }
  },
  media: {
    body: fs.createReadStream('video.mp4')
  }
});
```

## YouTube Analytics API

The YouTube Analytics API provides access to YouTube Analytics data, enabling you to retrieve metrics such as views, likes, comments, and watch time for your videos and channel.

### Key Metrics Available

- **Views & Watch Time**: Track video performance
- **Engagement**: Likes, dislikes, comments, shares
- **Traffic Sources**: Where viewers find your videos
- **Demographics**: Age, gender, geography of your audience
- **Playback Locations**: Where videos are watched
- **Revenue**: For monetized channels

### Implementation Example

```javascript
// Get channel analytics
const analyticsResponse = await youtube.reports.query({
  auth: auth,
  ids: 'channel==CHANNEL_ID',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  metrics: 'views,comments,likes,dislikes,estimatedMinutesWatched,averageViewDuration',
  dimensions: 'day',
  sort: 'day'
});

// Get video-specific analytics
const videoAnalytics = await youtube.reports.query({
  auth: auth,
  ids: 'channel==CHANNEL_ID',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  metrics: 'views,estimatedMinutesWatched',
  dimensions: 'video',
  filters: 'video==VIDEO_ID',
  sort: '-views'
});
```

## YouTube Reporting API

The YouTube Reporting API is designed for applications that need to retrieve bulk YouTube Analytics data. Unlike the Analytics API, which provides on-demand queries, the Reporting API generates predefined reports that you can download.

### Key Features

- **Bulk Data Reports**: Download comprehensive analytics data
- **Scheduled Reports**: Automatically generated daily
- **Historical Data**: Access to historical analytics
- **Custom Report Types**: Various report types available

### Available Report Types

1. **Channel Reports**
   - channel_basic_a2
   - channel_demographics_a1
   - channel_device_os_a2
   - channel_traffic_source_a2

2. **Video Reports**
   - video_basic_a3
   - video_geographic_a2
   - video_playback_location_a2

### Implementation Example

```javascript
// List available report types
const reportTypes = await youtube.reportTypes.list({
  auth: auth
});

// Create a reporting job
const job = await youtube.jobs.create({
  auth: auth,
  requestBody: {
    reportTypeId: 'channel_basic_a2',
    name: 'Channel Basic Stats Report'
  }
});

// List and download reports
const reports = await youtube.jobs.reports.list({
  auth: auth,
  jobId: job.data.id
});

// Download report data
const reportData = await downloadReport(reports.data.reports[0].downloadUrl);
```

## Authentication & Authorization

### OAuth 2.0 Flow

```javascript
// 1. Generate auth URL
const authUrl = auth.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtubepartner',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtubepartner-channel-audit'
  ]
});

// 2. Handle callback and get tokens
const { tokens } = await auth.getToken(authorizationCode);
auth.setCredentials(tokens);

// 3. Refresh tokens when needed
if (isTokenExpired(tokens)) {
  const { credentials } = await auth.refreshAccessToken();
  // Save new tokens
}
```

### Service Account Authentication

```javascript
const auth = new google.auth.GoogleAuth({
  keyFile: 'path/to/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/youtube.readonly']
});

const youtube = google.youtube({ version: 'v3', auth });
```

## Rate Limiting & Quotas

### YouTube API Quotas

- **Default Quota**: 10,000 units per day
- **Cost per Operation**:
  - Search: 100 units
  - Video upload: 1600 units
  - Video update: 50 units
  - List operations: 1 unit

### Rate Limiting Strategy

```javascript
class YouTubeAPIClient {
  constructor() {
    this.queue = [];
    this.quotaUsed = 0;
    this.dailyQuota = 10000;
  }

  async executeWithRateLimit(operation, cost) {
    if (this.quotaUsed + cost > this.dailyQuota) {
      throw new Error('Daily quota exceeded');
    }

    // Implement exponential backoff
    let retries = 0;
    while (retries < 3) {
      try {
        const result = await operation();
        this.quotaUsed += cost;
        return result;
      } catch (error) {
        if (error.code === 429) {
          await this.wait(Math.pow(2, retries) * 1000);
          retries++;
        } else {
          throw error;
        }
      }
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Best Practices

### 1. Efficient API Usage

```javascript
// Batch requests when possible
const batchRequest = youtube.newBatchHttpRequest();

videoIds.forEach(id => {
  batchRequest.add(youtube.videos.list({
    part: 'snippet,statistics',
    id: id
  }));
});

const batchResponse = await batchRequest.execute();
```

### 2. Caching Strategy

```javascript
class YouTubeCache {
  constructor(redisClient) {
    this.redis = redisClient;
    this.ttl = 3600; // 1 hour
  }

  async get(key) {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key, value) {
    await this.redis.setex(key, this.ttl, JSON.stringify(value));
  }

  async getVideoInfo(videoId) {
    const cacheKey = `video:${videoId}`;
    let info = await this.get(cacheKey);
    
    if (!info) {
      info = await youtube.videos.list({
        part: 'snippet,statistics',
        id: videoId
      });
      await this.set(cacheKey, info);
    }
    
    return info;
  }
}
```

### 3. Error Handling

```javascript
class YouTubeAPIError extends Error {
  constructor(error) {
    super(error.message);
    this.code = error.code;
    this.errors = error.errors;
  }
}

async function handleYouTubeOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 403) {
      // Handle quota exceeded or forbidden
      console.error('Quota exceeded or forbidden:', error);
    } else if (error.code === 404) {
      // Handle not found
      console.error('Resource not found:', error);
    } else if (error.code === 401) {
      // Handle authentication error
      console.error('Authentication error:', error);
      // Refresh token and retry
    }
    throw new YouTubeAPIError(error);
  }
}
```

### 4. Pagination Handling

```javascript
async function getAllVideos(channelId) {
  let videos = [];
  let nextPageToken = null;

  do {
    const response = await youtube.search.list({
      part: 'id',
      channelId: channelId,
      maxResults: 50,
      pageToken: nextPageToken,
      type: 'video'
    });

    videos = videos.concat(response.data.items);
    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);

  return videos;
}
```

### 5. Data Validation

```javascript
const Joi = require('joi');

const videoUploadSchema = Joi.object({
  title: Joi.string().max(100).required(),
  description: Joi.string().max(5000).required(),
  tags: Joi.array().items(Joi.string()).max(500),
  categoryId: Joi.string().required(),
  privacyStatus: Joi.string().valid('private', 'unlisted', 'public')
});

function validateVideoData(data) {
  const { error, value } = videoUploadSchema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.message}`);
  }
  return value;
}
```

## Advanced Features

### 1. Webhook Integration

```javascript
// Set up webhook for real-time updates
app.post('/youtube/webhook', async (req, res) => {
  const { channelId, videoId, event } = req.body;
  
  switch (event) {
    case 'video.uploaded':
      await processNewVideo(videoId);
      break;
    case 'comment.posted':
      await moderateComment(req.body.comment);
      break;
  }
  
  res.status(200).send('OK');
});
```

### 2. Batch Processing

```javascript
class YouTubeBatchProcessor {
  constructor(concurrency = 5) {
    this.queue = [];
    this.concurrency = concurrency;
  }

  async processBatch(operations) {
    const chunks = this.chunkArray(operations, this.concurrency);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(op => this.processOperation(op)));
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [YouTube Analytics API Documentation](https://developers.google.com/youtube/analytics)
- [YouTube Reporting API Documentation](https://developers.google.com/youtube/reporting)
- [YouTube.js Library](https://github.com/LuanRT/YouTube.js)
- [API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)