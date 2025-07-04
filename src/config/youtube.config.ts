/**
 * YouTube API Configuration
 * Central configuration for all YouTube-related services
 */

export const YouTubeConfig = {
  // API Endpoints
  api: {
    dataAPI: {
      version: 'v3',
      baseURL: 'https://www.googleapis.com/youtube/v3',
      endpoints: {
        search: '/search',
        videos: '/videos',
        channels: '/channels',
        playlists: '/playlists',
        playlistItems: '/playlistItems',
        comments: '/comments',
        commentThreads: '/commentThreads',
        activities: '/activities',
        subscriptions: '/subscriptions',
        thumbnails: '/thumbnails/set'
      }
    },
    analyticsAPI: {
      version: 'v2',
      baseURL: 'https://youtubeanalytics.googleapis.com/v2',
      endpoints: {
        reports: '/reports'
      }
    },
    reportingAPI: {
      version: 'v1',
      baseURL: 'https://youtubereporting.googleapis.com/v1',
      endpoints: {
        reportTypes: '/reportTypes',
        jobs: '/jobs',
        reports: '/reports'
      }
    }
  },

  // OAuth2 Configuration
  auth: {
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtubepartner',
      'https://www.googleapis.com/auth/youtubepartner-channel-audit',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
    ],
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/auth/youtube/callback',
    accessType: 'offline',
    prompt: 'consent'
  },

  // Rate Limiting Configuration
  rateLimits: {
    quotaLimit: 10000, // Daily quota units
    requestsPerSecond: 10,
    costPerOperation: {
      search: 100,
      list: 1,
      insert: 50,
      update: 50,
      delete: 50,
      upload: 1600,
      thumbnailSet: 50
    }
  },

  // Upload Configuration
  upload: {
    maxFileSize: 128 * 1024 * 1024 * 1024, // 128GB
    allowedFormats: [
      '.MOV', '.MPEG4', '.MP4', '.AVI', '.WMV',
      '.MPEGPS', '.FLV', '.3GPP', '.WebM', '.DNxHR', '.ProRes',
      '.CineForm', '.HEVC'
    ],
    chunkSize: 5 * 1024 * 1024, // 5MB chunks for resumable upload
    maxRetries: 3,
    retryDelay: 1000 // milliseconds
  },

  // Thumbnail Configuration
  thumbnail: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    minResolution: { width: 640, height: 360 },
    recommendedResolution: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    allowedFormats: ['.JPG', '.GIF', '.PNG']
  },

  // Content Restrictions
  content: {
    title: {
      maxLength: 100,
      minLength: 1
    },
    description: {
      maxLength: 5000,
      minLength: 0
    },
    tags: {
      maxCount: 500, // Total characters for all tags
      maxPerTag: 30
    },
    playlist: {
      maxVideos: 200,
      titleMaxLength: 150
    }
  },

  // Analytics Configuration
  analytics: {
    dimensions: [
      'day', 'month', 'video', 'country', 'deviceType',
      'operatingSystem', 'ageGroup', 'gender', 'sharingService',
      'subscribedStatus'
    ],
    metrics: [
      'views', 'estimatedMinutesWatched', 'averageViewDuration',
      'likes', 'dislikes', 'comments', 'shares', 'subscribersGained',
      'subscribersLost', 'videosAddedToPlaylists', 'videosRemovedFromPlaylists'
    ],
    reportTypes: [
      'channel_basic_a2',
      'channel_demographics_a1',
      'channel_device_os_a2',
      'channel_playback_location_a2',
      'channel_traffic_source_a2',
      'video_basic_a3'
    ]
  },

  // Categories
  categories: {
    '1': 'Film & Animation',
    '2': 'Autos & Vehicles',
    '10': 'Music',
    '15': 'Pets & Animals',
    '17': 'Sports',
    '18': 'Short Movies',
    '19': 'Travel & Events',
    '20': 'Gaming',
    '21': 'Videoblogging',
    '22': 'People & Blogs',
    '23': 'Comedy',
    '24': 'Entertainment',
    '25': 'News & Politics',
    '26': 'Howto & Style',
    '27': 'Education',
    '28': 'Science & Technology',
    '29': 'Nonprofits & Activism',
    '30': 'Movies',
    '31': 'Anime/Animation',
    '32': 'Action/Adventure',
    '33': 'Classics',
    '34': 'Comedy',
    '35': 'Documentary',
    '36': 'Drama',
    '37': 'Family',
    '38': 'Foreign',
    '39': 'Horror',
    '40': 'Sci-Fi/Fantasy',
    '41': 'Thriller',
    '42': 'Shorts',
    '43': 'Shows',
    '44': 'Trailers'
  },

  // Privacy Settings
  privacy: {
    private: 'private',
    public: 'public',
    unlisted: 'unlisted'
  },

  // Error Messages
  errors: {
    quotaExceeded: 'Daily quota limit exceeded. Please try again tomorrow.',
    invalidCredentials: 'Invalid YouTube credentials. Please re-authenticate.',
    videoNotFound: 'Video not found or you do not have permission to access it.',
    uploadFailed: 'Video upload failed. Please check file format and size.',
    thumbnailFailed: 'Thumbnail upload failed. Please check image requirements.',
    rateLimitExceeded: 'Too many requests. Please slow down.',
    invalidRequest: 'Invalid request parameters.',
    networkError: 'Network error. Please check your connection.'
  },

  // Default Values
  defaults: {
    videosPerPage: 50,
    commentsPerPage: 100,
    searchResultsPerPage: 50,
    uploadPrivacy: 'private',
    uploadNotifySubscribers: false,
    analyticsStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    analyticsEndDate: new Date()
  }
};

// Environment-specific overrides
export const getYouTubeConfig = () => {
  const config = { ...YouTubeConfig };
  
  if (process.env.NODE_ENV === 'production') {
    config.auth.redirectUri = process.env.YOUTUBE_REDIRECT_URI!;
    config.rateLimits.requestsPerSecond = 50; // Higher limit for production
  }
  
  return config;
};

// Helper function to calculate quota cost
export const calculateQuotaCost = (operations: Record<string, number>): number => {
  let totalCost = 0;
  
  for (const [operation, count] of Object.entries(operations)) {
    const cost = YouTubeConfig.rateLimits.costPerOperation[operation as keyof typeof YouTubeConfig.rateLimits.costPerOperation] || 1;
    totalCost += cost * count;
  }
  
  return totalCost;
};

// Helper to check if quota will be exceeded
export const willExceedQuota = (currentUsage: number, plannedOperations: Record<string, number>): boolean => {
  const plannedCost = calculateQuotaCost(plannedOperations);
  return (currentUsage + plannedCost) > YouTubeConfig.rateLimits.quotaLimit;
};