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

const UNLOCKED_ACHIEVEMENTS_KEY = 'tandem_unlocked_achievements';
const SYNC_IN_PROGRESS_KEY = 'achievement_sync_in_progress';

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
  try {
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
 * Get locally stored achievements
 * @returns {Promise<Set<string>>} Set of achievement IDs
 */
async function getLocalAchievements() {
  try {
    const stored = await storageService.get(UNLOCKED_ACHIEVEMENTS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.error('[AchievementSync] Failed to load local achievements:', error);
  }
  return new Set();
}

/**
 * Save achievements to local storage
 * @param {Set<string>} achievementSet - Set of achievement IDs
 */
async function saveLocalAchievements(achievementSet) {
  try {
    await storageService.set(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify([...achievementSet]));
  } catch (error) {
    console.error('[AchievementSync] Failed to save local achievements:', error);
  }
}

/**
 * Fetch achievements from database
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
      console.error('[AchievementSync] Failed to fetch from database:', response.status);
      return null;
    }

    const data = await response.json();
    return data.achievements || [];
  } catch (error) {
    console.error('[AchievementSync] Database fetch error:', error);
    return null;
  }
}

/**
 * Save achievements to database
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
      console.error('[AchievementSync] Failed to save to database:', response.status);
      return null;
    }

    const data = await response.json();
    return data.achievements || null;
  } catch (error) {
    console.error('[AchievementSync] Database save error:', error);
    return null;
  }
}

/**
 * Sync a single achievement to the database
 * Called immediately after unlocking a new achievement
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
      console.log('[AchievementSync] Achievement synced to database:', achievementId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[AchievementSync] Failed to sync achievement:', error);
    return false;
  }
}

/**
 * Sync all achievements between local storage and database
 * Uses merge strategy: combines both sources, keeps all achievements
 *
 * Called on:
 * - User sign-in
 * - App initialization (if authenticated)
 *
 * @returns {Promise<Set<string>>} Merged set of all achievements
 */
export async function syncAllAchievements() {
  try {
    // Prevent concurrent syncs
    const syncInProgress = await storageService.get(SYNC_IN_PROGRESS_KEY);
    if (syncInProgress === 'true') {
      console.log('[AchievementSync] Sync already in progress, skipping');
      const local = await getLocalAchievements();
      return local;
    }

    await storageService.set(SYNC_IN_PROGRESS_KEY, 'true');

    try {
      // Check if authenticated
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.log('[AchievementSync] Not authenticated, using local only');
        return await getLocalAchievements();
      }

      // Get achievements from both sources
      const [localAchievements, dbAchievements] = await Promise.all([
        getLocalAchievements(),
        fetchAchievementsFromDatabase(),
      ]);

      // If database fetch failed, just use local
      if (dbAchievements === null) {
        console.log('[AchievementSync] Database unavailable, using local only');
        return localAchievements;
      }

      // Merge: union of both sets (achievements are additive, never removed)
      const mergedSet = new Set([...localAchievements, ...dbAchievements]);

      // Determine what's new on each side
      const newForLocal = dbAchievements.filter((id) => !localAchievements.has(id));
      const newForDatabase = [...localAchievements].filter((id) => !dbAchievements.includes(id));

      // Update local storage with merged achievements
      if (newForLocal.length > 0) {
        console.log('[AchievementSync] Adding from database to local:', newForLocal.length);
        await saveLocalAchievements(mergedSet);
      }

      // Update database with any achievements only in local
      if (newForDatabase.length > 0) {
        console.log('[AchievementSync] Syncing local to database:', newForDatabase.length);
        await saveAchievementsToDatabase(newForDatabase);
      }

      console.log('[AchievementSync] Sync complete. Total achievements:', mergedSet.size);
      return mergedSet;
    } finally {
      await storageService.remove(SYNC_IN_PROGRESS_KEY);
    }
  } catch (error) {
    console.error('[AchievementSync] Full sync failed:', error);
    await storageService.remove(SYNC_IN_PROGRESS_KEY);
    return await getLocalAchievements();
  }
}

/**
 * Load achievements on app startup
 * If authenticated, syncs with database
 * If not, returns local achievements
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
    console.error('[AchievementSync] Startup load failed:', error);
    return await getLocalAchievements();
  }
}

export default {
  syncAchievementToDatabase,
  syncAllAchievements,
  loadAchievementsOnStartup,
};
