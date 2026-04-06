'use client';

import { useEffect, useCallback, useState } from 'react';
import { playTandemCorrectSound, playTandemErrorSound, playHintSound } from '@/lib/sounds';
import platformService from '@/services/platform';

/**
 * Keyboard shortcut definitions for the help modal.
 */
export const TANDEM_KEYBOARD_SHORTCUTS = [
  {
    category: 'Input',
    shortcuts: [
      { keys: ['A\u2013Z'], description: 'Type a letter' },
      { keys: ['Backspace'], description: 'Delete last letter' },
      { keys: ['Enter'], description: 'Check current answer' },
    ],
  },
  {
    category: 'Navigate',
    shortcuts: [
      { keys: ['\u2191', '\u2193'], description: 'Move between puzzle rows' },
      { keys: ['Tab'], description: 'Next unsolved row' },
      { keys: ['Shift', 'Tab'], description: 'Previous unsolved row' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Shift', 'H'], description: 'Use a hint' },
      { keys: ['Esc'], description: 'Close modal / dismiss' },
      { keys: ['?'], description: 'Toggle keyboard shortcuts' },
    ],
  },
];

/**
 * useTandemKeyboard — Full keyboard control for Daily Tandem.
 *
 * Handles letter input, Enter to check, Backspace to delete,
 * arrow keys and Tab to navigate puzzle rows, H for hints,
 * and ? for the shortcuts modal.
 */
export function useTandemKeyboard({
  focusedIndex,
  setFocusedIndex,
  answers,
  correctAnswers,
  puzzle,
  onUpdateAnswer,
  onCheckSingleAnswer,
  onUseHint,
  hintsUsed,
  unlockedHints,
  solved,
  game,
  isHardMode,
  correctAnswerCallback,
  incorrectAnswerCallback,
  setCorrectFlashIndex,
  // Modal states to suppress shortcuts
  showRules,
  showHowToPlay,
  showStats,
  showArchive,
  showSettings,
}) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Navigate to the next unsolved row after the current index
  const goToNextUnsolved = useCallback(
    (fromIndex) => {
      for (let i = fromIndex + 1; i < 4; i++) {
        if (!correctAnswers[i]) return i;
      }
      // Wrap around
      for (let i = 0; i < fromIndex; i++) {
        if (!correctAnswers[i]) return i;
      }
      return fromIndex;
    },
    [correctAnswers]
  );

  // Navigate to the previous unsolved row before the current index
  const goToPrevUnsolved = useCallback(
    (fromIndex) => {
      for (let i = fromIndex - 1; i >= 0; i--) {
        if (!correctAnswers[i]) return i;
      }
      // Wrap around
      for (let i = 3; i > fromIndex; i--) {
        if (!correctAnswers[i]) return i;
      }
      return fromIndex;
    },
    [correctAnswers]
  );

  // Check the answer at the given index (extracted from PlayingScreen)
  const checkAnswer = useCallback(
    (index) => {
      if (!answers[index]?.trim()) return;

      const result = onCheckSingleAnswer(index);

      if (!result.gameComplete) {
        try {
          if (result.isCorrect) {
            playTandemCorrectSound();
            correctAnswerCallback();
            setCorrectFlashIndex(index);
            setTimeout(() => setCorrectFlashIndex(null), 800);
          } else {
            playTandemErrorSound();
            incorrectAnswerCallback();
          }
        } catch (_err) {
          // Sound might fail
        }
      }

      // Move to next unsolved field if correct
      if (result.isCorrect && !result.gameComplete) {
        setTimeout(() => {
          const nextEmpty = answers.findIndex(
            (answer, idx) => idx > index && !correctAnswers[idx]
          );
          if (nextEmpty !== -1) {
            setFocusedIndex(nextEmpty);
          }
        }, 300);
      }
    },
    [
      answers,
      correctAnswers,
      onCheckSingleAnswer,
      correctAnswerCallback,
      incorrectAnswerCallback,
      setCorrectFlashIndex,
      setFocusedIndex,
    ]
  );

  // Use hint on the focused row
  const applyHint = useCallback(() => {
    if (isHardMode) return;
    if (hintsUsed >= unlockedHints) return;

    if (focusedIndex !== null && !correctAnswers[focusedIndex]) {
      const success = onUseHint(focusedIndex);
      if (success) {
        try {
          playHintSound();
        } catch (_e) {
          // Sound might fail
        }
      }
    } else {
      // If focused row is solved, use hint on first unsolved
      const firstUnsolved = correctAnswers.findIndex((correct) => !correct);
      if (firstUnsolved !== -1) {
        const success = onUseHint(firstUnsolved);
        if (success) {
          try {
            playHintSound();
          } catch (_e) {
            // Sound might fail
          }
          setFocusedIndex(firstUnsolved);
        }
      }
    }
  }, [isHardMode, hintsUsed, unlockedHints, focusedIndex, correctAnswers, onUseHint, setFocusedIndex]);

  const handleKeyDown = useCallback(
    (e) => {
      // Skip on native platforms (on-screen keyboard handles it)
      if (platformService.isPlatformNative()) return;

      const key = e.key;

      // Never intercept when typing in non-game inputs
      const isOurInput = e.target.getAttribute('aria-label')?.startsWith('Answer');
      if (!isOurInput && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      // ─── Help modal toggle ───
      if (key === '?' || (key === '/' && e.shiftKey)) {
        // Don't intercept if Ctrl/Cmd is held
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // ─── Help modal open — only Esc and ? close it ───
      if (showShortcuts) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowShortcuts(false);
        }
        return;
      }

      // ─── Don't intercept if any modal is open or game is complete ───
      if (showRules || showHowToPlay || showStats || showArchive || showSettings || solved === 4)
        return;

      // ─── Escape: close sidebar etc. (let other handlers deal) ───
      if (key === 'Escape') return;

      // ─── Tab / Shift+Tab: navigate unsolved rows ───
      if (key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setFocusedIndex(goToPrevUnsolved(focusedIndex));
        } else {
          setFocusedIndex(goToNextUnsolved(focusedIndex));
        }
        return;
      }

      // ─── Arrow Up / Down: move between rows (skip solved) ───
      if (key === 'ArrowUp') {
        e.preventDefault();
        if (focusedIndex > 0) {
          let prevIndex = focusedIndex - 1;
          while (prevIndex >= 0 && correctAnswers[prevIndex]) {
            prevIndex--;
          }
          if (prevIndex >= 0) {
            setFocusedIndex(prevIndex);
          }
        }
        return;
      }

      if (key === 'ArrowDown') {
        e.preventDefault();
        if (focusedIndex < 3) {
          let nextIndex = focusedIndex + 1;
          while (nextIndex < 4 && correctAnswers[nextIndex]) {
            nextIndex++;
          }
          if (nextIndex < 4) {
            setFocusedIndex(nextIndex);
          }
        }
        return;
      }

      // ─── Enter: check answer ───
      if (key === 'Enter') {
        e.preventDefault();
        checkAnswer(focusedIndex);
        return;
      }

      // ─── Backspace: delete last letter ───
      if (key === 'Backspace') {
        e.preventDefault();
        if (correctAnswers[focusedIndex]) return;

        if (game.handleBackspace) {
          game.handleBackspace(focusedIndex);
        } else {
          const currentValue = answers[focusedIndex];
          if (currentValue && currentValue.length > 0) {
            onUpdateAnswer(focusedIndex, currentValue.slice(0, -1));
          }
        }
        return;
      }

      // ─── H: use hint (only when not typing, i.e. current answer is empty or Ctrl held) ───
      // We use H as hint only when no modifier and the user isn't mid-word typing.
      // To avoid conflict with letter H, we require Ctrl+H or check for empty field.
      // Actually — better UX: Shift+H for hint (H alone is for typing)
      if (key === 'H' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        applyHint();
        return;
      }

      // ─── Letter input: A-Z ───
      if (/^[a-zA-Z]$/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (correctAnswers[focusedIndex]) return;

        const answerLength = puzzle?.puzzles[focusedIndex]?.answer
          ? puzzle.puzzles[focusedIndex].answer.includes(',')
            ? puzzle.puzzles[focusedIndex].answer.split(',')[0].trim().length
            : puzzle.puzzles[focusedIndex].answer.length
          : 15;

        if (game.handleLetterInput) {
          game.handleLetterInput(focusedIndex, key.toUpperCase(), answerLength);
        } else {
          const currentValue = answers[focusedIndex] || '';
          if (currentValue.length < answerLength) {
            onUpdateAnswer(focusedIndex, currentValue + key.toUpperCase());
          }
        }
        return;
      }
    },
    [
      showShortcuts,
      showRules,
      showHowToPlay,
      showStats,
      showArchive,
      showSettings,
      solved,
      focusedIndex,
      answers,
      correctAnswers,
      puzzle,
      game,
      checkAnswer,
      applyHint,
      goToNextUnsolved,
      goToPrevUnsolved,
      onUpdateAnswer,
      setFocusedIndex,
    ]
  );

  // Attach global keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showShortcuts,
    setShowShortcuts,
    checkAnswer,
    applyHint,
  };
}
