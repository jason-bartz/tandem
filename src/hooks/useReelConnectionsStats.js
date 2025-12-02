import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'reel-connections-stats';
const USER_STORAGE_KEY_PREFIX = 'reel-connections-stats-user-';

const DEFAULT_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalTimeMs: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  gameHistory: [], // Array of { date, won, timeMs, mistakes }
};

/**
 * Get storage key for the current user
 * Ensures stats are separated per user account to prevent cross-account leakage
 */
function getStorageKey(userId) {
  if (userId) {
    return `${USER_STORAGE_KEY_PREFIX}${userId}`;
  }
  return STORAGE_KEY;
}

/**
 * useReelConnectionsStats - Custom hook for managing Reel Connections game statistics
 * Stores data in localStorage for persistence with multi-account support
 *
 * @returns {Object} stats and methods to update them
 */
export function useReelConnectionsStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevUserIdRef = useRef(null);
  const currentStorageKeyRef = useRef(STORAGE_KEY);

  // Load stats from localStorage on mount and when user changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userId = user?.id;
    const storageKey = getStorageKey(userId);
    currentStorageKeyRef.current = storageKey;

    // If user changed, reload stats from appropriate storage
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;

      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setStats({ ...DEFAULT_STATS, ...parsed });
        } else {
          // If user just logged in and has no user-specific stats,
          // check if there are anonymous stats to migrate
          if (userId) {
            const anonymousStats = window.localStorage.getItem(STORAGE_KEY);
            if (anonymousStats) {
              const parsed = JSON.parse(anonymousStats);
              setStats({ ...DEFAULT_STATS, ...parsed });
              // Save to user-specific key
              window.localStorage.setItem(storageKey, anonymousStats);
              // Clear anonymous stats to prevent confusion
              window.localStorage.removeItem(STORAGE_KEY);
            } else {
              setStats(DEFAULT_STATS);
            }
          } else {
            setStats(DEFAULT_STATS);
          }
        }
      } catch (error) {
        console.error('[ReelConnectionsStats] Error loading stats:', error);
        setStats(DEFAULT_STATS);
      }
      setIsLoaded(true);
    }
  }, [user?.id]);

  // Initial load for unauthenticated users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoaded) return;

    try {
      const storageKey = getStorageKey(user?.id);
      currentStorageKeyRef.current = storageKey;
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setStats({ ...DEFAULT_STATS, ...parsed });
      }
    } catch (error) {
      console.error('[ReelConnectionsStats] Error loading stats:', error);
    }
    setIsLoaded(true);
  }, [user?.id, isLoaded]);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    try {
      const storageKey = currentStorageKeyRef.current;
      window.localStorage.setItem(storageKey, JSON.stringify(stats));

      // Also save to default key for leaderboard sync to find
      // (AuthContext reads from default key)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('[ReelConnectionsStats] Error saving stats:', error);
    }
  }, [stats, isLoaded]);

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

      setStats((prev) => {
        // Calculate streak
        let newCurrentStreak = prev.currentStreak;

        if (won) {
          // Check if this continues a streak
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

          if (prev.lastPlayedDate === yesterdayStr || prev.currentStreak === 0) {
            newCurrentStreak = prev.currentStreak + 1;
          } else if (prev.lastPlayedDate !== yesterdayStr && prev.lastPlayedDate !== null) {
            // Streak broken, start fresh
            newCurrentStreak = 1;
          } else {
            newCurrentStreak = 1;
          }
        } else {
          // Lost game breaks streak
          newCurrentStreak = 0;
        }

        const newBestStreak = Math.max(prev.bestStreak, newCurrentStreak);

        // Add to game history (keep last 30 games)
        const newHistory = [
          { date: dateToRecord, won, timeMs, mistakes },
          ...prev.gameHistory.slice(0, 29),
        ];

        // Only update lastPlayedDate and streaks for today's puzzle, not archive
        const isArchivePuzzle = puzzleDate && puzzleDate !== today;

        const newStats = {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: won ? prev.gamesWon + 1 : prev.gamesWon,
          totalTimeMs: prev.totalTimeMs + timeMs,
          currentStreak: isArchivePuzzle ? prev.currentStreak : newCurrentStreak,
          bestStreak: isArchivePuzzle ? prev.bestStreak : newBestStreak,
          lastPlayedDate: isArchivePuzzle ? prev.lastPlayedDate : today,
          gameHistory: newHistory,
        };

        // Sync streak to leaderboard in background (for authenticated users, today's puzzle only)
        if (won && !isArchivePuzzle && newBestStreak > 0) {
          syncStreakToLeaderboard(newStats);
        }

        // Check for achievement unlocks
        checkAchievements(newStats);

        return newStats;
      });
    },
    [stats.gameHistory, getTodayDateString]
  );

  /**
   * Check for achievement unlocks (non-blocking)
   */
  const checkAchievements = async (updatedStats) => {
    try {
      const gameCenterService = (await import('@/services/gameCenter.service')).default;
      await gameCenterService.checkAndSubmitReelAchievements(updatedStats);
    } catch (error) {
      console.error('[ReelConnectionsStats] Failed to check achievements:', error);
    }
  };

  /**
   * Sync streak to leaderboard (non-blocking)
   */
  const syncStreakToLeaderboard = async (updatedStats) => {
    try {
      const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
      await syncCurrentStreakToLeaderboard(
        { currentStreak: updatedStats.currentStreak, bestStreak: updatedStats.bestStreak },
        'reel'
      );
    } catch (error) {
      console.error('[ReelConnectionsStats] Failed to sync streak to leaderboard:', error);
    }
  };

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
  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
    if (typeof window !== 'undefined') {
      const storageKey = currentStorageKeyRef.current;
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

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
