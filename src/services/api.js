import platformService from './platform';

class APIService {
  constructor() {
    this.baseUrl = platformService.apiUrl;
  }

  // Build URL with base URL for iOS
  buildUrl(path) {
    if (platformService.isPlatformNative()) {
      return `${this.baseUrl}${path}`;
    }
    // For web, use relative URLs
    return path;
  }

  // Generic fetch wrapper with error handling
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

  // Puzzle endpoints
  async getPuzzle(date) {
    // Use platform service for puzzle fetching (includes offline support)
    return platformService.fetchPuzzle(date);
  }

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

  // Stats endpoints
  async getStats() {
    return platformService.fetchStats();
  }

  async updateStats(stats) {
    return platformService.updateStats(stats);
  }

  // Admin endpoints (web only)
  async adminAuth(password) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    return await this.fetchWithErrorHandling('/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async getAdminPuzzles(startDate, endDate) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    return await this.fetchWithErrorHandling(`/api/admin/puzzles?${params}`);
  }

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

  async deleteAdminPuzzle(id) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    return await this.fetchWithErrorHandling(`/api/admin/puzzles?id=${id}`, {
      method: 'DELETE',
    });
  }

  async bulkImportPuzzles(puzzles) {
    if (platformService.isPlatformNative()) {
      throw new Error('Admin features are not available on mobile');
    }

    return await this.fetchWithErrorHandling('/api/admin/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ puzzles }),
    });
  }

  // Version check for iOS app
  async checkVersion() {
    try {
      const response = await this.fetchWithErrorHandling('/api/version');
      return response;
    } catch (error) {
      // Version check failed
      return null;
    }
  }

  // Preload puzzles for offline use (iOS only)
  async preloadPuzzlesForOffline() {
    if (!platformService.isPlatformNative()) return;

    try {
      await platformService.cacheRecentPuzzles();
      // Puzzles preloaded for offline use
    } catch (error) {
      // Failed to preload puzzles
    }
  }
}

// Export singleton instance
const apiService = new APIService();
export default apiService;