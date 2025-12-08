import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { createServerClient, createServerComponentClient } from '@/lib/supabase/server';
import { getPuzzleNumberForDate } from '@/lib/puzzleNumber';
import logger from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';

// Lazy load Redis client to avoid connection errors when env vars are missing
let redisClient = null;
async function getRedisClient() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[export] REDIS_URL not configured');
    return null;
  }

  try {
    redisClient = createClient({ url });
    await redisClient.connect();
    logger.info('[export] Connected to Redis');
    return redisClient;
  } catch (e) {
    logger.warn('[export] Failed to connect to Redis:', e.message);
    return null;
  }
}

// List of admin user IDs (add your Supabase user ID here)
const ADMIN_USER_IDS = [
  process.env.ADMIN_USER_ID, // Set in Vercel env vars
].filter(Boolean);

/**
 * GET /api/admin/puzzles/export
 * Export all puzzles from Vercel KV for backup or migration
 *
 * Query params:
 *   - format: 'json' (default) or 'migrate' (migrate directly to Supabase)
 *
 * Auth: Supports both Bearer token (API) and Supabase session (browser)
 */
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Try Bearer token auth first
    const authResult = await requireAdmin(request);
    logger.info('[export] Bearer auth result:', { hasError: !!authResult.error });

    // If Bearer auth fails, try Supabase session auth
    if (authResult.error) {
      logger.info('[export] Trying Supabase session auth...');
      // Use createServerComponentClient to read session cookies
      const supabaseAuth = await createServerComponentClient();
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser();

      logger.info('[export] Supabase user:', { userId: user?.id, email: user?.email });

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
      }

      // Check if user is admin (use service role client to bypass RLS)
      const supabaseService = createServerClient();
      const { data: userData } = await supabaseService
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin =
        userData?.role === 'admin' ||
        ADMIN_USER_IDS.includes(user.id) ||
        user.email?.endsWith('@playtandem.com');

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }

      logger.info(`[export] Admin access granted via Supabase session: ${user.email}`);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const puzzles = [];
    let source = 'none';

    // Try Redis first
    const redis = await getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys('puzzle:*');
        logger.info(`[export] Found ${keys.length} puzzle keys in Redis`);

        for (const key of keys) {
          try {
            const rawData = await redis.get(key);
            if (rawData) {
              const data = JSON.parse(rawData);
              const date = key.replace('puzzle:', '');
              puzzles.push({
                date,
                puzzleNumber: getPuzzleNumberForDate(date),
                ...data,
              });
            }
          } catch (error) {
            logger.error(`[export] Error fetching ${key}:`, error);
          }
        }
        source = 'redis';
      } catch (error) {
        logger.error('[export] Redis fetch error:', error);
      }
    }

    // Fall back to JSON files if KV didn't work
    if (puzzles.length === 0) {
      logger.info('[export] Trying JSON files fallback...');
      try {
        const allPuzzlesPath = path.join(process.cwd(), 'public', 'puzzles', 'all-puzzles.json');
        if (fs.existsSync(allPuzzlesPath)) {
          const data = JSON.parse(fs.readFileSync(allPuzzlesPath, 'utf8'));
          if (data.puzzles && Array.isArray(data.puzzles)) {
            for (const puzzle of data.puzzles) {
              if (puzzle.date) {
                puzzles.push({
                  date: puzzle.date,
                  puzzleNumber: getPuzzleNumberForDate(puzzle.date),
                  theme: puzzle.theme,
                  puzzles: puzzle.puzzles,
                });
              }
            }
            source = 'json';
            logger.info(`[export] Loaded ${puzzles.length} puzzles from all-puzzles.json`);
          }
        }
      } catch (error) {
        logger.error('[export] JSON file error:', error);
      }
    }

    if (puzzles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No puzzles found. Redis not configured and no JSON files available.',
        message:
          'Please set REDIS_URL in Vercel environment variables (copy from your Redis Cloud dashboard or .env.local).',
      });
    }

    // Sort by date
    puzzles.sort((a, b) => a.date.localeCompare(b.date));
    logger.info(`[export] Total puzzles to process: ${puzzles.length} (source: ${source})`);

    // If format is 'migrate', write directly to Supabase
    if (format === 'migrate') {
      const supabase = createServerClient();
      const results = { success: 0, failed: 0, errors: [] };

      for (const puzzle of puzzles) {
        try {
          const { error } = await supabase.from('tandem_puzzles').upsert(
            {
              date: puzzle.date,
              number: puzzle.puzzleNumber,
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
            results.failed++;
            results.errors.push({ date: puzzle.date, error: error.message });
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ date: puzzle.date, error: error.message });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Migrated ${results.success} puzzles to Supabase (source: ${source})`,
        migrated: results.success,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Limit error output
        totalFound: puzzles.length,
        source,
      });
    }

    // Default: return as JSON export
    return NextResponse.json({
      success: true,
      message: `Exported ${puzzles.length} puzzles (source: ${source})`,
      count: puzzles.length,
      source,
      exportedAt: new Date().toISOString(),
      puzzles,
    });
  } catch (error) {
    logger.error('GET /api/admin/puzzles/export error', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Export failed',
      },
      { status: 500 }
    );
  }
}
