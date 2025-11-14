import { API_ENDPOINTS } from '@/core/config/constants';
import { getApiUrl } from '@/lib/api-helper';
import authService from './auth.service';
import logger from '@/utils/helpers/logger';

class AdminService {
  getAuthHeaders(includeCSRF = false) {
    return authService.getAuthHeaders(includeCSRF);
  }

  async savePuzzle(date, puzzle) {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_PUZZLES), {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ date, puzzle }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Save puzzle failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        return { success: false, error: data.error || `Server error: ${response.status}` };
      }

      return data;
    } catch (error) {
      logger.error('AdminService.savePuzzle error', error);
      return { success: false, error: error.message };
    }
  }

  async getPuzzlesRange(startDate, endDate) {
    try {
      const response = await fetch(
        getApiUrl(`${API_ENDPOINTS.ADMIN_PUZZLES}?start=${startDate}&end=${endDate}`),
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('AdminService.getPuzzlesRange error', error);
      throw error;
    }
  }

  async deletePuzzle(date) {
    try {
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.ADMIN_PUZZLES}?date=${date}`), {
        method: 'DELETE',
        headers: this.getAuthHeaders(true),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('AdminService.deletePuzzle error', error);
      throw error;
    }
  }

  async bulkUploadPuzzles(puzzles) {
    try {
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.ADMIN_PUZZLES}/bulk`), {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ puzzles }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('AdminService.bulkUploadPuzzles error', error);
      throw error;
    }
  }

  async bulkImportPuzzles(puzzles, startDate = null, overwrite = false) {
    try {
      const response = await fetch(getApiUrl('/api/admin/bulk-import'), {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ puzzles, startDate, overwrite }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Bulk import failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        return { success: false, error: data.error || `Server error: ${response.status}` };
      }

      return data;
    } catch (error) {
      logger.error('AdminService.bulkImportPuzzles error', error);
      return { success: false, error: error.message };
    }
  }

  async generatePuzzle(date, options = {}) {
    try {
      const requestBody = {
        date,
        excludeThemes: options.excludeThemes || [],
        includePastDays: options.includePastDays || 180,
        includeFutureDays: options.includeFutureDays || 14,
        ...(options.themeHint && { themeHint: options.themeHint }),
      };

      const headers = this.getAuthHeaders(true);
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_GENERATE_PUZZLE), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Generate puzzle failed', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
        });
        return {
          success: false,
          error: data.error || `Server error: ${response.status}`,
          status: response.status,
        };
      }

      return data;
    } catch (error) {
      logger.error('AdminService.generatePuzzle error', error);
      return { success: false, error: error.message };
    }
  }

  async generateHints(date, options = {}) {
    try {
      const requestBody = {
        date,
        theme: options.theme,
        puzzles: options.puzzles,
      };

      const headers = this.getAuthHeaders(true);
      const response = await fetch(getApiUrl('/api/admin/generate-hints'), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Generate hints failed', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
        });
        return {
          success: false,
          error: data.error || `Server error: ${response.status}`,
          status: response.status,
        };
      }

      return data;
    } catch (error) {
      logger.error('AdminService.generateHints error', error);
      return { success: false, error: error.message };
    }
  }

  async assessDifficulty(puzzle) {
    try {
      const requestBody = {
        theme: puzzle.theme,
        puzzles: puzzle.puzzles,
      };

      const headers = this.getAuthHeaders(true);
      const response = await fetch(getApiUrl('/api/admin/assess-difficulty'), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Assess difficulty failed', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
        });
        return {
          success: false,
          error: data.error || `Server error: ${response.status}`,
          status: response.status,
        };
      }

      return data;
    } catch (error) {
      logger.error('AdminService.assessDifficulty error', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AdminService();
