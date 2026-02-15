import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS, MATCHMAKING_CONFIG } from '@/lib/daily-alchemy.constants';
import { countryCodeToFlag, captureUserCountry } from '@/lib/country-flag';

/**
 * Fetch a user's profile (username + avatar)
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
 * Opportunistically clean up old queue entries
 */
async function cleanupStaleEntries(supabase) {
  const cutoff = new Date(
    Date.now() - MATCHMAKING_CONFIG.CLEANUP_AGE_MINUTES * 60 * 1000
  ).toISOString();

  await supabase
    .from('matchmaking_queue')
    .delete()
    .lt('created_at', cutoff)
    .in('status', ['waiting', 'cancelled', 'expired']);
}

/**
 * POST /api/daily-alchemy/coop/matchmake
 * Matchmaking queue for Quick Match co-op
 *
 * Body:
 * - action: 'join' | 'heartbeat' | 'cancel'
 * - mode: 'daily' | 'creative' (required for 'join')
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request, 'coop/matchmake');

    if (!user || !supabase) {
      return NextResponse.json(
        { error: 'You must be logged in to use Quick Match' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (!action || !['join', 'heartbeat', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ─── ACTION: JOIN ───────────────────────────────────────────
    if (action === 'join') {
      const mode = body.mode === 'daily' ? 'daily' : 'creative';

      // Read country from Vercel geo header and persist to users table
      const countryCode = request.headers.get('x-vercel-ip-country') || null;
      const countryFlag = countryCodeToFlag(countryCode);
      captureUserCountry(supabase, user.id, request).catch(() => {});

      // Cancel any existing waiting/matched entries for this user from prior sessions
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .in('status', ['waiting', 'matched']);

      // Opportunistic cleanup
      cleanupStaleEntries(supabase).catch(() => {});

      // Attempt atomic match: claim partner + create session in one transaction.
      // This prevents the race where the claim succeeds but session creation
      // or queue updates fail, stranding the waiting player in 'matched' limbo.
      const staleThreshold = new Date(
        Date.now() - MATCHMAKING_CONFIG.STALE_THRESHOLD_SECONDS * 1000
      ).toISOString();

      const elementBank = STARTER_ELEMENTS.map((e) => ({
        name: e.name,
        emoji: e.emoji,
        isStarter: true,
      }));

      const { data: matchResult, error: matchError } = await supabase.rpc(
        'matchmaking_claim_and_create_session',
        {
          p_claimer_id: user.id,
          p_mode: mode,
          p_stale_threshold: staleThreshold,
          p_element_bank: elementBank,
          p_claimer_country_code: countryCode,
          p_claimer_country_flag: countryFlag,
        }
      );

      if (matchError) {
        logger.error('[Matchmaking] RPC error', { error: matchError });
        // Fall through to insert into queue
      }

      // Handle both array ([{...}]) and single-object ({...}) response formats
      // from Supabase RPC — the shape can vary by client version / function type.
      const matchedRow = Array.isArray(matchResult)
        ? matchResult[0] || null
        : matchResult && typeof matchResult === 'object' && matchResult.new_session_id
          ? matchResult
          : null;

      logger.info('[Matchmaking] RPC result', {
        hasError: !!matchError,
        resultType:
          matchResult === null ? 'null' : Array.isArray(matchResult) ? 'array' : typeof matchResult,
        resultLength: Array.isArray(matchResult) ? matchResult.length : undefined,
        matchedRow: matchedRow ? { sessionId: matchedRow.new_session_id } : null,
      });

      if (matchedRow) {
        // Fetch partner's profile (the waiting player)
        const partnerProfile = await getUserProfile(supabase, matchedRow.matched_user_id);

        logger.info('[Matchmaking] Match found', {
          sessionId: matchedRow.new_session_id,
          player1: matchedRow.matched_user_id,
          player2: user.id,
          mode,
        });

        return NextResponse.json({
          success: true,
          status: 'matched',
          session: {
            id: matchedRow.new_session_id,
            elementBank: matchedRow.new_element_bank,
            mode: matchedRow.new_mode,
          },
          partner: {
            userId: matchedRow.matched_user_id,
            username: partnerProfile.username,
            avatarPath: partnerProfile.avatarPath,
            countryFlag: matchedRow.matched_country_flag || null,
          },
          isHost: false, // Current player is partner
          yourCountryFlag: countryFlag,
        });
      }

      // Safety check: if the RPC didn't error, it may have matched us even though
      // we didn't parse the result. Query our queue entry before inserting a
      // duplicate 'waiting' row that would shadow the 'matched' one.
      // Only look for entries created in the last 10 seconds to avoid picking up
      // stale matched entries from previous sessions.
      if (!matchError) {
        const recentCutoff = new Date(Date.now() - 10_000).toISOString();
        const { data: existingMatch } = await supabase
          .from('matchmaking_queue')
          .select('*, alchemy_coop_sessions!session_id(id, element_bank, mode)')
          .eq('user_id', user.id)
          .eq('status', 'matched')
          .gt('created_at', recentCutoff)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingMatch?.session_id && existingMatch.alchemy_coop_sessions) {
          const session = existingMatch.alchemy_coop_sessions;
          const partnerProfile = await getUserProfile(supabase, existingMatch.matched_with);

          logger.info('[Matchmaking] Match recovered from DB fallback', {
            sessionId: session.id,
            matchedWith: existingMatch.matched_with,
          });

          return NextResponse.json({
            success: true,
            status: 'matched',
            session: {
              id: session.id,
              elementBank: session.element_bank,
              mode: session.mode,
            },
            partner: {
              userId: existingMatch.matched_with,
              username: partnerProfile.username,
              avatarPath: partnerProfile.avatarPath,
              countryFlag: existingMatch.country_flag || null,
            },
            isHost: false,
            yourCountryFlag: countryFlag,
          });
        }
      }

      // No match found — insert into queue
      const { data: queueEntry, error: insertError } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: user.id,
          mode,
          status: 'waiting',
          country_code: countryCode,
          country_flag: countryFlag,
        })
        .select('id')
        .single();

      if (insertError) {
        // Unique constraint violation = already in queue
        if (insertError.code === '23505') {
          return NextResponse.json({ error: 'You are already in the queue' }, { status: 409 });
        }
        logger.error('[Matchmaking] Failed to join queue', { error: insertError });
        return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
      }

      logger.info('[Matchmaking] Player entered queue', {
        userId: user.id,
        mode,
        queueId: queueEntry.id,
      });

      return NextResponse.json({
        success: true,
        status: 'waiting',
        queueId: queueEntry.id,
      });
    }

    // ─── ACTION: HEARTBEAT ──────────────────────────────────────
    if (action === 'heartbeat') {
      // Update heartbeat and check if matched
      const { data: entry, error: updateError } = await supabase
        .from('matchmaking_queue')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('status', ['waiting', 'matched'])
        .order('created_at', { ascending: false })
        .select('*')
        .limit(1)
        .single();

      if (updateError || !entry) {
        return NextResponse.json({
          success: true,
          status: 'expired',
        });
      }

      if (entry.status === 'matched' && entry.session_id) {
        // We've been matched! Fetch session and partner info
        const { data: session } = await supabase
          .from('alchemy_coop_sessions')
          .select('id, element_bank, mode')
          .eq('id', entry.session_id)
          .single();

        if (!session) {
          return NextResponse.json({
            success: true,
            status: 'expired',
          });
        }

        const partnerId = entry.matched_with;
        const partnerProfile = await getUserProfile(supabase, partnerId);

        // Get partner's country flag from their queue entry
        const { data: partnerEntry } = await supabase
          .from('matchmaking_queue')
          .select('country_flag')
          .eq('user_id', partnerId)
          .eq('session_id', entry.session_id)
          .single();

        return NextResponse.json({
          success: true,
          status: 'matched',
          session: {
            id: session.id,
            elementBank: session.element_bank,
            mode: session.mode,
          },
          partner: {
            userId: partnerId,
            username: partnerProfile.username,
            avatarPath: partnerProfile.avatarPath,
            countryFlag: partnerEntry?.country_flag || null,
          },
          isHost: true, // Waiting player is host
          yourCountryFlag: entry.country_flag || null,
        });
      }

      // Still waiting — re-attempt match before returning position.
      // This handles the case where the initial join missed a partner due to
      // FOR UPDATE SKIP LOCKED (row was locked by a concurrent heartbeat).
      const staleThreshold = new Date(
        Date.now() - MATCHMAKING_CONFIG.STALE_THRESHOLD_SECONDS * 1000
      ).toISOString();

      const elementBank = STARTER_ELEMENTS.map((e) => ({
        name: e.name,
        emoji: e.emoji,
        isStarter: true,
      }));

      const { data: retryResult, error: retryError } = await supabase.rpc(
        'matchmaking_claim_and_create_session',
        {
          p_claimer_id: user.id,
          p_mode: entry.mode,
          p_stale_threshold: staleThreshold,
          p_element_bank: elementBank,
          p_claimer_country_code: entry.country_code,
          p_claimer_country_flag: entry.country_flag,
        }
      );

      if (!retryError) {
        const retryMatch = Array.isArray(retryResult)
          ? retryResult[0] || null
          : retryResult && typeof retryResult === 'object' && retryResult.new_session_id
            ? retryResult
            : null;

        if (retryMatch) {
          // Cancel our waiting entry (the RPC already inserted a new matched one)
          await supabase
            .from('matchmaking_queue')
            .update({ status: 'cancelled' })
            .eq('id', entry.id);

          const partnerProfile = await getUserProfile(supabase, retryMatch.matched_user_id);

          logger.info('[Matchmaking] Match found via heartbeat retry', {
            sessionId: retryMatch.new_session_id,
            player1: retryMatch.matched_user_id,
            player2: user.id,
          });

          return NextResponse.json({
            success: true,
            status: 'matched',
            session: {
              id: retryMatch.new_session_id,
              elementBank: retryMatch.new_element_bank,
              mode: retryMatch.new_mode,
            },
            partner: {
              userId: retryMatch.matched_user_id,
              username: partnerProfile.username,
              avatarPath: partnerProfile.avatarPath,
              countryFlag: retryMatch.matched_country_flag || null,
            },
            isHost: false,
            yourCountryFlag: entry.country_flag || null,
          });
        }
      }

      // No match yet — return position
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .eq('mode', entry.mode)
        .lt('created_at', entry.created_at);

      return NextResponse.json({
        success: true,
        status: 'waiting',
        queuePosition: (count || 0) + 1,
      });
    }

    // ─── ACTION: CANCEL ─────────────────────────────────────────
    if (action === 'cancel') {
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'waiting');

      logger.info('[Matchmaking] Player cancelled', { userId: user.id });

      return NextResponse.json({
        success: true,
        status: 'cancelled',
      });
    }
  } catch (error) {
    logger.error('[Matchmaking] Unexpected error', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
