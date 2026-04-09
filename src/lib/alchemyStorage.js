/**
 * Daily Alchemy Storage
 *
 * Canonical loader for Daily Alchemy aggregate stats. Handles the
 * localStorage → IndexedDB → in-memory ladder via storageService and falls
 * back to fetching the authoritative aggregate stats from the API for
 * authenticated users (so a fresh device after sign-in shows the correct
 * counts immediately, instead of waiting for the user to play another game).
 *
 * Daily Alchemy currently uses a single global storage key (no per-user
 * namespacing) — this matches the existing pattern in `useDailyAlchemyGame`
 * which writes to `SOUP_STORAGE_KEYS.STATS` directly.
 */

import { SOUP_STORAGE_KEYS, SOUP_API } from '@/lib/daily-alchemy.constants';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

export const DEFAULT_ALCHEMY_STATS = {
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
 * Fetch alchemy stats from the database (authenticated only).
 * @private
 */
async function fetchAlchemyStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(SOUP_API.STATS), {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error(`Failed to fetch alchemy stats: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.stats) return null;

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
    logger.error('[alchemyStorage] Failed to fetch from database', error);
    return null;
  }
}

/**
 * Merge two alchemy stats objects. Cumulative counters take the maximum;
 * `currentStreak` follows the more recent `lastPlayedDate`; `bestTime` takes
 * the smaller of the two.
 *
 * @param {Object|null} localStats
 * @param {Object|null} dbStats
 * @returns {Object}
 */
export function mergeAlchemyStats(localStats, dbStats) {
  if (!dbStats) return localStats || { ...DEFAULT_ALCHEMY_STATS };
  if (!localStats) return dbStats;

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
 * Load Daily Alchemy stats. Reads from local storage and (if `skipDbFetch`
 * is not set) merges with the authoritative database stats.
 *
 * @param {Object} [options]
 * @param {boolean} [options.skipDbFetch=false] - Skip the database fetch and
 *     return only what is in local storage.
 * @returns {Promise<Object>}
 */
export async function loadAlchemyStats(options = {}) {
  const { skipDbFetch = false } = options;

  if (typeof window === 'undefined') {
    return { ...DEFAULT_ALCHEMY_STATS };
  }

  try {
    let localStats = { ...DEFAULT_ALCHEMY_STATS };
    const stored = await storageService.get(SOUP_STORAGE_KEYS.STATS);
    if (stored) {
      try {
        localStats = { ...DEFAULT_ALCHEMY_STATS, ...JSON.parse(stored) };
      } catch (parseError) {
        logger.warn('[alchemyStorage] Failed to parse stored stats', parseError);
      }
    }

    if (skipDbFetch) {
      return localStats;
    }

    const dbStats = await fetchAlchemyStatsFromDatabase();
    if (dbStats) {
      const mergedStats = mergeAlchemyStats(localStats, dbStats);
      try {
        await storageService.set(SOUP_STORAGE_KEYS.STATS, JSON.stringify(mergedStats));
      } catch (storageError) {
        logger.warn('[alchemyStorage] Failed to persist merged stats', storageError);
      }
      return mergedStats;
    }

    return localStats;
  } catch (error) {
    logger.error('[alchemyStorage] Failed to load stats', error);
    return { ...DEFAULT_ALCHEMY_STATS };
  }
}
