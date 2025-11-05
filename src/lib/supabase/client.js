import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr';
import { Capacitor } from '@capacitor/core';

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
 * - Web: Uses cookies so sessions work with API routes
 * - iOS/Android: Uses Capacitor Preferences for native storage
 *
 * RLS policies will ensure users can only access their own data.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables');
  }

  // On native platforms (iOS/Android), use localStorage instead of cookies
  // Capacitor Preferences is async but Supabase SSR expects sync cookie handlers
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // Use default storage (localStorage) for native - Supabase SSR handles this automatically
    return createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  // On web, use document.cookie
  return createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
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
        if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
        if (options?.path) cookie += `; path=${options.path}`;
        if (options?.domain) cookie += `; domain=${options.domain}`;
        if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
        if (options?.secure) cookie += '; secure';
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
