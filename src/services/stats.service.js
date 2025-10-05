import { API_ENDPOINTS } from '@/lib/constants';
import { updateGameStats, saveTodayResult, hasPlayedPuzzle } from '@/lib/storage';

class StatsService {
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

      // Update local stats with proper parameters
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
          time: gameResult.time,
          won: gameResult.completed,
        });
      }

      // Update server stats only for daily puzzles
      if (!gameResult.isArchive) {
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
