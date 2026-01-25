/**
 * Element Soup Game Constants
 * Centralized configuration for the Element Soup game
 */

// Game configuration
export const SOUP_CONFIG = {
  GAME_ROUTE: '/element-soup',
  TIMER_INTERVAL_MS: 1000,
  COMBINE_ANIMATION_MS: 600,
  REVEAL_ANIMATION_MS: 400,
  NEW_ELEMENT_ANIMATION_MS: 500,
  FIRST_DISCOVERY_CELEBRATION_MS: 2000,
  CONFETTI_DURATION_MS: 3000,
  ELEMENT_BANK_MAX_HEIGHT: 300, // px, for scrollable area
  ELEMENT_BANK_COLUMNS: 4, // columns in mobile view
  ELEMENT_BANK_COLUMNS_TABLET: 6, // columns in tablet view
  ELEMENT_BANK_COLUMNS_DESKTOP: 8, // columns in desktop view
  // Access control:
  // - Daily puzzle: Free for all account holders
  // - Archive: Last 4 days free, older requires Tandem Unlimited subscription
  FREE_ARCHIVE_DAYS: 4,
};

// Starter elements (same every day)
export const STARTER_ELEMENTS = [
  { id: 'earth', name: 'Earth', emoji: '🌍', isStarter: true },
  { id: 'water', name: 'Water', emoji: '💧', isStarter: true },
  { id: 'fire', name: 'Fire', emoji: '🔥', isStarter: true },
  { id: 'wind', name: 'Wind', emoji: '💨', isStarter: true },
];

// Game states
export const SOUP_GAME_STATES = {
  WELCOME: 'welcome',
  PLAYING: 'playing',
  COMPLETE: 'complete',
  ADMIRE: 'admire',
  ERROR: 'error',
};

// Sort options for element bank
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  ALPHABETICAL: 'alpha',
};

// LocalStorage keys
export const SOUP_STORAGE_KEYS = {
  CURRENT_GAME: 'soup_current_game',
  STATS: 'soup_stats',
  COMPLETED_PUZZLES: 'soup_completed',
  PUZZLE_PROGRESS: 'soup_puzzle_progress_',
  STREAK: 'soup_streak',
  LAST_PLAYED_DATE: 'soup_last_played_date',
  ELEMENT_BANK: 'soup_element_bank_',
  COMBINATIONS_TRIED: 'soup_combinations_tried_',
};

// API endpoints
export const SOUP_API = {
  PUZZLE: '/api/element-soup/puzzle',
  COMBINE: '/api/element-soup/combine',
  COMPLETE: '/api/element-soup/complete',
  STATS: '/api/element-soup/stats',
  DISCOVERIES: '/api/element-soup/discoveries',
  LEADERBOARD_DAILY: '/api/leaderboard/daily',
  ADMIN_PUZZLES: '/api/admin/element-soup/puzzles',
  ADMIN_SANDBOX: '/api/admin/element-soup/sandbox',
};

// Game type identifier for leaderboard
export const SOUP_GAME_TYPE = 'soup';

// Theme colors (Green theme)
export const SOUP_COLORS = {
  primary: '#22c55e', // soup-green-500
  primaryLight: '#f0fdf4', // soup-green-50
  primaryDark: '#14532d', // soup-green-900
  surface: '#ffffff',
  surfaceDark: '#1f2937', // gray-800
  border: '#000000',
  borderDark: '#4b5563', // gray-600
};

// Congratulatory messages for completing puzzle
export const CONGRATS_MESSAGES = [
  'Elemental Mastery!',
  'Alchemist Supreme!',
  'Perfect Concoction!',
  'Masterful Mixing!',
  'Element Genius!',
  'Soup-erb Work!',
  'Crafting Complete!',
  'Discovery Champion!',
  'Element Wizard!',
  'Cauldron King!',
];

// Messages for first discoveries
export const FIRST_DISCOVERY_MESSAGES = [
  'First Discovery!',
  'You Found Something New!',
  'Pioneering Discovery!',
  'Never Seen Before!',
  'World First!',
];

// Par comparison messages
export const PAR_MESSAGES = {
  UNDER: ['Under par!', 'Efficient mixing!', 'Speed alchemist!', 'Quick thinking!'],
  AT: ['Right on par!', 'Precisely done!', 'Perfectly calculated!'],
  OVER: ['Got there!', 'Mission complete!', 'Target acquired!'],
};

// Confetti colors for celebration (alchemical theme)
export const CONFETTI_COLORS = [
  '#22c55e', // Green
  '#fbbf24', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#ffffff', // White
];

// Animation keyframes for combination
export const COMBINATION_ANIMATION = {
  approach: {
    duration: 300,
    easing: 'easeInQuad',
  },
  collision: {
    duration: 200,
    keyframes: [
      { transform: 'rotate(-5deg) scale(1.1)' },
      { transform: 'rotate(5deg) scale(1.1)' },
      { transform: 'rotate(-3deg) scale(1.05)' },
      { transform: 'rotate(0deg) scale(1)' },
    ],
  },
  burst: {
    duration: 150,
    scale: 1.5,
  },
  reveal: {
    duration: 400,
    easing: 'easeOutBack',
    scale: [0, 1.2, 1],
  },
  addToBank: {
    duration: 500,
    easing: 'easeInOutQuad',
  },
};

// Cache configuration (for reference, actual values in API)
export const CACHE_CONFIG = {
  COMBINATION_TTL_SECONDS: 604800, // 7 days
  PUZZLE_TTL_SECONDS: 86400, // Until midnight (actual calc in API)
  DISCOVERY_LOCK_TTL_SECONDS: 60, // 1 minute for race condition prevention
};

/**
 * Normalize a combination key for consistent lookups
 * @param {string} a - First element name
 * @param {string} b - Second element name
 * @returns {string} Normalized key (alphabetically sorted, lowercase, pipe-separated)
 */
export function normalizeKey(a, b) {
  const lower = [a.toLowerCase().trim(), b.toLowerCase().trim()].sort();
  return `${lower[0]}|${lower[1]}`;
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get par comparison text
 * @param {number} moves - Number of moves taken
 * @param {number} par - Par value for the puzzle
 * @returns {string} Comparison text (e.g., "-2", "0", "+4")
 */
export function getParComparison(moves, par) {
  const diff = moves - par;
  if (diff === 0) return '0';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * Get a random message from an array
 * @param {string[]} messages - Array of messages
 * @returns {string} Random message
 */
export function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate share text for completed puzzle
 * @param {Object} params - Share parameters
 * @param {string} params.date - Puzzle date (YYYY-MM-DD)
 * @param {number} params.time - Time in seconds
 * @param {number} params.moves - Number of moves
 * @param {number} params.par - Par value
 * @param {number} params.firstDiscoveries - Number of first discoveries
 * @returns {string} Share text
 */
export function generateShareText({ date, time, moves, par, firstDiscoveries = 0 }) {
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${String(dateObj.getFullYear()).slice(-2)}`;

  let text = `Element Soup ${formattedDate}\n`;
  text += `⏱️ ${formatTime(time)}\n`;
  text += `🧮 ${moves} moves (Par: ${par})\n`;

  if (firstDiscoveries > 0) {
    text += `🏆 First discoveries: ${firstDiscoveries}\n`;
  }

  text += `\ntandemdaily.com/element-soup`;

  return text;
}
