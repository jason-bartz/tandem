'use client';

import { useState } from 'react';
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
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signIn, signUp } = useAuth();
  const { highContrast } = useTheme();
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic } = useHaptics();

  if (!isOpen) return null;

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signUp(email, password, {
        full_name: fullName,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`rounded-[32px] border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-md w-full overflow-hidden ${
        highContrast
          ? 'bg-hc-surface border-hc-border'
          : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
      }`}>
        {/* Header */}
        <div className={`border-b-[3px] p-6 ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-900/30 dark:to-purple-900/10 border-gray-300 dark:border-gray-700'
        }`}>
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
            <h2 className={`text-2xl font-bold mb-2 ${
              highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
            }`}>
              {mode === 'welcome' ? 'Play Daily Cryptic' : mode === 'signup' ? 'Create Free Account' : 'Welcome Back'}
            </h2>
            <p className={`text-sm ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {mode === 'welcome' ? 'Create a free account to start solving!' : mode === 'signup' ? 'Get started in seconds' : 'Sign in to continue'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {mode === 'welcome' ? (
            <>
              {/* Benefits */}
              <div className={`p-4 rounded-2xl border-[3px] ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-accent-green/10 border-accent-green/30'
              }`}>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}>
                      <strong>Free daily puzzles</strong> - New cryptic clue every day
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}>
                      <strong>Progressive hints</strong> - Learn as you solve
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}>
                      <strong>Track your progress</strong> - Save your stats
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 text-lg">✓</span>
                    <span className={highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}>
                      <strong>No credit card</strong> - Completely free
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
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
              </div>
            </>
          ) : (
            <>
              {/* Email Form */}
              <form onSubmit={mode === 'signup' ? handleEmailSignUp : handleEmailSignIn} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${
                      highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-[3px] font-medium ${
                        highContrast
                          ? 'bg-hc-background text-hc-text border-hc-border'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-black dark:border-gray-600'
                      } focus:outline-none`}
                      placeholder="John Doe"
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-bold mb-2 ${
                    highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                  }`}>
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
                  <label className={`block text-sm font-bold mb-2 ${
                    highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                  }`}>
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
                  <div className={`p-3 rounded-xl border-[2px] text-sm font-medium ${
                    highContrast
                      ? 'bg-hc-error text-white border-hc-border'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-400 border-red-500'
                  }`}>
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
                  {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
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
