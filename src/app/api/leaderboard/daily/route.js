import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import logger from '@/lib/logger';
import { captureUserCountry } from '@/lib/country-flag';

// Check if KV is available
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

const DAILY_LEADERBOARD_CACHE_TTL = 300; // 5 minutes

async function getCachedLeaderboard(cacheKey) {
  if (!isKvAvailable) return null;
  try {
    return await kv.get(cacheKey);
  } catch (error) {
    logger.error('[Leaderboard] Cache read error', { error: error.message, cacheKey });
    return null;
  }
}

async function setCachedLeaderboard(cacheKey, data) {
  if (!isKvAvailable) return;
  try {
    await kv.setex(cacheKey, DAILY_LEADERBOARD_CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    logger.error('[Leaderboard] Cache write error', { error: error.message, cacheKey });
  }
}

/**
 * Get authenticated user from either cookies or Authorization header
 * iOS apps send Bearer tokens, web uses cookies
 */
async function getAuthenticatedUser(request) {
  // First, try Bearer token from Authorization header (iOS/native)
  const authHeader =
    request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Create a Supabase client with the access token to verify it
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      // Return both user and a service client for database operations
      const serviceClient = createServerClient();
      return { user, supabase: serviceClient, source: 'bearer' };
    }
  }

  // Fall back to cookie-based auth (web)
  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return { user, supabase, source: 'cookie' };
  }

  return { user: null, supabase: null, source: null };
}

/**
 * GET /api/leaderboard/daily
 * Fetch daily speed leaderboard for a specific game/date
 *
 * Query params:
 * - game: 'tandem' | 'cryptic'
 * - date: 'YYYY-MM-DD'
 * - limit: number (default 10, max 100)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('game');
    const date = searchParams.get('date');
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10), 100);

    // Validation
    if (!gameType || !['tandem', 'mini', 'reel', 'soup'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
    }

    // Check cache for public leaderboard data
    const cacheKey = `lb:daily:${gameType}:${date}:${limit}`;
    const cached = await getCachedLeaderboard(cacheKey);
    let leaderboard;

    if (cached) {
      leaderboard = typeof cached === 'string' ? JSON.parse(cached) : cached;
    } else {
      // Use service client for public leaderboard data
      const supabase = createServerClient();

      // Call the database function to get leaderboard (includes avatar_image_path)
      const { data, error: leaderboardError } = await supabase.rpc('get_daily_leaderboard', {
        p_game_type: gameType,
        p_puzzle_date: date,
        p_limit: limit,
      });

      if (leaderboardError) {
        logger.error('[GET /api/leaderboard/daily] Error fetching leaderboard:', leaderboardError);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      leaderboard = data || [];
      setCachedLeaderboard(cacheKey, leaderboard);
    }

    // Also fetch current user's rank if authenticated (supports both cookie and Bearer token for iOS)
    const { user } = await getAuthenticatedUser(request);
    let userRank = null;

    if (user) {
      const supabase = createServerClient();
      const { data: rankData, error: rankError } = await supabase.rpc('get_user_daily_rank', {
        p_user_id: user.id,
        p_game_type: gameType,
        p_puzzle_date: date,
      });

      if (!rankError && rankData && rankData.length > 0) {
        userRank = rankData[0];
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard,
      userRank,
      gameType,
      date,
      total: leaderboard?.length || 0,
    });
  } catch (error) {
    logger.error('[GET /api/leaderboard/daily] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/daily
 * Submit a score to the daily speed leaderboard
 *
 * Body:
 * {
 *   gameType: 'tandem' | 'cryptic',
 *   puzzleDate: 'YYYY-MM-DD',
 *   score: number (time in seconds),
 *   metadata: { hintsUsed?, mistakes?, attempts? }
 * }
 *
 * Security features:
 * - Rate limiting (5 second cooldown between submissions)
 * - Score validation (1-7200 seconds)
 * - User authentication required
 * - Can only submit own scores
 * - Only updates if score improved
 */
export async function POST(request) {
  try {
    // Get authenticated user (supports both cookie and Bearer token auth for iOS)
    const { user, supabase, source } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(`[POST /api/leaderboard/daily] Auth source: ${source}, user: ${user.id}`);

    // Verify user has completed setup (has username) before allowing leaderboard entry.
    // This prevents "anonymous" entries from users who bypassed or haven't completed
    // the first-time setup flow (username + avatar selection).
    const { data: userProfile } = await supabase
      .from('users')
      .select('username, has_completed_first_time_setup')
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile?.username) {
      logger.warn('[POST /api/leaderboard/daily] Rejected: user has no username', {
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Please complete account setup (username) before appearing on leaderboards' },
        { status: 403 }
      );
    }

    // Capture country from Vercel geo header
    captureUserCountry(supabase, user.id, request).catch(() => {});

    const body = await request.json();
    const { gameType, puzzleDate, score, metadata = {} } = body;

    // Validation
    if (!gameType || !['tandem', 'mini', 'reel', 'soup'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!puzzleDate || !/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate)) {
      return NextResponse.json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
    }

    if (!score || typeof score !== 'number' || score <= 0 || score > 7200) {
      return NextResponse.json(
        { error: 'Invalid score (must be between 1 and 7200 seconds)' },
        { status: 400 }
      );
    }

    const { data: prefs } = await supabase
      .from('leaderboard_preferences')
      .select('enabled')
      .eq('user_id', user.id)
      .single();

    if (prefs && prefs.enabled === false) {
      return NextResponse.json({ error: 'Leaderboards disabled for this user' }, { status: 403 });
    }

    const { data: entryId, error: submitError } = await supabase.rpc('submit_leaderboard_score', {
      p_user_id: user.id,
      p_game_type: gameType,
      p_leaderboard_type: 'daily_speed',
      p_puzzle_date: puzzleDate,
      p_score: score,
      p_metadata: metadata,
    });

    // Invalidate cached leaderboard for this game/date
    if (isKvAvailable) {
      try {
        const keys = await kv.keys(`lb:daily:${gameType}:${puzzleDate}:*`);
        if (keys.length > 0) {
          await kv.del(...keys);
        }
      } catch (err) {
        logger.error('[POST /api/leaderboard/daily] Cache invalidation error:', err.message);
      }
    }

    if (submitError) {
      // Check for specific error messages
      if (submitError.message?.includes('Rate limit')) {
        return NextResponse.json({ error: 'Please wait before submitting again' }, { status: 429 });
      }
      if (submitError.message?.includes('Leaderboards disabled')) {
        return NextResponse.json({ error: 'Leaderboards are disabled' }, { status: 403 });
      }

      logger.error('[POST /api/leaderboard/daily] Error submitting score:', submitError);
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
    }

    // Fetch user's updated rank
    const { data: rankData } = await supabase.rpc('get_user_daily_rank', {
      p_user_id: user.id,
      p_game_type: gameType,
      p_puzzle_date: puzzleDate,
    });

    const userRank = rankData && rankData.length > 0 ? rankData[0] : null;

    return NextResponse.json({
      success: true,
      entryId,
      userRank,
      message: entryId ? 'Score submitted successfully' : 'Score not improved',
    });
  } catch (error) {
    logger.error('[POST /api/leaderboard/daily] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
