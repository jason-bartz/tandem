import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import logger from '@/lib/logger';

/**
 * POST /api/daily-alchemy/coop/leave
 * Leave/end a co-op session
 * Body:
 * - sessionId: string
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request, 'coop/leave');

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
