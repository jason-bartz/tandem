'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="bg-bg-surface p-8 rounded-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-text-primary mb-2">Reset Password</h1>
          <p className="text-text-secondary text-sm">
            {sent
              ? 'Check your email for a reset link.'
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-accent-red/20 rounded-lg text-center">
            <p className="text-accent-red font-bold text-sm">{error}</p>
          </div>
        )}

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 bg-accent-green/10 rounded-lg text-center">
              <p className="text-accent-green font-semibold text-sm">
                If an account exists with that email, a reset link has been sent.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full px-6 py-3 bg-accent-blue text-white font-bold rounded-lg transition-transform"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-text-primary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-accent-blue text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/admin/login')}
            className="text-sm text-text-secondary font-medium hover:text-text-primary transition-colors underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
