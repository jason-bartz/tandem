import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import logger from '@/utils/helpers/logger';

/**
 * CloudKit Sync Service
 *
 * Provides cross-platform iCloud sync functionality for Tandem
 * - Automatically syncs game stats, puzzle results, and preferences
 * - Handles offline/online transitions gracefully
 * - Implements retry logic with exponential backoff
 * - Falls back to local-only mode if iCloud is unavailable
 */
class CloudKitService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.isIOS = Capacitor.getPlatform() === 'ios';
    this.iCloudAvailable = false;
    this.syncEnabled = false;
    this.syncQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
    this.lastSyncTime = null;

    // Initialize CloudKit plugin if on iOS
    if (this.isNative && this.isIOS) {
      this.plugin = Capacitor.Plugins.CloudKitSync;
      this.checkiCloudStatus();
    }
  }

  /**
   * Check if iCloud account is available and sync is enabled
   */
  async checkiCloudStatus() {
    if (!this.isNative || !this.isIOS || !this.plugin) {
      return false;
    }

    try {
      const result = await this.plugin.checkAccountStatus();
      this.iCloudAvailable = result.available;

      // Check if user has enabled sync in preferences
      const { value } = await Preferences.get({ key: 'cloudkit_sync_enabled' });
      this.syncEnabled = this.iCloudAvailable && (value === null || value === 'true');

      logger.info('iCloud status:', {
        available: this.iCloudAvailable,
        syncEnabled: this.syncEnabled,
        status: result.status,
      });

      return this.syncEnabled;
    } catch (error) {
      logger.error('Failed to check iCloud status:', error);
      this.iCloudAvailable = false;
      this.syncEnabled = false;
      return false;
    }
  }

  /**
   * Enable or disable CloudKit sync
   */
  async setSyncEnabled(enabled) {
    if (!this.isNative || !this.isIOS) {
      return;
    }

    try {
      await Preferences.set({
        key: 'cloudkit_sync_enabled',
        value: enabled ? 'true' : 'false',
      });

      this.syncEnabled = enabled && this.iCloudAvailable;
      logger.info('CloudKit sync', enabled ? 'enabled' : 'disabled');

      // If enabling, perform initial sync
      if (this.syncEnabled) {
        await this.performFullSync();
      }
    } catch (error) {
      logger.error('Failed to set sync enabled:', error);
    }
  }

  /**
   * Check if sync is currently available
   */
  isSyncAvailable() {
    return this.isNative && this.isIOS && this.iCloudAvailable && this.syncEnabled;
  }

  /**
   * Sync user statistics to iCloud
   */
  async syncStats(stats) {
    if (!this.isSyncAvailable()) {
      logger.debug('CloudKit sync not available, skipping stats sync');
      return { success: false, localOnly: true };
    }

    try {
      const result = await this.executeWithRetry(() => this.plugin.syncStats({ stats }));

      logger.info('Stats synced to iCloud:', result);
      this.lastSyncTime = new Date();

      // Return the merged stats from CloudKit if available
      if (result && result.mergedStats) {
        return {
          success: true,
          result,
          mergedStats: result.mergedStats
        };
      }

      return { success: true, result };
    } catch (error) {
      logger.error('Failed to sync stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch user statistics from iCloud
   */
  async fetchStats() {
    if (!this.isSyncAvailable()) {
      return null;
    }

    try {
      const result = await this.executeWithRetry(() => this.plugin.fetchStats());

      if (result && result.stats) {
        logger.info('Stats fetched from iCloud:', result.stats);
        return result.stats;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
      return null;
    }
  }

  /**
   * Sync puzzle result to iCloud
   */
  async syncPuzzleResult(date, result) {
    if (!this.isSyncAvailable()) {
      logger.debug('CloudKit sync not available, skipping puzzle result sync');
      return { success: false, localOnly: true };
    }

    try {
      const syncResult = await this.executeWithRetry(() =>
        this.plugin.syncPuzzleResult({ date, result })
      );

      logger.info('Puzzle result synced to iCloud:', { date, result });
      this.lastSyncTime = new Date();
      return { success: true, result: syncResult };
    } catch (error) {
      logger.error('Failed to sync puzzle result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch puzzle results from iCloud
   */
  async fetchPuzzleResults(startDate = null, endDate = null) {
    if (!this.isSyncAvailable()) {
      return [];
    }

    try {
      const result = await this.executeWithRetry(() =>
        this.plugin.fetchPuzzleResults({ startDate, endDate })
      );

      if (result && result.results) {
        logger.info('Puzzle results fetched from iCloud:', result.results.length);
        return result.results;
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch puzzle results:', error);
      return [];
    }
  }

  /**
   * Sync puzzle progress to iCloud
   */
  async syncPuzzleProgress(date, progress) {
    if (!this.isSyncAvailable()) {
      logger.debug('CloudKit sync not available, skipping puzzle progress sync');
      return { success: false, localOnly: true };
    }

    try {
      const result = await this.executeWithRetry(() =>
        this.plugin.syncPuzzleProgress({ date, progress })
      );

      logger.debug('Puzzle progress synced to iCloud:', { date, progress });
      this.lastSyncTime = new Date();
      return { success: true, result };
    } catch (error) {
      logger.error('Failed to sync puzzle progress:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch puzzle progress from iCloud
   */
  async fetchPuzzleProgress(date) {
    if (!this.isSyncAvailable()) {
      return null;
    }

    try {
      const result = await this.executeWithRetry(() => this.plugin.fetchPuzzleProgress({ date }));

      if (result && result.progress) {
        logger.info('Puzzle progress fetched from iCloud:', result.progress);
        return result.progress;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch puzzle progress:', error);
      return null;
    }
  }

  /**
   * Sync user preferences to iCloud
   */
  async syncPreferences(preferences) {
    if (!this.isSyncAvailable()) {
      logger.debug('CloudKit sync not available, skipping preferences sync');
      return { success: false, localOnly: true };
    }

    try {
      const result = await this.executeWithRetry(() =>
        this.plugin.syncPreferences({ preferences })
      );

      logger.info('Preferences synced to iCloud:', preferences);
      this.lastSyncTime = new Date();
      return { success: true, result };
    } catch (error) {
      logger.error('Failed to sync preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch user preferences from iCloud
   */
  async fetchPreferences() {
    if (!this.isSyncAvailable()) {
      return null;
    }

    try {
      const result = await this.executeWithRetry(() => this.plugin.fetchPreferences());

      if (result && result.preferences) {
        logger.info('Preferences fetched from iCloud:', result.preferences);
        return result.preferences;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch preferences:', error);
      return null;
    }
  }

  /**
   * Perform a full sync of all data from iCloud
   * Used on first launch or when restoring from iCloud
   */
  async performFullSync() {
    if (!this.isSyncAvailable()) {
      logger.warn('CloudKit sync not available for full sync');
      return {
        success: false,
        message: 'iCloud sync not available',
      };
    }

    try {
      logger.info('Starting full CloudKit sync...');

      const [stats, preferences, puzzleResults] = await Promise.allSettled([
        this.fetchStats(),
        this.fetchPreferences(),
        this.fetchPuzzleResults(),
      ]);

      const syncData = {
        stats: stats.status === 'fulfilled' ? stats.value : null,
        preferences: preferences.status === 'fulfilled' ? preferences.value : null,
        puzzleResults: puzzleResults.status === 'fulfilled' ? puzzleResults.value : [],
      };

      logger.info('Full sync completed:', {
        statsFound: !!syncData.stats,
        preferencesFound: !!syncData.preferences,
        puzzleResultsCount: syncData.puzzleResults.length,
      });

      this.lastSyncTime = new Date();

      return {
        success: true,
        data: syncData,
      };
    } catch (error) {
      logger.error('Full sync failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear all cloud data for this device
   */
  async clearCloudData() {
    if (!this.isSyncAvailable()) {
      return { success: false, message: 'iCloud sync not available' };
    }

    try {
      const result = await this.plugin.clearCloudData();
      logger.info('Cloud data cleared');
      return { success: true, result };
    } catch (error) {
      logger.error('Failed to clear cloud data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a function with exponential backoff retry logic
   */
  async executeWithRetry(fn, retries = this.maxRetries) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          logger.debug(`Retry ${i + 1}/${retries} after ${delay}ms:`, error.message);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }

  /**
   * Get sync status for UI
   */
  getSyncStatus() {
    return {
      available: this.iCloudAvailable,
      enabled: this.syncEnabled,
      lastSync: this.lastSyncTime,
      isNative: this.isNative,
      isIOS: this.isIOS,
    };
  }
}

// Export singleton instance
const cloudKitService = new CloudKitService();
export default cloudKitService;
