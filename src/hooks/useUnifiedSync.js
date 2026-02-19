import { useState, useEffect, useCallback } from 'react';
import cloudKitService from '@/services/cloudkit.service';
import logger from '@/lib/logger';

/**
 * iCloud Sync React Hook
 *
 * Provides React components with iCloud sync state and toggle.
 * Uses cloudKitService directly for iOS iCloud sync.
 */
export function useUnifiedSync() {
  const [syncStatus, setSyncStatus] = useState({
    available: false,
    enabled: false,
    lastSync: null,
    syncing: false,
    error: null,
    provider: null,
  });

  useEffect(() => {
    const initializeSync = async () => {
      try {
        await cloudKitService.checkiCloudStatus();
        const status = cloudKitService.getSyncStatus();

        setSyncStatus({
          available: status.available,
          enabled: status.enabled,
          lastSync: status.lastSync,
          syncing: false,
          error: null,
          provider: status.available ? 'cloudKit' : null,
        });
      } catch (error) {
        logger.error('Failed to initialize sync:', error);
        setSyncStatus((prev) => ({
          ...prev,
          available: false,
          error: error.message,
        }));
      }
    };

    initializeSync();
  }, []);

  const toggleSync = useCallback(async (enabled) => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true, error: null }));

      await cloudKitService.setSyncEnabled(enabled);

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

  return {
    syncStatus,
    toggleSync,
  };
}

export default useUnifiedSync;
