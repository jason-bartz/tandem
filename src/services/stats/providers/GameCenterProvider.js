/**
 * GameCenterProvider - Game Center sync provider
 *
 * Integrates with iOS Game Center for leaderboards and achievements.
 * Serves as the primary source of truth for game statistics on iOS.
 */

import { BaseProvider } from './BaseProvider';
import { registerPlugin } from '@capacitor/core';

// Register the native plugin
const EnhancedGameCenter = registerPlugin('EnhancedGameCenterPlugin', {
  web: () => import('./GameCenterProviderWeb').then((m) => new m.GameCenterProviderWeb()),
});

export class GameCenterProvider extends BaseProvider {
  constructor() {
    super('gameCenter');
    this.authenticated = false;
    this.playerInfo = null;
    this.pendingOperations = [];
  }

  /**
   * Initialize Game Center
   */
  async initialize() {
    console.log('[GameCenterProvider] Initializing...');

    try {
      // Check platform
      if (this.getPlatform() !== 'ios') {
        console.log('[GameCenterProvider] Not available on non-iOS platforms');
        this.available = false;
        this.initialized = false;
        return;
      }

      // Authenticate with Game Center
      const authResult = await this.authenticate();

      if (authResult.authenticated) {
        this.authenticated = true;
        this.playerInfo = {
          playerID: authResult.playerID,
          displayName: authResult.displayName,
          alias: authResult.alias,
        };

        this.available = true;
        this.initialized = true;

        // Process any pending operations
        await this.processPendingOperations();

        console.log('[GameCenterProvider] Initialized successfully');
      } else {
        console.log('[GameCenterProvider] Authentication failed');
        this.available = false;
        this.initialized = false;
      }
    } catch (error) {
      console.error('[GameCenterProvider] Initialization failed:', error);
      this.available = false;
      this.initialized = false;
    }
  }

  /**
   * Authenticate with Game Center
   */
  async authenticate() {
    try {
      const result = await EnhancedGameCenter.authenticateLocalPlayer();
      return result;
    } catch (error) {
      console.error('[GameCenterProvider] Authentication error:', error);
      return { authenticated: false };
    }
  }

  /**
   * Check if Game Center is available
   */
  async isAvailable() {
    if (this.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const result = await EnhancedGameCenter.isAuthenticated();
      this.authenticated = result.authenticated;
      return result.authenticated;
    } catch {
      return false;
    }
  }

  /**
   * Fetch stats from Game Center
   */
  async fetch() {
    const startTime = Date.now();

    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      console.log('[GameCenterProvider] Fetching stats...');

      // Perform comprehensive sync
      const result = await EnhancedGameCenter.syncStatsWithGameCenter();

      if (!result || !result.stats) {
        console.log('[GameCenterProvider] No stats found');
        return null;
      }

      // Convert Game Center format to our format
      const stats = this.convertFromGameCenterFormat(result.stats);

      // Fetch achievements separately if needed
      if (!stats.achievements) {
        const achievementResult = await EnhancedGameCenter.fetchAchievements();
        stats.achievements = achievementResult.achievements || [];
      }

      const data = {
        stats,
        events: [], // Game Center doesn't store events
        timestamp: new Date().toISOString(),
        version: 2,
        source: 'gameCenter',
      };

      this.lastSyncTime = data.timestamp;

      const duration = Date.now() - startTime;
      this.recordFetchTime(duration);

      console.log('[GameCenterProvider] Stats fetched successfully');

      return data;
    } catch (error) {
      this.recordFetchError(error);
      this.handleError(error, 'fetch');
    }
  }

  /**
   * Save stats to Game Center
   */
  async save(data) {
    const startTime = Date.now();

    try {
      if (!this.authenticated) {
        await this.authenticate();
      }

      console.log('[GameCenterProvider] Saving stats...');

      // Validate data
      this.validateData(data);

      const stats = data.stats || {};

      // Submit only to the actual configured leaderboard
      const scoreSubmissions = [];

      // Submit best streak to the "Longest Streak" leaderboard
      // Game Center leaderboards are designed for high scores (historical bests), not current state
      // The leaderboard will automatically keep the highest value ever submitted
      const bestStreak = Math.max(stats.currentStreak || 0, stats.bestStreak || 0);
      if (bestStreak > 0) {
        scoreSubmissions.push({
          leaderboardID: 'longestStreak', // Use the key, not the full ID
          score: bestStreak,
        });

        console.log(
          '[GameCenterProvider] Submitting best streak:',
          bestStreak,
          'to leaderboard: longestStreak (com.tandemdaily.app.longest_streak)'
        );
      }

      // Note: Other stats (games played, wins, etc.) are synced via CloudKit only
      // since there are no Game Center leaderboards configured for them

      // Batch submit scores
      if (scoreSubmissions.length > 0) {
        await EnhancedGameCenter.batchSubmitScores({
          scores: scoreSubmissions,
        });
      }

      // Report achievements
      await this.reportAchievements(stats);

      this.lastSyncTime = new Date().toISOString();

      const duration = Date.now() - startTime;
      this.recordSaveTime(duration);

      console.log('[GameCenterProvider] Stats saved successfully');

      return {
        success: true,
        timestamp: this.lastSyncTime,
      };
    } catch (error) {
      this.recordSaveError(error);

      // Queue for retry if not authenticated
      if (!this.authenticated) {
        this.queueOperation('save', data);
      }

      this.handleError(error, 'save');
    }
  }

  /**
   * Report achievements based on stats
   */
  async reportAchievements(stats) {
    const achievements = [];

    // First win achievement
    if (stats.gamesWon >= 1) {
      achievements.push({
        achievementID: 'firstWin',
        percentComplete: 100,
      });
    }

    // Win milestones
    const winMilestones = [
      { count: 10, id: 'wins10' },
      { count: 50, id: 'wins50' },
      { count: 100, id: 'wins100' },
    ];

    for (const milestone of winMilestones) {
      if (stats.gamesWon >= milestone.count) {
        achievements.push({
          achievementID: milestone.id,
          percentComplete: 100,
        });
      }
    }

    // Streak achievements
    const streakMilestones = [
      { days: 7, id: 'streak7' },
      { days: 30, id: 'streak30' },
      { days: 90, id: 'streak90' },
      { days: 365, id: 'streak365' },
    ];

    const bestStreak = Math.max(stats.currentStreak || 0, stats.bestStreak || 0);

    for (const milestone of streakMilestones) {
      if (bestStreak >= milestone.days) {
        achievements.push({
          achievementID: milestone.id,
          percentComplete: 100,
        });
      } else if (stats.currentStreak > 0) {
        // Report partial progress
        const progress = (stats.currentStreak / milestone.days) * 100;
        achievements.push({
          achievementID: milestone.id,
          percentComplete: Math.min(progress, 99),
        });
      }
    }

    // Report all achievements
    for (const achievement of achievements) {
      try {
        await EnhancedGameCenter.reportAchievement(achievement);
      } catch (error) {
        console.error(
          '[GameCenterProvider] Failed to report achievement:',
          achievement.achievementID,
          error
        );
      }
    }
  }

  /**
   * Convert Game Center format to our standard format
   *
   * IMPORTANT: Game Center leaderboards store HIGH SCORES (historical bests),
   * not current state. The longest_streak leaderboard represents the player's
   * best streak ever achieved, which is used for competitive ranking.
   *
   * Following Apple HIG, currentStreak comes from CloudKit/localStorage,
   * which track actual current state and can reset when streaks break.
   */
  convertFromGameCenterFormat(gameCenterStats) {
    // Game Center only provides bestStreak (historical high score from leaderboard)
    // All other stats, including currentStreak, come from CloudKit/localStorage
    return {
      gamesPlayed: 0, // Synced via CloudKit
      gamesWon: 0, // Synced via CloudKit
      currentStreak: 0, // MUST come from CloudKit/localStorage - not Game Center
      bestStreak: gameCenterStats.longest_streak || gameCenterStats.bestStreak || 0,
      lastStreakDate: gameCenterStats.lastStreakDate,
      winRate: 0, // Synced via CloudKit
      achievements: gameCenterStats.achievements || [],
      totalTime: 0, // Synced via CloudKit
      totalMistakes: 0, // Synced via CloudKit
      hintsUsed: 0, // Synced via CloudKit
      puzzlesCompleted: [],
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
    };
  }

  /**
   * Clear Game Center data (not typically supported)
   */
  async clear() {
    console.warn('[GameCenterProvider] Game Center data cannot be cleared programmatically');
    return false;
  }

  /**
   * Queue operation for later execution
   */
  queueOperation(type, data) {
    this.pendingOperations.push({ type, data, timestamp: Date.now() });
    console.log('[GameCenterProvider] Operation queued:', type);
  }

  /**
   * Process pending operations
   */
  async processPendingOperations() {
    if (this.pendingOperations.length === 0) return;

    console.log(
      '[GameCenterProvider] Processing',
      this.pendingOperations.length,
      'pending operations'
    );

    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'save':
            await this.save(op.data);
            break;
          case 'fetch':
            await this.fetch();
            break;
          default:
            console.warn('[GameCenterProvider] Unknown operation type:', op.type);
        }
      } catch (error) {
        console.error('[GameCenterProvider] Failed to process pending operation:', error);
        // Re-queue if it's a network error
        if (this.isNetworkError(error)) {
          this.pendingOperations.push(op);
        }
      }
    }
  }

  /**
   * Get platform
   */
  getPlatform() {
    if (window.Capacitor) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  /**
   * Get debug information
   */
  async getDebugInfo() {
    try {
      const info = await EnhancedGameCenter.getDebugInfo();
      return {
        ...info,
        provider: this.name,
        pendingOperations: this.pendingOperations.length,
      };
    } catch (error) {
      return {
        provider: this.name,
        error: error.message,
      };
    }
  }

  /**
   * Listen for Game Center events
   */
  setupEventListeners() {
    // Listen for authentication changes
    window.addEventListener('gameCenterAuthenticated', (event) => {
      console.log('[GameCenterProvider] Authentication status changed:', event.detail);
      this.authenticated = event.detail.authenticated;

      if (this.authenticated) {
        this.processPendingOperations();
      }
    });
  }
}

export default GameCenterProvider;
