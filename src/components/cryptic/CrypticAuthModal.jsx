'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * CrypticAuthModal - Specialized auth modal for Daily Cryptic
 * Explains the free daily puzzle access model and encourages sign up
 */
export default function CrypticAuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('welcome'); // welcome, signup, login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signIn, signUp, signInWithApple } = useAuth();
  const { highContrast } = useTheme();
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic } = useHaptics();
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  if (!isOpen) return null;

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(
        'Username must be 3-20 characters and can only contain letters, numbers, and underscores'
      );
      setLoading(false);
      errorHaptic();
      return;
    }

    try {
      const result = await signUp(email, password, {
        username: username,
      });

      if (result.error) {
        setError(result.error.message);
        errorHaptic();
      } else {
        successHaptic();
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to sign up');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        setError(result.error.message);
        errorHaptic();
      } else {
        successHaptic();
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    console.log('[CrypticAuthModal] Apple Sign-In button clicked');
    console.log('[CrypticAuthModal] Platform check:', {
      isNative,
      platform: typeof window !== 'undefined' ? window.Capacitor?.getPlatform() : 'unknown',
    });

    setLoading(true);
    setError(null);

    try {
      console.log('[CrypticAuthModal] Calling signInWithApple()...');
      const result = await signInWithApple();

      console.log('[CrypticAuthModal] signInWithApple() returned:', {
        hasUser: !!result?.user,
        hasSession: !!result?.session,
        hasError: !!result?.error,
        errorMessage: result?.error?.message,
      });

      if (result.error) {
        console.error('[CrypticAuthModal] Apple Sign-In error:', result.error);
        setError(result.error.message || 'Failed to sign in with Apple');
        errorHaptic();
      } else {
        console.log('[CrypticAuthModal] Apple Sign-In successful');
        successHaptic();
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('[CrypticAuthModal] Apple Sign-In exception:', err);
      setError(err.message || 'Failed to sign in with Apple');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className={`rounded-[32px] border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-md w-full overflow-hidden ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header */}
        <div
          className={`border-b-[3px] p-6 ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-900/30 dark:to-purple-900/10 border-gray-300 dark:border-gray-700'
          }`}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-xl border-[2px] text-lg font-bold transition-all ${
                highContrast
                  ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="text-center">
            <img
              src="/images/daily-cryptic-logo.webp"
              alt="Daily Cryptic"
              className="w-20 h-20 mx-auto mb-4 rounded-xl dark:hidden"
            />
            <img
              src="/images/daily-cryptic-logo-dark.webp"
              alt="Daily Cryptic"
              className="w-20 h-20 mx-auto mb-4 rounded-xl hidden dark:block"
            />
            <h2
              className={`text-2xl font-bold mb-2 ${
                highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
              }`}
            >
              {mode === 'welcome'
                ? 'Play Daily Cryptic'
                : mode === 'signup'
                  ? 'Create Free Account'
                  : 'Welcome Back'}
            </h2>
            <p
              className={`text-sm ${
                highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {mode === 'welcome'
                ? 'Create a free account to start solving!'
                : mode === 'signup'
                  ? 'Get started in seconds'
                  : 'Sign in to continue'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {mode === 'welcome' ? (
            <>
              {/* Benefits */}
              <div
                className={`p-4 rounded-2xl border-[3px] ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-green/10 border-accent-green/30'
                }`}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span
                      className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}
                    >
                      <strong>Free daily puzzles</strong> - New cryptic clue every day
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span
                      className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}
                    >
                      <strong>Progressive hints</strong> - Learn as you solve
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span
                      className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}
                    >
                      <strong>Track your progress</strong> - Save your stats
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span
                      className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}
                    >
                      <strong>Compete on leaderboards</strong> - Daily and all-time rankings
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span
                      className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}
                    >
                      <strong>No credit card</strong> - Completely free
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                {isNative ? (
                  /* Apple Sign-In button for iOS */
                  <button
                    onClick={handleAppleSignIn}
                    disabled={loading}
                    className={`w-full px-6 py-3 font-bold rounded-[20px] border-[3px] transition-all flex items-center justify-center gap-2 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      highContrast
                        ? 'bg-black text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                        : 'bg-black text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    {loading ? 'Signing in...' : 'Sign in with Apple'}
                  </button>
                ) : (
                  /* Email auth buttons for web */
                  <>
                    <button
                      onClick={() => setMode('signup')}
                      className={`w-full px-6 py-3 font-bold rounded-[20px] border-[3px] transition-all ${
                        highContrast
                          ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                      }`}
                      style={!highContrast ? { backgroundColor: '#cb6ce6' } : {}}
                    >
                      Create Free Account
                    </button>

                    <button
                      onClick={() => setMode('login')}
                      className={`w-full px-6 py-3 font-bold rounded-[20px] border-[3px] transition-all ${
                        highContrast
                          ? 'bg-hc-surface text-hc-text border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                      }`}
                    >
                      I Already Have an Account
                    </button>
                  </>
                )}

                {/* Error display for Apple Sign-In on iOS */}
                {isNative && error && (
                  <div
                    className={`p-3 rounded-xl border-[2px] ${
                      highContrast
                        ? 'bg-hc-error/20 border-hc-error text-hc-text'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Email Form */}
              <form
                onSubmit={mode === 'signup' ? handleEmailSignUp : handleEmailSignIn}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div>
                    <label
                      className={`block text-sm font-bold mb-2 ${
                        highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        // Only allow alphanumeric and underscore
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                        setUsername(sanitized);
                      }}
                      className={`w-full px-4 py-3 rounded-xl border-[3px] font-medium ${
                        highContrast
                          ? 'bg-hc-background text-hc-text border-hc-border'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-black dark:border-gray-600'
                      } focus:outline-none`}
                      placeholder="your_username"
                      minLength={3}
                      maxLength={20}
                      required
                      disabled={loading}
                    />
                    <p
                      className={`mt-1 text-xs ${
                        highContrast ? 'text-hc-text' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      3-20 characters, letters, numbers, and underscores only
                    </p>
                  </div>
                )}

                <div>
                  <label
                    className={`block text-sm font-bold mb-2 ${
                      highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-[3px] font-medium ${
                      highContrast
                        ? 'bg-hc-background text-hc-text border-hc-border'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-black dark:border-gray-600'
                    } focus:outline-none`}
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-bold mb-2 ${
                      highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-[3px] font-medium ${
                      highContrast
                        ? 'bg-hc-background text-hc-text border-hc-border'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-black dark:border-gray-600'
                    } focus:outline-none`}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {error && (
                  <div
                    className={`p-3 rounded-xl border-[2px] text-sm font-medium ${
                      highContrast
                        ? 'bg-hc-error text-white border-hc-border'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-400 border-red-500'
                    }`}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-6 py-3 font-bold rounded-[20px] border-[3px] transition-all ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    highContrast
                      ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      : 'text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  }`}
                  style={!highContrast ? { backgroundColor: '#cb6ce6' } : {}}
                >
                  {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* Toggle Mode */}
              <div className="text-center">
                <button
                  onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                  className={`text-sm font-medium ${
                    highContrast ? 'text-hc-primary' : 'text-accent-blue dark:text-accent-blue'
                  } hover:underline`}
                >
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>

              {/* Back Button */}
              <div className="text-center">
                <button
                  onClick={() => setMode('welcome')}
                  className={`text-sm font-medium ${
                    highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
                  } hover:underline`}
                >
                  ← Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
