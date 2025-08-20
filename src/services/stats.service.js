import { API_ENDPOINTS } from '@/lib/constants';
import { updateGameStats, saveTodayResult } from '@/lib/storage';

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
      const localStats = updateGameStats(gameResult.completed);
      
      saveTodayResult({
        completed: gameResult.completed,
        mistakes: gameResult.mistakes,
        solved: gameResult.solved,
        time: gameResult.time
      });
      
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
      
      return localStats;
    } catch (error) {
      console.error('StatsService.updateStats error:', error);
      return updateGameStats(gameResult.completed);
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