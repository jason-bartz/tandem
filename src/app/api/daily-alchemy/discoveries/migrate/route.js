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
 * POST /api/daily-alchemy/discoveries/migrate
 *
 * Migrates first discoveries from an anonymous user to the authenticated user.
 * Used when native iOS flows (Apple Sign In, Google/Discord OAuth via deep link)
 * bypass the server-side auth callback where cookie-based migration normally happens.
 *
 * Body: { anonymousUserId: string }
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.is_anonymous) {
      return NextResponse.json({ error: 'Must upgrade account first' }, { status: 400 });
    }

    const body = await request.json();
    const { anonymousUserId } = body;

    if (!anonymousUserId || typeof anonymousUserId !== 'string') {
      return NextResponse.json({ error: 'anonymousUserId is required' }, { status: 400 });
    }

    // Don't migrate to self
    if (anonymousUserId === user.id) {
      return NextResponse.json({ migrated: 0, message: 'Same user' });
    }

    // Transfer first discoveries
    const { data: discoveries, error: discError } = await supabase
      .from('element_soup_first_discoveries')
      .update({ user_id: user.id })
      .eq('user_id', anonymousUserId)
      .select('id');

    if (discError) {
      logger.error('[DiscoveryMigrate] Failed to migrate first discoveries', {
        error: discError.message,
        from: anonymousUserId,
        to: user.id,
      });
    }

    // Transfer discovered_by on combinations
    const { error: combError } = await supabase
      .from('element_combinations')
      .update({ discovered_by: user.id })
      .eq('discovered_by', anonymousUserId);

    if (combError) {
      logger.error('[DiscoveryMigrate] Failed to migrate combination credits', {
        error: combError.message,
        from: anonymousUserId,
        to: user.id,
      });
    }

    const migrated = discoveries?.length || 0;

    logger.info('[DiscoveryMigrate] Migrated anonymous discoveries', {
      from: anonymousUserId,
      to: user.id,
      migrated,
    });

    return NextResponse.json({ migrated });
  } catch (error) {
    logger.error('[DiscoveryMigrate] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
