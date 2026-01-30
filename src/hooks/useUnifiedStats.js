import { useState, useEffect } from 'react';
import { loadStats } from '@/lib/storage';
import { loadMiniStats } from '@/lib/miniStorage';
import storageService from '@/core/storage/storageService';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import { API_ENDPOINTS } from '@/lib/constants';
import logger from '@/lib/logger';
import { SOUP_STORAGE_KEYS, SOUP_API } from '@/lib/daily-alchemy.constants';

const REEL_STORAGE_KEY = 'reel-connections-stats';

const DEFAULT_REEL_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalTimeMs: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  gameHistory: [],
};

const DEFAULT_SOUP_STATS = {
  totalCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageTime: 0,
  bestTime: 0,
  totalMoves: 0,
  totalDiscoveries: 0,
  firstDiscoveries: 0,
  underPar: 0,
  atPar: 0,
  overPar: 0,
  lastPlayedDate: null,
};

/**
 * Fetch Reel stats from database
 * @private
 */
async function fetchReelStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_REEL_STATS), {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error(`Failed to fetch reel stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[loadReelStats] Failed to fetch from database:', error);
    return null;
  }
}

/**
 * Fetch Soup stats from database
 * @private
 */
async function fetchSoupStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(SOUP_API.STATS), {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error(`Failed to fetch soup stats: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.stats) return null;

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
    logger.error('[loadSoupStats] Failed to fetch from database:', error);
    return null;
  }
}

/**
 * Merge Reel stats - take max values for cumulative stats
 * @private
 */
function mergeReelStats(localStats, dbStats) {
  if (!dbStats) return localStats;
  if (!localStats) return dbStats;

  // Merge game history - combine and dedupe by date
  const historyMap = new Map();
  (localStats.gameHistory || []).forEach((game) => historyMap.set(game.date, game));
  (dbStats.gameHistory || []).forEach((game) => historyMap.set(game.date, game));
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
 * Merge Soup stats - take max values for cumulative stats
 * @private
 */
function mergeSoupStats(localStats, dbStats) {
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
    averageTime: dbStats.averageTime || localStats.averageTime || 0,
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
 * Load Reel Connections stats from storage and database
 * Uses DATABASE-FIRST pattern for authenticated users
 * @returns {Object} Reel stats object
 */
async function loadReelStats() {
  try {
    // Load local stats first
    let localStats = DEFAULT_REEL_STATS;
    const stored = await storageService.get(REEL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      localStats = { ...DEFAULT_REEL_STATS, ...parsed };
    }

    // Try to fetch from database and merge
    const dbStats = await fetchReelStatsFromDatabase();
    if (dbStats) {
      const mergedStats = mergeReelStats(localStats, dbStats);
      // Save merged stats back to local storage
      await storageService.set(REEL_STORAGE_KEY, JSON.stringify(mergedStats));
      return mergedStats;
    }

    return localStats;
  } catch (error) {
    logger.error('[loadReelStats] Failed to load Reel stats:', error);
  }
  return DEFAULT_REEL_STATS;
}

/**
 * Load Element Soup stats from storage and database
 * Uses DATABASE-FIRST pattern for authenticated users
 * @returns {Object} Soup stats object
 */
async function loadSoupStats() {
  try {
    // Load local stats first
    let localStats = DEFAULT_SOUP_STATS;
    const stored = await storageService.get(SOUP_STORAGE_KEYS.STATS);
    if (stored) {
      const parsed = JSON.parse(stored);
      localStats = { ...DEFAULT_SOUP_STATS, ...parsed };
    }

    // Try to fetch from database and merge
    const dbStats = await fetchSoupStatsFromDatabase();
    if (dbStats) {
      const mergedStats = mergeSoupStats(localStats, dbStats);
      // Save merged stats back to local storage
      await storageService.set(SOUP_STORAGE_KEYS.STATS, JSON.stringify(mergedStats));
      return mergedStats;
    }

    return localStats;
  } catch (error) {
    logger.error('[loadSoupStats] Failed to load Soup stats:', error);
  }
  return DEFAULT_SOUP_STATS;
}

/**
 * useUnifiedStats - Load stats for all games
 * Handles async loading, error states, and CloudKit sync
 *
 * @param {boolean} isOpen - Whether the modal is open (triggers reload)
 * @returns {Object} Stats and loading states for all games
 */
export function useUnifiedStats(isOpen) {
  const [tandemStats, setTandemStats] = useState({
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
  });

  const [miniStats, setMiniStats] = useState({
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageTime: 0,
    bestTime: 0,
    perfectSolves: 0,
    totalChecks: 0,
    totalReveals: 0,
    completedPuzzles: {},
  });

  const [reelStats, setReelStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    totalTimeMs: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
    gameHistory: [],
  });

  const [soupStats, setSoupStats] = useState({
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageTime: 0,
    bestTime: 0,
    totalMoves: 0,
    totalDiscoveries: 0,
    firstDiscoveries: 0,
    underPar: 0,
    atPar: 0,
    overPar: 0,
    lastPlayedDate: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen !== false) {
      loadAllStats();
    }
  }, [isOpen]);

  const loadAllStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load stats in parallel for all games
      const [tandem, mini, reel, soup] = await Promise.all([
        loadStats(),
        loadMiniStats(),
        loadReelStats(),
        loadSoupStats(),
      ]);

      setTandemStats(tandem);
      setMiniStats(mini);
      setReelStats(reel);
      setSoupStats(soup);

      logger.info('[useUnifiedStats] Stats loaded successfully', {
        tandemPlayed: tandem.played,
        miniCompleted: mini.totalCompleted,
        reelPlayed: reel.gamesPlayed,
        soupCompleted: soup.totalCompleted,
      });
    } catch (err) {
      logger.error('[useUnifiedStats] Failed to load stats', { error: err.message });
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  return {
    tandemStats,
    miniStats,
    reelStats,
    soupStats,
    loading,
    error,
    reload: loadAllStats,
  };
}

export default useUnifiedStats;
