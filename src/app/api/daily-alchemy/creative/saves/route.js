import { NextResponse } from 'next/server';
import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

/**
 * Get authenticated user from either cookies or Authorization header
 * iOS apps send Bearer tokens, web uses cookies
 */
async function getAuthenticatedUser(request) {
  const authHeader =
    request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

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
      const serviceClient = createServerClient();
      return { user, supabase: serviceClient, source: 'bearer' };
    }
  }

  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    const serviceClient = createServerClient();
    return { user, supabase: serviceClient, source: 'cookie' };
  }

  return { user: null, supabase: null, source: null };
}

/**
 * GET /api/daily-alchemy/creative/saves
 * Returns summaries of all 3 save slots for the user.
 * Lightweight — element_bank is only used to compute elementCount, not returned.
 */
export async function GET(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rows, error: fetchError } = await supabase
      .from('daily_alchemy_creative_saves')
      .select(
        'slot_number, slot_name, total_discoveries, first_discoveries, first_discovery_elements, last_played_at, element_bank'
      )
      .eq('user_id', user.id)
      .order('slot_number');

    if (fetchError) {
      logger.error('[DailyAlchemy] Failed to fetch creative save summaries', {
        error: fetchError,
      });
      return NextResponse.json({ error: 'Failed to fetch saves' }, { status: 500 });
    }

    // Build a map of existing saves by slot number
    const savesBySlot = {};
    for (const row of rows || []) {
      savesBySlot[row.slot_number] = row;
    }

    // Always return 3 slots, filling in empty ones
    const saves = [1, 2, 3].map((slotNum) => {
      const row = savesBySlot[slotNum];
      if (!row) {
        return { slot: slotNum, name: null, hasSave: false };
      }
      return {
        slot: slotNum,
        name: row.slot_name || null,
        hasSave: true,
        elementCount: Array.isArray(row.element_bank) ? row.element_bank.length : 0,
        totalDiscoveries: row.total_discoveries || 0,
        firstDiscoveries: row.first_discoveries || 0,
        lastPlayedAt: row.last_played_at,
      };
    });

    return NextResponse.json({ success: true, saves });
  } catch (error) {
    logger.error('[DailyAlchemy] Unexpected error in GET /api/daily-alchemy/creative/saves', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
