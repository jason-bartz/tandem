/**
 * Daily Alchemy Game Constants
 * Centralized configuration for the Daily Alchemy game
 */
import { isStandaloneAlchemy } from '@/lib/standalone';

// Game configuration
export const SOUP_CONFIG = {
  GAME_ROUTE: '/daily-alchemy',
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
  // - Archive: Last 4 days free, older requires Tandem Puzzle Club membership
  FREE_ARCHIVE_DAYS: 4,
  // Time limit for daily puzzle mode (10 minutes in seconds)
  // Free play mode has no time limit
  TIME_LIMIT_SECONDS: 600,
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
  GAME_OVER: 'game_over', // Time ran out
  ADMIRE: 'admire',
  ERROR: 'error',
  COOP_LOBBY: 'coop_lobby', // Co-op mode: waiting for partner or entering invite code
};

// Sort options for element bank
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  ALPHABETICAL: 'alpha',
  FIRST_DISCOVERIES: 'first_discoveries',
  MOST_USED: 'most_used',
};

/**
 * Emoji category order based on iOS emoji keyboard
 * Categories are numbered to define sort order
 */
const EMOJI_CATEGORIES = {
  SMILEYS: 0, // Faces, emotions
  PEOPLE: 1, // People, body parts, gestures
  ANIMALS: 2, // Animals, nature
  FOOD: 3, // Food, drink
  ACTIVITIES: 4, // Sports, games, arts
  TRAVEL: 5, // Travel, places, vehicles
  OBJECTS: 6, // Objects, tools, electronics
  SYMBOLS: 7, // Symbols, hearts, shapes
  FLAGS: 8, // Flags
  OTHER: 9, // Anything else
};

/**
 * Get the emoji category for sorting based on iOS keyboard order
 * Uses Unicode code points to categorize emojis
 * @param {string} emoji - The emoji character(s)
 * @returns {number} Category number for sorting
 */
export function getEmojiCategory(emoji) {
  if (!emoji || emoji.length === 0) return EMOJI_CATEGORIES.OTHER;

  // Get the first code point (handles multi-codepoint emojis)
  const codePoint = emoji.codePointAt(0);

  // Flags (regional indicators)
  if (codePoint >= 0x1f1e0 && codePoint <= 0x1f1ff) return EMOJI_CATEGORIES.FLAGS;

  // Smileys and Emotion (faces)
  if (codePoint >= 0x1f600 && codePoint <= 0x1f64f) return EMOJI_CATEGORIES.SMILEYS;
  if (codePoint >= 0x1f910 && codePoint <= 0x1f92f) return EMOJI_CATEGORIES.SMILEYS; // More faces
  if (codePoint >= 0x1f970 && codePoint <= 0x1f976) return EMOJI_CATEGORIES.SMILEYS; // Smiling faces with hearts
  if (codePoint === 0x1f979 || codePoint === 0x1f97a) return EMOJI_CATEGORIES.SMILEYS; // Face holding back tears, pleading

  // People and Body
  if (codePoint >= 0x1f466 && codePoint <= 0x1f487) return EMOJI_CATEGORIES.PEOPLE;
  if (codePoint >= 0x1f3c2 && codePoint <= 0x1f3cc) return EMOJI_CATEGORIES.PEOPLE; // Person activities
  if (codePoint >= 0x1f46e && codePoint <= 0x1f487) return EMOJI_CATEGORIES.PEOPLE;
  if (codePoint >= 0x1f574 && codePoint <= 0x1f57a) return EMOJI_CATEGORIES.PEOPLE; // Man in suit, dancer
  if (codePoint >= 0x1f645 && codePoint <= 0x1f64e) return EMOJI_CATEGORIES.PEOPLE; // Gesturing people
  if (codePoint >= 0x1f930 && codePoint <= 0x1f93e) return EMOJI_CATEGORIES.PEOPLE; // Pregnant, fencing, etc.
  if (codePoint >= 0x1f9b0 && codePoint <= 0x1f9b9) return EMOJI_CATEGORIES.PEOPLE; // Hair colors, superhero
  if (codePoint >= 0x1f9d1 && codePoint <= 0x1f9dd) return EMOJI_CATEGORIES.PEOPLE; // People
  if (codePoint >= 0x270a && codePoint <= 0x270d) return EMOJI_CATEGORIES.PEOPLE; // Hand gestures
  if (codePoint >= 0x1f440 && codePoint <= 0x1f465) return EMOJI_CATEGORIES.PEOPLE; // Eyes, body parts
  if (codePoint >= 0x1f4aa && codePoint === 0x1f4aa) return EMOJI_CATEGORIES.PEOPLE; // Flexed bicep

  // Animals and Nature
  if (codePoint >= 0x1f400 && codePoint <= 0x1f43f) return EMOJI_CATEGORIES.ANIMALS;
  if (codePoint >= 0x1f980 && codePoint <= 0x1f9ae) return EMOJI_CATEGORIES.ANIMALS; // More animals
  if (codePoint >= 0x1f330 && codePoint <= 0x1f343) return EMOJI_CATEGORIES.ANIMALS; // Plants
  if (codePoint >= 0x1f490 && codePoint <= 0x1f4a0) return EMOJI_CATEGORIES.ANIMALS; // Flowers
  if (codePoint >= 0x1f300 && codePoint <= 0x1f32c) return EMOJI_CATEGORIES.ANIMALS; // Weather, nature
  if (codePoint >= 0x2600 && codePoint <= 0x26c8) return EMOJI_CATEGORIES.ANIMALS; // Sun, weather
  if (codePoint === 0x1f30d || codePoint === 0x1f30e || codePoint === 0x1f30f)
    return EMOJI_CATEGORIES.ANIMALS; // Earth globes

  // Food and Drink
  if (codePoint >= 0x1f345 && codePoint <= 0x1f37f) return EMOJI_CATEGORIES.FOOD;
  if (codePoint >= 0x1f950 && codePoint <= 0x1f96f) return EMOJI_CATEGORIES.FOOD; // More food
  if (codePoint >= 0x1f32d && codePoint <= 0x1f32f) return EMOJI_CATEGORIES.FOOD; // Hot dog, taco, burrito

  // Activities (Sports, Games, Arts)
  if (codePoint >= 0x1f3a0 && codePoint <= 0x1f3c1) return EMOJI_CATEGORIES.ACTIVITIES; // Entertainment
  if (codePoint >= 0x1f3cd && codePoint <= 0x1f3d3) return EMOJI_CATEGORIES.ACTIVITIES; // Sports equipment
  if (codePoint >= 0x26bd && codePoint <= 0x26be) return EMOJI_CATEGORIES.ACTIVITIES; // Soccer, baseball
  if (codePoint >= 0x1f3af && codePoint <= 0x1f3b4) return EMOJI_CATEGORIES.ACTIVITIES; // Games
  if (codePoint >= 0x1f3b5 && codePoint <= 0x1f3bc) return EMOJI_CATEGORIES.ACTIVITIES; // Music
  if (codePoint >= 0x1f3bd && codePoint <= 0x1f3be) return EMOJI_CATEGORIES.ACTIVITIES; // Running shirt, tennis
  if (codePoint === 0x1f94a || codePoint === 0x1f94b || codePoint === 0x1f94c)
    return EMOJI_CATEGORIES.ACTIVITIES; // Boxing, martial arts, curling
  if (codePoint >= 0x1f9e0 && codePoint <= 0x1f9e9) return EMOJI_CATEGORIES.ACTIVITIES; // Puzzle, games

  // Travel and Places
  if (codePoint >= 0x1f680 && codePoint <= 0x1f6c5) return EMOJI_CATEGORIES.TRAVEL;
  if (codePoint >= 0x1f6e0 && codePoint <= 0x1f6ff) return EMOJI_CATEGORIES.TRAVEL; // More travel
  if (codePoint >= 0x1f3d4 && codePoint <= 0x1f3df) return EMOJI_CATEGORIES.TRAVEL; // Places
  if (codePoint >= 0x1f3e0 && codePoint <= 0x1f3f0) return EMOJI_CATEGORIES.TRAVEL; // Buildings
  if (codePoint >= 0x26e9 && codePoint <= 0x26f9) return EMOJI_CATEGORIES.TRAVEL; // Places
  if (codePoint === 0x2708) return EMOJI_CATEGORIES.TRAVEL; // Airplane

  // Objects
  if (codePoint >= 0x1f4a1 && codePoint <= 0x1f4ff) return EMOJI_CATEGORIES.OBJECTS; // Many objects
  if (codePoint >= 0x1f500 && codePoint <= 0x1f573) return EMOJI_CATEGORIES.OBJECTS; // More objects
  if (codePoint >= 0x1f5a4 && codePoint <= 0x1f5ff) return EMOJI_CATEGORIES.OBJECTS; // Even more objects
  if (codePoint >= 0x1f380 && codePoint <= 0x1f393) return EMOJI_CATEGORIES.OBJECTS; // Gifts, school
  if (codePoint >= 0x1f4f0 && codePoint <= 0x1f4fd) return EMOJI_CATEGORIES.OBJECTS; // Electronics
  if (codePoint >= 0x231a && codePoint <= 0x231b) return EMOJI_CATEGORIES.OBJECTS; // Watch, hourglass
  if (codePoint >= 0x2328 && codePoint === 0x2328) return EMOJI_CATEGORIES.OBJECTS; // Keyboard
  if (codePoint === 0x1f9f0 || codePoint === 0x1f9f1) return EMOJI_CATEGORIES.OBJECTS; // Toolbox, brick
  if (codePoint >= 0x1f9f2 && codePoint <= 0x1f9ff) return EMOJI_CATEGORIES.OBJECTS; // Various objects
  if (codePoint === 0x1f525) return EMOJI_CATEGORIES.OBJECTS; // Fire
  if (codePoint === 0x1f4a7 || codePoint === 0x1f4a8) return EMOJI_CATEGORIES.OBJECTS; // Droplet, dash
  if (codePoint === 0x1f4a9) return EMOJI_CATEGORIES.SMILEYS; // Poop (it's with faces in iOS)

  // Symbols (Hearts, shapes, etc.)
  if (codePoint >= 0x2764 && codePoint <= 0x2764) return EMOJI_CATEGORIES.SYMBOLS; // Red heart
  if (codePoint >= 0x1f493 && codePoint <= 0x1f49f) return EMOJI_CATEGORIES.SYMBOLS; // Hearts
  if (codePoint >= 0x1f4a0 && codePoint === 0x1f4a0) return EMOJI_CATEGORIES.SYMBOLS; // Diamond shape
  if (codePoint >= 0x2660 && codePoint <= 0x2668) return EMOJI_CATEGORIES.SYMBOLS; // Card suits, hot springs
  if (codePoint >= 0x2702 && codePoint <= 0x27b0) return EMOJI_CATEGORIES.SYMBOLS; // Various symbols
  if (codePoint >= 0x2b50 && codePoint <= 0x2b55) return EMOJI_CATEGORIES.SYMBOLS; // Stars, circles
  if (codePoint >= 0x3030 && codePoint === 0x3030) return EMOJI_CATEGORIES.SYMBOLS; // Wavy dash
  if (codePoint >= 0x1f170 && codePoint <= 0x1f19a) return EMOJI_CATEGORIES.SYMBOLS; // Squared letters
  if (codePoint >= 0x1f201 && codePoint <= 0x1f251) return EMOJI_CATEGORIES.SYMBOLS; // Japanese symbols
  if (codePoint >= 0x1f004 && codePoint === 0x1f004) return EMOJI_CATEGORIES.SYMBOLS; // Mahjong
  if (codePoint >= 0x1f0cf && codePoint === 0x1f0cf) return EMOJI_CATEGORIES.SYMBOLS; // Joker card
  if (codePoint === 0x2728) return EMOJI_CATEGORIES.SYMBOLS; // Sparkles
  if (codePoint === 0x2b50) return EMOJI_CATEGORIES.SYMBOLS; // Star
  if (codePoint === 0x1f31f) return EMOJI_CATEGORIES.SYMBOLS; // Glowing star

  return EMOJI_CATEGORIES.OTHER;
}

// LocalStorage keys
export const SOUP_STORAGE_KEYS = {
  CURRENT_GAME: 'soup_current_game',
  STATS: 'soup_stats',
  COMPLETED_PUZZLES: 'soup_completed',
  PUZZLE_PROGRESS: 'soup_puzzle_progress_',
  PUZZLE_ATTEMPTED: 'soup_puzzle_attempted_', // Tracks if user has attempted (for leaderboard first-attempt-only)
  STREAK: 'soup_streak',
  LAST_PLAYED_DATE: 'soup_last_played_date',
  ELEMENT_BANK: 'soup_element_bank_',
  COMBINATIONS_TRIED: 'soup_combinations_tried_',
  FAVORITE_ELEMENTS: 'soup_favorite_elements', // Favorite elements for quick access
  ELEMENT_USAGE: 'soup_element_usage', // Track element usage counts for sorting
  CREATIVE_ACTIVE_SLOT: 'soup_creative_active_slot', // Active creative mode save slot (1-3)
  COOP_SESSION_ID: 'soup_coop_session_id', // Active co-op session ID
};

// Maximum number of favorite elements allowed
export const MAX_FAVORITES = 12;

// API endpoints
export const SOUP_API = {
  PUZZLE: '/api/daily-alchemy/puzzle',
  COMBINE: '/api/daily-alchemy/combine',
  COMPLETE: '/api/daily-alchemy/complete',
  STATS: '/api/daily-alchemy/stats',
  DISCOVERIES: '/api/daily-alchemy/discoveries',
  CREATIVE_SAVE: '/api/daily-alchemy/creative/save',
  CREATIVE_SAVES: '/api/daily-alchemy/creative/saves',
  LEADERBOARD_DAILY: '/api/leaderboard/daily',
  ADMIN_PUZZLES: '/api/admin/daily-alchemy/puzzles',
  ADMIN_SANDBOX: '/api/admin/daily-alchemy/sandbox',
  COOP_CREATE: '/api/daily-alchemy/coop/create',
  COOP_JOIN: '/api/daily-alchemy/coop/join',
  COOP_LEAVE: '/api/daily-alchemy/coop/leave',
  COOP_SAVE: '/api/daily-alchemy/coop/save',
  COOP_SESSION: '/api/daily-alchemy/coop/session',
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
  'Pure Gold!',
  'Crafting Complete!',
  'Discovery Champion!',
  'Element Wizard!',
  'Cauldron King!',
];

// Co-op congratulatory messages (two-player themed)
export const COOP_CONGRATS_MESSAGES = [
  'Dynamic Duo!',
  'Two Minds, One Brew!',
  'Team Alchemy!',
  'Legendary Partners!',
  'Perfect Synergy!',
  'Double Trouble!',
  'Cauldron Companions!',
  'Co-op Champions!',
  'Better Together!',
  'Alchemi-TEAM!',
];

// Messages for first discoveries
export const FIRST_DISCOVERY_MESSAGES = [
  'First Discovery!',
  'You Found Something New!',
  'Pioneering Discovery!',
  'Never Seen Before!',
  'World First!',
];

// Game over messages (time ran out)
export const GAME_OVER_MESSAGES = [
  "Time's Up!",
  'The Cauldron Cooled!',
  'Out of Time!',
  'The Magic Faded!',
];

// Par comparison messages
export const PAR_MESSAGES = {
  UNDER: ['Under par!', 'Efficient mixing!', 'Speed alchemist!', 'Quick thinking!'],
  AT: ['Right on par!', 'Precisely done!', 'Perfectly calculated!'],
  OVER: ['Got there!', 'Mission complete!', 'Target acquired!'],
};

// Hint message templates - {element} will be replaced with the target element name
export const HINT_PHRASES = [
  'What elements create {element}?',
  'How would you create {element}?',
  'Which two elements combine to create {element}?',
  'Try to make {element}!',
  'Hint: Create {element}',
  'Can you figure out how to make {element}?',
  'Think about what makes {element}...',
  'What could combine into {element}?',
  'Your next goal: {element}',
  'Focus on creating {element}',
  'The path leads through {element}',
  'You need {element} next',
  'Consider: what forms {element}?',
  'Combine something to get {element}',
  'Work toward {element}',
  'What two things make {element}?',
  'Aim for {element}',
  'Next step: discover {element}',
  'Look for a way to make {element}',
  'The answer involves {element}',
];

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

// Co-op mode constants
export const COOP_CONFIG = {
  EMOTE_PRESETS: [
    '👋',
    '🎉',
    '🔥',
    '😮',
    '👍',
    '❤️',
    '😂',
    '🤔',
    '⭐',
    '💪',
    '🙌',
    '✨',
    '💩',
    '👀',
    '🤡',
    '🥵',
  ],
  PRESENCE_IDLE_MS: 300000, // 5 minutes
  PRESENCE_DISCONNECT_MS: 600000, // 10 minutes
  HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  EMOTE_COOLDOWN_MS: 2000, // 2 seconds between emotes
  EMOTE_DISPLAY_MS: 2500, // How long emote shows on screen
  INVITE_CODE_LENGTH: 6,
  // Unambiguous characters (no O/0/I/1/L)
  INVITE_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  // Debounced sync: update DB every N discoveries
  SYNC_DISCOVERY_INTERVAL: 5,
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
 * @param {number} params.hintsUsed - Number of hints used
 * @returns {string} Share text
 */
export function generateShareText({ date, time, moves, par, firstDiscoveries = 0, hintsUsed = 0 }) {
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${String(dateObj.getFullYear()).slice(-2)}`;

  let text = `Daily Alchemy ${formattedDate}\n`;
  text += `⏱️ ${formatTime(time)}\n`;
  text += `🧮 ${moves} moves (Par: ${par})\n`;

  if (hintsUsed > 0) {
    text += `💡 Hints: ${hintsUsed}\n`;
  }

  if (firstDiscoveries > 0) {
    text += `🏆 First discoveries: ${firstDiscoveries}\n`;
  }

  const shareUrl = isStandaloneAlchemy ? 'dailyalchemy.fun' : 'tandemdaily.com/daily-alchemy';
  text += `\n${shareUrl}`;

  return text;
}
