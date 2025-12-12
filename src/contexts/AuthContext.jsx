'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { autoCleanupIfNeeded } from '@/lib/storageCleanup';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

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
    } catch (error) {
      logger.error('[AuthContext] Failed to load user profile', error);

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
    // Initialize unified storage service (loads IndexedDB key tracking, runs health check)
    storageService.initialize().catch((error) => {
      logger.error('[AuthProvider] Storage service initialization failed', error);
    });

    autoCleanupIfNeeded().catch((error) => {
      logger.error('[AuthProvider] Auto cleanup failed', error);
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
        setUserProfile(null);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        (async () => {
          try {
            const avatarService = (await import('@/services/avatar.service')).default;
            const hasCompletedSetup = await avatarService.hasCompletedFirstTimeSetup(
              session.user.id
            );

            if (!hasCompletedSetup) {
              setShowFirstTimeSetup(true);
            } else {
            }
          } catch (error) {
            logger.error('[AuthProvider] Failed to check first-time setup status', error);
          }
        })();

        // Sync stats to leaderboard when user signs in
        // IMPORTANT: Run this completely non-blocking to avoid hanging auth UI

        // Run sync in background without blocking auth flow
        (async () => {
          try {
            // Import dynamically to avoid circular dependencies
            const { syncStatsToLeaderboardOnAuth } = await import('@/lib/leaderboardSync');
            const { loadStats } = await import('@/lib/storage');
            const { loadMiniStats } = await import('@/lib/miniStorage');

            // Load current stats for all games
            const [tandemStats, miniStats] = await Promise.all([loadStats(), loadMiniStats()]);

            // Load reel-connections stats from localStorage
            let reelStats = null;
            try {
              const reelStatsRaw = localStorage.getItem('reel-connections-stats');
              if (reelStatsRaw) {
                reelStats = JSON.parse(reelStatsRaw);
              }
            } catch (e) {
              logger.error('[AuthProvider] Failed to load reel-connections stats', e);
            }

            // Sync to leaderboard (non-blocking, fails silently)
            syncStatsToLeaderboardOnAuth(tandemStats, null, miniStats, reelStats).catch((error) => {
              logger.error('[AuthProvider] Leaderboard sync failed', error);
            });
          } catch (error) {
            logger.error('[AuthProvider] Failed to sync stats to leaderboard', error);
          }
        })();

        // Sync achievements when user signs in (non-blocking)
        // This merges local achievements with database for cross-device persistence
        (async () => {
          try {
            const { syncAllAchievements } = await import('@/services/achievementSync.service');
            await syncAllAchievements();
            logger.debug('[AuthProvider] Achievement sync completed');
          } catch (error) {
            logger.error('[AuthProvider] Achievement sync failed', error);
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
      logger.error('Sign up error', error);

      // If quota exceeded, try emergency cleanup and retry once
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        logger.warn('[Auth] Storage quota exceeded during signup, attempting emergency cleanup...');
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
          logger.error('[Auth] Emergency cleanup/retry failed', cleanupError);
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
      logger.error('Sign in error', error);

      // If quota exceeded, try emergency cleanup and retry once
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        logger.warn('[Auth] Storage quota exceeded, attempting emergency cleanup...');
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
          logger.error('[Auth] Emergency cleanup/retry failed', cleanupError);
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
      logger.error('Google sign in error', error);
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

      // IMPORTANT: Pass the raw (unhashed) nonce to Supabase, not the hashed one

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken,
        nonce: rawNonce, // Pass raw nonce to Supabase
      });

      if (error) {
        logger.error('[Auth] Supabase signInWithIdToken error', error);
        throw error;
      }

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
        } catch (prefError) {
          logger.error('[Auth] Failed to store Apple authorization code', prefError);
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
          logger.error('[Auth] Failed to store Apple user ID', prefError);
        }
      }

      // User profile is automatically created by database trigger
      // (see migration 006_auto_create_user_profile.sql)
      // The trigger fires for ALL auth flows including signInWithIdToken

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      logger.error('[Auth] Apple sign-in failed', error);
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

      // Clear iOS-specific stored auth data
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences');
          // Clear Apple Sign-In stored data
          await Preferences.remove({ key: 'apple_authorization_code' });
          await Preferences.remove({ key: 'apple_user_id' });
          logger.debug('[Auth] Cleared iOS auth preferences');
        }
      } catch (clearError) {
        // Non-critical - continue with sign out
        logger.warn('[Auth] Could not clear iOS preferences', clearError);
      }

      if (error) throw error;

      return { error: null };
    } catch (error) {
      logger.error('Sign out error', error);
      // Even if sign out fails, force clear local state
      setUser(null);
      setSession(null);
      setUserProfile(null);
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
      logger.error('Password reset error', error);
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
