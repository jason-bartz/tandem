/**
 * LocalDateService - Production-ready local timezone date handling service
 *
 * This service provides consistent date operations using the player's local timezone,
 * implementing Wordle-style puzzle rotation where each player gets a new puzzle
 * at their local midnight. Designed for cross-platform consistency between iOS and web.
 *
 * @module localDateService
 */

const { format, parse, subDays, addDays, isValid, startOfDay } = require('date-fns');

/**
 * LocalDateService class for handling all date operations in user's local timezone
 * Following mobile game development best practices with robust error handling
 */
class LocalDateService {
  constructor() {
    this.dateFormat = 'yyyy-MM-dd';
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache for performance

    // Platform detection for debugging
    this.platform = this.detectPlatform();

    this.debugMode = this.initDebugMode();
  }

  /**
   * Detect current platform for platform-specific handling if needed
   * @private
   * @returns {string} Platform identifier
   */
  detectPlatform() {
    if (typeof window === 'undefined') {
      return 'node';
    }

    // Check for Capacitor/iOS
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const platform = window.Capacitor.getPlatform();
      return platform || 'capacitor';
    }

    // Check for mobile web
    const userAgent = window.navigator?.userAgent || '';
    if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
      return 'mobile-web';
    }

    return 'web';
  }

  /**
   * Initialize debug mode
   * @private
   * @returns {boolean} Debug mode status
   */
  initDebugMode() {
    if (typeof window === 'undefined') {
      return process.env.DEBUG_DATES === 'true';
    }

    try {
      return (
        localStorage.getItem('debug_dates') === 'true' ||
        window.location?.search?.includes('debug_dates=true')
      );
    } catch {
      return false;
    }
  }

  /**
   * Log debug information if debug mode is enabled
   * @private
   * @param {string} _method - Method name
   * @param {object} _data - Data to log
   */
  log(_method, _data) {
    if (this.debugMode) {
    }
  }

  /**
   * Get the current date string in the user's local timezone
   * Uses caching for performance optimization
   * @returns {string} Current date in YYYY-MM-DD format
   */
  getCurrentDateString() {
    try {
      // Check cache first for performance
      const cacheKey = 'currentDate';
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      // Get local date at start of day to avoid time-based issues
      const now = new Date();
      const localDate = startOfDay(now);

      // Format using local timezone values
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      this.log('getCurrentDateString', {
        input: now.toISOString(),
        output: dateString,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      // Validate the date string before returning
      if (!this.isValidDateString(dateString)) {
        throw new Error(`Generated invalid date string: ${dateString}`);
      }

      // Cache the result
      this.setCache(cacheKey, dateString);

      return dateString;
    } catch (error) {
      console.error('[LocalDateService] Error getting current date string:', error);

      // Fallback: use basic Date methods
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      // Send telemetry for production monitoring
      this.reportError('getCurrentDateString', error);

      return `${year}-${month}-${day}`;
    }
  }

  /**
   * Get yesterday's date string based on a given date
   * @param {string} dateString - Date string in YYYY-MM-DD format
   * @returns {string} Yesterday's date in YYYY-MM-DD format
   */
  getYesterdayDateString(dateString) {
    try {
      // Parse the date string at noon to avoid DST issues
      const date = parse(dateString + ' 12:00', 'yyyy-MM-dd HH:mm', new Date());

      if (!isValid(date)) {
        throw new Error(`Invalid date string: ${dateString}`);
      }

      const yesterday = subDays(date, 1);
      const result = format(yesterday, this.dateFormat);

      this.log('getYesterdayDateString', {
        input: dateString,
        output: result,
      });

      return result;
    } catch (error) {
      console.error('[LocalDateService] Error getting yesterday date string:', error);

      // Fallback calculation using native Date
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      date.setDate(date.getDate() - 1);

      const fallbackResult = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      this.reportError('getYesterdayDateString', error);

      return fallbackResult;
    }
  }

  /**
   * Get tomorrow's date string based on a given date
   * @param {string} dateString - Date string in YYYY-MM-DD format
   * @returns {string} Tomorrow's date in YYYY-MM-DD format
   */
  getTomorrowDateString(dateString) {
    try {
      const date = parse(dateString + ' 12:00', 'yyyy-MM-dd HH:mm', new Date());

      if (!isValid(date)) {
        throw new Error(`Invalid date string: ${dateString}`);
      }

      const tomorrow = addDays(date, 1);
      const result = format(tomorrow, this.dateFormat);

      this.log('getTomorrowDateString', {
        input: dateString,
        output: result,
      });

      return result;
    } catch (error) {
      console.error('[LocalDateService] Error getting tomorrow date string:', error);

      // Fallback calculation
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      date.setDate(date.getDate() + 1);

      const fallbackResult = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      this.reportError('getTomorrowDateString', error);

      return fallbackResult;
    }
  }

  /**
   * Check if a date string represents today in the user's local timezone
   * @param {string} dateString - Date string to check
   * @returns {boolean} True if the date is today
   */
  isToday(dateString) {
    return dateString === this.getCurrentDateString();
  }

  /**
   * Check if a date string represents yesterday in the user's local timezone
   * @param {string} dateString - Date string to check
   * @returns {boolean} True if the date is yesterday
   */
  isYesterday(dateString) {
    const today = this.getCurrentDateString();
    const yesterday = this.getYesterdayDateString(today);
    return dateString === yesterday;
  }

  /**
   * Check if a date string is in the future relative to user's local date
   * @param {string} dateString - Date string to check
   * @returns {boolean} True if the date is in the future
   */
  isDateInFuture(dateString) {
    const today = this.getCurrentDateString();
    return dateString > today;
  }

  /**
   * Calculate the number of days between two dates
   * @param {string} startDate - Start date string
   * @param {string} endDate - End date string
   * @returns {number} Number of days between dates
   */
  daysBetween(startDate, endDate) {
    try {
      const start = parse(startDate, this.dateFormat, new Date());
      const end = parse(endDate, this.dateFormat, new Date());

      if (!isValid(start) || !isValid(end)) {
        throw new Error('Invalid date(s) provided');
      }

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      this.log('daysBetween', {
        startDate,
        endDate,
        days,
      });

      return days;
    } catch (error) {
      console.error('[LocalDateService] Error calculating days between:', error);

      // Fallback calculation
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);

      const diffTime = Math.abs(end - start);
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      this.reportError('daysBetween', error);

      return days;
    }
  }

  /**
   * Validate a date string format
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid YYYY-MM-DD format
   */
  isValidDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    try {
      const date = parse(dateString, this.dateFormat, new Date());
      return isValid(date);
    } catch {
      return false;
    }
  }

  /**
   * Get a formatted date string for display
   * @param {string} dateString - Date string in YYYY-MM-DD format
   * @param {string} displayFormat - Format string for display
   * @returns {string} Formatted date string
   */
  formatForDisplay(dateString, displayFormat = 'EEEE, MMMM d, yyyy') {
    try {
      const date = parse(dateString, this.dateFormat, new Date());

      if (!isValid(date)) {
        throw new Error(`Invalid date string: ${dateString}`);
      }

      return format(date, displayFormat);
    } catch (error) {
      console.error('[LocalDateService] Error formatting date for display:', error);

      // Fallback: return a basic formatted string
      const [year, month, day] = dateString.split('-');
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthName = monthNames[parseInt(month) - 1] || month;

      this.reportError('formatForDisplay', error);

      return `${monthName} ${parseInt(day)}, ${year}`;
    }
  }

  /**
   * Cache management - Get cached value
   * @private
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Cache management - Set cached value
   * @private
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    // Prevent memory leaks by limiting cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear all cached values
   * Useful when timezone changes or for testing
   */
  clearCache() {
    this.cache.clear();
    this.log('clearCache', { cleared: true });
  }

  /**
   * Report errors for production monitoring
   * @private
   * @param {string} method - Method where error occurred
   * @param {Error} error - Error object
   */
  reportError(method, error) {
    // In production, this would send to error tracking service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `LocalDateService.${method}: ${error.message}`,
        fatal: false,
      });
    }

    // Log for development
    if (this.debugMode) {
      console.error(`[LocalDateService.${method}] Error reported:`, error);
    }
  }

  /**
   * Get debug information for date calculations
   * Useful for troubleshooting timezone issues
   * @returns {object} Debug information
   */
  getDebugInfo() {
    const now = new Date();

    return {
      platform: this.platform,
      currentLocal: now.toString(),
      currentUTC: now.toISOString(),
      currentDateString: this.getCurrentDateString(),
      yesterdayDateString: this.getYesterdayDateString(this.getCurrentDateString()),
      tomorrowDateString: this.getTomorrowDateString(this.getCurrentDateString()),
      systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: now.getTimezoneOffset(),
      locale: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      cacheSize: this.cache.size,
      debugMode: this.debugMode,
    };
  }

  /**
   * Detect if the user's timezone has changed
   * Useful for handling timezone changes during app usage
   * @param {string} previousTimezone - Previous timezone identifier
   * @returns {boolean} True if timezone has changed
   */
  hasTimezoneChanged(previousTimezone) {
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return previousTimezone !== currentTimezone;
  }

  /**
   * Get a storage-safe key for today's date
   * Used for localStorage keys and similar purposes
   * @returns {string} Storage key in format tandem_YYYY_M_D
   */
  getTodayStorageKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // No padding for backward compatibility
    const day = now.getDate(); // No padding for backward compatibility

    const key = `tandem_${year}_${month}_${day}`;

    this.log('getTodayStorageKey', {
      date: this.getCurrentDateString(),
      key,
    });

    return key;
  }
}

// Export singleton instance for consistent usage across the app
const localDateService = new LocalDateService();

// Also export the class for testing or custom instances
module.exports = localDateService;
module.exports.LocalDateService = LocalDateService;
