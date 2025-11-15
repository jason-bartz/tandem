/**
 * Mini Crossword Local Storage Utilities
 * Handles local storage for Daily Mini crossword game state and progress
 *
 * Platform-Agnostic Storage:
 * - iOS: Uses Capacitor Preferences API
 * - Web: Uses browser localStorage
 * - Matches cryptic/tandem daily storage patterns
 */

import { MINI_STORAGE_KEYS, API_ENDPOINTS } from '@/core/config/constants';
import { getCurrentPuzzleInfo } from '@/utils/helpers/utils';
import logger from '@/utils/helpers/logger';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import cloudKitService from '@/core/services/cloudkit.service';

// =====================================================
// PLATFORM-AGNOSTIC STORAGE HELPERS
// =====================================================

/**
 * Platform-agnostic storage helper - GET
 * @param {string} key - Storage key
 * @returns {Promise<string|null>}
 */
async function getMiniStorageItem(key) {
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
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<void>}
 */
async function setMiniStorageItem(key, value) {
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
 * @param {string} key - Storage key to remove
 * @returns {Promise<void>}
 */
async function removeMiniStorageItem(key) {
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
 * Get all storage keys
 * @returns {Promise<string[]>}
 */
async function getMiniStorageKeys() {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const result = await Preferences.keys();
    return result.keys;
  } else {
    return Object.keys(localStorage);
  }
}

/**
 * Check if user is authenticated
 * @private
 */
async function isUserAuthenticated() {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return !!session?.user;
  } catch (error) {
    logger.error('[miniStorage] Failed to check auth status', error);
    return false;
  }
}

/**
 * Fetch user mini stats from database
 * @private
 */
async function fetchUserMiniStatsFromDatabase() {
  try {
    const response = await fetch(`${API_ENDPOINTS.MINI_STATS}?aggregate=true`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to fetch user mini stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[miniStorage] Failed to fetch user mini stats from database', error);
    return null;
  }
}

/**
 * Save user mini stats to database
 * @private
 */
async function saveUserMiniStatsToDatabase(stats) {
  try {
    const response = await fetch(API_ENDPOINTS.MINI_STATS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        totalCompleted: stats.totalCompleted || 0,
        currentStreak: stats.currentStreak || 0,
        longestStreak: stats.longestStreak || 0,
        totalChecksUsed: stats.totalChecksUsed || 0,
        totalRevealsUsed: stats.totalRevealsUsed || 0,
        perfectSolves: stats.perfectSolves || 0,
        averageTime: stats.averageTime || 0,
        bestTime: stats.bestTime || null,
        completedPuzzles: stats.completedPuzzles || {},
        lastPlayedDate: stats.lastPlayedDate || null,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to save user mini stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[miniStorage] Failed to save user mini stats to database', error);
    return null;
  }
}

// =====================================================
// CORE STORAGE FUNCTIONS
// =====================================================

/**
 * Save current mini game state
 */
export async function saveMiniGameState(state) {
  try {
    const stateToSave = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    await setMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME, JSON.stringify(stateToSave));
    logger.info('[MiniStorage] Game state saved');
  } catch (error) {
    logger.error('[MiniStorage] Failed to save game state', { error: error.message });
  }
}

/**
 * Load current mini game state
 */
export async function loadMiniGameState() {
  try {
    const saved = await getMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME);
    if (!saved) return null;

    const state = JSON.parse(saved);
    logger.info('[MiniStorage] Game state loaded', { savedAt: state.savedAt });
    return state;
  } catch (error) {
    logger.error('[MiniStorage] Failed to load game state', { error: error.message });
    return null;
  }
}

/**
 * Clear current mini game state
 */
export async function clearMiniGameState() {
  try {
    await removeMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME);
    logger.info('[MiniStorage] Game state cleared');
  } catch (error) {
    logger.error('[MiniStorage] Failed to clear game state', { error: error.message });
  }
}

/**
 * Save mini puzzle progress for a specific date
 */
export async function saveMiniPuzzleProgress(date, progress) {
  try {
    const key = `${MINI_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const progressToSave = {
      ...progress,
      date,
      savedAt: new Date().toISOString(),
    };
    await setMiniStorageItem(key, JSON.stringify(progressToSave));
    logger.info('[MiniStorage] Puzzle progress saved locally', { date });

    // Sync to CloudKit in background (non-blocking)
    if (cloudKitService.isSyncAvailable()) {
      cloudKitService.syncMiniPuzzleProgress(date, progressToSave).catch((err) => {
        logger.error('[MiniStorage] CloudKit progress sync failed (non-critical)', {
          date,
          error: err.message,
        });
      });
    }
  } catch (error) {
    logger.error('[MiniStorage] Failed to save puzzle progress', {
      date,
      error: error.message,
    });
  }
}

/**
 * Load mini puzzle progress for a specific date
 */
export async function loadMiniPuzzleProgress(date) {
  try {
    const key = `${MINI_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const saved = await getMiniStorageItem(key);
    const localProgress = saved ? JSON.parse(saved) : null;

    // Fetch from CloudKit if available
    if (cloudKitService.isSyncAvailable()) {
      try {
        const cloudProgress = await cloudKitService.fetchMiniPuzzleProgress(date);

        if (cloudProgress) {
          if (localProgress && cloudProgress) {
            const localTime = new Date(localProgress.savedAt || 0).getTime();
            const cloudTime = new Date(cloudProgress.savedAt || 0).getTime();

            if (cloudTime > localTime) {
              await setMiniStorageItem(key, JSON.stringify(cloudProgress));
              logger.info('[MiniStorage] Using cloud progress (more recent)', {
                date,
                cloudTime,
                localTime,
              });
              return cloudProgress;
            } else {
              logger.info('[MiniStorage] Using local progress (more recent)', { date });
              return localProgress;
            }
          } else if (cloudProgress) {
            await setMiniStorageItem(key, JSON.stringify(cloudProgress));
            logger.info('[MiniStorage] Using cloud progress (only source)', { date });
            return cloudProgress;
          }
        }
      } catch (error) {
        logger.error('[MiniStorage] CloudKit fetch failed (non-critical)', {
          date,
          error: error.message,
        });
      }
    }

    if (localProgress) {
      logger.info('[MiniStorage] Puzzle progress loaded from local', { date });
    }
    return localProgress;
  } catch (error) {
    logger.error('[MiniStorage] Failed to load puzzle progress', {
      date,
      error: error.message,
    });
    return null;
  }
}

/**
 * Check if user has completed a mini puzzle for a specific date
 */
export async function hasMiniPuzzleCompleted(date) {
  try {
    const progress = await loadMiniPuzzleProgress(date);
    return progress && progress.completed === true;
  } catch (error) {
    logger.error('[MiniStorage] Failed to check puzzle completion', {
      date,
      error: error.message,
    });
    return false;
  }
}

/**
 * Save mini stats
 * DATABASE-FIRST: Database is source of truth for authenticated users
 */
export async function saveMiniStats(stats, skipCloudSync = false, skipDatabaseSync = false) {
  try {
    logger.info('[MiniStorage] Saving stats:', stats);
    await setMiniStorageItem(MINI_STORAGE_KEYS.STATS, JSON.stringify(stats));
    logger.info('[MiniStorage] Stats saved to local storage');

    // DATABASE-FIRST: Sync to database for authenticated users
    if (!skipDatabaseSync) {
      const isAuthenticated = await isUserAuthenticated();
      if (isAuthenticated) {
        try {
          const dbStats = await saveUserMiniStatsToDatabase(stats);
          if (dbStats) {
            logger.info('[MiniStorage] Stats synced to database:', dbStats);
            await setMiniStorageItem(MINI_STORAGE_KEYS.STATS, JSON.stringify(dbStats));
            return dbStats;
          }
        } catch (error) {
          logger.error('[MiniStorage] Failed to sync with database', error);
        }
      } else {
        logger.info('[MiniStorage] User not authenticated, skipping database sync');
      }
    }

    // Sync to CloudKit (iOS only)
    if (!skipCloudSync && cloudKitService.isSyncAvailable()) {
      try {
        const syncResult = await cloudKitService.syncMiniStats(stats);

        if (syncResult.success && syncResult.mergedStats) {
          await setMiniStorageItem(MINI_STORAGE_KEYS.STATS, JSON.stringify(syncResult.mergedStats));
          logger.info('[MiniStorage] Stats synced and merged with CloudKit');
          return syncResult.mergedStats;
        }
      } catch (error) {
        logger.error('[MiniStorage] CloudKit sync failed (non-critical)', {
          error: error.message,
        });
      }
    }

    return stats;
  } catch (error) {
    logger.error('[MiniStorage] Failed to save stats', { error: error.message });
    return stats;
  }
}

/**
 * Load mini stats
 * DATABASE-FIRST: Database is source of truth for authenticated users
 */
export async function loadMiniStats() {
  if (typeof window === 'undefined') {
    return getDefaultMiniStats();
  }

  const defaultStats = getDefaultMiniStats();

  try {
    const saved = await getMiniStorageItem(MINI_STORAGE_KEYS.STATS);
    logger.info('[MiniStorage] Raw stats from storage:', saved);
    const localStats = saved ? JSON.parse(saved) : defaultStats;
    logger.info('[MiniStorage] Parsed local stats:', localStats);

    // DATABASE-FIRST: Sync with database if authenticated
    const isAuthenticated = await isUserAuthenticated();
    if (isAuthenticated) {
      try {
        const dbStats = await fetchUserMiniStatsFromDatabase();

        if (dbStats) {
          logger.info('[MiniStorage] Database stats fetched:', dbStats);

          // Merge database stats with local stats
          const mergedStats = mergeMiniStats(localStats, dbStats);
          logger.info('[MiniStorage] Merged stats (local + database):', mergedStats);

          // Save merged stats locally (skip sync to avoid loops)
          await saveMiniStats(mergedStats, true, true);

          // Sync to leaderboard if applicable
          if (mergedStats.longestStreak > 0) {
            try {
              const { syncCurrentStreakToLeaderboard } = await import(
                '@/shared/leaderboard/lib/leaderboardSync'
              );
              syncCurrentStreakToLeaderboard(
                {
                  currentStreak: mergedStats.longestStreak,
                  bestStreak: mergedStats.longestStreak,
                },
                'mini'
              ).catch((error) => {
                logger.error('[MiniStorage] Failed to sync streak to leaderboard:', error);
              });
            } catch (error) {
              logger.error('[MiniStorage] Failed to import leaderboard sync:', error);
            }
          }

          return mergedStats;
        } else {
          logger.info('[MiniStorage] No database stats found, using local stats');
        }
      } catch (error) {
        logger.error('[MiniStorage] Failed to sync with database', error);
      }
    } else {
      logger.info('[MiniStorage] User not authenticated, skipping database sync');
    }

    if (cloudKitService.isSyncAvailable()) {
      try {
        const cloudStats = await cloudKitService.fetchMiniStats();

        if (cloudStats) {
          const mergedStats = mergeMiniStats(localStats, cloudStats);
          await saveMiniStats(mergedStats, true);

          logger.info('[MiniStorage] Stats merged with CloudKit', {
            localCompleted: localStats.totalCompleted,
            cloudCompleted: cloudStats.totalCompleted,
            mergedCompleted: mergedStats.totalCompleted,
          });

          return mergedStats;
        }
      } catch (error) {
        logger.error('[MiniStorage] CloudKit fetch failed (non-critical)', {
          error: error.message,
        });
      }
    }

    return localStats;
  } catch (error) {
    logger.error('[MiniStorage] Failed to load stats', { error: error.message });
    return defaultStats;
  }
}

/**
 * Get default mini stats structure
 */
function getDefaultMiniStats() {
  return {
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalChecksUsed: 0,
    totalRevealsUsed: 0,
    perfectSolves: 0,
    averageTime: 0,
    bestTime: null,
    completedPuzzles: {},
    lastPlayedDate: null,
  };
}

/**
 * Update mini stats after puzzle completion
 */
export async function updateMiniStatsAfterCompletion(
  date,
  timeTaken,
  checksUsed,
  revealsUsed,
  isArchive = false,
  isFirstAttempt = true
) {
  try {
    const stats = await loadMiniStats();

    // Add to completed puzzles (only for first attempts)
    if (isFirstAttempt) {
      if (!stats.completedPuzzles) {
        stats.completedPuzzles = {};
      }
      stats.completedPuzzles[date] = {
        timeTaken,
        checksUsed,
        revealsUsed,
        completedAt: new Date().toISOString(),
        isDaily: !isArchive,
        isArchive: isArchive,
      };

      stats.totalCompleted = Object.keys(stats.completedPuzzles).length;

      if (checksUsed === 0 && revealsUsed === 0) {
        stats.perfectSolves = (stats.perfectSolves || 0) + 1;
      }

      stats.totalChecksUsed = (stats.totalChecksUsed || 0) + checksUsed;
      stats.totalRevealsUsed = (stats.totalRevealsUsed || 0) + revealsUsed;

      const times = Object.values(stats.completedPuzzles)
        .map((p) => p.timeTaken)
        .filter((t) => t && t > 0);
      if (times.length > 0) {
        stats.averageTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }

      if (timeTaken && timeTaken > 0) {
        if (!stats.bestTime || timeTaken < stats.bestTime) {
          stats.bestTime = timeTaken;
        }
      }
    }

    if (isFirstAttempt && !isArchive) {
      stats.currentStreak = calculateMiniStreak(stats.completedPuzzles);
      stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
      stats.lastPlayedDate = date;
    }

    await saveMiniStats(stats);
    logger.info('[MiniStorage] Stats updated after completion', {
      date,
      isArchive,
      isFirstAttempt,
      streak: stats.currentStreak,
      totalCompleted: stats.totalCompleted,
      bestTime: stats.bestTime,
    });

    return stats;
  } catch (error) {
    logger.error('[MiniStorage] Failed to update stats', { error: error.message });
    return await loadMiniStats();
  }
}

/**
 * Calculate current mini puzzle streak
 * Only counts daily puzzles (not archive puzzles)
 */
export function calculateMiniStreak(completedPuzzles) {
  try {
    if (!completedPuzzles || Object.keys(completedPuzzles).length === 0) {
      return 0;
    }

    // Filter to only daily puzzles
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
    logger.error('[MiniStorage] Failed to calculate streak', { error: error.message });
    return 0;
  }
}

/**
 * Get list of completed mini puzzle dates
 */
export async function getCompletedMiniPuzzles() {
  try {
    const stats = await loadMiniStats();
    return Object.keys(stats.completedPuzzles || {});
  } catch (error) {
    logger.error('[MiniStorage] Failed to get completed puzzles', { error: error.message });
    return [];
  }
}

/**
 * Merge local and cloud mini stats
 */
export function mergeMiniStats(localStats, cloudStats) {
  if (!cloudStats) return localStats;
  if (!localStats) return cloudStats;

  // Merge completed puzzles (union of both)
  const mergedPuzzles = {
    ...(localStats.completedPuzzles || {}),
    ...(cloudStats.completedPuzzles || {}),
  };

  // For conflicts, keep the one with better time
  Object.keys(localStats.completedPuzzles || {}).forEach((date) => {
    if (cloudStats.completedPuzzles && cloudStats.completedPuzzles[date]) {
      const localPuzzle = localStats.completedPuzzles[date];
      const cloudPuzzle = cloudStats.completedPuzzles[date];

      // Keep the one with faster time
      if (localPuzzle.timeTaken < cloudPuzzle.timeTaken) {
        mergedPuzzles[date] = localPuzzle;
      } else if (localPuzzle.timeTaken === cloudPuzzle.timeTaken) {
        // If times equal, keep one with fewer helps used
        const localHelps = localPuzzle.checksUsed + localPuzzle.revealsUsed;
        const cloudHelps = cloudPuzzle.checksUsed + cloudPuzzle.revealsUsed;
        if (localHelps < cloudHelps) {
          mergedPuzzles[date] = localPuzzle;
        } else {
          mergedPuzzles[date] = cloudPuzzle;
        }
      } else {
        mergedPuzzles[date] = cloudPuzzle;
      }
    }
  });

  const totalCompleted = Object.keys(mergedPuzzles).length;
  const perfectSolves = Object.values(mergedPuzzles).filter(
    (p) => (p.checksUsed || 0) === 0 && (p.revealsUsed || 0) === 0
  ).length;
  const totalChecksUsed = Object.values(mergedPuzzles).reduce(
    (sum, p) => sum + (p.checksUsed || 0),
    0
  );
  const totalRevealsUsed = Object.values(mergedPuzzles).reduce(
    (sum, p) => sum + (p.revealsUsed || 0),
    0
  );

  const times = Object.values(mergedPuzzles)
    .map((p) => p.timeTaken)
    .filter((t) => t && t > 0);
  const averageTime =
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const bestTime = times.length > 0 ? Math.min(...times) : null;

  const currentStreak = calculateMiniStreak(mergedPuzzles);
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
    totalChecksUsed,
    totalRevealsUsed,
    perfectSolves,
    averageTime,
    bestTime,
    completedPuzzles: mergedPuzzles,
    lastPlayedDate,
  };
}

/**
 * Clear all mini storage data
 */
export async function clearAllMiniStorage() {
  try {
    await removeMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME);
    await removeMiniStorageItem(MINI_STORAGE_KEYS.STATS);

    const allKeys = await getMiniStorageKeys();
    const progressKeys = allKeys.filter((key) => key.startsWith(MINI_STORAGE_KEYS.PUZZLE_PROGRESS));

    for (const key of progressKeys) {
      await removeMiniStorageItem(key);
    }

    logger.info('[MiniStorage] All mini storage cleared');
  } catch (error) {
    logger.error('[MiniStorage] Failed to clear all storage', { error: error.message });
  }
}
