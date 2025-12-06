import { API_ENDPOINTS, STORAGE_KEYS } from '@/lib/constants';
import { updateGameStats, saveTodayResult, hasPlayedPuzzle } from '@/lib/storage';
// gameCenterService removed - Game Center integration deprecated
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

class StatsService {
  /**
   * Check if user has completed onboarding (indicating consent to data collection)
   * @private
   */
  async _hasUserConsent() {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await Preferences.get({ key: STORAGE_KEYS.HAS_SEEN_ONBOARDING });
        return result.value === 'true';
      } else {
        return localStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING) === 'true';
      }
    } catch (error) {
      console.error('Failed to check user consent:', error);
      // Default to false if check fails
      return false;
    }
  }

  /**
   * Check if user has leaderboards enabled
   * @private
   */
  async _hasLeaderboardsEnabled() {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await Preferences.get({ key: STORAGE_KEYS.LEADERBOARDS_ENABLED });
        // Default to true if not set (for backwards compatibility)
        return result.value !== 'false';
      } else {
        const value = localStorage.getItem(STORAGE_KEYS.LEADERBOARDS_ENABLED);
        // Default to true if not set (for backwards compatibility)
        return value !== 'false';
      }
    } catch (error) {
      console.error('Failed to check leaderboard preference:', error);
      // Default to true if check fails
      return true;
    }
  }
  async getGlobalStats() {
    try {
      const response = await fetch(API_ENDPOINTS.STATS);

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('StatsService.getGlobalStats error:', error);
      throw error;
    }
  }

  async updateStats(gameResult) {
    try {
      // Always trust the passed isFirstAttempt flag since it's determined before saving
      const isFirstAttempt =
        gameResult.isFirstAttempt !== undefined ? gameResult.isFirstAttempt : true; // Default to true if not provided

      const localStats = await updateGameStats(
        gameResult.completed,
        isFirstAttempt,
        gameResult.isArchive || false,
        gameResult.puzzleDate
      );

      // Save the result if it's not an archive game
      if (!gameResult.isArchive) {
        await saveTodayResult({
          completed: gameResult.completed,
          mistakes: gameResult.mistakes,
          solved: gameResult.solved,
          time: gameResult.time || 0, // Default to 0 if time is not provided
          won: gameResult.completed,
        });
      }

      if (!gameResult.isArchive) {
        const hasConsent = await this._hasUserConsent();
        const leaderboardsEnabled = await this._hasLeaderboardsEnabled();

        if (hasConsent && leaderboardsEnabled) {
          const response = await fetch(API_ENDPOINTS.PUZZLE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              completed: gameResult.completed,
              time: gameResult.time || 0,
              mistakes: gameResult.mistakes || 0,
            }),
          });

          if (!response.ok) {
            console.warn('Failed to update server stats:', response.status);
          }
        } else {
          // User has not consented or has disabled leaderboards - skip upload
          // eslint-disable-next-line no-console
        }
      }

      // Check and notify for Tandem achievements (fire-and-forget)
      try {
        const { checkAndNotifyTandemAchievements } = await import('@/lib/achievementNotifier');
        checkAndNotifyTandemAchievements(localStats).catch((error) => {
          console.error('StatsService: Failed to check achievements:', error);
        });
      } catch (error) {
        console.error('StatsService: Failed to import achievement notifier:', error);
      }

      return localStats;
    } catch (error) {
      console.error('StatsService.updateStats error:', error);
      return await updateGameStats(
        gameResult.completed,
        !(await hasPlayedPuzzle(gameResult.puzzleDate || '')),
        gameResult.isArchive || false,
        gameResult.puzzleDate
      );
    }
  }

  async getLeaderboard(period = 'today') {
    try {
      const response = await fetch(`${API_ENDPOINTS.STATS}/leaderboard?period=${period}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('StatsService.getLeaderboard error:', error);
      throw error;
    }
  }
}

export default new StatsService();
