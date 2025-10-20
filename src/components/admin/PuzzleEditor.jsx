'use client';
import { useState, useEffect } from 'react';
import adminService from '@/services/admin.service';
import logger from '@/lib/logger';

export default function PuzzleEditor({ initialPuzzle, onClose }) {
  const [selectedDate, setSelectedDate] = useState(
    initialPuzzle?.date || new Date().toISOString().split('T')[0]
  );
  const [theme, setTheme] = useState(initialPuzzle?.theme || '');
  const [puzzles, setPuzzles] = useState(
    initialPuzzle?.puzzles || [
      { emoji: '', answer: '', hint: '' },
      { emoji: '', answer: '', hint: '' },
      { emoji: '', answer: '', hint: '' },
      { emoji: '', answer: '', hint: '' },
    ]
  );
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialPuzzle) {
      setSelectedDate(initialPuzzle.date);
      setTheme(initialPuzzle.theme || '');
      setPuzzles(
        initialPuzzle.puzzles || [
          { emoji: '', answer: '', hint: '' },
          { emoji: '', answer: '', hint: '' },
          { emoji: '', answer: '', hint: '' },
          { emoji: '', answer: '', hint: '' },
        ]
      );
      // Clear the message when switching puzzles
      setMessage('');
    }
  }, [initialPuzzle]);

  const handlePuzzleChange = (index, field, value) => {
    const newPuzzles = [...puzzles];
    if (field === 'answer') {
      newPuzzles[index][field] = value.toUpperCase();
    } else if (field === 'hint') {
      // Limit hint length to 60 characters
      newPuzzles[index][field] = value.slice(0, 60);
    } else {
      newPuzzles[index][field] = value;
    }
    setPuzzles(newPuzzles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await adminService.savePuzzle(selectedDate, {
        theme,
        puzzles: puzzles.map((p) => ({
          emoji: p.emoji.trim(),
          answer: p.answer.trim().toUpperCase(),
          hint: p.hint?.trim() || '', // Include hint in save
        })),
      });

      if (result.success) {
        setMessage(`✅ Puzzle saved for ${formatDateDisplay(selectedDate)}`);
        if (onClose) {
          setTimeout(() => onClose(), 1500);
        }
      } else {
        setMessage(`❌ Failed to save puzzle: ${result.error || 'Unknown error'}`);
        logger.error('Puzzle save failed', result);
      }
    } catch (error) {
      setMessage('❌ Error saving puzzle');
      logger.error('Save puzzle error', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!theme.trim()) {
      return false;
    }
    return puzzles.every(
      (p) =>
        p.emoji.trim().length >= 1 && p.answer.trim().length >= 2 && p.answer.trim().length <= 30
    );
  };

  const handleGenerateWithAI = async () => {
    setGenerating(true);

    // Check if we should generate hints only (theme + all emoji/answer pairs filled, but hints missing)
    const hasTheme = theme.trim().length > 0;
    const allPairsComplete = puzzles.every(
      (p) => p.emoji.trim().length >= 1 && p.answer.trim().length >= 2
    );
    const someHintsMissing = puzzles.some((p) => !p.hint || p.hint.trim().length === 0);
    const hintsOnlyMode = hasTheme && allPairsComplete && someHintsMissing;

    setMessage(
      hintsOnlyMode
        ? '🤖 Generating hints for your puzzle... This may take a few seconds.'
        : '🤖 Generating puzzle with AI... This may take a few seconds.'
    );

    try {
      if (hintsOnlyMode) {
        // Generate hints only - pass existing puzzle data
        const options = {
          theme: theme.trim(),
          puzzles: puzzles.map((p) => ({
            emoji: p.emoji.trim(),
            answer: p.answer.trim().toUpperCase(),
          })),
        };
        const result = await adminService.generateHints(selectedDate, options);

        if (result.success) {
          // Only update the hints, keep everything else
          const updatedPuzzles = puzzles.map((p, index) => ({
            ...p,
            hint: result.hints[index] || p.hint,
          }));
          setPuzzles(updatedPuzzles);

          const timeMsg =
            result.context?.generationTime > 1000
              ? ` (${(result.context.generationTime / 1000).toFixed(1)}s)`
              : '';
          setMessage(
            `✨ Success! Generated hints for "${theme}"${timeMsg}. You can edit any hint before saving.`
          );
          logger.info('AI hints generated successfully', result);
        } else {
          const errorMsg = result.error || 'Failed to generate hints. Please try again.';
          setMessage(
            `❌ ${errorMsg}${errorMsg.includes('rate limit') ? ' Wait a bit and try again.' : ''}`
          );
          logger.error('AI hints generation failed', result);
        }
      } else {
        // Generate full puzzle
        const options = theme.trim() ? { themeHint: theme.trim() } : {};
        const result = await adminService.generatePuzzle(selectedDate, options);

        if (result.success) {
          setTheme(result.puzzle.theme);
          setPuzzles(result.puzzle.puzzles);

          const timeMsg =
            result.context.generationTime > 1000
              ? ` (${(result.context.generationTime / 1000).toFixed(1)}s)`
              : '';
          setMessage(
            `✨ Success! Generated "${result.puzzle.theme}" by analyzing ${result.context.pastPuzzlesAnalyzed} recent puzzles${timeMsg}. You can edit any field before saving.`
          );
          logger.info('AI puzzle generated successfully', result);
        } else {
          const errorMsg = result.error || 'Failed to generate puzzle. Please try again.';
          setMessage(
            `❌ ${errorMsg}${errorMsg.includes('rate limit') ? ' Wait a bit and try again.' : ''}`
          );
          logger.error('AI puzzle generation failed', result);
        }
      }
    } catch (error) {
      setMessage(
        '❌ Error generating puzzle. Check your connection and try again, or create manually.'
      );
      logger.error('Generate puzzle error', error);
    } finally {
      setGenerating(false);
    }
  };

  // Format date as "Day MM/DD/YYYY"
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${month}/${day}/${year}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6 h-full w-full overflow-x-auto">
      {initialPuzzle && (
        <div className="mb-4 p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg">
          <p className="text-xs sm:text-sm text-sky-700 dark:text-sky-300">
            {initialPuzzle.theme ? 'Editing' : 'Creating'} puzzle for{' '}
            {formatDateDisplay(initialPuzzle.date)}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., Things found in a kitchen"
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={generating || loading}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="Generate puzzle with AI"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Generating...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    ✨ <span className="hidden sm:inline">AI Generate</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Puzzle Pairs
          </label>
          <div className="space-y-4 sm:space-y-5">
            {puzzles.map((puzzle, index) => (
              <div key={index} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                    Puzzle #{index + 1}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={puzzle.emoji}
                      onChange={(e) => handlePuzzleChange(index, 'emoji', e.target.value)}
                      placeholder="Emoji pair (e.g., 🍳🔥)"
                      className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white"
                      required
                    />
                    <input
                      type="text"
                      value={puzzle.answer}
                      onChange={(e) => handlePuzzleChange(index, 'answer', e.target.value)}
                      placeholder="ANSWER (E.G., STOVE)"
                      maxLength={30}
                      className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white uppercase"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={puzzle.hint}
                      onChange={(e) => handlePuzzleChange(index, 'hint', e.target.value)}
                      placeholder="💡 Hint (e.g., 'Kitchen cooking surface')"
                      maxLength={60}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                      {puzzle.hint?.length || 0}/60
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div
            className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
              message.startsWith('✅')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : message.startsWith('❌')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ← Back to Calendar
          </button>
          <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
            <button
              type="button"
              onClick={() => {
                setTheme('');
                setPuzzles([
                  { emoji: '', answer: '', hint: '' },
                  { emoji: '', answer: '', hint: '' },
                  { emoji: '', answer: '', hint: '' },
                  { emoji: '', answer: '', hint: '' },
                ]);
                setMessage('');
              }}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading || !validateForm()}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-gradient-to-r from-plum to-peach text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Puzzle'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
