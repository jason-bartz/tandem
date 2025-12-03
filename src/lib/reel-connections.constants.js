/**
 * Reel Connections Game Constants
 * Centralized configuration for the Reel Connections game
 */

// Game configuration
export const REEL_CONFIG = {
  MAX_MISTAKES: 4,
  GROUP_SIZE: 4,
  TOTAL_GROUPS: 4,
  GRID_COLUMNS: 4,
  TIMER_INTERVAL_MS: 100,
  REVEAL_DELAY_MS: 1000,
  ONE_AWAY_DISPLAY_MS: 1800,
  SHAKE_DURATION_MS: 500,
  ONE_AWAY_SHAKE_DELAY_MS: 200,
  CONFETTI_DURATION_MS: 3000,
};

// Difficulty levels in order (easiest to hardest)
export const DIFFICULTY_ORDER = ['easiest', 'easy', 'medium', 'hardest'];

// Difficulty colors for groups
export const DIFFICULTY_COLORS = {
  easiest: 'bg-[#ffce00]', // Yellow
  easy: 'bg-[#7ed957]', // Green
  medium: 'bg-[#39b6ff]', // Blue
  hardest: 'bg-[#cb6ce6]', // Purple
};

// Movie-themed congratulatory messages for winning
export const CONGRATS_MESSAGES = [
  "That's a Wrap!",
  'Blockbuster Performance!',
  'Two Thumbs Up!',
  'Oscar Worthy!',
  'Star Performance!',
  'Box Office Smash!',
  "Director's Cut!",
  'Standing Ovation!',
  'Five Star Review!',
  'Award Winning!',
];

// Movie-themed "one away" messages
export const ONE_AWAY_MESSAGES = [
  'One away...',
  'So close!',
  'One star short...',
  'One frame off...',
  'Nearly in focus!',
];

// Confetti colors for celebration (cinema theme)
export const CONFETTI_COLORS = ['#FF4444', '#FFCE00', '#FFFFFF', '#FF6B6B', '#FFD700', '#FFF8DC'];

// LocalStorage key for stats
export const REEL_STATS_KEY = 'reel-connections-stats';

// API endpoints
export const REEL_API = {
  PUZZLE: '/api/reel-connections/puzzle',
  LEADERBOARD_DAILY: '/api/leaderboard/daily',
};

// Game type identifier for leaderboard
export const REEL_GAME_TYPE = 'reel';
