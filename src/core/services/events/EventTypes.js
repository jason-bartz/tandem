/**
 * Event Type Definitions and Schemas
 *
 * Defines all event types and their data schemas for the event sourcing system
 */

// Event type definitions with their required data fields
export const EventSchemas = {
  GAME_STARTED: {
    puzzleDate: { type: 'string', required: true },
    puzzleId: { type: 'string', required: false },
    difficulty: { type: 'string', required: false }
  },

  GAME_COMPLETED: {
    won: { type: 'boolean', required: true },
    puzzleDate: { type: 'string', required: true },
    puzzleId: { type: 'string', required: false },
    time: { type: 'number', required: true }, // in seconds
    mistakes: { type: 'number', required: true },
    hintsUsed: { type: 'number', required: false },
    wordsGuessed: { type: 'array', required: false },
    finalScore: { type: 'number', required: false }
  },

  GAME_ABANDONED: {
    puzzleDate: { type: 'string', required: true },
    puzzleId: { type: 'string', required: false },
    progress: { type: 'number', required: false }, // percentage
    timeSpent: { type: 'number', required: false }
  },

  WORD_GUESSED: {
    word: { type: 'string', required: true },
    position: { type: 'number', required: true },
    attempts: { type: 'number', required: false },
    time: { type: 'number', required: false }
  },

  HINT_USED: {
    hintType: { type: 'string', required: true },
    word: { type: 'string', required: false },
    position: { type: 'number', required: false }
  },

  MISTAKE_MADE: {
    guess: { type: 'string', required: true },
    correct: { type: 'string', required: true },
    position: { type: 'number', required: false }
  },

  STREAK_CONTINUED: {
    streak: { type: 'number', required: true },
    date: { type: 'string', required: true },
    previousDate: { type: 'string', required: false }
  },

  STREAK_BROKEN: {
    previousStreak: { type: 'number', required: true },
    lastDate: { type: 'string', required: true },
    missedDate: { type: 'string', required: true }
  },

  STREAK_RESTORED: {
    streak: { type: 'number', required: true },
    restoredFrom: { type: 'string', required: true },
    reason: { type: 'string', required: false }
  },

  ACHIEVEMENT_UNLOCKED: {
    achievementId: { type: 'string', required: true },
    achievementName: { type: 'string', required: true },
    points: { type: 'number', required: false },
    category: { type: 'string', required: false }
  },

  MILESTONE_REACHED: {
    milestoneType: { type: 'string', required: true },
    value: { type: 'number', required: true },
    previousValue: { type: 'number', required: false }
  },

  SYNC_STARTED: {
    syncType: { type: 'string', required: true }, // 'manual', 'auto', 'background'
    provider: { type: 'string', required: true }, // 'gameCenter', 'cloudKit', 'localStorage'
    recordCount: { type: 'number', required: false }
  },

  SYNC_COMPLETED: {
    syncType: { type: 'string', required: true },
    provider: { type: 'string', required: true },
    recordsSynced: { type: 'number', required: true },
    duration: { type: 'number', required: true }, // in milliseconds
    conflicts: { type: 'number', required: false }
  },

  SYNC_FAILED: {
    syncType: { type: 'string', required: true },
    provider: { type: 'string', required: true },
    error: { type: 'string', required: true },
    errorCode: { type: 'string', required: false },
    retryCount: { type: 'number', required: false }
  },

  CONFLICT_RESOLVED: {
    conflictType: { type: 'string', required: true },
    resolution: { type: 'string', required: true }, // 'local', 'remote', 'merge', 'manual'
    fields: { type: 'array', required: true },
    userChoice: { type: 'boolean', required: false }
  },

  STATS_MIGRATED: {
    fromVersion: { type: 'number', required: true },
    toVersion: { type: 'number', required: true },
    stats: { type: 'object', required: true },
    synthetic: { type: 'boolean', required: false }
  },

  LEGACY_DATA_IMPORTED: {
    source: { type: 'string', required: true },
    recordCount: { type: 'number', required: true },
    dataType: { type: 'string', required: true }
  }
};

// Achievement definitions
export const Achievements = {
  // Streak achievements
  STREAK_WEEK: {
    id: 'streak_week',
    name: '7 Day Streak',
    description: 'Complete puzzles for 7 consecutive days',
    points: 10,
    threshold: 7
  },
  STREAK_MONTH: {
    id: 'streak_month',
    name: '30 Day Streak',
    description: 'Complete puzzles for 30 consecutive days',
    points: 50,
    threshold: 30
  },
  STREAK_QUARTER: {
    id: 'streak_quarter',
    name: '90 Day Streak',
    description: 'Complete puzzles for 90 consecutive days',
    points: 100,
    threshold: 90
  },
  STREAK_YEAR: {
    id: 'streak_year',
    name: '365 Day Streak',
    description: 'Complete puzzles for an entire year',
    points: 500,
    threshold: 365
  },

  // Game completion achievements
  FIRST_WIN: {
    id: 'first_win',
    name: 'First Victory',
    description: 'Complete your first puzzle',
    points: 5,
    threshold: 1
  },
  TEN_WINS: {
    id: 'ten_wins',
    name: 'Getting Good',
    description: 'Complete 10 puzzles',
    points: 10,
    threshold: 10
  },
  FIFTY_WINS: {
    id: 'fifty_wins',
    name: 'Puzzle Master',
    description: 'Complete 50 puzzles',
    points: 25,
    threshold: 50
  },
  HUNDRED_WINS: {
    id: 'hundred_wins',
    name: 'Centurion',
    description: 'Complete 100 puzzles',
    points: 50,
    threshold: 100
  },

  // Perfect game achievements
  NO_MISTAKES: {
    id: 'no_mistakes',
    name: 'Perfect Game',
    description: 'Complete a puzzle without any mistakes',
    points: 15
  },
  NO_HINTS: {
    id: 'no_hints',
    name: 'Unaided',
    description: 'Complete a puzzle without using hints',
    points: 10
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a puzzle in under 60 seconds',
    points: 20,
    timeThreshold: 60
  },

  // Special achievements
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a puzzle before 6 AM',
    points: 10
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a puzzle after midnight',
    points: 10
  },
  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete puzzles every weekend for a month',
    points: 15
  }
};

// Milestone definitions
export const Milestones = {
  GAMES_PLAYED: [10, 25, 50, 100, 250, 500, 1000],
  WIN_RATE: [50, 60, 70, 80, 90, 95, 99],
  TOTAL_TIME: [3600, 10800, 36000, 86400, 259200], // in seconds
  HINTS_USED: [0, 10, 50, 100],
  PERFECT_GAMES: [1, 5, 10, 25, 50]
};

// Conflict resolution strategies
export const ConflictResolutionStrategies = {
  LAST_WRITE_WINS: 'lastWriteWins',
  FIRST_WRITE_WINS: 'firstWriteWins',
  HIGHEST_VALUE_WINS: 'highestValueWins',
  MANUAL_RESOLUTION: 'manualResolution',
  SMART_MERGE: 'smartMerge',
  VECTOR_CLOCK: 'vectorClock'
};

// Sync providers
export const SyncProviders = {
  GAME_CENTER: 'gameCenter',
  CLOUD_KIT: 'cloudKit',
  LOCAL_STORAGE: 'localStorage',
  ICLOUD_KEY_VALUE: 'iCloudKeyValue'
};

// Sync types
export const SyncTypes = {
  MANUAL: 'manual',
  AUTO: 'auto',
  BACKGROUND: 'background',
  INITIAL: 'initial',
  MIGRATION: 'migration'
};

export default {
  EventSchemas,
  Achievements,
  Milestones,
  ConflictResolutionStrategies,
  SyncProviders,
  SyncTypes
};