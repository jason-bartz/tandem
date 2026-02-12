/**
 * Mini Crossword Puzzle Service
 * Handles API communication for The Daily Mini game
 */

import { MINI_API_ENDPOINTS } from '@/lib/constants';
import { getCurrentMiniPuzzleInfo } from '@/lib/miniUtils';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import logger from '@/lib/logger';

class MiniService {
  /**
   * Get today's or a specific date's mini puzzle
   * @param {string} date - Optional ISO date string (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, puzzle?: object, error?: string}>}
   */
  async getPuzzle(date = null) {
    try {
      // If no date provided, use today's date
      let targetDate = date;
      if (!targetDate) {
        const puzzleInfo = getCurrentMiniPuzzleInfo();
        targetDate = puzzleInfo.isoDate;
      }

      const endpoint = date
        ? `${MINI_API_ENDPOINTS.PUZZLE}?date=${targetDate}`
        : MINI_API_ENDPOINTS.PUZZLE;

      // Use getApiUrl to handle iOS absolute URLs
      const url = getApiUrl(endpoint);

      logger.info('[MiniService] Fetching puzzle', { date: targetDate, url });

      const response = await capacitorFetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        false
      ); // Don't include auth - puzzle endpoint is public

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[MiniService] Failed to fetch puzzle', {
          status: response.status,
          error,
        });
        return {
          success: false,
          status: response.status,
          error: error.message || 'Failed to load puzzle',
        };
      }

      const data = await response.json();
      logger.info('[MiniService] Puzzle fetched successfully', {
        date: data.date,
        hasGrid: !!data.grid,
        hasClues: !!data.clues,
      });

      return {
        success: true,
        puzzle: data,
        date: data.date || targetDate,
      };
    } catch (error) {
      logger.error('[MiniService] Error fetching puzzle', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Validate a puzzle solution
   * @param {string} date - ISO date string
   * @param {Array} userGrid - User's grid solution
   * @returns {Promise<{success: boolean, correct?: boolean, error?: string}>}
   */
  async validateSolution(date, userGrid) {
    try {
      const url = getApiUrl(MINI_API_ENDPOINTS.PUZZLE);

      logger.info('[MiniService] Validating solution', { date });

      const response = await capacitorFetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date, grid: userGrid }),
        },
        false
      ); // Don't include auth - validation is public

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[MiniService] Failed to validate solution', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to validate solution',
        };
      }

      const data = await response.json();
      return {
        success: true,
        correct: data.correct,
      };
    } catch (error) {
      logger.error('[MiniService] Error validating solution', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get user's mini stats for a specific puzzle or all puzzles
   * @param {string} date - Optional ISO date string
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getStats(date = null) {
    try {
      const endpoint = date ? `${MINI_API_ENDPOINTS.STATS}?date=${date}` : MINI_API_ENDPOINTS.STATS;
      const url = getApiUrl(endpoint);

      const response = await capacitorFetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        true
      ); // Include auth - stats are per-user

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[MiniService] Failed to fetch stats', {
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
      logger.error('[MiniService] Error fetching stats', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Save user's mini stats for a puzzle
   * @param {object} statsData - Stats to save
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveStats(statsData) {
    try {
      logger.info('[MiniService] Saving stats', {
        date: statsData.puzzle_date,
        completed: statsData.completed,
        timeTaken: statsData.time_taken,
      });

      const url = getApiUrl(MINI_API_ENDPOINTS.STATS);

      const response = await capacitorFetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(statsData),
        },
        true
      ); // Include auth - saving user stats

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[MiniService] Failed to save stats', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to save stats',
        };
      }

      const data = await response.json();
      logger.info('[MiniService] Stats saved successfully');

      return {
        success: true,
        stats: data,
      };
    } catch (error) {
      logger.error('[MiniService] Error saving stats', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get paginated archive of past mini puzzles
   * @param {object} options - Pagination options
   * @returns {Promise<{success: boolean, puzzles?: array, error?: string}>}
   */
  async getArchive({ startDate, endDate, limit = 30 } = {}) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (limit) params.append('limit', limit.toString());

      const endpoint = `${MINI_API_ENDPOINTS.PUZZLE}?${params.toString()}`;
      const url = getApiUrl(endpoint);

      logger.info('[MiniService] Fetching archive', { startDate, endDate, limit });

      const response = await capacitorFetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        false
      ); // Don't include auth - archive is public

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[MiniService] Failed to fetch archive', {
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
      logger.error('[MiniService] Error fetching archive', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get user's aggregate mini stats
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  async getAggregateStats() {
    try {
      const endpoint = `${MINI_API_ENDPOINTS.STATS}/aggregate`;
      const url = getApiUrl(endpoint);

      const response = await capacitorFetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        true
      ); // Include auth - aggregate stats are per-user

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
      logger.error('[MiniService] Error fetching aggregate stats', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  /**
   * Get puzzle progress data for calendar display
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, progress?: object, error?: string}>}
   */
  async getProgressForRange(startDate, endDate) {
    try {
      const endpoint = `${MINI_API_ENDPOINTS.STATS}/progress?startDate=${startDate}&endDate=${endDate}`;
      const url = getApiUrl(endpoint);

      const response = await capacitorFetch(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        true
      ); // Include auth - progress is per-user

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        logger.error('[MiniService] Failed to fetch progress', {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || 'Failed to load progress',
        };
      }

      const data = await response.json();
      return {
        success: true,
        progress: data.progress || {},
      };
    } catch (error) {
      logger.error('[MiniService] Error fetching progress', { error: error.message });
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }
}

// Export singleton instance
const miniService = new MiniService();
export default miniService;
