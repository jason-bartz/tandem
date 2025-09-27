import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

class PlatformService {
  constructor() {
    // Detect if running on native iOS
    this.isNative = Capacitor.isNativePlatform();
    this.isIOS = Capacitor.getPlatform() === 'ios';
    this.isWeb = Capacitor.getPlatform() === 'web';

    // Set API URL based on platform
    this.apiUrl = this.isNative
      ? 'https://www.tandemdaily.com'
      : process.env.NEXT_PUBLIC_API_URL || '';

    // Cache key prefix for offline storage
    this.CACHE_PREFIX = 'tandem_puzzle_';
    this.CACHE_DAYS = 7;
  }

  // Platform detection methods
  isPlatformNative() {
    return this.isNative;
  }

  isPlatformWeb() {
    return this.isWeb;
  }

  // API methods with offline support
  async fetchPuzzle(date) {
    // If no date provided, use today's date in Eastern Time
    const targetDate = date || this.getTodayDateString();

    // Build the full URL
    const url = this.isNative
      ? `https://www.tandemdaily.com/api/puzzle?date=${targetDate}`
      : `/api/puzzle?date=${targetDate}`;

    try {
      let data;

      // Use native HTTP on iOS to bypass CORS
      if (this.isNative && this.isIOS) {
        const response = await CapacitorHttp.get({
          url: `https://www.tandemdaily.com/api/puzzle?date=${targetDate}`,
        });
        data = response.data;
      } else {
        // Use regular fetch for web
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`API Error: ${res.status}`);
        }

        data = await res.json();
      }

      // Cache successful fetch for offline use
      if (this.isNative) {
        await this.cachePuzzle(targetDate, data);
        console.log('Puzzle cached for offline use:', targetDate);
      }

      return data;
    } catch (error) {
      console.error('Error fetching puzzle from API:', error);

      // Try offline fallback on native
      if (this.isNative) {
        const cachedPuzzle = await this.getOfflinePuzzle(targetDate);
        if (cachedPuzzle) {
          console.log('Using cached puzzle for:', targetDate);
          return cachedPuzzle;
        }

        // Last resort: try static puzzles
        try {
          const { getStaticPuzzle } = await import('../data/staticPuzzles');
          console.log('Falling back to static puzzle for:', targetDate);
          return getStaticPuzzle(targetDate);
        } catch (staticError) {
          console.error('Failed to load static puzzle:', staticError);
        }
      }

      throw error;
    }
  }

  async fetchStats() {
    // Try API first
    const url = this.isNative
      ? `https://www.tandemdaily.com/api/stats`
      : `/api/stats`;

    try {
      let stats;

      // Use native HTTP on iOS to bypass CORS
      if (this.isNative && this.isIOS) {
        const response = await CapacitorHttp.get({
          url: `https://www.tandemdaily.com/api/stats`,
        });
        stats = response.data;
      } else {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch stats');
        stats = await res.json();
      }

      // Cache stats locally on native
      if (this.isNative) {
        await Preferences.set({
          key: 'tandem_stats',
          value: JSON.stringify(stats),
        });
      }

      return stats;
    } catch (error) {
      // Try local storage fallback on native
      if (this.isNative) {
        try {
          const { value } = await Preferences.get({ key: 'tandem_stats' });
          if (value) {
            console.log('Using cached stats');
            return JSON.parse(value);
          }
        } catch (cacheError) {
          console.error('Failed to fetch cached stats:', cacheError);
        }
      }

      // Return empty stats on error
      return { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
    }
  }

  async updateStats(stats) {
    // Always save to local storage on native for offline support
    if (this.isNative) {
      try {
        await Preferences.set({
          key: 'tandem_stats',
          value: JSON.stringify(stats),
        });
        console.log('Stats saved locally');
      } catch (error) {
        console.error('Failed to save local stats:', error);
      }
    }

    // Try to sync with API
    const url = this.isNative
      ? `https://www.tandemdaily.com/api/stats`
      : `/api/stats`;

    try {
      // Use native HTTP on iOS to bypass CORS
      if (this.isNative && this.isIOS) {
        const response = await CapacitorHttp.post({
          url: `https://www.tandemdaily.com/api/stats`,
          headers: { 'Content-Type': 'application/json' },
          data: stats,
        });
        return response.data;
      } else {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stats),
        });

        if (!res.ok) throw new Error('Failed to update stats');
        return await res.json();
      }
    } catch (error) {
      // Error updating stats
      throw error;
    }
  }

  // Offline puzzle cache management
  async cachePuzzle(date, puzzleData) {
    if (!this.isNative) return;

    try {
      const key = `${this.CACHE_PREFIX}${date}`;
      await Preferences.set({
        key,
        value: JSON.stringify(puzzleData),
      });

      // Clean up old cached puzzles
      await this.cleanOldCache();
    } catch (error) {
      // Error caching puzzle - non-critical
    }
  }

  async getOfflinePuzzle(date) {
    if (!this.isNative) return null;

    try {
      const key = `${this.CACHE_PREFIX}${date}`;
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      // Error getting offline puzzle
      return null;
    }
  }

  async cacheRecentPuzzles() {
    if (!this.isNative) return;

    try {
      const today = this.getTodayDateString();
      const todayDate = new Date(today + 'T00:00:00');
      const promises = [];

      // Cache last 7 days of puzzles
      for (let i = 0; i < this.CACHE_DAYS; i++) {
        const date = new Date(todayDate);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        promises.push(this.fetchPuzzle(dateStr).catch(() => null));
      }

      await Promise.all(promises);
      // Recent puzzles cached for offline use
    } catch (error) {
      // Error caching recent puzzles - non-critical
    }
  }

  async cleanOldCache() {
    if (!this.isNative) return;

    try {
      const { keys } = await Preferences.keys();
      const today = this.getTodayDateString();
      const todayDate = new Date(today + 'T00:00:00');
      const oldestDate = new Date(todayDate);
      oldestDate.setDate(oldestDate.getDate() - this.CACHE_DAYS);

      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const dateStr = key.replace(this.CACHE_PREFIX, '');
          const keyDate = new Date(dateStr + 'T00:00:00');

          if (keyDate < oldestDate) {
            await Preferences.remove({ key });
          }
        }
      }
    } catch (error) {
      // Error cleaning cache - non-critical
    }
  }

  // Native feature wrappers
  async share(data) {
    try {
      if (this.isNative && Share) {
        // Use Capacitor Share plugin on native
        const result = await Share.share({
          title: data.title || 'Tandem Daily',
          text: data.text,
          url: data.url || 'https://tandemdaily.com',
          dialogTitle: 'Share your results',
        });
        return result;
      } else if (navigator.share) {
        // Use Web Share API on web
        await navigator.share(data);
        return { activityType: 'web' };
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(data.text);
        return { activityType: 'clipboard' };
      }
    } catch (error) {
      // Error sharing - will fallback to clipboard
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(data.text);
        return { activityType: 'clipboard' };
      } catch (clipboardError) {
        throw error;
      }
    }
  }

  async haptic(type = 'medium') {
    if (!this.isNative || !Haptics) return;

    try {
      const impactStyles = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };

      await Haptics.impact({
        style: impactStyles[type] || ImpactStyle.Medium,
      });
    } catch (error) {
      // Haptic feedback not available
    }
  }

  async vibrate() {
    if (!this.isNative || !Haptics) return;

    try {
      await Haptics.vibrate({ duration: 100 });
    } catch (error) {
      // Vibration not available
    }
  }

  // Storage helpers for preferences
  async getPreference(key) {
    if (this.isNative) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch (error) {
        // Error getting preference
        return null;
      }
    } else {
      // Use localStorage for web
      return localStorage.getItem(key);
    }
  }

  async setPreference(key, value) {
    if (this.isNative) {
      try {
        await Preferences.set({ key, value });
      } catch (error) {
        // Error setting preference
      }
    } else {
      // Use localStorage for web
      localStorage.setItem(key, value);
    }
  }

  // Get full API URL for a path
  getApiUrl(path) {
    return `${this.apiUrl}${path}`;
  }

  // Check if device is online
  isOnline() {
    return navigator.onLine;
  }

  // Get today's date in Eastern Time (consistent with puzzle release schedule)
  getTodayDateString() {
    const now = new Date();
    // Convert to Eastern Time
    const etOffset = -5; // EST offset (will need DST handling for production)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const etTime = new Date(utc + (3600000 * etOffset));

    const year = etTime.getFullYear();
    const month = String(etTime.getMonth() + 1).padStart(2, '0');
    const day = String(etTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}

// Export singleton instance
const platformService = new PlatformService();
export default platformService;