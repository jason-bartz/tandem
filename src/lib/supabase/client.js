import { createClient } from '@supabase/supabase-js';

/**
 * Create Supabase client for browser use
 * Uses anon key - SAFE for client (RLS enforced)
 *
 * This client is safe to use in:
 * - Client components
 * - Browser-side code
 * - Any code that runs in the user's browser
 *
 * RLS policies will ensure users can only access their own data.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use cookies for session storage (industry standard for SSR/API routes)
      // This allows server-side API routes to access the session
      storageKey: 'sb-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce', // More secure auth flow
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
