'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth.service';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toggleTheme, isDark, mounted } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(username, password);
      if (result.success) {
        localStorage.setItem('adminToken', result.token);
        router.push('/admin');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="relative">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="absolute -top-16 right-0 p-3 rounded-lg border-[3px] border-border-main bg-bg-card hover:bg-accent-yellow transition-colors"
          style={{ boxShadow: 'var(--shadow-button)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div
          className="bg-bg-surface p-8 rounded-2xl border-[3px] border-border-main w-full max-w-md"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/icons/tandem-admin-logo.png" alt="Tandem Admin" className="h-16" />
            </div>
            <p className="text-text-secondary font-medium">Sign in to manage puzzles</p>
          </div>

          {error && (
            <div
              className="p-3 mb-6 bg-accent-red/20 border-[3px] border-accent-red rounded-lg text-center"
              style={{ boxShadow: 'var(--shadow-small)' }}
            >
              <p className="text-accent-red font-bold">{error}</p>
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
                className="w-full px-4 py-3 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
                placeholder="Enter username"
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
                className="w-full px-4 py-3 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-accent-blue via-accent-green to-accent-yellow text-text-primary border-[3px] border-border-main font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-2px] transition-transform"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-text-secondary font-medium hover:text-text-primary transition-colors underline"
            >
              ← Back to Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
