/**
 * Achievement Checking Logic
 * Determines which achievements should be unlocked based on current stats
 */

import {
  getStreakAchievements,
  getWinsAchievements,
  getMiniStreakAchievements,
  getMiniWinsAchievements,
  getReelStreakAchievements,
  getReelWinsAchievements,
  getAlchemyStreakAchievements,
  getAlchemyWinsAchievements,
  getAlchemyFirstDiscoveryAchievements,
} from './achievementDefinitions';

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

// ============================================
// MINI CROSSWORD ACHIEVEMENT FUNCTIONS
// ============================================

/**
 * Check which mini streak achievements should be unlocked
 * @param {number} bestStreak - The player's best mini streak value
 * @param {number} lastSubmittedStreak - Last streak value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkMiniStreakAchievements(bestStreak, lastSubmittedStreak = 0) {
  const streakAchievements = getMiniStreakAchievements();
  const newlyUnlocked = [];

  for (const achievement of streakAchievements) {
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
 * Check which mini wins achievements should be unlocked
 * @param {number} totalWins - The player's total mini wins count
 * @param {number} lastSubmittedWins - Last wins value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkMiniWinsAchievements(totalWins, lastSubmittedWins = 0) {
  const winsAchievements = getMiniWinsAchievements();
  const newlyUnlocked = [];

  for (const achievement of winsAchievements) {
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
 * Get all newly unlocked mini achievements based on current stats
 * @param {Object} stats - Player mini stats object with longestStreak and totalCompleted
 * @param {Object} lastSubmitted - Last submitted values { streak, wins }
 * @returns {Array} Array of all newly unlocked achievement objects
 */
export function getNewlyUnlockedMiniAchievements(stats, lastSubmitted = {}) {
  const { longestStreak = 0, totalCompleted = 0 } = stats;
  const { streak: lastStreak = 0, wins: lastWins = 0 } = lastSubmitted;

  const streakAchievements = checkMiniStreakAchievements(longestStreak, lastStreak);
  const winsAchievements = checkMiniWinsAchievements(totalCompleted, lastWins);

  return [...streakAchievements, ...winsAchievements];
}

/**
 * Get the highest mini streak threshold reached
 * @param {number} bestStreak - The player's best mini streak value
 * @returns {number} The highest threshold reached
 */
export function getHighestMiniStreakThreshold(bestStreak) {
  const streakAchievements = getMiniStreakAchievements();
  let highest = 0;

  for (const achievement of streakAchievements) {
    if (bestStreak >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get the highest mini wins threshold reached
 * @param {number} totalWins - The player's total mini wins count
 * @returns {number} The highest threshold reached
 */
export function getHighestMiniWinsThreshold(totalWins) {
  const winsAchievements = getMiniWinsAchievements();
  let highest = 0;

  for (const achievement of winsAchievements) {
    if (totalWins >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get all mini achievements that should be unlocked based on current stats
 * This is used for retroactive achievement checking (e.g., for existing users)
 * @param {Object} stats - Player mini stats object with longestStreak and totalCompleted
 * @returns {Array} Array of all achievements that qualify based on current stats
 */
export function getAllQualifyingMiniAchievements(stats) {
  const { longestStreak = 0, totalCompleted = 0 } = stats;
  const qualifyingAchievements = [];

  // Check all mini streak achievements
  const streakAchievements = getMiniStreakAchievements();
  for (const achievement of streakAchievements) {
    if (longestStreak >= achievement.threshold) {
      qualifyingAchievements.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'streak',
      });
    }
  }

  // Check all mini wins achievements
  const winsAchievements = getMiniWinsAchievements();
  for (const achievement of winsAchievements) {
    if (totalCompleted >= achievement.threshold) {
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

// ============================================
// REEL CONNECTIONS ACHIEVEMENT FUNCTIONS
// ============================================

/**
 * Check which reel streak achievements should be unlocked
 * @param {number} bestStreak - The player's best reel streak value
 * @param {number} lastSubmittedStreak - Last streak value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkReelStreakAchievements(bestStreak, lastSubmittedStreak = 0) {
  const streakAchievements = getReelStreakAchievements();
  const newlyUnlocked = [];

  for (const achievement of streakAchievements) {
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
 * Check which reel wins achievements should be unlocked
 * @param {number} totalWins - The player's total reel wins count
 * @param {number} lastSubmittedWins - Last wins value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkReelWinsAchievements(totalWins, lastSubmittedWins = 0) {
  const winsAchievements = getReelWinsAchievements();
  const newlyUnlocked = [];

  for (const achievement of winsAchievements) {
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
 * Get all newly unlocked reel achievements based on current stats
 * @param {Object} stats - Player reel stats object with bestStreak and gamesWon
 * @param {Object} lastSubmitted - Last submitted values { streak, wins }
 * @returns {Array} Array of all newly unlocked achievement objects
 */
export function getNewlyUnlockedReelAchievements(stats, lastSubmitted = {}) {
  const { bestStreak = 0, gamesWon = 0 } = stats;
  const { streak: lastStreak = 0, wins: lastWins = 0 } = lastSubmitted;

  const streakAchievements = checkReelStreakAchievements(bestStreak, lastStreak);
  const winsAchievements = checkReelWinsAchievements(gamesWon, lastWins);

  return [...streakAchievements, ...winsAchievements];
}

/**
 * Get the highest reel streak threshold reached
 * @param {number} bestStreak - The player's best reel streak value
 * @returns {number} The highest threshold reached
 */
export function getHighestReelStreakThreshold(bestStreak) {
  const streakAchievements = getReelStreakAchievements();
  let highest = 0;

  for (const achievement of streakAchievements) {
    if (bestStreak >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get the highest reel wins threshold reached
 * @param {number} totalWins - The player's total reel wins count
 * @returns {number} The highest threshold reached
 */
export function getHighestReelWinsThreshold(totalWins) {
  const winsAchievements = getReelWinsAchievements();
  let highest = 0;

  for (const achievement of winsAchievements) {
    if (totalWins >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get all reel achievements that should be unlocked based on current stats
 * This is used for retroactive achievement checking (e.g., for existing users)
 * @param {Object} stats - Player reel stats object with bestStreak and gamesWon
 * @returns {Array} Array of all achievements that qualify based on current stats
 */
export function getAllQualifyingReelAchievements(stats) {
  const { bestStreak = 0, gamesWon = 0 } = stats;
  const qualifyingAchievements = [];

  // Check all reel streak achievements
  const streakAchievements = getReelStreakAchievements();
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

  // Check all reel wins achievements
  const winsAchievements = getReelWinsAchievements();
  for (const achievement of winsAchievements) {
    if (gamesWon >= achievement.threshold) {
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

// ============================================
// DAILY ALCHEMY ACHIEVEMENT FUNCTIONS
// ============================================

/**
 * Check which alchemy streak achievements should be unlocked
 * @param {number} bestStreak - The player's best alchemy streak value
 * @param {number} lastSubmittedStreak - Last streak value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkAlchemyStreakAchievements(bestStreak, lastSubmittedStreak = 0) {
  const streakAchievements = getAlchemyStreakAchievements();
  const newlyUnlocked = [];

  for (const achievement of streakAchievements) {
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
 * Check which alchemy wins achievements should be unlocked
 * @param {number} totalWins - The player's total alchemy wins count
 * @param {number} lastSubmittedWins - Last wins value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkAlchemyWinsAchievements(totalWins, lastSubmittedWins = 0) {
  const winsAchievements = getAlchemyWinsAchievements();
  const newlyUnlocked = [];

  for (const achievement of winsAchievements) {
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
 * Check which alchemy first discovery achievements should be unlocked
 * @param {number} totalFirstDiscoveries - The player's total first discoveries count
 * @param {number} lastSubmittedFirstDiscoveries - Last first discoveries value submitted
 * @returns {Array} Array of achievement objects that should be unlocked
 */
export function checkAlchemyFirstDiscoveryAchievements(
  totalFirstDiscoveries,
  lastSubmittedFirstDiscoveries = 0
) {
  const firstDiscoveryAchievements = getAlchemyFirstDiscoveryAchievements();
  const newlyUnlocked = [];

  for (const achievement of firstDiscoveryAchievements) {
    if (
      totalFirstDiscoveries >= achievement.threshold &&
      lastSubmittedFirstDiscoveries < achievement.threshold
    ) {
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'firstDiscovery',
      });
    }
  }

  return newlyUnlocked;
}

/**
 * Get all newly unlocked alchemy achievements based on current stats
 * @param {Object} stats - Player alchemy stats object with longestStreak, totalCompleted, and firstDiscoveries
 * @param {Object} lastSubmitted - Last submitted values { streak, wins, firstDiscoveries }
 * @returns {Array} Array of all newly unlocked achievement objects
 */
export function getNewlyUnlockedAlchemyAchievements(stats, lastSubmitted = {}) {
  const { longestStreak = 0, totalCompleted = 0, firstDiscoveries = 0 } = stats;
  const {
    streak: lastStreak = 0,
    wins: lastWins = 0,
    firstDiscoveries: lastFirstDiscoveries = 0,
  } = lastSubmitted;

  const streakAchievements = checkAlchemyStreakAchievements(longestStreak, lastStreak);
  const winsAchievements = checkAlchemyWinsAchievements(totalCompleted, lastWins);
  const firstDiscoveryAchievements = checkAlchemyFirstDiscoveryAchievements(
    firstDiscoveries,
    lastFirstDiscoveries
  );

  return [...streakAchievements, ...winsAchievements, ...firstDiscoveryAchievements];
}

/**
 * Get the highest alchemy streak threshold reached
 * @param {number} bestStreak - The player's best alchemy streak value
 * @returns {number} The highest threshold reached
 */
export function getHighestAlchemyStreakThreshold(bestStreak) {
  const streakAchievements = getAlchemyStreakAchievements();
  let highest = 0;

  for (const achievement of streakAchievements) {
    if (bestStreak >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get the highest alchemy wins threshold reached
 * @param {number} totalWins - The player's total alchemy wins count
 * @returns {number} The highest threshold reached
 */
export function getHighestAlchemyWinsThreshold(totalWins) {
  const winsAchievements = getAlchemyWinsAchievements();
  let highest = 0;

  for (const achievement of winsAchievements) {
    if (totalWins >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get the highest alchemy first discovery threshold reached
 * @param {number} totalFirstDiscoveries - The player's total first discoveries count
 * @returns {number} The highest threshold reached
 */
export function getHighestAlchemyFirstDiscoveryThreshold(totalFirstDiscoveries) {
  const firstDiscoveryAchievements = getAlchemyFirstDiscoveryAchievements();
  let highest = 0;

  for (const achievement of firstDiscoveryAchievements) {
    if (totalFirstDiscoveries >= achievement.threshold && achievement.threshold > highest) {
      highest = achievement.threshold;
    }
  }

  return highest;
}

/**
 * Get all alchemy achievements that should be unlocked based on current stats
 * This is used for retroactive achievement checking (e.g., for existing users)
 * @param {Object} stats - Player alchemy stats object with longestStreak, totalCompleted, and firstDiscoveries
 * @returns {Array} Array of all achievements that qualify based on current stats
 */
export function getAllQualifyingAlchemyAchievements(stats) {
  const { longestStreak = 0, totalCompleted = 0, firstDiscoveries = 0 } = stats;
  const qualifyingAchievements = [];

  // Check all alchemy streak achievements
  const streakAchievements = getAlchemyStreakAchievements();
  for (const achievement of streakAchievements) {
    if (longestStreak >= achievement.threshold) {
      qualifyingAchievements.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'streak',
      });
    }
  }

  // Check all alchemy wins achievements
  const winsAchievements = getAlchemyWinsAchievements();
  for (const achievement of winsAchievements) {
    if (totalCompleted >= achievement.threshold) {
      qualifyingAchievements.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'wins',
      });
    }
  }

  // Check all alchemy first discovery achievements
  const firstDiscoveryAchievements = getAlchemyFirstDiscoveryAchievements();
  for (const achievement of firstDiscoveryAchievements) {
    if (firstDiscoveries >= achievement.threshold) {
      qualifyingAchievements.push({
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        threshold: achievement.threshold,
        type: 'firstDiscovery',
      });
    }
  }

  return qualifyingAchievements;
}
