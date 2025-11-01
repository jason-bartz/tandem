import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

/**
 * Verify authentication for API routes
 * Returns user object or null
 *
 * This function checks if a request has a valid Supabase session.
 * It respects RLS policies and only works with authenticated sessions.
 *
 * @param {Request} _request - The Next.js request object (unused but kept for API consistency)
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
export async function verifyAuth(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Try to get auth token from Authorization header first (preferred for API routes)
    const authHeader = request.headers.get('authorization');

    logger.info('Auth verification attempt', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 20),
      allHeaders: Array.from(request.headers.entries()).map(([k, v]) => `${k}: ${v.substring(0, 30)}...`),
    });

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      logger.info('Verifying token', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20),
      });

      // Create Supabase client and verify token
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        logger.info('Auth verification failed (token)', { error: error?.message });
        return { user: null, error: error?.message || 'Invalid token' };
      }

      logger.info('Auth verification successful (token)', { userId: user.id });
      return { user, error: null };
    }

    // Fallback to cookies (for backwards compatibility)
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    logger.info('Trying cookie auth', {
      cookieNames: allCookies.map(c => c.name),
      hasCookies: allCookies.length > 0
    });

    // Create Supabase client with cookie handling for API routes
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore cookie setting errors in API routes
          }
        },
      },
    });

    // Get the user from the session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      logger.info('Auth verification failed', { error: error?.message });
      return { user: null, error: error?.message || 'Auth session missing!' };
    }

    return { user, error: null };
  } catch (error) {
    logger.error('Auth verification error', error);
    return { user: null, error: 'Internal server error' };
  }
}

/**
 * Require authentication - returns 401 response if not authenticated
 *
 * This function verifies authentication and returns a 401 response
 * if the user is not authenticated. If the user is authenticated,
 * it returns the user object and null response.
 *
 * Usage:
 * ```
 * const { user, response } = await requireAuth(request);
 * if (response) return response; // Not authenticated
 * // Continue with authenticated user
 * ```
 *
 * @param {Request} request - The Next.js request object
 * @returns {Promise<{user: Object|null, error: string|null, response: Response|null}>}
 */
export async function requireAuth(request) {
  const { user, error } = await verifyAuth(request);

  if (!user) {
    return {
      user: null,
      error,
      response: new Response(JSON.stringify({ error: error || 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user, error: null, response: null };
}
