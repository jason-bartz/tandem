import { useState, useEffect, useCallback } from 'react';
import { unifiedStatsManager, SyncState, SyncPriority } from '@/services/stats/UnifiedStatsManager';
import cloudKitService from '@/services/cloudkit.service';
import logger from '@/lib/logger';

/**
 * Unified Sync React Hook
 *
 * Provides React components with unified sync state and operations
 * Handles Game Center, CloudKit, and local storage sync
 */
export function useUnifiedSync() {
  const [syncStatus, setSyncStatus] = useState({
    available: false,
    enabled: false,
    lastSync: null,
    syncing: false,
    error: null,
    state: SyncState.IDLE,
    provider: null,
  });

  useEffect(() => {
    const initializeSync = async () => {
      try {
        if (!unifiedStatsManager.isInitialized) {
          await unifiedStatsManager.initialize();
        }

        // Check CloudKit status
        await cloudKitService.checkiCloudStatus();

        // Get initial status
        const status = unifiedStatsManager.getSyncStatus();
        const cloudStatus = cloudKitService.getSyncStatus();

        setSyncStatus({
          available: cloudStatus.available || status.state !== SyncState.ERROR,
          enabled: cloudStatus.enabled,
          lastSync: status.lastSyncTime || cloudStatus.lastSync,
          syncing: status.syncInProgress,
          error: status.stats?.lastError?.message || null,
          state: status.state,
          provider: unifiedStatsManager.primary?.name || 'localStorage',
        });

        // Subscribe to sync state changes
        unifiedStatsManager.on('syncStateChanged', handleSyncStateChange);
      } catch (error) {
        logger.error('Failed to initialize unified sync:', error);
        setSyncStatus((prev) => ({
          ...prev,
          available: false,
          error: error.message,
        }));
      }
    };

    initializeSync();

    return () => {
      // Cleanup subscription
      unifiedStatsManager.off('syncStateChanged', handleSyncStateChange);
    };
  }, []);

  /**
   * Handle sync state changes
   */
  const handleSyncStateChange = (state) => {
    setSyncStatus((prev) => ({
      ...prev,
      state,
      syncing: state === SyncState.SYNCING,
      error: state === SyncState.ERROR ? 'Sync error occurred' : null,
    }));
  };

  /**
   * Enable or disable sync
   */
  const toggleSync = useCallback(async (enabled) => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));

      await cloudKitService.setSyncEnabled(enabled);

      unifiedStatsManager.updateConfig({ autoSync: enabled });

      setSyncStatus((prev) => ({
        ...prev,
        enabled,
        syncing: false,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      logger.error('Failed to toggle sync:', error);
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Perform a full sync with all providers
   * Includes Game Center, CloudKit, and local storage
   */
  const performFullSync = useCallback(async () => {
    try {
      logger.info('Starting unified full sync...');
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));

      // Perform unified sync with high priority (user-initiated)
      const result = await unifiedStatsManager.forceSync();

      if (result.success) {
        // Also perform CloudKit sync for preferences and puzzle data
        const cloudResult = await cloudKitService.performFullSync();

        setSyncStatus((prev) => ({
          ...prev,
          syncing: false,
          lastSync: unifiedStatsManager.lastSyncTime,
          error: null,
          state: SyncState.IDLE,
        }));

        logger.info('Unified full sync completed successfully', {
          recordsSynced: result.recordsSynced,
          conflicts: result.conflicts,
          duration: result.duration,
        });

        return {
          success: true,
          ...result,
          cloudData: cloudResult.data,
        };
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      logger.error('Unified full sync failed:', error);
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error.message,
        state: SyncState.ERROR,
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Sync stats using unified manager
   */
  const syncStats = useCallback(
    async (stats) => {
      if (!syncStatus.enabled) {
        return { success: false, localOnly: true };
      }

      try {
        // Use unified stats manager for syncing
        await unifiedStatsManager.sync(SyncPriority.NORMAL, { stats });

        return { success: true };
      } catch (error) {
        logger.error('Failed to sync stats:', error);
        return { success: false, error: error.message };
      }
    },
    [syncStatus.enabled]
  );

  /**
   * Fetch stats from all providers
   */
  const fetchStats = useCallback(async () => {
    if (!syncStatus.enabled) {
      return null;
    }

    try {
      const stats = unifiedStatsManager.getCurrentStats();
      return stats;
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
      return null;
    }
  }, [syncStatus.enabled]);

  /**
   * Get debug information for sync status
   */
  const getDebugInfo = useCallback(() => {
    const status = unifiedStatsManager.getSyncStatus();
    const providers = {
      primary: unifiedStatsManager.primary?.name,
      secondary: unifiedStatsManager.secondary?.name,
      tertiary: unifiedStatsManager.tertiary?.name,
    };

    return {
      ...status,
      providers,
      platform: unifiedStatsManager.getPlatform(),
      config: unifiedStatsManager.getConfig(),
    };
  }, []);

  return {
    syncStatus,
    toggleSync,
    performFullSync,
    syncStats,
    fetchStats,
    getDebugInfo,
  };
}

export default useUnifiedSync;
