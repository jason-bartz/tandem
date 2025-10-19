import { STORAGE_KEYS } from './constants';
import cloudKitService from '@/services/cloudkit.service';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Platform-agnostic storage helpers
async function getStorageItem(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
}

async function setStorageItem(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

function getTodayDateString() {
  const { toZonedTime } = require('date-fns-tz');
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etToday = toZonedTime(now, etTimeZone);
  return `${etToday.getFullYear()}-${String(etToday.getMonth() + 1).padStart(2, '0')}-${String(etToday.getDate()).padStart(2, '0')}`;
}

function getYesterdayDateString(todayString) {
  const date = new Date(todayString + 'T00:00:00');
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function loadStats() {
  if (typeof window === 'undefined') {
    return { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };
  }

  const stats = await getStorageItem(STORAGE_KEYS.STATS);
  const parsedStats = stats
    ? JSON.parse(stats)
    : { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };

  // Add migration for existing users - ensure lastStreakUpdate exists
  if (parsedStats.currentStreak > 0 && !parsedStats.lastStreakUpdate) {
    console.log('[Storage] Migrating stats - adding lastStreakUpdate for existing user');
    parsedStats.lastStreakUpdate = Date.now();
    await saveStats(parsedStats);
  }

  // Check if streak should be reset due to missed days
  // This modifies parsedStats in place, so we return parsedStats after this call
  await checkAndUpdateStreak(parsedStats);

  return parsedStats;
}

async function checkAndUpdateStreak(stats) {
  // Only check if there's an active streak
  if (stats.currentStreak > 0 && stats.lastStreakDate) {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString(today);

    console.log('[Storage] checkAndUpdateStreak called', {
      currentStreak: stats.currentStreak,
      lastStreakDate: stats.lastStreakDate,
      today,
      yesterday,
      hasLastStreakUpdate: !!stats.lastStreakUpdate,
      lastStreakUpdate: stats.lastStreakUpdate,
    });

    // CRITICAL FIX: If lastStreakDate is today, they just played today - don't reset!
    if (stats.lastStreakDate === today) {
      console.log('[Storage] Last streak date is today - keeping current streak', {
        currentStreak: stats.currentStreak,
        lastStreakDate: stats.lastStreakDate,
      });
      return; // Don't reset streak if they played today
    }

    // Add protection against race conditions - check if we have a recent streak update
    // This prevents the streak from being reset if it was just updated
    if (stats.lastStreakUpdate) {
      const timeSinceUpdate = Date.now() - stats.lastStreakUpdate;
      // If streak was updated in the last 5 seconds, don't reset it
      // This handles the case where loadStats is called immediately after updateGameStats
      if (timeSinceUpdate < 5000) {
        console.log('[Storage] Skipping streak check - recently updated', {
          timeSinceUpdate,
          currentStreak: stats.currentStreak,
          lastStreakDate: stats.lastStreakDate,
        });
        return;
      }
    }

    // If last streak date is yesterday, the streak continues (they can play today)
    if (stats.lastStreakDate === yesterday) {
      console.log('[Storage] Streak continues - last played yesterday', {
        currentStreak: stats.currentStreak,
        lastStreakDate: stats.lastStreakDate,
        yesterday,
      });
      return; // Streak is still valid
    }

    // If we get here, last streak date is neither today nor yesterday - reset streak
    console.log('[Storage] Resetting streak due to missed days', {
      lastStreakDate: stats.lastStreakDate,
      yesterday,
      today,
      currentStreak: stats.currentStreak,
    });
    stats.currentStreak = 0;
    stats.lastStreakUpdate = Date.now(); // Add timestamp when resetting due to missed days
    // Don't update lastStreakDate here, keep it for history
    await saveStats(stats);
  } else if (!stats.lastStreakDate && stats.currentStreak > 0) {
    // Edge case: has a streak but no date (shouldn't happen but handle gracefully)
    console.log('[Storage] Warning: Streak without date, preserving streak', {
      currentStreak: stats.currentStreak,
    });
  }
}

export async function saveStats(stats) {
  if (typeof window !== 'undefined') {
    await setStorageItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

    // Sync to iCloud in background (don't await)
    cloudKitService.syncStats(stats).catch(() => {
      // CloudKit stats sync failed (non-critical)
    });
  }
}

export async function updateGameStats(
  won,
  isFirstAttempt = true,
  isArchiveGame = false,
  puzzleDate = null
) {
  const stats = await loadStats();

  console.log('[Storage] updateGameStats called with:', {
    won,
    isFirstAttempt,
    isArchiveGame,
    puzzleDate,
    currentStats: {
      played: stats.played,
      wins: stats.wins,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      lastStreakDate: stats.lastStreakDate,
    },
  });

  // Count games played for first attempts only (both daily and archive)
  if (isFirstAttempt) {
    stats.played++;
  }

  if (won) {
    // Count wins for first attempts only (both daily and archive)
    if (isFirstAttempt) {
      stats.wins++;
    }

    // Streak logic - only for daily puzzle first attempts
    if (isFirstAttempt && !isArchiveGame) {
      // Check if we played yesterday (for consecutive days)
      const lastStreakDate = stats.lastStreakDate;
      const today = puzzleDate || getTodayDateString();
      const yesterday = getYesterdayDateString(today);

      console.log('[Storage] Streak calculation:', {
        lastStreakDate,
        today,
        yesterday,
        currentStreakBefore: stats.currentStreak,
      });

      if (!lastStreakDate) {
        // No previous streak, start at 1
        stats.currentStreak = 1;
        console.log('[Storage] Starting new streak: 1 (no previous streak date)');
      } else if (lastStreakDate === yesterday) {
        // Played and won yesterday, continue streak
        const oldStreak = stats.currentStreak;
        stats.currentStreak++;
        console.log('[Storage] Continuing streak:', {
          oldStreak,
          newStreak: stats.currentStreak,
          lastStreakDate,
          yesterday,
          today,
        });
      } else if (lastStreakDate === today) {
        // Already played today, don't update
        // This handles multiple attempts on the same day
        console.log('[Storage] Already played today, keeping streak:', {
          currentStreak: stats.currentStreak,
          lastStreakDate,
          today,
        });
      } else {
        // Missed one or more days, restart streak
        const daysMissed = Math.floor(
          (new Date(today) - new Date(lastStreakDate)) / (1000 * 60 * 60 * 24)
        );
        console.log('[Storage] Missed days, restarting streak:', {
          oldStreak: stats.currentStreak,
          newStreak: 1,
          lastStreakDate,
          today,
          daysMissed,
        });
        stats.currentStreak = 1;
      }

      // Update last streak date and timestamp
      stats.lastStreakDate = today;
      stats.lastStreakUpdate = Date.now(); // Add timestamp to prevent race conditions

      // Update best streak if needed
      if (stats.currentStreak > stats.bestStreak) {
        console.log('[Storage] New best streak!', stats.currentStreak, '>', stats.bestStreak);
        stats.bestStreak = stats.currentStreak;
      }
    }
  } else {
    // Only reset streak for daily puzzle losses on first attempt
    if (isFirstAttempt && !isArchiveGame) {
      console.log('[Storage] Lost puzzle, resetting streak to 0');
      stats.currentStreak = 0;
      stats.lastStreakDate = puzzleDate || getTodayDateString();
      stats.lastStreakUpdate = Date.now(); // Add timestamp when resetting streak
    }
  }

  console.log('[Storage] Final stats after update:', {
    played: stats.played,
    wins: stats.wins,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    lastStreakDate: stats.lastStreakDate,
  });

  await saveStats(stats);
  return stats;
}

export function getTodayKey() {
  // Use Eastern Time for consistency with puzzle rotation
  const { toZonedTime } = require('date-fns-tz');
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etToday = toZonedTime(now, etTimeZone);
  return `tandem_${etToday.getFullYear()}_${etToday.getMonth() + 1}_${etToday.getDate()}`;
}

export async function hasPlayedToday() {
  if (typeof window === 'undefined') {
    return false;
  }
  const result = await getStorageItem(getTodayKey());
  return result !== null;
}

export async function hasPlayedPuzzle(date) {
  if (typeof window === 'undefined') {
    return false;
  }
  const dateObj = new Date(date + 'T00:00:00');
  const key = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
  const result = await getStorageItem(key);
  return result !== null;
}

export async function saveTodayResult(result) {
  if (typeof window !== 'undefined') {
    await setStorageItem(
      getTodayKey(),
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export async function savePuzzleResult(date, result) {
  if (typeof window !== 'undefined') {
    const dateObj = new Date(date + 'T00:00:00');
    const key = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
    const resultWithTimestamp = {
      ...result,
      timestamp: new Date().toISOString(),
    };

    await setStorageItem(key, JSON.stringify(resultWithTimestamp));

    // Sync to iCloud in background (don't await)
    cloudKitService.syncPuzzleResult(date, resultWithTimestamp).catch(() => {
      // CloudKit puzzle result sync failed (non-critical)
    });
  }
}

export async function savePuzzleProgress(date, progress) {
  if (typeof window !== 'undefined') {
    const dateObj = new Date(date + 'T00:00:00');
    const key = `tandem_progress_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
    const existing = await getStorageItem(key);
    const existingData = existing ? JSON.parse(existing) : {};

    const progressWithTimestamp = {
      ...existingData,
      ...progress,
      lastUpdated: new Date().toISOString(),
    };

    await setStorageItem(key, JSON.stringify(progressWithTimestamp));

    // Sync to iCloud in background (don't await)
    cloudKitService.syncPuzzleProgress(date, progressWithTimestamp).catch(() => {
      // CloudKit puzzle progress sync failed (non-critical)
    });
  }
}

export async function getTodayResult() {
  if (typeof window === 'undefined') {
    return null;
  }
  const result = await getStorageItem(getTodayKey());
  return result ? JSON.parse(result) : null;
}

export async function getStoredStats() {
  if (typeof window === 'undefined') {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      averageTime: null,
    };
  }

  const stats = await getStorageItem(STORAGE_KEYS.STATS);
  const parsedStats = stats ? JSON.parse(stats) : {};

  return {
    gamesPlayed: parsedStats.played || 0,
    gamesWon: parsedStats.wins || 0,
    currentStreak: parsedStats.currentStreak || 0,
    maxStreak: parsedStats.bestStreak || 0,
    averageTime: parsedStats.averageTime || null,
  };
}

export async function getGameHistory() {
  if (typeof window === 'undefined') {
    return {};
  }

  const history = {};
  const isNative = Capacitor.isNativePlatform();
  let keys = [];

  if (isNative) {
    const result = await Preferences.keys();
    keys = result.keys;
  } else {
    keys = Object.keys(localStorage);
  }

  for (const key of keys) {
    // Skip Game Center, subscription, notification, and other non-game storage keys
    // These keys use the tandem_ prefix but are not game history data
    if (
      key.startsWith('tandem_gc_') || // Game Center keys
      key.startsWith('tandem_pending_') || // Pending achievements/leaderboard
      key.startsWith('tandem_last_') || // Last submitted stats
      key.startsWith('tandem_product_') || // Subscription product ID
      key.startsWith('tandem_subscription_') || // Subscription status
      key === 'tandem_stats' || // Global stats
      key === 'tandem_puzzle_' || // Puzzle cache (not game history)
      key.startsWith('last_') || // Notification timestamps
      key === 'notification_permission' // Notification permission status
    ) {
      continue; // Skip non-game data
    }

    if (key.startsWith('tandem_')) {
      const parts = key.split('_');

      // Handle completed/failed games (format: tandem_YYYY_M_D)
      if (parts.length === 4 && parts[0] === 'tandem' && parts[1] !== 'progress') {
        const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
        const data = await getStorageItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            history[date] = {
              ...history[date],
              completed: parsed.won || false,
              failed: parsed.won === false, // Explicitly failed
              time: parsed.time,
              mistakes: parsed.mistakes,
              theme: parsed.theme, // Include the saved theme
              status: parsed.won ? 'completed' : 'failed',
            };
          } catch (error) {
            // Skip corrupted or non-JSON data for this key
            console.error(`[Storage] Failed to parse game result for ${key}:`, error.message);
            continue;
          }
        }
      }

      // Handle in-progress/attempted games (format: tandem_progress_YYYY_M_D)
      if (parts[1] === 'progress' && parts.length === 5) {
        const date = `${parts[2]}-${parts[3].padStart(2, '0')}-${parts[4].padStart(2, '0')}`;
        const data = await getStorageItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            // Only mark as attempted if there's no completion record
            if (!history[date] || !history[date].status) {
              history[date] = {
                ...history[date],
                attempted: true,
                status: 'attempted',
                lastPlayed: parsed.lastUpdated,
                solved: parsed.solved || 0,
                mistakes: parsed.mistakes || 0,
              };
            }
          } catch (error) {
            // Skip corrupted or non-JSON data for this key
            console.error(`[Storage] Failed to parse game progress for ${key}:`, error.message);
            continue;
          }
        }
      }
    }
  }

  return history;
}

/**
 * Restore data from iCloud to local storage
 * Used on first launch or when user chooses to restore from iCloud
 */
export async function restoreFromiCloud() {
  try {
    logger.info('[RESTORE] Starting iCloud restore...');
    const syncData = await cloudKitService.performFullSync();

    logger.info('[RESTORE] syncData received:', syncData);

    if (!syncData.success || !syncData.data) {
      logger.error('[RESTORE] No data found', {
        success: syncData.success,
        hasData: !!syncData.data,
      });
      return { success: false, message: 'No iCloud data found' };
    }

    const { stats, preferences, puzzleResults } = syncData.data;
    let restored = 0;

    // Merge stats (prefer CloudKit for higher values)
    if (stats) {
      const localStats = await loadStats();

      const mergedStats = {
        played: Math.max(stats.played || 0, localStats.played || 0),
        wins: Math.max(stats.wins || 0, localStats.wins || 0),
        bestStreak: Math.max(stats.bestStreak || 0, localStats.bestStreak || 0),
        currentStreak: stats.currentStreak || localStats.currentStreak || 0,
        lastStreakDate: stats.lastStreakDate || localStats.lastStreakDate,
      };

      await setStorageItem(STORAGE_KEYS.STATS, JSON.stringify(mergedStats));
      restored++;
    }

    // Restore preferences
    if (preferences) {
      if (preferences.theme) {
        await setStorageItem(STORAGE_KEYS.THEME, preferences.theme);
      }
      if (preferences.themeMode) {
        await setStorageItem(STORAGE_KEYS.THEME_MODE, preferences.themeMode);
      }
      if (preferences.highContrast !== undefined) {
        await setStorageItem(STORAGE_KEYS.HIGH_CONTRAST, preferences.highContrast.toString());
      }
      if (preferences.sound !== undefined) {
        await setStorageItem(STORAGE_KEYS.SOUND, preferences.sound.toString());
      }
      restored++;
    }

    // Restore puzzle results (use most recent timestamp)
    if (puzzleResults && Array.isArray(puzzleResults)) {
      for (const result of puzzleResults) {
        if (result.date) {
          const dateObj = new Date(result.date + 'T00:00:00');
          const key = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;

          // Check if local result exists
          const existingData = await getStorageItem(key);
          if (existingData) {
            const existing = JSON.parse(existingData);
            // Keep most recent
            if (existing.timestamp && result.timestamp && existing.timestamp > result.timestamp) {
              continue; // Keep local version
            }
          }

          // Save CloudKit version
          await setStorageItem(key, JSON.stringify(result));
          restored++;
        }
      }
    }

    logger.info('[RESTORE] Successfully restored', restored, 'items');

    // Even if restored count is 0, still return success if no errors occurred
    const message =
      restored > 0
        ? `Successfully restored ${restored} items from iCloud`
        : 'iCloud sync completed (no new data to restore)';

    const result = {
      success: true,
      restored,
      message,
    };

    logger.info('[RESTORE] Returning result:', result);

    // Debug: Force success return
    return {
      success: true,
      restored,
      message: `Successfully restored ${restored} items from iCloud`,
    };
  } catch (error) {
    logger.error('[RESTORE] Failed with error:', error);
    logger.error('[RESTORE] Error message:', error.message);
    logger.error('[RESTORE] Error stack:', error.stack);
    return {
      success: false,
      message: error.message || 'Failed to restore from iCloud',
    };
  }
}

/**
 * Merge local stats with CloudKit stats
 * Used to combine data from multiple devices
 */
export function mergeStats(localStats, cloudStats) {
  if (!cloudStats) return localStats;
  if (!localStats) return cloudStats;

  return {
    played: (localStats.played || 0) + (cloudStats.played || 0),
    wins: (localStats.wins || 0) + (cloudStats.wins || 0),
    bestStreak: Math.max(localStats.bestStreak || 0, cloudStats.bestStreak || 0),
    currentStreak: cloudStats.currentStreak || localStats.currentStreak || 0,
    lastStreakDate: cloudStats.lastStreakDate || localStats.lastStreakDate,
  };
}
