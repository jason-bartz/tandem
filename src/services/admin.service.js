import { API_ENDPOINTS } from '@/lib/constants';

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
      const response = await fetch(API_ENDPOINTS.ADMIN_PUZZLES, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ date, puzzle }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('AdminService.savePuzzle error:', error);
      throw error;
    }
  }

  async getPuzzlesRange(startDate, endDate) {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.ADMIN_PUZZLES}?start=${startDate}&end=${endDate}`,
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
        `${API_ENDPOINTS.ADMIN_PUZZLES}?date=${date}`,
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
      const response = await fetch(`${API_ENDPOINTS.ADMIN_PUZZLES}/bulk`, {
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