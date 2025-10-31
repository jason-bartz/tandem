import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching and caching daily horoscopes
 *
 * Mobile web game best practices implemented:
 * - Local storage caching for offline support
 * - Automatic daily rotation at midnight
 * - Memory efficient (only stores current horoscope)
 * - Fast load times with cache-first strategy
 * - Handles timezone changes gracefully
 * - Graceful fallback for iOS native app (static export)
 *
 * @param {string} sign - Zodiac sign (e.g., "Aries")
 * @param {string} timezone - User's timezone
 * @returns {object} { horoscope, loading, error, refresh }
 */
export function useHoroscope(sign, timezone = 'UTC') {
  const [horoscope, setHoroscope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if we're running on iOS native (Capacitor)
  const isIOS =
    typeof window !== 'undefined' &&
    (window.navigator.userAgent.includes('Capacitor') ||
      /iPhone|iPad|iPod/.test(navigator.userAgent));

  // Generate cache key based on sign and current date
  const getCacheKey = useCallback(() => {
    if (!sign || !timezone) return null;

    try {
      const userDate = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const [month, day, year] = userDate.split('/');
      const dateString = `${year}-${month}-${day}`;
      return `horoscope_${sign}_${dateString}`;
    } catch (error) {
      console.error('Error generating cache key:', error);
      return null;
    }
  }, [sign, timezone]);

  // Fetch horoscope from API
  const fetchHoroscope = useCallback(async () => {
    if (!sign) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache first (cache-first strategy for performance)
      const cacheKey = getCacheKey();
      if (cacheKey) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const cachedData = JSON.parse(cached);
            setHoroscope(cachedData);
            setLoading(false);
            // Return early if cache is fresh (< 24 hours old) or if on iOS native
            const cacheTime = cachedData.cachedAt || 0;
            const isCacheFresh = Date.now() - cacheTime < 24 * 60 * 60 * 1000;
            if (isCacheFresh || isIOS) {
              return;
            }
          }
        } catch (cacheError) {
          // Silently fail cache read, continue to fetch
          console.warn('Cache read error:', cacheError);
        }
      }

      // Skip API fetch on iOS native app (static export doesn't support API routes)
      if (isIOS) {
        // Provide a friendly message for iOS users
        const fallbackData = {
          text: 'Your cosmic journey continues! ✨ Visit tandemdaily.com on the web for your personalized daily horoscope.',
          sign,
          date: new Date().toISOString().split('T')[0],
          cachedAt: Date.now(),
          isFallback: true,
        };
        setHoroscope(fallbackData);
        // Cache the fallback for 24 hours
        if (cacheKey) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(fallbackData));
          } catch (e) {
            console.warn('Cache write error:', e);
          }
        }
        setLoading(false);
        return;
      }

      // Fetch from API (web only)
      const response = await fetch(
        `/api/horoscope?sign=${encodeURIComponent(sign)}&timezone=${encodeURIComponent(timezone)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch horoscope');
      }

      const data = await response.json();

      // Add cache timestamp
      const horoscopeData = {
        ...data,
        cachedAt: Date.now(),
      };

      setHoroscope(horoscopeData);

      // Update cache
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(horoscopeData));

          // Clean up old cache entries (keep only last 7 days)
          const allKeys = Object.keys(localStorage);
          const horoscopeKeys = allKeys.filter((key) => key.startsWith('horoscope_'));
          if (horoscopeKeys.length > 7) {
            // Remove oldest entries
            horoscopeKeys
              .sort()
              .slice(0, horoscopeKeys.length - 7)
              .forEach((key) => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  // Silently fail cleanup
                }
              });
          }
        } catch (cacheError) {
          // Silently fail cache write (e.g., quota exceeded)
          console.warn('Cache write error:', cacheError);
        }
      }
    } catch (err) {
      console.error('Error fetching horoscope:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sign, timezone, getCacheKey, isIOS]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchHoroscope();
  }, [fetchHoroscope]);

  // Set up midnight rotation check
  useEffect(() => {
    if (!sign || !timezone) return;

    // Calculate milliseconds until next midnight in user's timezone
    const getMillisecondsUntilMidnight = () => {
      try {
        const now = new Date();
        const userDateStr = now.toLocaleString('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        // Parse user's current time
        const [, timePart] = userDateStr.split(', ');
        const [hour, minute, second] = timePart.split(':');

        // Calculate seconds until midnight
        const secondsToday = parseInt(hour) * 3600 + parseInt(minute) * 60 + parseInt(second);
        const secondsUntilMidnight = 86400 - secondsToday;

        return secondsUntilMidnight * 1000;
      } catch (error) {
        console.error('Error calculating midnight:', error);
        // Default to 1 hour if calculation fails
        return 60 * 60 * 1000;
      }
    };

    // Set timeout to refresh at midnight
    const msUntilMidnight = getMillisecondsUntilMidnight();
    const midnightTimer = setTimeout(() => {
      fetchHoroscope();
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, [sign, timezone, fetchHoroscope]);

  return {
    horoscope,
    loading,
    error,
    refresh: fetchHoroscope,
  };
}
