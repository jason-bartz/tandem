import { API_ENDPOINTS } from '@/lib/constants';
import { getApiUrl } from '@/lib/api-helper';

class AdminService {
  getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async savePuzzle(date, puzzle) {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADMIN_PUZZLES), {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ date, puzzle }),
      });

      if (!response.ok) {
        console.error('Save puzzle failed:', response.status, response.statusText);
        return { success: false, error: `Server error: ${response.status}` };
      }

      const data = await response.json();
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
      const response = await fetch(
        getApiUrl(`${API_ENDPOINTS.ADMIN_PUZZLES}?date=${date}`),
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }
      );

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
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ puzzles }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('AdminService.bulkUploadPuzzles error:', error);
      throw error;
    }
  }
}

export default new AdminService();