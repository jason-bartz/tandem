'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth.service';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(username, password);
      if (result.success) {
        const saved = await storageService.set('adminToken', result.token);
        if (saved) {
          router.push('/admin');
        } else {
          setError('Failed to save login session. Please clear browser storage and try again.');
        }
      } else {
        if (result.locked) {
          setError('Too many failed attempts. Please try again later.');
        } else if (result.remainingAttempts !== undefined) {
          setError(`Invalid credentials. ${result.remainingAttempts} attempts remaining.`);
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      logger.error('Login error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="relative">
        <div className="bg-bg-surface p-8 rounded-lg w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/admin-login-logo.png" alt="Tandem Admin" className="h-16" />
            </div>
            <p className="text-text-secondary font-medium">Sign in to manage puzzles</p>
          </div>

          {error && (
            <div className="p-3 mb-6 bg-accent-red/20 rounded-lg text-center">
              <p className="text-accent-red font-bold text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-text-primary mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bg-surface rounded-md text-text-primary border-0 h-12 px-4 font-medium focus:bg-bg-card focus:border-2 focus:border-primary focus:outline-none"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-surface rounded-md text-text-primary border-0 h-12 px-4 font-medium focus:bg-bg-card focus:border-2 focus:border-primary focus:outline-none"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-accent-blue text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-text-secondary font-medium hover:text-text-primary transition-colors underline"
            >
              Back to Game
            </button>
            <button
              onClick={() => router.push('/admin/forgot-password')}
              className="text-sm text-accent-blue font-medium hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
