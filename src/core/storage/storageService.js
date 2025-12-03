/**
 * Unified Storage Service
 *
 * Provides a resilient storage layer with automatic fallback chain:
 * 1. localStorage / Capacitor Preferences (primary)
 * 2. IndexedDB (fallback for quota errors)
 * 3. In-memory cache (last resort)
 *
 * Both read and write operations use the same fallback chain to ensure
 * data saved to IndexedDB can be found when reading.
 *
 * Platform-aware: Uses Capacitor Preferences on iOS, localStorage on web.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';
import logger from '@/lib/logger';

// Track which keys have been stored in IndexedDB (for read fallback)
const indexedDBKeys = new Set();

// In-memory cache as last resort
const memoryCache = new Map();

// Track keys in memory cache
const memoryCacheKeys = new Set();

/**
 * Check if we're running on a native platform (iOS/Android)
 */
function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Clean up old progress data to free up storage space
 * Removes progress entries older than 90 days
 */
async function cleanupOldData() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    let cleanedCount = 0;
    const keysToCheck = isNativePlatform()
      ? (await Preferences.keys()).keys
      : Object.keys(localStorage);

    for (const key of keysToCheck) {
      // Clean up old progress data (but keep puzzle results and stats)
      if (key.includes('_progress_') || key.includes('gameEvents')) {
        // Try to extract date from key
        const dateMatch = key.match(/(\d{4})_(\d{1,2})_(\d{1,2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (date < cutoffDate) {
            if (isNativePlatform()) {
              await Preferences.remove({ key });
            } else {
              localStorage.removeItem(key);
            }
            cleanedCount++;
          }
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`[storageService] Cleaned up ${cleanedCount} old entries`);
    }

    return cleanedCount;
  } catch (error) {
    logger.error('[storageService] Cleanup failed:', error);
    return 0;
  }
}

/**
 * Get a value from storage with fallback chain
 * Checks: localStorage/Preferences → IndexedDB → in-memory cache
 *
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} - The stored value or null
 */
async function get(key) {
  if (typeof window === 'undefined') {
    return null; // SSR safety
  }

  try {
    // 1. Try primary storage (localStorage or Capacitor Preferences)
    let value = null;

    if (isNativePlatform()) {
      const result = await Preferences.get({ key });
      value = result.value;
    } else {
      value = localStorage.getItem(key);
    }

    if (value !== null) {
      return value;
    }

    // 2. Try IndexedDB if key is known to be there or if primary returned null
    if (isIndexedDBAvailable() && (indexedDBKeys.has(key) || value === null)) {
      try {
        const idbValue = await idbGet(key);
        if (idbValue !== undefined) {
          // Track that this key is in IndexedDB
          indexedDBKeys.add(key);
          return idbValue;
        }
      } catch (idbError) {
        logger.warn('[storageService] IndexedDB get failed:', idbError);
      }
    }

    // 3. Check in-memory cache
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    return null;
  } catch (error) {
    logger.error('[storageService] Get failed for key:', key, error);

    // Last resort: check memory cache
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    return null;
  }
}

/**
 * Set a value in storage with fallback chain
 * Tries: localStorage/Preferences → cleanup + retry → IndexedDB → in-memory cache
 *
 * @param {string} key - Storage key
 * @param {string} value - Value to store (must be a string)
 * @returns {Promise<boolean>} - True if saved successfully to any storage
 */
async function set(key, value) {
  if (typeof window === 'undefined') {
    return false; // SSR safety
  }

  try {
    // 1. Try primary storage
    if (isNativePlatform()) {
      await Preferences.set({ key, value });
      // Remove from fallback tracking if it was there
      indexedDBKeys.delete(key);
      memoryCacheKeys.delete(key);
      memoryCache.delete(key);
      return true;
    }

    // Web: try localStorage with quota handling
    try {
      localStorage.setItem(key, value);
      // Remove from fallback tracking if it was there
      indexedDBKeys.delete(key);
      memoryCacheKeys.delete(key);
      memoryCache.delete(key);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        logger.warn('[storageService] Quota exceeded, attempting cleanup...');

        // 2. Try cleanup and retry
        await cleanupOldData();

        try {
          localStorage.setItem(key, value);
          logger.info('[storageService] Save succeeded after cleanup');
          indexedDBKeys.delete(key);
          memoryCacheKeys.delete(key);
          memoryCache.delete(key);
          return true;
        } catch (retryError) {
          if (retryError.name === 'QuotaExceededError') {
            logger.warn(
              '[storageService] Still over quota after cleanup, falling back to IndexedDB'
            );

            // 3. Fall back to IndexedDB
            if (isIndexedDBAvailable()) {
              try {
                await idbSet(key, value);
                indexedDBKeys.add(key);
                logger.info('[storageService] Saved to IndexedDB fallback');
                return true;
              } catch (idbError) {
                logger.error('[storageService] IndexedDB save failed:', idbError);
              }
            }

            // 4. Last resort: in-memory cache
            memoryCache.set(key, value);
            memoryCacheKeys.add(key);
            logger.warn(
              '[storageService] Saved to in-memory cache (will not persist across sessions)'
            );
            return true;
          }
          throw retryError;
        }
      }
      throw error;
    }
  } catch (error) {
    logger.error('[storageService] Set failed for key:', key, error);

    // Ultimate fallback: in-memory cache
    memoryCache.set(key, value);
    memoryCacheKeys.add(key);
    logger.warn('[storageService] Saved to in-memory cache due to error');
    return true;
  }
}

/**
 * Remove a value from all storage layers
 *
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
async function remove(key) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Remove from primary storage
    if (isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }

    // Remove from IndexedDB if present
    if (isIndexedDBAvailable() && indexedDBKeys.has(key)) {
      try {
        await idbDel(key);
        indexedDBKeys.delete(key);
      } catch (idbError) {
        logger.warn('[storageService] IndexedDB remove failed:', idbError);
      }
    }

    // Remove from memory cache
    memoryCache.delete(key);
    memoryCacheKeys.delete(key);
  } catch (error) {
    logger.error('[storageService] Remove failed for key:', key, error);
  }
}

/**
 * Get all storage keys from all layers
 * Useful for iteration (e.g., getGameHistory)
 *
 * @returns {Promise<string[]>} - Array of all keys
 */
async function getAllKeys() {
  if (typeof window === 'undefined') {
    return [];
  }

  const allKeys = new Set();

  try {
    // Get keys from primary storage
    if (isNativePlatform()) {
      const result = await Preferences.keys();
      result.keys.forEach((key) => allKeys.add(key));
    } else {
      Object.keys(localStorage).forEach((key) => allKeys.add(key));
    }

    // Add keys from IndexedDB
    if (isIndexedDBAvailable()) {
      try {
        const idbKeyList = await idbKeys();
        idbKeyList.forEach((key) => {
          if (typeof key === 'string') {
            allKeys.add(key);
            indexedDBKeys.add(key); // Update tracking
          }
        });
      } catch (idbError) {
        logger.warn('[storageService] Failed to get IndexedDB keys:', idbError);
      }
    }

    // Add keys from memory cache
    memoryCacheKeys.forEach((key) => allKeys.add(key));

    return Array.from(allKeys);
  } catch (error) {
    logger.error('[storageService] getAllKeys failed:', error);
    return [];
  }
}

/**
 * Check storage health and perform proactive cleanup if needed
 * Call this on app initialization
 *
 * @returns {Promise<{healthy: boolean, usage: object}>}
 */
async function checkHealth() {
  if (typeof window === 'undefined') {
    return { healthy: true, usage: null };
  }

  try {
    let usage = null;

    // Check storage estimate if available
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usage = {
        used: estimate.usage,
        quota: estimate.quota,
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2),
      };

      // Proactive cleanup if over 80%
      if (estimate.usage / estimate.quota > 0.8) {
        logger.warn('[storageService] Storage usage over 80%, running proactive cleanup');
        await cleanupOldData();
      }
    }

    // Check localStorage usage (rough estimate)
    if (!isNativePlatform()) {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        totalSize += (key.length + value.length) * 2; // UTF-16 encoding
      }

      const localStorageUsage = {
        bytes: totalSize,
        kb: (totalSize / 1024).toFixed(2),
        mb: (totalSize / (1024 * 1024)).toFixed(2),
      };

      // Proactive cleanup if over 3MB (conservative for 5MB limit)
      if (totalSize > 3 * 1024 * 1024) {
        logger.warn('[storageService] localStorage over 3MB, running proactive cleanup');
        await cleanupOldData();
      }

      return {
        healthy: true,
        usage: usage || localStorageUsage,
        localStorage: localStorageUsage,
      };
    }

    return { healthy: true, usage };
  } catch (error) {
    logger.error('[storageService] Health check failed:', error);
    return { healthy: false, usage: null, error: error.message };
  }
}

/**
 * Initialize the storage service
 * Loads IndexedDB key tracking and performs health check
 */
async function initialize() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Load IndexedDB keys into tracking set
    if (isIndexedDBAvailable()) {
      const idbKeyList = await idbKeys();
      idbKeyList.forEach((key) => {
        if (typeof key === 'string') {
          indexedDBKeys.add(key);
        }
      });
      logger.info(`[storageService] Loaded ${indexedDBKeys.size} keys from IndexedDB tracking`);
    }

    // Run health check
    await checkHealth();
  } catch (error) {
    logger.error('[storageService] Initialization failed:', error);
  }
}

const storageService = {
  get,
  set,
  remove,
  getAllKeys,
  checkHealth,
  initialize,
  cleanupOldData,
  // Expose for debugging
  _getIndexedDBKeys: () => new Set(indexedDBKeys),
  _getMemoryCacheKeys: () => new Set(memoryCacheKeys),
};

export default storageService;

// Also export individual functions for tree-shaking
export { get, set, remove, getAllKeys, checkHealth, initialize, cleanupOldData };
