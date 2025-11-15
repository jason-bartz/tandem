'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Reset Password Page
 *
 * This page is shown when users click the password reset link in their email.
 * It allows them to enter a new password.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Exchange the URL hash for a session
    const handlePasswordReset = async () => {
      try {
        // First, let Supabase automatically detect and handle the session from URL
        // This is important because Supabase has built-in handling for PKCE flow
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to let Supabase process the URL

        // Now check if we have a session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new one.');
          return;
        }

        if (session) {
          setSessionReady(true);
          return;
        }

        // If no session yet, manually try to extract and set session from hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && access_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error('Session setup error:', error);
            setError('Invalid or expired reset link. Please request a new one.');
            return;
          }

          if (data.session) {
            setSessionReady(true);

            window.history.replaceState(null, '', window.location.pathname);
          } else {
            setError('Invalid or expired reset link. Please request a new one.');
          }
        } else {
          // No valid session or hash parameters
          setError('Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        console.error('Error setting up password reset:', err);
        setError('An error occurred. Please try again.');
      }
    };

    handlePasswordReset();
  }, [supabase.auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Double-check session is still valid before attempting update
    if (!sessionReady) {
      setError('Session expired. Please request a new password reset link.');
      return;
    }

    setLoading(true);

    try {
      // Verify we still have a valid session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('Auth session missing. Please request a new password reset link.');
        setSessionReady(false);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (error.message?.includes('session') || error.message?.includes('token')) {
          setError('Session expired. Please request a new password reset link.');
          setSessionReady(false);
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
      setLoading(false);
    }
  };

  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] max-w-md w-full p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-pink border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] max-w-md w-full p-8">
          <div className="text-center">
            <div className="mb-4 text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Password Updated!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your password has been successfully updated. Redirecting you to the home page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] max-w-md w-full p-8">
          <div className="text-center">
            <div className="mb-4 text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Reset Link
            </h2>
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full p-4 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider bg-accent-pink border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Set New Password</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Must be at least 6 characters
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-accent-pink border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-accent-pink dark:hover:text-accent-pink transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
