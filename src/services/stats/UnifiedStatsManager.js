/**
 * UnifiedStatsManager - Central stats management system
 *
 * Single source of truth for all stats operations across different providers.
 * Handles sync coordination, conflict resolution, and failover between providers.
 *
 * Following Apple HIG and professional game development standards.
 */

import { gameEventStore, EventTypes } from '../events/GameEventStore';
import { ConflictResolver } from './ConflictResolver';
import { GameCenterProvider } from './providers/GameCenterProvider';
import { CloudKitProvider } from './providers/CloudKitProvider';
import { LocalStorageProvider } from './providers/LocalStorageProvider';
import { KeyValueStoreProvider } from './providers/KeyValueStoreProvider';

// Stats manager states
export const SyncState = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  RESOLVING_CONFLICT: 'resolvingConflict',
  ERROR: 'error',
  OFFLINE: 'offline',
};

// Sync priorities
export const SyncPriority = {
  HIGH: 'high', // User-initiated sync
  NORMAL: 'normal', // Auto sync
  LOW: 'low', // Background sync
};

class UnifiedStatsManager {
  constructor() {
    this.providers = {};
    this.primary = null;
    this.secondary = null;
    this.tertiary = null;

    this.conflictResolver = new ConflictResolver();
    this.syncState = SyncState.IDLE;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.syncQueue = [];
    this.retryQueue = [];
    this.listeners = new Set();

    this.config = {
      autoSync: true,
      syncInterval: 300000, // 5 minutes
      retryInterval: 60000, // 1 minute
      maxRetries: 3,
      conflictResolutionStrategy: 'smart',
      enableOfflineMode: true,
      syncBatchSize: 100,
      syncTimeout: 30000, // 30 seconds
    };

    this.stats = {
      syncAttempts: 0,
      syncSuccesses: 0,
      syncFailures: 0,
      conflictsResolved: 0,
      conflictsManual: 0,
      lastError: null,
      averageSyncTime: 0,
    };

    this.isInitialized = false;
  }

  /**
   * Initialize the stats manager
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await gameEventStore.initialize();

      await this.initializeProviders();

      // Determine primary and secondary providers
      await this.selectProviders();

      // Load initial data
      await this.loadInitialData();

      // Start sync services
      this.startSyncServices();

      // Subscribe to event store
      this.subscribeToEvents();

      this.isInitialized = true;

      // Trigger initial sync
      if (this.config.autoSync) {
        setTimeout(() => this.sync(SyncPriority.LOW), 2000);
      }
    } catch (error) {
      console.error('[UnifiedStatsManager] Initialization failed:', error);
      this.stats.lastError = error;
      this.updateSyncState(SyncState.ERROR);
      throw error;
    }
  }

  /**
   * Initialize all providers
   */
  async initializeProviders() {
    this.providers = {
      gameCenter: new GameCenterProvider(),
      cloudKit: new CloudKitProvider(),
      localStorage: new LocalStorageProvider(),
      keyValueStore: new KeyValueStoreProvider(),
    };

    const initPromises = Object.entries(this.providers).map(async ([name, provider]) => {
      try {
        await provider.initialize();
      } catch (error) {
        console.error(`[UnifiedStatsManager] Failed to initialize ${name}:`, error);
        provider.available = false;
      }
    });

    await Promise.allSettled(initPromises);
  }

  /**
   * Select primary and secondary providers based on availability
   */
  async selectProviders() {
    const platform = this.getPlatform();

    if (platform === 'ios') {
      // iOS: Game Center primary, CloudKit secondary, KeyValue tertiary
      if (await this.providers.gameCenter.isAvailable()) {
        this.primary = this.providers.gameCenter;
      }

      if (await this.providers.cloudKit.isAvailable()) {
        this.secondary = this.primary ? this.providers.cloudKit : this.providers.gameCenter;
        if (!this.primary) this.primary = this.providers.cloudKit;
      }

      if (await this.providers.keyValueStore.isAvailable()) {
        this.tertiary = this.providers.keyValueStore;
      }
    } else {
      // Web/Android: CloudKit primary, localStorage secondary
      if (await this.providers.cloudKit.isAvailable()) {
        this.primary = this.providers.cloudKit;
      }

      this.secondary = this.providers.localStorage;
      if (!this.primary) this.primary = this.providers.localStorage;
    }

    // Always have localStorage as fallback
    if (!this.primary) {
      this.primary = this.providers.localStorage;
    }
  }

  /**
   * Load initial data from providers
   */
  async loadInitialData() {
    try {
      // Try to load from primary first
      const primaryData = await this.primary.fetch();

      if (primaryData) {
        await this.processProviderData(primaryData, 'primary');
      }

      // Also load from secondary for comparison
      if (this.secondary && this.secondary !== this.primary) {
        const secondaryData = await this.secondary.fetch();

        if (secondaryData) {
          await this.processProviderData(secondaryData, 'secondary');
        }
      }
    } catch (error) {
      console.error('[UnifiedStatsManager] Failed to load initial data:', error);
      // Continue anyway - we'll work with local data
    }
  }

  /**
   * Process data from a provider
   */
  async processProviderData(data, _source) {
    if (data.events && data.events.length > 0) {
      // Import events into event store
      await gameEventStore.importEvents(data);
    }

    if (data.stats) {
      // Validate and potentially merge stats
    }
  }

  /**
   * Main sync method
   */
  async sync(priority = SyncPriority.NORMAL, options = {}) {
    if (this.syncInProgress) {
      return this.queueSync(priority, options);
    }

    this.syncInProgress = true;
    this.updateSyncState(SyncState.SYNCING);

    const startTime = Date.now();

    try {
      // Record sync start event
      await gameEventStore.createEvent(EventTypes.SYNC_STARTED, {
        syncType: priority === SyncPriority.HIGH ? 'manual' : 'auto',
        provider: this.primary.name,
      });

      // Fetch from all available sources
      const sources = await this.fetchFromAllSources();

      // Check for conflicts
      const conflicts = this.detectConflicts(sources);

      let resolvedData;

      if (conflicts.length > 0) {
        // Resolve conflicts
        resolvedData = await this.resolveConflicts(sources, conflicts, options);

        this.stats.conflictsResolved += conflicts.length;
      } else {
        // No conflicts, use primary source
        resolvedData = sources.primary || sources.secondary || sources.local;
      }

      // Merge and process events
      const mergedEvents = await this.mergeEvents(sources);

      // Save to all providers
      await this.saveToAllProviders(resolvedData, mergedEvents);

      this.lastSyncTime = new Date().toISOString();

      // Record sync completion
      const syncDuration = Date.now() - startTime;
      await gameEventStore.createEvent(EventTypes.SYNC_COMPLETED, {
        syncType: priority === SyncPriority.HIGH ? 'manual' : 'auto',
        provider: this.primary.name,
        recordsSynced: mergedEvents.length,
        duration: syncDuration,
        conflicts: conflicts.length,
      });

      this.stats.syncSuccesses++;
      this.updateAverageSyncTime(syncDuration);

      this.updateSyncState(SyncState.IDLE);

      return {
        success: true,
        duration: syncDuration,
        recordsSynced: mergedEvents.length,
        conflicts: conflicts.length,
      };
    } catch (error) {
      console.error('[UnifiedStatsManager] Sync failed:', error);

      // Record sync failure
      await gameEventStore.createEvent(EventTypes.SYNC_FAILED, {
        syncType: priority === SyncPriority.HIGH ? 'manual' : 'auto',
        provider: this.primary.name,
        error: error.message,
        errorCode: error.code,
      });

      this.stats.syncFailures++;
      this.stats.lastError = error;

      // Queue for retry if appropriate
      if (this.shouldRetry(error)) {
        await this.queueForRetry({ priority, options });
      }

      this.updateSyncState(SyncState.ERROR);

      throw error;
    } finally {
      this.syncInProgress = false;

      // Process queued syncs
      this.processQueuedSyncs();
    }
  }

  /**
   * Fetch data from all available sources
   */
  async fetchFromAllSources() {
    const sources = {};

    // Fetch from primary
    try {
      if (this.primary) {
        sources.primary = await this.primary.fetch();
      }
    } catch (error) {
      console.error('[UnifiedStatsManager] Failed to fetch from primary:', error);
    }

    // Fetch from secondary
    try {
      if (this.secondary && this.secondary !== this.primary) {
        sources.secondary = await this.secondary.fetch();
      }
    } catch (error) {
      console.error('[UnifiedStatsManager] Failed to fetch from secondary:', error);
    }

    // Fetch from tertiary
    try {
      if (this.tertiary) {
        sources.tertiary = await this.tertiary.fetch();
      }
    } catch (error) {
      console.error('[UnifiedStatsManager] Failed to fetch from tertiary:', error);
    }

    // Always include local data
    sources.local = {
      events: gameEventStore.events,
      stats: gameEventStore.computeStats(),
    };

    return sources;
  }

  /**
   * Detect conflicts between sources
   */
  detectConflicts(sources) {
    const conflicts = [];

    // Compare primary vs secondary
    if (sources.primary && sources.secondary) {
      const primaryStats = sources.primary.stats || {};
      const secondaryStats = sources.secondary.stats || {};

      const conflictFields = this.conflictResolver.detectConflicts(primaryStats, secondaryStats);

      if (conflictFields.length > 0) {
        conflicts.push({
          type: 'provider',
          sources: ['primary', 'secondary'],
          fields: conflictFields,
        });
      }
    }

    // Compare with local
    if (sources.primary && sources.local) {
      const primaryStats = sources.primary.stats || {};
      const localStats = sources.local.stats || {};

      const conflictFields = this.conflictResolver.detectConflicts(primaryStats, localStats);

      if (conflictFields.length > 0) {
        conflicts.push({
          type: 'local',
          sources: ['primary', 'local'],
          fields: conflictFields,
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts between sources
   */
  async resolveConflicts(sources, conflicts, options = {}) {
    if (options.requireManual || this.config.conflictResolutionStrategy === 'manual') {
      return await this.requestManualResolution(sources, conflicts);
    }

    // Automatic resolution
    const resolved = this.conflictResolver.resolve(sources, {
      strategy: this.config.conflictResolutionStrategy,
      priorities: {
        primary: 3,
        secondary: 2,
        tertiary: 1,
        local: 0,
      },
    });

    // Record conflict resolution
    await gameEventStore.createEvent(EventTypes.CONFLICT_RESOLVED, {
      conflictType: 'automatic',
      resolution: this.config.conflictResolutionStrategy,
      fields: conflicts.flatMap((c) => c.fields),
      userChoice: false,
    });

    return resolved;
  }

  /**
   * Request manual conflict resolution from user
   */
  async requestManualResolution(sources, conflicts) {
    this.updateSyncState(SyncState.RESOLVING_CONFLICT);

    // Emit event for UI to handle
    this.emit('conflictDetected', {
      sources,
      conflicts,
      resolver: (resolution) => this.applyManualResolution(resolution),
    });

    // Wait for resolution (with timeout)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Conflict resolution timeout'));
      }, 60000); // 1 minute timeout

      this.once('conflictResolved', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  /**
   * Apply manual conflict resolution
   */
  async applyManualResolution(resolution) {
    // Record the resolution
    await gameEventStore.createEvent(EventTypes.CONFLICT_RESOLVED, {
      conflictType: 'manual',
      resolution: resolution.choice,
      fields: resolution.fields,
      userChoice: true,
    });

    this.stats.conflictsManual++;

    this.emit('conflictResolved', resolution.data);

    return resolution.data;
  }

  /**
   * Merge events from all sources
   */
  async mergeEvents(sources) {
    const allEvents = [];

    // Collect events from all sources
    for (const [, data] of Object.entries(sources)) {
      if (data && data.events) {
        allEvents.push(...data.events);
      }
    }

    // Deduplicate and sort
    const merged = gameEventStore.mergeEvents(allEvents, []);

    return merged;
  }

  /**
   * Save data to all providers
   */
  async saveToAllProviders(stats, events) {
    const saveData = {
      stats,
      events,
      timestamp: new Date().toISOString(),
      version: 2,
    };

    const savePromises = [];

    // Special handling for Game Center - only submit streak to the configured leaderboard
    if (this.getPlatform() === 'ios' && this.providers.gameCenter) {
      const gameCenterData = {
        stats: {
          currentStreak: stats.currentStreak || 0,
          lastStreakDate: stats.lastStreakDate,
        },
      };

      savePromises.push(
        this.providers.gameCenter.save(gameCenterData).catch((error) => {
          console.error('[UnifiedStatsManager] Failed to save streak to Game Center:', error);
          return { success: false, error };
        })
      );
    }

    // Save to primary
    if (this.primary) {
      if (this.primary.name !== 'gameCenter') {
        savePromises.push(
          this.primary.save(saveData).catch((error) => {
            console.error('[UnifiedStatsManager] Failed to save to primary:', error);
            return { success: false, error };
          })
        );
      }
    }

    // Save to secondary
    if (this.secondary && this.secondary !== this.primary) {
      if (this.secondary.name !== 'gameCenter') {
        savePromises.push(
          this.secondary.save(saveData).catch((error) => {
            console.error('[UnifiedStatsManager] Failed to save to secondary:', error);
            return { success: false, error };
          })
        );
      }
    }

    // Save to tertiary
    if (this.tertiary && this.tertiary.name !== 'gameCenter') {
      savePromises.push(
        this.tertiary.save(saveData).catch((error) => {
          console.error('[UnifiedStatsManager] Failed to save to tertiary:', error);
          return { success: false, error };
        })
      );
    }

    const results = await Promise.allSettled(savePromises);

    return results;
  }

  /**
   * Queue a sync operation
   */
  queueSync(priority, options) {
    this.syncQueue.push({ priority, options, timestamp: Date.now() });

    // Sort by priority
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Process queued sync operations
   */
  async processQueuedSyncs() {
    if (this.syncQueue.length === 0 || this.syncInProgress) return;

    const next = this.syncQueue.shift();

    if (next) {
      await this.sync(next.priority, next.options);
    }
  }

  /**
   * Queue for retry after failure
   */
  async queueForRetry(syncRequest) {
    syncRequest.retryCount = (syncRequest.retryCount || 0) + 1;

    if (syncRequest.retryCount <= this.config.maxRetries) {
      this.retryQueue.push(syncRequest);

      // Schedule retry
      setTimeout(() => this.processRetryQueue(), this.config.retryInterval);
    } else {
      console.error('[UnifiedStatsManager] Max retries exceeded');
    }
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    if (this.retryQueue.length === 0) return;

    const retry = this.retryQueue.shift();

    if (retry) {
      await this.sync(retry.priority, retry.options);
    }
  }

  /**
   * Should retry after error
   */
  shouldRetry(error) {
    // Network errors are retryable
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }

    // CloudKit rate limits are retryable
    if (error.code === 'RATE_LIMITED') {
      return true;
    }

    // Authentication errors are not retryable
    if (error.code === 'AUTH_ERROR') {
      return false;
    }

    return false;
  }

  /**
   * Start sync services
   */
  startSyncServices() {
    // Auto sync timer
    if (this.config.autoSync) {
      this.autoSyncTimer = setInterval(() => {
        this.sync(SyncPriority.LOW);
      }, this.config.syncInterval);
    }

    // Network status listener
    this.listenForNetworkChanges();

    // App lifecycle listeners
    this.listenForAppLifecycle();
  }

  /**
   * Stop sync services
   */
  stopSyncServices() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  /**
   * Listen for network changes
   */
  listenForNetworkChanges() {
    if (window.addEventListener) {
      window.addEventListener('online', () => {
        this.sync(SyncPriority.NORMAL);
      });

      window.addEventListener('offline', () => {
        this.updateSyncState(SyncState.OFFLINE);
      });
    }
  }

  /**
   * Listen for app lifecycle events
   */
  listenForAppLifecycle() {
    if (window.addEventListener) {
      // App becomes active
      window.addEventListener('resume', () => {
        this.sync(SyncPriority.NORMAL);
      });

      // App goes to background
      window.addEventListener('pause', () => {
        // Save any pending changes
        this.sync(SyncPriority.HIGH);
      });
    }
  }

  /**
   * Subscribe to game events
   */
  subscribeToEvents() {
    gameEventStore.subscribe(async (event) => {
      // Trigger sync for important events
      if (
        event.type === EventTypes.GAME_COMPLETED ||
        event.type === EventTypes.STREAK_CONTINUED ||
        event.type === EventTypes.ACHIEVEMENT_UNLOCKED
      ) {
        // Immediately submit to Game Center for iOS
        if (
          this.getPlatform() === 'ios' &&
          this.providers.gameCenter &&
          (await this.providers.gameCenter.isAvailable())
        ) {
          await this.submitToGameCenter(event);
        }

        // Debounce full sync
        if (this.syncDebounceTimer) {
          clearTimeout(this.syncDebounceTimer);
        }

        this.syncDebounceTimer = setTimeout(() => {
          this.sync(SyncPriority.NORMAL);
        }, 5000); // 5 second debounce
      }
    });
  }

  /**
   * Submit scores to Game Center immediately
   * Note: Only submits current streak since that's the only configured leaderboard
   */
  async submitToGameCenter(_event) {
    try {
      // Compute current stats
      const currentStats = this.getCurrentStats();

      // Format for Game Center - only send streak data
      const gameCenterData = {
        stats: {
          currentStreak: currentStats.currentStreak,
          lastStreakDate: currentStats.lastStreakDate,
        },
      };

      // Submit to Game Center (will update the longest_streak leaderboard with best streak)
      await this.providers.gameCenter.save(gameCenterData);
    } catch (error) {
      console.error('[UnifiedStatsManager] Game Center streak submission failed:', error);
      // Don't throw - we don't want to break the flow if Game Center fails
    }
  }

  /**
   * Update sync state
   */
  updateSyncState(state) {
    this.syncState = state;
    this.emit('syncStateChanged', state);
  }

  /**
   * Update average sync time
   */
  updateAverageSyncTime(duration) {
    const totalAttempts = this.stats.syncSuccesses + this.stats.syncFailures;

    this.stats.averageSyncTime =
      (this.stats.averageSyncTime * (totalAttempts - 1) + duration) / totalAttempts;
  }

  /**
   * Get current stats
   */
  getCurrentStats() {
    return gameEventStore.computeStats();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      state: this.syncState,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      queueSize: this.syncQueue.length,
      retryQueueSize: this.retryQueue.length,
      stats: this.stats,
    };
  }

  /**
   * Force sync (user-initiated)
   */
  async forceSync() {
    return await this.sync(SyncPriority.HIGH, { force: true });
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAllData() {
    console.warn('[UnifiedStatsManager] Clearing all data...');

    const clearPromises = Object.values(this.providers).map((provider) =>
      provider.clear().catch((error) => {
        console.error(`Failed to clear ${provider.name}:`, error);
      })
    );

    await Promise.allSettled(clearPromises);

    await gameEventStore.clearAllEvents();

    // Reset stats
    this.stats = {
      syncAttempts: 0,
      syncSuccesses: 0,
      syncFailures: 0,
      conflictsResolved: 0,
      conflictsManual: 0,
      lastError: null,
      averageSyncTime: 0,
    };

    console.warn('[UnifiedStatsManager] All data cleared');
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[UnifiedStatsManager] Event listener error:`, error);
        }
      });
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
   * Configuration methods
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };

    // Restart services if needed
    if ('autoSync' in config || 'syncInterval' in config) {
      this.stopSyncServices();
      this.startSyncServices();
    }
  }

  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export const unifiedStatsManager = new UnifiedStatsManager();
export default UnifiedStatsManager;
