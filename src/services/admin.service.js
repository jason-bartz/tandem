import { API_ENDPOINTS } from '@/lib/constants';
import { getApiUrl } from '@/lib/api-config';
import authService from './auth.service';
import logger from '@/lib/logger';

class AdminService {
  async getAuthHeaders(includeCSRF = false) {
    return authService.getAuthHeaders(includeCSRF);
  }

  async savePuzzle(date, puzzle) {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_PUZZLES), {
        method: 'POST',
        headers: await this.getAuthHeaders(true),
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
          headers: await this.getAuthHeaders(),
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
        headers: await this.getAuthHeaders(true),
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
        headers: await this.getAuthHeaders(true),
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
        headers: await this.getAuthHeaders(true),
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
        ...(options.themeContext && { themeContext: options.themeContext }),
      };

      const headers = await this.getAuthHeaders(true);
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

      const headers = await this.getAuthHeaders(true);
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

      const headers = await this.getAuthHeaders(true);
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

  async getFeedback({ status } = {}) {
    try {
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const url = `/api/admin/feedback${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(getApiUrl(url), {
        headers: await this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Get feedback failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.getFeedback error', error);
      throw error;
    }
  }

  async updateFeedback(feedbackId, updates) {
    try {
      const response = await fetch(getApiUrl('/api/admin/feedback'), {
        method: 'PATCH',
        headers: await this.getAuthHeaders(true),
        body: JSON.stringify({ id: feedbackId, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Update feedback failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.updateFeedback error', error);
      throw error;
    }
  }

  // ==========================================
  // Puzzle Submissions
  // ==========================================

  async getSubmissions({ status } = {}) {
    try {
      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }

      const url = `/api/admin/puzzle-submissions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(getApiUrl(url), {
        headers: await this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Get submissions failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.getSubmissions error', error);
      throw error;
    }
  }

  async updateSubmission(submissionId, updates) {
    try {
      const response = await fetch(getApiUrl('/api/admin/puzzle-submissions'), {
        method: 'PATCH',
        headers: await this.getAuthHeaders(true),
        body: JSON.stringify({ id: submissionId, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Update submission failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.updateSubmission error', error);
      throw error;
    }
  }
  // ==========================================
  // User Management
  // ==========================================

  async getUsers({ search, type, sort, page, perPage } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (type) params.append('type', type);
      if (sort) params.append('sort', sort);
      if (page) params.append('page', String(page));
      if (perPage) params.append('perPage', String(perPage));

      const url = `/api/admin/users${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(getApiUrl(url), {
        headers: await this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.getUsers error', error);
      throw error;
    }
  }

  async getUserDetail(userId) {
    try {
      const response = await fetch(getApiUrl(`/api/admin/users/detail?userId=${userId}`), {
        headers: await this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.getUserDetail error', error);
      throw error;
    }
  }

  async sendPasswordReset(userId) {
    try {
      const response = await fetch(getApiUrl(`/api/admin/users/detail?userId=${userId}`), {
        method: 'POST',
        headers: await this.getAuthHeaders(true),
        body: JSON.stringify({ action: 'send_password_reset' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('AdminService.sendPasswordReset error', error);
      throw error;
    }
  }

  async exportUsersCsv() {
    try {
      const response = await fetch(getApiUrl('/api/admin/users/export'), {
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      logger.error('AdminService.exportUsersCsv error', error);
      throw error;
    }
  }
}

export default new AdminService();
