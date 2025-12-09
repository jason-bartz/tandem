/**
 * Mini Game Local Storage Utilities
 * Handles local storage for The Daily Mini crossword game state and progress
 *
 * Platform-Agnostic Storage:
 * - iOS: Uses Capacitor Preferences API
 * - Web: Uses browser localStorage
 * - Matches Tandem Daily and Daily Cryptic's proven storage pattern
 *
 * DATABASE-FIRST ARCHITECTURE:
 * - Authenticated users: Database is source of truth, local storage is cache
 * - Unauthenticated users: Local storage only
 * - CloudKit: Background iOS sync (non-blocking)
 */

import { MINI_STORAGE_KEYS, API_ENDPOINTS } from './constants';
import { getCurrentMiniPuzzleInfo } from './miniUtils';
import logger from './logger';
import cloudKitService from '@/services/cloudkit.service';
import storageService from '@/core/storage/storageService';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';

// =====================================================
// PLATFORM-AGNOSTIC STORAGE HELPERS
// Uses storageService for resilient storage with IndexedDB fallback
// =====================================================

/**
 * Platform-agnostic storage helper - GET
 * Uses storageService which provides: localStorage → IndexedDB → in-memory fallback
 */
async function getMiniStorageItem(key) {
  return storageService.get(key);
}

/**
 * Platform-agnostic storage helper - SET
 * Uses storageService which handles quota errors with automatic fallback
 */
async function setMiniStorageItem(key, value) {
  return storageService.set(key, value);
}

/**
 * Platform-agnostic storage helper - REMOVE
 * Removes from all storage layers (localStorage, IndexedDB, memory)
 */
async function removeMiniStorageItem(key) {
  return storageService.remove(key);
}

/**
 * Get all storage keys (for migration/debugging)
 * Uses storageService to get keys from all storage layers
 */
async function getMiniStorageKeys() {
  return storageService.getAllKeys();
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
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function fetchUserMiniStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_MINI_STATS), {
      method: 'GET',
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
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function saveUserMiniStatsToDatabase(stats) {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_MINI_STATS), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        totalCompleted: stats.totalCompleted || 0,
        currentStreak: stats.currentStreak || 0,
        longestStreak: stats.longestStreak || 0,
        averageTime: stats.averageTime || 0,
        bestTime: stats.bestTime || 0,
        perfectSolves: stats.perfectSolves || 0,
        totalChecks: stats.totalChecks || 0,
        totalReveals: stats.totalReveals || 0,
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
 * Platform-agnostic: Works on iOS (Preferences) and Web (localStorage)
 */
export async function saveMiniGameState(state) {
  try {
    const stateToSave = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    await setMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME, JSON.stringify(stateToSave));
    logger.info('[miniStorage] Game state saved');
  } catch (error) {
    logger.error('[miniStorage] Failed to save game state', { error: error.message });
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
    logger.info('[miniStorage] Game state loaded', { savedAt: state.savedAt });
    return state;
  } catch (error) {
    logger.error('[miniStorage] Failed to load game state', { error: error.message });
    return null;
  }
}

/**
 * Clear current mini game state
 */
export async function clearMiniGameState() {
  try {
    await removeMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME);
    logger.info('[miniStorage] Game state cleared');
  } catch (error) {
    logger.error('[miniStorage] Failed to clear game state', { error: error.message });
  }
}

/**
 * Save mini puzzle progress for a specific date
 * CloudKit: Syncs progress to iCloud in background
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
    logger.info('[miniStorage] Puzzle progress saved locally', { date });

    // Sync to CloudKit in background (non-blocking)
    if (cloudKitService.isSyncAvailable()) {
      cloudKitService.syncPuzzleProgress(date, progressToSave, 'mini').catch((err) => {
        logger.error('[miniStorage] CloudKit progress sync failed (non-critical)', {
          date,
          error: err.message,
        });
      });
    }
  } catch (error) {
    logger.error('[miniStorage] Failed to save puzzle progress', {
      date,
      error: error.message,
    });
  }
}

/**
 * Load mini puzzle progress for a specific date
 * CloudKit: Fetches and merges progress from iCloud
 */
export async function loadMiniPuzzleProgress(date) {
  try {
    const key = `${MINI_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const saved = await getMiniStorageItem(key);
    const localProgress = saved ? JSON.parse(saved) : null;

    // Fetch from CloudKit if available
    if (cloudKitService.isSyncAvailable()) {
      try {
        const cloudProgress = await cloudKitService.fetchPuzzleProgress(date, 'mini');

        if (cloudProgress) {
          if (localProgress && cloudProgress) {
            const localTime = new Date(localProgress.savedAt || 0).getTime();
            const cloudTime = new Date(cloudProgress.savedAt || 0).getTime();

            if (cloudTime > localTime) {
              await setMiniStorageItem(key, JSON.stringify(cloudProgress));
              logger.info('[miniStorage] Using cloud progress (more recent)', {
                date,
                cloudTime,
                localTime,
              });
              return cloudProgress;
            } else {
              logger.info('[miniStorage] Using local progress (more recent)', { date });
              return localProgress;
            }
          } else if (cloudProgress) {
            await setMiniStorageItem(key, JSON.stringify(cloudProgress));
            logger.info('[miniStorage] Using cloud progress (only source)', { date });
            return cloudProgress;
          }
        }
      } catch (error) {
        logger.error('[miniStorage] CloudKit fetch failed (non-critical)', {
          date,
          error: error.message,
        });
      }
    }

    if (localProgress) {
      logger.info('[miniStorage] Puzzle progress loaded from local', { date });
    }
    return localProgress;
  } catch (error) {
    logger.error('[miniStorage] Failed to load puzzle progress', {
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
    logger.error('[miniStorage] Failed to check puzzle completion', {
      date,
      error: error.message,
    });
    return false;
  }
}

/**
 * Save mini stats
 * DATABASE-FIRST ARCHITECTURE:
 * - Authenticated users: Database is source of truth, local storage is cache
 * - Unauthenticated users: Local storage only
 *
 * @param {Object} stats - Stats object to save
 * @param {boolean} skipCloudSync - If true, skip CloudKit sync (default: false)
 * @param {boolean} skipDatabaseSync - If true, skip database sync (default: false)
 * @returns {Promise<Object>} The saved stats (may be merged with database/CloudKit)
 */
export async function saveMiniStats(stats, skipCloudSync = false, skipDatabaseSync = false) {
  try {
    logger.info('[miniStorage] Saving stats:', stats);
    await setMiniStorageItem(MINI_STORAGE_KEYS.STATS, JSON.stringify(stats));
    logger.info('[miniStorage] Stats saved to local storage');

    // DATABASE-FIRST: Always sync to database for authenticated users
    if (!skipDatabaseSync) {
      const isAuthenticated = await isUserAuthenticated();
      if (isAuthenticated) {
        try {
          const dbStats = await saveUserMiniStatsToDatabase(stats);
          if (dbStats) {
            logger.info('[miniStorage] Stats synced to database:', dbStats);
            await setMiniStorageItem(MINI_STORAGE_KEYS.STATS, JSON.stringify(dbStats));
            return dbStats;
          }
        } catch (error) {
          logger.error('[miniStorage] Failed to sync with database', error);
        }
      } else {
        logger.info('[miniStorage] User not authenticated, skipping database sync');
      }
    }

    // Sync to CloudKit (iOS only)
    if (!skipCloudSync && cloudKitService.isSyncAvailable()) {
      try {
        const syncResult = await cloudKitService.syncStats(stats, 'mini');

        if (syncResult.success && syncResult.mergedStats) {
          await setMiniStorageItem(MINI_STORAGE_KEYS.STATS, JSON.stringify(syncResult.mergedStats));
          logger.info('[miniStorage] Stats synced and merged with CloudKit');
          return syncResult.mergedStats;
        }
      } catch (error) {
        logger.error('[miniStorage] CloudKit sync failed (non-critical)', {
          error: error.message,
        });
      }
    }

    return stats;
  } catch (error) {
    logger.error('[miniStorage] Failed to save stats', { error: error.message });
    return stats;
  }
}

/**
 * Load mini stats
 * DATABASE-FIRST ARCHITECTURE
 */
export async function loadMiniStats() {
  if (typeof window === 'undefined') {
    return {
      totalCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageTime: 0,
      bestTime: 0,
      perfectSolves: 0,
      totalChecks: 0,
      totalReveals: 0,
      completedPuzzles: {},
    };
  }

  const defaultStats = {
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageTime: 0,
    bestTime: 0,
    perfectSolves: 0,
    totalChecks: 0,
    totalReveals: 0,
    completedPuzzles: {},
  };

  try {
    const saved = await getMiniStorageItem(MINI_STORAGE_KEYS.STATS);
    logger.info('[miniStorage] Raw stats from storage:', saved);
    const localStats = saved ? JSON.parse(saved) : defaultStats;
    logger.info('[miniStorage] Parsed local stats:', localStats);

    // DATABASE-FIRST: Try to sync with database if user is authenticated
    const isAuthenticated = await isUserAuthenticated();
    if (isAuthenticated) {
      try {
        const dbStats = await fetchUserMiniStatsFromDatabase();

        if (dbStats) {
          logger.info('[miniStorage] Database stats fetched:', dbStats);

          // Merge database stats with local stats
          const mergedStats = mergeMiniStats(localStats, dbStats);
          logger.info('[miniStorage] Merged stats (local + database):', mergedStats);

          // Save merged stats locally (skip cloud and DB sync to avoid loops)
          await saveMiniStats(mergedStats, true, true);

          // Sync streak to leaderboard
          if (mergedStats.longestStreak > 0) {
            try {
              const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
              syncCurrentStreakToLeaderboard(
                { currentStreak: mergedStats.longestStreak, bestStreak: mergedStats.longestStreak },
                'mini'
              ).catch((error) => {
                logger.error('[miniStorage] Failed to sync streak to leaderboard:', error);
              });
            } catch (error) {
              logger.error('[miniStorage] Failed to import leaderboard sync:', error);
            }
          }

          return mergedStats;
        } else {
          logger.info('[miniStorage] No database stats found, using local stats');
        }
      } catch (error) {
        logger.error('[miniStorage] Failed to sync with database', error);
      }
    } else {
      logger.info('[miniStorage] User not authenticated, skipping database sync');
    }

    // Try CloudKit if available
    if (cloudKitService.isSyncAvailable()) {
      try {
        const cloudStats = await cloudKitService.fetchStats('mini');

        if (cloudStats) {
          const mergedStats = mergeMiniStats(localStats, cloudStats);
          await saveMiniStats(mergedStats, true);

          logger.info('[miniStorage] Stats merged with CloudKit', {
            localCompleted: localStats.totalCompleted,
            cloudCompleted: cloudStats.totalCompleted,
            mergedCompleted: mergedStats.totalCompleted,
          });

          return mergedStats;
        }
      } catch (error) {
        logger.error('[miniStorage] CloudKit fetch failed (non-critical)', {
          error: error.message,
        });
      }
    }

    return localStats;
  } catch (error) {
    logger.error('[miniStorage] Failed to load stats', { error: error.message });
    return defaultStats;
  }
}

/**
 * Update mini stats after puzzle completion
 *
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {number} timeTaken - Time taken in seconds
 * @param {number} checksUsed - Number of check actions used
 * @param {number} revealsUsed - Number of reveal actions used
 * @param {number} mistakes - Number of mistakes made
 * @param {boolean} isArchive - Whether this is an archive puzzle (not daily)
 * @returns {Promise<Object>} Updated stats
 */
export async function updateMiniStatsAfterCompletion(
  date,
  timeTaken,
  checksUsed = 0,
  revealsUsed = 0,
  mistakes = 0,
  isArchive = false
) {
  try {
    const stats = await loadMiniStats();

    // Check if this is the first attempt (hasn't been completed before)
    const isFirstAttempt = !stats.completedPuzzles[date];

    // Record puzzle completion
    const puzzleData = {
      timeTaken,
      checksUsed,
      revealsUsed,
      mistakes,
      completedAt: new Date().toISOString(),
      isDaily: !isArchive,
      isArchive,
      perfectSolve: checksUsed === 0 && revealsUsed === 0 && mistakes === 0,
    };

    // If this puzzle was already completed, keep the best time
    if (stats.completedPuzzles[date]) {
      const existingTime = stats.completedPuzzles[date].timeTaken;
      if (existingTime < timeTaken) {
        puzzleData.timeTaken = existingTime;
        timeTaken = existingTime;
      }
    }

    stats.completedPuzzles[date] = puzzleData;

    // Only count first-time completions toward total
    if (isFirstAttempt) {
      stats.totalCompleted = (stats.totalCompleted || 0) + 1;

      if (puzzleData.perfectSolve) {
        stats.perfectSolves = (stats.perfectSolves || 0) + 1;
      }

      stats.totalChecks = (stats.totalChecks || 0) + checksUsed;
      stats.totalReveals = (stats.totalReveals || 0) + revealsUsed;

      // Calculate average time
      const times = Object.values(stats.completedPuzzles)
        .map((p) => p.timeTaken)
        .filter((t) => t && t > 0);
      if (times.length > 0) {
        stats.averageTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }

      // Update best time
      if (!stats.bestTime || timeTaken < stats.bestTime) {
        stats.bestTime = timeTaken;
      }
    }

    // CRITICAL: Only update streak for first-attempt daily puzzle completions
    if (isFirstAttempt && !isArchive) {
      stats.currentStreak = calculateMiniStreak(stats.completedPuzzles);
      stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
      stats.lastPlayedDate = date;
    }

    await saveMiniStats(stats);
    logger.info('[miniStorage] Stats updated after completion', {
      date,
      isArchive,
      isFirstAttempt,
      streak: stats.currentStreak,
      totalCompleted: stats.totalCompleted,
    });

    // Sync streak to leaderboard if this was a daily puzzle and we have a streak
    if (isFirstAttempt && !isArchive && stats.longestStreak > 0) {
      try {
        const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
        syncCurrentStreakToLeaderboard(
          { currentStreak: stats.currentStreak, bestStreak: stats.longestStreak },
          'mini'
        ).catch((error) => {
          logger.error('[miniStorage] Failed to sync streak to leaderboard:', error);
        });
      } catch (error) {
        logger.error('[miniStorage] Failed to import leaderboard sync:', error);
      }
    }

    // Check and notify for mini achievements (fire-and-forget)
    try {
      const { checkAndNotifyMiniAchievements } = await import('@/lib/achievementNotifier');
      checkAndNotifyMiniAchievements(stats).catch((error) => {
        logger.error('[miniStorage] Failed to check achievements:', error);
      });
    } catch (error) {
      logger.error('[miniStorage] Failed to import achievement notifier:', error);
    }

    return stats;
  } catch (error) {
    logger.error('[miniStorage] Failed to update stats', { error: error.message });
    return await loadMiniStats();
  }
}

/**
 * Calculate current mini puzzle streak
 * CRITICAL: Only counts daily puzzles (not archive puzzles)
 */
export function calculateMiniStreak(completedPuzzles) {
  try {
    if (!completedPuzzles || Object.keys(completedPuzzles).length === 0) {
      return 0;
    }

    // Filter to only include daily puzzles
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

    // Get sorted dates (most recent first)
    const dates = Object.keys(dailyPuzzles).sort((a, b) => b.localeCompare(a));

    // Get today's date
    const today = getCurrentMiniPuzzleInfo().isoDate;
    const todayDate = new Date(today);

    // Start from today and count backwards
    let streak = 0;
    const currentDate = new Date(todayDate);

    // Check if today's puzzle is completed
    const todayCompleted = dates.includes(today);

    if (todayCompleted) {
      // Start counting from today
      streak = 1;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // Check if yesterday's puzzle is completed (grace period)
      currentDate.setDate(currentDate.getDate() - 1);
      const yesterday = currentDate.toISOString().split('T')[0];

      if (!dates.includes(yesterday)) {
        // Streak is broken
        return 0;
      }

      streak = 1;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count backwards
    for (let i = 0; i < 365; i++) {
      // Max 1 year
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
    logger.error('[miniStorage] Failed to calculate streak', { error: error.message });
    return 0;
  }
}

/**
 * Merge two stats objects (for CloudKit/Database sync)
 * Takes the best of both: highest streaks, merged completed puzzles, etc.
 */
export function mergeMiniStats(localStats, cloudStats) {
  // Merge completed puzzles (union of both)
  const mergedPuzzles = { ...localStats.completedPuzzles };

  Object.entries(cloudStats.completedPuzzles || {}).forEach(([date, cloudPuzzle]) => {
    const localPuzzle = mergedPuzzles[date];

    if (!localPuzzle) {
      // Puzzle only in cloud, add it
      mergedPuzzles[date] = cloudPuzzle;
    } else {
      // Puzzle in both, keep the one with better time
      if (cloudPuzzle.timeTaken < localPuzzle.timeTaken) {
        mergedPuzzles[date] = cloudPuzzle;
      }
      // Merge other fields
      mergedPuzzles[date].checksUsed = Math.min(
        localPuzzle.checksUsed || 0,
        cloudPuzzle.checksUsed || 0
      );
      mergedPuzzles[date].revealsUsed = Math.min(
        localPuzzle.revealsUsed || 0,
        cloudPuzzle.revealsUsed || 0
      );
      mergedPuzzles[date].mistakes = Math.min(localPuzzle.mistakes || 0, cloudPuzzle.mistakes || 0);
    }
  });

  const totalCompleted = Object.keys(mergedPuzzles).length;
  const perfectSolves = Object.values(mergedPuzzles).filter((p) => p.perfectSolve === true).length;
  const totalChecks = Object.values(mergedPuzzles).reduce((sum, p) => sum + (p.checksUsed || 0), 0);
  const totalReveals = Object.values(mergedPuzzles).reduce(
    (sum, p) => sum + (p.revealsUsed || 0),
    0
  );

  const times = Object.values(mergedPuzzles)
    .map((p) => p.timeTaken)
    .filter((t) => t && t > 0);
  const averageTime =
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  const bestTime = Math.min(
    localStats.bestTime || Infinity,
    cloudStats.bestTime || Infinity,
    ...times
  );

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
    averageTime,
    bestTime: bestTime === Infinity ? 0 : bestTime,
    perfectSolves,
    totalChecks,
    totalReveals,
    completedPuzzles: mergedPuzzles,
    lastPlayedDate,
  };
}

/**
 * Clear all mini storage (for debugging/reset)
 */
export async function clearAllMiniStorage() {
  try {
    await removeMiniStorageItem(MINI_STORAGE_KEYS.CURRENT_GAME);
    await removeMiniStorageItem(MINI_STORAGE_KEYS.STATS);

    // Clear all puzzle progress
    const keys = await getMiniStorageKeys();
    const progressKeys = keys.filter((key) => key.startsWith(MINI_STORAGE_KEYS.PUZZLE_PROGRESS));

    for (const key of progressKeys) {
      await removeMiniStorageItem(key);
    }

    logger.info('[miniStorage] All mini storage cleared');
  } catch (error) {
    logger.error('[miniStorage] Failed to clear all storage', { error: error.message });
  }
}

/**
 * Get completed mini puzzles (for archive calendar)
 * Returns the completedPuzzles object from stats
 */
export async function getCompletedMiniPuzzles() {
  try {
    const stats = await loadMiniStats();
    return stats.completedPuzzles || {};
  } catch (error) {
    logger.error('[miniStorage] Failed to get completed puzzles', { error: error.message });
    return {};
  }
}

/**
 * Export stats for debugging
 */
export async function exportMiniStats() {
  try {
    const stats = await loadMiniStats();
    const gameState = await loadMiniGameState();

    return {
      stats,
      gameState,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[miniStorage] Failed to export stats', { error: error.message });
    return null;
  }
}
