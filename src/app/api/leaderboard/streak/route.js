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

const STREAK_LEADERBOARD_CACHE_TTL = 3600; // 1 hour (streaks change less frequently)

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
    await kv.setex(cacheKey, STREAK_LEADERBOARD_CACHE_TTL, JSON.stringify(data));
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
 * GET /api/leaderboard/streak
 * Fetch all-time best streak leaderboard for a specific game
 *
 * Query params:
 * - game: 'tandem' | 'cryptic' | 'mini'
 * - limit: number (default 10, max 100)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('game');
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10), 100);

    // Validation
    if (!gameType || !['tandem', 'mini', 'reel', 'soup'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    // Check cache for public leaderboard data
    const cacheKey = `lb:streak:${gameType}:${limit}`;
    const cached = await getCachedLeaderboard(cacheKey);
    let leaderboard;

    if (cached) {
      leaderboard = typeof cached === 'string' ? JSON.parse(cached) : cached;
    } else {
      // Use service client for public leaderboard data
      const supabase = createServerClient();

      // Call the database function to get streak leaderboard (includes avatar_image_path)
      const { data, error: leaderboardError } = await supabase.rpc('get_streak_leaderboard', {
        p_game_type: gameType,
        p_limit: limit,
      });

      if (leaderboardError) {
        logger.error('[GET /api/leaderboard/streak] Error fetching leaderboard:', leaderboardError);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      leaderboard = data || [];
      setCachedLeaderboard(cacheKey, leaderboard);
    }

    // Also fetch current user's rank/streak if authenticated (supports both cookie and Bearer token for iOS)
    const { user } = await getAuthenticatedUser(request);
    let userEntry = null;

    if (user) {
      const supabase = createServerClient();
      const { data: entry, error: entryError } = await supabase
        .from('leaderboard_entries')
        .select('score, created_at')
        .eq('user_id', user.id)
        .eq('game_type', gameType)
        .eq('leaderboard_type', 'best_streak')
        .single();

      if (!entryError && entry) {
        const { count } = await supabase
          .from('leaderboard_entries')
          .select('*', { count: 'exact', head: true })
          .eq('game_type', gameType)
          .eq('leaderboard_type', 'best_streak')
          .gt('score', entry.score);

        userEntry = {
          score: entry.score,
          rank: (count || 0) + 1,
        };
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard,
      userEntry,
      gameType,
      total: leaderboard?.length || 0,
    });
  } catch (error) {
    logger.error('[GET /api/leaderboard/streak] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/streak
 * Submit a best streak to the leaderboard
 *
 * Body:
 * {
 *   gameType: 'tandem' | 'cryptic' | 'mini',
 *   streak: number
 * }
 *
 * Security features:
 * - Rate limiting (5 second cooldown)
 * - Streak validation (1-10000)
 * - User authentication required
 * - Can only submit own streak
 * - Only updates if streak improved
 */
export async function POST(request) {
  try {
    // Get authenticated user (supports both cookie and Bearer token auth for iOS)
    const { user, supabase, source } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(`[POST /api/leaderboard/streak] Auth source: ${source}, user: ${user.id}`);

    // Verify user has completed setup (has username) before allowing leaderboard entry.
    // This prevents "anonymous" entries from users who bypassed or haven't completed
    // the first-time setup flow (username + avatar selection).
    const { data: userProfile } = await supabase
      .from('users')
      .select('username, has_completed_first_time_setup')
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile?.username) {
      logger.warn('[POST /api/leaderboard/streak] Rejected: user has no username', {
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
    const { gameType, streak } = body;

    // Validation
    if (!gameType || !['tandem', 'mini', 'reel', 'soup'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!streak || typeof streak !== 'number' || streak <= 0 || streak > 10000) {
      return NextResponse.json(
        { error: 'Invalid streak (must be between 1 and 10000)' },
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

    // For streak leaderboards, we use today's date as a placeholder
    const today = new Date().toISOString().split('T')[0];
    const { data: entryId, error: submitError } = await supabase.rpc('submit_leaderboard_score', {
      p_user_id: user.id,
      p_game_type: gameType,
      p_leaderboard_type: 'best_streak',
      p_puzzle_date: today,
      p_score: streak,
      p_metadata: {},
    });

    // Invalidate cached streak leaderboard for this game
    if (isKvAvailable) {
      try {
        const keys = await kv.keys(`lb:streak:${gameType}:*`);
        if (keys.length > 0) {
          await kv.del(...keys);
        }
      } catch (err) {
        logger.error('[POST /api/leaderboard/streak] Cache invalidation error:', err.message);
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

      logger.error('[POST /api/leaderboard/streak] Error submitting streak:', submitError);
      return NextResponse.json({ error: 'Failed to submit streak' }, { status: 500 });
    }

    // Fetch user's updated rank
    const { data: entry } = await supabase
      .from('leaderboard_entries')
      .select('score')
      .eq('user_id', user.id)
      .eq('game_type', gameType)
      .eq('leaderboard_type', 'best_streak')
      .single();

    let userRank = null;
    if (entry) {
      const { count } = await supabase
        .from('leaderboard_entries')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', gameType)
        .eq('leaderboard_type', 'best_streak')
        .gt('score', entry.score);

      userRank = {
        score: entry.score,
        rank: (count || 0) + 1,
      };
    }

    return NextResponse.json({
      success: true,
      entryId,
      userRank,
      message: entryId ? 'Streak submitted successfully' : 'Streak not improved',
    });
  } catch (error) {
    logger.error('[POST /api/leaderboard/streak] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
