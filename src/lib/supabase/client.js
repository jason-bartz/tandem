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

  // On web, use document.cookie with proper session persistence
  return createBrowserClientSSR(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Enable session persistence following web best practices
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use a long session expiry similar to popular web games
      // Supabase will handle token refresh automatically
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

        // Set long-lived cookies for session persistence (30 days)
        // This follows best practices for mobile web games
        const maxAge = options?.maxAge || 2592000; // 30 days in seconds
        cookie += `; max-age=${maxAge}`;

        // Always set path to root
        cookie += `; path=${options?.path || '/'}`;

        // Set SameSite=Lax for better security while maintaining functionality
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
