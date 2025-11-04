/**
 * Cryptic Game Local Storage Utilities
 * Handles local storage for The Daily Cryptic game state and progress
 *
 * Platform-Agnostic Storage:
 * - iOS: Uses Capacitor Preferences API
 * - Web: Uses browser localStorage
 * - Matches Tandem Daily's proven storage pattern
 */

import { CRYPTIC_STORAGE_KEYS } from './constants';
import { getCurrentPuzzleInfo } from './utils';
import logger from './logger';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import cloudKitService from '@/services/cloudkit.service';

// =====================================================
// PLATFORM-AGNOSTIC STORAGE HELPERS
// =====================================================
// These helpers abstract the difference between iOS (Preferences) and Web (localStorage)
// Matching the pattern from storage.js (Tandem Daily)

/**
 * Platform-agnostic storage helper - GET
 * Works on both iOS (Capacitor Preferences) and Web (localStorage)
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} Stored value or null
 */
async function getCrypticStorageItem(key) {
  if (typeof window === 'undefined') {
    return null; // SSR safety
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
}

/**
 * Platform-agnostic storage helper - SET
 * Works on both iOS (Capacitor Preferences) and Web (localStorage)
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<void>}
 */
async function setCrypticStorageItem(key, value) {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

/**
 * Platform-agnostic storage helper - REMOVE
 * Works on both iOS (Capacitor Preferences) and Web (localStorage)
 * @param {string} key - Storage key to remove
 * @returns {Promise<void>}
 */
async function removeCrypticStorageItem(key) {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Get all storage keys (for migration/debugging)
 * @returns {Promise<string[]>} Array of all storage keys
 */
async function getCrypticStorageKeys() {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const result = await Preferences.keys();
    return result.keys;
  } else {
    return Object.keys(localStorage);
  }
}

// =====================================================
// CORE STORAGE FUNCTIONS (Now Platform-Agnostic)
// =====================================================

/**
 * Save current cryptic game state
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 */
export async function saveCrypticGameState(state) {
  try {
    const stateToSave = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME, JSON.stringify(stateToSave));
    logger.info('[CrypticStorage] Game state saved');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save game state', { error: error.message });
  }
}

/**
 * Load current cryptic game state
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 */
export async function loadCrypticGameState() {
  try {
    const saved = await getCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    if (!saved) return null;

    const state = JSON.parse(saved);
    logger.info('[CrypticStorage] Game state loaded', { savedAt: state.savedAt });
    return state;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load game state', { error: error.message });
    return null;
  }
}

/**
 * Clear current cryptic game state
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 */
export async function clearCrypticGameState() {
  try {
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    logger.info('[CrypticStorage] Game state cleared');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to clear game state', { error: error.message });
  }
}

/**
 * Save cryptic puzzle progress for a specific date
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 * CloudKit: Syncs progress to iCloud in background (Day 4 implementation)
 */
export async function saveCrypticPuzzleProgress(date, progress) {
  try {
    const key = `${CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const progressToSave = {
      ...progress,
      date,
      savedAt: new Date().toISOString(),
    };
    await setCrypticStorageItem(key, JSON.stringify(progressToSave));
    logger.info('[CrypticStorage] Puzzle progress saved locally', { date });

    // Sync to CloudKit in background (non-blocking)
    if (cloudKitService.isSyncAvailable()) {
      cloudKitService.syncPuzzleProgress(date, progressToSave).catch((err) => {
        logger.error('[CrypticStorage] CloudKit progress sync failed (non-critical)', {
          date,
          error: err.message,
        });
      });
    }
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save puzzle progress', {
      date,
      error: error.message,
    });
  }
}

/**
 * Load cryptic puzzle progress for a specific date
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 * CloudKit: Fetches and merges progress from iCloud (Day 4 implementation)
 */
export async function loadCrypticPuzzleProgress(date) {
  try {
    const key = `${CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const saved = await getCrypticStorageItem(key);
    const localProgress = saved ? JSON.parse(saved) : null;

    // Fetch from CloudKit if available
    if (cloudKitService.isSyncAvailable()) {
      try {
        const cloudProgress = await cloudKitService.fetchPuzzleProgress(date);

        if (cloudProgress) {
          // If both exist, use the one with more recent savedAt timestamp
          if (localProgress && cloudProgress) {
            const localTime = new Date(localProgress.savedAt || 0).getTime();
            const cloudTime = new Date(cloudProgress.savedAt || 0).getTime();

            if (cloudTime > localTime) {
              // Cloud is more recent, save locally and return it
              await setCrypticStorageItem(key, JSON.stringify(cloudProgress));
              logger.info('[CrypticStorage] Using cloud progress (more recent)', {
                date,
                cloudTime,
                localTime,
              });
              return cloudProgress;
            } else {
              // Local is more recent or same, return local
              logger.info('[CrypticStorage] Using local progress (more recent)', { date });
              return localProgress;
            }
          } else if (cloudProgress) {
            // Only cloud exists, save locally and return it
            await setCrypticStorageItem(key, JSON.stringify(cloudProgress));
            logger.info('[CrypticStorage] Using cloud progress (only source)', { date });
            return cloudProgress;
          }
        }
      } catch (error) {
        logger.error('[CrypticStorage] CloudKit fetch failed (non-critical)', {
          date,
          error: error.message,
        });
        // Continue with local progress if fetch fails
      }
    }

    if (localProgress) {
      logger.info('[CrypticStorage] Puzzle progress loaded from local', { date });
    }
    return localProgress;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load puzzle progress', {
      date,
      error: error.message,
    });
    return null;
  }
}

/**
 * Check if user has completed a cryptic puzzle for a specific date
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 */
export async function hasCrypticPuzzleCompleted(date) {
  try {
    const progress = await loadCrypticPuzzleProgress(date);
    return progress && progress.completed === true;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to check puzzle completion', {
      date,
      error: error.message,
    });
    return false;
  }
}

/**
 * Save cryptic stats locally
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 *
 * @param {Object} stats - Stats object to save
 * @param {boolean} _skipCloudSync - If true, skip CloudKit sync (will be used in Day 3-4)
 * @returns {Promise<Object>} The saved stats (may be merged with CloudKit)
 */
export async function saveCrypticStats(stats, skipCloudSync = false) {
  try {
    await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(stats));
    logger.info('[CrypticStorage] Stats saved locally');

    // Sync to CloudKit (Day 3 implementation)
    if (!skipCloudSync && cloudKitService.isSyncAvailable()) {
      try {
        const syncResult = await cloudKitService.syncStats(stats);

        if (syncResult.success && syncResult.mergedStats) {
          // CloudKit returned merged stats, update local storage
          await setCrypticStorageItem(
            CRYPTIC_STORAGE_KEYS.STATS,
            JSON.stringify(syncResult.mergedStats)
          );
          logger.info('[CrypticStorage] Stats synced and merged with CloudKit');
          return syncResult.mergedStats;
        }
      } catch (error) {
        logger.error('[CrypticStorage] CloudKit sync failed (non-critical)', {
          error: error.message,
        });
        // Continue with local stats if sync fails
      }
    }

    return stats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save stats', { error: error.message });
    return stats;
  }
}

/**
 * Load cryptic stats from local storage
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 *
 * @returns {Promise<Object>} Stats object with default values if not found
 */
export async function loadCrypticStats() {
  const defaultStats = {
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalHintsUsed: 0,
    perfectSolves: 0,
    averageTime: 0,
    completedPuzzles: {},
  };

  try {
    const saved = await getCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS);
    const localStats = saved ? JSON.parse(saved) : defaultStats;

    // Auto-sync with CloudKit on load if available (Day 3 implementation)
    if (cloudKitService.isSyncAvailable()) {
      try {
        const cloudStats = await cloudKitService.fetchStats();

        if (cloudStats) {
          // Merge CloudKit stats with local stats
          const mergedStats = mergeCrypticStats(localStats, cloudStats);

          // Save merged stats locally (skip cloud sync to prevent loop)
          await saveCrypticStats(mergedStats, true);

          logger.info('[CrypticStorage] Stats merged with CloudKit', {
            localCompleted: localStats.totalCompleted,
            cloudCompleted: cloudStats.totalCompleted,
            mergedCompleted: mergedStats.totalCompleted,
          });

          return mergedStats;
        }
      } catch (error) {
        logger.error('[CrypticStorage] CloudKit fetch failed (non-critical)', {
          error: error.message,
        });
        // Continue with local stats if fetch fails
      }
    }

    return localStats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load stats', { error: error.message });
    return defaultStats;
  }
}

/**
 * Update cryptic stats after puzzle completion
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 *
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {number} timeTaken - Time taken in seconds
 * @param {number} hintsUsed - Number of hints used
 * @param {boolean} isArchive - Whether this is an archive puzzle (default: false)
 * @param {boolean} isFirstAttempt - Whether this is the first attempt (default: true)
 * @returns {Promise<Object>} Updated stats object
 */
export async function updateCrypticStatsAfterCompletion(
  date,
  timeTaken,
  hintsUsed,
  isArchive = false,
  isFirstAttempt = true
) {
  try {
    const stats = await loadCrypticStats();

    // Add to completed puzzles (only for first attempts)
    if (isFirstAttempt) {
      if (!stats.completedPuzzles) {
        stats.completedPuzzles = {};
      }
      stats.completedPuzzles[date] = {
        timeTaken,
        hintsUsed,
        completedAt: new Date().toISOString(),
        isDaily: !isArchive, // Track if this was a daily puzzle
        isArchive: isArchive, // Track if this was an archive puzzle
      };

      // Update total completed
      stats.totalCompleted = Object.keys(stats.completedPuzzles).length;

      // Update perfect solves
      if (hintsUsed === 0) {
        stats.perfectSolves = (stats.perfectSolves || 0) + 1;
      }

      // Update total hints used
      stats.totalHintsUsed = (stats.totalHintsUsed || 0) + hintsUsed;

      // Calculate average time
      const times = Object.values(stats.completedPuzzles)
        .map((p) => p.timeTaken)
        .filter((t) => t && t > 0);
      if (times.length > 0) {
        stats.averageTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    }

    // CRITICAL: Only update streak for first-attempt daily puzzle completions
    // This matches Tandem Daily's streak logic
    if (isFirstAttempt && !isArchive) {
      // Calculate current streak (only from daily puzzles)
      stats.currentStreak = calculateCrypticStreak(stats.completedPuzzles);
      stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);

      // Save last played date
      stats.lastPlayedDate = date;
    }

    await saveCrypticStats(stats);
    logger.info('[CrypticStorage] Stats updated after completion', {
      date,
      isArchive,
      isFirstAttempt,
      streak: stats.currentStreak,
      totalCompleted: stats.totalCompleted,
    });

    return stats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to update stats', { error: error.message });
    return await loadCrypticStats();
  }
}

/**
 * Calculate current cryptic puzzle streak
 * CRITICAL: Only counts daily puzzles (not archive puzzles)
 * This matches Tandem Daily's streak calculation logic
 *
 * @param {Object} completedPuzzles - Object mapping dates to puzzle completion data
 * @returns {number} Current streak count
 */
export function calculateCrypticStreak(completedPuzzles) {
  try {
    if (!completedPuzzles || Object.keys(completedPuzzles).length === 0) {
      return 0;
    }

    // Filter to only include daily puzzles (not archive puzzles)
    // For backwards compatibility, if isDaily/isArchive fields don't exist, assume it's a daily puzzle
    const dailyPuzzles = {};
    Object.entries(completedPuzzles).forEach(([date, data]) => {
      const isDaily =
        data.isDaily === true || (data.isDaily === undefined && data.isArchive !== true);
      if (isDaily) {
        dailyPuzzles[date] = data;
      }
    });

    if (Object.keys(dailyPuzzles).length === 0) {
      return 0;
    }

    const puzzleInfo = getCurrentPuzzleInfo();
    const today = puzzleInfo.isoDate;
    const dates = Object.keys(dailyPuzzles).sort().reverse();

    // Check if today or yesterday is included (streak is alive)
    const todayDate = new Date(today);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const todayStr = today;
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
      return 0; // Streak broken
    }

    // Count consecutive days (walking backwards from today)
    let streak = 0;
    const currentDate = new Date(todayStr);

    for (let i = 0; i < dates.length; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];

      if (dates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to calculate streak', { error: error.message });
    return 0;
  }
}

/**
 * Get list of completed cryptic puzzle dates
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 *
 * @returns {Promise<string[]>} Array of ISO date strings
 */
export async function getCompletedCrypticPuzzles() {
  try {
    const stats = await loadCrypticStats();
    return Object.keys(stats.completedPuzzles || {});
  } catch (error) {
    logger.error('[CrypticStorage] Failed to get completed puzzles', { error: error.message });
    return [];
  }
}

/**
 * Merge local and cloud cryptic stats
 * Takes the maximum values to ensure we don't lose progress
 * Matches Tandem Daily's merge strategy
 *
 * @param {Object} localStats - Local stats object
 * @param {Object} cloudStats - Cloud stats object
 * @returns {Object} Merged stats object
 */
export function mergeCrypticStats(localStats, cloudStats) {
  if (!cloudStats) return localStats;
  if (!localStats) return cloudStats;

  // Merge completed puzzles (union of both)
  const mergedPuzzles = {
    ...(localStats.completedPuzzles || {}),
    ...(cloudStats.completedPuzzles || {}),
  };

  // For conflicts (same date in both), keep the one with better time
  Object.keys(localStats.completedPuzzles || {}).forEach((date) => {
    if (cloudStats.completedPuzzles && cloudStats.completedPuzzles[date]) {
      const localPuzzle = localStats.completedPuzzles[date];
      const cloudPuzzle = cloudStats.completedPuzzles[date];

      // Keep the one with faster time, or if times are equal, keep the one with fewer hints
      if (localPuzzle.timeTaken < cloudPuzzle.timeTaken) {
        mergedPuzzles[date] = localPuzzle;
      } else if (
        localPuzzle.timeTaken === cloudPuzzle.timeTaken &&
        localPuzzle.hintsUsed < cloudPuzzle.hintsUsed
      ) {
        mergedPuzzles[date] = localPuzzle;
      } else {
        mergedPuzzles[date] = cloudPuzzle;
      }
    }
  });

  // Calculate derived stats from merged puzzles
  const totalCompleted = Object.keys(mergedPuzzles).length;
  const perfectSolves = Object.values(mergedPuzzles).filter((p) => p.hintsUsed === 0).length;
  const totalHintsUsed = Object.values(mergedPuzzles).reduce(
    (sum, p) => sum + (p.hintsUsed || 0),
    0
  );

  const times = Object.values(mergedPuzzles)
    .map((p) => p.timeTaken)
    .filter((t) => t && t > 0);
  const averageTime =
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  // Calculate streak from merged puzzles
  const currentStreak = calculateCrypticStreak(mergedPuzzles);
  const longestStreak = Math.max(
    localStats.longestStreak || 0,
    cloudStats.longestStreak || 0,
    currentStreak
  );

  // Determine most recent play date
  const localDate = localStats.lastPlayedDate;
  const cloudDate = cloudStats.lastPlayedDate;
  let lastPlayedDate = null;

  if (localDate && cloudDate) {
    lastPlayedDate = localDate >= cloudDate ? localDate : cloudDate;
  } else {
    lastPlayedDate = localDate || cloudDate;
  }

  return {
    totalCompleted,
    currentStreak,
    longestStreak,
    totalHintsUsed,
    perfectSolves,
    averageTime,
    completedPuzzles: mergedPuzzles,
    lastPlayedDate,
  };
}

/**
 * Clear all cryptic storage data (for testing or reset)
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 */
export async function clearAllCrypticStorage() {
  try {
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS);
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STREAK);
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.LAST_PLAYED_DATE);

    // Clear all puzzle progress keys
    const allKeys = await getCrypticStorageKeys();
    const progressKeys = allKeys.filter((key) =>
      key.startsWith(CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS)
    );

    for (const key of progressKeys) {
      await removeCrypticStorageItem(key);
    }

    logger.info('[CrypticStorage] All cryptic storage cleared');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to clear all storage', { error: error.message });
  }
}

// =====================================================
// DEPRECATED FUNCTIONS (Removed - use main functions above)
// =====================================================
// The old *Async functions have been removed since all main functions
// are now async and platform-agnostic.
//
// Migration guide:
// - saveCrypticGameStateAsync() → saveCrypticGameState()
// - loadCrypticGameStateAsync() → loadCrypticGameState()
//
// All main functions now work on both iOS (Preferences) and Web (localStorage)
