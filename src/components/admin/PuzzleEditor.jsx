'use client';
import { useState, useEffect } from 'react';
import adminService from '@/services/admin.service';
import authService from '@/services/auth.service';
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
  const [assessingDifficulty, setAssessingDifficulty] = useState(false);
  const [difficultyRating, setDifficultyRating] = useState(initialPuzzle?.difficultyRating || '');
  const [difficultyFactors, setDifficultyFactors] = useState(
    initialPuzzle?.difficultyFactors || null
  );
  const [themeSuggestions, setThemeSuggestions] = useState([]);
  const [suggestingThemes, setSuggestingThemes] = useState(false);

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
      setDifficultyRating(initialPuzzle.difficultyRating || '');
      setDifficultyFactors(initialPuzzle.difficultyFactors || null);

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
        difficultyRating: difficultyRating || null,
        difficultyFactors: difficultyFactors || null,
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

  const handleAssessDifficulty = async () => {
    if (!validateForm()) {
      setMessage('⚠️ Please complete the theme and all puzzle pairs before assessing difficulty.');
      return;
    }

    setAssessingDifficulty(true);
    setMessage('🤖 Assessing puzzle difficulty... This may take a few seconds.');

    try {
      const result = await adminService.assessDifficulty({
        theme: theme.trim(),
        puzzles: puzzles.map((p) => ({
          emoji: p.emoji.trim(),
          answer: p.answer.trim().toUpperCase(),
          hint: p.hint?.trim() || '',
        })),
      });

      if (result.success) {
        setDifficultyRating(result.assessment.rating);
        setDifficultyFactors(result.assessment.factors);
        const timeMsg = result.context?.generationTime
          ? ` (${(result.context.generationTime / 1000).toFixed(1)}s)`
          : '';
        setMessage(
          `✨ Difficulty assessed: ${result.assessment.rating}${timeMsg}. ${result.assessment.reasoning || ''} You can override this before saving.`
        );
        logger.info('Difficulty assessed successfully', result);
      } else {
        const errorMsg = result.error || 'Failed to assess difficulty. Please try again.';
        setMessage(
          `❌ ${errorMsg}${errorMsg.includes('rate limit') ? ' Wait a bit and try again.' : ''}`
        );
        logger.error('Difficulty assessment failed', result);
      }
    } catch (error) {
      setMessage('❌ Error assessing difficulty. Check your connection and try again.');
      logger.error('Assess difficulty error', error);
    } finally {
      setAssessingDifficulty(false);
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

  const handleSuggestThemes = async () => {
    setSuggestingThemes(true);
    setThemeSuggestions([]);
    setMessage('💡 Getting theme suggestions...');

    try {
      const response = await fetch('/api/admin/tandem/suggest-themes', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get suggestions');
      }

      setThemeSuggestions(data.suggestions || []);
      setMessage(
        `✨ Generated ${data.suggestions?.length || 0} theme ideas (analyzed ${data.recentThemesCount} recent themes)`
      );
    } catch (error) {
      setMessage(`❌ ${error.message || 'Failed to get theme suggestions'}`);
      logger.error('Theme suggestion error', error);
    } finally {
      setSuggestingThemes(false);
    }
  };

  const handleSelectThemeSuggestion = (suggestion) => {
    setTheme(suggestion.theme);
    setThemeSuggestions([]); // Clear suggestions after selection
    setMessage(`Selected theme: "${suggestion.theme}" - Click AI Generate to create the puzzle.`);
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
    <div className="bg-bg-surface rounded-lg p-3 sm:p-6 h-full w-full overflow-x-auto">
      {initialPuzzle && (
        <div
          className="mb-4 p-3 bg-accent-blue/20 border-[3px] border-accent-blue rounded-lg"
          style={{ boxShadow: 'var(--shadow-small)' }}
        >
          <p className="text-xs sm:text-sm text-text-primary font-bold">
            {initialPuzzle.theme ? 'Editing' : 'Creating'} puzzle for{' '}
            {formatDateDisplay(initialPuzzle.date)}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-text-primary mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
              style={{ boxShadow: 'var(--shadow-small)' }}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs sm:text-sm font-bold text-text-primary">Theme</label>
              <button
                type="button"
                onClick={handleSuggestThemes}
                disabled={suggestingThemes || generating || loading}
                className="text-xs sm:text-sm text-accent-pink hover:text-accent-pink/80 font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {suggestingThemes ? (
                  <>
                    <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24">
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
                    <span>Getting ideas...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3 w-3 sm:h-4 sm:w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <span>Suggest Themes</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., Things found in a kitchen"
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
                required
              />
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={generating || loading || suggestingThemes}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-accent-pink text-white border-[3px] border-black dark:border-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: 'var(--shadow-button)' }}
                title="Generate puzzle with AI"
              >
                {generating ? (
                  <span className="flex items-center gap-2 justify-center">
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
                    <span>Generating...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 justify-center">
                    <span>AI</span>
                    <span className="hidden sm:inline">Generate</span>
                  </span>
                )}
              </button>
            </div>
            {/* Theme Suggestions */}
            {themeSuggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-bold text-text-secondary">
                  Click to use a suggestion:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {themeSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectThemeSuggestion(suggestion)}
                      disabled={generating || loading}
                      className="p-2 sm:p-3 text-left rounded-lg border-[2px] border-black/20 dark:border-white/20 bg-bg-card hover:border-accent-pink hover:bg-accent-pink/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ boxShadow: 'var(--shadow-small)' }}
                    >
                      <div className="font-bold text-xs sm:text-sm text-text-primary">
                        {suggestion.theme}
                      </div>
                      <div className="text-[10px] sm:text-xs text-text-secondary mt-0.5 line-clamp-2">
                        {suggestion.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-text-primary mb-2">
            Puzzle Pairs
          </label>
          <div
            className="space-y-4 sm:space-y-5 p-3 sm:p-4 border-[3px] border-black dark:border-white rounded-lg"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            {puzzles.map((puzzle, index) => (
              <div key={index} className="p-3 sm:p-4 bg-bg-card rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs sm:text-sm font-bold text-text-primary">
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
                      className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border-[2px] border-gray-300 dark:border-gray-600 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green"
                      required
                    />
                    <input
                      type="text"
                      value={puzzle.answer}
                      onChange={(e) => handlePuzzleChange(index, 'answer', e.target.value)}
                      placeholder="ANSWER (E.G., STOVE)"
                      maxLength={30}
                      className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border-[2px] border-gray-300 dark:border-gray-600 rounded-lg bg-bg-surface text-text-primary font-bold uppercase focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green"
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
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-[2px] border-accent-yellow rounded-lg bg-accent-yellow/10 text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow placeholder:text-text-muted"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-bold">
                      {puzzle.hint?.length || 0}/60
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-text-primary mb-2">
            Difficulty Assessment
          </label>
          <div
            className="bg-accent-pink/10 border-[3px] border-accent-pink rounded-lg p-4 space-y-3"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-text-primary mb-2">Rating</label>
                <select
                  value={difficultyRating}
                  onChange={(e) => setDifficultyRating(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-accent-pink"
                  style={{ boxShadow: 'var(--shadow-small)' }}
                >
                  <option value="">Not assessed</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium-Easy">Medium-Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Medium-Hard">Medium-Hard</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAssessDifficulty}
                  disabled={assessingDifficulty || generating || loading}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base bg-accent-orange text-white border-[3px] border-black dark:border-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: 'var(--shadow-button)' }}
                  title="Assess difficulty using AI"
                >
                  {assessingDifficulty ? (
                    <span className="flex items-center gap-2 justify-center">
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
                      <span>Assessing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 justify-center">
                      <span>Assess Difficulty</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
            {difficultyFactors && (
              <div className="text-xs text-text-primary font-medium grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="font-bold">Theme:</span> {difficultyFactors.themeComplexity}/5
                </div>
                <div>
                  <span className="font-bold">Vocab:</span> {difficultyFactors.vocabularyLevel}/5
                </div>
                <div>
                  <span className="font-bold">Emojis:</span> {difficultyFactors.emojiClarity}/5
                </div>
                {difficultyFactors.hintDirectness && (
                  <div>
                    <span className="font-bold">Hints:</span> {difficultyFactors.hintDirectness}/5
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-text-secondary font-medium">
              AI will assess difficulty based on theme complexity, vocabulary level, emoji clarity,
              and hint directness. You can override the rating manually before saving.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 sm:p-4 rounded-lg border-[3px] text-sm sm:text-base font-bold ${
              message.startsWith('✅')
                ? 'bg-accent-green/20 border-accent-green text-text-primary'
                : message.startsWith('❌')
                  ? 'bg-accent-red/20 border-accent-red text-text-primary'
                  : 'bg-accent-blue/20 border-accent-blue text-text-primary'
            }`}
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            {message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border-[3px] border-black dark:border-white bg-bg-card text-text-primary rounded-lg font-bold hover:bg-text-muted/20 transition-colors"
            style={{ boxShadow: 'var(--shadow-button)' }}
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
                setDifficultyRating('');
                setDifficultyFactors(null);
                setMessage('');
              }}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border-[3px] border-black dark:border-white bg-accent-orange text-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading || !validateForm()}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-accent-green text-white border-[3px] border-black dark:border-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              {loading ? 'Saving...' : 'Save Puzzle'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
