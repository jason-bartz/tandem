import { PUZZLE_TEMPLATES } from './constants';
import { createClient } from 'redis';
import { getPuzzleNumberForDate, getDateForPuzzleNumber } from './puzzleNumber';
import logger from '@/lib/logger';

let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    // Use KV_REST_API_URL if available (Vercel KV), otherwise use standard Redis URL
    const url = process.env.KV_REST_API_URL || process.env.REDIS_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (url && token) {
      // Vercel KV configuration
      redisClient = createClient({
        url,
        token,
      });
    } else if (url) {
      // Standard Redis configuration
      redisClient = createClient({
        url,
      });
    } else {
      // No Redis available, will use in-memory
      return null;
    }

    if (redisClient) {
      await redisClient.connect();
    }
  }
  return redisClient;
}

const inMemoryDB = {
  puzzles: {},
  stats: {
    views: 0,
    played: 0,
    completed: 0,
    uniquePlayers: 0,
    totalTime: 0,
    perfectGames: 0,
    hintsUsed: 0,
    gamesShared: 0,
  },
  puzzleStats: {},
  dailyStats: {},
  playerSessions: new Set(),
};

function getDailyPuzzleFromTemplates(date) {
  const dateObj = new Date(date);
  const daysSinceStart = Math.floor((dateObj - new Date('2025-08-15')) / (1000 * 60 * 60 * 24));
  const templateIndex = daysSinceStart % PUZZLE_TEMPLATES.length;
  return PUZZLE_TEMPLATES[templateIndex];
}

export async function getPuzzleForDate(date) {
  try {
    let puzzle = null;

    // First, check database (edited puzzles take priority)
    const redis = await getRedisClient();

    if (redis) {
      const puzzleData = await redis.get(`puzzle:${date}`);
      if (puzzleData) {
        puzzle = JSON.parse(puzzleData);
      }
    } else {
      if (inMemoryDB.puzzles[date]) {
        puzzle = inMemoryDB.puzzles[date];
      }
    }

    // Then try to load from all-puzzles.json
    if (!puzzle) {
      try {
        const fs = require('fs');
        const path = require('path');
        const allPuzzlesFile = path.join(process.cwd(), 'public', 'puzzles', 'all-puzzles.json');
        if (fs.existsSync(allPuzzlesFile)) {
          const data = JSON.parse(fs.readFileSync(allPuzzlesFile, 'utf8'));
          if (data.puzzles && Array.isArray(data.puzzles)) {
            const foundPuzzle = data.puzzles.find((p) => p.date === date);
            if (foundPuzzle) {
              puzzle = {
                theme: foundPuzzle.theme,
                puzzles: foundPuzzle.puzzles,
              };
            }
          }
        }
      } catch (fileError) {
        // File doesn't exist or couldn't be read, continue to other methods
      }
    }

    // Then try individual JSON file
    if (!puzzle) {
      try {
        const fs = require('fs');
        const path = require('path');
        const puzzleFile = path.join(process.cwd(), 'public', 'puzzles', `${date}.json`);
        if (fs.existsSync(puzzleFile)) {
          const puzzleData = JSON.parse(fs.readFileSync(puzzleFile, 'utf8'));
          puzzle = puzzleData;
        }
      } catch (fileError) {
        // File doesn't exist or couldn't be read, continue to other methods
      }
    }

    // Finally, fall back to template puzzles
    if (!puzzle) {
      const templatePuzzle = getDailyPuzzleFromTemplates(date);
      puzzle = {
        ...templatePuzzle,
        date,
        puzzleNumber: getPuzzleNumberForDate(date),
      };
    }

    // Ensure hint structure exists for all puzzles
    return ensureHintStructure(puzzle);
  } catch (error) {
    logger.error('Error getting puzzle', error);
    const fallback = getDailyPuzzleFromTemplates(date);
    return ensureHintStructure({
      ...fallback,
      date,
      puzzleNumber: getPuzzleNumberForDate(date),
    });
  }
}

/**
 * Get puzzle by either date string or puzzle number
 * Supports backward compatibility with date-based lookups
 * and new puzzle number system
 *
 * @param {string|number} identifier - Date (YYYY-MM-DD) or puzzle number
 * @returns {Promise<Object>} Puzzle object with puzzleNumber and date
 */
export async function getPuzzle(identifier) {
  try {
    // Determine if identifier is a puzzle number or date string
    const isNumber = typeof identifier === 'number' || /^\d+$/.test(String(identifier));

    let date;
    let puzzleNumber;

    if (isNumber) {
      // Convert puzzle number to date
      puzzleNumber = parseInt(identifier);
      date = getDateForPuzzleNumber(puzzleNumber);
    } else {
      // Use date directly
      date = identifier;
      puzzleNumber = getPuzzleNumberForDate(date);
    }

    // Get puzzle data using existing function
    const puzzle = await getPuzzleForDate(date);

    // Ensure puzzle has both date and number
    if (puzzle) {
      puzzle.puzzleNumber = puzzleNumber;
      puzzle.date = date;
    }

    return puzzle;
  } catch (error) {
    logger.error('Error getting puzzle', error);
    throw error;
  }
}

/**
 * Validates hint quality and appropriateness
 * @param {string} hint - The hint text
 * @param {string} answer - The answer the hint is for
 * @returns {boolean} Whether the hint is valid
 */
export function validateHint(hint, answer) {
  if (!hint || typeof hint !== 'string') return false;

  // Check length (should fit on one line on mobile)
  if (hint.length > 60) return false;
  if (hint.length < 3) return false;

  // Hint shouldn't contain the answer
  const normalizedHint = hint.toLowerCase();
  const normalizedAnswer = answer.toLowerCase();
  if (normalizedHint.includes(normalizedAnswer)) return false;

  // Hint should be different from answer
  if (normalizedHint === normalizedAnswer) return false;

  return true;
}

/**
 * Ensures puzzle has valid hint structure
 * @param {Object} puzzle - The puzzle object
 * @returns {Object} Puzzle with validated hints
 */
export function ensureHintStructure(puzzle) {
  if (!puzzle || !puzzle.puzzles) return puzzle;

  return {
    ...puzzle,
    puzzles: puzzle.puzzles.map((p) => ({
      emoji: p.emoji,
      answer: p.answer,
      hint: p.hint || '', // Ensure hint field exists, even if empty
    })),
  };
}

export async function setPuzzleForDate(date, puzzle) {
  try {
    // Ensure puzzle structure includes hints if provided
    const puzzleWithHints = {
      ...puzzle,
      puzzles: puzzle.puzzles.map((p, index) => ({
        ...p,
        // Preserve existing hint if present, or set to empty string
        hint: p.hint || puzzle.hints?.[index] || '',
      })),
    };

    // Remove the separate hints array if it exists (migrated into puzzle objects)
    delete puzzleWithHints.hints;

    const redis = await getRedisClient();

    if (redis) {
      await redis.set(`puzzle:${date}`, JSON.stringify(puzzleWithHints), {
        EX: 60 * 60 * 24 * 365,
      });
    } else {
      inMemoryDB.puzzles[date] = puzzleWithHints;
    }

    return true;
  } catch (error) {
    logger.error('Error setting puzzle', error);
    throw error;
  }
}

export async function deletePuzzleForDate(date) {
  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.del(`puzzle:${date}`);
    } else {
      delete inMemoryDB.puzzles[date];
    }

    return true;
  } catch (error) {
    logger.error('Error deleting puzzle', error);
    throw error;
  }
}

export async function getPuzzlesRange(startDate, endDate) {
  const puzzles = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Load all-puzzles.json once at the start
  const allPuzzlesData = {};
  try {
    const fs = require('fs');
    const path = require('path');
    const allPuzzlesFile = path.join(process.cwd(), 'public', 'puzzles', 'all-puzzles.json');
    if (fs.existsSync(allPuzzlesFile)) {
      const data = JSON.parse(fs.readFileSync(allPuzzlesFile, 'utf8'));
      // Convert array to object keyed by date
      if (data.puzzles && Array.isArray(data.puzzles)) {
        data.puzzles.forEach((puzzle) => {
          allPuzzlesData[puzzle.date] = puzzle;
        });
      }
    }
  } catch (error) {
    logger.error('Error loading all-puzzles.json', error);
  }

  try {
    const redis = await getRedisClient();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      let puzzleFound = false;

      // First check database (edited puzzles take priority)
      if (redis) {
        const puzzleData = await redis.get(`puzzle:${dateStr}`);
        if (puzzleData) {
          puzzles[dateStr] = JSON.parse(puzzleData);
          puzzleFound = true;
        }
      } else {
        if (inMemoryDB.puzzles[dateStr]) {
          puzzles[dateStr] = inMemoryDB.puzzles[dateStr];
          puzzleFound = true;
        }
      }

      // If not in database, check all-puzzles.json data
      if (!puzzleFound && allPuzzlesData[dateStr]) {
        puzzles[dateStr] = {
          theme: allPuzzlesData[dateStr].theme,
          puzzles: allPuzzlesData[dateStr].puzzles,
        };
        puzzleFound = true;
      }

      // Finally, try individual JSON file
      if (!puzzleFound) {
        try {
          const fs = require('fs');
          const path = require('path');
          const puzzleFile = path.join(process.cwd(), 'public', 'puzzles', `${dateStr}.json`);
          if (fs.existsSync(puzzleFile)) {
            const puzzleData = JSON.parse(fs.readFileSync(puzzleFile, 'utf8'));
            puzzles[dateStr] = puzzleData;
          }
        } catch (fileError) {
          // File doesn't exist, skip
        }
      }
    }
  } catch (error) {
    logger.error('Error getting puzzles range', error);
  }

  return puzzles;
}

export async function incrementStats(stat) {
  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.hIncrBy('stats', stat, 1);
    } else {
      if (inMemoryDB.stats[stat] !== undefined) {
        inMemoryDB.stats[stat]++;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error incrementing stats', error);
    return false;
  }
}

export async function getStats() {
  try {
    const redis = await getRedisClient();

    if (redis) {
      const stats = await redis.hGetAll('stats');
      return {
        views: parseInt(stats.views) || 0,
        played: parseInt(stats.played) || 0,
        completed: parseInt(stats.completed) || 0,
        uniquePlayers: parseInt(stats.uniquePlayers) || 0,
        totalTime: parseInt(stats.totalTime) || 0,
        perfectGames: parseInt(stats.perfectGames) || 0,
        hintsUsed: parseInt(stats.hintsUsed) || 0,
        gamesShared: parseInt(stats.gamesShared) || 0,
      };
    } else {
      return {
        ...inMemoryDB.stats,
        uniquePlayers: inMemoryDB.stats.uniquePlayers || 0,
        totalTime: inMemoryDB.stats.totalTime || 0,
        perfectGames: inMemoryDB.stats.perfectGames || 0,
        hintsUsed: inMemoryDB.stats.hintsUsed || 0,
        gamesShared: inMemoryDB.stats.gamesShared || 0,
      };
    }
  } catch (error) {
    logger.error('Error getting stats', error);
    return {
      views: 0,
      played: 0,
      completed: 0,
      uniquePlayers: 0,
      totalTime: 0,
      perfectGames: 0,
      hintsUsed: 0,
      gamesShared: 0,
    };
  }
}

export async function updatePuzzleStats(date, stats) {
  try {
    const redis = await getRedisClient();
    const key = `puzzle_stats:${date}`;

    if (redis) {
      // Increment puzzle-specific stats
      if (stats.played) {
        await redis.hIncrBy(key, 'played', 1);
      }
      if (stats.completed) {
        await redis.hIncrBy(key, 'completed', 1);
      }
      if (stats.time) {
        await redis.hIncrBy(key, 'totalTime', stats.time);
        await redis.hIncrBy(key, 'timeCount', 1);
      }
      if (stats.mistakes !== undefined) {
        await redis.hIncrBy(key, 'totalMistakes', stats.mistakes);
        if (stats.mistakes === 0) {
          await redis.hIncrBy(key, 'perfectGames', 1);
        }
      }
      if (stats.hintsUsed) {
        await redis.hIncrBy(key, 'hintsUsed', stats.hintsUsed);
      }
      if (stats.shared) {
        await redis.hIncrBy(key, 'shared', 1);
      }

      // Set expiry to 1 year
      await redis.expire(key, 365 * 24 * 60 * 60);
    } else {
      // In-memory fallback
      if (!inMemoryDB.puzzleStats[date]) {
        inMemoryDB.puzzleStats[date] = {
          played: 0,
          completed: 0,
          totalTime: 0,
          timeCount: 0,
          totalMistakes: 0,
          perfectGames: 0,
          hintsUsed: 0,
          shared: 0,
        };
      }

      const puzzleStats = inMemoryDB.puzzleStats[date];
      if (stats.played) {
        puzzleStats.played++;
      }
      if (stats.completed) {
        puzzleStats.completed++;
      }
      if (stats.time) {
        puzzleStats.totalTime += stats.time;
        puzzleStats.timeCount++;
      }
      if (stats.mistakes !== undefined) {
        puzzleStats.totalMistakes += stats.mistakes;
        if (stats.mistakes === 0) {
          puzzleStats.perfectGames++;
        }
      }
      if (stats.hintsUsed) {
        puzzleStats.hintsUsed += stats.hintsUsed;
      }
      if (stats.shared) {
        puzzleStats.shared++;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error updating puzzle stats', error);
    return false;
  }
}

export async function getPuzzleStats(date) {
  try {
    const redis = await getRedisClient();
    const key = `puzzle_stats:${date}`;

    if (redis) {
      const stats = await redis.hGetAll(key);
      if (!stats || Object.keys(stats).length === 0) {
        return null;
      }

      const played = parseInt(stats.played) || 0;
      const completed = parseInt(stats.completed) || 0;
      const timeCount = parseInt(stats.timeCount) || 0;
      const totalTime = parseInt(stats.totalTime) || 0;
      const totalMistakes = parseInt(stats.totalMistakes) || 0;

      return {
        played,
        completed,
        completionRate: played > 0 ? Math.round((completed / played) * 100) : 0,
        averageTime: timeCount > 0 ? Math.round(totalTime / timeCount) : 0,
        averageMistakes: played > 0 ? (totalMistakes / played).toFixed(1) : 0,
        perfectGames: parseInt(stats.perfectGames) || 0,
        hintsUsed: parseInt(stats.hintsUsed) || 0,
        shared: parseInt(stats.shared) || 0,
      };
    } else {
      const stats = inMemoryDB.puzzleStats[date];
      if (!stats) {
        return null;
      }

      return {
        played: stats.played,
        completed: stats.completed,
        completionRate: stats.played > 0 ? Math.round((stats.completed / stats.played) * 100) : 0,
        averageTime: stats.timeCount > 0 ? Math.round(stats.totalTime / stats.timeCount) : 0,
        averageMistakes: stats.played > 0 ? (stats.totalMistakes / stats.played).toFixed(1) : 0,
        perfectGames: stats.perfectGames,
        hintsUsed: stats.hintsUsed,
        shared: stats.shared,
      };
    }
  } catch (error) {
    logger.error('Error getting puzzle stats', error);
    return null;
  }
}

export async function getPopularPuzzles(limit = 5) {
  try {
    await getRedisClient(); // Ensure redis is initialized
    const allStats = [];

    // Get stats for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const stats = await getPuzzleStats(dateStr);

      if (stats && stats.played >= 10) {
        // Only include puzzles with at least 10 plays
        const puzzle = await getPuzzleForDate(dateStr);
        allStats.push({
          date: dateStr,
          theme: puzzle?.theme || 'Unknown Theme',
          completionRate: stats.completionRate,
          played: stats.played,
          completed: stats.completed,
        });
      }
    }

    // Sort by completion rate and return top puzzles
    allStats.sort((a, b) => b.completionRate - a.completionRate);
    return allStats.slice(0, limit);
  } catch (error) {
    logger.error('Error getting popular puzzles', error);
    return [];
  }
}

export async function getDailyActivity(days = 7) {
  try {
    const redis = await getRedisClient();
    const activity = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const key = `daily_stats:${dateStr}`;

      if (redis) {
        const stats = await redis.hGetAll(key);
        activity.push({
          date: dateStr,
          plays: parseInt(stats.plays) || 0,
          completions: parseInt(stats.completions) || 0,
          uniquePlayers: parseInt(stats.uniquePlayers) || 0,
        });
      } else {
        const stats = inMemoryDB.dailyStats[dateStr] || {};
        activity.push({
          date: dateStr,
          plays: stats.plays || 0,
          completions: stats.completions || 0,
          uniquePlayers: stats.uniquePlayers || 0,
        });
      }
    }

    return activity;
  } catch (error) {
    logger.error('Error getting daily activity', error);
    return [];
  }
}

export async function trackUniquePlayer(sessionId) {
  try {
    const redis = await getRedisClient();
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `daily_stats:${today}`;
    const playerKey = `players:${today}`;

    if (redis) {
      // Check if player is new today
      const isNew = await redis.sAdd(playerKey, sessionId);
      if (isNew) {
        await redis.hIncrBy(dailyKey, 'uniquePlayers', 1);
        await redis.hIncrBy('stats', 'uniquePlayers', 1);
      }

      // Set expiry on player set
      await redis.expire(playerKey, 7 * 24 * 60 * 60); // 7 days
      await redis.expire(dailyKey, 30 * 24 * 60 * 60); // 30 days
    } else {
      // In-memory fallback
      if (!inMemoryDB.dailyStats[today]) {
        inMemoryDB.dailyStats[today] = {
          plays: 0,
          completions: 0,
          uniquePlayers: 0,
        };
      }

      const playerSetKey = `${today}:players`;
      if (!inMemoryDB.playerSessions[playerSetKey]) {
        inMemoryDB.playerSessions[playerSetKey] = new Set();
      }

      if (!inMemoryDB.playerSessions[playerSetKey].has(sessionId)) {
        inMemoryDB.playerSessions[playerSetKey].add(sessionId);
        inMemoryDB.dailyStats[today].uniquePlayers++;
        inMemoryDB.stats.uniquePlayers++;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error tracking unique player', error);
    return false;
  }
}

export async function updateDailyStats(stat) {
  try {
    const redis = await getRedisClient();
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_stats:${today}`;

    if (redis) {
      await redis.hIncrBy(key, stat, 1);
      await redis.expire(key, 30 * 24 * 60 * 60); // 30 days expiry
    } else {
      if (!inMemoryDB.dailyStats[today]) {
        inMemoryDB.dailyStats[today] = {
          plays: 0,
          completions: 0,
          uniquePlayers: 0,
        };
      }

      if (inMemoryDB.dailyStats[today][stat] !== undefined) {
        inMemoryDB.dailyStats[today][stat]++;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error updating daily stats', error);
    return false;
  }
}
