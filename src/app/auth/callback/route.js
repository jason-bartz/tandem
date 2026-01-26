import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

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
  if (isCapacitorBuild) {
    return NextResponse.json({ error: 'Route not available in native app' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type'); // 'signup' for email confirmation

  if (code) {
    const supabase = await createServerComponentClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('OAuth callback error', error);
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
          username: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        },
        {
          onConflict: 'id',
        }
      );

      if (profileError) {
        logger.error('Failed to create user profile', profileError);
      }
    }

    // For email confirmations, redirect with success message
    if (type === 'signup') {
      return NextResponse.redirect(`${requestUrl.origin}/?email_confirmed=true`);
    }
  }

  // Get the stored return URL from cookie (set before OAuth redirect)
  const cookieStore = await cookies();
  const returnUrlCookie = cookieStore.get('auth_return_url');
  let returnPath = '/';

  if (returnUrlCookie?.value) {
    try {
      returnPath = decodeURIComponent(returnUrlCookie.value);
      // Validate the path is safe (starts with / and doesn't contain protocol)
      if (!returnPath.startsWith('/') || returnPath.includes('://')) {
        returnPath = '/';
      }
    } catch {
      returnPath = '/';
    }
  }

  // Create response with redirect to the return URL
  const response = NextResponse.redirect(`${requestUrl.origin}${returnPath}`);

  // Clear the return URL cookie
  response.cookies.delete('auth_return_url');

  return response;
}
