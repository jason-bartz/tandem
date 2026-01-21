/**
 * Achievement Notification System
 * Triggers in-app toast notifications when new achievements are unlocked
 * Works on both web and iOS platforms
 *
 * Achievements are:
 * 1. Stored locally for offline access
 * 2. Synced to database for cross-device persistence (authenticated users)
 */

import {
  getNewlyUnlockedAchievements,
  getNewlyUnlockedMiniAchievements,
  getNewlyUnlockedReelAchievements,
} from './achievementChecker';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

const UNLOCKED_ACHIEVEMENTS_KEY = 'tandem_unlocked_achievements';

/**
 * Check if user is authenticated
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
    return !!session?.user;
  } catch {
    return false;
  }
}

/**
 * Fetch achievements from database for authenticated users
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
 * Sync achievements to database (fire-and-forget)
 * Non-blocking - failures are logged but don't affect local storage
 * @private
 */
async function syncAchievementsToDb(achievementIds) {
  try {
    // Dynamic import to avoid circular dependencies and reduce initial bundle
    const { syncAchievementToDatabase } = await import('@/services/achievementSync.service');

    // Sync each achievement (fire-and-forget, non-blocking)
    for (const id of achievementIds) {
      syncAchievementToDatabase(id).catch((err) => {
        logger.warn('[AchievementNotifier] DB sync failed for:', id, err);
      });
    }
  } catch (error) {
    // Non-critical - local storage already saved
    logger.warn('[AchievementNotifier] Failed to sync to database:', error);
  }
}

/**
 * Get the set of already-unlocked achievement IDs
 * For authenticated users, merges local + database (DB is source of truth)
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
        // Merge DB achievements into local set
        const mergedSet = new Set([...localSet, ...dbAchievements]);

        // If DB had achievements not in local, update local storage
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
 * Save the set of unlocked achievement IDs to storage
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
 * Show achievement toast notification
 * Uses the global __showAchievementToast function exposed by AchievementToast component
 * @private
 */
function showAchievementToast(achievement) {
  if (typeof window !== 'undefined' && window.__showAchievementToast) {
    window.__showAchievementToast({
      name: achievement.name,
      emoji: achievement.emoji,
      description: achievement.description,
    });
    return true;
  }
  return false;
}

/**
 * Check and notify for Tandem Daily achievements
 * @param {Object} stats - Player stats { bestStreak, wins }
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyTandemAchievements(stats) {
  try {
    // Only track achievements for authenticated users
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      logger.debug('[AchievementNotifier] Skipping Tandem achievements - user not authenticated');
      return [];
    }

    const unlockedSet = await getUnlockedAchievements();

    // Get all qualifying achievements
    const newAchievements = getNewlyUnlockedAchievements(
      stats,
      { streak: 0, wins: 0 } // Compare against 0 to get all qualifying
    ).filter((ach) => !unlockedSet.has(ach.id));

    if (newAchievements.length === 0) {
      return [];
    }

    // Show toast for the first new achievement (one at a time to avoid spam)
    const achievementToShow = newAchievements[0];
    const shown = showAchievementToast(achievementToShow);

    // Mark all as unlocked even if toast didn't show (to prevent re-checking)
    for (const ach of newAchievements) {
      unlockedSet.add(ach.id);
    }
    await saveUnlockedAchievements(unlockedSet);

    // Sync to database for cross-device persistence (fire-and-forget)
    const newIds = newAchievements.map((ach) => ach.id);
    syncAchievementsToDb(newIds);

    if (shown) {
      logger.info('[AchievementNotifier] Tandem achievement unlocked:', achievementToShow.name);
    }

    return newAchievements;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Tandem achievements:', error);
    return [];
  }
}

/**
 * Check and notify for Daily Mini achievements
 * @param {Object} stats - Mini stats { longestStreak, totalCompleted }
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyMiniAchievements(stats) {
  try {
    // Only track achievements for authenticated users
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      logger.debug('[AchievementNotifier] Skipping Mini achievements - user not authenticated');
      return [];
    }

    const unlockedSet = await getUnlockedAchievements();

    // Get all qualifying achievements
    const newAchievements = getNewlyUnlockedMiniAchievements(
      stats,
      { streak: 0, wins: 0 } // Compare against 0 to get all qualifying
    ).filter((ach) => !unlockedSet.has(ach.id));

    if (newAchievements.length === 0) {
      return [];
    }

    // Show toast for the first new achievement
    const achievementToShow = newAchievements[0];
    const shown = showAchievementToast(achievementToShow);

    // Mark all as unlocked
    for (const ach of newAchievements) {
      unlockedSet.add(ach.id);
    }
    await saveUnlockedAchievements(unlockedSet);

    // Sync to database for cross-device persistence (fire-and-forget)
    const newIds = newAchievements.map((ach) => ach.id);
    syncAchievementsToDb(newIds);

    if (shown) {
      logger.info('[AchievementNotifier] Mini achievement unlocked:', achievementToShow.name);
    }

    return newAchievements;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Mini achievements:', error);
    return [];
  }
}

/**
 * Check and notify for Reel Connections achievements
 * @param {Object} stats - Reel stats { bestStreak, gamesWon }
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAndNotifyReelAchievements(stats) {
  try {
    // Only track achievements for authenticated users
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      logger.debug('[AchievementNotifier] Skipping Reel achievements - user not authenticated');
      return [];
    }

    const unlockedSet = await getUnlockedAchievements();

    // Get all qualifying achievements
    const newAchievements = getNewlyUnlockedReelAchievements(
      stats,
      { streak: 0, wins: 0 } // Compare against 0 to get all qualifying
    ).filter((ach) => !unlockedSet.has(ach.id));

    if (newAchievements.length === 0) {
      return [];
    }

    // Show toast for the first new achievement
    const achievementToShow = newAchievements[0];
    const shown = showAchievementToast(achievementToShow);

    // Mark all as unlocked
    for (const ach of newAchievements) {
      unlockedSet.add(ach.id);
    }
    await saveUnlockedAchievements(unlockedSet);

    // Sync to database for cross-device persistence (fire-and-forget)
    const newIds = newAchievements.map((ach) => ach.id);
    syncAchievementsToDb(newIds);

    if (shown) {
      logger.info('[AchievementNotifier] Reel achievement unlocked:', achievementToShow.name);
    }

    return newAchievements;
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to check Reel achievements:', error);
    return [];
  }
}

/**
 * Get count of unlocked achievements for each game type
 * @returns {Promise<Object>} { tandem: number, mini: number, reel: number }
 */
export async function getUnlockedAchievementCounts() {
  try {
    const unlockedSet = await getUnlockedAchievements();

    let tandem = 0;
    let mini = 0;
    let reel = 0;

    for (const id of unlockedSet) {
      if (id.includes('.mini_')) {
        mini++;
      } else if (id.includes('.reel_')) {
        reel++;
      } else {
        tandem++;
      }
    }

    return { tandem, mini, reel, total: tandem + mini + reel };
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to get achievement counts:', error);
    return { tandem: 0, mini: 0, reel: 0, total: 0 };
  }
}

/**
 * Reset unlocked achievements (for testing)
 */
export async function resetUnlockedAchievements() {
  try {
    await storageService.remove(UNLOCKED_ACHIEVEMENTS_KEY);
    logger.info('[AchievementNotifier] Reset unlocked achievements');
  } catch (error) {
    logger.error('[AchievementNotifier] Failed to reset:', error);
  }
}
