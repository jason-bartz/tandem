/**
 * Reel Connections Storage
 *
 * Canonical, single-source-of-truth module for loading and saving Reel
 * Connections statistics. Handles per-user storage key namespacing, the
 * localStorage → IndexedDB → in-memory fallback ladder via storageService,
 * and database-first sync for authenticated users.
 *
 * All consumers of Reel stats (game hook, achievements modal, unified stats,
 * archive calendar, welcome screen, etc.) should go through this module so
 * that reads and writes always agree on the same key.
 *
 * Storage key shape:
 *   - Anonymous user:        `reel-connections-stats`
 *   - Authenticated user:    `reel-connections-stats-user-{userId}`
 */

import { API_ENDPOINTS } from '@/lib/constants';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

// Storage keys (exported for the rare consumer that needs the raw key,
// e.g. namespaced cleanup helpers in AuthContext).
export const REEL_ANON_STORAGE_KEY = 'reel-connections-stats';
export const REEL_USER_STORAGE_KEY_PREFIX = 'reel-connections-stats-user-';

export const DEFAULT_REEL_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalTimeMs: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  gameHistory: [],
};

/**
 * Resolve the storage key for a given user id.
 *
 * Anonymous and "is_anonymous" Supabase users share the anon key — only
 * permanent (non-anonymous) accounts get a per-user namespaced key.
 *
 * @param {string|null|undefined} userId
 * @returns {string}
 */
export function getReelStorageKey(userId) {
  if (userId) {
    return `${REEL_USER_STORAGE_KEY_PREFIX}${userId}`;
  }
  return REEL_ANON_STORAGE_KEY;
}

/**
 * Get the current authenticated (non-anonymous) Supabase user id.
 * @private
 * @returns {Promise<string|null>}
 */
async function getCurrentUserId() {
  try {
    if (typeof window === 'undefined') return null;
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user && !session.user.is_anonymous) {
      return session.user.id;
    }
    return null;
  } catch (error) {
    logger.warn('[reelStorage] Failed to resolve current user', error);
    return null;
  }
}

/**
 * Resolve the storage key currently in effect for this device's session.
 * @returns {Promise<string>}
 */
export async function getCurrentReelStorageKey() {
  const userId = await getCurrentUserId();
  return getReelStorageKey(userId);
}

/**
 * Fetch reel stats from the database (authenticated only).
 * Returns null if unauthenticated, on error, or if no row exists.
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
    logger.error('[reelStorage] Failed to fetch from database', error);
    return null;
  }
}

/**
 * Save reel stats to the database (authenticated only).
 * @private
 */
async function saveReelStatsToDatabase(stats) {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_REEL_STATS), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      if (response.status === 401) return null;
      throw new Error(`Failed to save reel stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[reelStorage] Failed to save to database', error);
    return null;
  }
}

/**
 * Merge two reel stats objects. Cumulative counters take the maximum value;
 * `gameHistory` entries are unioned by date with the latest copy winning,
 * sorted descending by date and capped to the most recent 30 entries.
 *
 * @param {Object|null} localStats
 * @param {Object|null} dbStats
 * @returns {Object}
 */
export function mergeReelStats(localStats, dbStats) {
  if (!dbStats) return localStats || { ...DEFAULT_REEL_STATS };
  if (!localStats) return dbStats;

  const historyMap = new Map();
  (localStats.gameHistory || []).forEach((g) => historyMap.set(g.date, g));
  (dbStats.gameHistory || []).forEach((g) => historyMap.set(g.date, g));
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
 * Read raw stats from a specific storage key with safe defaults.
 * @private
 */
async function readStatsFromKey(storageKey) {
  const stored = await storageService.get(storageKey);
  if (!stored) return null;
  try {
    return { ...DEFAULT_REEL_STATS, ...JSON.parse(stored) };
  } catch (parseError) {
    logger.warn('[reelStorage] Failed to parse stored stats', parseError);
    return null;
  }
}

/**
 * Load reel stats for the current user.
 *
 * Resolves the per-user namespaced storage key automatically. For first-time
 * authenticated loads with no user-specific stats yet, falls back to migrating
 * the anonymous key into the user namespace. For authenticated users, also
 * fetches from the database and merges the result back into local storage.
 *
 * Always returns a non-null stats object (defaults if everything is empty).
 *
 * @param {Object} [options]
 * @param {boolean} [options.skipDbFetch=false] - Skip the database fetch and
 *     return only what is in local storage. Useful for synchronous-feeling
 *     consumers (e.g. archive calendars) that want to avoid network latency.
 * @returns {Promise<Object>}
 */
export async function loadReelStats(options = {}) {
  const { skipDbFetch = false } = options;

  if (typeof window === 'undefined') {
    return { ...DEFAULT_REEL_STATS };
  }

  try {
    const userId = await getCurrentUserId();
    const storageKey = getReelStorageKey(userId);

    // Read from the current user's primary key
    let localStats = (await readStatsFromKey(storageKey)) || { ...DEFAULT_REEL_STATS };

    // First-time authenticated load: migrate anon stats into the user namespace
    if (userId && !(localStats.gamesPlayed > 0)) {
      const anonStats = await readStatsFromKey(REEL_ANON_STORAGE_KEY);
      if (anonStats && anonStats.gamesPlayed > 0) {
        localStats = anonStats;
        try {
          await storageService.set(storageKey, JSON.stringify(localStats));
        } catch (storageError) {
          logger.warn('[reelStorage] Failed to migrate anon stats', storageError);
        }
      }
    }

    if (skipDbFetch || !userId) {
      return localStats;
    }

    // Database-first merge for authenticated users
    const dbStats = await fetchReelStatsFromDatabase();
    if (dbStats) {
      const mergedStats = mergeReelStats(localStats, dbStats);
      try {
        await storageService.set(storageKey, JSON.stringify(mergedStats));
      } catch (storageError) {
        logger.warn('[reelStorage] Failed to persist merged stats', storageError);
      }
      return mergedStats;
    }

    return localStats;
  } catch (error) {
    logger.error('[reelStorage] Failed to load reel stats', error);
    return { ...DEFAULT_REEL_STATS };
  }
}

/**
 * Save reel stats for the current user.
 *
 * Writes to the resolved per-user storage key and (if authenticated) syncs to
 * the database in a fire-and-forget manner. The database sync is suppressed
 * for empty stats objects to avoid creating empty rows.
 *
 * @param {Object} stats
 * @param {Object} [options]
 * @param {boolean} [options.skipDbSync=false] - Skip the database sync.
 * @returns {Promise<void>}
 */
export async function saveReelStats(stats, options = {}) {
  const { skipDbSync = false } = options;
  if (typeof window === 'undefined') return;

  try {
    const userId = await getCurrentUserId();
    const storageKey = getReelStorageKey(userId);

    await storageService.set(storageKey, JSON.stringify(stats));

    if (!skipDbSync && userId && (stats.gamesPlayed || 0) > 0) {
      saveReelStatsToDatabase(stats).catch((err) => {
        logger.error('[reelStorage] Failed to sync to database', err);
      });
    }
  } catch (error) {
    logger.error('[reelStorage] Failed to save reel stats', error);
  }
}

/**
 * Remove reel stats from local storage.
 *
 * Always clears the anonymous key. If a userId is provided, also clears the
 * matching user-namespaced key. Used by sign-out flows to prevent leaving
 * stale data on shared devices.
 *
 * @param {string} [userId]
 */
export async function clearReelStats(userId = null) {
  try {
    await storageService.remove(REEL_ANON_STORAGE_KEY);
    if (userId) {
      await storageService.remove(getReelStorageKey(userId));
    }
  } catch (error) {
    logger.error('[reelStorage] Failed to clear stats', error);
  }
}
