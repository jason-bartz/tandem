import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr';

/**
 * Create Supabase client for browser use with cookie-based storage
 * Uses anon key - SAFE for client (RLS enforced)
 *
 * This client is safe to use in:
 * - Client components
 * - Browser-side code
 * - Any code that runs in the user's browser
 *
 * Uses cookies instead of localStorage so sessions work with API routes.
 * RLS policies will ensure users can only access their own data.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables');
  }

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
