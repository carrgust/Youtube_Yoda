/**
 * YouTube API Client
 * Main client for interacting with YouTube APIs
 */

import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Innertube, UniversalCache } from 'youtubei.js';
import { YouTubeConfig, calculateQuotaCost, willExceedQuota } from '../../config/youtube.config';
import { RateLimiter } from '../../utils/RateLimiter';
import { CacheManager } from '../../utils/CacheManager';
import { Logger } from '../../utils/Logger';

interface YouTubeAPIClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface VideoUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'public' | 'unlisted';
  publishAt?: Date;
  thumbnail?: Buffer | string;
  notifySubscribers?: boolean;
}

interface SearchOptions {
  type?: 'video' | 'channel' | 'playlist';
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount';
  maxResults?: number;
  pageToken?: string;
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  videoDuration?: 'short' | 'medium' | 'long';
}

export class YouTubeAPIClient {
  private oauth2Client: OAuth2Client;
  private youtube: youtube_v3.Youtube;
  private innertube?: Innertube;
  private rateLimiter: RateLimiter;
  private cache: CacheManager;
  private logger: Logger;
  private quotaUsage: number = 0;
  private quotaResetTime: Date;

  constructor(config: YouTubeAPIClientConfig) {
    // Initialize OAuth2 client
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri || YouTubeConfig.auth.redirectUri
    );

    // Set credentials if available
    if (config.accessToken && config.refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken
      });
    }

    // Initialize YouTube API client
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client
    });

    // Initialize utilities
    this.rateLimiter = new RateLimiter(YouTubeConfig.rateLimits.requestsPerSecond);
    this.cache = new CacheManager();
    this.logger = new Logger('YouTubeAPIClient');
    
    // Set quota reset time (midnight Pacific Time)
    this.quotaResetTime = this.getNextQuotaReset();
    
    // Initialize Innertube for additional features
    this.initializeInnertube();
  }

  /**
   * Initialize Innertube client for enhanced YouTube functionality
   */
  private async initializeInnertube(): Promise<void> {
    try {
      this.innertube = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true
      });
      this.logger.info('Innertube client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Innertube:', error);
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: YouTubeConfig.auth.accessType,
      scope: YouTubeConfig.auth.scopes,
      prompt: YouTubeConfig.auth.prompt
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!
    };
  }

  /**
   * Set OAuth2 credentials
   */
  setCredentials(accessToken: string, refreshToken: string): void {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  /**
   * Search for videos, channels, or playlists
   */
  async search(query: string, options: SearchOptions = {}): Promise<youtube_v3.Schema$SearchListResponse> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    await this.checkQuota({ search: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: options.type ? [options.type] : ['video'],
        order: options.order || 'relevance',
        maxResults: options.maxResults || 50,
        pageToken: options.pageToken,
        publishedAfter: options.publishedAfter?.toISOString(),
        publishedBefore: options.publishedBefore?.toISOString(),
        regionCode: options.regionCode,
        videoDuration: options.videoDuration
      });

      await this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour
      return response.data;
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get video details
   */
  async getVideo(videoId: string): Promise<youtube_v3.Schema$Video> {
    const cacheKey = `video:${videoId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    await this.checkQuota({ list: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails', 'status'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      await this.cache.set(cacheKey, video, 3600);
      return video;
    } catch (error) {
      this.logger.error('Get video failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Upload a video
   */
  async uploadVideo(
    videoPath: string,
    options: VideoUploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<youtube_v3.Schema$Video> {
    await this.checkQuota({ upload: 1 });
    
    try {
      const fileSize = await this.getFileSize(videoPath);
      
      const requestBody: youtube_v3.Schema$Video = {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags,
          categoryId: options.categoryId || '22' // People & Blogs
        },
        status: {
          privacyStatus: options.privacyStatus || 'private',
          publishAt: options.publishAt?.toISOString(),
          selfDeclaredMadeForKids: false
        }
      };

      // Use resumable upload for reliability
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        notifySubscribers: options.notifySubscribers || false,
        requestBody,
        media: {
          body: require('fs').createReadStream(videoPath)
        }
      }, {
        onUploadProgress: (evt) => {
          const progress = (evt.bytesRead / fileSize) * 100;
          onProgress?.(progress);
          this.logger.info(`Upload progress: ${progress.toFixed(2)}%`);
        }
      });

      const video = response.data;

      // Upload thumbnail if provided
      if (options.thumbnail && video.id) {
        await this.setThumbnail(video.id, options.thumbnail);
      }

      return video;
    } catch (error) {
      this.logger.error('Video upload failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Update video metadata
   */
  async updateVideo(
    videoId: string,
    updates: Partial<VideoUploadOptions>
  ): Promise<youtube_v3.Schema$Video> {
    await this.checkQuota({ update: 1 });
    await this.rateLimiter.acquire();

    try {
      // First get the current video data
      const currentVideo = await this.getVideo(videoId);

      const requestBody: youtube_v3.Schema$Video = {
        id: videoId,
        snippet: {
          ...currentVideo.snippet,
          title: updates.title || currentVideo.snippet?.title,
          description: updates.description || currentVideo.snippet?.description,
          tags: updates.tags || currentVideo.snippet?.tags,
          categoryId: updates.categoryId || currentVideo.snippet?.categoryId
        },
        status: {
          ...currentVideo.status,
          privacyStatus: updates.privacyStatus || currentVideo.status?.privacyStatus,
          publishAt: updates.publishAt?.toISOString() || currentVideo.status?.publishAt
        }
      };

      const response = await this.youtube.videos.update({
        part: ['snippet', 'status'],
        requestBody
      });

      // Update thumbnail if provided
      if (updates.thumbnail) {
        await this.setThumbnail(videoId, updates.thumbnail);
      }

      // Clear cache
      await this.cache.delete(`video:${videoId}`);

      return response.data;
    } catch (error) {
      this.logger.error('Video update failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<void> {
    await this.checkQuota({ delete: 1 });
    await this.rateLimiter.acquire();

    try {
      await this.youtube.videos.delete({ id: videoId });
      await this.cache.delete(`video:${videoId}`);
      this.logger.info(`Video ${videoId} deleted successfully`);
    } catch (error) {
      this.logger.error('Video deletion failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get channel details
   */
  async getChannel(channelId: string): Promise<youtube_v3.Schema$Channel> {
    const cacheKey = `channel:${channelId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    await this.checkQuota({ list: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails', 'brandingSettings'],
        id: [channelId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = response.data.items[0];
      await this.cache.set(cacheKey, channel, 3600);
      return channel;
    } catch (error) {
      this.logger.error('Get channel failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get my channel details
   */
  async getMyChannel(): Promise<youtube_v3.Schema$Channel> {
    const cacheKey = 'channel:mine';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    await this.checkQuota({ list: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails', 'brandingSettings'],
        mine: true
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = response.data.items[0];
      await this.cache.set(cacheKey, channel, 300); // Cache for 5 minutes
      return channel;
    } catch (error) {
      this.logger.error('Get my channel failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get channel videos
   */
  async getChannelVideos(
    channelId: string,
    maxResults: number = 50,
    pageToken?: string
  ): Promise<youtube_v3.Schema$SearchListResponse> {
    return this.search('', {
      type: 'video',
      maxResults,
      pageToken,
      order: 'date'
    });
  }

  /**
   * Create a playlist
   */
  async createPlaylist(
    title: string,
    description: string,
    privacyStatus: 'private' | 'public' | 'unlisted' = 'private'
  ): Promise<youtube_v3.Schema$Playlist> {
    await this.checkQuota({ insert: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description
          },
          status: {
            privacyStatus
          }
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Create playlist failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Add video to playlist
   */
  async addToPlaylist(playlistId: string, videoId: string): Promise<youtube_v3.Schema$PlaylistItem> {
    await this.checkQuota({ insert: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId
            }
          }
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Add to playlist failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get video comments
   */
  async getVideoComments(
    videoId: string,
    maxResults: number = 100,
    pageToken?: string
  ): Promise<youtube_v3.Schema$CommentThreadListResponse> {
    await this.checkQuota({ list: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.commentThreads.list({
        part: ['snippet', 'replies'],
        videoId,
        maxResults,
        pageToken,
        order: 'relevance'
      });

      return response.data;
    } catch (error) {
      this.logger.error('Get comments failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    parentId: string,
    text: string
  ): Promise<youtube_v3.Schema$Comment> {
    await this.checkQuota({ insert: 1 });
    await this.rateLimiter.acquire();

    try {
      const response = await this.youtube.comments.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            parentId,
            textOriginal: text
          }
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Reply to comment failed:', error);
      throw this.handleAPIError(error);
    }
  }

  /**
   * Set video thumbnail
   */
  private async setThumbnail(videoId: string, thumbnail: Buffer | string): Promise<void> {
    await this.checkQuota({ thumbnailSet: 1 });
    await this.rateLimiter.acquire();

    try {
      const media = {
        mimeType: 'image/jpeg',
        body: typeof thumbnail === 'string' 
          ? require('fs').createReadStream(thumbnail)
          : thumbnail
      };

      await this.youtube.thumbnails.set({
        videoId,
        media
      });

      this.logger.info(`Thumbnail set for video ${videoId}`);
    } catch (error) {
      this.logger.error('Set thumbnail failed:', error);
      // Don't throw - thumbnail failure shouldn't fail the entire upload
    }
  }

  /**
   * Check and update quota usage
   */
  private async checkQuota(operations: Record<string, number>): Promise<void> {
    // Reset quota if past reset time
    if (new Date() > this.quotaResetTime) {
      this.quotaUsage = 0;
      this.quotaResetTime = this.getNextQuotaReset();
    }

    const cost = calculateQuotaCost(operations);
    
    if (willExceedQuota(this.quotaUsage, operations)) {
      throw new Error(YouTubeConfig.errors.quotaExceeded);
    }

    this.quotaUsage += cost;
    this.logger.info(`Quota used: ${this.quotaUsage}/${YouTubeConfig.rateLimits.quotaLimit}`);
  }

  /**
   * Get next quota reset time (midnight Pacific Time)
   */
  private getNextQuotaReset(): Date {
    const now = new Date();
    const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    pacific.setHours(24, 0, 0, 0);
    return pacific;
  }

  /**
   * Get file size for upload progress tracking
   */
  private async getFileSize(filePath: string): Promise<number> {
    const stats = await require('fs').promises.stat(filePath);
    return stats.size;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleAPIError(error: any): Error {
    if (error.response?.status === 403) {
      if (error.response.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        return new Error(YouTubeConfig.errors.quotaExceeded);
      }
      return new Error(YouTubeConfig.errors.invalidCredentials);
    }
    
    if (error.response?.status === 404) {
      return new Error(YouTubeConfig.errors.videoNotFound);
    }
    
    if (error.response?.status === 429) {
      return new Error(YouTubeConfig.errors.rateLimitExceeded);
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new Error(YouTubeConfig.errors.networkError);
    }
    
    return error;
  }

  /**
   * Use Innertube for enhanced features (if available)
   */
  async getEnhancedVideoInfo(videoId: string): Promise<any> {
    if (!this.innertube) {
      throw new Error('Innertube client not initialized');
    }

    try {
      const info = await this.innertube.getInfo(videoId);
      return {
        basic: info.basic_info,
        streaming: info.streaming_data,
        captions: info.captions,
        storyboards: info.storyboards,
        endscreen: info.endscreen,
        cards: info.cards
      };
    } catch (error) {
      this.logger.error('Enhanced video info failed:', error);
      throw error;
    }
  }

  /**
   * Get video transcript using Innertube
   */
  async getVideoTranscript(videoId: string): Promise<any> {
    if (!this.innertube) {
      throw new Error('Innertube client not initialized');
    }

    try {
      const info = await this.innertube.getInfo(videoId);
      const transcriptData = await info.getTranscript();
      return transcriptData;
    } catch (error) {
      this.logger.error('Get transcript failed:', error);
      throw error;
    }
  }
}