/**
 * KeyValueStoreProvider - NSUbiquitousKeyValueStore sync provider
 *
 * Uses iCloud Key-Value storage for lightweight, fast sync of critical data.
 * Limited to 1MB total, ideal for current streak and preferences.
 */

import { BaseProvider } from './BaseProvider';
import { registerPlugin } from '@capacitor/core';
import logger from '@/lib/logger';

// Register the native plugin for KeyValueStore
const KeyValueStore = registerPlugin('KeyValueStorePlugin', {
  web: () => import('./KeyValueStoreProviderWeb').then((m) => new m.KeyValueStoreProviderWeb()),
});

export class KeyValueStoreProvider extends BaseProvider {
  constructor() {
    super('keyValueStore');

    // Key-Value store has strict limits
    this.limits = {
      maxKeyLength: 64,
      maxValueSize: 1024 * 64, // 64KB per value
      maxTotalSize: 1024 * 1024, // 1MB total
      maxKeys: 1024,
    };

    // Keys for lightweight data
    this.keys = {
      currentStreak: 'tandem_current_streak',
      lastPlayedDate: 'tandem_last_played',
      bestStreak: 'tandem_best_streak',
      lastStreakDate: 'tandem_last_streak_date',
      gamesPlayed: 'tandem_games_played',
      gamesWon: 'tandem_games_won',
      soundEnabled: 'tandem_sound_enabled',
      theme: 'tandem_theme',
      themeMode: 'tandem_theme_mode',
      syncToken: 'tandem_sync_token',
      lastSyncTime: 'tandem_last_sync',
    };

    this.changeHandlers = new Set();
    this.isListening = false;
  }

  /**
   * Initialize KeyValueStore
   */
  async initialize() {
    try {
      // Check platform
      if (this.getPlatform() !== 'ios') {
        this.available = false;
        this.initialized = false;
        return;
      }

      const available = await this.checkAvailability();

      if (available) {
        this.available = true;
        this.initialized = true;

        // Start listening for changes
        this.startListening();

        // Perform initial sync
        await this.synchronize();
      } else {
        this.available = false;
        this.initialized = false;
      }
    } catch (error) {
      logger.error('[KeyValueStoreProvider] Initialization failed', error);
      this.available = false;
      this.initialized = false;
    }
  }

  /**
   * Check if KeyValueStore is available
   */
  async checkAvailability() {
    try {
      // Try to read a test key
      await KeyValueStore.getValue({ key: '__test__' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    return this.available && this.getPlatform() === 'ios';
  }

  /**
   * Fetch data from KeyValueStore
   */
  async fetch() {
    const startTime = Date.now();

    try {
      // Synchronize with iCloud first
      await this.synchronize();

      // Fetch all relevant keys
      const values = {};

      for (const [name, key] of Object.entries(this.keys)) {
        try {
          const result = await KeyValueStore.getValue({ key });
          if (result.value !== null && result.value !== undefined) {
            values[name] = this.parseValue(result.value);
          }
        } catch (error) {
          logger.error(`[KeyValueStoreProvider] Failed to fetch ${name}`, error);
        }
      }

      if (Object.keys(values).length === 0) {
        return null;
      }

      // Convert to standard format
      const stats = {
        currentStreak: values.currentStreak || 0,
        bestStreak: values.bestStreak || 0,
        gamesPlayed: values.gamesPlayed || 0,
        gamesWon: values.gamesWon || 0,
        lastPlayedDate: values.lastPlayedDate,
        lastStreakDate: values.lastStreakDate,
        winRate: values.gamesPlayed > 0 ? (values.gamesWon / values.gamesPlayed) * 100 : 0,
      };

      const preferences = {
        soundEnabled: values.soundEnabled !== false,
        theme: values.theme || 'light',
        themeMode: values.themeMode || 'auto',
      };

      const data = {
        stats,
        preferences,
        events: [], // KeyValueStore doesn't store events
        timestamp: values.lastSyncTime || new Date().toISOString(),
        version: 2,
        source: 'keyValueStore',
      };

      this.lastSyncTime = data.timestamp;

      const duration = Date.now() - startTime;
      this.recordFetchTime(duration);

      return data;
    } catch (error) {
      this.recordFetchError(error);
      this.handleError(error, 'fetch');
    }
  }

  /**
   * Save data to KeyValueStore
   */
  async save(data) {
    const startTime = Date.now();

    try {
      // Validate data
      this.validateData(data);

      const stats = data.stats || {};
      const preferences = data.preferences || {};

      // Save critical stats
      const saveOperations = [];

      // Stats
      if (stats.currentStreak !== undefined) {
        saveOperations.push(this.setValue(this.keys.currentStreak, stats.currentStreak));
      }

      if (stats.bestStreak !== undefined) {
        saveOperations.push(this.setValue(this.keys.bestStreak, stats.bestStreak));
      }

      if (stats.gamesPlayed !== undefined) {
        saveOperations.push(this.setValue(this.keys.gamesPlayed, stats.gamesPlayed));
      }

      if (stats.gamesWon !== undefined) {
        saveOperations.push(this.setValue(this.keys.gamesWon, stats.gamesWon));
      }

      if (stats.lastPlayedDate !== undefined) {
        saveOperations.push(this.setValue(this.keys.lastPlayedDate, stats.lastPlayedDate));
      }

      if (stats.lastStreakDate !== undefined) {
        saveOperations.push(this.setValue(this.keys.lastStreakDate, stats.lastStreakDate));
      }

      // Preferences
      if (preferences.soundEnabled !== undefined) {
        saveOperations.push(this.setValue(this.keys.soundEnabled, preferences.soundEnabled));
      }

      if (preferences.theme !== undefined) {
        saveOperations.push(this.setValue(this.keys.theme, preferences.theme));
      }

      if (preferences.themeMode !== undefined) {
        saveOperations.push(this.setValue(this.keys.themeMode, preferences.themeMode));
      }

      // Sync metadata
      const syncTime = new Date().toISOString();
      saveOperations.push(this.setValue(this.keys.lastSyncTime, syncTime));

      // Generate sync token
      const syncToken = this.generateSyncToken(data);
      saveOperations.push(this.setValue(this.keys.syncToken, syncToken));

      // Execute all save operations
      await Promise.all(saveOperations);

      // Synchronize with iCloud
      await this.synchronize();

      this.lastSyncTime = syncTime;

      const duration = Date.now() - startTime;
      this.recordSaveTime(duration);

      return {
        success: true,
        timestamp: syncTime,
      };
    } catch (error) {
      this.recordSaveError(error);

      if (this.isQuotaError(error)) {
        logger.error('[KeyValueStoreProvider] Quota exceeded, cleaning up...', null);
        await this.cleanup();
      }

      this.handleError(error, 'save');
    }
  }

  /**
   * Set a value in KeyValueStore
   */
  async setValue(key, value) {
    // Check key length
    if (key.length > this.limits.maxKeyLength) {
      throw new Error(`Key too long: ${key.length} > ${this.limits.maxKeyLength}`);
    }

    // Serialize value
    const serialized = this.serializeValue(value);

    // Check value size
    if (serialized.length > this.limits.maxValueSize) {
      throw new Error(`Value too large: ${serialized.length} > ${this.limits.maxValueSize}`);
    }

    await KeyValueStore.setValue({ key, value: serialized });
  }

  /**
   * Serialize value for storage
   */
  serializeValue(value) {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  /**
   * Parse value from storage
   */
  parseValue(value) {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try to parse as number
      if (!isNaN(value)) {
        return Number(value);
      }

      // Parse booleans
      if (value === 'true') return true;
      if (value === 'false') return false;

      // Return as string
      return value;
    }
  }

  /**
   * Synchronize with iCloud
   */
  async synchronize() {
    try {
      await KeyValueStore.synchronize();
    } catch (error) {
      logger.error('[KeyValueStoreProvider] Synchronization failed', error);
    }
  }

  /**
   * Start listening for changes
   */
  startListening() {
    if (this.isListening) return;

    KeyValueStore.addListener('keyValueStoreDidChange', (event) => {
      this.handleStoreChange(event);
    });

    this.isListening = true;
  }

  /**
   * Handle store change event
   */
  handleStoreChange(event) {
    const { changeReason, changedKeys } = event;

    switch (changeReason) {
      case 'serverChange':
        // Remote changes detected

        this.mergeRemoteChanges(changedKeys);
        break;

      case 'initialSync':
        // Initial sync from iCloud

        this.loadInitialData();
        break;

      case 'quotaViolation':
        // Quota exceeded
        logger.error('[KeyValueStoreProvider] Quota violation', null);
        this.handleQuotaViolation();
        break;

      case 'accountChange':
        // iCloud account changed

        this.handleAccountChange();
        break;
    }

    // Notify change handlers
    this.notifyChangeHandlers(changeReason, changedKeys);
  }

  /**
   * Merge remote changes
   */
  async mergeRemoteChanges(changedKeys) {
    // Fetch updated values and notify
    const changes = {};

    for (const key of changedKeys) {
      try {
        const result = await KeyValueStore.getValue({ key });
        changes[key] = this.parseValue(result.value);
      } catch (error) {
        logger.error(`[KeyValueStoreProvider] Failed to fetch changed key ${key}`, error);
      }
    }

    // Notify about changes
    this.notifyChangeHandlers('remoteChange', changes);
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      const data = await this.fetch();
      if (data) {
        this.notifyChangeHandlers('initialData', data);
      }
    } catch (error) {
      logger.error('[KeyValueStoreProvider] Failed to load initial data', error);
    }
  }

  /**
   * Handle quota violation
   */
  async handleQuotaViolation() {
    logger.error('[KeyValueStoreProvider] Handling quota violation', null);

    // Clean up old or less important data
    await this.cleanup();

    // Notify about quota issue
    this.notifyChangeHandlers('quotaViolation', {});
  }

  /**
   * Handle account change
   */
  async handleAccountChange() {
    // Re-initialize
    await this.initialize();

    // Notify about account change
    this.notifyChangeHandlers('accountChange', {});
  }

  /**
   * Clean up to free space
   */
  async cleanup() {
    // Remove non-critical keys
    const nonCriticalKeys = [this.keys.syncToken, this.keys.theme, this.keys.themeMode];

    for (const key of nonCriticalKeys) {
      try {
        await KeyValueStore.removeValue({ key });
      } catch (error) {
        logger.error(`[KeyValueStoreProvider] Failed to remove ${key}`, error);
      }
    }
  }

  /**
   * Clear all data
   */
  async clear() {
    try {
      for (const key of Object.values(this.keys)) {
        await KeyValueStore.removeValue({ key });
      }

      await this.synchronize();

      return true;
    } catch (error) {
      logger.error('[KeyValueStoreProvider] Failed to clear data', error);
      return false;
    }
  }

  /**
   * Generate sync token
   */
  generateSyncToken(data) {
    const stats = data.stats || {};
    const key = `${stats.gamesPlayed}_${stats.gamesWon}_${stats.currentStreak}`;

    // Simple hash for sync token
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return String(Math.abs(hash));
  }

  /**
   * Add change handler
   */
  onStoreChange(handler) {
    this.changeHandlers.add(handler);

    return () => {
      this.changeHandlers.delete(handler);
    };
  }

  /**
   * Notify change handlers
   */
  notifyChangeHandlers(reason, data) {
    for (const handler of this.changeHandlers) {
      try {
        handler(reason, data);
      } catch (error) {
        logger.error('[KeyValueStoreProvider] Change handler error', error);
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
   * Get storage info
   */
  async getStorageInfo() {
    try {
      const info = await KeyValueStore.getStorageInfo();
      return {
        ...info,
        limits: this.limits,
      };
    } catch (error) {
      return {
        error: error.message,
        limits: this.limits,
      };
    }
  }
}

export default KeyValueStoreProvider;
