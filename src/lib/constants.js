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
  // Game Center - Tandem
  GAME_CENTER_AUTHENTICATED: 'tandem_gc_authenticated',
  GAME_CENTER_PLAYER_ID: 'tandem_gc_player_id',
  PENDING_ACHIEVEMENTS: 'tandem_pending_achievements',
  PENDING_LEADERBOARD: 'tandem_pending_leaderboard',
  LAST_SUBMITTED_STREAK: 'tandem_last_streak',
  LAST_SUBMITTED_WINS: 'tandem_last_wins',
  ACHIEVEMENTS_RETROACTIVE_CHECK_DONE: 'tandem_achievements_retroactive_check',
  SUBMITTED_ACHIEVEMENTS: 'tandem_submitted_achievements',
  // Mini Achievements
  LAST_SUBMITTED_MINI_STREAK: 'tandem_last_mini_streak',
  LAST_SUBMITTED_MINI_WINS: 'tandem_last_mini_wins',
  MINI_ACHIEVEMENTS_RETROACTIVE_CHECK_DONE: 'tandem_mini_achievements_retroactive_check',
  SUBMITTED_MINI_ACHIEVEMENTS: 'tandem_submitted_mini_achievements',
  // Reel Connections Achievements
  LAST_SUBMITTED_REEL_STREAK: 'tandem_last_reel_streak',
  LAST_SUBMITTED_REEL_WINS: 'tandem_last_reel_wins',
  REEL_ACHIEVEMENTS_RETROACTIVE_CHECK_DONE: 'tandem_reel_achievements_retroactive_check',
  SUBMITTED_REEL_ACHIEVEMENTS: 'tandem_submitted_reel_achievements',
};

export const API_ENDPOINTS = {
  PUZZLE: '/api/puzzle',
  ADMIN_AUTH: '/api/admin/auth',
  ADMIN_PUZZLES: '/api/admin/puzzles',
  ADMIN_GENERATE_PUZZLE: '/api/admin/generate-puzzle',
  STATS: '/api/stats',
  USER_STATS: '/api/user-stats',
  USER_CRYPTIC_STATS: '/api/user-cryptic-stats',
  USER_MINI_STATS: '/api/user-mini-stats',
  USER_REEL_STATS: '/api/user-reel-stats',
};

export const GAME_STATES = {
  WELCOME: 'welcome',
  PLAYING: 'playing',
  COMPLETE: 'complete',
  ADMIRE: 'admire', // Viewing a completed puzzle
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

export const ASSET_VERSION = '1.0.3'; // Increment this when assets change to bust cache

export const ADMIN_CONFIG = {
  SESSION_DURATION: '7d',
  MAX_BULK_OPERATIONS: 30,
  CALENDAR_DAYS_AHEAD: 30,
};

export const FEEDBACK_CATEGORIES = [
  {
    value: 'Bug Report',
    label: 'Bug Report',
    description: 'Something is broken or not working as expected',
    icon: 'bug',
  },
  {
    value: 'Feature Request',
    label: 'Feature Request',
    description: 'Ideas that would make Tandem better',
    icon: 'feature',
  },
  {
    value: 'Game Feedback',
    label: 'Game Feedback',
    description: 'Thoughts about puzzles, balance, or vibes',
    icon: 'feedback-2',
  },
  {
    value: 'Other',
    label: 'Other',
    description: 'Anything else you want to share with the team',
    icon: 'other',
  },
];

export const FEEDBACK_STATUS = {
  NEW: 'new',
  IN_REVIEW: 'in_review',
  RESOLVED: 'resolved',
  ARCHIVED: 'archived',
};

export const FEEDBACK_STATUS_OPTIONS = [
  { value: FEEDBACK_STATUS.NEW, label: 'New' },
  { value: FEEDBACK_STATUS.IN_REVIEW, label: 'In Review' },
  { value: FEEDBACK_STATUS.RESOLVED, label: 'Resolved' },
  { value: FEEDBACK_STATUS.ARCHIVED, label: 'Archived' },
];

// User-submitted puzzle statuses
export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  NEEDS_EDIT: 'needs_edit',
  ARCHIVED: 'archived',
};

export const SUBMISSION_STATUS_OPTIONS = [
  { value: SUBMISSION_STATUS.PENDING, label: 'Pending' },
  { value: SUBMISSION_STATUS.APPROVED, label: 'Approved' },
  { value: SUBMISSION_STATUS.NEEDS_EDIT, label: 'Needs Edit' },
  { value: SUBMISSION_STATUS.ARCHIVED, label: 'Archived' },
];

// Submission limits
export const SUBMISSION_LIMITS = {
  MAX_PER_DAY: 2,
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
    NO_PUZZLE: 'It seems our Puzzlemaster is a little behind. Come back shortly!',
    LOADING: 'Loading puzzle...',
    CHECKING: 'Checking answers...',
  },
};

// Daily Cryptic Game Configuration
export const CRYPTIC_CONFIG = {
  MAX_HINTS: 4,
  MIN_ANSWER_LENGTH: 5,
  MAX_ANSWER_LENGTH: 11,
  HINT_TYPES: ['fodder', 'indicator', 'definition', 'letter'],
  GAME_ROUTE: '/dailycryptic',
  MAX_ATTEMPTS: null, // Unlimited attempts
  // Access control:
  // - Daily puzzle: Free for all account holders
  // - Archive: Requires Tandem Puzzle Club membership
};

export const CRYPTIC_STORAGE_KEYS = {
  CURRENT_GAME: 'cryptic_current_game',
  STATS: 'cryptic_stats',
  COMPLETED_PUZZLES: 'cryptic_completed',
  PUZZLE_PROGRESS: 'cryptic_puzzle_progress_',
  STREAK: 'cryptic_streak',
  LAST_PLAYED_DATE: 'cryptic_last_played_date',
};

export const CRYPTIC_GAME_STATES = {
  WELCOME: 'welcome',
  PLAYING: 'playing',
  COMPLETE: 'complete',
  ADMIRE: 'admire',
  ERROR: 'error',
};

export const CRYPTIC_API_ENDPOINTS = {
  PUZZLE: '/api/cryptic/puzzle',
  STATS: '/api/cryptic/stats',
  ADMIN_PUZZLES: '/api/admin/cryptic/puzzles',
  ADMIN_GENERATE: '/api/admin/cryptic/generate-puzzle',
  ADMIN_ASSESS: '/api/admin/cryptic/assess-difficulty',
};

export const CRYPTIC_DEVICES = {
  CHARADE: 'charade',
  CONTAINER: 'container',
  DELETION: 'deletion',
  ANAGRAM: 'anagram',
  REVERSAL: 'reversal',
  HOMOPHONE: 'homophone',
  HIDDEN: 'hidden',
  DOUBLE_DEFINITION: 'double_definition',
  INITIAL_LETTERS: 'initial_letters',
};

export const MINI_CONFIG = {
  GRID_SIZE: 5,
  GAME_ROUTE: '/dailymini',
  // Access control:
  // - Daily puzzle: Free for all account holders
  // - Archive: Last 4 days free (today + 3 back), older requires Tandem Puzzle Club membership
  FREE_ARCHIVE_DAYS: 4,
};

export const MINI_STORAGE_KEYS = {
  CURRENT_GAME: 'mini_current_game',
  STATS: 'mini_stats',
  COMPLETED_PUZZLES: 'mini_completed',
  PUZZLE_PROGRESS: 'mini_puzzle_progress_',
  STREAK: 'mini_streak',
  LAST_PLAYED_DATE: 'mini_last_played_date',
};

export const MINI_GAME_STATES = {
  WELCOME: 'welcome',
  START: 'start', // Timer gate screen
  PLAYING: 'playing',
  COMPLETE: 'complete',
  ADMIRE: 'admire',
  ERROR: 'error',
};

export const MINI_API_ENDPOINTS = {
  PUZZLE: '/api/mini/puzzle',
  STATS: '/api/mini/stats',
  ADMIN_PUZZLES: '/api/admin/mini/puzzles',
};
