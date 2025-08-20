import { API_ENDPOINTS } from '@/lib/constants';

class PuzzleService {
  async getPuzzle(date = null) {
    try {
      const url = date 
        ? `${API_ENDPOINTS.PUZZLE}?date=${date}`
        : API_ENDPOINTS.PUZZLE;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch puzzle: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('PuzzleService.getPuzzle error:', error);
      throw error;
    }
  }

  async submitCompletion(data) {
    try {
      const response = await fetch(API_ENDPOINTS.PUZZLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit completion: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.submitCompletion error:', error);
      throw error;
    }
  }

  async getHint(puzzleId, questionIndex) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PUZZLE}/hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ puzzleId, questionIndex }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get hint: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.getHint error:', error);
      throw error;
    }
  }

  async validateAnswer(puzzleId, questionIndex, answer) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PUZZLE}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          puzzleId, 
          questionIndex, 
          answer: answer.toUpperCase() 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to validate answer: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.validateAnswer error:', error);
      throw error;
    }
  }

  async getUpcomingPuzzles(days = 7) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PUZZLE}/upcoming?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch upcoming puzzles: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.getUpcomingPuzzles error:', error);
      throw error;
    }
  }
}

export default new PuzzleService();