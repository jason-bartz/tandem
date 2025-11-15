import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { createClient } from 'redis';
import logger from '@/lib/logger';

/**
 * Admin endpoint to clear puzzles stored for future dates
 * This fixes issues where puzzles were incorrectly stored ahead of schedule
 */

export async function POST(request) {
  try {
    // Apply rate limiting for write operations
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Verify admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    let redisClient = null;

    try {
      // Connect to Redis
      const url = process.env.KV_REST_API_URL || process.env.REDIS_URL;
      const token = process.env.KV_REST_API_TOKEN;

      if (!url) {
        return NextResponse.json({
          success: false,
          error: 'No Redis configured - no puzzles to clear',
        });
      }

      if (url && token) {
        redisClient = createClient({ url, token });
      } else if (url) {
        redisClient = createClient({ url });
      }

      await redisClient.connect();

      // Get all puzzle keys
      const keys = await redisClient.keys('puzzle:*');

      // Today's date (October 13, 2025)
      const today = new Date('2025-10-13');
      const todayStr = today.toISOString().split('T')[0];

      const results = {
        deleted: [],
        kept: [],
        errors: [],
      };

      for (const key of keys) {
        try {
          const date = key.replace('puzzle:', '');
          const puzzleDate = new Date(date);

          // Delete puzzles for dates after October 13, 2025
          if (puzzleDate > today) {
            await redisClient.del(key);
            results.deleted.push(date);
          } else {
            results.kept.push(date);
          }
        } catch (error) {
          results.errors.push({ key, error: error.message });
        }
      }

      if (global.puzzleCache) {
        global.puzzleCache = {};
      }

      return NextResponse.json({
        success: true,
        message: 'Future puzzles cleared successfully',
        currentDate: todayStr,
        currentPuzzleNumber: 60,
        summary: {
          totalKeys: keys.length,
          deleted: results.deleted.length,
          kept: results.kept.length,
          errors: results.errors.length,
        },
        details: results,
      });
    } finally {
      if (redisClient) {
        await redisClient.quit();
      }
    }
  } catch (error) {
    logger.error('POST /api/admin/clear-future-puzzles error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear future puzzles',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Verify admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    let redisClient = null;

    try {
      // Connect to Redis
      const url = process.env.KV_REST_API_URL || process.env.REDIS_URL;
      const token = process.env.KV_REST_API_TOKEN;

      if (!url) {
        return NextResponse.json({
          success: true,
          message: 'No Redis configured',
          puzzles: [],
        });
      }

      if (url && token) {
        redisClient = createClient({ url, token });
      } else if (url) {
        redisClient = createClient({ url });
      }

      await redisClient.connect();

      // Get all puzzle keys
      const keys = await redisClient.keys('puzzle:*');

      // Today's date (October 13, 2025)
      const today = new Date('2025-10-13');
      const todayStr = today.toISOString().split('T')[0];

      const futurePuzzles = [];
      const currentPuzzles = [];

      for (const key of keys) {
        const date = key.replace('puzzle:', '');
        const puzzleDate = new Date(date);

        if (puzzleDate > today) {
          futurePuzzles.push(date);
        } else {
          currentPuzzles.push(date);
        }
      }

      return NextResponse.json({
        success: true,
        currentDate: todayStr,
        currentPuzzleNumber: 60,
        totalPuzzles: keys.length,
        futurePuzzles: futurePuzzles.sort(),
        currentPuzzles: currentPuzzles.sort(),
        needsCleaning: futurePuzzles.length > 0,
      });
    } finally {
      if (redisClient) {
        await redisClient.quit();
      }
    }
  } catch (error) {
    logger.error('GET /api/admin/clear-future-puzzles error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check puzzles',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
