'use client';

import { useState } from 'react';
import { CRYPTIC_CONFIG } from '@/lib/constants';

const CRYPTIC_DEVICES = [
  { value: 'charade', label: 'Charade', description: 'Words joined together' },
  { value: 'container', label: 'Container', description: 'One word holds another' },
  { value: 'deletion', label: 'Deletion', description: 'Remove letters' },
  { value: 'anagram', label: 'Anagram', description: 'Rearrange letters' },
  { value: 'reversal', label: 'Reversal', description: 'Word backwards' },
  { value: 'homophone', label: 'Homophone', description: 'Sounds like' },
  { value: 'hidden', label: 'Hidden', description: 'Word within phrase' },
  { value: 'double_definition', label: 'Double Definition', description: 'Two meanings' },
  { value: 'initial_letters', label: 'Initial Letters', description: 'First letters' },
];

const DIFFICULTY_LEVELS = [
  { value: 2, label: '2 - Easy', description: 'Familiar words, clear wordplay' },
  { value: 3, label: '3 - Medium', description: 'Standard cryptic difficulty' },
  { value: 4, label: '4 - Challenging', description: 'Complex wordplay, requires experience' },
];

/**
 * CrypticAIGenerator - AI-powered cryptic puzzle generation interface
 * Follows Apple HIG: Clear hierarchy, progressive disclosure, accessible controls
 */
export default function CrypticAIGenerator({ onGenerate, onClose, loading }) {
  const [difficulty, setDifficulty] = useState(3);
  const [crypticDevices, setCrypticDevices] = useState([]);
  const [themeHint, setThemeHint] = useState('');
  const [allowMultiWord, setAllowMultiWord] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setError(null);

    // Validate inputs
    if (themeHint && themeHint.length > 100) {
      setError('Theme hint must be 100 characters or less');
      return;
    }

    const options = {
      difficulty,
      crypticDevices: crypticDevices,
      themeHint: themeHint.trim() || null,
      allowMultiWord,
    };

    try {
      await onGenerate?.(options);
    } catch (err) {
      setError(err.message || 'Failed to generate puzzle');
    }
  };

  const selectedDifficultyInfo = DIFFICULTY_LEVELS.find((d) => d.value === difficulty);

  const toggleDevice = (deviceValue) => {
    setCrypticDevices((prev) =>
      prev.includes(deviceValue)
        ? prev.filter((d) => d !== deviceValue)
        : [...prev, deviceValue]
    );
  };

  const selectAllDevices = () => {
    setCrypticDevices(CRYPTIC_DEVICES.map((d) => d.value));
  };

  const clearAllDevices = () => {
    setCrypticDevices([]);
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
        {/* Header - Apple HIG: Clear title and close button */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2
              id="ai-generator-title"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              ✨ AI Puzzle Generator
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate a cryptic crossword puzzle with AI
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
          {/* Error Message - Apple HIG: Clear, actionable error feedback */}
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

          {/* Difficulty Selector - Apple HIG: Segmented control style */}
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
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className={`font-semibold ${
                          difficulty === level.value
                            ? 'text-purple-900 dark:text-purple-100'
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
                        className="w-5 h-5 text-purple-600 dark:text-purple-400"
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

          {/* Theme Hint (Optional) */}
          <div>
            <label
              htmlFor="theme-hint"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Theme or Topic
              <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                (Optional)
              </span>
            </label>
            <input
              id="theme-hint"
              type="text"
              value={themeHint}
              onChange={(e) => setThemeHint(e.target.value)}
              placeholder="e.g., space, animals, music..."
              maxLength={100}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Give the AI a hint about what topic or theme you'd like the puzzle to be about
            </p>
          </div>

          {/* Multi-Word Phrase Option - Always Visible */}
          <div>
            <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all bg-purple-50 dark:bg-purple-900/20">
              <input
                type="checkbox"
                checked={allowMultiWord}
                onChange={(e) => setAllowMultiWord(e.target.checked)}
                disabled={loading}
                className="mt-0.5 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 disabled:cursor-not-allowed"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-purple-900 dark:text-purple-100">
                  Require Multi-Word Phrases
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  AI will generate 2-3 word answers only (e.g., "DOWN IN THE DUMPS", "BLUE FEATHERS")
                </div>
                {allowMultiWord && (
                  <div className="mt-2 text-xs font-medium text-purple-800 dark:text-purple-200 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Single-word answers will be rejected
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Advanced Options - Progressive Disclosure */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                {/* Cryptic Device Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cryptic Devices
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({crypticDevices.length} selected)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllDevices}
                        disabled={loading || crypticDevices.length === CRYPTIC_DEVICES.length}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllDevices}
                        disabled={loading || crypticDevices.length === 0}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CRYPTIC_DEVICES.map((device) => (
                      <label
                        key={device.value}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${
                            crypticDevices.includes(device.value)
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                          }
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={crypticDevices.includes(device.value)}
                          onChange={() => toggleDevice(device.value)}
                          disabled={loading}
                          className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-medium ${
                              crypticDevices.includes(device.value)
                                ? 'text-purple-900 dark:text-purple-100'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {device.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {device.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {crypticDevices.length === 0
                      ? 'None selected - AI will choose any device'
                      : `AI will use all ${crypticDevices.length} selected device${crypticDevices.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info Box - Apple HIG: Helpful context */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-purple-900 dark:text-purple-100">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-purple-800 dark:text-purple-200">
                  <li>• AI generates a cryptic crossword clue with emoji hints</li>
                  <li>• Includes 4 progressive hints to help solvers</li>
                  <li>• You can review and edit before saving</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Apple HIG: Primary action emphasized */}
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
            disabled={loading}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg"
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
                Generate Puzzle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
