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

  // Check if streak should be reset due to missed days
  await checkAndUpdateStreak(parsedStats);

  return parsedStats;
}

async function checkAndUpdateStreak(stats) {
  // Only check if there's an active streak
  if (stats.currentStreak > 0 && stats.lastStreakDate) {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString(today);

    // If last streak date is not yesterday or today, reset streak
    if (stats.lastStreakDate !== yesterday && stats.lastStreakDate !== today) {
      stats.currentStreak = 0;
      // Don't update lastStreakDate here, keep it for history
      await saveStats(stats);
    }
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

      if (!lastStreakDate) {
        // No previous streak, start at 1
        stats.currentStreak = 1;
      } else if (lastStreakDate === yesterday) {
        // Played and won yesterday, continue streak
        stats.currentStreak++;
      } else if (lastStreakDate === today) {
        // Already played today, don't update
        // This handles multiple attempts on the same day
      } else {
        // Missed one or more days, restart streak
        stats.currentStreak = 1;
      }

      // Update last streak date
      stats.lastStreakDate = today;

      // Update best streak if needed
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    }
  } else {
    // Only reset streak for daily puzzle losses on first attempt
    if (isFirstAttempt && !isArchiveGame) {
      stats.currentStreak = 0;
      stats.lastStreakDate = puzzleDate || getTodayDateString();
    }
  }

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
    if (key.startsWith('tandem_')) {
      const parts = key.split('_');

      // Handle completed/failed games
      if (parts.length === 4 && parts[0] === 'tandem' && parts[1] !== 'progress') {
        const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
        const data = await getStorageItem(key);
        if (data) {
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
        }
      }

      // Handle in-progress/attempted games
      if (parts[1] === 'progress' && parts.length === 5) {
        const date = `${parts[2]}-${parts[3].padStart(2, '0')}-${parts[4].padStart(2, '0')}`;
        const data = await getStorageItem(key);
        if (data) {
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
      logger.error('[RESTORE] No data found', { success: syncData.success, hasData: !!syncData.data });
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
    const message = restored > 0
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
