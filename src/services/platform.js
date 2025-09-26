import { Capacitor } from '@capacitor/core';
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
      ? 'https://tandemdaily.com'
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
    const url = `${this.apiUrl}/api/puzzle?date=${date}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const data = await res.json();

      // Cache successful fetch for offline use
      if (this.isNative) {
        await this.cachePuzzle(date, data);
      }

      return data;
    } catch (error) {
      // Error fetching puzzle - will try offline fallback

      // Try offline fallback on native
      if (this.isNative) {
        const cachedPuzzle = await this.getOfflinePuzzle(date);
        if (cachedPuzzle) {
          return cachedPuzzle;
        }
      }

      throw error;
    }
  }

  async fetchStats() {
    const url = `${this.apiUrl}/api/stats`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json();
    } catch (error) {
      // Error fetching stats - return empty stats
      // Return empty stats on error
      return { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
    }
  }

  async updateStats(stats) {
    const url = `${this.apiUrl}/api/stats`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
      });

      if (!res.ok) throw new Error('Failed to update stats');
      return await res.json();
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
      const today = new Date();
      const promises = [];

      // Cache last 7 days of puzzles
      for (let i = 0; i < this.CACHE_DAYS; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
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
      const today = new Date();
      const oldestDate = new Date(today);
      oldestDate.setDate(oldestDate.getDate() - this.CACHE_DAYS);

      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const dateStr = key.replace(this.CACHE_PREFIX, '');
          const keyDate = new Date(dateStr);

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
}

// Export singleton instance
const platformService = new PlatformService();
export default platformService;