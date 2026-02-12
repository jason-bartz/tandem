import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import logger from '@/lib/logger';

/**
 * POST /api/daily-alchemy/coop/save
 * Save the current co-op session state to a player's creative save slot
 * Body:
 * - sessionId: string
 * - saveSlot: number (1-3)
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request, 'coop/save');

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      saveSlot,
      elementBank,
      totalMoves,
      totalDiscoveries,
      firstDiscoveries,
      firstDiscoveryElements,
      favorites,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!elementBank || !Array.isArray(elementBank)) {
      return NextResponse.json({ error: 'Element bank is required' }, { status: 400 });
    }

    const slot = parseInt(saveSlot, 10);
    if (isNaN(slot) || slot < 1 || slot > 3) {
      return NextResponse.json({ error: 'Invalid save slot (must be 1-3)' }, { status: 400 });
    }

    // Fetch session and verify participation
    const { data: session, error: fetchError } = await supabase
      .from('alchemy_coop_sessions')
      .select('id, host_user_id, partner_user_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_user_id !== user.id && session.partner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant of this session' }, { status: 403 });
    }

    // Save the client's current element bank to their creative save slot
    const { error: saveError } = await supabase.from('daily_alchemy_creative_saves').upsert(
      {
        user_id: user.id,
        slot_number: slot,
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
      logger.error('[Coop] Failed to save session to creative slot', { error: saveError });
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    logger.info('[Coop] Session saved to creative slot', {
      sessionId,
      userId: user.id,
      slot,
      elementCount: elementBank.length,
    });

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Coop] Unexpected error in POST /api/daily-alchemy/coop/save', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
