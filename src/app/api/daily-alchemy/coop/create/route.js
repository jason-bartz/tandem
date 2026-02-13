import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS, COOP_CONFIG } from '@/lib/daily-alchemy.constants';

/**
 * Generate a random invite code using unambiguous characters
 */
function generateInviteCode() {
  const chars = COOP_CONFIG.INVITE_CODE_CHARS;
  let code = '';
  for (let i = 0; i < COOP_CONFIG.INVITE_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/daily-alchemy/coop/create
 * Create a new co-op session with an invite code
 * Body:
 * - saveSlot?: number (1-3, optional - loads element bank from creative save)
 * - mode?: string ('daily' | 'creative', default 'creative')
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request, 'coop/create');

    if (!user || !supabase) {
      return NextResponse.json(
        { error: 'You must be logged in to create a co-op game' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { saveSlot, mode } = body;
    const sessionMode = mode === 'daily' ? 'daily' : 'creative';

    // End any existing waiting sessions by this host
    await supabase
      .from('alchemy_coop_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('host_user_id', user.id)
      .eq('status', 'waiting');

    // Load element bank - daily mode always uses starters, creative can load from save
    let elementBank = STARTER_ELEMENTS.map((e) => ({
      name: e.name,
      emoji: e.emoji,
      isStarter: true,
    }));
    let hostFavorites = [];

    if (sessionMode === 'creative' && saveSlot && saveSlot >= 1 && saveSlot <= 3) {
      const { data: save } = await supabase
        .from('daily_alchemy_creative_saves')
        .select('element_bank, favorites')
        .eq('user_id', user.id)
        .eq('slot_number', saveSlot)
        .single();

      if (save?.element_bank?.length > 0) {
        elementBank = save.element_bank;
      }
      if (Array.isArray(save?.favorites)) {
        hostFavorites = save.favorites;
      }
    }

    // Generate unique invite code with retry
    let inviteCode;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      inviteCode = generateInviteCode();
      const { data: existing } = await supabase
        .from('alchemy_coop_sessions')
        .select('id')
        .eq('invite_code', inviteCode)
        .eq('status', 'waiting')
        .single();

      if (!existing) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      logger.error('[Coop] Failed to generate unique invite code after max attempts');
      return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 });
    }

    // Create the session
    const { data: session, error: insertError } = await supabase
      .from('alchemy_coop_sessions')
      .insert({
        invite_code: inviteCode,
        host_user_id: user.id,
        status: 'waiting',
        element_bank: elementBank,
        total_discoveries: elementBank.filter((e) => !e.isStarter).length,
        mode: sessionMode,
      })
      .select('id, invite_code, status, element_bank, mode')
      .single();

    if (insertError) {
      logger.error('[Coop] Failed to create session', { error: insertError });
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    logger.info('[Coop] Session created', {
      sessionId: session.id,
      inviteCode: session.invite_code,
      hostUserId: user.id,
      elementCount: elementBank.length,
      fromSave: !!saveSlot,
      mode: sessionMode,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        inviteCode: session.invite_code,
        elementBank: session.element_bank,
        status: session.status,
        mode: session.mode,
      },
      hostFavorites,
    });
  } catch (error) {
    logger.error('[Coop] Unexpected error in POST /api/daily-alchemy/coop/create', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
