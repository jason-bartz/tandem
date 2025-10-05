import { useState, useEffect, useCallback } from 'react';
import cloudKitService from '@/services/cloudkit.service';
import logger from '@/lib/logger';

/**
 * CloudKit Sync React Hook
 *
 * Provides React components with CloudKit sync state and operations
 * Handles automatic sync on app lifecycle events
 */
export function useCloudKitSync() {
  const [syncStatus, setSyncStatus] = useState({
    available: false,
    enabled: false,
    lastSync: null,
    syncing: false,
    error: null,
  });

  // Check iCloud status on mount
  useEffect(() => {
    const checkStatus = async () => {
      await cloudKitService.checkiCloudStatus();
      const status = cloudKitService.getSyncStatus();
      setSyncStatus((prev) => ({
        ...prev,
        available: status.available,
        enabled: status.enabled,
        lastSync: status.lastSync,
      }));
    };

    checkStatus();
  }, []);

  /**
   * Enable or disable CloudKit sync
   */
  const toggleSync = useCallback(async (enabled) => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));
      await cloudKitService.setSyncEnabled(enabled);

      const status = cloudKitService.getSyncStatus();
      setSyncStatus({
        available: status.available,
        enabled: status.enabled,
        lastSync: status.lastSync,
        syncing: false,
        error: null,
      });

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
   * Perform a full sync from iCloud
   */
  const performFullSync = useCallback(async () => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));
      const result = await cloudKitService.performFullSync();

      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        lastSync: cloudKitService.getLastSyncTime(),
        error: result.success ? null : result.error || result.message,
      }));

      return result;
    } catch (error) {
      logger.error('Full sync failed:', error);
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Sync stats to iCloud
   */
  const syncStats = useCallback(
    async (stats) => {
      if (!syncStatus.enabled) {
        return { success: false, localOnly: true };
      }

      try {
        const result = await cloudKitService.syncStats(stats);

        if (result.success) {
          setSyncStatus((prev) => ({
            ...prev,
            lastSync: cloudKitService.getLastSyncTime(),
          }));
        }

        return result;
      } catch (error) {
        logger.error('Failed to sync stats:', error);
        return { success: false, error: error.message };
      }
    },
    [syncStatus.enabled]
  );

  /**
   * Fetch stats from iCloud
   */
  const fetchStats = useCallback(async () => {
    if (!syncStatus.enabled) {
      return null;
    }

    try {
      return await cloudKitService.fetchStats();
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
      return null;
    }
  }, [syncStatus.enabled]);

  /**
   * Sync puzzle result to iCloud
   */
  const syncPuzzleResult = useCallback(
    async (date, result) => {
      if (!syncStatus.enabled) {
        return { success: false, localOnly: true };
      }

      try {
        const syncResult = await cloudKitService.syncPuzzleResult(date, result);

        if (syncResult.success) {
          setSyncStatus((prev) => ({
            ...prev,
            lastSync: cloudKitService.getLastSyncTime(),
          }));
        }

        return syncResult;
      } catch (error) {
        logger.error('Failed to sync puzzle result:', error);
        return { success: false, error: error.message };
      }
    },
    [syncStatus.enabled]
  );

  /**
   * Sync puzzle progress to iCloud
   */
  const syncPuzzleProgress = useCallback(
    async (date, progress) => {
      if (!syncStatus.enabled) {
        return { success: false, localOnly: true };
      }

      try {
        const result = await cloudKitService.syncPuzzleProgress(date, progress);

        if (result.success) {
          setSyncStatus((prev) => ({
            ...prev,
            lastSync: cloudKitService.getLastSyncTime(),
          }));
        }

        return result;
      } catch (error) {
        logger.error('Failed to sync puzzle progress:', error);
        return { success: false, error: error.message };
      }
    },
    [syncStatus.enabled]
  );

  /**
   * Sync preferences to iCloud
   */
  const syncPreferences = useCallback(
    async (preferences) => {
      if (!syncStatus.enabled) {
        return { success: false, localOnly: true };
      }

      try {
        const result = await cloudKitService.syncPreferences(preferences);

        if (result.success) {
          setSyncStatus((prev) => ({
            ...prev,
            lastSync: cloudKitService.getLastSyncTime(),
          }));
        }

        return result;
      } catch (error) {
        logger.error('Failed to sync preferences:', error);
        return { success: false, error: error.message };
      }
    },
    [syncStatus.enabled]
  );

  /**
   * Clear all cloud data
   */
  const clearCloudData = useCallback(async () => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));
      const result = await cloudKitService.clearCloudData();

      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: result.success ? null : result.error || result.message,
      }));

      return result;
    } catch (error) {
      logger.error('Failed to clear cloud data:', error);
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }
  }, []);

  return {
    syncStatus,
    toggleSync,
    performFullSync,
    syncStats,
    fetchStats,
    syncPuzzleResult,
    syncPuzzleProgress,
    syncPreferences,
    clearCloudData,
  };
}
