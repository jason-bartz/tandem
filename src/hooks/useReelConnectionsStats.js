import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/lib/logger';
import {
  DEFAULT_REEL_STATS as DEFAULT_STATS,
  loadReelStats,
  saveReelStats,
} from '@/lib/reelStorage';

/**
 * Check for achievement unlocks (non-blocking, fire-and-forget).
 *
 * Passes both the updated stats and the previous stats so the notifier can
 * compute exactly which achievements were crossed by THIS game (avoids any
 * race with the post-sign-in backfill, which could otherwise inundate the
 * user with toasts for historical achievements).
 *
 * @param {Object} updatedStats - The stats AFTER the game was recorded
 * @param {Object} previousStats - The stats BEFORE the game was recorded
 */
async function triggerAchievementCheck(updatedStats, previousStats) {
  try {
    const { checkAndNotifyReelAchievements } = await import('@/lib/achievementNotifier');
    await checkAndNotifyReelAchievements(updatedStats, { previousStats });
  } catch (error) {
    logger.error('[ReelConnectionsStats] Failed to check achievements', error);
  }
}

/**
 * Sync streak to leaderboard (non-blocking, fire-and-forget)
 * @param {Object} updatedStats - The updated stats with streak info
 */
async function triggerLeaderboardSync(updatedStats) {
  try {
    const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
    await syncCurrentStreakToLeaderboard(
      { currentStreak: updatedStats.currentStreak, bestStreak: updatedStats.bestStreak },
      'reel'
    );
  } catch (error) {
    logger.error('[ReelConnectionsStats] Failed to sync streak to leaderboard', error);
  }
}

/**
 * useReelConnectionsStats - Custom hook for managing Reel Connections game statistics
 * Uses DATABASE-FIRST sync pattern for authenticated users
 * Falls back to localStorage for anonymous users
 *
 * @returns {Object} stats and methods to update them
 */
export function useReelConnectionsStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevUserIdRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Load stats from localStorage and database on mount and when user changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userId = user?.id;

    // Check if we need to reload (first load or user changed)
    const userChanged = prevUserIdRef.current !== userId;
    const needsLoad = !isLoaded || userChanged;

    if (!needsLoad) return;

    prevUserIdRef.current = userId;

    const loadStatsAsync = async () => {
      try {
        const merged = await loadReelStats();
        setStats(merged);
      } catch (error) {
        logger.error('[ReelConnectionsStats] Error loading stats', error);
        setStats(DEFAULT_STATS);
      }
      setIsLoaded(true);
    };

    loadStatsAsync();
  }, [user?.id, isLoaded]);

  // Save stats to localStorage and database whenever they change
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    if (isSyncingRef.current) return; // Prevent sync loops

    const persistStats = async () => {
      try {
        isSyncingRef.current = true;
        await saveReelStats(stats);
      } catch (error) {
        logger.error('[ReelConnectionsStats] Error saving stats', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    persistStats();
  }, [stats, isLoaded, user?.id]);

  /**
   * Get today's date string in YYYY-MM-DD format (local timezone)
   */
  const getTodayDateString = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  /**
   * Check if the user has already played today
   */
  const hasPlayedToday = useCallback(() => {
    const today = getTodayDateString();
    return stats.lastPlayedDate === today;
  }, [stats.lastPlayedDate, getTodayDateString]);

  /**
   * Record a completed game
   * @param {boolean} won - Whether the player won
   * @param {number} timeMs - Time taken in milliseconds
   * @param {number} mistakes - Number of mistakes made
   * @param {string} puzzleDate - Optional date string (YYYY-MM-DD) for archive puzzles
   */
  const recordGame = useCallback(
    (won, timeMs, mistakes, puzzleDate = null) => {
      const today = getTodayDateString();
      const dateToRecord = puzzleDate || today;

      // Don't record if already played this puzzle date
      const alreadyPlayed = stats.gameHistory.some((g) => g.date === dateToRecord);
      if (alreadyPlayed) {
        return;
      }

      // Calculate new stats synchronously
      let newCurrentStreak = stats.currentStreak;

      if (won) {
        // Check if this continues a streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        if (stats.lastPlayedDate === yesterdayStr || stats.currentStreak === 0) {
          newCurrentStreak = stats.currentStreak + 1;
        } else if (stats.lastPlayedDate !== yesterdayStr && stats.lastPlayedDate !== null) {
          // Streak broken, start fresh
          newCurrentStreak = 1;
        } else {
          newCurrentStreak = 1;
        }
      } else {
        // Lost game breaks streak
        newCurrentStreak = 0;
      }

      const newBestStreak = Math.max(stats.bestStreak, newCurrentStreak);

      // Add to game history (keep last 30 games)
      const newHistory = [
        { date: dateToRecord, won, timeMs, mistakes },
        ...stats.gameHistory.slice(0, 29),
      ];

      // Only update lastPlayedDate and streaks for today's puzzle, not archive
      const isArchivePuzzle = puzzleDate && puzzleDate !== today;

      const newStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        gamesWon: won ? stats.gamesWon + 1 : stats.gamesWon,
        totalTimeMs: stats.totalTimeMs + timeMs,
        currentStreak: isArchivePuzzle ? stats.currentStreak : newCurrentStreak,
        bestStreak: isArchivePuzzle ? stats.bestStreak : newBestStreak,
        lastPlayedDate: isArchivePuzzle ? stats.lastPlayedDate : today,
        gameHistory: newHistory,
      };

      // Snapshot the previous achievement-relevant fields BEFORE updating
      // state. The notifier uses these to compute exactly which achievements
      // were crossed by THIS game — robust against any race with the
      // post-sign-in backfill.
      const previousStatsForAchievements = {
        bestStreak: stats.bestStreak,
        gamesWon: stats.gamesWon,
      };

      // Update state (this triggers the save effect)
      setStats(newStats);

      // Trigger async operations after state update (fire-and-forget)
      // These run outside the React render cycle for better performance
      if (won && !isArchivePuzzle && newBestStreak > 0) {
        triggerLeaderboardSync(newStats);
      }

      // Always check for achievements on game completion (not just wins)
      // First win achievement needs to trigger for gamesWon >= 1
      triggerAchievementCheck(newStats, previousStatsForAchievements);
    },
    [stats, getTodayDateString]
  );

  /**
   * Calculate average time in milliseconds
   */
  const getAverageTimeMs = useCallback(() => {
    if (stats.gamesWon === 0) return 0;
    // Only count won games for average time
    const wonGames = stats.gameHistory.filter((g) => g.won);
    if (wonGames.length === 0) return 0;
    const totalWonTime = wonGames.reduce((sum, g) => sum + g.timeMs, 0);
    return Math.round(totalWonTime / wonGames.length);
  }, [stats.gamesWon, stats.gameHistory]);

  /**
   * Format time from milliseconds to MM:SS
   */
  const formatTime = useCallback((ms) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Reset all stats (for debugging/testing)
   */
  const resetStats = useCallback(async () => {
    setStats(DEFAULT_STATS);
    if (typeof window !== 'undefined') {
      const { clearReelStats } = await import('@/lib/reelStorage');
      await clearReelStats(user?.id || null);
    }
    // Persist the empty stats to the database too if authenticated
    if (user?.id) {
      saveReelStats(DEFAULT_STATS).catch((err) => {
        logger.error('[ReelConnectionsStats] Failed to reset stats in database', err);
      });
    }
  }, [user?.id]);

  return {
    stats,
    isLoaded,
    hasPlayedToday,
    recordGame,
    getAverageTimeMs,
    formatTime,
    resetStats,
  };
}

export default useReelConnectionsStats;
