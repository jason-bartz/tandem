import platformService from '@/core/platform/platform';

/**
 * API Service
 * Centralized API client for all HTTP requests with platform-aware URL handling
 * and automatic error handling. Supports both web and iOS native platforms.
 */
class APIService {
  constructor() {
    this.baseUrl = platformService.apiUrl;
  }

  /**
   * Build URL with proper base URL for the current platform
   * @param {string} path - API endpoint path (e.g., '/api/puzzles')
   * @returns {string} Full URL for web or iOS
   * @private
   */
  buildUrl(path) {
    if (platformService.isPlatformNative()) {
      return `${this.baseUrl}${path}`;
    }
    // For web, use relative URLs
    return path;
  }

  /**
   * Generic fetch wrapper with error handling and offline fallback
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options (method, headers, body, etc.)
   * @returns {Promise<Object>} Parsed JSON response
   * @throws {Error} If request fails and no offline fallback available
   * @private
   */
  async fetchWithErrorHandling(url, options = {}) {
    try {
      const fullUrl = this.buildUrl(url);

      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // API fetch error

      // For native platform, try offline fallback
      if (platformService.isPlatformNative() && !platformService.isOnline()) {
        // Device is offline, attempting to use cached data
      }

      throw error;
    }
  }

  /**
   * Get a puzzle for a specific date
   * @param {string} [date] - ISO date string (YYYY-MM-DD). Defaults to today.
   * @returns {Promise<Object>} Puzzle object with theme, puzzles array, and metadata
   * @public
   */
  async getPuzzle(date) {
    // Use platform service for puzzle fetching (includes offline support)
    return platformService.fetchPuzzle(date);
  }

  /**
   * Get multiple puzzles in a single request
   * @param {string[]} dates - Array of ISO date strings
   * @returns {Promise<Object>} Object with puzzles keyed by date
   * @public
   */
  async getBatchPuzzles(dates) {
    try {
      return await this.fetchWithErrorHandling('/api/puzzles/batch', {
        method: 'POST',
        body: JSON.stringify({ dates }),
      });
    } catch (error) {
      // Fallback to individual fetches if batch fails
      // Batch fetch failed, falling back to individual fetches
      const puzzles = {};

      for (const date of dates) {
        try {
          const puzzle = await this.getPuzzle(date);
          puzzles[date] = puzzle;
        } catch (err) {
          // Failed to fetch puzzle for this date
        }
      }

      return { puzzles };
    }
  }

  /**
   * Get global game statistics
   * @returns {Promise<Object>} Stats object with played, won, streaks, etc.
   * @public
   */
  async getStats() {
    return platformService.fetchStats();
  }

  /**
   * Update game statistics after puzzle completion
   * @param {Object} stats - Stats update object
   * @param {boolean} stats.completed - Whether puzzle was completed successfully
   * @param {number} stats.mistakes - Number of mistakes made
   * @param {number} stats.solved - Number of puzzles solved
   * @param {number} [stats.hintsUsed] - Number of hints used
   * @returns {Promise<Object>} Updated stats response
   * @public
   */
  async updateStats(stats) {
    return platformService.updateStats(stats);
  }

  /**
   * Authenticate admin user (web only)
   * @param {string} password - Admin password
   * @returns {Promise<Object>} Auth response with JWT token
   * @throws {Error} If called on native platform
   * @public
   */
  async adminAuth(password) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    return await this.fetchWithErrorHandling('/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Get puzzles for admin panel (web only)
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Object[]>} Array of puzzle objects
   * @throws {Error} If called on native platform
   * @public
   */
  async getAdminPuzzles(startDate, endDate) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    const params = new URLSearchParams();
    if (startDate) {
      params.append('start', startDate);
    }
    if (endDate) {
      params.append('end', endDate);
    }

    return await this.fetchWithErrorHandling(`/api/admin/puzzles?${params}`);
  }

  /**
   * Create or update a puzzle (web only)
   * @param {Object} puzzleData - Puzzle data object
   * @param {string} [puzzleData.id] - Puzzle ID (for updates)
   * @param {string} puzzleData.theme - Puzzle theme/category
   * @param {Array} puzzleData.puzzles - Array of emoji-answer pairs
   * @returns {Promise<Object>} Saved puzzle response
   * @throws {Error} If called on native platform
   * @public
   */
  async saveAdminPuzzle(puzzleData) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    const method = puzzleData.id ? 'PUT' : 'POST';

    return await this.fetchWithErrorHandling('/api/admin/puzzles', {
      method,
      body: JSON.stringify(puzzleData),
    });
  }

  /**
   * Delete a puzzle (web only)
   * @param {string} id - Puzzle ID to delete
   * @returns {Promise<Object>} Delete confirmation response
   * @throws {Error} If called on native platform
   * @public
   */
  async deleteAdminPuzzle(id) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    return await this.fetchWithErrorHandling(`/api/admin/puzzles?id=${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Bulk import multiple puzzles (web only)
   * @param {Object[]} puzzles - Array of puzzle objects to import
   * @returns {Promise<Object>} Import results with success/failure counts
   * @throws {Error} If called on native platform
   * @public
   */
  async bulkImportPuzzles(puzzles) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    return await this.fetchWithErrorHandling('/api/admin/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ puzzles }),
    });
  }

  /**
   * Check API version compatibility (primarily for iOS app updates)
   * @returns {Promise<Object|null>} Version info or null if check fails
   * @public
   */
  async checkVersion() {
    try {
      const response = await this.fetchWithErrorHandling('/api/version');
      return response;
    } catch (error) {
      // Version check failed
      return null;
    }
  }

  /**
   * Preload recent puzzles for offline use (iOS only)
   * Caches the last 7 days of puzzles to local storage
   * @returns {Promise<void>}
   * @public
   */
  async preloadPuzzlesForOffline() {
    if (!platformService.isPlatformNative()) {
      return;
    }

    try {
      await platformService.cacheRecentPuzzles();
      // Puzzles preloaded for offline use
    } catch (error) {
      // Failed to preload puzzles
    }
  }
}

/**
 * Singleton instance of APIService
 * Import this to make API calls throughout the application
 * @example
 * import apiService from '@/core/services/api';
 * const puzzle = await apiService.getPuzzle('2025-01-15');
 */
const apiService = new APIService();
export default apiService;
