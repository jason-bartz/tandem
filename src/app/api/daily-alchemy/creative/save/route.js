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
 * Parse and validate a slot number (1-3), returning the value or a default of 1
 */
function parseSlotNumber(value) {
  const slot = parseInt(value, 10);
  if (isNaN(slot) || slot < 1 || slot > 3) return null;
  return slot;
}

/**
 * GET /api/daily-alchemy/creative/save?slot=1
 * Load user's Creative Mode save for a specific slot
 * Returns the saved element bank and stats if exists
 */
export async function GET(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slotParam = searchParams.get('slot');
    const slot = slotParam ? parseSlotNumber(slotParam) : 1;

    if (!slot) {
      return NextResponse.json({ error: 'Invalid slot number (must be 1-3)' }, { status: 400 });
    }

    // Get the user's creative mode save for this slot
    const { data: save, error: fetchError } = await supabase
      .from('daily_alchemy_creative_saves')
      .select('*')
      .eq('user_id', user.id)
      .eq('slot_number', slot)
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
        favorites: save.favorites || [],
        slotNumber: save.slot_number,
        slotName: save.slot_name || null,
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
 * - slotNumber: number (1-3, default 1)
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
    const {
      slotNumber: rawSlot,
      elementBank,
      totalMoves,
      totalDiscoveries,
      firstDiscoveries,
      firstDiscoveryElements,
      favorites,
    } = body;

    const slotNumber = rawSlot ? parseSlotNumber(rawSlot) : 1;
    if (!slotNumber) {
      return NextResponse.json({ error: 'Invalid slot number (must be 1-3)' }, { status: 400 });
    }

    if (!elementBank || !Array.isArray(elementBank)) {
      return NextResponse.json({ error: 'Missing required field: elementBank' }, { status: 400 });
    }

    // Upsert the save (create or update)
    const { error: saveError } = await supabase.from('daily_alchemy_creative_saves').upsert(
      {
        user_id: user.id,
        slot_number: slotNumber,
        element_bank: elementBank,
        total_moves: totalMoves || 0,
        total_discoveries: totalDiscoveries || 0,
        first_discoveries: firstDiscoveries || 0,
        first_discovery_elements: firstDiscoveryElements || [],
        favorites: Array.isArray(favorites) ? favorites : [],
        last_played_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id, slot_number',
      }
    );

    if (saveError) {
      logger.error('[DailyAlchemy] Failed to save creative mode progress', { error: saveError });
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    logger.info('[DailyAlchemy] Creative mode save successful', {
      userId: user.id,
      slotNumber,
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
 * PATCH /api/daily-alchemy/creative/save
 * Rename a creative mode save slot
 * Body:
 * - slotNumber: number (1-3)
 * - name: string (max 30 chars, or null to reset)
 */
export async function PATCH(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotNumber: rawSlot, name } = body;

    const slotNumber = parseSlotNumber(rawSlot);
    if (!slotNumber) {
      return NextResponse.json({ error: 'Invalid slot number (must be 1-3)' }, { status: 400 });
    }

    // Validate name
    const trimmedName = name ? String(name).trim().slice(0, 30) : null;

    const { error: updateError, count } = await supabase
      .from('daily_alchemy_creative_saves')
      .update({ slot_name: trimmedName }, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('slot_number', slotNumber);

    if (updateError) {
      logger.error('[DailyAlchemy] Failed to rename creative save slot', { error: updateError });
      return NextResponse.json({ error: 'Failed to rename slot' }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Save slot not found' }, { status: 404 });
    }

    logger.info('[DailyAlchemy] Creative mode slot renamed', {
      userId: user.id,
      slotNumber,
      name: trimmedName,
    });

    return NextResponse.json({
      success: true,
      slotNumber,
      name: trimmedName,
    });
  } catch (error) {
    logger.error('[DailyAlchemy] Unexpected error in PATCH /api/daily-alchemy/creative/save', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/daily-alchemy/creative/save?slot=1
 * Clear user's Creative Mode save for a specific slot
 */
export async function DELETE(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slotParam = searchParams.get('slot');
    const slot = slotParam ? parseSlotNumber(slotParam) : 1;

    if (!slot) {
      return NextResponse.json({ error: 'Invalid slot number (must be 1-3)' }, { status: 400 });
    }

    // Delete the save for this slot
    const { error: deleteError } = await supabase
      .from('daily_alchemy_creative_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('slot_number', slot);

    if (deleteError) {
      logger.error('[DailyAlchemy] Failed to delete creative save', { error: deleteError });
      return NextResponse.json({ error: 'Failed to clear save' }, { status: 500 });
    }

    logger.info('[DailyAlchemy] Creative mode save cleared', { userId: user.id, slot });

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
