import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/lib/constants';
import storageService from '@/core/storage/storageService';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import logger from '@/lib/logger';

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
 * Fetch user reel stats from database
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function fetchUserReelStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_REEL_STATS), {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to fetch user reel stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[ReelConnectionsStats] Failed to fetch stats from database', error);
    return null;
  }
}

/**
 * Save user reel stats to database
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function saveUserReelStatsToDatabase(stats) {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_REEL_STATS), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gamesPlayed: stats.gamesPlayed || 0,
        gamesWon: stats.gamesWon || 0,
        totalTimeMs: stats.totalTimeMs || 0,
        currentStreak: stats.currentStreak || 0,
        bestStreak: stats.bestStreak || 0,
        lastPlayedDate: stats.lastPlayedDate || null,
        gameHistory: stats.gameHistory || [],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to save user reel stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[ReelConnectionsStats] Failed to save stats to database', error);
    return null;
  }
}

/**
 * Merge local stats with database stats
 * Takes the higher values for cumulative stats
 * @private
 */
function mergeReelStats(localStats, dbStats) {
  // Merge game history - combine and dedupe by date
  const historyMap = new Map();

  // Add local history first
  (localStats.gameHistory || []).forEach((game) => {
    historyMap.set(game.date, game);
  });

  // Add db history (overwrites if same date - db is authoritative)
  (dbStats.gameHistory || []).forEach((game) => {
    historyMap.set(game.date, game);
  });

  // Sort by date descending and keep last 30
  const mergedHistory = Array.from(historyMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  return {
    gamesPlayed: Math.max(localStats.gamesPlayed || 0, dbStats.gamesPlayed || 0),
    gamesWon: Math.max(localStats.gamesWon || 0, dbStats.gamesWon || 0),
    totalTimeMs: Math.max(localStats.totalTimeMs || 0, dbStats.totalTimeMs || 0),
    currentStreak: Math.max(localStats.currentStreak || 0, dbStats.currentStreak || 0),
    bestStreak: Math.max(localStats.bestStreak || 0, dbStats.bestStreak || 0),
    lastPlayedDate: localStats.lastPlayedDate || dbStats.lastPlayedDate || null,
    gameHistory: mergedHistory,
  };
}

/**
 * Check for achievement unlocks (non-blocking, fire-and-forget)
 * Called after game completion to trigger achievement notifications
 * @param {Object} updatedStats - The updated stats after game completion
 */
async function triggerAchievementCheck(updatedStats) {
  try {
    const { checkAndNotifyReelAchievements } = await import('@/lib/achievementNotifier');
    await checkAndNotifyReelAchievements(updatedStats);
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
  const currentStorageKeyRef = useRef(STORAGE_KEY);
  const isSyncingRef = useRef(false);

  // Load stats from localStorage and database on mount and when user changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userId = user?.id;
    const storageKey = getStorageKey(userId);
    currentStorageKeyRef.current = storageKey;

    // Check if we need to reload (first load or user changed)
    const userChanged = prevUserIdRef.current !== userId;
    const needsLoad = !isLoaded || userChanged;

    if (!needsLoad) return;

    prevUserIdRef.current = userId;

    const loadStats = async () => {
      try {
        // Load local stats first (uses storageService with IndexedDB fallback)
        let localStats = DEFAULT_STATS;
        const stored = await storageService.get(storageKey);
        if (stored) {
          localStats = { ...DEFAULT_STATS, ...JSON.parse(stored) };
        } else if (userId) {
          // User is logged in but no user-specific stats exist
          // Try to migrate from anonymous stats
          const anonymousStats = await storageService.get(STORAGE_KEY);
          if (anonymousStats) {
            localStats = { ...DEFAULT_STATS, ...JSON.parse(anonymousStats) };
            // Save to user-specific key
            await storageService.set(storageKey, anonymousStats);
          }
        } else {
          // Anonymous user - load from default key
          const anonymousStats = await storageService.get(STORAGE_KEY);
          if (anonymousStats) {
            localStats = { ...DEFAULT_STATS, ...JSON.parse(anonymousStats) };
          }
        }

        // DATABASE-FIRST: If user is authenticated, sync with database
        if (userId) {
          const dbStats = await fetchUserReelStatsFromDatabase();

          if (dbStats) {
            // Merge local and database stats
            const mergedStats = mergeReelStats(localStats, dbStats);

            // Save merged stats locally (with quota handling and IndexedDB fallback)
            // NOTE: Only save to user-namespaced key to prevent cross-account contamination
            await storageService.set(storageKey, JSON.stringify(mergedStats));

            // Save merged stats to database (fire-and-forget)
            saveUserReelStatsToDatabase(mergedStats).catch((err) => {
              logger.error('[ReelConnectionsStats] Failed to save merged stats to db', err);
            });

            setStats(mergedStats);
          } else {
            // No database stats, use local and sync to database
            setStats(localStats);

            // Sync local stats to database if we have any data
            if (localStats.gamesPlayed > 0) {
              saveUserReelStatsToDatabase(localStats).catch((err) => {
                logger.error('[ReelConnectionsStats] Failed to sync local stats to db', err);
              });
            }
          }
        } else {
          setStats(localStats);
        }
      } catch (error) {
        logger.error('[ReelConnectionsStats] Error loading stats', error);
        setStats(DEFAULT_STATS);
      }
      setIsLoaded(true);
    };

    loadStats();
  }, [user?.id, isLoaded]);

  // Save stats to localStorage and database whenever they change
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    if (isSyncingRef.current) return; // Prevent sync loops

    const saveStats = async () => {
      try {
        const storageKey = currentStorageKeyRef.current;
        // Use storageService with quota handling and IndexedDB fallback
        // NOTE: Only save to user-namespaced key (or anonymous key for non-auth users)
        // to prevent cross-account contamination on shared devices
        await storageService.set(storageKey, JSON.stringify(stats));

        // If user is authenticated, sync to database (fire-and-forget)
        if (user?.id && stats.gamesPlayed > 0) {
          isSyncingRef.current = true;
          saveUserReelStatsToDatabase(stats)
            .catch((err) => {
              logger.error('[ReelConnectionsStats] Failed to sync stats to database', err);
            })
            .finally(() => {
              isSyncingRef.current = false;
            });
        }
      } catch (error) {
        logger.error('[ReelConnectionsStats] Error saving stats', error);
      }
    };

    saveStats();
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

      // Update state (this triggers the save effect)
      setStats(newStats);

      // Trigger async operations after state update (fire-and-forget)
      // These run outside the React render cycle for better performance
      if (won && !isArchivePuzzle && newBestStreak > 0) {
        triggerLeaderboardSync(newStats);
      }

      // Always check for achievements on game completion (not just wins)
      // First win achievement needs to trigger for gamesWon >= 1
      triggerAchievementCheck(newStats);
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
      const storageKey = currentStorageKeyRef.current;
      // Use storageService to remove from all storage layers
      await storageService.remove(storageKey);
      await storageService.remove(STORAGE_KEY);
    }
    // Also clear from database if user is authenticated
    if (user?.id) {
      saveUserReelStatsToDatabase(DEFAULT_STATS).catch((err) => {
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
