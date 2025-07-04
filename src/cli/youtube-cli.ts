#!/usr/bin/env node

/**
 * YouTube CLI - Command Line Interface for YouTube Channel Management
 * Control your YouTube channel directly from the terminal
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import { YouTubeAPIClient } from '../services/youtube/YouTubeAPIClient';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import open from 'open';

// Load environment variables
config();

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════════╗
║       YouTube CLI Control Center          ║
║         Manage Your Channel              ║
╚══════════════════════════════════════════╝
`;

class YouTubeCLI {
  private client?: YouTubeAPIClient;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.env.HOME || '', '.youtube-cli-config.json');
  }

  async initialize() {
    console.log(chalk.cyan(banner));
    
    // Load saved credentials
    const config = await this.loadConfig();
    
    if (config.accessToken && config.refreshToken) {
      this.client = new YouTubeAPIClient({
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        accessToken: config.accessToken,
        refreshToken: config.refreshToken
      });
    }
  }

  async loadConfig(): Promise<any> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveConfig(config: any) {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  async authenticate() {
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      console.error(chalk.red('❌ Missing YouTube API credentials in .env file'));
      process.exit(1);
    }

    const tempClient = new YouTubeAPIClient({
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET
    });

    const authUrl = tempClient.getAuthUrl();
    console.log(chalk.yellow('\n📋 Opening browser for authentication...'));
    await open(authUrl);

    const { code } = await inquirer.prompt([{
      type: 'input',
      name: 'code',
      message: 'Enter the authorization code from browser:'
    }]);

    const spinner = ora('Authenticating...').start();
    
    try {
      const tokens = await tempClient.getTokens(code);
      await this.saveConfig(tokens);
      spinner.succeed('Authentication successful!');
      
      this.client = tempClient;
    } catch (error) {
      spinner.fail('Authentication failed');
      console.error(error);
    }
  }

  async ensureAuthenticated() {
    if (!this.client) {
      console.log(chalk.yellow('⚠️  Not authenticated. Please run: youtube-cli auth'));
      process.exit(1);
    }
  }

  // Channel Information Commands
  async showChannelInfo() {
    await this.ensureAuthenticated();
    const spinner = ora('Fetching channel info...').start();

    try {
      const channel = await this.client!.getMyChannel();
      spinner.stop();

      console.log(chalk.green('\n📺 Channel Information\n'));
      
      const table = new Table({
        head: ['Property', 'Value'],
        style: { head: ['cyan'] }
      });

      table.push(
        ['Name', channel.snippet?.title || 'N/A'],
        ['Subscribers', channel.statistics?.subscriberCount || '0'],
        ['Total Views', channel.statistics?.viewCount || '0'],
        ['Video Count', channel.statistics?.videoCount || '0'],
        ['Description', (channel.snippet?.description || 'No description').substring(0, 50) + '...']
      );

      console.log(table.toString());
    } catch (error) {
      spinner.fail('Failed to fetch channel info');
      console.error(error);
    }
  }

  // Video Management Commands
  async listVideos(options: { limit?: number; search?: string }) {
    await this.ensureAuthenticated();
    const spinner = ora('Fetching videos...').start();

    try {
      const response = await this.client!.search(options.search || '', {
        type: 'video',
        maxResults: options.limit || 10,
        order: 'date'
      });

      spinner.stop();
      
      if (!response.items || response.items.length === 0) {
        console.log(chalk.yellow('No videos found'));
        return;
      }

      console.log(chalk.green(`\n📹 Videos (${response.items.length} results)\n`));

      const table = new Table({
        head: ['Title', 'Video ID', 'Published', 'Views'],
        style: { head: ['cyan'] },
        colWidths: [50, 15, 20, 10]
      });

      for (const item of response.items) {
        if (item.id?.videoId) {
          const video = await this.client!.getVideo(item.id.videoId);
          table.push([
            (item.snippet?.title || 'Untitled').substring(0, 47),
            item.id.videoId,
            new Date(item.snippet?.publishedAt || '').toLocaleDateString(),
            video.statistics?.viewCount || '0'
          ]);
        }
      }

      console.log(table.toString());
    } catch (error) {
      spinner.fail('Failed to fetch videos');
      console.error(error);
    }
  }

  async uploadVideo(videoPath: string, options: any) {
    await this.ensureAuthenticated();
    
    const metadata = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Video title:',
        default: options.title || path.basename(videoPath, path.extname(videoPath))
      },
      {
        type: 'editor',
        name: 'description',
        message: 'Video description:',
        default: options.description || ''
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated):',
        default: options.tags || ''
      },
      {
        type: 'list',
        name: 'privacy',
        message: 'Privacy setting:',
        choices: ['private', 'unlisted', 'public'],
        default: options.privacy || 'private'
      }
    ]);

    const spinner = ora('Uploading video...').start();
    
    try {
      const video = await this.client!.uploadVideo(videoPath, {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        privacyStatus: metadata.privacy
      }, (progress) => {
        spinner.text = `Uploading... ${progress.toFixed(2)}%`;
      });

      spinner.succeed(`Video uploaded successfully!`);
      console.log(chalk.green(`\n✅ Video ID: ${video.id}`));
      console.log(chalk.green(`🔗 URL: https://youtube.com/watch?v=${video.id}`));
    } catch (error) {
      spinner.fail('Upload failed');
      console.error(error);
    }
  }

  async updateVideo(videoId: string, options: any) {
    await this.ensureAuthenticated();
    const spinner = ora('Updating video...').start();

    try {
      const updates: any = {};
      if (options.title) updates.title = options.title;
      if (options.description) updates.description = options.description;
      if (options.tags) updates.tags = options.tags.split(',').map((t: string) => t.trim());
      if (options.privacy) updates.privacyStatus = options.privacy;

      await this.client!.updateVideo(videoId, updates);
      spinner.succeed('Video updated successfully!');
    } catch (error) {
      spinner.fail('Update failed');
      console.error(error);
    }
  }

  async deleteVideo(videoId: string) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete video ${videoId}?`,
      default: false
    }]);

    if (!confirm) return;

    await this.ensureAuthenticated();
    const spinner = ora('Deleting video...').start();

    try {
      await this.client!.deleteVideo(videoId);
      spinner.succeed('Video deleted successfully!');
    } catch (error) {
      spinner.fail('Delete failed');
      console.error(error);
    }
  }

  // Analytics Commands
  async showAnalytics(videoId?: string) {
    await this.ensureAuthenticated();
    const spinner = ora('Fetching analytics...').start();

    try {
      if (videoId) {
        const video = await this.client!.getVideo(videoId);
        spinner.stop();

        console.log(chalk.green(`\n📊 Video Analytics: ${video.snippet?.title}\n`));

        const table = new Table({
          head: ['Metric', 'Value'],
          style: { head: ['cyan'] }
        });

        table.push(
          ['Views', video.statistics?.viewCount || '0'],
          ['Likes', video.statistics?.likeCount || '0'],
          ['Comments', video.statistics?.commentCount || '0'],
          ['Duration', video.contentDetails?.duration || 'N/A']
        );

        console.log(table.toString());
      } else {
        // Channel analytics
        const channel = await this.client!.getMyChannel();
        spinner.stop();

        console.log(chalk.green('\n📊 Channel Analytics\n'));

        const table = new Table({
          head: ['Metric', 'Value'],
          style: { head: ['cyan'] }
        });

        table.push(
          ['Total Views', channel.statistics?.viewCount || '0'],
          ['Subscribers', channel.statistics?.subscriberCount || '0'],
          ['Videos', channel.statistics?.videoCount || '0'],
          ['Comments', channel.statistics?.commentCount || '0']
        );

        console.log(table.toString());
      }
    } catch (error) {
      spinner.fail('Failed to fetch analytics');
      console.error(error);
    }
  }

  // Interactive Mode
  async interactive() {
    await this.ensureAuthenticated();

    while (true) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          '📺 View Channel Info',
          '📹 List Videos',
          '⬆️  Upload Video',
          '✏️  Update Video',
          '🗑️  Delete Video',
          '📊 View Analytics',
          '💬 Manage Comments',
          '🎬 Manage Playlists',
          '🔍 Search',
          '❌ Exit'
        ]
      }]);

      switch (action) {
        case '📺 View Channel Info':
          await this.showChannelInfo();
          break;
        case '📹 List Videos':
          await this.listVideos({});
          break;
        case '📊 View Analytics':
          await this.showAnalytics();
          break;
        case '❌ Exit':
          console.log(chalk.yellow('\n👋 Goodbye!'));
          process.exit(0);
        default:
          console.log(chalk.red('Feature not implemented yet'));
      }

      console.log('\n');
    }
  }
}

// Initialize CLI
const program = new Command();
const cli = new YouTubeCLI();

program
  .name('youtube-cli')
  .description('YouTube Channel Management CLI')
  .version('1.0.0');

// Authentication command
program
  .command('auth')
  .description('Authenticate with YouTube')
  .action(async () => {
    await cli.initialize();
    await cli.authenticate();
  });

// Channel commands
program
  .command('channel')
  .description('Show channel information')
  .action(async () => {
    await cli.initialize();
    await cli.showChannelInfo();
  });

// Video commands
const video = program.command('video');

video
  .command('list')
  .description('List videos')
  .option('-l, --limit <number>', 'Number of videos to show', '10')
  .option('-s, --search <query>', 'Search query')
  .action(async (options) => {
    await cli.initialize();
    await cli.listVideos({
      limit: parseInt(options.limit),
      search: options.search
    });
  });

video
  .command('upload <file>')
  .description('Upload a video')
  .option('-t, --title <title>', 'Video title')
  .option('-d, --description <desc>', 'Video description')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('-p, --privacy <privacy>', 'Privacy setting (private/unlisted/public)')
  .action(async (file, options) => {
    await cli.initialize();
    await cli.uploadVideo(file, options);
  });

video
  .command('update <videoId>')
  .description('Update video metadata')
  .option('-t, --title <title>', 'New title')
  .option('-d, --description <desc>', 'New description')
  .option('--tags <tags>', 'New tags (comma-separated)')
  .option('-p, --privacy <privacy>', 'New privacy setting')
  .action(async (videoId, options) => {
    await cli.initialize();
    await cli.updateVideo(videoId, options);
  });

video
  .command('delete <videoId>')
  .description('Delete a video')
  .action(async (videoId) => {
    await cli.initialize();
    await cli.deleteVideo(videoId);
  });

// Analytics command
program
  .command('analytics [videoId]')
  .description('Show analytics for channel or specific video')
  .action(async (videoId) => {
    await cli.initialize();
    await cli.showAnalytics(videoId);
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    await cli.initialize();
    await cli.interactive();
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}