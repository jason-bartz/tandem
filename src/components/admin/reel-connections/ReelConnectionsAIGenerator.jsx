'use client';

import { useState } from 'react';

const DIFFICULTY_LEVELS = [
  { value: 'easiest', label: 'Easiest', description: 'Very well-known, popular movies' },
  { value: 'easy', label: 'Easy', description: 'Popular, widely recognized movies' },
  { value: 'medium', label: 'Medium', description: 'Mix of popular and moderately known' },
  { value: 'hardest', label: 'Hardest', description: 'Can include lesser-known films' },
];

/**
 * ReelConnectionsAIGenerator - AI-powered movie generation interface
 */
export default function ReelConnectionsAIGenerator({
  onGenerate,
  onClose,
  loading,
  initialConnection = '',
  initialDifficulty = 'medium',
}) {
  const [connection, setConnection] = useState(initialConnection);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setError(null);

    if (!connection.trim() || connection.trim().length < 3) {
      setError('Connection must be at least 3 characters');
      return;
    }

    try {
      await onGenerate?.({ connection: connection.trim(), difficulty });
    } catch (err) {
      setError(err.message || 'Failed to generate movies');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-labelledby="ai-generator-title"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2
              id="ai-generator-title"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              ✨ AI Movie Generator
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate 4 movies for your connection
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            aria-label="Close generator"
          >
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Connection Input */}
          <div>
            <label
              htmlFor="connection-input"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Connection
            </label>
            <input
              id="connection-input"
              type="text"
              value={connection}
              onChange={(e) => setConnection(e.target.value)}
              placeholder="e.g., Best Picture nominees, Spielberg movies, superhero films..."
              maxLength={100}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-accent-red focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Describe what connects the 4 movies (e.g., director, genre, theme, awards)
            </p>
          </div>

          {/* Difficulty Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Difficulty Level
            </label>
            <div className="space-y-2">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setDifficulty(level.value)}
                  disabled={loading}
                  className={`
                    w-full px-4 py-3 rounded-lg border-2 text-left transition-all
                    ${
                      difficulty === level.value
                        ? 'border-accent-red bg-accent-red/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-accent-red/50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className={`font-semibold ${
                          difficulty === level.value
                            ? 'text-accent-red'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {level.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {level.description}
                      </div>
                    </div>
                    {difficulty === level.value && (
                      <svg
                        className="w-5 h-5 text-accent-red"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-gray-900 dark:text-white">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• AI generates 4 movies that fit your connection</li>
                  <li>• Each movie is verified to have a poster</li>
                  <li>• Connection text is refined and formatted</li>
                  <li>• You can review and edit before saving</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !connection.trim()}
            className="flex-1 px-6 py-3 bg-accent-red text-white rounded-lg hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Movies
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
