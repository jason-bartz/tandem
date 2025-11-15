/**
 * CloudKitProvider - CloudKit sync provider
 *
 * Integrates with iCloud CloudKit for comprehensive data sync.
 * Provides event storage, conflict resolution, and offline support.
 */

import { BaseProvider } from './BaseProvider';
import { registerPlugin } from '@capacitor/core';

// Register the native plugin
const CloudKitSync = registerPlugin('CloudKitSyncPlugin', {
  web: () => import('./CloudKitProviderWeb').then((m) => new m.CloudKitProviderWeb()),
});

export class CloudKitProvider extends BaseProvider {
  constructor() {
    super('cloudKit');
    this.accountStatus = 'unknown';
    this.syncQueue = [];
    this.isSyncing = false;
    this.retryTimer = null;
    this.maxRetries = 3;
  }

  /**
   * Initialize CloudKit
   */
  async initialize() {
    try {
      // Check account status
      const status = await this.checkAccountStatus();

      if (status.available) {
        this.accountStatus = status.status;
        this.available = true;
        this.initialized = true;

        // Process any queued operations
        await this.processSyncQueue();
      } else {
        this.accountStatus = status.status;
        this.available = false;
        this.initialized = true;
      }
    } catch (error) {
      console.error('[CloudKitProvider] Initialization failed:', error);
      this.available = false;
      this.initialized = false;
    }
  }

  /**
   * Check iCloud account status
   */
  async checkAccountStatus() {
    try {
      const result = await CloudKitSync.checkAccountStatus();
      return result;
    } catch (error) {
      console.error('[CloudKitProvider] Account status check failed:', error);
      return { available: false, status: 'error' };
    }
  }

  /**
   * Check if CloudKit is available
   */
  async isAvailable() {
    try {
      const status = await this.checkAccountStatus();
      this.available = status.available;
      return status.available;
    } catch {
      return false;
    }
  }

  /**
   * Fetch data from CloudKit
   */
  async fetch() {
    const startTime = Date.now();

    try {
      // Check availability
      if (!this.available) {
        const status = await this.checkAccountStatus();
        if (!status.available) {
          throw new Error('iCloud not available');
        }
        this.available = true;
      }

      // Fetch stats
      const statsResult = await CloudKitSync.fetchStats();
      const stats = statsResult.stats || {};

      // Fetch puzzle results (events)
      const resultsResult = await CloudKitSync.fetchPuzzleResults({});
      const puzzleResults = resultsResult.results || [];

      // Convert puzzle results to events
      const events = this.convertPuzzleResultsToEvents(puzzleResults);

      // Fetch preferences
      const prefsResult = await CloudKitSync.fetchPreferences();
      const preferences = prefsResult.preferences || {};

      // Combine all data
      const data = {
        stats: this.convertFromCloudKitFormat(stats),
        events,
        preferences,
        timestamp: new Date().toISOString(),
        version: 2,
        source: 'cloudKit',
      };

      this.lastSyncTime = data.timestamp;

      const duration = Date.now() - startTime;
      this.recordFetchTime(duration);

      return data;
    } catch (error) {
      this.recordFetchError(error);

      if (this.isQuotaError(error)) {
        console.error('[CloudKitProvider] CloudKit quota exceeded');
        // Try to clean up old data
        await this.cleanupOldData();
      }

      if (this.isAuthError(error)) {
        this.available = false;
        this.accountStatus = 'noAccount';
      }

      this.handleError(error, 'fetch');
    }
  }

  /**
   * Save data to CloudKit
   */
  async save(data) {
    const startTime = Date.now();

    try {
      // Check availability
      if (!this.available) {
        const status = await this.checkAccountStatus();
        if (!status.available) {
          throw new Error('iCloud not available');
        }
        this.available = true;
      }

      // Validate data
      this.validateData(data);

      // Queue operation if already syncing
      if (this.isSyncing) {
        this.queueSync(data);
        return { success: true, queued: true };
      }

      this.isSyncing = true;

      // Save stats
      if (data.stats) {
        const cloudKitStats = this.convertToCloudKitFormat(data.stats);
        await CloudKitSync.syncStats({ stats: cloudKitStats });
      }

      // Save events as puzzle results
      if (data.events && data.events.length > 0) {
        await this.saveEvents(data.events);
      }

      // Save preferences if available
      if (data.preferences) {
        await CloudKitSync.syncPreferences({ preferences: data.preferences });
      }

      this.lastSyncTime = new Date().toISOString();

      const duration = Date.now() - startTime;
      this.recordSaveTime(duration);

      this.isSyncing = false;

      // Process any queued syncs
      await this.processSyncQueue();

      return {
        success: true,
        timestamp: this.lastSyncTime,
      };
    } catch (error) {
      this.isSyncing = false;
      this.recordSaveError(error);

      // Retry on network errors
      if (this.isNetworkError(error)) {
        this.scheduleRetry(data);
      }

      this.handleError(error, 'save');
    }
  }

  /**
   * Save events to CloudKit
   */
  async saveEvents(events) {
    const gameCompletedEvents = events.filter((e) => e.type === 'GAME_COMPLETED');

    for (const event of gameCompletedEvents) {
      try {
        const puzzleResult = {
          date: event.data.puzzleDate,
          won: event.data.won,
          mistakes: event.data.mistakes || 0,
          solved: event.data.won ? 6 : event.data.wordsGuessed?.length || 0,
          hintsUsed: event.data.hintsUsed || 0,
          timestamp: event.timestamp,
        };

        await CloudKitSync.syncPuzzleResult({
          date: puzzleResult.date,
          result: puzzleResult,
        });
      } catch (error) {
        console.error('[CloudKitProvider] Failed to save puzzle result:', error);
        // Continue with other events
      }
    }
  }

  /**
   * Convert from CloudKit format to standard format
   */
  convertFromCloudKitFormat(cloudKitStats) {
    return {
      gamesPlayed: cloudKitStats.played || 0,
      gamesWon: cloudKitStats.wins || 0,
      currentStreak: cloudKitStats.currentStreak || 0,
      bestStreak: cloudKitStats.bestStreak || 0,
      lastStreakDate: cloudKitStats.lastStreakDate,
      lastPlayedDate: cloudKitStats.lastStreakDate,
      totalTime: 0, // CloudKit doesn't store time directly
      totalMistakes: 0, // CloudKit doesn't store total mistakes
      hintsUsed: 0, // CloudKit doesn't store total hints
      winRate:
        cloudKitStats.wins && cloudKitStats.played
          ? (cloudKitStats.wins / cloudKitStats.played) * 100
          : 0,
      achievements: [],
      puzzlesCompleted: [],
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
    };
  }

  /**
   * Convert to CloudKit format
   */
  convertToCloudKitFormat(stats) {
    return {
      played: stats.gamesPlayed || 0,
      wins: stats.gamesWon || 0,
      currentStreak: stats.currentStreak || 0,
      bestStreak: stats.bestStreak || 0,
      lastStreakDate: stats.lastStreakDate || stats.lastPlayedDate,
    };
  }

  /**
   * Convert puzzle results to events
   */
  convertPuzzleResultsToEvents(puzzleResults) {
    return puzzleResults.map((result) => ({
      id: `cloudkit_${result.date}_${result.timestamp || Date.now()}`,
      type: 'GAME_COMPLETED',
      timestamp: result.timestamp || new Date().toISOString(),
      deviceId: 'cloudkit',
      sessionId: 'cloudkit',
      version: 1,
      data: {
        puzzleDate: result.date,
        won: result.won,
        mistakes: result.mistakes || 0,
        hintsUsed: result.hintsUsed || 0,
        time: 0, // Not stored in CloudKit
        wordsGuessed: [],
      },
    }));
  }

  /**
   * Clear CloudKit data
   */
  async clear() {
    try {
      await CloudKitSync.clearCloudData();

      return true;
    } catch (error) {
      console.error('[CloudKitProvider] Failed to clear data:', error);
      return false;
    }
  }

  /**
   * Queue sync operation
   */
  queueSync(data) {
    this.syncQueue.push({
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0 || this.isSyncing) return;

    const item = this.syncQueue.shift();

    if (item) {
      try {
        await this.save(item.data);
      } catch (error) {
        console.error('[CloudKitProvider] Failed to process queued sync:', error);

        // Re-queue if retry count not exceeded
        if (item.retryCount < this.maxRetries) {
          item.retryCount++;
          this.syncQueue.unshift(item);
        }
      }
    }

    // Process next item if available
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  /**
   * Schedule retry
   */
  scheduleRetry(data) {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    const delay = Math.min(5000 * Math.pow(2, this.stats.saveErrors), 60000);

    this.retryTimer = setTimeout(() => {
      this.save(data).catch((error) => {
        console.error('[CloudKitProvider] Retry failed:', error);
      });
    }, delay);
  }

  /**
   * Clean up old data to free space
   */
  async cleanupOldData() {
    try {
      // Fetch old puzzle results
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const endDate = thirtyDaysAgo.toISOString().split('T')[0];

      const result = await CloudKitSync.fetchPuzzleResults({
        endDate,
      });

      if (result.results && result.results.length > 0) {
        // CloudKit doesn't provide direct deletion API in current implementation
        // Would need to enhance native plugin for cleanup
      }
    } catch (error) {
      console.error('[CloudKitProvider] Cleanup failed:', error);
    }
  }

  /**
   * Perform full sync
   */
  async performFullSync() {
    try {
      const result = await CloudKitSync.performFullSync();

      return result;
    } catch (error) {
      console.error('[CloudKitProvider] Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      ...super.getStatus(),
      accountStatus: this.accountStatus,
      queueSize: this.syncQueue.length,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Monitor account status changes
   */
  startAccountMonitoring() {
    // Check account status periodically
    setInterval(async () => {
      const oldStatus = this.accountStatus;
      const status = await this.checkAccountStatus();

      if (status.status !== oldStatus) {
        this.accountStatus = status.status;
        this.available = status.available;

        // Process queue if became available
        if (status.available && this.syncQueue.length > 0) {
          await this.processSyncQueue();
        }
      }
    }, 60000); // Check every minute
  }
}

export default CloudKitProvider;
