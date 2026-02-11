import { NextResponse } from 'next/server';
import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

/**
 * Get authenticated user from either cookies or Authorization header
 */
async function getAuthenticatedUser(request) {
  const authHeader =
    request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) {
      return { user, supabase: createServerClient(), source: 'bearer' };
    }
  }

  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!error && user) {
    return { user, supabase: createServerClient(), source: 'cookie' };
  }

  return { user: null, supabase: null, source: null };
}

/**
 * POST /api/daily-alchemy/coop/join
 * Join a co-op session via invite code
 * Body:
 * - inviteCode: string (6-char code)
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

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

    // Fetch host's profile info
    const { data: hostProfile } = await supabase
      .from('users')
      .select('username, selected_avatar_id')
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
        elementBank: session.element_bank || [],
        status: 'active',
        totalMoves: session.total_moves || 0,
        totalDiscoveries: session.total_discoveries || 0,
        firstDiscoveries: session.first_discoveries || 0,
        firstDiscoveryElements: session.first_discovery_elements || [],
      },
    });
  } catch (error) {
    logger.error('[Coop] Unexpected error in POST /api/daily-alchemy/coop/join', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
