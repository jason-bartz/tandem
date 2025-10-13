/**
 * Game Center Achievement and Leaderboard Definitions
 * All 31 achievements for Tandem Daily
 */

/**
 * Streak-Based Achievements (23 total)
 * Tracks player's best streak (consecutive days solving puzzles)
 */
export const STREAK_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.first_pedal',
    name: 'First Pedal',
    description: 'Maintain a 3-day streak',
    emoji: '🔥',
    threshold: 3,
    points: 5,
  },
  {
    id: 'com.tandemdaily.app.finding_rhythm',
    name: 'Finding Rhythm',
    description: 'Maintain a 5-day streak',
    emoji: '⭐',
    threshold: 5,
    points: 5,
  },
  {
    id: 'com.tandemdaily.app.picking_up_speed',
    name: 'Picking Up Speed',
    description: 'Maintain a 7-day streak',
    emoji: '💪',
    threshold: 7,
    points: 10,
  },
  {
    id: 'com.tandemdaily.app.steady_cadence',
    name: 'Steady Cadence',
    description: 'Maintain a 10-day streak',
    emoji: '🎯',
    threshold: 10,
    points: 10,
  },
  {
    id: 'com.tandemdaily.app.cruising_along',
    name: 'Cruising Along',
    description: 'Maintain a 15-day streak',
    emoji: '🚴',
    threshold: 15,
    points: 15,
  },
  {
    id: 'com.tandemdaily.app.rolling_hills',
    name: 'Rolling Hills',
    description: 'Maintain a 20-day streak',
    emoji: '⛰️',
    threshold: 20,
    points: 15,
  },
  {
    id: 'com.tandemdaily.app.coast_to_coast',
    name: 'Coast to Coast',
    description: 'Maintain a 25-day streak',
    emoji: '🌊',
    threshold: 25,
    points: 20,
  },
  {
    id: 'com.tandemdaily.app.monthly_rider',
    name: 'Monthly Rider',
    description: 'Maintain a 30-day streak',
    emoji: '🏆',
    threshold: 30,
    points: 25,
  },
  {
    id: 'com.tandemdaily.app.swift_cyclist',
    name: 'Swift Cyclist',
    description: 'Maintain a 40-day streak',
    emoji: '⚡',
    threshold: 40,
    points: 25,
  },
  {
    id: 'com.tandemdaily.app.starlight_ride',
    name: 'Starlight Ride',
    description: 'Maintain a 50-day streak',
    emoji: '🌟',
    threshold: 50,
    points: 30,
  },
  {
    id: 'com.tandemdaily.app.seaside_route',
    name: 'Seaside Route',
    description: 'Maintain a 60-day streak',
    emoji: '🏖️',
    threshold: 60,
    points: 30,
  },
  {
    id: 'com.tandemdaily.app.summit_seeker',
    name: 'Summit Seeker',
    description: 'Maintain a 75-day streak',
    emoji: '🗻',
    threshold: 75,
    points: 40,
  },
  {
    id: 'com.tandemdaily.app.cross_country',
    name: 'Cross Country',
    description: 'Maintain a 90-day streak',
    emoji: '🎖️',
    threshold: 90,
    points: 40,
  },
  {
    id: 'com.tandemdaily.app.century_ride',
    name: 'Century Ride',
    description: 'Maintain a 100-day streak',
    emoji: '💯',
    threshold: 100,
    points: 50,
  },
  {
    id: 'com.tandemdaily.app.mountain_pass',
    name: 'Mountain Pass',
    description: 'Maintain a 125-day streak',
    emoji: '🦅',
    threshold: 125,
    points: 60,
  },
  {
    id: 'com.tandemdaily.app.pathfinder',
    name: 'Pathfinder',
    description: 'Maintain a 150-day streak',
    emoji: '🧭',
    threshold: 150,
    points: 60,
  },
  {
    id: 'com.tandemdaily.app.coastal_cruiser',
    name: 'Coastal Cruiser',
    description: 'Maintain a 175-day streak',
    emoji: '🌊',
    threshold: 175,
    points: 75,
  },
  {
    id: 'com.tandemdaily.app.horizon_chaser',
    name: 'Horizon Chaser',
    description: 'Maintain a 200-day streak',
    emoji: '🌅',
    threshold: 200,
    points: 75,
  },
  {
    id: 'com.tandemdaily.app.grand_tour',
    name: 'Grand Tour',
    description: 'Maintain a 250-day streak',
    emoji: '🌍',
    threshold: 250,
    points: 80,
  },
  {
    id: 'com.tandemdaily.app.world_traveler',
    name: 'World Traveler',
    description: 'Maintain a 300-day streak',
    emoji: '🌎',
    threshold: 300,
    points: 100,
  },
  {
    id: 'com.tandemdaily.app.round_the_sun',
    name: 'Round the Sun',
    description: 'Maintain a 365-day streak',
    emoji: '☀️',
    threshold: 365,
    points: 100,
  },
  {
    id: 'com.tandemdaily.app.infinite_road',
    name: 'Infinite Road',
    description: 'Maintain a 500-day streak',
    emoji: '🛤️',
    threshold: 500,
    points: 100,
  },
  {
    id: 'com.tandemdaily.app.legendary_journey',
    name: 'Legendary Journey',
    description: 'Maintain a 1000-day streak',
    emoji: '🌟🏆🔥',
    threshold: 1000,
    points: 100,
  },
];

/**
 * Total Wins Achievements (8 total)
 * Tracks total number of puzzles solved
 */
export const WINS_ACHIEVEMENTS = [
  {
    id: 'com.tandemdaily.app.first_win',
    name: 'First Win',
    description: 'Solve your first puzzle',
    emoji: '🎉',
    threshold: 1,
    points: 5,
  },
  {
    id: 'com.tandemdaily.app.getting_hang',
    name: 'Getting the Hang of It',
    description: 'Solve 10 puzzles',
    emoji: '👍',
    threshold: 10,
    points: 10,
  },
  {
    id: 'com.tandemdaily.app.puzzle_pal',
    name: 'Puzzle Pal',
    description: 'Solve 25 puzzles',
    emoji: '🧩',
    threshold: 25,
    points: 25,
  },
  {
    id: 'com.tandemdaily.app.clever_cookie',
    name: 'Clever Cookie',
    description: 'Solve 50 puzzles',
    emoji: '🍪',
    threshold: 50,
    points: 30,
  },
  {
    id: 'com.tandemdaily.app.brainy_buddy',
    name: 'Brainy Buddy',
    description: 'Solve 100 puzzles',
    emoji: '🧠',
    threshold: 100,
    points: 50,
  },
  {
    id: 'com.tandemdaily.app.puzzle_whiz',
    name: 'Puzzle Whiz',
    description: 'Solve 250 puzzles',
    emoji: '⚡',
    threshold: 250,
    points: 75,
  },
  {
    id: 'com.tandemdaily.app.word_wizard',
    name: 'Word Wizard',
    description: 'Solve 500 puzzles',
    emoji: '🪄',
    threshold: 500,
    points: 100,
  },
  {
    id: 'com.tandemdaily.app.puzzle_king',
    name: 'Puzzle King',
    description: 'Solve 1000 puzzles',
    emoji: '👑',
    threshold: 1000,
    points: 100,
  },
];

/**
 * Leaderboard Definitions
 */
export const LEADERBOARDS = {
  LONGEST_STREAK: {
    id: 'com.tandemdaily.app.longest_streak',
    name: 'Longest Active Streak',
    description: 'Compete for the longest active streak',
  },
};

/**
 * Get all achievements in a single array
 * @returns {Array} All 31 achievements
 */
export function getAllAchievements() {
  return [...STREAK_ACHIEVEMENTS, ...WINS_ACHIEVEMENTS];
}

/**
 * Get achievement by ID
 * @param {string} achievementId - The achievement ID
 * @returns {Object|null} Achievement object or null if not found
 */
export function getAchievementById(achievementId) {
  const all = getAllAchievements();
  return all.find((a) => a.id === achievementId) || null;
}

/**
 * Get all streak achievements sorted by threshold
 * @returns {Array} Streak achievements sorted ascending
 */
export function getStreakAchievements() {
  return [...STREAK_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Get all wins achievements sorted by threshold
 * @returns {Array} Wins achievements sorted ascending
 */
export function getWinsAchievements() {
  return [...WINS_ACHIEVEMENTS].sort((a, b) => a.threshold - b.threshold);
}

/**
 * Calculate total possible points
 * @returns {number} Total points from all achievements
 */
export function getTotalPossiblePoints() {
  const all = getAllAchievements();
  return all.reduce((sum, achievement) => sum + achievement.points, 0);
}
