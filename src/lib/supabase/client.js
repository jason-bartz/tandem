import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import logger from '@/lib/logger';

/**
 * Create Supabase client for browser use with platform-appropriate storage
 * Uses anon key - SAFE for client (RLS enforced)
 *
 * This client is safe to use in:
 * - Client components
 * - Browser-side code
 * - Any code that runs in the user's browser
 *
 * Storage:
 * - Web: Uses @supabase/ssr with cookies so sessions work with API routes
 * - iOS/Android: Uses standard @supabase/supabase-js with localStorage
 *
 * RLS policies will ensure users can only access their own data.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables');
  }

  // On native platforms (iOS/Android), use standard Supabase client with localStorage
  // The @supabase/ssr package doesn't work well in WKWebView
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    logger.debug('[Supabase] Creating native client with localStorage + CapacitorHttp');

    // Custom fetch using CapacitorHttp to bypass CORS in WKWebView.
    // Without this, Supabase auth calls (signInWithPassword, token refresh, etc.)
    // fail with "Load failed" / AuthRetryableFetchError because WKWebView
    // enforces CORS on capacitor://localhost requests to supabase.co.
    const { CapacitorHttp } = require('@capacitor/core');

    const nativeFetch = async (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const headers =
        options.headers instanceof Headers
          ? Object.fromEntries(options.headers.entries())
          : { ...options.headers };

      // Parse request body — Supabase sends JSON strings
      let data;
      if (options.body) {
        try {
          data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        } catch {
          // Not JSON — pass as-is (shouldn't happen for Supabase)
          data = options.body;
        }
      }

      const response = await CapacitorHttp.request({
        url: typeof url === 'string' ? url : url.toString(),
        method,
        headers,
        data,
      });

      // Convert CapacitorHttp response to a fetch-compatible Response
      const responseBody =
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      return new Response(responseBody, {
        status: response.status,
        headers: new Headers(response.headers),
      });
    };

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        // Enable URL detection for OAuth deep link callbacks (Google Sign In)
        detectSessionInUrl: true,
        // Use PKCE flow for secure OAuth with deep links
        flowType: 'pkce',
      },
      global: {
        fetch: nativeFetch,
      },
    });
  }

  // On web, use @supabase/ssr with document.cookie for session persistence
  // IMPORTANT: Do NOT override auth.storage with localStorage here.
  // @supabase/ssr uses cookie-based storage so the server (API routes,
  // middleware, auth callback) can access auth state including PKCE
  // code verifiers needed for email verification code exchange.
  return createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    cookies: {
      get(name) {
        if (typeof document === 'undefined') return undefined;
        const cookies = document.cookie.split('; ');
        const cookie = cookies.find((c) => c.startsWith(`${name}=`));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined;
      },
      set(name, value, options) {
        if (typeof document === 'undefined') return;
        let cookie = `${name}=${encodeURIComponent(value)}`;

        // This follows best practices for mobile web games
        const maxAge = options?.maxAge || 2592000; // 30 days in seconds
        cookie += `; max-age=${maxAge}`;

        // Always set path to root
        cookie += `; path=${options?.path || '/'}`;

        cookie += `; samesite=${options?.sameSite || 'Lax'}`;

        // Use secure flag in production
        if (window.location.protocol === 'https:' || options?.secure) {
          cookie += '; secure';
        }

        document.cookie = cookie;
      },
      remove(name, options) {
        if (typeof document === 'undefined') return;
        this.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });
}

// Create a singleton instance for browser use
let browserClient = null;

/**
 * Get or create a singleton Supabase client for browser use
 * Recommended for most client-side usage to avoid creating multiple instances
 */
export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient can only be called in browser context');
  }

  if (!browserClient) {
    browserClient = createBrowserClient();
  }

  return browserClient;
}
