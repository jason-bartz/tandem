/**
 * API Route: Update Username
 *
 * Allows authenticated users to update their leaderboard display name (username).
 * Validates username format, profanity, and ensures uniqueness.
 * Implements server-side validation as primary security layer.
 *
 * Supports both:
 * - Cookie-based auth (web)
 * - Bearer token auth (iOS/native apps)
 */

import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { validateUsernameForAPI } from '@/utils/profanityFilter';

/**
 * Get authenticated user from either cookies or Authorization header
 * iOS apps send Bearer tokens, web uses cookies
 */
async function getAuthenticatedUser(request) {
  // First, try Bearer token from Authorization header (iOS/native)
  const authHeader =
    request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Create a Supabase client with the access token to verify it
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
      // Return both user and a service client for database operations
      // We use service client because the token-based client doesn't have RLS bypass
      const serviceClient = createServerClient();
      return { user, supabase: serviceClient, source: 'bearer' };
    }
  }

  // Fall back to cookie-based auth (web)
  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return { user, supabase, source: 'cookie' };
  }

  return { user: null, supabase: null, source: null };
}

/**
 * GET /api/account/username
 * Retrieve current user's username
 */
export async function GET(request) {
  try {
    // Get authenticated user (supports both cookie and Bearer token auth)
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current username
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Username API] Failed to fetch username:', error);
      return NextResponse.json({ error: 'Failed to fetch username' }, { status: 500 });
    }

    return NextResponse.json({ username: data?.username || null });
  } catch (error) {
    console.error('[Username API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/account/username
 * Update user's username
 *
 * Request body:
 * {
 *   username: string (3-20 chars, alphanumeric + underscore)
 * }
 */
export async function POST(request) {
  try {
    // Clone request to read body separately from auth check
    const clonedRequest = request.clone();

    // Get authenticated user (supports both cookie and Bearer token auth)
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body from cloned request
    const { username } = await clonedRequest.json();

    // Validate username
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Comprehensive username validation with profanity filter (server-side enforcement)
    const validation = validateUsernameForAPI(username);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.statusCode });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', user.id)
      .select('username')
      .single();

    if (error) {
      console.error('[Username API] Failed to update username:', error);

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This username is already taken. Please choose another one.' },
          { status: 409 }
        );
      }

      if (error.code === '23514') {
        return NextResponse.json(
          {
            error:
              'Username must be 3-20 characters and can only contain letters, numbers, and underscores',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: 'Failed to update username' }, { status: 500 });
    }

    return NextResponse.json({ success: true, username: data.username });
  } catch (error) {
    console.error('[Username API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
