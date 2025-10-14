import { API_ENDPOINTS } from '@/lib/constants';
import { getApiUrl } from '@/lib/api-helper';
import authService from './auth.service';

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
        console.error('Save puzzle failed:', response.status, response.statusText, data);
        return { success: false, error: data.error || `Server error: ${response.status}` };
      }

      return data;
    } catch (error) {
      console.error('AdminService.savePuzzle error:', error);
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
      console.error('AdminService.getPuzzlesRange error:', error);
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
      console.error('AdminService.deletePuzzle error:', error);
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
      console.error('AdminService.bulkUploadPuzzles error:', error);
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
        console.error('Bulk import failed:', response.status, response.statusText, data);
        return { success: false, error: data.error || `Server error: ${response.status}` };
      }

      return data;
    } catch (error) {
      console.error('AdminService.bulkImportPuzzles error:', error);
      return { success: false, error: error.message };
    }
  }

  async generatePuzzle(date, options = {}) {
    try {
      console.log('[AdminService] generatePuzzle called with:', { date, options });

      const headers = this.getAuthHeaders(true);
      console.log('[AdminService] Request headers:', {
        hasAuth: !!headers['Authorization'],
        hasCSRF: !!headers['x-csrf-token'],
        contentType: headers['Content-Type']
      });

      const requestBody = {
        date,
        excludeThemes: options.excludeThemes || [],
        includePastDays: options.includePastDays || 30,
      };
      console.log('[AdminService] Request body:', requestBody);

      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_GENERATE_PUZZLE), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log('[AdminService] Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('[AdminService] Response data:', data);

      if (!response.ok) {
        console.error('[AdminService] Generate puzzle failed:', {
          status: response.status,
          statusText: response.statusText,
          data,
          headers: Object.fromEntries(response.headers.entries())
        });
        return { success: false, error: data.error || `Server error: ${response.status}`, status: response.status };
      }

      return data;
    } catch (error) {
      console.error('[AdminService] generatePuzzle error:', {
        message: error.message,
        stack: error.stack,
        error
      });
      return { success: false, error: error.message };
    }
  }
}

export default new AdminService();
