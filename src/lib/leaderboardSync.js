/**
 * Leaderboard Sync Utility
 *
 * Handles syncing user stats to leaderboard entries.
 * Used when users authenticate or when stats are loaded from database.
 */

import logger from '@/lib/logger';

/**
 * Submit user's best streak to the leaderboard
 *
 * @param {Object} stats - User's stats object with bestStreak
 * @param {string} gameType - 'tandem' or 'cryptic'
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

    const response = await fetch('/api/leaderboard/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
 * Submits both Tandem and Cryptic streaks if available
 *
 * @param {Object} tandemStats - Tandem game stats
 * @param {Object} crypticStats - Cryptic game stats (optional)
 * @returns {Promise<{tandem: boolean, cryptic: boolean}>}
 */
export async function syncStatsToLeaderboardOnAuth(tandemStats, crypticStats = null) {
  try {
    logger.info('[leaderboardSync] Starting auth-triggered leaderboard sync');

    const results = {
      tandem: false,
      cryptic: false,
    };

    // Submit Tandem streak
    if (tandemStats) {
      results.tandem = await submitStreakToLeaderboard(tandemStats, 'tandem');

      // Add small delay to avoid rate limiting
      if (crypticStats) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Submit Cryptic streak
    if (crypticStats) {
      results.cryptic = await submitStreakToLeaderboard(crypticStats, 'cryptic');
    }

    logger.info('[leaderboardSync] Auth sync complete:', results);
    return results;
  } catch (error) {
    logger.error('[leaderboardSync] Error during auth sync:', error);
    return { tandem: false, cryptic: false };
  }
}

/**
 * Sync current streak to leaderboard (called after stats update)
 *
 * @param {Object} stats - Updated stats object
 * @param {string} gameType - 'tandem' or 'cryptic'
 * @returns {Promise<boolean>}
 */
export async function syncCurrentStreakToLeaderboard(stats, gameType = 'tandem') {
  try {
    // Only submit current streak if it equals best streak (i.e., it just improved)
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
