import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

/**
 * Get authenticated user from either Authorization header or cookies.
 * Returns a service-role Supabase client for database operations.
 *
 * Auth flow:
 * 1. Check for Bearer token in Authorization header (preferred, works on all platforms)
 * 2. Fall back to cookie-based auth (web only)
 * 3. If both fail, return null
 *
 * @param {Request} request - The incoming request
 * @param {string} [context] - Optional context string for logging (e.g., route name)
 * @returns {Promise<{user: Object|null, supabase: Object|null, source: string|null}>}
 */
export async function getAuthenticatedUser(request, context = '') {
  const logPrefix = context ? `[Auth:${context}]` : '[Auth]';

  // Try Bearer token first
  const authHeader =
    request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    logger.debug(`${logPrefix} Attempting Bearer token auth`, {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...',
    });

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        logger.debug(`${logPrefix} Bearer token auth successful`, { userId: user.id });
        return { user, supabase: createServerClient(), source: 'bearer' };
      }

      logger.info(`${logPrefix} Bearer token auth failed`, {
        error: error?.message,
        errorCode: error?.code,
      });
    } catch (bearerError) {
      logger.error(`${logPrefix} Bearer token auth threw`, { error: bearerError.message });
    }
  } else {
    logger.debug(`${logPrefix} No Bearer token in request`, {
      hasAuthHeader: !!authHeader,
    });
  }

  // Fallback to cookie auth
  try {
    const supabase = await createServerComponentClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      logger.debug(`${logPrefix} Cookie auth successful`, { userId: user.id });
      return { user, supabase: createServerClient(), source: 'cookie' };
    }

    logger.info(`${logPrefix} Cookie auth failed`, {
      error: error?.message,
      errorCode: error?.code,
    });
  } catch (cookieError) {
    logger.debug(`${logPrefix} Cookie auth threw`, { error: cookieError.message });
  }

  logger.info(`${logPrefix} All auth methods failed`);
  return { user: null, supabase: null, source: null };
}
