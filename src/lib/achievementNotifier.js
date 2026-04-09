/**
 * Achievement Notification System
 *
 * Triggers in-app toast notifications when new achievements are unlocked.
 * Works on both web and iOS platforms.
 *
 * Achievements are:
 *   1. Stored locally for offline access (works for guests too)
 *   2. Synced to the database for cross-device persistence (authenticated users)
 *
 * Toasts are queued by `AchievementToast`, so crossing multiple thresholds in
 * one action will display each newly unlocked achievement in sequence.
 */

import {
  getNewlyUnlockedAchievements,
  getNewlyUnlockedMiniAchievements,
  getNewlyUnlockedReelAchievements,
  getNewlyUnlockedAlchemyAchievements,
} from './achievementChecker';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

const UNLOCKED_ACHIEVEMENTS_KEY = 'tandem_unlocked_achievements';

/**
 * Check if user is authenticated (non-anonymous).
 * @private
 */
async function isAuthenticated() {
  try {
    if (typeof window === 'undefined') return false;
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
 * Fetch achievements from database for authenticated users.
 * @private
 */
async function fetchAchievementsFromDb() {
  try {
    const { capacitorFetch, getApiUrl } = await import('@/lib/api-config');
    const response = await capacitorFetch(getApiUrl('/api/user-achievements'), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) return null; // Not authenticated
      logger.warn('[AchievementNotifier] Failed to fetch from DB:', response.status);
      return null;
    }

    const data = await response.json();
    return data.achievements || [];
  } catch (error) {
    logger.warn('[AchievementNotifier] DB fetch error:', error);
    return null;
  }
}

/**
 * Sync achievements to database (fire-and-forget, non-blocking).
 * @private
 */
async function syncAchievementsToDb(achievementIds) {
  try {
    const { syncAchievementToDatabase } = await import('@/services/achievementSync.service');
    for (const id of achievementIds) {
      syncAchievementToDatabase(id).catch((err) => {
        logger.warn('[AchievementNotifier] DB sync failed for:', id, err);
      });
    }
  } catch (error) {
    logger.warn('[AchievementNotifier] Failed to sync to database:', error);
  }
}

/**
 * Wait for any in-flight `backfillAllAchievements` to complete.
 *
 * The achievement notifier calls this before reading the persisted unlocked
 * set so that a game completion which races with the post-sign-in backfill
 * doesn't toast a flood of "newly unlocked" achievements that backfill is
 * about to silently persist. No-op if no backfill is in flight.
 * @private
 */
async function waitForInFlightBackfill() {
  try {
    const { getInFlightBackfill } = await import('@/services/achievementSync.service');
    const inFlight = getInFlightBackfill();
    if (inFlight) {
      await inFlight;
    }
  } catch (err) {
    // Non-critical: we'll just read whatever's currently in the persisted set
    logger.warn('[AchievementNotifier] waitForInFlightBackfill failed', err);
  }
}

/**
 * Get the set of already-unlocked achievement IDs.
 * For authenticated users, merges local + database (DB is source of truth).
 * @private
 */
async function getUnlockedAchievements() {
  try {
    // Get local achievements
    const stored = await storageService.get(UNLOCKED_ACHIEVEMENTS_KEY);
    const localSet = stored ? new Set(JSON.parse(stored)) : new Set();

    // For authenticated users, also fetch from database and merge
    const authenticated = await isAuthenticated();
    if (authenticated) {
      const dbAchievements = await fetchAchievementsFromDb();
      if (dbAchievements && dbAchievements.length > 0) {
        const mergedSet = new Set([...localSet, ...dbAchievements]);
        if (mergedSet.size > localSet.size) {
          logger.info(
            '[AchievementNotifier] Syncing',
            mergedSet.size - localSet.size,
            'achievements from DB to local'
          );
          await saveUnlockedAchievements(mergedSet);
        }
        return mergedSet;
      }
    }

    return localSet;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to load unlocked achievements:', error);
  }
  return new Set();
}

/**
 * Build the `lastSubmitted` baseline used by `getNewlyUnlocked*` checkers.
 *
 * If `previousStats` is provided, the baseline reflects what the player's
 * stats looked like BEFORE the current update — so the checker returns
 * exactly the achievements crossed by THIS update. This is the precise path
 * and is robust to a stale persisted set.
 *
 * If no previousStats is provided, the baseline is `{0,0[,0]}` which means
 * "all currently qualifying achievements". The legacy path then filters by
 * the persisted unlocked set, awaiting any in-flight backfill first.
 *
 * @private
 */
function getReelBaseline(previousStats) {
  if (!previousStats) return { streak: 0, wins: 0 };
  return {
    streak: previousStats.bestStreak || 0,
    wins: previousStats.gamesWon || 0,
  };
}

function getMiniBaseline(previousStats) {
  if (!previousStats) return { streak: 0, wins: 0 };
  return {
    streak: previousStats.longestStreak || 0,
    wins: previousStats.totalCompleted || 0,
  };
}

function getTandemBaseline(previousStats) {
  if (!previousStats) return { streak: 0, wins: 0 };
  return {
    streak: previousStats.bestStreak || 0,
    wins: previousStats.wins || 0,
  };
}

function getAlchemyBaseline(previousStats) {
  if (!previousStats) return { streak: 0, wins: 0, firstDiscoveries: 0 };
  return {
    streak: previousStats.longestStreak || 0,
    wins: previousStats.totalCompleted || 0,
    firstDiscoveries: previousStats.firstDiscoveries || 0,
  };
}

/**
 * Save the set of unlocked achievement IDs to storage.
 * @private
 */
async function saveUnlockedAchievements(unlockedSet) {
  try {
    await storageService.set(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify([...unlockedSet]));
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to save unlocked achievements:', error);
  }
}

/**
 * Show an achievement toast notification by enqueueing it on the global
 * `__showAchievementToast` queue exposed by AchievementToast.
 * @private
 */
function showAchievementToast(achievement) {
  if (typeof window !== 'undefined' && window.__showAchievementToast) {
    window.__showAchievementToast({
      id: achievement.id,
      name: achievement.name,
      emoji: achievement.emoji,
      description: achievement.description,
    });
    return true;
  }
  return false;
}

/**
 * Internal: persist newly-unlocked achievements and enqueue toasts for them.
 *
 * Works for both guests (local-only) and authenticated users (local + DB).
 *
 * @param {Array} newAchievements - Already filtered to "not yet unlocked"
 * @param {Set<string>} unlockedSet - Current unlocked set (will be mutated)
 * @param {Object} [opts]
 * @param {boolean} [opts.silent=false] - If true, persist without showing toasts
 * @returns {Promise<Array>} The achievements that were newly persisted
 * @private
 */
async function persistAndAnnounce(newAchievements, unlockedSet, opts = {}) {
  if (newAchievements.length === 0) return [];

  const { silent = false } = opts;

  // Enqueue toasts for ALL new achievements (not just the first). The toast
  // component handles the display queue so they appear sequentially.
  if (!silent) {
    for (const ach of newAchievements) {
      showAchievementToast(ach);
    }
  }

  // Mark all as unlocked locally
  for (const ach of newAchievements) {
    unlockedSet.add(ach.id);
  }
  await saveUnlockedAchievements(unlockedSet);

  // Sync to database for cross-device persistence (fire-and-forget).
  // Only authenticated users have a database row.
  if (await isAuthenticated()) {
    const newIds = newAchievements.map((ach) => ach.id);
    syncAchievementsToDb(newIds);
  }

  return newAchievements;
}

/**
 * Check and notify for Tandem Daily achievements.
 *
 * Tracks achievements locally for ALL users (guests included). Authenticated
 * users additionally sync to the database for cross-device persistence.
 *
 * If `opts.previousStats` is provided, computes "newly crossed by THIS
 * update" mathematically (qualifying under newStats minus qualifying under
 * previousStats). This is the precise path and is robust to a stale
 * persisted set — the post-sign-in race that could otherwise cause popup
 * floods is impossible.
 *
 * Without `previousStats`, the function falls back to filtering "all
 * currently qualifying" by the persisted unlocked set, awaiting any in-flight
 * backfill first so it doesn't toast achievements backfill is about to add.
 *
 * @param {Object} stats - Current player stats { bestStreak, wins }
 * @param {Object} [opts]
 * @param {Object} [opts.previousStats] - Stats BEFORE this update (precise path)
 * @param {boolean} [opts.silent=false] - Persist without showing toasts
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyTandemAchievements(stats, opts = {}) {
  try {
    const baseline = getTandemBaseline(opts.previousStats);

    // If no previousStats was provided, await backfill so the persisted set
    // is current before we use it as the filter.
    if (!opts.previousStats) {
      await waitForInFlightBackfill();
    }

    const unlockedSet = await getUnlockedAchievements();

    // With previousStats: `getNewlyUnlocked*` returns exactly the
    //   achievements crossed by this update (precise).
    // Without previousStats: returns all currently qualifying — the
    //   `unlockedSet` filter then excludes historical ones.
    const newAchievements = getNewlyUnlockedAchievements(stats, baseline).filter(
      (ach) => !unlockedSet.has(ach.id)
    );

    const persisted = await persistAndAnnounce(newAchievements, unlockedSet, opts);

    if (persisted.length > 0 && !opts.silent) {
      logger.info('[AchievementNotifier] Tandem achievements unlocked:', persisted.length);
    }

    return persisted;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Tandem achievements:', error);
    return [];
  }
}

/**
 * Check and notify for Daily Mini achievements.
 *
 * @param {Object} stats - Mini stats { longestStreak, totalCompleted }
 * @param {Object} [opts]
 * @param {Object} [opts.previousStats] - Stats BEFORE this update (precise path)
 * @param {boolean} [opts.silent=false] - Persist without showing toasts
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyMiniAchievements(stats, opts = {}) {
  try {
    const baseline = getMiniBaseline(opts.previousStats);

    if (!opts.previousStats) {
      await waitForInFlightBackfill();
    }

    const unlockedSet = await getUnlockedAchievements();

    const newAchievements = getNewlyUnlockedMiniAchievements(stats, baseline).filter(
      (ach) => !unlockedSet.has(ach.id)
    );

    const persisted = await persistAndAnnounce(newAchievements, unlockedSet, opts);

    if (persisted.length > 0 && !opts.silent) {
      logger.info('[AchievementNotifier] Mini achievements unlocked:', persisted.length);
    }

    return persisted;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Mini achievements:', error);
    return [];
  }
}

/**
 * Check and notify for Reel Connections achievements.
 *
 * @param {Object} stats - Reel stats { bestStreak, gamesWon }
 * @param {Object} [opts]
 * @param {Object} [opts.previousStats] - Stats BEFORE this update (precise path)
 * @param {boolean} [opts.silent=false] - Persist without showing toasts
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyReelAchievements(stats, opts = {}) {
  try {
    const baseline = getReelBaseline(opts.previousStats);

    if (!opts.previousStats) {
      await waitForInFlightBackfill();
    }

    const unlockedSet = await getUnlockedAchievements();

    const newAchievements = getNewlyUnlockedReelAchievements(stats, baseline).filter(
      (ach) => !unlockedSet.has(ach.id)
    );

    const persisted = await persistAndAnnounce(newAchievements, unlockedSet, opts);

    if (persisted.length > 0 && !opts.silent) {
      logger.info('[AchievementNotifier] Reel achievements unlocked:', persisted.length);
    }

    return persisted;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Reel achievements:', error);
    return [];
  }
}

/**
 * Check and notify for Daily Alchemy achievements.
 *
 * @param {Object} stats - Alchemy stats { longestStreak, totalCompleted, firstDiscoveries }
 * @param {Object} [opts]
 * @param {Object} [opts.previousStats] - Stats BEFORE this update (precise path)
 * @param {boolean} [opts.silent=false] - Persist without showing toasts
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyAlchemyAchievements(stats, opts = {}) {
  try {
    const baseline = getAlchemyBaseline(opts.previousStats);

    if (!opts.previousStats) {
      await waitForInFlightBackfill();
    }

    const unlockedSet = await getUnlockedAchievements();

    const newAchievements = getNewlyUnlockedAlchemyAchievements(stats, baseline).filter(
      (ach) => !unlockedSet.has(ach.id)
    );

    const persisted = await persistAndAnnounce(newAchievements, unlockedSet, opts);

    if (persisted.length > 0 && !opts.silent) {
      logger.info('[AchievementNotifier] Alchemy achievements unlocked:', persisted.length);
    }

    return persisted;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Alchemy achievements:', error);
    return [];
  }
}

/**
 * Get count of unlocked achievements for each game type.
 * @returns {Promise<Object>} { tandem, mini, reel, alchemy, total }
 */
export async function getUnlockedAchievementCounts() {
  try {
    const unlockedSet = await getUnlockedAchievements();

    let tandem = 0;
    let mini = 0;
    let reel = 0;
    let alchemy = 0;

    for (const id of unlockedSet) {
      if (id.includes('.mini_')) {
        mini++;
      } else if (id.includes('.reel_')) {
        reel++;
      } else if (id.includes('.alchemy_')) {
        alchemy++;
      } else {
        tandem++;
      }
    }

    return { tandem, mini, reel, alchemy, total: tandem + mini + reel + alchemy };
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to get achievement counts:', error);
    return { tandem: 0, mini: 0, reel: 0, alchemy: 0, total: 0 };
  }
}

/**
 * Reset unlocked achievements (for testing).
 */
export async function resetUnlockedAchievements() {
  try {
    await storageService.remove(UNLOCKED_ACHIEVEMENTS_KEY);
    logger.info('[AchievementNotifier] Reset unlocked achievements');
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to reset:', error);
  }
}
