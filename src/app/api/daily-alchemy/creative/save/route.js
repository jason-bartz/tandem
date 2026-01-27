import { NextResponse } from 'next/server';
import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
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
    // Use service client for database operations to bypass RLS
    const serviceClient = createServerClient();
    return { user, supabase: serviceClient, source: 'cookie' };
  }

  return { user: null, supabase: null, source: null };
}

/**
 * GET /api/daily-alchemy/creative/save
 * Load user's Creative Mode save
 * Returns the saved element bank and stats if exists
 */
export async function GET(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's creative mode save
    const { data: save, error: fetchError } = await supabase
      .from('daily_alchemy_creative_saves')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      logger.error('[DailyAlchemy] Failed to fetch creative save', { error: fetchError });
      return NextResponse.json({ error: 'Failed to fetch save' }, { status: 500 });
    }

    if (!save) {
      return NextResponse.json({
        success: true,
        hasSave: false,
        save: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasSave: true,
      save: {
        elementBank: save.element_bank || [],
        totalMoves: save.total_moves || 0,
        totalDiscoveries: save.total_discoveries || 0,
        firstDiscoveries: save.first_discoveries || 0,
        firstDiscoveryElements: save.first_discovery_elements || [],
        lastPlayedAt: save.last_played_at,
        createdAt: save.created_at,
      },
    });
  } catch (error) {
    logger.error('[DailyAlchemy] Unexpected error in GET /api/daily-alchemy/creative/save', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/daily-alchemy/creative/save
 * Save user's Creative Mode progress
 * Body:
 * - elementBank: Array<{name: string, emoji: string, isStarter: boolean}>
 * - totalMoves: number
 * - totalDiscoveries: number
 * - firstDiscoveries: number
 * - firstDiscoveryElements: string[]
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { elementBank, totalMoves, totalDiscoveries, firstDiscoveries, firstDiscoveryElements } =
      body;

    if (!elementBank || !Array.isArray(elementBank)) {
      return NextResponse.json({ error: 'Missing required field: elementBank' }, { status: 400 });
    }

    // Upsert the save (create or update)
    const { error: saveError } = await supabase.from('daily_alchemy_creative_saves').upsert(
      {
        user_id: user.id,
        element_bank: elementBank,
        total_moves: totalMoves || 0,
        total_discoveries: totalDiscoveries || 0,
        first_discoveries: firstDiscoveries || 0,
        first_discovery_elements: firstDiscoveryElements || [],
        last_played_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (saveError) {
      logger.error('[DailyAlchemy] Failed to save creative mode progress', { error: saveError });
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    logger.info('[DailyAlchemy] Creative mode save successful', {
      userId: user.id,
      elementCount: elementBank.length,
    });

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[DailyAlchemy] Unexpected error in POST /api/daily-alchemy/creative/save', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/daily-alchemy/creative/save
 * Clear user's Creative Mode save (reset to fresh state)
 */
export async function DELETE(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the save
    const { error: deleteError } = await supabase
      .from('daily_alchemy_creative_saves')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('[DailyAlchemy] Failed to delete creative save', { error: deleteError });
      return NextResponse.json({ error: 'Failed to clear save' }, { status: 500 });
    }

    logger.info('[DailyAlchemy] Creative mode save cleared', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Creative mode save cleared',
    });
  } catch (error) {
    logger.error('[DailyAlchemy] Unexpected error in DELETE /api/daily-alchemy/creative/save', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
