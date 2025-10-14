'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/auth.service';

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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '1.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src="/icons/tandem-admin-logo.png" alt="Tandem Admin" style={{ height: '60px' }} />
          </div>
          <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>Sign in to manage puzzles</p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.5rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem',
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                outline: 'none',
              }}
              placeholder="Enter username"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                outline: 'none',
              }}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'linear-gradient(to right, #0EA5E9, #14B8A6)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            ← Back to Game
          </button>
        </div>
      </div>
    </div>
  );
}
