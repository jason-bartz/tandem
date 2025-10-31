import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';

// For static export (Capacitor builds), we can't have dynamic routes
// This route is only needed for web OAuth, not native iOS
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

/**
 * OAuth Callback Handler
 *
 * This route handles the OAuth callback from Google (or other providers).
 * After the user authenticates with Google, they are redirected here with
 * an auth code that we exchange for a session.
 *
 * Note: This route is skipped in Capacitor builds as OAuth is handled natively
 *
 * @route GET /auth/callback
 */
export async function GET(request) {
  // Skip in Capacitor builds
  if (isCapacitorBuild) {
    return NextResponse.json({ error: 'Route not available in native app' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerComponentClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth callback error:', error);
      // Redirect to home with error
      return NextResponse.redirect(`${requestUrl.origin}/?auth_error=true`);
    }

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Create user profile if it doesn't exist (using service role to bypass RLS)
      const supabaseAdmin = createServerClient();

      const { error: profileError } = await supabaseAdmin.from('users').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        },
        {
          onConflict: 'id',
        }
      );

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
      }
    }
  }

  // Redirect to home page
  return NextResponse.redirect(requestUrl.origin);
}
