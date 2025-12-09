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

const UNLOCKED_ACHIEVEMENTS_KEY = 'tandem_unlocked_achievements';

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
        console.warn('[AchievementNotifier] DB sync failed for:', id, err);
      });
    }
  } catch (error) {
    // Non-critical - local storage already saved
    console.warn('[AchievementNotifier] Failed to sync to database:', error);
  }
}

/**
 * Get the set of already-unlocked achievement IDs from storage
 * @private
 */
async function getUnlockedAchievements() {
  try {
    const stored = await storageService.get(UNLOCKED_ACHIEVEMENTS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.error('[AchievementNotifier] Failed to load unlocked achievements:', error);
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
    console.error('[AchievementNotifier] Failed to save unlocked achievements:', error);
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
      console.log('[AchievementNotifier] Tandem achievement unlocked:', achievementToShow.name);
    }

    return newAchievements;
  } catch (error) {
    console.error('[AchievementNotifier] Failed to check Tandem achievements:', error);
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
      console.log('[AchievementNotifier] Mini achievement unlocked:', achievementToShow.name);
    }

    return newAchievements;
  } catch (error) {
    console.error('[AchievementNotifier] Failed to check Mini achievements:', error);
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
      console.log('[AchievementNotifier] Reel achievement unlocked:', achievementToShow.name);
    }

    return newAchievements;
  } catch (error) {
    console.error('[AchievementNotifier] Failed to check Reel achievements:', error);
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
    console.error('[AchievementNotifier] Failed to get achievement counts:', error);
    return { tandem: 0, mini: 0, reel: 0, total: 0 };
  }
}

/**
 * Reset unlocked achievements (for testing)
 */
export async function resetUnlockedAchievements() {
  try {
    await storageService.remove(UNLOCKED_ACHIEVEMENTS_KEY);
    console.log('[AchievementNotifier] Reset unlocked achievements');
  } catch (error) {
    console.error('[AchievementNotifier] Failed to reset:', error);
  }
}
