/**
 * Utility function to fix corrupted streak data
 * This can be used to recover streak data that was incorrectly reset to 0
 */

import { loadStats, saveStats, getGameHistory } from './storage';
import logger from '@/lib/logger';

export async function recoverStreak() {
  try {
    // Load current stats
    const currentStats = await loadStats();

    // If streak is already set, don't override
    if (currentStats.currentStreak > 0) {
      return currentStats;
    }

    // Get game history to calculate actual streak
    const history = await getGameHistory();
    const dates = Object.keys(history).sort().reverse(); // Most recent first

    if (dates.length === 0) {
      return currentStats;
    }

    let calculatedStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const gameDate = new Date(dateStr + 'T00:00:00');
      const daysDiff = Math.floor((today - gameDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === calculatedStreak && history[dateStr].completed) {
        calculatedStreak++;
      } else if (daysDiff > calculatedStreak) {
        // Gap in dates, streak broken
        break;
      }
    }

    if (calculatedStreak > 0 && calculatedStreak !== currentStats.currentStreak) {
      currentStats.currentStreak = calculatedStreak;
      currentStats.lastStreakUpdate = Date.now();

      if (calculatedStreak > currentStats.bestStreak) {
        currentStats.bestStreak = calculatedStreak;
      }

      await saveStats(currentStats);
    }

    return currentStats;
  } catch (error) {
    logger.error('Error recovering streak', error);
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

    return debugInfo;
  } catch (error) {
    logger.error('Error getting debug info', error);
    throw error;
  }
}
