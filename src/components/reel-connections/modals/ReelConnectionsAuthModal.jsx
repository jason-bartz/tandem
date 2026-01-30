'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { generateRandomUsername } from '@/utils/usernameGenerator';
import { validateUsername } from '@/utils/profanityFilter';
import Image from 'next/image';
import ReelConnectionsModal from './ReelConnectionsModal';
import logger from '@/lib/logger';

/**
 * ReelConnectionsAuthModal - Cinema-themed authentication modal
 *
 * Handles both sign up and login flows with Reel Connections styling.
 * Includes email/password auth (web and iOS) and Apple Sign In (iOS only).
 *
 * Props:
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {string} initialMode - 'signup', 'login', or 'reset' (default: 'signup')
 * @param {function} onSuccess - Callback after successful authentication
 */
export default function ReelConnectionsAuthModal({
  isOpen,
  onClose,
  initialMode = 'signup',
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { signUp, signIn, signInWithApple, signInWithGoogle, signInWithDiscord, resetPassword } =
    useAuth();
  const isIOS = Capacitor.getPlatform() === 'ios';
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Pre-fill username with random name on signup mode
  useEffect(() => {
    if (mode === 'signup' && !username) {
      setUsername(generateRandomUsername());
    }
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Validate username with comprehensive profanity filter
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
          setError(usernameValidation.error);
          setLoading(false);
          return;
        }

        // Sign up
        const { error } = await signUp(email, password, {
          username: username,
        });

        if (error) {
          setError(error.message);
        } else {
          // Success - switch to login mode with confirmation message
          setSuccessMessage(
            'Account created! Please check your email for a confirmation link, then sign in.'
          );
          setMode('login');
          setPassword('');
          setUsername('');
        }
      } else if (mode === 'reset') {
        // Password reset
        const { error } = await resetPassword(email);

        if (error) {
          setError(error.message);
        } else {
          // Success - show confirmation message
          setSuccessMessage(
            'Password reset email sent! Check your inbox for a link to reset your password.'
          );
          setMode('login');
          setPassword('');
        }
      } else {
        // Login
        const { error } = await signIn(email, password);

        if (error) {
          setError(error.message);
        } else {
          // Success
          onSuccess?.();
          onClose();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Apple Sign In
   */
  const handleAppleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error: appleError } = await signInWithApple();

      if (appleError) {
        if (appleError.message?.includes('popup')) {
          setError('Please allow popups to sign in with Apple.');
        } else if (
          appleError.message?.includes('network') ||
          appleError.message?.includes('timeout')
        ) {
          setError('Connection issue. Check your internet and try again.');
        } else {
          setError('Unable to sign in with Apple. Please try again or use email.');
        }
        setLoading(false);
      } else {
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      logger.error('Apple sign in error:', err);
      setError('Unable to sign in with Apple. Please try again or use email.');
      setLoading(false);
    }
  };

  /**
   * Handle Google Sign In
   * Available on both web and iOS
   */
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error: googleError } = await signInWithGoogle();

      if (googleError) {
        if (googleError.message?.includes('popup')) {
          setError('Please allow popups to sign in with Google.');
        } else if (
          googleError.message?.includes('network') ||
          googleError.message?.includes('timeout')
        ) {
          setError('Connection issue. Check your internet and try again.');
        } else {
          setError('Unable to sign in with Google. Please try again or use email.');
        }
        setLoading(false);
      } else {
        // On web: user will be redirected to Google OAuth
        // On iOS: Safari opens, we wait for deep link callback
        if (!isNative) {
          // Web: redirect is happening, keep loading
        } else {
          // iOS: Safari opened, reset loading since user might cancel
          setLoading(false);
        }
      }
    } catch (err) {
      logger.error('Google sign in error:', err);
      setError('Unable to sign in with Google. Please try again or use email.');
      setLoading(false);
    }
  };

  /**
   * Handle Discord Sign In
   * Available on both web and iOS
   */
  const handleDiscordSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error: discordError } = await signInWithDiscord();

      if (discordError) {
        if (discordError.message?.includes('popup')) {
          setError('Please allow popups to sign in with Discord.');
        } else if (
          discordError.message?.includes('network') ||
          discordError.message?.includes('timeout')
        ) {
          setError('Connection issue. Check your internet and try again.');
        } else {
          setError('Unable to sign in with Discord. Please try again or use email.');
        }
        setLoading(false);
      } else {
        if (!isNative) {
          // Web: redirect is happening, keep loading
        } else {
          // iOS: Safari opened, reset loading since user might cancel
          setLoading(false);
        }
      }
    } catch (err) {
      logger.error('Discord sign in error:', err);
      setError('Unable to sign in with Discord. Please try again or use email.');
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleGenerateUsername = () => {
    setUsername(generateRandomUsername());
  };

  const modalTitle =
    mode === 'signup'
      ? 'Join the Leaderboard'
      : mode === 'reset'
        ? 'Reset Password'
        : 'Welcome Back';

  return (
    <ReelConnectionsModal isOpen={isOpen} onClose={onClose} title={modalTitle} maxHeight="90vh">
      <div className="space-y-4">
        {/* Cinema-themed header message */}
        {mode === 'signup' && (
          <div className="text-center mb-4">
            <p className="text-white/70 text-sm">
              Create a free account to compete on the leaderboard and track your stats across
              devices
            </p>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-3 bg-[#7ed957]/20 border-2 border-[#7ed957] rounded-xl relative">
            <button
              onClick={() => setSuccessMessage(null)}
              className="absolute top-2 right-2 text-[#7ed957] hover:text-white"
              aria-label="Close message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <p className="text-sm text-[#7ed957] pr-6">{successMessage}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-[#ff5757]/20 border-2 border-[#ff5757] rounded-xl">
            <p className="text-sm text-[#ff5757]">{error}</p>
          </div>
        )}

        {/* Social Sign In Buttons */}

        {/* Sign in with Google - Available on both web and iOS */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          aria-label={mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
          className={`w-full p-4 rounded-xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center gap-3 ${
            loading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)]'
          } bg-ghost-white text-gray-700 border-black`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-700 border-t-transparent"></div>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="font-bold">
                {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
              </span>
            </>
          )}
        </button>

        {/* Sign in with Apple - iOS only */}
        {isIOS && (
          <button
            onClick={handleAppleSignIn}
            disabled={loading}
            type="button"
            aria-label="Sign in with Apple"
            className={`w-full p-4 rounded-xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center gap-3 ${
              loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)]'
            } bg-ghost-white text-black border-black`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span className="font-bold">Sign in with Apple</span>
              </>
            )}
          </button>
        )}

        {/* Sign in with Discord - Available on both web and iOS */}
        <button
          onClick={handleDiscordSignIn}
          disabled={loading}
          type="button"
          aria-label={mode === 'signup' ? 'Sign up with Discord' : 'Sign in with Discord'}
          className={`w-full p-4 rounded-xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center gap-3 ${
            loading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)]'
          } bg-[#5865F2] text-white border-black`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
              </svg>
              <span className="font-bold">
                {mode === 'signup' ? 'Sign up with Discord' : 'Sign in with Discord'}
              </span>
            </>
          )}
        </button>

        {/* Divider between social sign-in and email form */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-ghost-white/20"></div>
          <span className="text-sm text-white/50">or</span>
          <div className="flex-1 h-px bg-ghost-white/20"></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-white/80 mb-2">
                Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                    setUsername(sanitized);
                  }}
                  className="flex-1 px-4 py-3 bg-ghost-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/40 focus:border-[#ffce00] focus:outline-none transition-colors"
                  placeholder="your_username"
                  minLength={3}
                  maxLength={20}
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateUsername}
                  className="w-12 h-12 flex items-center justify-center bg-ghost-white/10 border-2 border-white/20 rounded-xl hover:bg-ghost-white/20 hover:border-[#ffce00] transition-all"
                  aria-label="Generate random username"
                  title="Generate random username"
                >
                  <Image src="/icons/ui/dice-dark.png" alt="Generate" width={24} height={24} />
                </button>
              </div>
              <p className="mt-1 text-xs text-white/50">
                3-20 characters. Visible on leaderboards.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-white/80 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-ghost-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/40 focus:border-[#ffce00] focus:outline-none transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-bold text-white/80">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setSuccessMessage(null);
                      setPassword('');
                    }}
                    className="text-xs font-medium text-[#ffce00] hover:text-[#ffce00]/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-ghost-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/40 focus:border-[#ffce00] focus:outline-none transition-colors"
                placeholder="••••••••"
                minLength={6}
                required
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-white/50">Must be at least 6 characters</p>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <p className="text-sm text-white/60">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#ffce00] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg tracking-wide gold-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading
              ? 'Please wait...'
              : mode === 'signup'
                ? 'Create Account'
                : mode === 'reset'
                  ? 'Send Reset Link'
                  : 'Sign In'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center pt-2">
          {mode === 'reset' ? (
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm font-semibold text-white/70 hover:text-[#ffce00] transition-colors"
            >
              Back to sign in
            </button>
          ) : (
            <button
              onClick={toggleMode}
              className="text-sm font-semibold text-white/70 hover:text-[#ffce00] transition-colors"
            >
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          )}
        </div>
      </div>
    </ReelConnectionsModal>
  );
}
