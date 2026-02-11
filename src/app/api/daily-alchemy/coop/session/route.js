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
 * Helper to fetch user profile (username + avatar path)
 */
async function getUserProfile(supabase, userId) {
  const { data: profile } = await supabase
    .from('users')
    .select('username, selected_avatar_id')
    .eq('id', userId)
    .single();

  let avatarPath = null;
  if (profile?.selected_avatar_id) {
    const { data: avatar } = await supabase
      .from('avatars')
      .select('image_path')
      .eq('id', profile.selected_avatar_id)
      .single();
    avatarPath = avatar?.image_path || null;
  }

  return {
    username: profile?.username || 'Anonymous',
    avatarPath,
  };
}

/**
 * GET /api/daily-alchemy/coop/session?id=<sessionId>
 * Fetch current session state (used for reconnection/initial load)
 */
export async function GET(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { data: session, error: fetchError } = await supabase
      .from('alchemy_coop_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is a participant
    if (session.host_user_id !== user.id && session.partner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant of this session' }, { status: 403 });
    }

    // Fetch profiles for both players
    const hostProfile = await getUserProfile(supabase, session.host_user_id);
    const partnerProfile = session.partner_user_id
      ? await getUserProfile(supabase, session.partner_user_id)
      : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        inviteCode: session.invite_code,
        elementBank: session.element_bank || [],
        host: {
          userId: session.host_user_id,
          ...hostProfile,
        },
        partner: partnerProfile
          ? {
              userId: session.partner_user_id,
              ...partnerProfile,
            }
          : null,
        totalMoves: session.total_moves || 0,
        totalDiscoveries: session.total_discoveries || 0,
        firstDiscoveries: session.first_discoveries || 0,
        firstDiscoveryElements: session.first_discovery_elements || [],
        createdAt: session.created_at,
        startedAt: session.started_at,
      },
    });
  } catch (error) {
    logger.error('[Coop] Unexpected error in GET /api/daily-alchemy/coop/session', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
