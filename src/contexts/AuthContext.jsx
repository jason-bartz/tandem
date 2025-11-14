'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { autoCleanupIfNeeded } from '@/lib/storageCleanup';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  userProfile: null,
  profileLoading: false,
  showFirstTimeSetup: false,
  dismissFirstTimeSetup: () => {},
  refreshProfile: async () => {},
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  resetPassword: async () => {},
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
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const supabase = getSupabaseBrowserClient();

  /**
   * Load user profile with avatar from database
   * This is called automatically when user signs in and can be called manually to refresh
   */
  const loadUserProfile = async (userId) => {
    if (!userId) {
      setUserProfile(null);
      return;
    }

    try {
      setProfileLoading(true);
      const avatarService = (await import('@/services/avatar.service')).default;
      const profile = await avatarService.getUserProfileWithAvatar(userId);
      setUserProfile(profile);
      console.log('[AuthContext] User profile loaded:', {
        userId,
        hasUsername: !!profile?.username,
        hasAvatar: !!profile?.avatar_image_path,
      });
    } catch (error) {
      console.error('[AuthContext] Failed to load user profile:', error);
      // Set a minimal profile with auth metadata as fallback
      setUserProfile({
        id: userId,
        username: null,
        avatar_image_path: null,
      });
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Refresh user profile
   * Exposed to components that need to manually refresh profile (e.g., after avatar selection)
   */
  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

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

      // Load user profile if session exists
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Load profile when user signs in
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        // Clear profile when user signs out
        setUserProfile(null);
      }

      // Check if first-time setup is needed when user signs in
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AuthProvider] User signed in, checking first-time setup status');

        // Check if user needs to complete first-time setup
        (async () => {
          try {
            const avatarService = (await import('@/services/avatar.service')).default;
            const hasCompletedSetup = await avatarService.hasCompletedFirstTimeSetup(
              session.user.id
            );

            if (!hasCompletedSetup) {
              console.log('[AuthProvider] User needs to complete first-time setup');
              setShowFirstTimeSetup(true);
            } else {
              console.log('[AuthProvider] User has already completed first-time setup');
            }
          } catch (error) {
            console.error('[AuthProvider] Failed to check first-time setup status:', error);
          }
        })();

        // Sync stats to leaderboard when user signs in
        // IMPORTANT: Run this completely non-blocking to avoid hanging auth UI
        console.log('[AuthProvider] User signed in, syncing stats to leaderboard');

        // Run sync in background without blocking auth flow
        (async () => {
          try {
            // Import dynamically to avoid circular dependencies
            const { syncStatsToLeaderboardOnAuth } = await import('@/lib/leaderboardSync');
            const { loadStats } = await import('@/lib/storage');
            const { loadCrypticStats } = await import('@/lib/crypticStorage');
            const { migrateCrypticStatsToDatabase } = await import(
              '@/lib/migrations/crypticStatsMigration'
            );

            // MIGRATION: Sync local cryptic stats to database (database-first architecture)
            // This runs once per device and ensures existing stats are preserved
            migrateCrypticStatsToDatabase(session.user).catch((error) => {
              console.error('[AuthProvider] Cryptic stats migration failed:', error);
            });

            // Load current stats (this will now use database as source of truth)
            const tandemStats = await loadStats();
            const crypticStats = await loadCrypticStats();

            // Sync to leaderboard (non-blocking, fails silently)
            syncStatsToLeaderboardOnAuth(tandemStats, crypticStats).catch((error) => {
              console.error('[AuthProvider] Leaderboard sync failed:', error);
            });
          } catch (error) {
            console.error('[AuthProvider] Failed to sync stats to leaderboard:', error);
          }
        })();
      }
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
      // Run cleanup before sign up to ensure we have space for auth token
      await autoCleanupIfNeeded();

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

      // User profile is automatically created by database trigger
      // (see migration 006_auto_create_user_profile.sql)

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Sign up error:', error);

      // If quota exceeded, try emergency cleanup and retry once
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        console.warn(
          '[Auth] Storage quota exceeded during signup, attempting emergency cleanup...'
        );
        try {
          const { emergencyCleanup } = await import('@/lib/storageCleanup');
          await emergencyCleanup();

          // Retry sign up after cleanup
          const { data, error: retryError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: metadata,
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

          if (retryError) throw retryError;

          // User profile is automatically created by database trigger

          return { user: data.user, session: data.session, error: null };
        } catch (cleanupError) {
          console.error('[Auth] Emergency cleanup/retry failed:', cleanupError);
        }
      }

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
      // Run cleanup before sign in to ensure we have space for auth token
      await autoCleanupIfNeeded();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Sign in error:', error);

      // If quota exceeded, try emergency cleanup and retry once
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        console.warn('[Auth] Storage quota exceeded, attempting emergency cleanup...');
        try {
          const { emergencyCleanup } = await import('@/lib/storageCleanup');
          await emergencyCleanup();

          // Retry sign in after cleanup
          const { data, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryError) throw retryError;

          return { user: data.user, session: data.session, error: null };
        } catch (cleanupError) {
          console.error('[Auth] Emergency cleanup/retry failed:', cleanupError);
        }
      }

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

      console.log('[Auth] signInWithApple() - Platform check:', {
        hasWindow: typeof window !== 'undefined',
        hasCapacitor: !!window.Capacitor,
        platform: window.Capacitor?.getPlatform(),
        isCapacitor,
      });

      if (!isCapacitor) {
        // On web, use Supabase's Apple OAuth
        console.log('[Auth] Using web OAuth flow');
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
      console.log('[Auth] Using native iOS Apple Sign In');

      // Dynamic import to avoid bundling on web builds
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      console.log('[Auth] SignInWithApple plugin imported');

      // Generate raw nonce for Apple Sign In
      // Apple requires the nonce to be SHA-256 hashed, but Supabase needs the raw nonce
      const rawNonce = crypto.randomUUID();
      const hashedNonce = await sha256(rawNonce);
      console.log('[Auth] Generated nonces:', {
        rawNonceLength: rawNonce.length,
        hashedNonceLength: hashedNonce.length,
      });

      // Get Apple credentials
      console.log('[Auth] Requesting Apple authorization with config:', {
        clientId: 'com.tandemdaily.app',
        redirectURI: 'https://tandemdaily.com/auth/callback',
        scopes: 'email name',
      });

      const result = await SignInWithApple.authorize({
        clientId: 'com.tandemdaily.app', // Your app's bundle ID
        redirectURI: 'https://tandemdaily.com/auth/callback',
        scopes: 'email name',
        state: crypto.randomUUID(),
        nonce: hashedNonce, // Pass hashed nonce to Apple
      });

      console.log('[Auth] Apple authorization response received:', {
        hasResponse: !!result.response,
        hasIdentityToken: !!result.response?.identityToken,
        hasAuthorizationCode: !!result.response?.authorizationCode,
        hasUser: !!result.response?.user,
        hasEmail: !!result.response?.email,
      });

      // Use the identity token to authenticate with Supabase
      // IMPORTANT: Pass the raw (unhashed) nonce to Supabase, not the hashed one
      console.log('[Auth] Authenticating with Supabase using identity token...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken,
        nonce: rawNonce, // Pass raw nonce to Supabase
      });

      if (error) {
        console.error('[Auth] Supabase signInWithIdToken error:', error);
        throw error;
      }

      console.log('[Auth] Supabase authentication successful:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
      });

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
            username: data.user.user_metadata?.username || result.response.givenName || null,
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

  /**
   * Request a password reset email
   *
   * Sends a password reset email to the user's email address.
   * The email will contain a link to reset their password.
   *
   * @param {string} email - User's email address
   * @returns {Promise<{error}>}
   */
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error };
    }
  };

  /**
   * Dismiss the first-time setup modal
   * This is called when the user completes or skips the first-time setup
   */
  const dismissFirstTimeSetup = () => {
    setShowFirstTimeSetup(false);
  };

  const value = {
    user,
    session,
    loading,
    userProfile,
    profileLoading,
    showFirstTimeSetup,
    dismissFirstTimeSetup,
    refreshProfile,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
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
