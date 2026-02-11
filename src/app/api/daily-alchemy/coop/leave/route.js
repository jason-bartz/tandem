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
 * POST /api/daily-alchemy/coop/leave
 * Leave/end a co-op session
 * Body:
 * - sessionId: string
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify user is a participant
    const { data: session, error: fetchError } = await supabase
      .from('alchemy_coop_sessions')
      .select('id, host_user_id, partner_user_id, status')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_user_id !== user.id && session.partner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant of this session' }, { status: 403 });
    }

    if (session.status === 'ended') {
      return NextResponse.json({ success: true, message: 'Session already ended' });
    }

    // End the session
    const { error: updateError } = await supabase
      .from('alchemy_coop_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      logger.error('[Coop] Failed to end session', { error: updateError });
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
    }

    logger.info('[Coop] Session ended', {
      sessionId,
      endedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Session ended',
    });
  } catch (error) {
    logger.error('[Coop] Unexpected error in POST /api/daily-alchemy/coop/leave', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
