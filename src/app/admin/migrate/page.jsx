'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/lib/constants';

export default function MigratePage() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async (format) => {
    setStatus('running');
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        setError('Not logged in as admin. Please log in first.');
        setStatus('error');
        return;
      }

      const response = await fetch(`/api/admin/puzzles/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/admin')}
          className="mb-6 text-blue-400 hover:text-blue-300"
        >
          &larr; Back to Admin
        </button>

        <h1 className="text-3xl font-bold mb-8">Tandem Puzzle Migration</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Export / Migrate Puzzles</h2>
          <p className="text-gray-400 mb-4">
            Export all Daily Tandem puzzles from Vercel KV, or migrate them directly to Supabase.
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => runMigration('json')}
              disabled={status === 'running'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg"
            >
              {status === 'running' ? 'Running...' : 'Export as JSON'}
            </button>

            <button
              onClick={() => runMigration('migrate')}
              disabled={status === 'running'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg"
            >
              {status === 'running' ? 'Running...' : 'Migrate to Supabase'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-400">Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="font-semibold text-green-400 mb-4">
              {result.success ? 'Success!' : 'Completed with issues'}
            </h3>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Message:</span> {result.message}
              </p>

              {result.migrated !== undefined && (
                <p>
                  <span className="text-gray-400">Migrated:</span>{' '}
                  <span className="text-green-400">{result.migrated}</span>
                </p>
              )}

              {result.failed !== undefined && result.failed > 0 && (
                <p>
                  <span className="text-gray-400">Failed:</span>{' '}
                  <span className="text-red-400">{result.failed}</span>
                </p>
              )}

              {result.count !== undefined && (
                <p>
                  <span className="text-gray-400">Total puzzles:</span> {result.count}
                </p>
              )}

              {result.totalInKV !== undefined && (
                <p>
                  <span className="text-gray-400">Total in KV:</span> {result.totalInKV}
                </p>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 mb-2">Errors:</p>
                  <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.errors, null, 2)}
                  </pre>
                </div>
              )}

              {result.puzzles && (
                <div className="mt-4">
                  <p className="text-gray-400 mb-2">Puzzles ({result.puzzles.length}):</p>
                  <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(result.puzzles, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
