'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { autoCleanupIfNeeded } from '@/lib/storageCleanup';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
});

/**
 * Helper function to hash a string using SHA-256
 * Used for hashing nonces for Apple Sign In
 *
 * @param {string} str - The string to hash
 * @returns {Promise<string>} The SHA-256 hash as a hex string
 */
async function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * AuthProvider - Global authentication state management
 *
 * This provider wraps the app and provides authentication state and methods
 * to all components. It uses Supabase Auth for user management.
 *
 * Features:
 * - Automatic session management
 * - Real-time auth state updates
 * - Email/password authentication
 * - Google OAuth authentication
 * - Apple Sign In (iOS native)
 * - Session persistence
 *
 * Usage:
 * ```jsx
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { user, signIn, signOut } = useAuth();
 *   // ...
 * }
 * ```
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Auto-cleanup storage if needed (prevent quota issues)
    autoCleanupIfNeeded().catch((error) => {
      console.error('[AuthProvider] Auto cleanup failed:', error);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  /**
   * Sign up with email and password
   *
   * @param {string} email - User's email address
   * @param {string} password - User's password (min 6 characters)
   * @param {Object} metadata - Optional user metadata (name, etc.)
   * @returns {Promise<{user, session, error}>}
   */
  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          // Redirect user back to home page after email confirmation
          // They can then sign in from there
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // Create user profile in database
      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: metadata.full_name || null,
          avatar_url: metadata.avatar_url || null,
        });

        if (profileError && profileError.code !== '23505') {
          // Ignore duplicate key errors (user already exists)
          console.error('Failed to create user profile:', profileError);
        }
      }

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, session: null, error };
    }
  };

  /**
   * Sign in with email and password
   *
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{user, session, error}>}
   */
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, session: null, error };
    }
  };

  /**
   * Sign in with Google OAuth
   *
   * Redirects to Google for authentication, then back to the app.
   *
   * @returns {Promise<{error}>}
   */
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  };

  /**
   * Sign in with Apple
   *
   * Uses native Apple Sign In on iOS via Capacitor plugin
   *
   * @returns {Promise<{user, session, error}>}
   */
  const signInWithApple = async () => {
    try {
      // Check if we're running in a Capacitor environment
      // Use globalThis to avoid build-time module resolution
      const isCapacitor =
        typeof window !== 'undefined' &&
        window.Capacitor &&
        window.Capacitor.getPlatform() === 'ios';

      if (!isCapacitor) {
        // On web, use Supabase's Apple OAuth
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        return { error: null };
      }

      // On iOS, use native Apple Sign In
      // Dynamic import to avoid bundling on web builds
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');

      // Generate raw nonce for Apple Sign In
      // Apple requires the nonce to be SHA-256 hashed, but Supabase needs the raw nonce
      const rawNonce = crypto.randomUUID();
      const hashedNonce = await sha256(rawNonce);

      // Get Apple credentials
      const result = await SignInWithApple.authorize({
        clientId: 'com.tandemdaily.app', // Your app's bundle ID
        redirectURI: 'https://tandemdaily.com/auth/callback',
        scopes: 'email name',
        state: crypto.randomUUID(),
        nonce: hashedNonce, // Pass hashed nonce to Apple
      });

      // Use the identity token to authenticate with Supabase
      // IMPORTANT: Pass the raw (unhashed) nonce to Supabase, not the hashed one
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken,
        nonce: rawNonce, // Pass raw nonce to Supabase
      });

      if (error) throw error;

      // Store Apple authorization code for account deletion token revocation
      // Per App Store Review Guideline 5.1.1(v), apps using Sign in with Apple
      // must revoke user tokens when deleting accounts
      if (result.response.authorizationCode) {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({
            key: 'apple_authorization_code',
            value: result.response.authorizationCode,
          });
          console.log('[Auth] Stored Apple authorization code for account deletion');
        } catch (prefError) {
          console.error('[Auth] Failed to store Apple authorization code:', prefError);
          // Non-critical error - continue with sign in
        }
      }

      // Also store the user identifier for server-to-server notifications
      if (result.response.user) {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({
            key: 'apple_user_id',
            value: result.response.user,
          });
        } catch (prefError) {
          console.error('[Auth] Failed to store Apple user ID:', prefError);
        }
      }

      // Create user profile in database if new user
      if (data.user) {
        try {
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email || result.response.email,
            full_name: data.user.user_metadata?.full_name || result.response.givenName,
            avatar_url: data.user.user_metadata?.avatar_url || null,
          });

          if (profileError && profileError.code !== '23505') {
            // Ignore duplicate key errors (user already exists)
            console.warn('[Auth] Profile creation warning:', profileError.message);
            // Don't fail sign-in if profile creation fails
          }
        } catch (profileErr) {
          console.warn('[Auth] Profile creation error:', profileErr.message);
          // Don't fail sign-in if profile creation fails
        }
      }

      console.log('[Auth] Apple sign-in successful:', { userId: data.user?.id });
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('[Auth] Apple sign-in failed:', error);
      return { user: null, session: null, error };
    }
  };

  /**
   * Sign out the current user
   *
   * @returns {Promise<{error}>}
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithApple,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth hook - Access authentication state and methods
 *
 * @returns {Object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
