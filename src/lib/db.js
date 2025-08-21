import { PUZZLE_TEMPLATES } from './constants';
import { createClient } from 'redis';

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
        token
      });
    } else if (url) {
      // Standard Redis configuration
      redisClient = createClient({
        url
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
    completed: 0
  }
};

function getDailyPuzzleFromTemplates(date) {
  const dateObj = new Date(date);
  const daysSinceStart = Math.floor((dateObj - new Date('2025-01-01')) / (1000 * 60 * 60 * 24));
  const templateIndex = daysSinceStart % PUZZLE_TEMPLATES.length;
  return PUZZLE_TEMPLATES[templateIndex];
}

export async function getPuzzleForDate(date) {
  try {
    // First, check database (edited puzzles take priority)
    const redis = await getRedisClient();
    
    if (redis) {
      const puzzle = await redis.get(`puzzle:${date}`);
      if (puzzle) {
        console.log(`Loaded puzzle from database: ${date}`);
        return JSON.parse(puzzle);
      }
    } else {
      if (inMemoryDB.puzzles[date]) {
        return inMemoryDB.puzzles[date];
      }
    }
    
    // Then try to load from JSON file (original puzzles)
    try {
      const fs = require('fs');
      const path = require('path');
      const puzzleFile = path.join(process.cwd(), 'public', 'puzzles', `${date}.json`);
      if (fs.existsSync(puzzleFile)) {
        const puzzleData = JSON.parse(fs.readFileSync(puzzleFile, 'utf8'));
        console.log(`Loaded puzzle from file: ${date}`);
        return puzzleData;
      }
    } catch (fileError) {
      // File doesn't exist or couldn't be read, continue to other methods
    }
    
    // Finally, fall back to template puzzles
    const templatePuzzle = getDailyPuzzleFromTemplates(date);
    const { getPuzzleNumber } = require('./utils');
    return {
      ...templatePuzzle,
      date,
      puzzleNumber: getPuzzleNumber(date)
    };
  } catch (error) {
    console.error('Error getting puzzle:', error);
    return getDailyPuzzleFromTemplates(date);
  }
}

export async function setPuzzleForDate(date, puzzle) {
  try {
    const redis = await getRedisClient();
    
    if (redis) {
      await redis.set(`puzzle:${date}`, JSON.stringify(puzzle), { EX: 60 * 60 * 24 * 365 });
    } else {
      inMemoryDB.puzzles[date] = puzzle;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting puzzle:', error);
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
    console.error('Error deleting puzzle:', error);
    throw error;
  }
}

export async function getPuzzlesRange(startDate, endDate) {
  const puzzles = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  
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
      
      // If not in database, try to load from JSON file
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
    console.error('Error getting puzzles range:', error);
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
    console.error('Error incrementing stats:', error);
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
        completed: parseInt(stats.completed) || 0
      };
    } else {
      return { ...inMemoryDB.stats };
    }
  } catch (error) {
    console.error('Error getting stats:', error);
    return { views: 0, played: 0, completed: 0 };
  }
}