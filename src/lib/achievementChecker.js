/**
 * Achievement Checking Logic
 * Determines which achievements should be unlocked based on current stats
 */

import { getStreakAchievements, getWinsAchievements } from './achievementDefinitions';

/**
 * Check which streak achievements should be unlocked
 * @param {number} bestStreak - The player's best streak value
 * @param {number} lastSubmittedStreak - Last streak value submitted to Game Center
 * @returns {Array} Array of achievement IDs that should be unlocked
 */
export function checkStreakAchievements(bestStreak, lastSubmittedStreak = 0) {
  const streakAchievements = getStreakAchievements();
  const newlyUnlocked = [];

  for (const achievement of streakAchievements) {
    // Check if player has reached this threshold and it hasn't been submitted yet
    if (bestStreak >= achievement.threshold && lastSubmittedStreak < achievement.threshold) {
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'streak',
      });
    }
  }

  return newlyUnlocked;
}

/**
 * Check which wins achievements should be unlocked
 * @param {number} totalWins - The player's total wins count
 * @param {number} lastSubmittedWins - Last wins value submitted to Game Center
 * @returns {Array} Array of achievement IDs that should be unlocked
 */
export function checkWinsAchievements(totalWins, lastSubmittedWins = 0) {
  const winsAchievements = getWinsAchievements();
  const newlyUnlocked = [];

  for (const achievement of winsAchievements) {
    // Check if player has reached this threshold and it hasn't been submitted yet
    if (totalWins >= achievement.threshold && lastSubmittedWins < achievement.threshold) {
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'wins',
      });
    }
  }

  return newlyUnlocked;
}

/**
 * Get all newly unlocked achievements based on current stats
 * @param {Object} stats - Player stats object with bestStreak and wins
 * @param {Object} lastSubmitted - Last submitted values { streak, wins }
 * @returns {Array} Array of all newly unlocked achievement IDs
 */
export function getNewlyUnlockedAchievements(stats, lastSubmitted = {}) {
  const { bestStreak = 0, wins = 0 } = stats;
  const { streak: lastStreak = 0, wins: lastWins = 0 } = lastSubmitted;

  const streakAchievements = checkStreakAchievements(bestStreak, lastStreak);
  const winsAchievements = checkWinsAchievements(wins, lastWins);

  return [...streakAchievements, ...winsAchievements];
}

/**
 * Get the highest streak threshold reached
 * @param {number} bestStreak - The player's best streak value
 * @returns {number} The highest threshold reached
 */
export function getHighestStreakThreshold(bestStreak) {
  const streakAchievements = getStreakAchievements();
  let highest = 0;

  for (const achievement of streakAchievements) {
    if (bestStreak >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get the highest wins threshold reached
 * @param {number} totalWins - The player's total wins count
 * @returns {number} The highest threshold reached
 */
export function getHighestWinsThreshold(totalWins) {
  const winsAchievements = getWinsAchievements();
  let highest = 0;

  for (const achievement of winsAchievements) {
    if (totalWins >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get next achievement to unlock for streaks
 * @param {number} currentStreak - The player's current streak
 * @returns {Object|null} Next achievement or null if none
 */
export function getNextStreakAchievement(currentStreak) {
  const streakAchievements = getStreakAchievements();

  for (const achievement of streakAchievements) {
    if (currentStreak < achievement.threshold) {
      return {
        ...achievement,
        remaining: achievement.threshold - currentStreak,
      };
    }
  }

  return null; // All achievements unlocked
}

/**
 * Get next achievement to unlock for wins
 * @param {number} currentWins - The player's current wins count
 * @returns {Object|null} Next achievement or null if none
 */
export function getNextWinsAchievement(currentWins) {
  const winsAchievements = getWinsAchievements();

  for (const achievement of winsAchievements) {
    if (currentWins < achievement.threshold) {
      return {
        ...achievement,
        remaining: achievement.threshold - currentWins,
      };
    }
  }

  return null; // All achievements unlocked
}

/**
 * Calculate achievement progress for a specific achievement
 * @param {number} currentValue - Current stat value (streak or wins)
 * @param {number} threshold - Achievement threshold
 * @returns {number} Progress percentage (0-100)
 */
export function calculateAchievementProgress(currentValue, threshold) {
  if (currentValue >= threshold) {
    return 100;
  }
  return Math.floor((currentValue / threshold) * 100);
}

/**
 * Get all achievements that should be unlocked based on current stats
 * This is used for retroactive achievement checking (e.g., for existing users)
 * @param {Object} stats - Player stats object with bestStreak and wins
 * @returns {Array} Array of all achievements that qualify based on current stats
 */
export function getAllQualifyingAchievements(stats) {
  const { bestStreak = 0, wins = 0 } = stats;
  const qualifyingAchievements = [];

  // Check all streak achievements
  const streakAchievements = getStreakAchievements();
  for (const achievement of streakAchievements) {
    if (bestStreak >= achievement.threshold) {
      qualifyingAchievements.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'streak',
      });
    }
  }

  // Check all wins achievements
  const winsAchievements = getWinsAchievements();
  for (const achievement of winsAchievements) {
    if (wins >= achievement.threshold) {
      qualifyingAchievements.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'wins',
      });
    }
  }

  return qualifyingAchievements;
}
