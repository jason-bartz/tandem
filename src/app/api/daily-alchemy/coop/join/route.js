import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import logger from '@/lib/logger';
import { captureUserCountry } from '@/lib/country-flag';

/**
 * POST /api/daily-alchemy/coop/join
 * Join a co-op session via invite code
 * Body:
 * - inviteCode: string (6-char code)
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request, 'coop/join');

    if (!user || !supabase) {
      return NextResponse.json(
        { error: 'You must be logged in to join a co-op game' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Capture joiner's country from Vercel geo header
    const { countryFlag: yourCountryFlag } = await captureUserCountry(supabase, user.id, request);

    const normalizedCode = inviteCode.toUpperCase().trim();

    if (normalizedCode.length !== 6) {
      return NextResponse.json({ error: 'Invalid invite code format' }, { status: 400 });
    }

    // Find the session by invite code
    const { data: session, error: fetchError } = await supabase
      .from('alchemy_coop_sessions')
      .select('*')
      .eq('invite_code', normalizedCode)
      .eq('status', 'waiting')
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    // Can't join your own session
    if (session.host_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot join your own session' }, { status: 400 });
    }

    // Session already has a partner
    if (session.partner_user_id) {
      return NextResponse.json({ error: 'Session already has a partner' }, { status: 409 });
    }

    // Claim the session
    const { error: updateError } = await supabase
      .from('alchemy_coop_sessions')
      .update({
        partner_user_id: user.id,
        status: 'active',
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('status', 'waiting'); // Extra check to prevent race condition

    if (updateError) {
      logger.error('[Coop] Failed to join session', { error: updateError });
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }

    // Fetch host's profile info (including country flag)
    const { data: hostProfile } = await supabase
      .from('users')
      .select('username, selected_avatar_id, country_flag')
      .eq('id', session.host_user_id)
      .single();

    let hostAvatarPath = null;
    if (hostProfile?.selected_avatar_id) {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('image_path')
        .eq('id', hostProfile.selected_avatar_id)
        .single();
      hostAvatarPath = avatar?.image_path || null;
    }

    logger.info('[Coop] Partner joined session', {
      sessionId: session.id,
      partnerId: user.id,
      hostId: session.host_user_id,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        hostUsername: hostProfile?.username || 'Anonymous',
        hostAvatarPath,
        hostCountryFlag: hostProfile?.country_flag || null,
        elementBank: session.element_bank || [],
        status: 'active',
        mode: session.mode || 'creative',
        totalMoves: session.total_moves || 0,
        totalDiscoveries: session.total_discoveries || 0,
        firstDiscoveries: session.first_discoveries || 0,
        firstDiscoveryElements: session.first_discovery_elements || [],
      },
      yourCountryFlag,
    });
  } catch (error) {
    logger.error('[Coop] Unexpected error in POST /api/daily-alchemy/coop/join', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
