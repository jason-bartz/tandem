/**
 * Puzzle number utilities following Wordle's user-timezone approach
 * Ensures consistent puzzle experience across all platforms and timezones
 *
 * @module puzzleNumber
 */

// Launch date in UTC for consistency across all environments
// First puzzle was released on August 15, 2025
export const LAUNCH_DATE = new Date('2025-08-15T00:00:00Z');

/**
 * Get current puzzle number based on user's LOCAL timezone
 * This gives users a midnight-to-midnight puzzle window in their timezone
 * Following Wordle's approach for better UX
 *
 * @returns {number} Current puzzle number (1, 2, 3...)
 * @example
 * // User in PST on Aug 16, 2025 at 11:00 PM PST
 * getCurrentPuzzleNumber() // Returns 2
 *
 * // User in JST on Aug 17, 2025 at 1:00 AM JST
 * getCurrentPuzzleNumber() // Returns 3
 */
export function getCurrentPuzzleNumber() {
  // Get today's date at midnight in USER'S timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Convert to UTC for consistent calculation
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const launchUTC = LAUNCH_DATE.getTime();
  const diffMs = todayUTC - launchUTC;
  const puzzleNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  // Never return puzzle number less than 1
  return Math.max(1, puzzleNumber);
}

/**
 * Get the date string for a given puzzle number
 * Useful for converting between puzzle numbers and dates
 *
 * @param {number} num - Puzzle number (1-based)
 * @returns {string} Date in YYYY-MM-DD format
 * @example
 * getDateForPuzzleNumber(1) // Returns "2025-08-15"
 * getDateForPuzzleNumber(10) // Returns "2025-08-24"
 */
export function getDateForPuzzleNumber(num) {
  if (typeof num !== 'number' || num < 1) {
    throw new Error(`Invalid puzzle number: ${num}. Must be a positive integer.`);
  }

  const date = new Date(LAUNCH_DATE);
  date.setUTCDate(date.getUTCDate() + (num - 1));
  return date.toISOString().split('T')[0];
}

/**
 * Get puzzle number for a specific date
 * Useful for converting dates to puzzle numbers
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number} Puzzle number
 * @example
 * getPuzzleNumberForDate("2025-08-15") // Returns 1
 * getPuzzleNumberForDate("2025-08-24") // Returns 10
 */
export function getPuzzleNumberForDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const targetDate = new Date(dateStr + 'T00:00:00Z');

  // Validate date is not before launch
  if (targetDate < LAUNCH_DATE) {
    throw new Error(
      `Date ${dateStr} is before launch date ${LAUNCH_DATE.toISOString().split('T')[0]}`
    );
  }

  const diffMs = targetDate - LAUNCH_DATE;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get display date in user's locale
 * Formats the date nicely for UI display
 *
 * @param {number} puzzleNumber - Puzzle number
 * @param {string} [locale='en-US'] - Locale for formatting
 * @returns {string} Formatted date string
 * @example
 * getDisplayDate(1) // Returns "Aug 15, 2025"
 * getDisplayDate(10, 'en-GB') // Returns "24 Aug 2025"
 */
export function getDisplayDate(puzzleNumber, locale = 'en-US') {
  const dateStr = getDateForPuzzleNumber(puzzleNumber);
  const date = new Date(dateStr + 'T00:00:00');

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Check if a puzzle number is available yet
 * Used to prevent access to future puzzles
 *
 * @param {number} puzzleNumber - Puzzle number to check
 * @returns {boolean} True if puzzle is available
 * @example
 * // If today is Aug 19, 2025
 * isPuzzleAvailable(5) // Returns true
 * isPuzzleAvailable(6) // Returns false
 */
export function isPuzzleAvailable(puzzleNumber) {
  return puzzleNumber <= getCurrentPuzzleNumber();
}

/**
 * Get the total number of puzzles available
 * Useful for pagination and stats
 *
 * @returns {number} Total available puzzles
 * @example
 * getTotalPuzzles() // Returns current puzzle number
 */
export function getTotalPuzzles() {
  return getCurrentPuzzleNumber();
}

/**
 * Get the puzzle number range for a specific month
 * Optimized for calendar views - only fetches puzzles for the displayed month
 * Scales indefinitely regardless of total puzzle count
 *
 * @param {number} month - Month (0-11, where 0 = January)
 * @param {number} year - Year (e.g., 2025)
 * @returns {Object|null} Object with startPuzzle, endPuzzle, and count, or null if month is entirely before launch
 * @example
 * getPuzzleRangeForMonth(7, 2025) // August 2025
 * // Returns { startPuzzle: 1, endPuzzle: 17, count: 17 }
 *
 * getPuzzleRangeForMonth(9, 2025) // October 2025
 * // Returns { startPuzzle: 48, endPuzzle: 78, count: 31 }
 *
 * getPuzzleRangeForMonth(6, 2025) // July 2025 (before launch)
 * // Returns null
 */
export function getPuzzleRangeForMonth(month, year) {
  // Get first and last day of month in local timezone
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // 0 = last day of previous month

  // Format dates as YYYY-MM-DD
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const firstDateStr = formatDate(firstDay);
  const lastDateStr = formatDate(lastDay);

  // Check if entire month is before launch
  const lastDayUTC = new Date(lastDateStr + 'T00:00:00Z');
  if (lastDayUTC < LAUNCH_DATE) {
    return null; // Month is entirely before game launch
  }

  // Calculate puzzle numbers
  let startPuzzle;
  let endPuzzle;

  // Handle months that start before launch (e.g., August 2025)
  const firstDayUTC = new Date(firstDateStr + 'T00:00:00Z');
  if (firstDayUTC < LAUNCH_DATE) {
    startPuzzle = 1; // Start from first puzzle
  } else {
    startPuzzle = getPuzzleNumberForDate(firstDateStr);
  }

  // Calculate end puzzle
  endPuzzle = getPuzzleNumberForDate(lastDateStr);

  // Cap at current puzzle number (don't include future puzzles)
  const currentPuzzle = getCurrentPuzzleNumber();
  endPuzzle = Math.min(endPuzzle, currentPuzzle);

  // Validate range
  if (endPuzzle < startPuzzle) {
    return null; // Month is entirely in the future
  }

  return {
    startPuzzle,
    endPuzzle,
    count: endPuzzle - startPuzzle + 1,
  };
}
