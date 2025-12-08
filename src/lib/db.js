import { PUZZLE_TEMPLATES, FEEDBACK_STATUS, SUBMISSION_STATUS } from './constants';
import { createClient } from 'redis';
import { getPuzzleNumberForDate, getDateForPuzzleNumber } from './puzzleNumber';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

const SUBMISSION_STATUS_VALUES = Object.values(SUBMISSION_STATUS);

let redisClient = null;
const FEEDBACK_STATUS_VALUES = Object.values(FEEDBACK_STATUS);

// =============================================================================
// Puzzle Source Configuration
// =============================================================================
// PUZZLE_SOURCE controls where puzzles are read from and written to:
// - 'supabase': Use Supabase only (production after migration)
// - 'redis': Use Redis/JSON only (legacy, for rollback)
// - 'both': Try Supabase first, fall back to Redis (transition period)
const PUZZLE_SOURCE = process.env.PUZZLE_SOURCE || 'both';

// =============================================================================
// In-Memory Puzzle Cache (Industry Standard Pattern)
// =============================================================================
// Simple LRU-style cache for hot puzzle lookups
// Reduces database queries for frequently accessed puzzles
const puzzleCache = new Map();
const PUZZLE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PUZZLE_CACHE_MAX_SIZE = 50; // Max puzzles to keep in memory

/**
 * Get puzzle from in-memory cache
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object|null} Cached puzzle or null
 */
function getCachedPuzzle(date) {
  const cached = puzzleCache.get(date);
  if (cached && Date.now() - cached.timestamp < PUZZLE_CACHE_TTL_MS) {
    return cached.puzzle;
  }
  // Expired or not found
  if (cached) {
    puzzleCache.delete(date);
  }
  return null;
}

/**
 * Set puzzle in in-memory cache
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} puzzle - Puzzle object to cache
 */
function setCachedPuzzle(date, puzzle) {
  // Cleanup old entries if cache is full
  if (puzzleCache.size >= PUZZLE_CACHE_MAX_SIZE) {
    // Remove oldest entry (first in Map)
    const oldestKey = puzzleCache.keys().next().value;
    puzzleCache.delete(oldestKey);
  }

  puzzleCache.set(date, {
    puzzle,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate puzzle cache for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 */
function invalidatePuzzleCache(date) {
  puzzleCache.delete(date);
}

// =============================================================================
// Supabase Puzzle Functions
// =============================================================================

/**
 * Transform Supabase row to application puzzle format
 * @param {Object} row - Supabase tandem_puzzles row
 * @returns {Object} Application puzzle format
 */
function transformSupabasePuzzle(row) {
  if (!row) return null;

  return {
    date: row.date,
    puzzleNumber: row.number,
    theme: row.theme,
    puzzles: row.clues, // JSONB array already in correct format
    difficultyRating: row.difficulty_rating,
    difficultyFactors: row.difficulty_factors,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Get puzzle from Supabase by date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Puzzle or null if not found
 */
async function getPuzzleFromSupabase(date) {
  try {
    // Check in-memory cache first
    const cached = getCachedPuzzle(date);
    if (cached) {
      logger.info(`[puzzle-cache] Hit for ${date}`);
      return cached;
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('tandem_puzzles')
      .select('*')
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is expected for dates without puzzles
        return null;
      }
      logger.error('Supabase puzzle fetch error', error);
      return null;
    }

    const puzzle = transformSupabasePuzzle(data);

    // Cache the result
    if (puzzle) {
      setCachedPuzzle(date, puzzle);
    }

    return puzzle;
  } catch (error) {
    logger.error('getPuzzleFromSupabase error', error);
    return null;
  }
}

/**
 * Save puzzle to Supabase
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} puzzle - Puzzle object to save
 * @returns {Promise<boolean>} Success status
 */
async function setPuzzleToSupabase(date, puzzle) {
  try {
    const supabase = createServerClient();
    const puzzleNumber = getPuzzleNumberForDate(date);

    const { error } = await supabase.from('tandem_puzzles').upsert(
      {
        date,
        number: puzzleNumber,
        theme: puzzle.theme,
        clues: puzzle.puzzles.map((p) => ({
          emoji: p.emoji,
          answer: p.answer,
          hint: p.hint || '',
        })),
        difficulty_rating: puzzle.difficultyRating || null,
        difficulty_factors: puzzle.difficultyFactors || null,
        created_by: puzzle.createdBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

    if (error) {
      logger.error('Supabase puzzle save error', error);
      throw error;
    }

    // Invalidate cache for this date
    invalidatePuzzleCache(date);

    return true;
  } catch (error) {
    logger.error('setPuzzleToSupabase error', error);
    throw error;
  }
}

/**
 * Delete puzzle from Supabase
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<boolean>} Success status
 */
async function deletePuzzleFromSupabase(date) {
  try {
    const supabase = createServerClient();

    const { error } = await supabase.from('tandem_puzzles').delete().eq('date', date);

    if (error) {
      logger.error('Supabase puzzle delete error', error);
      throw error;
    }

    // Invalidate cache for this date
    invalidatePuzzleCache(date);

    return true;
  } catch (error) {
    logger.error('deletePuzzleFromSupabase error', error);
    throw error;
  }
}

/**
 * Get puzzles in date range from Supabase (efficient single query)
 * @param {string} startDate - Start date YYYY-MM-DD
 * @param {string} endDate - End date YYYY-MM-DD
 * @returns {Promise<Object>} Object keyed by date
 */
async function getPuzzlesRangeFromSupabase(startDate, endDate) {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('tandem_puzzles')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      logger.error('Supabase puzzles range error', error);
      return {};
    }

    // Transform to object keyed by date
    const puzzles = {};
    for (const row of data || []) {
      const puzzle = transformSupabasePuzzle(row);
      if (puzzle) {
        puzzles[row.date] = puzzle;
        // Also cache each puzzle
        setCachedPuzzle(row.date, puzzle);
      }
    }

    return puzzles;
  } catch (error) {
    logger.error('getPuzzlesRangeFromSupabase error', error);
    return {};
  }
}

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
  feedback: {
    entries: {},
    order: [],
  },
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

    // ==========================================================================
    // Phase 1: Try Supabase (when enabled)
    // ==========================================================================
    if (PUZZLE_SOURCE === 'supabase' || PUZZLE_SOURCE === 'both') {
      puzzle = await getPuzzleFromSupabase(date);
      if (puzzle) {
        return ensureHintStructure(puzzle);
      }
    }

    // ==========================================================================
    // Phase 2: Fall back to Redis/JSON (during transition or for rollback)
    // ==========================================================================
    if (PUZZLE_SOURCE === 'redis' || PUZZLE_SOURCE === 'both') {
      // Check Redis
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

      if (puzzle) {
        return ensureHintStructure(puzzle);
      }
    }

    // ==========================================================================
    // Phase 3: Template fallback (always available as safety net)
    // ==========================================================================
    const templatePuzzle = getDailyPuzzleFromTemplates(date);
    puzzle = {
      ...templatePuzzle,
      date,
      puzzleNumber: getPuzzleNumberForDate(date),
    };

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
 * Decodes HTML entities that may have been incorrectly encoded
 * @param {string} text - Text to decode
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text;

  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };

  return text.replace(
    /&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g,
    (entity) => entities[entity] || entity
  );
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
    // Decode theme if it contains HTML entities
    theme: decodeHtmlEntities(puzzle.theme),
    puzzles: puzzle.puzzles.map((p) => ({
      emoji: p.emoji,
      answer: p.answer,

      hint: decodeHtmlEntities(p.hint || ''),
    })),
    // Preserve difficulty metadata if present
    difficultyRating: puzzle.difficultyRating,
    difficultyFactors: puzzle.difficultyFactors,
  };
}

export async function setPuzzleForDate(date, puzzle) {
  try {
    const puzzleWithMetadata = {
      ...puzzle,
      puzzles: puzzle.puzzles.map((p, index) => ({
        ...p,
        // Preserve existing hint if present, or set to empty string
        hint: p.hint || puzzle.hints?.[index] || '',
      })),
      // Preserve difficulty rating and factors if provided
      difficultyRating: puzzle.difficultyRating || null,
      difficultyFactors: puzzle.difficultyFactors || null,
    };

    // Remove the separate hints array if it exists (migrated into puzzle objects)
    delete puzzleWithMetadata.hints;

    // ==========================================================================
    // Write to Supabase (when enabled)
    // ==========================================================================
    if (PUZZLE_SOURCE === 'supabase' || PUZZLE_SOURCE === 'both') {
      await setPuzzleToSupabase(date, puzzleWithMetadata);
    }

    // ==========================================================================
    // Dual-write to Redis during transition (for rollback safety)
    // ==========================================================================
    if (PUZZLE_SOURCE === 'redis' || PUZZLE_SOURCE === 'both') {
      const redis = await getRedisClient();

      if (redis) {
        await redis.set(`puzzle:${date}`, JSON.stringify(puzzleWithMetadata), {
          EX: 60 * 60 * 24 * 365,
        });
      } else {
        inMemoryDB.puzzles[date] = puzzleWithMetadata;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error setting puzzle', error);
    throw error;
  }
}

export async function deletePuzzleForDate(date) {
  try {
    // ==========================================================================
    // Delete from Supabase (when enabled)
    // ==========================================================================
    if (PUZZLE_SOURCE === 'supabase' || PUZZLE_SOURCE === 'both') {
      await deletePuzzleFromSupabase(date);
    }

    // ==========================================================================
    // Delete from Redis during transition (for consistency)
    // ==========================================================================
    if (PUZZLE_SOURCE === 'redis' || PUZZLE_SOURCE === 'both') {
      const redis = await getRedisClient();

      if (redis) {
        await redis.del(`puzzle:${date}`);
      } else {
        delete inMemoryDB.puzzles[date];
      }
    }

    return true;
  } catch (error) {
    logger.error('Error deleting puzzle', error);
    throw error;
  }
}

export async function getPuzzlesRange(startDate, endDate) {
  const puzzles = {};

  // ==========================================================================
  // Phase 1: Try Supabase (efficient single query when enabled)
  // ==========================================================================
  if (PUZZLE_SOURCE === 'supabase' || PUZZLE_SOURCE === 'both') {
    try {
      const supabasePuzzles = await getPuzzlesRangeFromSupabase(startDate, endDate);
      Object.assign(puzzles, supabasePuzzles);

      // If Supabase-only mode and we got results, return them
      if (PUZZLE_SOURCE === 'supabase') {
        return puzzles;
      }
    } catch (error) {
      logger.error('Error getting puzzles from Supabase', error);
    }
  }

  // ==========================================================================
  // Phase 2: Fall back to Redis/JSON (fill gaps during transition)
  // ==========================================================================
  if (PUZZLE_SOURCE === 'redis' || PUZZLE_SOURCE === 'both') {
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

        // Skip if already have from Supabase
        if (puzzles[dateStr]) continue;

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
      logger.error('Error getting puzzles range from Redis/JSON', error);
    }
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
      const isNew = await redis.sAdd(playerKey, sessionId);
      if (isNew) {
        await redis.hIncrBy(dailyKey, 'uniquePlayers', 1);
        await redis.hIncrBy('stats', 'uniquePlayers', 1);
      }

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

function getEmptyFeedbackCounts() {
  return FEEDBACK_STATUS_VALUES.reduce(
    (acc, status) => ({
      ...acc,
      [status]: 0,
    }),
    {}
  );
}

export async function createFeedbackEntry(entry) {
  const supabase = createServerClient();

  // Log the category being inserted for debugging

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      id: entry.id,
      user_id: entry.userId,
      category: entry.category,
      message: entry.message,
      email: entry.email,
      allow_contact: entry.allowContact,
      platform: entry.platform || 'web',
      user_agent: entry.userAgent || null,
      status: entry.status,
      admin_notes: null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create feedback entry in Supabase', error);
    console.error('[createFeedbackEntry] Full error details:', error);
    throw new Error(`Failed to create feedback entry: ${error.message}`);
  }

  return transformFeedbackEntry(data);
}

// Helper to transform Supabase feedback entry to camelCase
function transformFeedbackEntry(entry) {
  if (!entry) return null;

  // Parse comments from JSON or create empty array
  let comments = [];
  if (entry.comments) {
    // If comments field exists and has data, use it
    comments = Array.isArray(entry.comments) ? entry.comments : [];
  } else if (entry.admin_notes) {
    // Fallback: if only admin_notes exists (old format), show as single comment
    comments = [
      {
        id: 'legacy',
        author: 'Admin',
        message: entry.admin_notes,
        createdAt: entry.updated_at || entry.created_at,
      },
    ];
  }

  return {
    id: entry.id,
    userId: entry.user_id,
    username: entry.username || 'Unknown',
    email: entry.email,
    category: entry.category,
    message: entry.message,
    allowContact: entry.allow_contact,
    platform: entry.platform,
    userAgent: entry.user_agent,
    status: entry.status,
    adminNotes: entry.admin_notes,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    comments,
  };
}

export async function getFeedbackEntryById(id) {
  const supabase = createServerClient();

  const { data, error } = await supabase.from('feedback').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    logger.error('Failed to get feedback entry from Supabase', error);
    throw new Error('Failed to get feedback entry');
  }

  // Fetch username separately
  if (data?.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', data.user_id)
      .single();

    data.username = userData?.username || null;
  }

  return transformFeedbackEntry(data);
}

export async function getFeedbackEntries({ status = null, limit = 100 } = {}) {
  const supabase = createServerClient();

  let query = supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== null) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to get feedback entries from Supabase', error);
    throw new Error('Failed to get feedback entries');
  }

  // Fetch usernames for each feedback entry
  const entriesWithUsername = await Promise.all(
    (data || []).map(async (entry) => {
      // Try to fetch username from users table
      if (entry.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', entry.user_id)
          .single();

        entry.username = userData?.username || null;
      }
      return entry;
    })
  );

  return entriesWithUsername.map(transformFeedbackEntry);
}

export async function updateFeedbackEntry(id, updates = {}) {
  const supabase = createServerClient();

  if (updates.status && !FEEDBACK_STATUS_VALUES.includes(updates.status)) {
    throw new Error('Invalid feedback status');
  }

  // Map camelCase to snake_case for Supabase
  const dbUpdates = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) dbUpdates.status = updates.status;
  if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;

  const { data, error } = await supabase
    .from('feedback')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update feedback entry in Supabase', error);
    throw new Error('Failed to update feedback entry');
  }

  return transformFeedbackEntry(data);
}

export async function addFeedbackComment(id, comment) {
  const supabase = createServerClient();

  // Get current entry
  const { data: entry, error: fetchError } = await supabase
    .from('feedback')
    .select('comments')
    .eq('id', id)
    .single();

  if (fetchError || !entry) {
    logger.error('Failed to get feedback entry for comment', fetchError);
    return null;
  }

  // Get existing comments or initialize empty array
  const existingComments = Array.isArray(entry.comments) ? entry.comments : [];

  // Add new comment to array
  const updatedComments = [...existingComments, comment];

  const { data, error } = await supabase
    .from('feedback')
    .update({
      comments: updatedComments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to add comment to feedback', error);
    throw new Error('Failed to add comment');
  }

  // Fetch username separately
  if (data?.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', data.user_id)
      .single();

    data.username = userData?.username || null;
  }

  return transformFeedbackEntry(data);
}

export async function getFeedbackStatusCounts() {
  const supabase = createServerClient();

  const { data, error } = await supabase.from('feedback').select('status');

  if (error) {
    logger.error('Failed to get feedback status counts from Supabase', error);
    return getEmptyFeedbackCounts();
  }

  const counts = getEmptyFeedbackCounts();

  data.forEach((entry) => {
    if (entry.status && counts[entry.status] !== undefined) {
      counts[entry.status]++;
    }
  });

  return counts;
}

// ==========================================
// User Submitted Puzzles Functions
// ==========================================

function getEmptySubmissionCounts() {
  return SUBMISSION_STATUS_VALUES.reduce(
    (acc, status) => ({
      ...acc,
      [status]: 0,
    }),
    {}
  );
}

// Helper to transform submission entry to camelCase
function transformSubmissionEntry(entry, groups = [], movies = {}) {
  if (!entry) return null;

  return {
    id: entry.id,
    userId: entry.user_id,
    username: entry.username,
    displayName: entry.display_name,
    isAnonymous: entry.is_anonymous,
    status: entry.status,
    adminNotes: entry.admin_notes,
    submittedAt: entry.submitted_at,
    reviewedAt: entry.reviewed_at,
    reviewedBy: entry.reviewed_by,
    groups: groups.map((group) => ({
      id: group.id,
      connection: group.connection,
      difficulty: group.difficulty,
      order: group.order,
      movies: (movies[group.id] || []).map((movie) => ({
        id: movie.id,
        imdbId: movie.imdb_id,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        order: movie.order,
      })),
    })),
  };
}

/**
 * Check if user has subscription
 */
export async function checkUserSubscription(userId) {
  const supabase = createServerClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Subscription check error', error);
    return { isActive: false };
  }

  const isActive = subscription && subscription.status === 'active';
  const isExpired =
    subscription && subscription.current_period_end
      ? new Date(subscription.current_period_end) < new Date()
      : false;

  return {
    isActive: isActive && !isExpired,
    tier: subscription?.tier || null,
  };
}

/**
 * Get count of submissions user made today
 */
export async function getUserDailySubmissionCount(userId) {
  const supabase = createServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('user_submitted_puzzles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('submitted_at', todayStart.toISOString());

  if (error) {
    logger.error('Failed to get user daily submission count', error);
    return 0;
  }

  return count || 0;
}

/**
 * Create a new puzzle submission
 */
export async function createPuzzleSubmission(submission) {
  const supabase = createServerClient();

  // Insert the main submission
  const { data: puzzleData, error: puzzleError } = await supabase
    .from('user_submitted_puzzles')
    .insert({
      id: submission.id,
      user_id: submission.userId,
      username: submission.username,
      display_name: submission.displayName,
      is_anonymous: submission.isAnonymous,
      status: SUBMISSION_STATUS.PENDING,
    })
    .select()
    .single();

  if (puzzleError) {
    logger.error('Failed to create puzzle submission', puzzleError);
    throw new Error(`Failed to create submission: ${puzzleError.message}`);
  }

  // Insert groups
  for (const group of submission.groups) {
    const { data: groupData, error: groupError } = await supabase
      .from('user_submitted_puzzle_groups')
      .insert({
        submission_id: puzzleData.id,
        connection: group.connection,
        difficulty: group.difficulty,
        order: group.order,
      })
      .select()
      .single();

    if (groupError) {
      logger.error('Failed to create puzzle group', groupError);
      // Clean up: delete the submission
      await supabase.from('user_submitted_puzzles').delete().eq('id', puzzleData.id);
      throw new Error(`Failed to create group: ${groupError.message}`);
    }

    // Insert movies for this group
    const movieInserts = group.movies.map((movie) => ({
      group_id: groupData.id,
      imdb_id: movie.imdbId,
      title: movie.title,
      year: movie.year || null,
      poster: movie.poster || null,
      order: movie.order,
    }));

    const { error: moviesError } = await supabase
      .from('user_submitted_puzzle_movies')
      .insert(movieInserts);

    if (moviesError) {
      logger.error('Failed to create puzzle movies', moviesError);
      // Clean up: delete the submission (cascade will handle groups and movies)
      await supabase.from('user_submitted_puzzles').delete().eq('id', puzzleData.id);
      throw new Error(`Failed to create movies: ${moviesError.message}`);
    }
  }

  // Fetch the complete submission with groups and movies
  return getSubmissionById(puzzleData.id);
}

/**
 * Get a submission by ID with all groups and movies
 */
export async function getSubmissionById(id) {
  const supabase = createServerClient();

  // Get the submission
  const { data: submission, error: submissionError } = await supabase
    .from('user_submitted_puzzles')
    .select('*')
    .eq('id', id)
    .single();

  if (submissionError) {
    if (submissionError.code === 'PGRST116') return null;
    logger.error('Failed to get submission', submissionError);
    throw new Error('Failed to get submission');
  }

  // Get groups
  const { data: groups, error: groupsError } = await supabase
    .from('user_submitted_puzzle_groups')
    .select('*')
    .eq('submission_id', id)
    .order('order');

  if (groupsError) {
    logger.error('Failed to get submission groups', groupsError);
    throw new Error('Failed to get submission groups');
  }

  // Get movies for all groups
  const groupIds = groups.map((g) => g.id);
  const { data: movies, error: moviesError } = await supabase
    .from('user_submitted_puzzle_movies')
    .select('*')
    .in('group_id', groupIds)
    .order('order');

  if (moviesError) {
    logger.error('Failed to get submission movies', moviesError);
    throw new Error('Failed to get submission movies');
  }

  // Group movies by group_id
  const moviesByGroup = {};
  movies.forEach((movie) => {
    if (!moviesByGroup[movie.group_id]) {
      moviesByGroup[movie.group_id] = [];
    }
    moviesByGroup[movie.group_id].push(movie);
  });

  return transformSubmissionEntry(submission, groups, moviesByGroup);
}

/**
 * Get submissions with optional status filter
 */
export async function getSubmissions({ status = null, limit = 100 } = {}) {
  const supabase = createServerClient();

  let query = supabase
    .from('user_submitted_puzzles')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (status !== null) {
    query = query.eq('status', status);
  }

  const { data: submissions, error: submissionsError } = await query;

  if (submissionsError) {
    logger.error('Failed to get submissions', submissionsError);
    throw new Error('Failed to get submissions');
  }

  // Fetch groups and movies for each submission
  const results = await Promise.all(
    submissions.map(async (submission) => {
      const { data: groups } = await supabase
        .from('user_submitted_puzzle_groups')
        .select('*')
        .eq('submission_id', submission.id)
        .order('order');

      const groupIds = (groups || []).map((g) => g.id);
      let movies = [];
      if (groupIds.length > 0) {
        const { data: moviesData } = await supabase
          .from('user_submitted_puzzle_movies')
          .select('*')
          .in('group_id', groupIds)
          .order('order');
        movies = moviesData || [];
      }

      const moviesByGroup = {};
      movies.forEach((movie) => {
        if (!moviesByGroup[movie.group_id]) {
          moviesByGroup[movie.group_id] = [];
        }
        moviesByGroup[movie.group_id].push(movie);
      });

      return transformSubmissionEntry(submission, groups || [], moviesByGroup);
    })
  );

  return results;
}

/**
 * Update a submission's status and/or admin notes
 */
export async function updateSubmission(id, updates = {}) {
  const supabase = createServerClient();

  if (updates.status && !SUBMISSION_STATUS_VALUES.includes(updates.status)) {
    throw new Error('Invalid submission status');
  }

  const dbUpdates = {};
  if (updates.status) {
    dbUpdates.status = updates.status;
    dbUpdates.reviewed_at = new Date().toISOString();
  }
  if (updates.adminNotes !== undefined) {
    dbUpdates.admin_notes = updates.adminNotes;
  }
  if (updates.reviewedBy) {
    dbUpdates.reviewed_by = updates.reviewedBy;
  }

  const { error } = await supabase.from('user_submitted_puzzles').update(dbUpdates).eq('id', id);

  if (error) {
    logger.error('Failed to update submission', error);
    throw new Error('Failed to update submission');
  }

  return getSubmissionById(id);
}

/**
 * Get submission status counts
 */
export async function getSubmissionStatusCounts() {
  const supabase = createServerClient();

  const { data, error } = await supabase.from('user_submitted_puzzles').select('status');

  if (error) {
    logger.error('Failed to get submission status counts', error);
    return getEmptySubmissionCounts();
  }

  const counts = getEmptySubmissionCounts();

  data.forEach((entry) => {
    if (entry.status && counts[entry.status] !== undefined) {
      counts[entry.status]++;
    }
  });

  return counts;
}
