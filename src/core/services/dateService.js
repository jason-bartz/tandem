/**
 * DateService - Centralized date and timezone handling service
 *
 * This service provides consistent date operations across the application,
 * ensuring timezone-aware calculations and preventing date-related bugs.
 *
 * @module dateService
 */

const { format, parse, subDays, addDays, isValid } = require('date-fns');
const { toZonedTime, formatInTimeZone } = require('date-fns-tz');

/**
 * DateService class for handling all date operations with timezone awareness
 */
class DateService {
  /**
   * Initialize DateService with a specific timezone
   * @param {string} timezone - IANA timezone identifier (default: 'America/New_York')
   */
  constructor(timezone = 'America/New_York') {
    this.timezone = timezone;
    this.dateFormat = 'yyyy-MM-dd';
  }

  /**
   * Get the current date string in the configured timezone
   * @returns {string} Current date in YYYY-MM-DD format
   */
  getCurrentDateString() {
    try {
      // Use formatInTimeZone to get the correct date string in the timezone
      return formatInTimeZone(new Date(), this.timezone, this.dateFormat);
    } catch (error) {
      console.error('[DateService] Error getting current date string:', error);
      // Fallback to local date if timezone conversion fails
      const localDate = new Date();
      return format(localDate, this.dateFormat);
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
      return format(yesterday, this.dateFormat);
    } catch (error) {
      console.error('[DateService] Error getting yesterday date string:', error);
      // Fallback calculation
      const date = new Date(dateString + 'T12:00:00');
      date.setDate(date.getDate() - 1);
      return format(date, this.dateFormat);
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
      return format(tomorrow, this.dateFormat);
    } catch (error) {
      console.error('[DateService] Error getting tomorrow date string:', error);
      const date = new Date(dateString + 'T12:00:00');
      date.setDate(date.getDate() + 1);
      return format(date, this.dateFormat);
    }
  }

  /**
   * Check if a date string represents today in the configured timezone
   * @param {string} dateString - Date string to check
   * @returns {boolean} True if the date is today
   */
  isToday(dateString) {
    return dateString === this.getCurrentDateString();
  }

  /**
   * Check if a date string represents yesterday in the configured timezone
   * @param {string} dateString - Date string to check
   * @returns {boolean} True if the date is yesterday
   */
  isYesterday(dateString) {
    const today = this.getCurrentDateString();
    const yesterday = this.getYesterdayDateString(today);
    return dateString === yesterday;
  }

  /**
   * Check if a date string is in the future
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
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('[DateService] Error calculating days between:', error);
      return 0;
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
      console.error('[DateService] Error formatting date for display:', error);
      return dateString; // Return original string if formatting fails
    }
  }

  /**
   * Get debug information for date calculations
   * @returns {object} Debug information
   */
  getDebugInfo() {
    const now = new Date();
    const zonedNow = toZonedTime(now, this.timezone);

    return {
      timezone: this.timezone,
      currentUTC: now.toISOString(),
      currentZoned: zonedNow.toISOString(),
      currentDateString: this.getCurrentDateString(),
      yesterdayDateString: this.getYesterdayDateString(this.getCurrentDateString()),
      systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}

// Export singleton instance with ET timezone as default
const dateService = new DateService('America/New_York');

// Also export the class for testing or custom instances
module.exports = dateService;
module.exports.DateService = DateService;