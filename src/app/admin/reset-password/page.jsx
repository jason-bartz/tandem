'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <div className="bg-bg-surface p-8 rounded-lg w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-text-primary mb-4">Invalid Link</h1>
          <p className="text-text-secondary text-sm mb-6">
            This password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => router.push('/admin/forgot-password')}
            className="px-6 py-3 bg-accent-blue text-white font-bold rounded-lg transition-transform"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="bg-bg-surface p-8 rounded-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-text-primary mb-2">Set New Password</h1>
          <p className="text-text-secondary text-sm">Enter your new password below.</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-accent-red/20 rounded-lg text-center">
            <p className="text-accent-red font-bold text-sm">{error}</p>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-accent-green/10 rounded-lg text-center">
              <p className="text-accent-green font-semibold text-sm">
                Your password has been reset successfully.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full px-6 py-3 bg-accent-blue text-white font-bold rounded-lg transition-transform"
            >
              Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-text-primary mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-text-muted">
                Must include uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-text-primary mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-accent-blue text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
