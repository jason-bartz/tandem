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
      return { user, supabase: serviceClient };
    }
  }

  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    const serviceClient = createServerClient();
    return { user, supabase: serviceClient };
  }

  return { user: null, supabase: null };
}

/**
 * POST /api/daily-alchemy/discoveries/backfill
 *
 * Backfills the username on first discovery records after an anonymous user
 * upgrades to a permanent account. Updates all rows where user_id matches
 * and username is NULL.
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only run for non-anonymous users (they just upgraded)
    if (user.is_anonymous) {
      return NextResponse.json({ error: 'Must upgrade account first' }, { status: 400 });
    }

    // Get the user's current username from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username;
    if (!username) {
      // No username set yet — nothing to backfill
      return NextResponse.json({ updated: 0, message: 'No username set yet' });
    }

    // Update all first discovery records for this user that have NULL username
    const { data, error } = await supabase
      .from('element_soup_first_discoveries')
      .update({ username })
      .eq('user_id', user.id)
      .is('username', null)
      .select('id');

    if (error) {
      logger.error('[DiscoveryBackfill] Update failed', { error: error.message, userId: user.id });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const updated = data?.length || 0;

    logger.info('[DiscoveryBackfill] Username backfilled', {
      userId: user.id,
      username,
      updated,
    });

    return NextResponse.json({ updated, username });
  } catch (error) {
    logger.error('[DiscoveryBackfill] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
