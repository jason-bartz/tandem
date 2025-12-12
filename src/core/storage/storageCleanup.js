/**
 * Storage Cleanup Utilities
 *
 * Provides functions to clean up localStorage and prevent quota errors
 */

import logger from '@/lib/logger';

/**
 * Check current localStorage usage
 */
export function checkStorageUsage() {
  const usage = [];
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    const size = new Blob([value]).size;
    totalSize += size;

    usage.push({
      key,
      size,
      sizeKB: (size / 1024).toFixed(2),
      sizeMB: (size / (1024 * 1024)).toFixed(2),
    });
  }

  // Sort by size descending
  usage.sort((a, b) => b.size - a.size);

  return {
    items: usage,
    totalSize,
    totalKB: (totalSize / 1024).toFixed(2),
    totalMB: (totalSize / (1024 * 1024)).toFixed(2),
    itemCount: localStorage.length,
  };
}

/**
 * Clean up old game events from localStorage
 */
export async function cleanupGameEvents() {
  try {
    const gameEventsKey = 'gameEvents';
    const stored = localStorage.getItem(gameEventsKey);

    if (!stored) {
      return { success: true, message: 'No events to clean up' };
    }

    const parsed = JSON.parse(stored);
    const originalCount = parsed.events?.length || 0;

    if (originalCount === 0) {
      return { success: true, message: 'No events to clean up' };
    }

    // Keep only last 100 events
    const MAX_EVENTS = 100;
    const sortedEvents = [...parsed.events].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const eventsToKeep = sortedEvents.slice(0, MAX_EVENTS);

    const updated = {
      ...parsed,
      events: eventsToKeep,
      lastCleanup: new Date().toISOString(),
    };

    localStorage.setItem(gameEventsKey, JSON.stringify(updated));

    const removedCount = originalCount - eventsToKeep.length;

    return {
      success: true,
      originalCount,
      keptCount: eventsToKeep.length,
      removedCount,
      message: `Cleaned up ${removedCount} old events, kept ${eventsToKeep.length}`,
    };
  } catch (error) {
    logger.error('[StorageCleanup] Failed to cleanup game events', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clean up old game data
 */
export async function cleanupGameData() {
  try {
    const gameDataKeys = ['tandem_game_data_v2', 'CapacitorStorage.tandem_game_data_v2'];

    let cleanedAny = false;

    for (const key of gameDataKeys) {
      const stored = localStorage.getItem(key);

      if (!stored) continue;

      const parsed = JSON.parse(stored);
      const originalEventCount = parsed.events?.length || 0;

      if (originalEventCount === 0) continue;

      // Keep only last 100 events
      const MAX_EVENTS = 100;
      const sortedEvents = [...(parsed.events || [])].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      const eventsToKeep = sortedEvents.slice(0, MAX_EVENTS);

      const updated = {
        ...parsed,
        events: eventsToKeep,
        lastCleanup: new Date().toISOString(),
      };

      localStorage.setItem(key, JSON.stringify(updated));
      cleanedAny = true;
    }

    return {
      success: true,
      message: cleanedAny ? 'Game data cleaned up' : 'No game data to clean up',
    };
  } catch (error) {
    logger.error('[StorageCleanup] Failed to cleanup game data', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Emergency cleanup - run all cleanup functions
 */
export async function emergencyCleanup() {
  const results = {
    gameEvents: await cleanupGameEvents(),
    gameData: await cleanupGameData(),
  };

  // Check final usage
  const usage = checkStorageUsage();

  return {
    success: true,
    results,
    finalUsage: usage,
  };
}

/**
 * Run cleanup on app initialization if needed
 */
export async function autoCleanupIfNeeded() {
  try {
    const usage = checkStorageUsage();
    const usageMB = parseFloat(usage.totalMB);

    // Run cleanup if over 3MB (conservative threshold)
    if (usageMB > 3) {
      logger.warn('[StorageCleanup] High storage usage detected:', usageMB, 'MB - running cleanup');
      await emergencyCleanup();
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[StorageCleanup] Auto cleanup failed', error);
    return false;
  }
}

// Make available in console for debugging
if (typeof window !== 'undefined') {
  window.storageCleanup = {
    checkUsage: checkStorageUsage,
    cleanupEvents: cleanupGameEvents,
    cleanupData: cleanupGameData,
    emergencyCleanup,
  };
}
