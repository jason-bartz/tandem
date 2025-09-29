import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle, NotificationType, HapticsNotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import logger from '@/lib/logger';

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

    // Check if we need to clear yesterday's cache for today's puzzle
    if (!date && this.isNative) {
      await this.clearYesterdayCache();
    }

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
        logger.debug('Puzzle cached for offline use:', targetDate);
      }

      return data;
    } catch (error) {
      logger.error('Error fetching puzzle from API', error);

      // Try offline fallback on native
      if (this.isNative) {
        const cachedPuzzle = await this.getOfflinePuzzle(targetDate);
        if (cachedPuzzle) {
          logger.debug('Using cached puzzle for:', targetDate);
          return cachedPuzzle;
        }

        // Last resort: try static puzzles
        try {
          const { getStaticPuzzle } = await import('../data/staticPuzzles');
          logger.debug('Falling back to static puzzle for:', targetDate);
          return getStaticPuzzle(targetDate);
        } catch (staticError) {
          logger.error('Failed to load static puzzle', staticError);
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
        if (!res.ok) {throw new Error('Failed to fetch stats');}
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
            logger.debug('Using cached stats');
            return JSON.parse(value);
          }
        } catch (cacheError) {
          logger.error('Failed to fetch cached stats', cacheError);
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
        logger.debug('Stats saved locally');
      } catch (error) {
        logger.error('Failed to save local stats', error);
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

        if (!res.ok) {throw new Error('Failed to update stats');}
        return await res.json();
      }
    } catch (error) {
      // Error updating stats
      throw error;
    }
  }

  // Offline puzzle cache management
  async cachePuzzle(date, puzzleData) {
    if (!this.isNative) {return;}

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
    if (!this.isNative) {return null;}

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
    if (!this.isNative) {return;}

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
    if (!this.isNative) {return;}

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

  // Clear yesterday's cache to ensure fresh puzzle load
  async clearYesterdayCache() {
    if (!this.isNative) {return;}

    try {
      const today = this.getTodayDateString();
      const yesterday = new Date(today + 'T00:00:00');
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const todayKey = `${this.CACHE_PREFIX}${today}`;
      const yesterdayKey = `${this.CACHE_PREFIX}${yesterdayStr}`;

      // Check if cached puzzle is for yesterday
      const { value: cachedToday } = await Preferences.get({ key: todayKey });
      if (cachedToday) {
        const cached = JSON.parse(cachedToday);
        // If cached puzzle date doesn't match today, clear it
        if (cached.date !== today) {
          await Preferences.remove({ key: todayKey });
          logger.debug('Cleared stale cache for today');
        }
      }
    } catch (error) {
      // Error clearing cache - non-critical
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
    if (!this.isNative || !Haptics) {return;}

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

  // Enhanced haptic methods for different interaction types
  async hapticImpact(type = 'medium') {
    return this.haptic(type);
  }

  async hapticNotification(type = 'success') {
    if (!this.isNative || !Haptics) {return;}

    try {
      // Use Haptics notification method if available
      if (Haptics.notification) {
        const notificationTypes = {
          success: 'SUCCESS',
          warning: 'WARNING',
          error: 'ERROR',
        };
        await Haptics.notification({ type: notificationTypes[type] || 'SUCCESS' });
      } else {
        // Fallback to impact patterns
        const patterns = {
          success: async () => {
            await this.haptic('medium');
            setTimeout(() => this.haptic('light'), 100);
          },
          warning: async () => {
            await this.haptic('light');
            setTimeout(() => this.haptic('light'), 150);
          },
          error: async () => {
            await this.haptic('heavy');
          },
        };
        await patterns[type]();
      }
    } catch (error) {
      // Haptic notification not available
    }
  }

  async hapticSelection() {
    if (!this.isNative || !Haptics) {return;}

    try {
      // Use selection changed if available
      if (Haptics.selectionChanged) {
        await Haptics.selectionChanged();
      } else {
        // Fallback to light impact
        await this.haptic('light');
      }
    } catch (error) {
      // Haptic selection not available
    }
  }

  async hapticSelectionStart() {
    if (!this.isNative || !Haptics) {return;}

    try {
      if (Haptics.selectionStart) {
        await Haptics.selectionStart();
      } else {
        await this.haptic('light');
      }
    } catch (error) {
      // Haptic selection start not available
    }
  }

  async hapticSelectionChanged() {
    if (!this.isNative || !Haptics) {return;}

    try {
      if (Haptics.selectionChanged) {
        await Haptics.selectionChanged();
      } else {
        await this.haptic('light');
      }
    } catch (error) {
      // Haptic selection changed not available
    }
  }

  async hapticSelectionEnd() {
    if (!this.isNative || !Haptics) {return;}

    try {
      if (Haptics.selectionEnd) {
        await Haptics.selectionEnd();
      }
    } catch (error) {
      // Haptic selection end not available
    }
  }

  async vibrate() {
    if (!this.isNative || !Haptics) {return;}

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

    // Use Intl.DateTimeFormat to get the correct date in Eastern Time
    // This properly handles DST automatically
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;

    return `${year}-${month}-${day}`;
  }
}

// Export singleton instance
const platformService = new PlatformService();
export default platformService;