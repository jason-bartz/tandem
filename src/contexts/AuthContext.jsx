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
  signInWithDiscord: async () => {},
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
 * Validate and sanitize a return URL path for OAuth redirects
 * Prevents open redirect vulnerabilities
 *
 * @param {string} path - The path to validate
 * @returns {string} - Safe path or '/' if invalid
 */
function getSafeReturnPath(path) {
  if (!path || typeof path !== 'string') return '/';

  // SECURITY: Validate the path is safe to prevent open redirects
  const isSafePath =
    path.startsWith('/') && // Must start with /
    !path.startsWith('//') && // Prevent protocol-relative URLs (//evil.com)
    !path.includes('://') && // Prevent absolute URLs with protocols
    !path.includes('\\') && // Prevent backslash tricks
    !/^\/[^/]*@/.test(path) && // Prevent URL schemes like /javascript:
    path.length < 500; // Reasonable length limit

  return isSafePath ? path : '/';
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

        // NOTE: Leaderboard sync on sign-in has been REMOVED
        //
        // Why: Syncing local storage stats to leaderboard on sign-in caused
        // cross-account contamination on shared devices. Local storage stats
        // from previous users would be incorrectly attributed to new accounts.
        //
        // How major games handle this:
        // - Wordle/NYT: Server-authoritative, fetch FROM server on login
        // - Clash of Clans: Account-bound, no automatic merging
        // - Pokemon GO: 100% server-side, local is UI cache only
        //
        // The correct approach: Leaderboard entries are ONLY created/updated
        // when a user actually plays a game and sets a new best streak.
        // See: leaderboardSync.syncCurrentStreakToLeaderboard() which is called
        // from individual game hooks (useGameWithInitialData, useMiniGame, etc.)
        // after a win that matches/exceeds the best streak.

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

  // Handle OAuth deep link callbacks on iOS (for Google Sign In)
  useEffect(() => {
    const setupDeepLinkHandler = async () => {
      const isNative =
        typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();

      if (!isNative) return;

      try {
        const { App } = await import('@capacitor/app');
        const { Browser } = await import('@capacitor/browser');

        // Listen for deep links (app URL open events)
        const listener = await App.addListener('appUrlOpen', async ({ url }) => {
          logger.debug('[AuthContext] Received deep link', url);

          // Check if this is an auth callback
          if (url.includes('auth/callback')) {
            // Close the browser if it's still open
            try {
              await Browser.close();
            } catch (e) {
              // Browser may already be closed, that's ok
            }

            // Extract the authorization code from URL params
            // PKCE flow returns code in query params
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');

            if (code) {
              logger.debug('[AuthContext] Exchanging code for session');
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) {
                logger.error('[AuthContext] Failed to exchange code for session', error);
              } else {
                logger.debug('[AuthContext] Successfully exchanged code for session');
              }
            } else {
              // Check for error in URL (user cancelled or OAuth error)
              const errorParam = urlObj.searchParams.get('error');
              const errorDescription = urlObj.searchParams.get('error_description');
              if (errorParam) {
                logger.warn('[AuthContext] OAuth error:', errorParam, errorDescription);
              }
            }
          }
        });

        // Store cleanup function
        return () => {
          listener.remove();
        };
      } catch (error) {
        logger.error('[AuthContext] Failed to setup deep link handler', error);
      }
    };

    const cleanup = setupDeepLinkHandler();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
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
   * Works on both web and iOS:
   * - Web: Standard OAuth redirect to Google, then back to /auth/callback
   * - iOS: Opens Safari/SFSafariViewController for OAuth, returns via deep link
   *
   * @returns {Promise<{error}>}
   */
  const signInWithGoogle = async () => {
    try {
      const isNative =
        typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();

      if (isNative) {
        // iOS: Open external browser for Google OAuth
        // WKWebView cannot handle OAuth redirects properly
        const { Browser } = await import('@capacitor/browser');

        // Get the OAuth URL without auto-redirecting
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.tandemdaily.app://auth/callback',
            skipBrowserRedirect: true, // Get URL instead of auto-redirecting
          },
        });

        if (error) throw error;

        // Open the OAuth URL in Safari/SFSafariViewController
        await Browser.open({
          url: data.url,
          presentationStyle: 'popover', // Uses SFSafariViewController on iOS
        });

        return { error: null };
      } else {
        // Web: Standard OAuth redirect
        // Store current path to return to after OAuth (validated for security)
        const safePath = getSafeReturnPath(window.location.pathname);
        document.cookie = `auth_return_url=${encodeURIComponent(safePath)}; path=/; max-age=300; SameSite=Lax; Secure`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        return { error: null };
      }
    } catch (error) {
      logger.error('Google sign in error', error);
      return { error };
    }
  };

  /**
   * Sign in with Discord OAuth
   *
   * Works on both web and iOS:
   * - Web: Standard OAuth redirect to Discord, then back to /auth/callback
   * - iOS: Opens Safari/SFSafariViewController for OAuth, returns via deep link
   *
   * @returns {Promise<{error}>}
   */
  const signInWithDiscord = async () => {
    try {
      const isNative =
        typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();

      if (isNative) {
        // iOS: Open external browser for Discord OAuth
        const { Browser } = await import('@capacitor/browser');

        // Get the OAuth URL without auto-redirecting
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: {
            redirectTo: 'com.tandemdaily.app://auth/callback',
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        // Open the OAuth URL in Safari/SFSafariViewController
        await Browser.open({
          url: data.url,
          presentationStyle: 'popover',
        });

        return { error: null };
      } else {
        // Web: Standard OAuth redirect (validated for security)
        const safePath = getSafeReturnPath(window.location.pathname);
        document.cookie = `auth_return_url=${encodeURIComponent(safePath)}; path=/; max-age=300; SameSite=Lax; Secure`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        return { error: null };
      }
    } catch (error) {
      logger.error('Discord sign in error', error);
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
        // On web, use Supabase's Apple OAuth (validated for security)
        const safePath = getSafeReturnPath(window.location.pathname);
        document.cookie = `auth_return_url=${encodeURIComponent(safePath)}; path=/; max-age=300; SameSite=Lax; Secure`;

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

      // Clear anonymous/shared storage keys to prevent cross-account contamination
      // This ensures the next user who signs in won't inherit previous user's stats
      try {
        const storageServiceModule = await import('@/core/storage/storageService');
        const storageServiceInst = storageServiceModule.default;
        const { SOUP_STORAGE_KEYS } = await import('@/lib/daily-alchemy.constants');
        const { STORAGE_KEYS, MINI_STORAGE_KEYS } = await import('@/lib/constants');

        // Clear anonymous stats keys that could leak to new accounts
        // NOTE: User-namespaced keys (e.g., tandem_stats_user_{id}) are kept
        // so users can sign back in and recover their data
        await Promise.allSettled([
          storageServiceInst.remove('reel-connections-stats'),
          storageServiceInst.remove(SOUP_STORAGE_KEYS.STATS),
          storageServiceInst.remove(STORAGE_KEYS.STATS), // tandem_stats (anonymous key)
          storageServiceInst.remove(MINI_STORAGE_KEYS.STATS), // mini_stats (anonymous key)
        ]);

        logger.debug('[Auth] Cleared anonymous stats keys on sign-out');
      } catch (clearStatsError) {
        // Non-critical - continue with sign out
        logger.warn('[Auth] Could not clear anonymous stats', clearStatsError);
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
    signInWithDiscord,
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
