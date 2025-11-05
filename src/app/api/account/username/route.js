/**
 * API Route: Update Username
 *
 * Allows authenticated users to update their leaderboard display name (username).
 * Validates username format and ensures uniqueness.
 */

import { createServerComponentClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/account/username
 * Retrieve current user's username
 */
export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
    const supabase = await createServerComponentClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { username } = await request.json();

    // Validate username
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Validate username format (3-20 chars, alphanumeric + underscore)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error:
            'Username must be 3-20 characters and can only contain letters, numbers, and underscores',
        },
        { status: 400 }
      );
    }

    // Update username in database
    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', user.id)
      .select('username')
      .single();

    if (error) {
      console.error('[Username API] Failed to update username:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This username is already taken. Please choose another one.' },
          { status: 409 }
        );
      }

      // Handle check constraint violation
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
