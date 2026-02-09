'use client';
import { useState, useEffect } from 'react';
import adminService from '@/services/admin.service';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

export default function PuzzleEditor({ initialPuzzle, onClose, onShowBulkImport, onShowThemes }) {
  const [selectedDate, setSelectedDate] = useState(
    initialPuzzle?.date || new Date().toISOString().split('T')[0]
  );
  const [theme, setTheme] = useState(initialPuzzle?.theme || '');
  const [themeContext, setThemeContext] = useState('');
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
  const [shufflingEmoji, setShufflingEmoji] = useState(null); // Track which puzzle is being shuffled

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
        const options = {
          ...(theme.trim() && { themeHint: theme.trim() }),
          ...(themeContext.trim() && { themeContext: themeContext.trim() }),
        };
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
    setMessage(`Selected theme: "${suggestion.theme}" - Click AI Generate to generate the puzzle.`);
  };

  const handleShuffleEmojiPair = async (index) => {
    if (!theme.trim()) {
      setMessage('Please enter a theme before shuffling emoji pairs.');
      return;
    }

    const puzzle = puzzles[index];
    if (!puzzle.answer.trim()) {
      setMessage('Please enter an answer before shuffling the emoji pair.');
      return;
    }

    setShufflingEmoji(index);
    setMessage(`Generating new emoji pair for "${puzzle.answer}"...`);

    try {
      const response = await fetch('/api/admin/tandem/regenerate-emoji-pair', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          theme: theme.trim(),
          answer: puzzle.answer.trim(),
          context: themeContext.trim() || '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate emoji pair');
      }

      const newPuzzles = [...puzzles];
      newPuzzles[index].emoji = data.emoji;
      setPuzzles(newPuzzles);
      setMessage(`New emoji pair generated for "${puzzle.answer}"`);
    } catch (error) {
      setMessage(`Error: ${error.message || 'Failed to generate emoji pair'}`);
      logger.error('Shuffle emoji pair error', error);
    } finally {
      setShufflingEmoji(null);
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
    <div className="bg-bg-surface rounded-lg p-3 sm:p-6 h-full w-full overflow-x-auto">
      {/* Header with date and Themes button */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-text-primary mb-1">
            {initialPuzzle?.theme ? 'Edit Puzzle' : 'Create New Puzzle'}
          </h3>
          <p className="text-sm text-text-secondary font-medium">
            {formatDateDisplay(selectedDate)}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onShowThemes && (
            <button
              type="button"
              onClick={onShowThemes}
              className="px-2.5 py-1.5 bg-accent-pink text-white border-[2px] border-black dark:border-white font-bold rounded-md hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs sm:text-sm"
            >
              Themes
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-text-primary mb-1.5">
            Theme
          </label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., Things found in a kitchen"
            className="w-full px-3 py-1.5 sm:py-2 text-sm border-[2px] sm:border-[3px] border-black dark:border-white rounded-md sm:rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
            style={{ boxShadow: 'var(--shadow-small)' }}
            required
          />
          <div className="flex gap-1.5 sm:gap-2 mt-2">
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generating || loading || suggestingThemes}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-accent-green text-white border-[2px] border-black dark:border-white rounded-md sm:rounded-lg font-bold hover:translate-y-[-1px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
              title="Generate puzzle with AI"
            >
              {generating ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
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
                <span>AI Generate</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleSuggestThemes}
              disabled={suggestingThemes || generating || loading}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-accent-yellow text-[#2c2c2c] border-[2px] border-black dark:border-white rounded-md sm:rounded-lg font-bold hover:translate-y-[-1px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
              title="Get theme suggestions"
            >
              {suggestingThemes ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
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
                  <span>...</span>
                </span>
              ) : (
                <span>Suggest</span>
              )}
            </button>
            {onShowBulkImport && (
              <button
                type="button"
                onClick={onShowBulkImport}
                className="hidden sm:inline-block px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-accent-blue text-white border-[2px] border-black dark:border-white rounded-md sm:rounded-lg font-bold hover:translate-y-[-1px] transition-transform"
                style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
              >
                Bulk Import
              </button>
            )}
          </div>
          {/* Theme Suggestions */}
          {themeSuggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-bold text-text-secondary">
                Click to use a suggestion:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          {/* Theme Context */}
          <div className="mt-2">
            <label className="block text-xs font-bold text-text-secondary mb-1">
              Theme Context (optional)
            </label>
            <input
              type="text"
              value={themeContext}
              onChange={(e) => setThemeContext(e.target.value)}
              placeholder="e.g., exclude stove and coffee maker as answers"
              className="w-full px-3 py-1.5 sm:py-2 text-sm border-[2px] border-gray-300 dark:border-gray-600 rounded-md sm:rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-text-primary mb-2">
            Puzzle Pairs
          </label>
          <div
            className="space-y-3 sm:space-y-4 p-2.5 sm:p-4 border-[2px] sm:border-[3px] border-black dark:border-white rounded-md sm:rounded-lg"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            {puzzles.map((puzzle, index) => (
              <div key={index} className="p-2.5 sm:p-4 bg-bg-card rounded-md sm:rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-text-primary">Puzzle #{index + 1}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    <div className="flex gap-1.5 sm:flex-1">
                      <input
                        type="text"
                        value={puzzle.emoji}
                        onChange={(e) => handlePuzzleChange(index, 'emoji', e.target.value)}
                        placeholder="Emoji Pair"
                        className="w-28 sm:flex-1 px-2.5 py-1.5 text-sm border-[2px] border-gray-300 dark:border-gray-600 rounded-md bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleShuffleEmojiPair(index)}
                        disabled={
                          shufflingEmoji === index || generating || loading || !puzzle.answer.trim()
                        }
                        className="px-2.5 py-1.5 bg-accent-green text-white border-[2px] border-black dark:border-white rounded-md font-bold hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Generate new emoji pair"
                      >
                        {shufflingEmoji === index ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={puzzle.answer}
                      onChange={(e) => handlePuzzleChange(index, 'answer', e.target.value)}
                      placeholder="ANSWER"
                      maxLength={30}
                      className="flex-1 px-2.5 py-1.5 text-sm border-[2px] border-gray-300 dark:border-gray-600 rounded-md bg-bg-surface text-text-primary font-bold uppercase focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-accent-green"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={puzzle.hint}
                      onChange={(e) => handlePuzzleChange(index, 'hint', e.target.value)}
                      placeholder="💡 Hint"
                      maxLength={60}
                      className="w-full px-2.5 py-1.5 text-sm border-[2px] border-accent-yellow rounded-md bg-accent-yellow/10 text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow placeholder:text-text-muted"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold">
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
            className="bg-accent-pink/10 border-[2px] sm:border-[3px] border-accent-pink rounded-md sm:rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-text-primary mb-1.5">Rating</label>
                <select
                  value={difficultyRating}
                  onChange={(e) => setDifficultyRating(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border-[2px] sm:border-[3px] border-black dark:border-white rounded-md sm:rounded-lg bg-bg-card text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-accent-pink"
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
                  className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-accent-orange text-white border-[2px] border-black dark:border-white rounded-md sm:rounded-lg font-bold hover:translate-y-[-1px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
                  title="Assess difficulty using AI"
                >
                  {assessingDifficulty ? (
                    <span className="flex items-center gap-1.5 justify-center">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
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
                    <span>Assess</span>
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

        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border-[2px] border-black dark:border-white bg-bg-card text-text-primary rounded-md sm:rounded-lg font-bold hover:bg-text-muted/20 transition-colors"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Calendar</span>
          </button>
          <button
            type="submit"
            disabled={loading || !validateForm()}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-accent-green text-white border-[2px] border-black dark:border-white rounded-md sm:rounded-lg font-bold hover:translate-y-[-1px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            <span className="sm:hidden">{loading ? 'Saving...' : 'Save'}</span>
            <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save Puzzle'}</span>
          </button>
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
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border-[2px] border-black dark:border-white bg-accent-orange text-white rounded-md sm:rounded-lg font-bold hover:translate-y-[-1px] transition-transform"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
