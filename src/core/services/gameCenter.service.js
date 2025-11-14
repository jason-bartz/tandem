/**
 * Game Center Service
 * Handles all Game Center interactions including authentication,
 * achievement submissions, and leaderboard updates
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS } from '@/core/config/constants';
import { LEADERBOARDS } from '@/shared/achievements/lib/achievementDefinitions';
import {
  getNewlyUnlockedAchievements,
  getHighestStreakThreshold,
  getHighestWinsThreshold,
  getAllQualifyingAchievements,
  getNewlyUnlockedCrypticAchievements,
  getHighestCrypticStreakThreshold,
  getHighestCrypticWinsThreshold,
} from '@/shared/achievements/lib/achievementChecker';
import logger from '@/utils/helpers/logger';
import { loadStats } from '@/core/storage/storage';

// Use our custom EnhancedGameCenterPlugin instead of third-party plugin
const GameConnect = registerPlugin('EnhancedGameCenterPlugin');

class GameCenterService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
    this.isAuthenticated = false;
    this.playerId = null;
    this.initPromise = null;
    this.achievementListeners = [];
  }

  /**
   * Initialize and authenticate with Game Center
   * This should be called silently on app launch
   * @returns {Promise<boolean>} True if authenticated successfully
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    if (!this.isNative) {
      logger.info('[GameCenter] Not on iOS, skipping initialization');
      return false;
    }

    try {
      // Check if already authenticated (cached)
      const cachedAuth = await Preferences.get({ key: STORAGE_KEYS.GAME_CENTER_AUTHENTICATED });
      const cachedPlayerId = await Preferences.get({ key: STORAGE_KEYS.GAME_CENTER_PLAYER_ID });

      if (cachedAuth.value === 'true' && cachedPlayerId.value) {
        this.isAuthenticated = true;
        this.playerId = cachedPlayerId.value;
        logger.info('[GameCenter] Using cached authentication');
      }

      // Attempt silent authentication using our custom plugin
      const result = await GameConnect.authenticateLocalPlayer();

      if (result && result.authenticated) {
        this.isAuthenticated = true;
        this.playerId = result.playerID;

        // Cache authentication status
        await Preferences.set({
          key: STORAGE_KEYS.GAME_CENTER_AUTHENTICATED,
          value: 'true',
        });
        await Preferences.set({
          key: STORAGE_KEYS.GAME_CENTER_PLAYER_ID,
          value: result.player_id,
        });

        logger.info('[GameCenter] Authenticated successfully:', result.player_name);

        // Process any pending offline achievements/scores
        await this.processOfflineQueue();

        // Check for retroactive achievements (for existing users)
        await this.checkRetroactiveAchievements();

        return true;
      }

      logger.warn('[GameCenter] Authentication failed or cancelled');
      return false;
    } catch (error) {
      logger.error('[GameCenter] Initialization error:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Check if Game Center is available and authenticated
   * @returns {boolean}
   */
  isAvailable() {
    return this.isNative && this.isAuthenticated;
  }

  /**
   * Submit an achievement to Game Center
   * @param {string} achievementId - The achievement ID
   * @returns {Promise<boolean>} True if submitted successfully
   */
  async submitAchievement(achievementId) {
    if (!this.isAvailable()) {
      logger.warn('[GameCenter] Not available, queueing achievement:', achievementId);
      await this._queueAchievement(achievementId);
      return false;
    }

    try {
      await GameConnect.unlockAchievement({ achievementID: achievementId });
      logger.info('[GameCenter] Achievement unlocked:', achievementId);
      return true;
    } catch (error) {
      logger.error('[GameCenter] Failed to submit achievement:', achievementId, error);
      // Queue for retry
      await this._queueAchievement(achievementId);
      return false;
    }
  }

  /**
   * Submit multiple achievements at once
   * @param {Array<string>} achievementIds - Array of achievement IDs
   * @returns {Promise<number>} Number of successfully submitted achievements
   */
  async submitAchievements(achievementIds) {
    if (!achievementIds || achievementIds.length === 0) {
      return 0;
    }

    let successCount = 0;
    for (const id of achievementIds) {
      const success = await this.submitAchievement(id);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Submit score to leaderboard
   * @param {string} leaderboardId - The leaderboard ID
   * @param {number} score - The score value
   * @returns {Promise<boolean>} True if submitted successfully
   */
  async submitScore(leaderboardId, score) {
    logger.info('[GameCenter] submitScore called with:', { leaderboardId, score });

    if (!this.isAvailable()) {
      logger.warn('[GameCenter] Not available, queueing score:', leaderboardId, score);
      logger.warn('[GameCenter] Auth status:', {
        isNative: this.isNative,
        isAuthenticated: this.isAuthenticated,
        playerId: this.playerId,
      });
      await this._queueLeaderboardScore(leaderboardId, score);
      return false;
    }

    try {
      logger.info('[GameCenter] Submitting score to Game Center:', {
        leaderboardID: leaderboardId,
        totalScoreAmount: score,
      });

      await GameConnect.submitScore({
        leaderboardID: leaderboardId,
        totalScoreAmount: score,
      });

      logger.info('[GameCenter] Score submitted successfully:', leaderboardId, score);
      return true;
    } catch (error) {
      logger.error('[GameCenter] Failed to submit score:', leaderboardId, score, error);
      logger.error('[GameCenter] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      // Queue for retry
      await this._queueLeaderboardScore(leaderboardId, score);
      return false;
    }
  }

  /**
   * Submit current streak to the leaderboard
   * @param {number} streakValue - The current streak value
   * @returns {Promise<boolean>} True if submitted successfully
   */
  async submitStreakToLeaderboard(streakValue) {
    if (streakValue <= 0) {
      return false;
    }

    return await this.submitScore(LEADERBOARDS.LONGEST_STREAK.id, streakValue);
  }

  /**
   * Check stats and submit any newly unlocked achievements
   * @param {Object} stats - Player stats with bestStreak and wins
   * @returns {Promise<Array>} Array of newly unlocked achievements
   */
  async checkAndSubmitAchievements(stats) {
    if (!stats) {
      logger.warn('[GameCenter] checkAndSubmitAchievements called with null stats');
      return [];
    }

    logger.info('[GameCenter] Checking achievements with stats:', {
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      wins: stats.wins,
      played: stats.played,
    });

    try {
      // Get last submitted values
      const lastStreakResult = await Preferences.get({ key: STORAGE_KEYS.LAST_SUBMITTED_STREAK });
      const lastWinsResult = await Preferences.get({ key: STORAGE_KEYS.LAST_SUBMITTED_WINS });

      const lastStreak = lastStreakResult.value ? parseInt(lastStreakResult.value, 10) : 0;
      const lastWins = lastWinsResult.value ? parseInt(lastWinsResult.value, 10) : 0;

      logger.info('[GameCenter] Last submitted values:', {
        lastStreak,
        lastWins,
      });

      // Check for newly unlocked achievements
      const newAchievements = getNewlyUnlockedAchievements(stats, {
        streak: lastStreak,
        wins: lastWins,
      });

      if (newAchievements.length === 0) {
        logger.info('[GameCenter] No new achievements to unlock');
        return [];
      }

      logger.info('[GameCenter] Found new achievements to unlock:', newAchievements.length);
      logger.info('[GameCenter] New achievements:', newAchievements);

      // Submit each achievement
      const achievementIds = newAchievements.map((a) => a.id);
      await this.submitAchievements(achievementIds);

      // Track submitted achievements
      const submittedResult = await Preferences.get({ key: STORAGE_KEYS.SUBMITTED_ACHIEVEMENTS });
      const submittedAchievements = submittedResult.value ? JSON.parse(submittedResult.value) : [];
      const updatedSubmittedList = [...new Set([...submittedAchievements, ...achievementIds])];
      await Preferences.set({
        key: STORAGE_KEYS.SUBMITTED_ACHIEVEMENTS,
        value: JSON.stringify(updatedSubmittedList),
      });

      // Update last submitted values
      const newLastStreak = getHighestStreakThreshold(stats.bestStreak || 0);
      const newLastWins = getHighestWinsThreshold(stats.wins || 0);

      await Preferences.set({
        key: STORAGE_KEYS.LAST_SUBMITTED_STREAK,
        value: newLastStreak.toString(),
      });
      await Preferences.set({
        key: STORAGE_KEYS.LAST_SUBMITTED_WINS,
        value: newLastWins.toString(),
      });

      // Notify listeners
      this._notifyAchievementListeners(newAchievements);

      return newAchievements;
    } catch (error) {
      logger.error('[GameCenter] Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Check and submit cryptic achievements
   * Compares current cryptic stats against last submitted values
   * @param {Object} stats - Current cryptic stats (longestStreak, totalCompleted)
   * @returns {Promise<Array>} Array of newly unlocked achievement objects
   */
  async checkAndSubmitCrypticAchievements(stats) {
    if (!this.isAvailable()) {
      logger.info('[GameCenter] Not available, skipping cryptic achievement check');
      return [];
    }

    logger.info('[GameCenter] Checking cryptic achievements with stats:', {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalCompleted: stats.totalCompleted,
    });

    try {
      // Get last submitted values for cryptic
      const lastStreakResult = await Preferences.get({
        key: STORAGE_KEYS.LAST_SUBMITTED_CRYPTIC_STREAK,
      });
      const lastWinsResult = await Preferences.get({
        key: STORAGE_KEYS.LAST_SUBMITTED_CRYPTIC_WINS,
      });

      const lastStreak = lastStreakResult.value ? parseInt(lastStreakResult.value, 10) : 0;
      const lastWins = lastWinsResult.value ? parseInt(lastWinsResult.value, 10) : 0;

      logger.info('[GameCenter] Last submitted cryptic values:', {
        lastStreak,
        lastWins,
      });

      // Check for newly unlocked cryptic achievements
      const newAchievements = getNewlyUnlockedCrypticAchievements(stats, {
        streak: lastStreak,
        wins: lastWins,
      });

      if (newAchievements.length === 0) {
        logger.info('[GameCenter] No new cryptic achievements to unlock');
        return [];
      }

      logger.info('[GameCenter] Found new cryptic achievements to unlock:', newAchievements.length);
      logger.info('[GameCenter] New cryptic achievements:', newAchievements);

      // Submit each achievement
      const achievementIds = newAchievements.map((a) => a.id);
      await this.submitAchievements(achievementIds);

      // Track submitted cryptic achievements
      const submittedResult = await Preferences.get({
        key: STORAGE_KEYS.SUBMITTED_CRYPTIC_ACHIEVEMENTS,
      });
      const submittedAchievements = submittedResult.value ? JSON.parse(submittedResult.value) : [];
      const updatedSubmittedList = [...new Set([...submittedAchievements, ...achievementIds])];
      await Preferences.set({
        key: STORAGE_KEYS.SUBMITTED_CRYPTIC_ACHIEVEMENTS,
        value: JSON.stringify(updatedSubmittedList),
      });

      // Update last submitted cryptic values
      const newLastStreak = getHighestCrypticStreakThreshold(stats.longestStreak || 0);
      const newLastWins = getHighestCrypticWinsThreshold(stats.totalCompleted || 0);

      await Preferences.set({
        key: STORAGE_KEYS.LAST_SUBMITTED_CRYPTIC_STREAK,
        value: newLastStreak.toString(),
      });
      await Preferences.set({
        key: STORAGE_KEYS.LAST_SUBMITTED_CRYPTIC_WINS,
        value: newLastWins.toString(),
      });

      // Notify listeners
      this._notifyAchievementListeners(newAchievements);

      return newAchievements;
    } catch (error) {
      logger.error('[GameCenter] Error checking cryptic achievements:', error);
      return [];
    }
  }

  /**
   * Show native Game Center achievements UI
   * @returns {Promise<void>}
   */
  async showAchievements() {
    if (!this.isAvailable()) {
      logger.warn('[GameCenter] Not available, cannot show achievements');
      return;
    }

    try {
      await GameConnect.showAchievements();
    } catch (error) {
      logger.error('[GameCenter] Failed to show achievements:', error);
    }
  }

  /**
   * Show native Game Center leaderboard UI
   * @param {string} leaderboardId - Optional specific leaderboard ID
   * @returns {Promise<void>}
   */
  async showLeaderboard(leaderboardId = LEADERBOARDS.LONGEST_STREAK.id) {
    if (!this.isAvailable()) {
      logger.warn('[GameCenter] Not available, cannot show leaderboard');
      return;
    }

    try {
      await GameConnect.showLeaderboard({ leaderboardID: leaderboardId });
    } catch (error) {
      logger.error('[GameCenter] Failed to show leaderboard:', error);
    }
  }

  /**
   * Queue achievement for offline submission
   * @private
   */
  async _queueAchievement(achievementId) {
    try {
      const queueResult = await Preferences.get({ key: STORAGE_KEYS.PENDING_ACHIEVEMENTS });
      const queue = queueResult.value ? JSON.parse(queueResult.value) : [];

      // Avoid duplicates
      if (!queue.includes(achievementId)) {
        queue.push(achievementId);
        await Preferences.set({
          key: STORAGE_KEYS.PENDING_ACHIEVEMENTS,
          value: JSON.stringify(queue),
        });
        logger.info('[GameCenter] Achievement queued:', achievementId);
      }
    } catch (error) {
      logger.error('[GameCenter] Failed to queue achievement:', error);
    }
  }

  /**
   * Queue leaderboard score for offline submission
   * @private
   */
  async _queueLeaderboardScore(leaderboardId, score) {
    try {
      const queueResult = await Preferences.get({ key: STORAGE_KEYS.PENDING_LEADERBOARD });
      const queue = queueResult.value ? JSON.parse(queueResult.value) : [];

      // Replace existing entry for same leaderboard (keep highest score)
      const existingIndex = queue.findIndex((item) => item.id === leaderboardId);
      if (existingIndex >= 0) {
        if (score > queue[existingIndex].score) {
          queue[existingIndex].score = score;
        }
      } else {
        queue.push({ id: leaderboardId, score });
      }

      await Preferences.set({
        key: STORAGE_KEYS.PENDING_LEADERBOARD,
        value: JSON.stringify(queue),
      });
      logger.info('[GameCenter] Score queued:', leaderboardId, score);
    } catch (error) {
      logger.error('[GameCenter] Failed to queue score:', error);
    }
  }

  /**
   * Check and submit retroactive achievements for existing users
   * This ensures users with existing stats get their earned achievements
   * @returns {Promise<void>}
   */
  async checkRetroactiveAchievements() {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Check if we've already done the retroactive check
      const checkDone = await Preferences.get({
        key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE,
      });
      if (checkDone.value === 'true') {
        logger.info('[GameCenter] Retroactive achievement check already completed');
        return;
      }

      logger.info('[GameCenter] Starting retroactive achievement check for existing user');

      // Load current stats
      const stats = await loadStats();
      if (!stats || (stats.wins === 0 && stats.bestStreak === 0)) {
        logger.info('[GameCenter] No stats to check for retroactive achievements');
        await Preferences.set({
          key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE,
          value: 'true',
        });
        return;
      }

      // Get all achievements that should be unlocked based on current stats
      const qualifyingAchievements = getAllQualifyingAchievements(stats);

      if (qualifyingAchievements.length === 0) {
        logger.info('[GameCenter] No retroactive achievements to unlock');
        await Preferences.set({
          key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE,
          value: 'true',
        });
        return;
      }

      // Get list of already submitted achievements
      const submittedResult = await Preferences.get({ key: STORAGE_KEYS.SUBMITTED_ACHIEVEMENTS });
      const submittedAchievements = submittedResult.value ? JSON.parse(submittedResult.value) : [];

      // Filter out already submitted achievements
      const newAchievements = qualifyingAchievements.filter(
        (achievement) => !submittedAchievements.includes(achievement.id)
      );

      if (newAchievements.length === 0) {
        logger.info('[GameCenter] All qualifying achievements already submitted');
        await Preferences.set({
          key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE,
          value: 'true',
        });
        return;
      }

      logger.info(
        `[GameCenter] Found ${newAchievements.length} retroactive achievements to unlock`
      );

      // Submit each achievement and track which ones succeed
      const successfullySubmitted = [];
      for (const achievement of newAchievements) {
        const success = await this.submitAchievement(achievement.id);
        if (success) {
          successfullySubmitted.push(achievement.id);
          logger.info(
            `[GameCenter] Retroactively unlocked: ${achievement.name} (${achievement.emoji})`
          );
        }
      }

      // Update the list of submitted achievements
      const updatedSubmittedList = [...submittedAchievements, ...successfullySubmitted];
      await Preferences.set({
        key: STORAGE_KEYS.SUBMITTED_ACHIEVEMENTS,
        value: JSON.stringify(updatedSubmittedList),
      });

      // Update last submitted values to reflect current state
      const newLastStreak = getHighestStreakThreshold(stats.bestStreak || 0);
      const newLastWins = getHighestWinsThreshold(stats.wins || 0);

      await Preferences.set({
        key: STORAGE_KEYS.LAST_SUBMITTED_STREAK,
        value: newLastStreak.toString(),
      });
      await Preferences.set({
        key: STORAGE_KEYS.LAST_SUBMITTED_WINS,
        value: newLastWins.toString(),
      });

      // Mark retroactive check as complete
      await Preferences.set({
        key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE,
        value: 'true',
      });

      // Notify listeners about retroactive achievements
      if (successfullySubmitted.length > 0) {
        const unlockedAchievements = newAchievements.filter((a) =>
          successfullySubmitted.includes(a.id)
        );
        this._notifyAchievementListeners(unlockedAchievements);
      }

      logger.info(
        `[GameCenter] Retroactive achievement check complete. Unlocked ${successfullySubmitted.length} achievements`
      );
    } catch (error) {
      logger.error('[GameCenter] Error during retroactive achievement check:', error);
      // Don't mark as complete if there was an error - will retry next time
    }
  }

  /**
   * Process queued achievements and scores
   * Called after successful authentication
   * @returns {Promise<void>}
   */
  async processOfflineQueue() {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Process queued achievements
      const achievementsResult = await Preferences.get({ key: STORAGE_KEYS.PENDING_ACHIEVEMENTS });
      if (achievementsResult.value) {
        const queue = JSON.parse(achievementsResult.value);
        logger.info('[GameCenter] Processing queued achievements:', queue.length);

        for (const achievementId of queue) {
          await this.submitAchievement(achievementId);
        }

        // Clear queue
        await Preferences.remove({ key: STORAGE_KEYS.PENDING_ACHIEVEMENTS });
      }

      // Process queued leaderboard scores
      const scoresResult = await Preferences.get({ key: STORAGE_KEYS.PENDING_LEADERBOARD });
      if (scoresResult.value) {
        const queue = JSON.parse(scoresResult.value);
        logger.info('[GameCenter] Processing queued scores:', queue.length);

        for (const item of queue) {
          await this.submitScore(item.id, item.score);
        }

        // Clear queue
        await Preferences.remove({ key: STORAGE_KEYS.PENDING_LEADERBOARD });
      }
    } catch (error) {
      logger.error('[GameCenter] Failed to process offline queue:', error);
    }
  }

  /**
   * Add a listener for achievement unlocks
   * @param {Function} callback - Called when achievements are unlocked
   * @returns {Function} Unsubscribe function
   */
  onAchievementUnlocked(callback) {
    this.achievementListeners.push(callback);
    return () => {
      this.achievementListeners = this.achievementListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all achievement listeners
   * @private
   */
  _notifyAchievementListeners(achievements) {
    this.achievementListeners.forEach((callback) => {
      try {
        callback(achievements);
      } catch (error) {
        logger.error('[GameCenter] Achievement listener error:', error);
      }
    });
  }

  /**
   * Reset all Game Center data (for testing/debugging only)
   * @returns {Promise<void>}
   */
  async resetGameCenterData() {
    try {
      await Preferences.remove({ key: STORAGE_KEYS.GAME_CENTER_AUTHENTICATED });
      await Preferences.remove({ key: STORAGE_KEYS.GAME_CENTER_PLAYER_ID });
      await Preferences.remove({ key: STORAGE_KEYS.PENDING_ACHIEVEMENTS });
      await Preferences.remove({ key: STORAGE_KEYS.PENDING_LEADERBOARD });
      await Preferences.remove({ key: STORAGE_KEYS.LAST_SUBMITTED_STREAK });
      await Preferences.remove({ key: STORAGE_KEYS.LAST_SUBMITTED_WINS });
      await Preferences.remove({ key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE });
      await Preferences.remove({ key: STORAGE_KEYS.SUBMITTED_ACHIEVEMENTS });

      this.isAuthenticated = false;
      this.playerId = null;
      this.initPromise = null;

      logger.info('[GameCenter] All data reset');
    } catch (error) {
      logger.error('[GameCenter] Failed to reset data:', error);
    }
  }

  /**
   * Debug function to check Game Center state
   * @returns {Promise<Object>} Current Game Center state and pending items
   */
  async debugGetState() {
    try {
      const state = {
        isNative: this.isNative,
        isAuthenticated: this.isAuthenticated,
        playerId: this.playerId,
        isAvailable: this.isAvailable(),
      };

      // Get stored values
      const lastStreakResult = await Preferences.get({ key: STORAGE_KEYS.LAST_SUBMITTED_STREAK });
      const lastWinsResult = await Preferences.get({ key: STORAGE_KEYS.LAST_SUBMITTED_WINS });
      const submittedResult = await Preferences.get({ key: STORAGE_KEYS.SUBMITTED_ACHIEVEMENTS });
      const pendingAchievementsResult = await Preferences.get({
        key: STORAGE_KEYS.PENDING_ACHIEVEMENTS,
      });
      const pendingLeaderboardResult = await Preferences.get({
        key: STORAGE_KEYS.PENDING_LEADERBOARD,
      });
      const retroactiveCheckResult = await Preferences.get({
        key: STORAGE_KEYS.ACHIEVEMENTS_RETROACTIVE_CHECK_DONE,
      });

      state.storedData = {
        lastSubmittedStreak: lastStreakResult.value
          ? parseInt(lastStreakResult.value, 10)
          : 'Not set',
        lastSubmittedWins: lastWinsResult.value ? parseInt(lastWinsResult.value, 10) : 'Not set',
        submittedAchievements: submittedResult.value
          ? JSON.parse(submittedResult.value)
          : 'Not set',
        pendingAchievements: pendingAchievementsResult.value
          ? JSON.parse(pendingAchievementsResult.value)
          : 'Not set',
        pendingLeaderboard: pendingLeaderboardResult.value
          ? JSON.parse(pendingLeaderboardResult.value)
          : 'Not set',
        retroactiveCheckDone: retroactiveCheckResult.value === 'true',
      };

      // Get current stats for comparison
      const stats = await loadStats();
      state.currentStats = {
        played: stats.played,
        wins: stats.wins,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        lastStreakDate: stats.lastStreakDate,
      };

      // Check what achievements should be unlocked
      state.achievementStatus = {
        shouldHave3DayStreak: stats.bestStreak >= 3,
        has3DayStreakSubmitted:
          state.storedData.submittedAchievements !== 'Not set' &&
          state.storedData.submittedAchievements.includes('com.tandemdaily.app.first_pedal'),
        qualifyingAchievements: getAllQualifyingAchievements(stats),
      };

      logger.info('[GameCenter] Debug state:', state);
      return state;
    } catch (error) {
      logger.error('[GameCenter] Failed to get debug state:', error);
      return { error: error.message };
    }
  }

  /**
   * Debug function to manually test Game Center submission
   * @param {number} testStreak - Test streak value to submit
   * @returns {Promise<Object>} Test results
   */
  async debugTestSubmission(testStreak = 1) {
    try {
      logger.info('[GameCenter] Starting debug test submission with streak:', testStreak);

      const results = {
        authStatus: {
          isNative: this.isNative,
          isAuthenticated: this.isAuthenticated,
          playerId: this.playerId,
          isAvailable: this.isAvailable(),
        },
        leaderboardTest: null,
        achievementTest: null,
      };

      // Test leaderboard submission
      logger.info('[GameCenter] Testing leaderboard submission...');
      const leaderboardSuccess = await this.submitScore(LEADERBOARDS.LONGEST_STREAK.id, testStreak);
      results.leaderboardTest = {
        success: leaderboardSuccess,
        leaderboardId: LEADERBOARDS.LONGEST_STREAK.id,
        submittedValue: testStreak,
      };

      // Test achievement submission (if streak is 3+)
      if (testStreak >= 3) {
        logger.info('[GameCenter] Testing 3-day streak achievement submission...');
        const achievementSuccess = await this.submitAchievement('com.tandemdaily.app.first_pedal');
        results.achievementTest = {
          success: achievementSuccess,
          achievementId: 'com.tandemdaily.app.first_pedal',
          achievementName: 'First Pedal (3-day streak)',
        };
      }

      logger.info('[GameCenter] Debug test results:', results);
      return results;
    } catch (error) {
      logger.error('[GameCenter] Debug test failed:', error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
const gameCenterService = new GameCenterService();
export default gameCenterService;
