/**
 * Leaderboard Sync Utility
 *
 * Handles syncing user stats to leaderboard entries.
 * Used when users authenticate or when stats are loaded from database.
 */

import logger from '@/lib/logger';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';

/**
 * Submit user's best streak to the leaderboard
 *
 * @param {Object} stats - User's stats object with bestStreak
 * @param {string} gameType - 'tandem', 'cryptic', 'mini', 'reel', or 'soup'
 * @returns {Promise<boolean>} True if submitted successfully
 */
async function submitStreakToLeaderboard(stats, gameType = 'tandem') {
  try {
    if (!stats || !stats.bestStreak || stats.bestStreak <= 0) {
      logger.info('[leaderboardSync] No streak to submit:', stats?.bestStreak);
      return false;
    }

    logger.info(
      `[leaderboardSync] Submitting ${gameType} streak to leaderboard:`,
      stats.bestStreak
    );

    const response = await capacitorFetch(getApiUrl('/api/leaderboard/streak'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType,
        streak: stats.bestStreak,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Don't log errors for expected cases
      if (response.status === 401) {
        logger.info('[leaderboardSync] User not authenticated, skipping leaderboard sync');
        return false;
      }
      if (response.status === 403) {
        logger.info('[leaderboardSync] Leaderboards disabled for user, skipping sync');
        return false;
      }
      if (response.status === 429) {
        logger.info('[leaderboardSync] Rate limited, will retry later');
        return false;
      }

      logger.error('[leaderboardSync] Failed to submit streak:', result);
      return false;
    }

    logger.info('[leaderboardSync] Streak submitted successfully:', result);
    return true;
  } catch (error) {
    // Fail silently - leaderboard sync should never block the user
    logger.error('[leaderboardSync] Error submitting streak:', error);
    return false;
  }
}

/**
 * Sync user's stats to leaderboard after authentication
 * Submits Tandem, Cryptic, Mini, Reel, and Soup streaks if available
 *
 * @param {Object} tandemStats - Tandem game stats
 * @param {Object} crypticStats - Cryptic game stats (optional)
 * @param {Object} miniStats - Mini game stats (optional)
 * @param {Object} reelStats - Reel Connections game stats (optional)
 * @param {Object} soupStats - Element Soup game stats (optional)
 * @returns {Promise<{tandem: boolean, cryptic: boolean, mini: boolean, reel: boolean, soup: boolean}>}
 */
export async function syncStatsToLeaderboardOnAuth(
  tandemStats,
  crypticStats = null,
  miniStats = null,
  reelStats = null,
  soupStats = null
) {
  try {
    logger.info('[leaderboardSync] Starting auth-triggered leaderboard sync');

    const results = {
      tandem: false,
      cryptic: false,
      mini: false,
      reel: false,
      soup: false,
    };

    // Submit Tandem streak
    if (tandemStats) {
      results.tandem = await submitStreakToLeaderboard(tandemStats, 'tandem');

      // Add small delay to avoid rate limiting
      if (crypticStats || miniStats || reelStats || soupStats) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Submit Cryptic streak
    if (crypticStats) {
      results.cryptic = await submitStreakToLeaderboard(crypticStats, 'cryptic');

      // Add small delay to avoid rate limiting
      if (miniStats || reelStats || soupStats) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Submit Mini streak (uses longestStreak as bestStreak)
    if (miniStats && miniStats.longestStreak > 0) {
      results.mini = await submitStreakToLeaderboard(
        { bestStreak: miniStats.longestStreak },
        'mini'
      );

      // Add small delay to avoid rate limiting
      if (reelStats || soupStats) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Submit Reel Connections streak
    if (reelStats && reelStats.bestStreak > 0) {
      results.reel = await submitStreakToLeaderboard({ bestStreak: reelStats.bestStreak }, 'reel');

      // Add small delay to avoid rate limiting
      if (soupStats) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Submit Element Soup streak (uses longestStreak as bestStreak)
    if (soupStats && soupStats.longestStreak > 0) {
      results.soup = await submitStreakToLeaderboard(
        { bestStreak: soupStats.longestStreak },
        'soup'
      );
    }

    logger.info('[leaderboardSync] Auth sync complete:', results);
    return results;
  } catch (error) {
    logger.error('[leaderboardSync] Error during auth sync:', error);
    return { tandem: false, cryptic: false, mini: false, reel: false, soup: false };
  }
}

/**
 * Sync current streak to leaderboard (called after stats update)
 *
 * @param {Object} stats - Updated stats object
 * @param {string} gameType - 'tandem', 'cryptic', 'mini', 'reel', or 'soup'
 * @returns {Promise<boolean>}
 */
export async function syncCurrentStreakToLeaderboard(stats, gameType = 'tandem') {
  try {
    if (!stats || stats.currentStreak !== stats.bestStreak || stats.bestStreak <= 0) {
      return false;
    }

    logger.info(`[leaderboardSync] Current streak matches best streak, submitting to leaderboard`);
    return await submitStreakToLeaderboard(stats, gameType);
  } catch (error) {
    logger.error('[leaderboardSync] Error syncing current streak:', error);
    return false;
  }
}

export default {
  syncStatsToLeaderboardOnAuth,
  syncCurrentStreakToLeaderboard,
};
