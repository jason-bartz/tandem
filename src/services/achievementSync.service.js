/**
 * Achievement Sync Service
 *
 * Handles syncing achievements between local storage and the database.
 * Follows the same patterns as stats syncing for cross-device persistence.
 *
 * Works seamlessly on both web and iOS platforms using capacitorFetch.
 */

import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

const UNLOCKED_ACHIEVEMENTS_KEY = 'tandem_unlocked_achievements';

/**
 * Module-level promise that dedupes concurrent full sync calls.
 * Replaces the prior timestamp-based lock which could swallow updates by
 * silently returning the local set if a sync was in flight.
 *
 * @type {Promise<Set<string>>|null}
 * @private
 */
let inFlightSyncPromise = null;

/**
 * Module-level promise tracking an in-flight `backfillAllAchievements` call.
 * The achievement notifier awaits this before reading the persisted set so a
 * game completion that races with post-sign-in backfill doesn't toast a
 * flood of "newly unlocked" achievements that backfill is about to silently
 * persist.
 *
 * @type {Promise<Set<string>>|null}
 * @private
 */
let inFlightBackfillPromise = null;

/**
 * Check if user is authenticated (non-anonymous).
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
  try {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session?.user && !session.user.is_anonymous;
  } catch {
    return false;
  }
}

/**
 * Get locally stored achievements.
 * @returns {Promise<Set<string>>} Set of achievement IDs
 */
async function getLocalAchievements() {
  try {
    const stored = await storageService.get(UNLOCKED_ACHIEVEMENTS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    logger.error('[AchievementSync] Failed to load local achievements', error);
  }
  return new Set();
}

/**
 * Save achievements to local storage.
 * @param {Set<string>} achievementSet - Set of achievement IDs
 */
async function saveLocalAchievements(achievementSet) {
  try {
    await storageService.set(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify([...achievementSet]));
  } catch (error) {
    logger.error('[AchievementSync] Failed to save local achievements', error);
  }
}

/**
 * Fetch achievements from database.
 * @returns {Promise<string[]|null>} Array of achievement IDs or null on error
 */
async function fetchAchievementsFromDatabase() {
  try {
    const apiUrl = getApiUrl('/api/user-achievements');
    const response = await capacitorFetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated - this is expected for guest users
        return null;
      }
      logger.error('[AchievementSync] Failed to fetch from database', null, {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    return data.achievements || [];
  } catch (error) {
    logger.error('[AchievementSync] Database fetch error', error);
    return null;
  }
}

/**
 * Save achievements to database.
 * @param {string[]} achievements - Array of achievement IDs to save
 * @returns {Promise<string[]|null>} Merged achievements or null on error
 */
async function saveAchievementsToDatabase(achievements) {
  try {
    const apiUrl = getApiUrl('/api/user-achievements');
    const response = await capacitorFetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievements }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated - this is expected for guest users
        return null;
      }
      logger.error('[AchievementSync] Failed to save to database', null, {
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    return data.achievements || null;
  } catch (error) {
    logger.error('[AchievementSync] Database save error', error);
    return null;
  }
}

/**
 * Sync a single achievement to the database.
 * Called immediately after unlocking a new achievement.
 *
 * @param {string} achievementId - Achievement ID to sync
 * @returns {Promise<boolean>} True if sync succeeded
 */
export async function syncAchievementToDatabase(achievementId) {
  try {
    // Only sync if authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return false;
    }

    // Save single achievement to database (will merge with existing)
    const result = await saveAchievementsToDatabase([achievementId]);
    if (result) {
      logger.debug('[AchievementSync] Achievement synced to database', achievementId);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('[AchievementSync] Failed to sync achievement', error);
    return false;
  }
}

/**
 * Internal: do the actual sync work. Called via a shared inFlightSyncPromise
 * to dedupe concurrent callers.
 * @private
 */
async function performFullSync() {
  // Check if authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    logger.debug('[AchievementSync] Not authenticated, using local only');
    return await getLocalAchievements();
  }

  // Get achievements from both sources
  const [localAchievements, dbAchievements] = await Promise.all([
    getLocalAchievements(),
    fetchAchievementsFromDatabase(),
  ]);

  // If database fetch failed, just use local
  if (dbAchievements === null) {
    logger.debug('[AchievementSync] Database unavailable, using local only');
    return localAchievements;
  }

  // Merge: union of both sets (achievements are additive, never removed)
  const mergedSet = new Set([...localAchievements, ...dbAchievements]);

  // Determine what's new on each side
  const newForLocal = dbAchievements.filter((id) => !localAchievements.has(id));
  const newForDatabase = [...localAchievements].filter((id) => !dbAchievements.includes(id));

  // Always save merged achievements to local storage to ensure consistency
  if (mergedSet.size > 0) {
    if (newForLocal.length > 0) {
      logger.info(
        '[AchievementSync] Adding',
        newForLocal.length,
        'achievements from database to local'
      );
    }
    await saveLocalAchievements(mergedSet);
  }

  // Update database with any achievements only in local
  if (newForDatabase.length > 0) {
    logger.debug('[AchievementSync] Syncing local to database', {
      count: newForDatabase.length,
    });
    await saveAchievementsToDatabase(newForDatabase);
  }

  logger.debug('[AchievementSync] Sync complete', { totalAchievements: mergedSet.size });
  return mergedSet;
}

/**
 * Sync all achievements between local storage and database.
 * Uses merge strategy: combines both sources, keeps all achievements.
 *
 * Called on:
 * - User sign-in
 * - App initialization (if authenticated)
 *
 * Concurrent callers share the same in-flight promise (no skipping).
 *
 * @returns {Promise<Set<string>>} Merged set of all achievements
 */
export async function syncAllAchievements() {
  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  inFlightSyncPromise = (async () => {
    try {
      return await performFullSync();
    } catch (error) {
      logger.error('[AchievementSync] Full sync failed', error);
      return await getLocalAchievements();
    } finally {
      inFlightSyncPromise = null;
    }
  })();

  return inFlightSyncPromise;
}

/**
 * Load achievements on app startup.
 * If authenticated, syncs with database. If not, returns local achievements.
 *
 * @returns {Promise<Set<string>>} Set of unlocked achievement IDs
 */
export async function loadAchievementsOnStartup() {
  try {
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // Sync with database for authenticated users
      return await syncAllAchievements();
    }

    // Return local achievements for guests
    return await getLocalAchievements();
  } catch (error) {
    logger.error('[AchievementSync] Startup load failed', error);
    return await getLocalAchievements();
  }
}

/**
 * Backfill any newly-qualifying achievements for a given game mode + stats.
 *
 * Recomputes the full set of achievements that *should* be unlocked from the
 * supplied stats (using `getAllQualifying*Achievements`), unions them with
 * any locally-persisted IDs, and writes the merged set back to local storage.
 * For authenticated users, the new IDs are also synced to the database in a
 * fire-and-forget manner.
 *
 * Unlike `checkAndNotify*Achievements`, this is **silent** — it never shows
 * toasts. It is intended for retroactive backfill on modal open, sign-in,
 * etc.
 *
 * @param {'tandem'|'mini'|'reel'|'alchemy'} gameMode
 * @param {Object} stats - Stats object in the canonical shape for that game
 * @returns {Promise<Set<string>>} The merged set of unlocked achievement IDs
 *     (across all game modes — caller can scope as needed).
 */
export async function backfillAchievementsFromStats(gameMode, stats) {
  try {
    if (!stats) return await getLocalAchievements();

    const checker = await import('@/lib/achievementChecker');

    let qualifying = [];
    if (gameMode === 'tandem') {
      qualifying = checker.getAllQualifyingAchievements(stats);
    } else if (gameMode === 'mini') {
      qualifying = checker.getAllQualifyingMiniAchievements(stats);
    } else if (gameMode === 'reel') {
      qualifying = checker.getAllQualifyingReelAchievements(stats);
    } else if (gameMode === 'alchemy') {
      qualifying = checker.getAllQualifyingAlchemyAchievements(stats);
    } else {
      logger.warn('[AchievementSync] Unknown game mode for backfill', { gameMode });
      return await getLocalAchievements();
    }

    // Start from the merged local + DB set so we know what's truly missing.
    // For authenticated users, this also pulls down anything earned on
    // another device.
    const authenticated = await isAuthenticated();
    let baseSet;
    if (authenticated) {
      baseSet = await syncAllAchievements();
    } else {
      baseSet = await getLocalAchievements();
    }

    const newOnes = qualifying.filter((a) => !baseSet.has(a.id));
    if (newOnes.length === 0) {
      return baseSet;
    }

    const newIds = newOnes.map((a) => a.id);
    const mergedSet = new Set([...baseSet, ...newIds]);
    await saveLocalAchievements(mergedSet);

    if (authenticated) {
      // Fire-and-forget DB sync
      saveAchievementsToDatabase(newIds).catch((err) => {
        logger.error('[AchievementSync] Backfill DB sync failed', err);
      });
    }

    logger.info('[AchievementSync] Backfilled achievements', {
      gameMode,
      added: newOnes.length,
    });

    return mergedSet;
  } catch (error) {
    logger.error('[AchievementSync] Backfill failed', error);
    return await getLocalAchievements();
  }
}

/**
 * Internal: actually perform the all-games backfill. Wrapped by
 * `backfillAllAchievements` so concurrent callers share the same in-flight
 * promise via `inFlightBackfillPromise`.
 * @private
 */
async function performBackfillAll() {
  const [{ loadStats }, { loadMiniStats }, { loadReelStats }, { loadAlchemyStats }] =
    await Promise.all([
      import('@/lib/storage'),
      import('@/lib/miniStorage'),
      import('@/lib/reelStorage'),
      import('@/lib/alchemyStorage'),
    ]);

  const [tandemStats, miniStats, reelStats, alchemyStats] = await Promise.all([
    loadStats(),
    loadMiniStats(),
    loadReelStats(),
    loadAlchemyStats(),
  ]);

  // Run sequentially so each call sees the freshest local state.
  await backfillAchievementsFromStats('tandem', {
    bestStreak: tandemStats.bestStreak || 0,
    wins: tandemStats.wins || 0,
  });
  await backfillAchievementsFromStats('mini', {
    longestStreak: miniStats.longestStreak || 0,
    totalCompleted: miniStats.totalCompleted || 0,
  });
  await backfillAchievementsFromStats('reel', {
    bestStreak: reelStats.bestStreak || 0,
    gamesWon: reelStats.gamesWon || 0,
  });
  return await backfillAchievementsFromStats('alchemy', {
    longestStreak: alchemyStats.longestStreak || 0,
    totalCompleted: alchemyStats.totalCompleted || 0,
    firstDiscoveries: alchemyStats.firstDiscoveries || 0,
  });
}

/**
 * Backfill achievements for ALL game modes.
 *
 * Loads stats for each game from the canonical loaders, then runs the silent
 * backfill against each. Used after sign-in to ensure that achievements
 * earned offline (or before the sync system was wired up) are reflected in
 * the persisted set.
 *
 * Concurrent callers share the same in-flight promise. The achievement
 * notifier reads `getInFlightBackfill()` to await this before toasting, so
 * post-sign-in races don't produce popup floods.
 *
 * @returns {Promise<Set<string>>} The final merged set of unlocked IDs
 */
export async function backfillAllAchievements() {
  if (inFlightBackfillPromise) {
    return inFlightBackfillPromise;
  }

  inFlightBackfillPromise = (async () => {
    try {
      return await performBackfillAll();
    } catch (error) {
      logger.error('[AchievementSync] backfillAllAchievements failed', error);
      return await getLocalAchievements();
    } finally {
      inFlightBackfillPromise = null;
    }
  })();

  return inFlightBackfillPromise;
}

/**
 * Get the currently in-flight backfill promise, if any.
 *
 * Used by the achievement notifier to defensively wait for backfill to
 * complete before reading the persisted unlocked set, eliminating the race
 * where a game finishes during the post-sign-in backfill window and the
 * notifier toasts a flood of historical achievements.
 *
 * @returns {Promise<Set<string>>|null}
 */
export function getInFlightBackfill() {
  return inFlightBackfillPromise;
}

/**
 * Clear the persisted set of unlocked achievement IDs from local storage.
 *
 * Used by sign-out flows to prevent cross-account achievement leakage on
 * shared devices. The next sign-in will repopulate the set from the
 * authenticated user's database row + a fresh backfill against their stats.
 */
export async function clearUnlockedAchievements() {
  try {
    await storageService.remove(UNLOCKED_ACHIEVEMENTS_KEY);
    logger.debug('[AchievementSync] Cleared local unlocked achievements set');
  } catch (error) {
    logger.error('[AchievementSync] Failed to clear unlocked achievements', error);
  }
}

export default {
  syncAchievementToDatabase,
  syncAllAchievements,
  loadAchievementsOnStartup,
  backfillAchievementsFromStats,
  backfillAllAchievements,
  getInFlightBackfill,
  clearUnlockedAchievements,
};
