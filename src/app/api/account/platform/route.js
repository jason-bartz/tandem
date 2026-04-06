/**
 * API Route: Update User Platform
 *
 * Records whether a user is accessing from 'web' or 'ios'.
 * Called on sign-in from AuthContext with platform detection.
 *
 * Supports both:
 * - Cookie-based auth (web)
 * - Bearer token auth (iOS/native apps)
 */

import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

const VALID_PLATFORMS = ['web', 'ios'];

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
    return { user, supabase };
  }

  return { user: null, supabase: null };
}

/**
 * POST /api/account/platform
 * Update user's platform
 *
 * Request body: { platform: 'web' | 'ios' }
 */
export async function POST(request) {
  try {
    const clonedRequest = request.clone();
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await clonedRequest.json();

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "web" or "ios".' },
        { status: 400 }
      );
    }

    const serviceClient = createServerClient();

    const { error } = await serviceClient
      .from('users')
      .update({ platform })
      .eq('id', user.id);

    if (error) {
      logger.error('[Platform API] Failed to update platform:', error);
      return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 });
    }

    return NextResponse.json({ success: true, platform });
  } catch (error) {
    logger.error('[Platform API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
