import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

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
 * GET /api/leaderboard/preferences
 * Fetch current user's leaderboard preferences
 */
export async function GET(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('leaderboard_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user doesn't have preferences yet)
      logger.error('[GET /api/leaderboard/preferences] Error fetching preferences:', prefsError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return default preferences if none exist
    const preferences = prefs || {
      enabled: true,
      show_on_global: true,
    };

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    logger.error('[GET /api/leaderboard/preferences] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/preferences
 * Update current user's leaderboard preferences
 *
 * Body:
 * {
 *   enabled?: boolean,
 *   showOnGlobal?: boolean
 * }
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, showOnGlobal } = body;

    // Validation
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    if (showOnGlobal !== undefined && typeof showOnGlobal !== 'boolean') {
      return NextResponse.json({ error: 'showOnGlobal must be a boolean' }, { status: 400 });
    }

    // Build update object
    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (showOnGlobal !== undefined) updates.show_on_global = showOnGlobal;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Upsert preferences
    const { data: prefs, error: upsertError } = await supabase
      .from('leaderboard_preferences')
      .upsert(
        {
          user_id: user.id,
          ...updates,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      logger.error('[POST /api/leaderboard/preferences] Error updating preferences:', upsertError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    logger.error('[POST /api/leaderboard/preferences] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
