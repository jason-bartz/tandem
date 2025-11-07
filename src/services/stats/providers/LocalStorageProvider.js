/**
 * LocalStorageProvider - Local storage sync provider
 *
 * Provides local persistence using browser localStorage or Capacitor Storage.
 * Always available as the ultimate fallback.
 */

import { BaseProvider } from './BaseProvider';
import { Preferences } from '@capacitor/preferences';

export class LocalStorageProvider extends BaseProvider {
  constructor() {
    super('localStorage');
    this.storageKey = 'tandem_game_data_v2';
    this.backupKey = 'tandem_game_data_backup_v2';
    this.useCapacitor = false;
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    console.log('[LocalStorageProvider] Initializing...');

    try {
      // Check if Capacitor Preferences is available
      if (window.Capacitor && Preferences) {
        this.useCapacitor = true;
        console.log('[LocalStorageProvider] Using Capacitor Preferences');
      } else {
        // Check localStorage availability
        const testKey = '__localStorage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        console.log('[LocalStorageProvider] Using browser localStorage');
      }

      this.available = true;
      this.initialized = true;

      // Migrate old data if needed
      await this.migrateOldData();

      console.log('[LocalStorageProvider] Initialized successfully');
    } catch (error) {
      console.error('[LocalStorageProvider] Initialization failed:', error);
      this.available = false;
      throw error;
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    if (this.useCapacitor) {
      try {
        await Preferences.get({ key: '__test__' });
        return true;
      } catch {
        return false;
      }
    }

    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch data from local storage
   */
  async fetch() {
    const startTime = Date.now();

    try {
      console.log('[LocalStorageProvider] Fetching data...');

      let stored;

      if (this.useCapacitor) {
        const result = await Preferences.get({ key: this.storageKey });
        stored = result.value;
      } else {
        stored = localStorage.getItem(this.storageKey);
      }

      if (!stored) {
        console.log('[LocalStorageProvider] No data found');
        return null;
      }

      const data = this.deserialize(stored);

      // Validate data structure
      if (data && typeof data === 'object') {
        this.lastSyncTime = data.timestamp || new Date().toISOString();

        const duration = Date.now() - startTime;
        this.recordFetchTime(duration);

        console.log('[LocalStorageProvider] Data fetched successfully');

        return data;
      }

      return null;
    } catch (error) {
      this.handleError(error, 'fetch');
    }
  }

  /**
   * Save data to local storage
   */
  async save(data) {
    const startTime = Date.now();

    try {
      console.log('[LocalStorageProvider] Saving data...');

      // Validate data
      this.validateData(data);

      // Cleanup old events to prevent quota issues
      const cleanedData = this.cleanupOldEvents(data);

      // Create backup before saving (don't backup if already failing)
      try {
        await this.createBackup();
      } catch (backupError) {
        console.warn('[LocalStorageProvider] Backup failed, continuing with save:', backupError);
      }

      // Add metadata
      const dataToSave = {
        ...cleanedData,
        timestamp: new Date().toISOString(),
        device: await this.getDeviceInfo(),
      };

      const serialized = this.serialize(dataToSave);

      // Check storage quota and proactively clear if needed
      if (!this.useCapacitor) {
        const canSave = await this.checkStorageQuota(serialized.length);
        if (!canSave) {
          // Emergency: clean up other storage items if quota exceeded
          await this.emergencyStorageCleanup();
        }
      }

      // Save to storage
      if (this.useCapacitor) {
        await Preferences.set({
          key: this.storageKey,
          value: serialized,
        });
      } else {
        localStorage.setItem(this.storageKey, serialized);
      }

      this.lastSyncTime = dataToSave.timestamp;

      const duration = Date.now() - startTime;
      this.recordSaveTime(duration);

      console.log('[LocalStorageProvider] Data saved successfully');

      return {
        success: true,
        timestamp: dataToSave.timestamp,
      };
    } catch (error) {
      console.error('[LocalStorageProvider] Save failed:', error);

      // If quota exceeded, try aggressive cleanup and retry ONCE
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        console.warn('[LocalStorageProvider] Quota exceeded, attempting emergency cleanup...');
        try {
          await this.emergencyStorageCleanup();

          // Retry with even more aggressive cleanup
          const minimalData = this.cleanupOldEvents(data, 50); // Keep only 50 events
          const dataToSave = {
            ...minimalData,
            timestamp: new Date().toISOString(),
            device: await this.getDeviceInfo(),
          };

          const serialized = this.serialize(dataToSave);

          if (this.useCapacitor) {
            await Preferences.set({
              key: this.storageKey,
              value: serialized,
            });
          } else {
            localStorage.setItem(this.storageKey, serialized);
          }

          console.log('[LocalStorageProvider] Emergency save successful');
          return {
            success: true,
            timestamp: dataToSave.timestamp,
          };
        } catch (retryError) {
          console.error('[LocalStorageProvider] Emergency save failed:', retryError);
          // Don't restore backup if we're out of quota
          this.handleError(retryError, 'save');
        }
      }

      // Try to restore from backup if save failed (but not for quota errors)
      if (!error.message?.includes('quota') && !error.message?.includes('QuotaExceededError')) {
        await this.restoreFromBackup();
      }

      this.handleError(error, 'save');
    }
  }

  /**
   * Clear all data
   */
  async clear() {
    try {
      console.log('[LocalStorageProvider] Clearing data...');

      if (this.useCapacitor) {
        await Preferences.remove({ key: this.storageKey });
        await Preferences.remove({ key: this.backupKey });
      } else {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.backupKey);
      }

      console.log('[LocalStorageProvider] Data cleared');
      return true;
    } catch (error) {
      console.error('[LocalStorageProvider] Failed to clear data:', error);
      return false;
    }
  }

  /**
   * Create backup before saving
   */
  async createBackup() {
    try {
      if (this.useCapacitor) {
        const current = await Preferences.get({ key: this.storageKey });
        if (current.value) {
          await Preferences.set({
            key: this.backupKey,
            value: current.value,
          });
        }
      } else {
        const current = localStorage.getItem(this.storageKey);
        if (current) {
          localStorage.setItem(this.backupKey, current);
        }
      }

      console.log('[LocalStorageProvider] Backup created');
    } catch (error) {
      console.error('[LocalStorageProvider] Failed to create backup:', error);
      // Continue anyway - backup is not critical
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup() {
    try {
      console.log('[LocalStorageProvider] Restoring from backup...');

      if (this.useCapacitor) {
        const backup = await Preferences.get({ key: this.backupKey });
        if (backup.value) {
          await Preferences.set({
            key: this.storageKey,
            value: backup.value,
          });
        }
      } else {
        const backup = localStorage.getItem(this.backupKey);
        if (backup) {
          localStorage.setItem(this.storageKey, backup);
        }
      }

      console.log('[LocalStorageProvider] Restored from backup');
      return true;
    } catch (error) {
      console.error('[LocalStorageProvider] Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Migrate old data format
   */
  async migrateOldData() {
    try {
      // Check for old format data
      const oldKeys = ['tandemStats', 'tandem_stats', 'gameStats', 'game_stats'];

      for (const oldKey of oldKeys) {
        let oldData;

        if (this.useCapacitor) {
          const result = await Preferences.get({ key: oldKey });
          oldData = result.value;
        } else {
          oldData = localStorage.getItem(oldKey);
        }

        if (oldData) {
          console.log('[LocalStorageProvider] Migrating old data from:', oldKey);

          // Parse old data
          const parsed = this.deserialize(oldData);

          // Convert to new format
          const newFormat = this.convertToNewFormat(parsed);

          // Save in new format
          await this.save(newFormat);

          // Remove old key
          if (this.useCapacitor) {
            await Preferences.remove({ key: oldKey });
          } else {
            localStorage.removeItem(oldKey);
          }

          console.log('[LocalStorageProvider] Migration completed');
          break;
        }
      }
    } catch (error) {
      console.error('[LocalStorageProvider] Migration failed:', error);
      // Continue anyway - migration is not critical
    }
  }

  /**
   * Convert old data format to new format
   */
  convertToNewFormat(oldData) {
    const newFormat = {
      stats: {},
      events: [],
      timestamp: new Date().toISOString(),
      version: 2,
    };

    // Map old stats to new format
    if (oldData.played !== undefined) {
      newFormat.stats.gamesPlayed = oldData.played;
    }

    if (oldData.wins !== undefined) {
      newFormat.stats.gamesWon = oldData.wins;
    }

    if (oldData.currentStreak !== undefined) {
      newFormat.stats.currentStreak = oldData.currentStreak;
    }

    if (oldData.maxStreak !== undefined) {
      newFormat.stats.bestStreak = oldData.maxStreak;
    }

    if (oldData.lastPlayed !== undefined) {
      newFormat.stats.lastPlayedDate = oldData.lastPlayed;
    }

    // Create synthetic events for migration
    if (newFormat.stats.gamesPlayed > 0) {
      newFormat.events.push({
        id: 'migration_' + Date.now(),
        type: 'STATS_MIGRATED',
        timestamp: new Date().toISOString(),
        deviceId: 'migration',
        sessionId: 'migration',
        version: 1,
        data: {
          fromVersion: 1,
          toVersion: 2,
          stats: newFormat.stats,
          synthetic: true,
        },
      });
    }

    return newFormat;
  }

  /**
   * Cleanup old events to keep storage size manageable
   */
  cleanupOldEvents(data, maxEvents = 100) {
    const MAX_EVENTS = maxEvents; // Configurable max events
    const KEEP_DAYS = 90; // Keep events from last 90 days

    if (!data.events || data.events.length <= MAX_EVENTS) {
      return data; // No cleanup needed
    }

    console.log('[LocalStorageProvider] Cleaning up events. Current:', data.events.length);

    try {
      // Sort events by timestamp (newest first)
      const sortedEvents = [...data.events].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Keep recent events
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);

      const recentEvents = sortedEvents.filter((e) => new Date(e.timestamp) > cutoffDate);

      // If we still have too many, take only MAX_EVENTS
      const eventsToKeep = recentEvents.slice(0, MAX_EVENTS);

      console.log('[LocalStorageProvider] Kept', eventsToKeep.length, 'events');

      return {
        ...data,
        events: eventsToKeep,
      };
    } catch (error) {
      console.error('[LocalStorageProvider] Cleanup failed:', error);
      return data; // Return original data on error
    }
  }

  /**
   * Check storage quota
   */
  async checkStorageQuota(dataSize) {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;

        const percentUsed = (usage / quota) * 100;

        console.log(`[LocalStorageProvider] Storage: ${percentUsed.toFixed(2)}% used`);

        // Warn if over 80% used
        if (percentUsed > 80) {
          console.warn('[LocalStorageProvider] Storage quota warning: over 80% used');
        }

        // Check if we have enough space
        if (usage + dataSize > quota) {
          console.error('[LocalStorageProvider] Storage quota would be exceeded');
          return false;
        }

        return true;
      } catch (error) {
        console.error('[LocalStorageProvider] Failed to check storage quota:', error);
        // Continue anyway - quota check is not critical
        return true;
      }
    }

    return true;
  }

  /**
   * Emergency storage cleanup - aggressively remove old data
   */
  async emergencyStorageCleanup() {
    console.warn('[LocalStorageProvider] Running emergency storage cleanup...');

    try {
      // 1. Clean up our own storage keys first
      const keysToClean = [
        this.storageKey,
        this.backupKey,
        'gameEvents',
        'tandem_game_data',
        'tandemStats',
        'tandem_stats',
      ];

      for (const key of keysToClean) {
        try {
          if (this.useCapacitor) {
            const result = await Preferences.get({ key });
            if (result.value) {
              const data = JSON.parse(result.value);
              if (data.events && data.events.length > 50) {
                // Keep only 50 most recent events
                const cleaned = this.cleanupOldEvents(data, 50);
                await Preferences.set({ key, value: JSON.stringify(cleaned) });
                console.log(
                  `[LocalStorageProvider] Cleaned ${key} from ${data.events.length} to 50 events`
                );
              }
            }
          } else {
            const stored = localStorage.getItem(key);
            if (stored) {
              try {
                const data = JSON.parse(stored);
                if (data.events && data.events.length > 50) {
                  // Keep only 50 most recent events
                  const cleaned = this.cleanupOldEvents(data, 50);
                  localStorage.setItem(key, JSON.stringify(cleaned));
                  console.log(
                    `[LocalStorageProvider] Cleaned ${key} from ${data.events.length} to 50 events`
                  );
                }
              } catch (parseError) {
                // If can't parse, remove the key entirely
                localStorage.removeItem(key);
                console.log(`[LocalStorageProvider] Removed corrupted key: ${key}`);
              }
            }
          }
        } catch (keyError) {
          console.warn(`[LocalStorageProvider] Failed to clean ${key}:`, keyError);
        }
      }

      // 2. Remove backup to free space
      try {
        if (this.useCapacitor) {
          await Preferences.remove({ key: this.backupKey });
        } else {
          localStorage.removeItem(this.backupKey);
        }
        console.log('[LocalStorageProvider] Removed backup to free space');
      } catch (e) {
        // Ignore
      }

      console.log('[LocalStorageProvider] Emergency cleanup completed');
    } catch (error) {
      console.error('[LocalStorageProvider] Emergency cleanup failed:', error);
    }
  }

  /**
   * Get device info for debugging
   */
  async getDeviceInfo() {
    const info = {
      platform: 'unknown',
      userAgent: navigator.userAgent || 'unknown',
    };

    if (window.Capacitor && window.Capacitor.Plugins.Device) {
      try {
        const deviceInfo = await window.Capacitor.Plugins.Device.getInfo();
        info.platform = deviceInfo.platform;
        info.model = deviceInfo.model;
        info.osVersion = deviceInfo.osVersion;
      } catch (error) {
        console.error('[LocalStorageProvider] Failed to get device info:', error);
      }
    } else {
      info.platform = 'web';
    }

    return info;
  }

  /**
   * Export data for debugging
   */
  async exportData() {
    try {
      const data = await this.fetch();

      if (!data) {
        return null;
      }

      // Create downloadable blob
      const blob = new Blob([this.serialize(data)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      return {
        url,
        filename: `tandem_backup_${timestamp}.json`,
        size: blob.size,
      };
    } catch (error) {
      console.error('[LocalStorageProvider] Failed to export data:', error);
      return null;
    }
  }

  /**
   * Import data from backup
   */
  async importData(jsonString) {
    try {
      const data = this.deserialize(jsonString);

      // Validate imported data
      this.validateData(data);

      // Save imported data
      await this.save(data);

      return {
        success: true,
        stats: data.stats,
        eventCount: data.events?.length || 0,
      };
    } catch (error) {
      console.error('[LocalStorageProvider] Failed to import data:', error);
      throw error;
    }
  }
}

export default LocalStorageProvider;
