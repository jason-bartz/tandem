export const GAME_CONFIG = {
  MAX_MISTAKES: 4,
  PUZZLE_COUNT: 4,
  MAX_ANSWER_LENGTH: 10,
  START_DATE: process.env.NEXT_PUBLIC_GAME_START_DATE || '2025-08-15',
  HARD_MODE_TIME_LIMIT: 180, // 3 minutes in seconds
};

export const STORAGE_KEYS = {
  THEME: 'tandemTheme',
  THEME_MODE: 'tandemThemeMode',
  HIGH_CONTRAST: 'tandemHighContrast',
  REDUCE_MOTION: 'tandemReduceMotion',
  SOUND: 'tandemSound',
  STATS: 'tandemStats',
  AUTH_TOKEN: 'adminToken',
  HARD_MODE: 'tandemHardMode',
  HAS_SEEN_ONBOARDING: 'tandem_has_seen_onboarding',
  LEADERBOARDS_ENABLED: 'tandem_leaderboards_enabled',
  // Game Center
  GAME_CENTER_AUTHENTICATED: 'tandem_gc_authenticated',
  GAME_CENTER_PLAYER_ID: 'tandem_gc_player_id',
  PENDING_ACHIEVEMENTS: 'tandem_pending_achievements',
  PENDING_LEADERBOARD: 'tandem_pending_leaderboard',
  LAST_SUBMITTED_STREAK: 'tandem_last_streak',
  LAST_SUBMITTED_WINS: 'tandem_last_wins',
};

export const API_ENDPOINTS = {
  PUZZLE: '/api/puzzle',
  ADMIN_AUTH: '/api/admin/auth',
  ADMIN_PUZZLES: '/api/admin/puzzles',
  ADMIN_GENERATE_PUZZLE: '/api/admin/generate-puzzle',
  STATS: '/api/stats',
};

export const GAME_STATES = {
  WELCOME: 'welcome',
  PLAYING: 'playing',
  COMPLETE: 'complete',
  ERROR: 'error',
};

export const PUZZLE_TEMPLATES = [
  {
    id: 'weather',
    name: 'Weather',
    theme: 'Types of Weather',
    puzzles: [
      { emoji: '☀️🌡️', answer: 'SUNNY' },
      { emoji: '☁️💧', answer: 'RAIN' },
      { emoji: '❄️🌨️', answer: 'SNOW' },
      { emoji: '⚡🔊', answer: 'THUNDER' },
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    theme: 'Popular Sports',
    puzzles: [
      { emoji: '⚽🥅', answer: 'SOCCER' },
      { emoji: '🏀🗑️', answer: 'BASKETBALL' },
      { emoji: '🎾🏆', answer: 'TENNIS' },
      { emoji: '⚾🧢', answer: 'BASEBALL' },
    ],
  },
  {
    id: 'music',
    name: 'Music',
    theme: 'Music Genres',
    puzzles: [
      { emoji: '🎸🤘', answer: 'ROCK' },
      { emoji: '🎺🎷', answer: 'JAZZ' },
      { emoji: '🎹🎼', answer: 'CLASSICAL' },
      { emoji: '🎤🎵', answer: 'POP' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    theme: 'Popular Foods',
    puzzles: [
      { emoji: '🍕🇮🇹', answer: 'PIZZA' },
      { emoji: '🍔🍟', answer: 'BURGER' },
      { emoji: '🍣🇯🇵', answer: 'SUSHI' },
      { emoji: '🌮🇲🇽', answer: 'TACO' },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    theme: 'Things found in a kitchen',
    puzzles: [
      { emoji: '🍳🔥', answer: 'STOVE' },
      { emoji: '❄️📦', answer: 'FRIDGE' },
      { emoji: '🍞🔥', answer: 'TOASTER' },
      { emoji: '☕⚡', answer: 'COFFEE' },
    ],
  },
];

export const SOUND_CONFIG = {
  ENABLED: process.env.NEXT_PUBLIC_ENABLE_SOUNDS === 'true',
  VOLUME: 0.3,
  SOUNDS: {
    CORRECT: {
      frequencies: [523.25, 659.25, 783.99],
      duration: 0.3,
    },
    INCORRECT: {
      frequencies: [196, 174.61],
      duration: 0.2,
    },
    COMPLETE: {
      frequencies: [523.25, 659.25, 783.99, 1046.5],
      duration: 0.5,
    },
  },
};

export const THEME_CONFIG = {
  LIGHT: 'light',
  DARK: 'dark',
  DEFAULT: 'light',
};

export const THEME_MODE = {
  AUTO: 'auto',
  MANUAL: 'manual',
  DEFAULT: 'auto',
};

export const ADMIN_CONFIG = {
  SESSION_DURATION: '7d',
  MAX_BULK_OPERATIONS: 30,
  CALENDAR_DAYS_AHEAD: 30,
};

export const VALIDATION_RULES = {
  ANSWER: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 10,
    PATTERN: /^[A-Z\s]+$/,
  },
  EMOJI: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 6,
  },
  THEME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
};

export const MESSAGES = {
  ERRORS: {
    PUZZLE_LOAD_FAILED: "Failed to load today's puzzle",
    AUTH_FAILED: 'Authentication failed',
    SAVE_FAILED: 'Failed to save your progress',
    NETWORK_ERROR: 'Network error. Please try again.',
  },
  SUCCESS: {
    PUZZLE_COMPLETE: 'Puzzle Complete!',
    PUZZLE_SAVED: 'Puzzle saved successfully',
    STATS_UPDATED: 'Statistics updated',
  },
  INFO: {
    NO_PUZZLE: 'No puzzle available for today',
    LOADING: 'Loading puzzle...',
    CHECKING: 'Checking answers...',
  },
};
