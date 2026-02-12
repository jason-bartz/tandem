import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

// For static export (Capacitor builds), we can't have dynamic routes
// This route is only needed for web OAuth, not native iOS
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';
const isStandaloneAlchemy = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';
const standaloneHome = '/daily-alchemy';

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
      const errorPath = isStandaloneAlchemy ? standaloneHome : '/';
      return NextResponse.redirect(`${requestUrl.origin}${errorPath}?auth_error=true`);
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

      // Migrate first discoveries from anonymous user to permanent account
      // This happens when an anonymous user upgrades via OAuth (signInWithOAuth replaces the session)
      const cookieStore2 = await cookies();
      const anonMigration = cookieStore2.get('anon_user_migration');
      if (anonMigration?.value && anonMigration.value !== user.id) {
        const anonUserId = anonMigration.value;
        try {
          // Transfer first discoveries
          await supabaseAdmin
            .from('element_soup_first_discoveries')
            .update({ user_id: user.id })
            .eq('user_id', anonUserId);

          // Transfer discovered_by on combinations
          await supabaseAdmin
            .from('element_combinations')
            .update({ discovered_by: user.id })
            .eq('discovered_by', anonUserId);

          logger.info('[AuthCallback] Migrated anonymous discoveries', {
            from: anonUserId,
            to: user.id,
          });
        } catch (migrationError) {
          logger.error('[AuthCallback] Discovery migration failed', migrationError);
        }
      }
    }

    // For email confirmations, redirect with success message
    if (type === 'signup') {
      // Check for stored return URL (e.g., anonymous user upgrading from the game)
      const cookieStore = await cookies();
      const returnUrlCookie = cookieStore.get('auth_return_url');
      let confirmPath = isStandaloneAlchemy ? standaloneHome : '/';

      if (returnUrlCookie?.value) {
        try {
          const decoded = decodeURIComponent(returnUrlCookie.value);
          const isSafePath =
            decoded.startsWith('/') &&
            !decoded.startsWith('//') &&
            !decoded.includes('://') &&
            !decoded.includes('\\') &&
            !/^\/[^/]*@/.test(decoded);
          if (isSafePath) confirmPath = decoded;
        } catch {
          // Use default
        }
      }

      const response = NextResponse.redirect(
        `${requestUrl.origin}${confirmPath}?email_confirmed=true`
      );
      response.cookies.delete('auth_return_url');
      response.cookies.delete('anon_user_migration');
      return response;
    }
  }

  // Get the stored return URL from cookie (set before OAuth redirect)
  const cookieStore = await cookies();
  const returnUrlCookie = cookieStore.get('auth_return_url');
  let returnPath = isStandaloneAlchemy ? standaloneHome : '/';

  if (returnUrlCookie?.value) {
    try {
      returnPath = decodeURIComponent(returnUrlCookie.value);

      // SECURITY: Validate the path is safe to prevent open redirects
      // Must start with single / (not //) and cannot contain protocol or other schemes
      const isSafePath =
        returnPath.startsWith('/') && // Must start with /
        !returnPath.startsWith('//') && // Prevent protocol-relative URLs (//evil.com)
        !returnPath.includes('://') && // Prevent absolute URLs with protocols
        !returnPath.includes('\\') && // Prevent backslash tricks
        !/^\/[^/]*@/.test(returnPath); // Prevent URL schemes like /javascript:

      if (!isSafePath) {
        logger.warn('Potentially unsafe return URL blocked', { returnPath });
        returnPath = isStandaloneAlchemy ? standaloneHome : '/';
      }
    } catch {
      returnPath = isStandaloneAlchemy ? standaloneHome : '/';
    }
  }

  // Create response with redirect to the return URL
  const response = NextResponse.redirect(`${requestUrl.origin}${returnPath}`);

  // Clear cookies
  response.cookies.delete('auth_return_url');
  response.cookies.delete('anon_user_migration');

  return response;
}
