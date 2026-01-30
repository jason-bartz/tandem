import { STORAGE_KEYS, API_ENDPOINTS } from './constants';
import cloudKitService from '@/services/cloudkit.service';
import localDateService from '@/services/localDateService';
import logger from '@/lib/logger';
import storageService from '@/core/storage/storageService';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';

// Platform-agnostic storage helpers
// Delegates to storageService which provides: localStorage → IndexedDB → in-memory fallback
async function getStorageItem(key) {
  return storageService.get(key);
}

async function setStorageItem(key, value) {
  return storageService.set(key, value);
}

/**
 * Get user ID from current session
 * @private
 * @returns {Promise<string|null>} User ID or null if not authenticated
 */
async function getCurrentUserId() {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id || null;
  } catch (error) {
    logger.error('[storage] Failed to get current user ID', error);
    return null;
  }
}

/**
 * Get user-specific storage key for stats
 * This prevents stats collision when multiple users share the same browser/device
 *
 * @private
 * @param {string|null} userId - User ID (null for anonymous users)
 * @returns {string} Storage key namespaced by user
 */
function getUserStatsKey(userId) {
  if (!userId) {
    return STORAGE_KEYS.STATS; // Anonymous user: tandem_stats
  }
  return `${STORAGE_KEYS.STATS}_user_${userId}`; // Authenticated user: tandem_stats_user_{userId}
}

/**
 * Get user-specific storage key for puzzle results
 * This prevents puzzle result collision when multiple users share the same browser/device
 *
 * @private
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|null} userId - User ID (null for anonymous users)
 * @returns {string} Storage key namespaced by user
 */
function getUserPuzzleKey(date, userId) {
  const dateObj = new Date(date + 'T00:00:00');
  const baseKey = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;

  if (!userId) {
    return baseKey; // Anonymous user
  }
  return `${baseKey}_user_${userId}`; // Authenticated user
}

/**
 * Get user-specific storage key for puzzle progress
 * This prevents progress collision when multiple users share the same browser/device
 *
 * @private
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|null} userId - User ID (null for anonymous users)
 * @returns {string} Storage key namespaced by user
 */
function getUserProgressKey(date, userId) {
  const dateObj = new Date(date + 'T00:00:00');
  const baseKey = `tandem_progress_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;

  if (!userId) {
    return baseKey; // Anonymous user
  }
  return `${baseKey}_user_${userId}`; // Authenticated user
}

/**
 * Migrate anonymous stats to user-specific storage on first sign-in
 * This ensures existing stats are preserved when user creates an account
 *
 * @private
 * @param {string} userId - User ID
 */
async function migrateAnonymousStatsToUser(userId) {
  try {
    const userStatsKey = getUserStatsKey(userId);
    const anonymousStatsKey = STORAGE_KEYS.STATS;

    const existingUserStats = await getStorageItem(userStatsKey);
    if (existingUserStats) {
      logger.info('[storage.migrate] User already has stats, skipping migration');
      return;
    }

    const anonymousStats = await getStorageItem(anonymousStatsKey);
    if (!anonymousStats) {
      logger.info('[storage.migrate] No anonymous stats to migrate');
      return;
    }

    logger.info('[storage.migrate] Migrating anonymous stats to user-specific storage', {
      userId,
      from: anonymousStatsKey,
      to: userStatsKey,
    });

    // Copy anonymous stats to user-specific key
    await setStorageItem(userStatsKey, anonymousStats);

    // Note: We don't delete the key entirely in case user signs out
    // Instead, we reset it to default values
    const defaultStats = {
      played: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
    await setStorageItem(anonymousStatsKey, JSON.stringify(defaultStats));

    logger.info('[storage.migrate] Migration complete');
  } catch (error) {
    logger.error('[storage.migrate] Failed to migrate anonymous stats', error);
    // Non-critical error - don't throw
  }
}

function getTodayDateString() {
  return localDateService.getCurrentDateString();
}

function getYesterdayDateString(todayString) {
  return localDateService.getYesterdayDateString(todayString);
}

async function recoverStreakFromHistory(lastPlayedDate) {
  try {
    const userId = await getCurrentUserId();
    const userSuffix = userId ? `_user_${userId}` : '';

    // Get all storage keys to check for daily puzzle completions
    // Uses storageService to get keys from all storage layers (localStorage, IndexedDB, memory)
    const keys = await storageService.getAllKeys();

    // Build a map of dates to daily puzzle completions
    const dailyCompletions = {};

    for (const key of keys) {
      if (
        key.startsWith('tandem_') &&
        !key.includes('progress') &&
        !key.includes('_gc_') &&
        !key.includes('_pending_') &&
        !key.includes('_last_') &&
        !key.includes('_product_') &&
        !key.includes('_subscription_') &&
        !key.startsWith('tandem_stats') &&
        !key.includes('_puzzle_')
      ) {
        // Filter by user: only process keys that belong to the current user
        if (userId && !key.endsWith(userSuffix)) {
          continue; // Skip keys from other users
        }
        if (!userId && key.includes('_user_')) {
          continue; // Skip authenticated user keys when anonymous
        }

        const parts = key.split('_');
        // Check for both anonymous (length 4) and authenticated (length 6) key formats
        const hasUserSuffix = parts.length >= 6 && parts[parts.length - 2] === 'user';
        const isValidLength = parts.length === 4 || hasUserSuffix;

        if (isValidLength && parts[0] === 'tandem') {
          const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
          const data = await getStorageItem(key);

          if (data) {
            try {
              const parsed = JSON.parse(data);
              // CRITICAL: Only count if it's marked as daily puzzle OR if it's an old entry without metadata
              // For backwards compatibility, if isDaily/isArchive fields don't exist, check if the date matches the puzzle date
              const isDaily =
                parsed.isDaily === true ||
                (parsed.isDaily === undefined && parsed.isArchive !== true);

              if (parsed.won && isDaily) {
                dailyCompletions[date] = true;
              }
            } catch (error) {
              logger.error(`Failed to parse result for ${key}`, error);
            }
          }
        }
      }
    }

    if (Object.keys(dailyCompletions).length === 0) {
      return 0;
    }

    // Sort dates in reverse order (most recent first)
    const dates = Object.keys(dailyCompletions).sort().reverse();

    let streak = 0;
    let expectedDate = lastPlayedDate;

    for (const date of dates) {
      if (date === expectedDate && dailyCompletions[date]) {
        streak++;

        expectedDate = getYesterdayDateString(expectedDate);
      } else if (date < expectedDate) {
        // We've gone past where the streak should be
        break;
      }
    }

    return streak;
  } catch (error) {
    logger.error('Error recovering streak from history', error);
    return 0;
  }
}

/**
 * Check if user is authenticated
 * @private
 */
async function isUserAuthenticated() {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    // Import dynamically to avoid SSR issues
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return !!session?.user;
  } catch (error) {
    logger.error('[storage] Failed to check auth status', error);
    return false;
  }
}

/**
 * Fetch user stats from database
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function fetchUserStatsFromDatabase() {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_STATS), {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated
        return null;
      }
      throw new Error(`Failed to fetch user stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[storage] Failed to fetch user stats from database', error);
    return null;
  }
}

/**
 * Save user stats to database
 * Uses capacitorFetch for iOS compatibility (proper auth headers)
 * @private
 */
async function saveUserStatsToDatabase(stats) {
  try {
    const response = await capacitorFetch(getApiUrl(API_ENDPOINTS.USER_STATS), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        played: stats.played || 0,
        wins: stats.wins || 0,
        currentStreak: stats.currentStreak || 0,
        bestStreak: stats.bestStreak || 0,
        lastStreakDate: stats.lastStreakDate || null,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated - skip sync
        return null;
      }
      throw new Error(`Failed to save user stats: ${response.status}`);
    }

    const data = await response.json();
    return data.stats || null;
  } catch (error) {
    logger.error('[storage] Failed to save user stats to database', error);
    return null;
  }
}

export async function loadStats() {
  if (typeof window === 'undefined') {
    return {
      played: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  }

  // Get current user ID to namespace stats
  const userId = await getCurrentUserId();
  const statsKey = getUserStatsKey(userId);

  // If user is authenticated, attempt migration from anonymous stats
  if (userId) {
    await migrateAnonymousStatsToUser(userId);
  }

  const stats = await getStorageItem(statsKey);
  logger.info('[storage.loadStats] Raw stats from storage:', { statsKey, stats });
  const parsedStats = stats
    ? JSON.parse(stats)
    : {
        played: 0,
        wins: 0,
        currentStreak: 0,
        bestStreak: 0,
      };
  logger.info('[storage.loadStats] Parsed stats:', parsedStats);

  // First, try to sync with database if user is authenticated
  const isAuthenticated = await isUserAuthenticated();
  if (isAuthenticated) {
    try {
      const dbStats = await fetchUserStatsFromDatabase();

      if (dbStats) {
        logger.info('[storage.loadStats] Database stats fetched:', dbStats);

        // Merge database stats with local stats
        // Take the maximum values to ensure we don't lose progress
        const mergedStats = {
          played: Math.max(parsedStats.played || 0, dbStats.played || 0),
          wins: Math.max(parsedStats.wins || 0, dbStats.wins || 0),
          bestStreak: Math.max(parsedStats.bestStreak || 0, dbStats.bestStreak || 0),
          currentStreak: 0, // Will be determined below
          lastStreakDate: null, // Will be determined below
        };

        // For current streak, use the one with the most recent date
        const localDate = parsedStats.lastStreakDate;
        const dbDate = dbStats.lastStreakDate;

        if (localDate && dbDate) {
          if (dbDate >= localDate) {
            mergedStats.currentStreak = dbStats.currentStreak || 0;
            mergedStats.lastStreakDate = dbDate;
          } else {
            mergedStats.currentStreak = parsedStats.currentStreak || 0;
            mergedStats.lastStreakDate = localDate;
          }
        } else if (dbDate) {
          mergedStats.currentStreak = dbStats.currentStreak || 0;
          mergedStats.lastStreakDate = dbDate;
        } else if (localDate) {
          mergedStats.currentStreak = parsedStats.currentStreak || 0;
          mergedStats.lastStreakDate = localDate;
        }

        logger.info('[storage.loadStats] Merged stats (local + database):', mergedStats);

        // Save merged stats locally (skip cloud and DB sync to avoid loops)
        await saveStats(mergedStats, true, true);

        Object.assign(parsedStats, mergedStats);

        // Sync best streak to leaderboard if stats were merged from database
        // This ensures users who created accounts see their streaks on leaderboard
        if (mergedStats.bestStreak > 0) {
          try {
            const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
            // Use bestStreak for sync since we just merged from database
            syncCurrentStreakToLeaderboard(
              { currentStreak: mergedStats.bestStreak, bestStreak: mergedStats.bestStreak },
              'tandem'
            ).catch((error) => {
              logger.error('[storage.loadStats] Failed to sync streak to leaderboard:', error);
            });
          } catch (error) {
            logger.error('[storage.loadStats] Failed to import leaderboard sync:', error);
          }
        }
      } else {
        logger.info('[storage.loadStats] No database stats found, using local stats');
      }
    } catch (error) {
      logger.error('[storage.loadStats] Failed to sync with database', error);
      // Continue with local stats if database sync fails
    }
  } else {
    logger.info('[storage.loadStats] User not authenticated, skipping database sync');
  }

  if (cloudKitService.isSyncAvailable()) {
    try {
      const cloudStats = await cloudKitService.fetchStats();

      if (cloudStats) {
        // Merge CloudKit stats with local stats
        // Take the maximum values to ensure we don't lose progress
        const mergedStats = {
          played: Math.max(parsedStats.played || 0, cloudStats.played || 0),
          wins: Math.max(parsedStats.wins || 0, cloudStats.wins || 0),
          bestStreak: Math.max(parsedStats.bestStreak || 0, cloudStats.bestStreak || 0),
          currentStreak: 0, // Will be determined below
          lastStreakDate: null, // Will be determined below
        };

        // For current streak, use the one with the most recent date
        const localDate = parsedStats.lastStreakDate;
        const cloudDate = cloudStats.lastStreakDate;

        if (localDate && cloudDate) {
          if (cloudDate >= localDate) {
            mergedStats.currentStreak = cloudStats.currentStreak || 0;
            mergedStats.lastStreakDate = cloudDate;
          } else {
            mergedStats.currentStreak = parsedStats.currentStreak || 0;
            mergedStats.lastStreakDate = localDate;
          }
        } else if (cloudDate) {
          mergedStats.currentStreak = cloudStats.currentStreak || 0;
          mergedStats.lastStreakDate = cloudDate;
        } else if (localDate) {
          mergedStats.currentStreak = parsedStats.currentStreak || 0;
          mergedStats.lastStreakDate = localDate;
        }

        // Save the merged stats locally (skip cloud sync since we just fetched from cloud)
        await saveStats(mergedStats, true);

        Object.assign(parsedStats, mergedStats);
      }
    } catch (error) {
      logger.error('Failed to auto-sync with CloudKit', error);
      // Continue with local stats if sync fails
    }
  }

  // CRITICAL: Detect and fix corrupted streak data
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString(today);

  // Check for multiple corruption patterns
  const corruptionDetected =
    // Pattern 1: Streak is 0 but was played today/yesterday
    (parsedStats.currentStreak === 0 &&
      parsedStats.lastStreakDate &&
      (parsedStats.lastStreakDate === today || parsedStats.lastStreakDate === yesterday)) ||
    // Pattern 2: Last streak date is in the future
    (parsedStats.lastStreakDate && localDateService.isDateInFuture(parsedStats.lastStreakDate));

  if (corruptionDetected) {
    // If date is in future, correct it to today
    if (parsedStats.lastStreakDate && localDateService.isDateInFuture(parsedStats.lastStreakDate)) {
      parsedStats.lastStreakDate = today;
    }

    // Attempt to recover streak from game history
    const recoveredStreak = await recoverStreakFromHistory(parsedStats.lastStreakDate || today);
    if (recoveredStreak > 0) {
      parsedStats.currentStreak = recoveredStreak;
      parsedStats.lastStreakUpdate = Date.now();
      parsedStats._recoveredAt = new Date().toISOString(); // Audit trail

      if (recoveredStreak > parsedStats.bestStreak) {
        parsedStats.bestStreak = recoveredStreak;
      }

      await saveStats(parsedStats, true); // Skip cloud sync during recovery
    }
  }

  // Add migration for existing users - ensure lastStreakUpdate exists
  if (parsedStats.currentStreak > 0 && !parsedStats.lastStreakUpdate) {
    parsedStats.lastStreakUpdate = Date.now();
    await saveStats(parsedStats, true); // Skip cloud sync during migration
  }

  // This modifies parsedStats in place, so we return parsedStats after this call
  await checkAndUpdateStreak(parsedStats);

  return parsedStats;
}

async function checkAndUpdateStreak(stats) {
  if (stats.currentStreak > 0 && stats.lastStreakDate) {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString(today);

    // CRITICAL FIX: If lastStreakDate is today, they just played today - don't reset!
    if (stats.lastStreakDate === today) {
      return; // Don't reset streak if they played today
    }

    // Add protection against race conditions - check if we have a recent streak update
    // This prevents the streak from being reset if it was just updated
    if (stats.lastStreakUpdate) {
      const timeSinceUpdate = Date.now() - stats.lastStreakUpdate;
      // If streak was updated in the last 5 seconds, don't reset it
      // This handles the case where loadStats is called immediately after updateGameStats
      if (timeSinceUpdate < 5000) {
        return;
      }
    }

    // If last streak date is yesterday, the streak continues (they can play today)
    if (stats.lastStreakDate === yesterday) {
      return; // Streak is still valid
    }

    // If we get here, last streak date is neither today nor yesterday - reset streak
    stats.currentStreak = 0;
    stats.lastStreakUpdate = Date.now(); // Add timestamp when resetting due to missed days
    // Don't update lastStreakDate here, keep it for history
    await saveStats(stats, true); // Skip cloud sync during streak reset check
  }
}

export async function saveStats(stats, skipCloudSync = false, skipDatabaseSync = false) {
  if (typeof window !== 'undefined') {
    // Get current user ID to namespace stats
    const userId = await getCurrentUserId();
    const statsKey = getUserStatsKey(userId);

    logger.info('[storage.saveStats] Saving stats:', { statsKey, stats });
    await setStorageItem(statsKey, JSON.stringify(stats));
    logger.info('[storage.saveStats] Stats saved to key:', statsKey);

    // Sync to database if user is authenticated and not skipping
    if (!skipDatabaseSync) {
      const isAuthenticated = await isUserAuthenticated();
      if (isAuthenticated) {
        try {
          const dbStats = await saveUserStatsToDatabase(stats);
          if (dbStats) {
            logger.info('[storage.saveStats] Stats synced to database:', dbStats);

            await setStorageItem(statsKey, JSON.stringify(dbStats));
            return dbStats;
          }
        } catch (error) {
          logger.error('[storage.saveStats] Failed to sync with database', error);
          // Non-critical error, continue with local stats
        }
      } else {
        logger.info('[storage.saveStats] User not authenticated, skipping database sync');
      }
    }

    // Sync to iCloud and update local stats with merged result (iOS only)
    if (!skipCloudSync && cloudKitService.isSyncAvailable()) {
      try {
        const syncResult = await cloudKitService.syncStats(stats);

        if (syncResult.success && syncResult.mergedStats) {
          // CloudKit returned merged stats, update local storage with them
          // Save the merged stats locally (with skipCloudSync to avoid infinite loop, use user-namespaced key)
          await setStorageItem(statsKey, JSON.stringify(syncResult.mergedStats));

          return syncResult.mergedStats;
        }
      } catch (error) {
        logger.error('CloudKit sync failed', error);
        // Non-critical error, continue with local stats
      }
    }
  }

  return stats;
}

export async function updateGameStats(
  won,
  isFirstAttempt = true,
  isArchiveGame = false,
  puzzleDate = null
) {
  const stats = await loadStats();

  // Count games played for first attempts only (both daily and archive)
  if (isFirstAttempt) {
    stats.played++;
  }

  if (won) {
    // Count wins for first attempts only (both daily and archive)
    if (isFirstAttempt) {
      stats.wins++;
    }

    // Streak logic - only for daily puzzle first attempts
    if (isFirstAttempt && !isArchiveGame) {
      // Validate and sanitize the puzzle date
      let today = puzzleDate || getTodayDateString();

      // CRITICAL: Validate the date to prevent corruption
      if (puzzleDate && !localDateService.isValidDateString(puzzleDate)) {
        today = getTodayDateString();
      }

      // CRITICAL: Prevent future dates from being saved
      if (localDateService.isDateInFuture(today)) {
        today = getTodayDateString();
      }

      const lastStreakDate = stats.lastStreakDate;
      const yesterday = getYesterdayDateString(today);

      if (!lastStreakDate) {
        // No previous streak, start at 1
        stats.currentStreak = 1;
      } else if (lastStreakDate === yesterday) {
        // Played and won yesterday, continue streak
        stats.currentStreak++;
      } else if (lastStreakDate === today) {
        // Already played today, don't update
        // This handles multiple attempts on the same day
      } else {
        // Missed one or more days, restart streak
        stats.currentStreak = 1;
      }

      stats.lastStreakDate = today;
      stats.lastStreakUpdate = Date.now(); // Add timestamp to prevent race conditions

      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    }
  } else {
    if (isFirstAttempt && !isArchiveGame) {
      stats.currentStreak = 0;
      stats.lastStreakDate = puzzleDate || getTodayDateString();
      stats.lastStreakUpdate = Date.now(); // Add timestamp when resetting streak
    }
  }

  await saveStats(stats);
  return stats;
}

export async function getTodayKey() {
  // Use player's local timezone for Wordle-style puzzle rotation
  // Each player gets a new puzzle at their local midnight
  const baseKey = localDateService.getTodayStorageKey();

  // Namespace by user ID for multi-account support
  const userId = await getCurrentUserId();
  if (!userId) {
    return baseKey; // Anonymous user
  }
  return `${baseKey}_user_${userId}`; // Authenticated user
}

export async function hasPlayedToday() {
  if (typeof window === 'undefined') {
    return false;
  }
  const todayKey = await getTodayKey();
  const result = await getStorageItem(todayKey);
  return result !== null;
}

export async function hasPlayedPuzzle(date) {
  if (typeof window === 'undefined') {
    return false;
  }
  const userId = await getCurrentUserId();
  const key = getUserPuzzleKey(date, userId);
  const result = await getStorageItem(key);
  return result !== null;
}

export async function saveTodayResult(result) {
  if (typeof window !== 'undefined') {
    const todayKey = await getTodayKey();
    await setStorageItem(
      todayKey,
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export async function savePuzzleResult(date, result) {
  if (typeof window !== 'undefined') {
    const userId = await getCurrentUserId();
    const key = getUserPuzzleKey(date, userId);

    // Get current puzzle info to determine if this is the daily puzzle
    const todayDate = getTodayDateString();
    const isDaily = date === todayDate && !result.isArchive;

    const resultWithMetadata = {
      ...result,
      timestamp: new Date().toISOString(),
      isDaily: isDaily, // Track if this was the daily puzzle
      isArchive: result.isArchive || false, // Explicitly track archive status
      puzzleDate: date, // Store the puzzle date
    };

    await setStorageItem(key, JSON.stringify(resultWithMetadata));

    // Sync to iCloud in background (don't await)
    cloudKitService.syncPuzzleResult(date, resultWithMetadata).catch(() => {
      // CloudKit puzzle result sync failed (non-critical)
    });
  }
}

export async function savePuzzleProgress(date, progress) {
  if (typeof window !== 'undefined') {
    const userId = await getCurrentUserId();
    const key = getUserProgressKey(date, userId);
    const existing = await getStorageItem(key);
    const existingData = existing ? JSON.parse(existing) : {};

    // Enhanced progress data with hint system
    const progressWithTimestamp = {
      ...existingData,
      ...progress,

      hintsUsed: progress.hintsUsed ?? existingData.hintsUsed ?? 0,
      hintedAnswers: progress.hintedAnswers ?? existingData.hintedAnswers ?? [],
      unlockedHints: progress.unlockedHints ?? existingData.unlockedHints ?? 1,
      activeHintIndex: progress.activeHintIndex ?? existingData.activeHintIndex ?? null,
      lastUpdated: new Date().toISOString(),
    };

    await setStorageItem(key, JSON.stringify(progressWithTimestamp));

    // Sync to iCloud in background (don't await)
    cloudKitService.syncPuzzleProgress(date, progressWithTimestamp).catch(() => {
      // CloudKit puzzle progress sync failed (non-critical)
    });
  }
}

export async function getTodayResult() {
  if (typeof window === 'undefined') {
    return null;
  }
  const todayKey = await getTodayKey();
  const result = await getStorageItem(todayKey);
  return result ? JSON.parse(result) : null;
}

/**
 * Get puzzle result for a specific date
 * O(1) performance - single key lookup
 * @param {string} date - Date string in format YYYY-MM-DD
 * @returns {Object|null} Puzzle result with completion data or null
 */
export async function getPuzzleResult(date) {
  if (typeof window === 'undefined') {
    return null;
  }
  const userId = await getCurrentUserId();
  const key = getUserPuzzleKey(date, userId);
  const result = await getStorageItem(key);
  const parsed = result ? JSON.parse(result) : null;
  return parsed;
}

export async function getStoredStats() {
  if (typeof window === 'undefined') {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      averageTime: null,
    };
  }

  const userId = await getCurrentUserId();
  const statsKey = getUserStatsKey(userId);
  const stats = await getStorageItem(statsKey);
  const parsedStats = stats ? JSON.parse(stats) : {};

  return {
    gamesPlayed: parsedStats.played || 0,
    gamesWon: parsedStats.wins || 0,
    currentStreak: parsedStats.currentStreak || 0,
    maxStreak: parsedStats.bestStreak || 0,
    averageTime: parsedStats.averageTime || null,
  };
}

export async function getWeeklyPuzzleStats() {
  if (typeof window === 'undefined') {
    return { puzzlesCompleted: 0, bestTime: null, averageTime: null };
  }

  const userId = await getCurrentUserId();
  const today = getTodayDateString();
  const todayDate = new Date(today + 'T00:00:00');
  const dayOfWeek = todayDate.getDay();

  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(todayDate.getDate() - dayOfWeek);

  let puzzlesCompleted = 0;
  let totalTime = 0;
  let bestTime = null;
  const times = [];

  // Check each day of the current week
  for (let i = 0; i <= dayOfWeek; i++) {
    const checkDate = new Date(startOfWeek);
    checkDate.setDate(startOfWeek.getDate() + i);

    // Format date as YYYY-MM-DD
    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const day = String(checkDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const key = getUserPuzzleKey(dateString, userId);

    const result = await getStorageItem(key);
    if (result) {
      try {
        const parsed = JSON.parse(result);

        const isDaily =
          parsed.isDaily === true || (parsed.isDaily === undefined && parsed.isArchive !== true);

        if (parsed.won && isDaily) {
          puzzlesCompleted++;

          if (parsed.time) {
            times.push(parsed.time);
            totalTime += parsed.time;

            if (!bestTime || parsed.time < bestTime) {
              bestTime = parsed.time;
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to parse result for ${key}`, error);
      }
    }
  }

  const averageTime = times.length > 0 ? Math.round(totalTime / times.length) : null;

  return {
    puzzlesCompleted,
    bestTime,
    averageTime,
  };
}

export async function getGameHistory() {
  if (typeof window === 'undefined') {
    return {};
  }

  const userId = await getCurrentUserId();
  const userSuffix = userId ? `_user_${userId}` : '';

  const history = {};
  // Get all storage keys from all layers (localStorage, IndexedDB, memory)
  const keys = await storageService.getAllKeys();

  for (const key of keys) {
    // These keys use the tandem_ prefix but are not game history data
    if (
      key.startsWith('tandem_gc_') || // Game Center keys
      key.startsWith('tandem_pending_') || // Pending achievements/leaderboard
      key.startsWith('tandem_last_') || // Last submitted stats
      key.startsWith('tandem_product_') || // Subscription product ID
      key.startsWith('tandem_subscription_') || // Subscription status
      key.startsWith('tandem_stats') || // Global stats (includes user-specific)
      key === 'tandem_puzzle_' || // Puzzle cache (not game history)
      key.startsWith('last_') || // Notification timestamps
      key === 'notification_permission' // Notification permission status
    ) {
      continue; // Skip non-game data
    }

    // Filter keys by user: only process keys that belong to the current user
    // For anonymous users (userId === null), only process keys without user suffix
    // For authenticated users, only process keys with their user suffix
    if (userId && !key.endsWith(userSuffix)) {
      continue; // Skip keys from other users
    }
    if (!userId && key.includes('_user_')) {
      continue; // Skip authenticated user keys when anonymous
    }

    if (key.startsWith('tandem_')) {
      const parts = key.split('_');

      // Formats: tandem_YYYY_M_D (anonymous) or tandem_YYYY_M_D_user_{userId} (authenticated)
      if (parts[0] === 'tandem' && parts[1] !== 'progress') {
        // For anonymous: parts = ['tandem', 'YYYY', 'M', 'D']
        // For authenticated: parts = ['tandem', 'YYYY', 'M', 'D', 'user', '{userId}']
        const hasUserSuffix = parts.length >= 6 && parts[parts.length - 2] === 'user';
        const dateEndIndex = hasUserSuffix ? 4 : parts.length;

        if (dateEndIndex >= 4) {
          const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
          const data = await getStorageItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              history[date] = {
                ...history[date],
                completed: parsed.won || false,
                failed: parsed.won === false, // Explicitly failed
                time: parsed.time,
                mistakes: parsed.mistakes,
                theme: parsed.theme, // Include the saved theme
                status: parsed.won ? 'completed' : 'failed',
                isDaily: parsed.isDaily || false, // Track if it was a daily puzzle
                isArchive: parsed.isArchive || false, // Track if it was an archive puzzle
              };
            } catch (error) {
              logger.error(`Failed to parse game result for ${key}`, error);
              continue;
            }
          }
        }
      }

      // Formats: tandem_progress_YYYY_M_D (anonymous) or tandem_progress_YYYY_M_D_user_{userId} (authenticated)
      if (parts[1] === 'progress') {
        // For anonymous: parts = ['tandem', 'progress', 'YYYY', 'M', 'D']
        // For authenticated: parts = ['tandem', 'progress', 'YYYY', 'M', 'D', 'user', '{userId}']
        const hasUserSuffix = parts.length >= 7 && parts[parts.length - 2] === 'user';
        const dateEndIndex = hasUserSuffix ? 5 : parts.length;

        if (dateEndIndex >= 5) {
          const date = `${parts[2]}-${parts[3].padStart(2, '0')}-${parts[4].padStart(2, '0')}`;
          const data = await getStorageItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);

              if (!history[date] || !history[date].status) {
                history[date] = {
                  ...history[date],
                  attempted: true,
                  status: 'attempted',
                  lastPlayed: parsed.lastUpdated,
                  solved: parsed.solved || 0,
                  mistakes: parsed.mistakes || 0,
                };
              }
            } catch (error) {
              logger.error(`Failed to parse game progress for ${key}`, error);
              continue;
            }
          }
        }
      }
    }
  }

  return history;
}

/**
 * Restore data from iCloud to local storage
 * Used on first launch or when user chooses to restore from iCloud
 */
export async function restoreFromiCloud() {
  try {
    logger.info('[RESTORE] Starting iCloud restore...');
    const syncData = await cloudKitService.performFullSync();

    logger.info('[RESTORE] syncData received:', syncData);

    if (!syncData.success || !syncData.data) {
      logger.error('[RESTORE] No data found', {
        success: syncData.success,
        hasData: !!syncData.data,
      });
      return { success: false, message: 'No iCloud data found' };
    }

    const userId = await getCurrentUserId();
    const statsKey = getUserStatsKey(userId);

    const { stats, preferences, puzzleResults } = syncData.data;
    let restored = 0;

    // Merge stats (prefer CloudKit for higher values)
    if (stats) {
      const localStats = await loadStats();

      const mergedStats = {
        played: Math.max(stats.played || 0, localStats.played || 0),
        wins: Math.max(stats.wins || 0, localStats.wins || 0),
        bestStreak: Math.max(stats.bestStreak || 0, localStats.bestStreak || 0),
        currentStreak: stats.currentStreak || localStats.currentStreak || 0,
        lastStreakDate: stats.lastStreakDate || localStats.lastStreakDate,
      };

      // Use user-namespaced key
      await setStorageItem(statsKey, JSON.stringify(mergedStats));

      // Important: Don't sync back to CloudKit during restore
      // We're pulling FROM CloudKit, not pushing TO it
      restored++;
    }

    // Restore preferences
    if (preferences) {
      if (preferences.theme) {
        await setStorageItem(STORAGE_KEYS.THEME, preferences.theme);
      }
      if (preferences.themeMode) {
        await setStorageItem(STORAGE_KEYS.THEME_MODE, preferences.themeMode);
      }
      if (preferences.highContrast !== undefined) {
        await setStorageItem(STORAGE_KEYS.HIGH_CONTRAST, preferences.highContrast.toString());
      }
      if (preferences.sound !== undefined) {
        await setStorageItem(STORAGE_KEYS.SOUND, preferences.sound.toString());
      }
      restored++;
    }

    // Restore puzzle results (use most recent timestamp)
    if (puzzleResults && Array.isArray(puzzleResults)) {
      for (const result of puzzleResults) {
        if (result.date) {
          const key = getUserPuzzleKey(result.date, userId);

          const existingData = await getStorageItem(key);
          if (existingData) {
            const existing = JSON.parse(existingData);
            // Keep most recent
            if (existing.timestamp && result.timestamp && existing.timestamp > result.timestamp) {
              continue; // Keep local version
            }
          }

          // Save CloudKit version (use user-namespaced key)
          await setStorageItem(key, JSON.stringify(result));
          restored++;
        }
      }
    }

    logger.info('[RESTORE] Successfully restored', restored, 'items');

    // Even if restored count is 0, still return success if no errors occurred
    const message =
      restored > 0
        ? `Successfully restored ${restored} items from iCloud`
        : 'iCloud sync completed (no new data to restore)';

    const result = {
      success: true,
      restored,
      message,
    };

    logger.info('[RESTORE] Returning result:', result);

    // Debug: Force success return
    return {
      success: true,
      restored,
      message: `Successfully restored ${restored} items from iCloud`,
    };
  } catch (error) {
    logger.error('[RESTORE] Failed with error:', error);
    logger.error('[RESTORE] Error message:', error.message);
    logger.error('[RESTORE] Error stack:', error.stack);
    return {
      success: false,
      message: error.message || 'Failed to restore from iCloud',
    };
  }
}

/**
 * Merge local stats with CloudKit stats
 * Used to combine data from multiple devices
 */
export function mergeStats(localStats, cloudStats) {
  if (!cloudStats) return localStats;
  if (!localStats) return cloudStats;

  return {
    played: (localStats.played || 0) + (cloudStats.played || 0),
    wins: (localStats.wins || 0) + (cloudStats.wins || 0),
    bestStreak: Math.max(localStats.bestStreak || 0, cloudStats.bestStreak || 0),
    currentStreak: cloudStats.currentStreak || localStats.currentStreak || 0,
    lastStreakDate: cloudStats.lastStreakDate || localStats.lastStreakDate,
  };
}
