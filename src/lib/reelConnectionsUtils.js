/**
 * Reel Connections puzzle number utilities
 * Following the same approach as Daily Tandem and Mini
 *
 * @module reelConnectionsUtils
 */

// Reel Connections launch date - December 2, 2025
export const REEL_CONNECTIONS_LAUNCH_DATE = new Date('2025-12-02T00:00:00Z');

/**
 * Get current Reel Connections puzzle number based on user's LOCAL timezone
 *
 * @returns {number} Current puzzle number (1, 2, 3...)
 */
export function getCurrentReelPuzzleNumber() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const launchUTC = REEL_CONNECTIONS_LAUNCH_DATE.getTime();
  const diffMs = todayUTC - launchUTC;
  const puzzleNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(1, puzzleNumber);
}

/**
 * Get puzzle number for a specific date
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number} Puzzle number
 */
export function getReelPuzzleNumberForDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const targetDate = new Date(dateStr + 'T00:00:00Z');

  if (targetDate < REEL_CONNECTIONS_LAUNCH_DATE) {
    return 1; // Return 1 for dates before launch
  }

  const diffMs = targetDate - REEL_CONNECTIONS_LAUNCH_DATE;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get the date string for a given puzzle number
 *
 * @param {number} num - Puzzle number (1-based)
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getDateForReelPuzzleNumber(num) {
  if (typeof num !== 'number' || num < 1) {
    throw new Error(`Invalid puzzle number: ${num}. Must be a positive integer.`);
  }

  const date = new Date(REEL_CONNECTIONS_LAUNCH_DATE);
  date.setUTCDate(date.getUTCDate() + (num - 1));
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 *
 * @returns {string} Today's date
 */
export function getLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
