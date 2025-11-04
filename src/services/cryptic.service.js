/**
 * Cryptic Puzzle Service
 * Handles API communication for The Daily Cryptic game
 */

import { CRYPTIC_API_ENDPOINTS } from '@/lib/constants';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import logger from '@/lib/logger';

class CrypticService {
  /**
   * Get today's or a specific date's cryptic puzzle
   * @param {string} date - Optional ISO date string (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, puzzle?: object, error?: string}>}
   */
  async getPuzzle(date = null) {
    try {
      // If no date provided, use today's date in Eastern Time
      let targetDate = date;
      if (!targetDate) {
        const puzzleInfo = getCurrentPuzzleInfo();
        targetDate = puzzleInfo.isoDate;
      }

      const url = date
        ? `${CRYPTIC_API_ENDPOINTS.PUZZLE}?date=${targetDate}`
        : CRYPTIC_API_ENDPOINTS.PUZZLE;

      logger.info('[CrypticService] Fetching puzzle', { date: targetDate });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[CrypticService] Failed to fetch puzzle', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to load puzzle',
        };
      }

      const data = await response.json();
      logger.info('[CrypticService] Puzzle fetched successfully', {
        date: data.date,
        hasHints: !!data.hints,
      });

      return {
        success: true,
        puzzle: data,
        date: data.date || targetDate,
      };
    } catch (error) {
      logger.error('[CrypticService] Error fetching puzzle', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get user's cryptic stats for a specific puzzle or all puzzles
   * @param {string} date - Optional ISO date string
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getStats(date = null) {
    try {
      const url = date ? `${CRYPTIC_API_ENDPOINTS.STATS}?date=${date}` : CRYPTIC_API_ENDPOINTS.STATS;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[CrypticService] Failed to fetch stats', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to load stats',
        };
      }

      const data = await response.json();
      return {
        success: true,
        stats: data,
      };
    } catch (error) {
      logger.error('[CrypticService] Error fetching stats', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Save user's cryptic stats for a puzzle
   * @param {object} statsData - Stats to save
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveStats(statsData) {
    try {
      logger.info('[CrypticService] Saving stats', {
        date: statsData.puzzle_date,
        completed: statsData.completed,
        hintsUsed: statsData.hints_used,
      });

      const response = await fetch(CRYPTIC_API_ENDPOINTS.STATS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statsData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[CrypticService] Failed to save stats', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to save stats',
        };
      }

      const data = await response.json();
      logger.info('[CrypticService] Stats saved successfully');

      return {
        success: true,
        stats: data,
      };
    } catch (error) {
      logger.error('[CrypticService] Error saving stats', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get paginated archive of past cryptic puzzles
   * @param {object} options - Pagination options
   * @returns {Promise<{success: boolean, puzzles?: array, error?: string}>}
   */
  async getArchive({ startDate, endDate, limit = 30 } = {}) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (limit) params.append('limit', limit.toString());

      const url = `${CRYPTIC_API_ENDPOINTS.PUZZLE}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[CrypticService] Failed to fetch archive', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to load archive',
        };
      }

      const data = await response.json();
      return {
        success: true,
        puzzles: data.puzzles || [],
        total: data.total,
      };
    } catch (error) {
      logger.error('[CrypticService] Error fetching archive', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get user's aggregate cryptic stats
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getAggregateStats() {
    try {
      const response = await fetch(`${CRYPTIC_API_ENDPOINTS.STATS}/aggregate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.message || 'Failed to load aggregate stats',
        };
      }

      const data = await response.json();
      return {
        success: true,
        stats: data,
      };
    } catch (error) {
      logger.error('[CrypticService] Error fetching aggregate stats', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }
}

// Export singleton instance
const crypticService = new CrypticService();
export default crypticService;
