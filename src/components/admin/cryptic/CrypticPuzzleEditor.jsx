'use client';

import { useState, useEffect } from 'react';
import { CRYPTIC_CONFIG } from '@/lib/constants';
import CrypticAIGenerator from './CrypticAIGenerator';
import authService from '@/services/auth.service';

const CRYPTIC_DEVICES = [
  'charade',
  'container',
  'deletion',
  'anagram',
  'reversal',
  'homophone',
  'hidden',
  'double_definition',
  'initial_letters',
];

const HINT_TYPES = ['fodder', 'indicator', 'definition', 'letter'];

/**
 * CrypticPuzzleEditor - Form to create/edit cryptic puzzles
 * Includes validation, preview, and AI generation
 */
export default function CrypticPuzzleEditor({ puzzle, date, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    date: date || '',
    clue: '',
    answer: '',
    length: 5,
    word_pattern: null, // Array of word lengths, e.g., [4, 2, 3, 5] for "DOWN IN THE DUMPS"
    hints: [
      { type: 'fodder', text: '' },
      { type: 'indicator', text: '' },
      { type: 'definition', text: '' },
      { type: 'letter', text: '' },
    ],
    explanation: '',
    difficulty_rating: 3,
    cryptic_device: 'charade',
  });

  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showDeviceGuide, setShowDeviceGuide] = useState(false);
  const [emojiCount, setEmojiCount] = useState(0);
  const [enableMultiWord, setEnableMultiWord] = useState(false);

  // Load puzzle data if editing
  useEffect(() => {
    if (puzzle) {
      const isMultiWord = puzzle.word_pattern && puzzle.word_pattern.length > 1;
      setEnableMultiWord(isMultiWord);
      setFormData({
        date: puzzle.date,
        clue: puzzle.clue,
        answer: puzzle.answer,
        length: puzzle.length,
        word_pattern: puzzle.word_pattern || null,
        hints: puzzle.hints,
        explanation: puzzle.explanation,
        difficulty_rating: puzzle.difficulty_rating || 3,
        cryptic_device: puzzle.cryptic_device || 'charade',
      });
      // Count emojis in loaded clue
      setEmojiCount(countEmojis(puzzle.clue));
    } else if (date) {
      setFormData((prev) => ({ ...prev, date }));
    }
  }, [puzzle, date]);

  // Update answer length and word_pattern when answer changes
  useEffect(() => {
    if (formData.answer) {
      const sanitizedAnswer = formData.answer.toUpperCase().trim();
      const words = sanitizedAnswer.split(/\s+/).filter(w => w.length > 0);
      const totalLength = sanitizedAnswer.replace(/\s/g, '').length;
      const wordPattern = words.map(w => w.length);

      setFormData((prev) => ({
        ...prev,
        length: totalLength,
        word_pattern: wordPattern.length > 0 ? wordPattern : null,
      }));

      // Auto-detect if multi-word
      if (words.length > 1 && !enableMultiWord) {
        setEnableMultiWord(true);
      }
    }
  }, [formData.answer, enableMultiWord]);

  // Helper: Count emojis in text (production-ready regex)
  const countEmojis = (text) => {
    if (!text) return 0;
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Regional_Indicator}{2})/gu;
    const emojis = text.match(emojiRegex) || [];
    return emojis.length;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Update emoji count if changing clue
    if (field === 'clue') {
      setEmojiCount(countEmojis(value));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleHintChange = (index, field, value) => {
    const newHints = [...formData.hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setFormData((prev) => ({ ...prev, hints: newHints }));
  };

  // Helper: Get hint placeholder text (professional quality standard)
  const getHintPlaceholder = (type) => {
    switch (type) {
      case 'fodder':
        return "'🎭🎪' together suggest STAGE (theatrical setting), giving us the letters S-T-A-G-E to work with...";
      case 'indicator':
        return "'mixed' signals an anagram - we need to rearrange those letters. 'loses' means deletion...";
      case 'definition':
        return "Definition is 'entrance' — another word for a way in";
      case 'letter':
        return "Starts with G";
      default:
        return '';
    }
  };

  // Helper: Get hint guidance text
  const getHintGuidance = (type) => {
    switch (type) {
      case 'fodder':
        return 'Most detailed (2-3 sentences). Explain what emoji pair represents + all text components.';
      case 'indicator':
        return 'Moderately detailed (1-2 sentences). Identify all indicator words and operations.';
      case 'definition':
        return 'Concise (1 sentence max). Point out the straightforward definition.';
      case 'letter':
        return 'Brief (4-5 words). Just give the first letter of the answer.';
      default:
        return '';
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.clue) {
      newErrors.clue = 'Clue is required';
    } else {
      // CRITICAL: Validate TWO-emoji requirement (Daily Cryptic signature mechanic)
      const currentEmojiCount = countEmojis(formData.clue);
      if (currentEmojiCount !== 2) {
        newErrors.clue = `Must have exactly 2 emojis (found ${currentEmojiCount}). This is the signature Daily Cryptic mechanic - emojis must work together.`;
      }
    }

    if (!formData.answer) {
      newErrors.answer = 'Answer is required';
    } else {
      const totalLength = formData.answer.replace(/\s/g, '').length;
      const words = formData.answer.trim().split(/\s+/).filter(w => w.length > 0);

      // Validate total length
      if (totalLength < CRYPTIC_CONFIG.MIN_ANSWER_LENGTH) {
        newErrors.answer = `Answer must be at least ${CRYPTIC_CONFIG.MIN_ANSWER_LENGTH} letters (found ${totalLength})`;
      }
      if (totalLength > CRYPTIC_CONFIG.MAX_ANSWER_LENGTH) {
        newErrors.answer = `Answer must be at most ${CRYPTIC_CONFIG.MAX_ANSWER_LENGTH} letters (found ${totalLength})`;
      }

      // Validate multi-word constraints
      if (enableMultiWord) {
        if (words.length === 1) {
          newErrors.answer = 'Multi-word mode enabled but answer has only one word. Add spaces or disable multi-word mode.';
        }
        if (words.length > 3) {
          newErrors.answer = 'Multi-word answers should have at most 3 words for readability';
        }
        // Each word must be at least 2 letters
        const shortWords = words.filter(w => w.length < 2);
        if (shortWords.length > 0) {
          newErrors.answer = 'Each word must be at least 2 letters';
        }
      } else {
        // Single word mode - no spaces allowed
        if (words.length > 1) {
          newErrors.answer = 'Single-word mode: Answer cannot contain spaces. Enable multi-word mode or remove spaces.';
        }
      }
    }

    if (!formData.explanation) newErrors.explanation = 'Explanation is required';

    // Validate hints (professional quality standard)
    formData.hints.forEach((hint, index) => {
      if (!hint.text) {
        newErrors[`hint_${index}`] = `Hint ${index + 1} is required`;
      } else if (index === 0 && hint.text.length < 30) {
        // Hint 1 (fodder) should be detailed
        newErrors[`hint_${index}`] = 'Hint 1 (fodder) should be detailed (min 30 characters). Explain emoji pair + all components.';
      } else if (index === 3 && hint.text.length > 20) {
        // Hint 4 (letter) should be brief
        newErrors[`hint_${index}`] = 'Hint 4 (letter) should be brief (max 20 characters). Just give first letter.';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave?.(formData);
  };

  const handleAIGenerate = async (options) => {
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/admin/cryptic/generate-puzzle', {
        method: 'POST',
        headers: authService.getAuthHeaders(true), // Include auth and CSRF
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate puzzle');
      }

      // Populate form with AI-generated puzzle
      setFormData((prev) => ({
        ...prev,
        clue: data.puzzle.clue,
        answer: data.puzzle.answer,
        length: data.puzzle.length,
        word_pattern: data.puzzle.word_pattern || null,
        hints: data.puzzle.hints,
        explanation: data.puzzle.explanation,
        difficulty_rating: data.puzzle.difficulty_rating,
        cryptic_device: data.puzzle.cryptic_device,
      }));

      // Auto-enable multi-word if pattern has multiple words
      if (data.puzzle.word_pattern && data.puzzle.word_pattern.length > 1) {
        setEnableMultiWord(true);
      }

      setShowAIGenerator(false);
      setShowPreview(true); // Auto-show preview after generation
    } catch (error) {
      console.error('AI generation error:', error);
      setAiError(error.message);
      throw error; // Re-throw so the AI generator can display the error
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div
        className="bg-bg-surface rounded-lg border-[3px] border-border-main p-3 sm:p-6"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            {puzzle ? 'Edit Puzzle' : 'Create New Puzzle'}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAIGenerator(true)}
              disabled={loading || aiLoading}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm bg-purple-600 text-white border-[3px] border-border-main rounded-lg font-bold hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="hidden sm:inline">AI Generate</span>
              <span className="sm:hidden">AI</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm bg-bg-card border-[3px] border-border-main text-text-primary rounded-lg font-bold hover:bg-text-muted/20 transition-colors"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-bold text-text-primary mb-2">
            Puzzle Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-4 py-2 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ boxShadow: 'var(--shadow-small)' }}
            disabled={!!puzzle} // Don't allow changing date when editing
          />
          {errors.date && <p className="mt-1 text-sm text-accent-red font-bold">{errors.date}</p>}
        </div>

        {/* Clue with Emoji Count (Apple HIG: Clear feedback) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-text-primary">
              Clue (with TWO emojis) *
            </label>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              emojiCount === 2
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
            }`}>
              {emojiCount === 2 ? '✓ ' : ''}{emojiCount} emoji{emojiCount !== 1 ? 's' : ''}
            </span>
          </div>
          <input
            type="text"
            value={formData.clue}
            onChange={(e) => handleChange('clue', e.target.value)}
            placeholder="e.g., 👶🏫 Room for kids, yes? Run back to grab second-grader (7)"
            className={`w-full px-4 py-2 border-[3px] rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 transition-colors ${
              emojiCount === 2
                ? 'border-green-500 focus:ring-green-500'
                : 'border-border-main focus:ring-purple-500'
            }`}
            style={{ boxShadow: 'var(--shadow-small)' }}
            aria-label="Cryptic clue with two emojis"
            aria-describedby="clue-hint"
          />
          {errors.clue && (
            <p className="mt-1 text-sm text-accent-red font-bold" role="alert">
              {errors.clue}
            </p>
          )}
          <div id="clue-hint" className="mt-2 space-y-1">
            <p className="text-xs text-text-secondary font-medium">
              💡 Use EXACTLY 2 emojis that work together (e.g., 🎭🎪 = stage, 👑🦁 = royal)
            </p>
            <p className="text-xs text-text-secondary font-medium">
              Include the answer length in parentheses at the end
            </p>
          </div>
        </div>

        {/* Multi-Word Toggle */}
        <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-900 dark:text-purple-100">
                  Enable Multi-Word Phrases
                </span>
                {enableMultiWord && formData.word_pattern && (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold">
                    {formData.word_pattern.join(', ')} pattern
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                {enableMultiWord
                  ? 'Multi-word answers like "DOWN IN THE DUMPS" (separate with spaces)'
                  : 'Single-word answers only (no spaces allowed)'}
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={enableMultiWord}
                onChange={(e) => {
                  setEnableMultiWord(e.target.checked);
                  // If disabling and answer has spaces, show warning
                  if (!e.target.checked && formData.answer.includes(' ')) {
                    alert('Warning: Answer contains spaces. You may need to remove them for single-word mode.');
                  }
                }}
                className="sr-only"
                aria-describedby="multi-word-description"
              />
              <div className={`w-14 h-8 rounded-full transition-colors ${
                enableMultiWord
                  ? 'bg-purple-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform m-1 ${
                  enableMultiWord ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
            </div>
          </label>
        </div>

        {/* Answer */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-text-primary">
              Answer *
            </label>
            <div className="flex items-center gap-2">
              {formData.word_pattern && formData.word_pattern.length > 1 && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                  {formData.word_pattern.length} words: ({formData.word_pattern.join(', ')})
                </span>
              )}
              <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                {formData.length} letters
              </span>
            </div>
          </div>
          <input
            type="text"
            value={formData.answer}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              // Allow spaces only in multi-word mode
              const sanitized = enableMultiWord
                ? value.replace(/[^A-Z\s]/g, '')
                : value.replace(/[^A-Z]/g, '');
              handleChange('answer', sanitized);
            }}
            placeholder={enableMultiWord ? "DOWN IN THE DUMPS" : "MOONLIGHT"}
            className="w-full px-4 py-2 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
            style={{ boxShadow: 'var(--shadow-small)' }}
            aria-describedby="answer-hint"
          />
          {errors.answer && <p className="mt-1 text-sm text-accent-red font-bold" role="alert">{errors.answer}</p>}
          {enableMultiWord && (
            <p id="answer-hint" className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
              💡 Separate words with spaces. Each word must be at least 2 letters. Max 3 words recommended.
            </p>
          )}
          {/* Visual Word Pattern Preview */}
          {formData.answer && formData.word_pattern && formData.word_pattern.length > 1 && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Word Box Preview:</p>
              <div className="flex gap-2 flex-wrap">
                {formData.word_pattern.map((wordLen, idx) => (
                  <div key={idx} className="flex gap-0.5">
                    {Array.from({ length: wordLen }).map((_, letterIdx) => (
                      <div
                        key={letterIdx}
                        className="w-8 h-10 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500"
                      >
                        {String.fromCharCode(65 + letterIdx)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cryptic Device & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">
              Cryptic Device(s)
            </label>
            <select
              value={formData.cryptic_device}
              onChange={(e) => handleChange('cryptic_device', e.target.value)}
              className="w-full px-4 py-2 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ boxShadow: 'var(--shadow-small)' }}
              aria-label="Select cryptic device"
            >
              {CRYPTIC_DEVICES.map((device) => (
                <option key={device} value={device}>
                  {device.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">
              Difficulty (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.difficulty_rating}
              onChange={(e) => handleChange('difficulty_rating', parseInt(e.target.value, 10))}
              className="w-full px-4 py-2 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ boxShadow: 'var(--shadow-small)' }}
              aria-label="Difficulty rating from 1 to 5"
            />
          </div>
        </div>

        {/* Cryptic Device Reference Guide (Apple HIG: Provide help) */}
        <div
          className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20"
          style={{ boxShadow: 'var(--shadow-small)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cryptic Device Quick Reference
            </h4>
            <button
              type="button"
              onClick={() => setShowDeviceGuide(!showDeviceGuide)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
              aria-expanded={showDeviceGuide}
              aria-controls="device-guide-content"
            >
              {showDeviceGuide ? 'Hide' : 'Show'} Guide
            </button>
          </div>

          {showDeviceGuide && (
            <div id="device-guide-content" className="text-xs space-y-2 text-purple-800 dark:text-purple-200 mt-3">
              <div><strong>Emoji Interpretation:</strong> 2 emojis work together (🎭🎪 = STAGE, 👑🦁 = ROYAL)</div>
              <div><strong>Charade:</strong> Parts joined (CAR + PET = CARPET) | Indicators: with, and, by</div>
              <div><strong>Anagram:</strong> Letters mixed (SILENT = LISTEN) | Indicators: mixed, disturbed, scrambled</div>
              <div><strong>Container:</strong> Word inside another (B[AN]D) | Indicators: in, holding, around</div>
              <div><strong>Deletion:</strong> Remove letters (FIENDS - S = FIEND) | Indicators: without, loses, headless</div>
              <div><strong>Reversal:</strong> Backward reading (STOP → POTS) | Indicators: back, reversed</div>
              <div><strong>Hidden:</strong> Word hidden in phrase | Indicators: in, within, part of</div>
              <div><strong>Homophone:</strong> Sounds like another (BLUE/BLEW) | Indicators: sounds like, heard</div>
              <div><strong>Selection:</strong> Pick specific letters (first, last, middle)</div>
              <hr className="border-purple-300 dark:border-purple-700 my-2" />
              <div className="text-purple-900 dark:text-purple-100 font-bold">
                💡 Best Practice: Combine 2-3 devices for sophisticated puzzles!
              </div>
            </div>
          )}
        </div>

        {/* Hints with Guidance (Apple HIG: Helpful, contextual information) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-text-primary">
              Progressive Hints * (Professional Quality Standard)
            </label>
          </div>
          <div className="space-y-4">
            {formData.hints.map((hint, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <div className="w-32 flex-shrink-0">
                    <input
                      type="text"
                      value={hint.type}
                      disabled
                      className="w-full px-3 py-2 border-[3px] border-border-main rounded-lg bg-text-muted/20 text-text-primary text-sm font-bold capitalize"
                      style={{ boxShadow: 'var(--shadow-small)' }}
                      aria-label={`Hint ${index + 1} type`}
                    />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={hint.text}
                      onChange={(e) => handleHintChange(index, 'text', e.target.value)}
                      placeholder={getHintPlaceholder(hint.type)}
                      rows={index === 0 ? 3 : 2}
                      className="w-full px-3 py-2 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      style={{ boxShadow: 'var(--shadow-small)' }}
                      aria-label={`Hint ${index + 1}: ${hint.type}`}
                      aria-describedby={`hint-${index}-guidance`}
                    />
                    {errors[`hint_${index}`] && (
                      <p className="mt-1 text-xs text-accent-red font-bold" role="alert">
                        {errors[`hint_${index}`]}
                      </p>
                    )}
                    <p id={`hint-${index}-guidance`} className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                      💡 {getHintGuidance(hint.type)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-bold text-text-primary mb-2">
            Explanation *
          </label>
          <textarea
            value={formData.explanation}
            onChange={(e) => handleChange('explanation', e.target.value)}
            placeholder="e.g., MOON (🌙) + LIGHT (🌟) = MOONLIGHT (guide in darkness)"
            rows={3}
            className="w-full px-4 py-2 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            style={{ boxShadow: 'var(--shadow-small)' }}
          />
          {errors.explanation && <p className="mt-1 text-sm text-accent-red font-bold">{errors.explanation}</p>}
        </div>

        {/* Preview */}
        {showPreview && (
          <div
            className="p-4 bg-purple-500/10 rounded-lg border-[3px] border-purple-500"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <h3 className="font-bold text-text-primary mb-3">Preview</h3>
            <div className="space-y-2 text-sm">
              <p className="text-text-primary">
                <span className="font-bold">Clue:</span> {formData.clue || '(no clue)'}
              </p>
              <p className="text-text-primary font-mono text-lg">
                <span className="font-bold">Answer:</span> {formData.answer || '(no answer)'}
              </p>
              <p className="text-text-primary">
                <span className="font-bold">Hints:</span>
              </p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                {formData.hints.map((hint, i) => (
                  <li key={i} className="text-text-secondary font-medium">
                    {hint.type}: {hint.text || '(empty)'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t-[3px] border-border-main">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  date: date || '',
                  clue: '',
                  answer: '',
                  length: 5,
                  word_pattern: null,
                  hints: [
                    { type: 'fodder', text: '' },
                    { type: 'indicator', text: '' },
                    { type: 'definition', text: '' },
                    { type: 'letter', text: '' },
                  ],
                  explanation: '',
                  difficulty_rating: 3,
                  cryptic_device: 'charade',
                });
                setErrors({});
                setShowPreview(false);
                setEnableMultiWord(false);
              }}
              className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border-[3px] border-border-main bg-accent-orange text-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-purple-600 text-white border-[3px] border-border-main rounded-lg font-bold hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              {loading ? 'Saving...' : puzzle ? 'Update' : 'Create'}
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm bg-bg-card border-[3px] border-border-main text-text-primary rounded-lg font-bold hover:bg-text-muted/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: 'var(--shadow-button)' }}
          >
            ← Back to Calendar
          </button>
        </div>
      </form>
      </div>

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <CrypticAIGenerator
          onGenerate={handleAIGenerate}
          onClose={() => setShowAIGenerator(false)}
          loading={aiLoading}
        />
      )}
    </>
  );
}
