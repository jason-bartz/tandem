import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import { SOUP_API, SOUP_STORAGE_KEYS } from '@/lib/daily-alchemy.constants';
import logger from '@/lib/logger';

const DEFAULT_STATS = {
  totalCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageTime: 0,
  bestTime: null,
  totalMoves: 0,
  totalDiscoveries: 0,
  firstDiscoveries: 0,
  underPar: 0,
  atPar: 0,
  overPar: 0,
  lastPlayedDate: null,
};

/**
 * Fetch user Daily Alchemy stats from database
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function fetchUserAlchemyStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(SOUP_API.STATS), {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to fetch user alchemy stats: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.stats) {
      return null;
    }

    // Convert API format to local format
    return {
      totalCompleted: data.stats.totalCompleted || 0,
      currentStreak: data.stats.currentStreak || 0,
      longestStreak: data.stats.longestStreak || 0,
      averageTime: data.stats.averageTime || 0,
      bestTime: data.stats.bestTime || null,
      totalMoves: data.stats.totalMoves || 0,
      totalDiscoveries: data.stats.totalDiscoveries || 0,
      firstDiscoveries: data.stats.firstDiscoveries || 0,
      underPar: data.stats.parStats?.underPar || 0,
      atPar: data.stats.parStats?.atPar || 0,
      overPar: data.stats.parStats?.overPar || 0,
      lastPlayedDate: data.stats.lastPlayedDate || null,
    };
  } catch (error) {
    logger.error('[DailyAlchemyStats] Failed to fetch stats from database', error);
    return null;
  }
}

/**
 * Merge local stats with database stats
 * Takes the higher values for cumulative stats
 * @private
 */
function mergeAlchemyStats(localStats, dbStats) {
  if (!dbStats) return localStats;
  if (!localStats) return dbStats;

  // For current streak, use the one with the most recent lastPlayedDate
  let currentStreak = localStats.currentStreak || 0;
  let lastPlayedDate = localStats.lastPlayedDate;

  if (dbStats.lastPlayedDate && localStats.lastPlayedDate) {
    if (dbStats.lastPlayedDate >= localStats.lastPlayedDate) {
      currentStreak = dbStats.currentStreak || 0;
      lastPlayedDate = dbStats.lastPlayedDate;
    }
  } else if (dbStats.lastPlayedDate) {
    currentStreak = dbStats.currentStreak || 0;
    lastPlayedDate = dbStats.lastPlayedDate;
  }

  return {
    totalCompleted: Math.max(localStats.totalCompleted || 0, dbStats.totalCompleted || 0),
    currentStreak,
    longestStreak: Math.max(localStats.longestStreak || 0, dbStats.longestStreak || 0),
    averageTime: dbStats.averageTime || localStats.averageTime || 0, // Use DB as source of truth for averages
    bestTime:
      localStats.bestTime && dbStats.bestTime
        ? Math.min(localStats.bestTime, dbStats.bestTime)
        : localStats.bestTime || dbStats.bestTime || null,
    totalMoves: Math.max(localStats.totalMoves || 0, dbStats.totalMoves || 0),
    totalDiscoveries: Math.max(localStats.totalDiscoveries || 0, dbStats.totalDiscoveries || 0),
    firstDiscoveries: Math.max(localStats.firstDiscoveries || 0, dbStats.firstDiscoveries || 0),
    underPar: Math.max(localStats.underPar || 0, dbStats.underPar || 0),
    atPar: Math.max(localStats.atPar || 0, dbStats.atPar || 0),
    overPar: Math.max(localStats.overPar || 0, dbStats.overPar || 0),
    lastPlayedDate,
  };
}

/**
 * useDailyAlchemyStats - Custom hook for managing Daily Alchemy game statistics
 * Uses DATABASE-FIRST sync pattern for authenticated users
 * Falls back to localStorage for anonymous users
 *
 * @returns {Object} stats and methods to interact with them
 */
export function useDailyAlchemyStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevUserIdRef = useRef(null);

  // Load stats from localStorage and database on mount and when user changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userId = user?.id;

    // Check if we need to reload (first load or user changed)
    const userChanged = prevUserIdRef.current !== userId;
    const needsLoad = !isLoaded || userChanged;

    if (!needsLoad) return;

    prevUserIdRef.current = userId;

    const loadStats = async () => {
      try {
        // Load local stats first
        let localStats = DEFAULT_STATS;
        const stored = localStorage.getItem(SOUP_STORAGE_KEYS.STATS);
        if (stored) {
          try {
            localStats = { ...DEFAULT_STATS, ...JSON.parse(stored) };
          } catch (e) {
            logger.error('[DailyAlchemyStats] Failed to parse local stats', e);
          }
        }

        // DATABASE-FIRST: If user is authenticated, sync with database
        if (userId) {
          const dbStats = await fetchUserAlchemyStatsFromDatabase();

          if (dbStats) {
            // Merge local and database stats
            const mergedStats = mergeAlchemyStats(localStats, dbStats);

            logger.info('[DailyAlchemyStats] Merged stats from database', {
              local: localStats.totalCompleted,
              db: dbStats.totalCompleted,
              merged: mergedStats.totalCompleted,
            });

            // Save merged stats locally
            localStorage.setItem(SOUP_STORAGE_KEYS.STATS, JSON.stringify(mergedStats));

            setStats(mergedStats);
          } else {
            // No database stats, use local
            setStats(localStats);
          }
        } else {
          setStats(localStats);
        }
      } catch (error) {
        logger.error('[DailyAlchemyStats] Error loading stats', error);
        setStats(DEFAULT_STATS);
      }
      setIsLoaded(true);
    };

    loadStats();
  }, [user?.id, isLoaded]);

  /**
   * Refresh stats from the database
   * Call this after a game is completed to get updated stats
   */
  const refreshStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const dbStats = await fetchUserAlchemyStatsFromDatabase();
      if (dbStats) {
        setStats(dbStats);
        localStorage.setItem(SOUP_STORAGE_KEYS.STATS, JSON.stringify(dbStats));
        logger.info('[DailyAlchemyStats] Stats refreshed from database');
      }
    } catch (error) {
      logger.error('[DailyAlchemyStats] Failed to refresh stats', error);
    }
  }, [user?.id]);

  /**
   * Update local stats (called after game completion)
   * The actual database sync happens via the /api/daily-alchemy/complete endpoint
   */
  const updateLocalStats = useCallback(
    (newStats) => {
      const merged = { ...stats, ...newStats };
      setStats(merged);
      localStorage.setItem(SOUP_STORAGE_KEYS.STATS, JSON.stringify(merged));
    },
    [stats]
  );

  return {
    stats,
    isLoaded,
    refreshStats,
    updateLocalStats,
  };
}

export default useDailyAlchemyStats;
