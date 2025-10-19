/**
 * Utility function to fix corrupted streak data
 * This can be used to recover streak data that was incorrectly reset to 0
 */

import { loadStats, saveStats, getGameHistory } from './storage';

export async function recoverStreak() {
  try {
    console.log('[StreakFix] Starting streak recovery process...');

    // Load current stats
    const currentStats = await loadStats();
    console.log('[StreakFix] Current stats:', currentStats);

    // If streak is already set, don't override
    if (currentStats.currentStreak > 0) {
      console.log('[StreakFix] Streak is already active, no recovery needed');
      return currentStats;
    }

    // Get game history to calculate actual streak
    const history = await getGameHistory();
    const dates = Object.keys(history).sort().reverse(); // Most recent first

    if (dates.length === 0) {
      console.log('[StreakFix] No game history found');
      return currentStats;
    }

    // Calculate current streak from history
    let calculatedStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const gameDate = new Date(dateStr + 'T00:00:00');
      const daysDiff = Math.floor((today - gameDate) / (1000 * 60 * 60 * 24));

      // Check if this date is part of current streak
      if (daysDiff === calculatedStreak && history[dateStr].completed) {
        calculatedStreak++;
      } else if (daysDiff > calculatedStreak) {
        // Gap in dates, streak broken
        break;
      }
    }

    console.log('[StreakFix] Calculated streak from history:', calculatedStreak);

    if (calculatedStreak > 0 && calculatedStreak !== currentStats.currentStreak) {
      console.log('[StreakFix] Recovering streak:', calculatedStreak);
      currentStats.currentStreak = calculatedStreak;
      currentStats.lastStreakUpdate = Date.now();

      // Update best streak if needed
      if (calculatedStreak > currentStats.bestStreak) {
        currentStats.bestStreak = calculatedStreak;
      }

      await saveStats(currentStats);
      console.log('[StreakFix] Streak recovered successfully');
    }

    return currentStats;
  } catch (error) {
    console.error('[StreakFix] Error recovering streak:', error);
    throw error;
  }
}

export async function debugStreakStatus() {
  try {
    const stats = await loadStats();
    const history = await getGameHistory();

    const debugInfo = {
      currentStats: {
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        lastStreakDate: stats.lastStreakDate,
        lastStreakUpdate: stats.lastStreakUpdate,
        timeSinceUpdate: stats.lastStreakUpdate ? Date.now() - stats.lastStreakUpdate : 'N/A',
      },
      recentGames: Object.keys(history)
        .sort()
        .reverse()
        .slice(0, 7)
        .map((date) => ({
          date,
          ...history[date],
        })),
    };

    console.log('[StreakDebug] Current streak status:', debugInfo);
    return debugInfo;
  } catch (error) {
    console.error('[StreakDebug] Error getting debug info:', error);
    throw error;
  }
}
