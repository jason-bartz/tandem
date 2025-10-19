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

      // Create backup before saving
      await this.createBackup();

      // Add metadata
      const dataToSave = {
        ...data,
        timestamp: new Date().toISOString(),
        device: await this.getDeviceInfo()
      };

      const serialized = this.serialize(dataToSave);

      // Check storage quota
      if (!this.useCapacitor) {
        await this.checkStorageQuota(serialized.length);
      }

      // Save to storage
      if (this.useCapacitor) {
        await Preferences.set({
          key: this.storageKey,
          value: serialized
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
        timestamp: dataToSave.timestamp
      };
    } catch (error) {
      // Try to restore from backup if save failed
      await this.restoreFromBackup();
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
            value: current.value
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
            value: backup.value
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
      const oldKeys = [
        'tandemStats',
        'tandem_stats',
        'gameStats',
        'game_stats'
      ];

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
      version: 2
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
          synthetic: true
        }
      });
    }

    return newFormat;
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
          throw new Error('Storage quota exceeded');
        }
      } catch (error) {
        console.error('[LocalStorageProvider] Failed to check storage quota:', error);
        // Continue anyway - quota check is not critical
      }
    }
  }

  /**
   * Get device info for debugging
   */
  async getDeviceInfo() {
    const info = {
      platform: 'unknown',
      userAgent: navigator.userAgent || 'unknown'
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
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      return {
        url,
        filename: `tandem_backup_${timestamp}.json`,
        size: blob.size
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
        eventCount: data.events?.length || 0
      };
    } catch (error) {
      console.error('[LocalStorageProvider] Failed to import data:', error);
      throw error;
    }
  }
}

export default LocalStorageProvider;