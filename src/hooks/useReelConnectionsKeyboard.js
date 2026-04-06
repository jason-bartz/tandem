'use client';

import { useEffect, useCallback, useState } from 'react';

/**
 * Keyboard shortcut definitions for the help modal.
 * Structured by category for display in ReelKeyboardShortcutsModal.
 */
export const REEL_KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigate',
    shortcuts: [
      { keys: ['\u2190', '\u2191', '\u2192', '\u2193'], description: 'Move through posters' },
      { keys: ['Space'], description: 'Toggle selection on focused poster' },
      { keys: ['Backspace'], description: 'Deselect last selected movie' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Enter'], description: 'Submit guess (4 selected) / Start game' },
      { keys: ['S'], description: 'Shuffle grid' },
      { keys: ['C'], description: 'Clear all selections' },
      { keys: ['H'], description: 'Use hint' },
      { keys: ['E'], description: 'Enlarge focused poster' },
    ],
  },
  {
    category: 'General',
    shortcuts: [
      { keys: ['Esc'], description: 'Close modal / Clear selections' },
      { keys: ['?'], description: 'Toggle keyboard shortcuts' },
    ],
  },
];

/**
 * useReelConnectionsKeyboard — Full keyboard control for Reel Connections.
 *
 * Arrow keys navigate a 4-column grid of movie posters.
 * Space toggles selection, Enter submits when 4 are selected.
 * Single-letter shortcuts (S, C, H, E) map to button bar actions.
 */
export function useReelConnectionsKeyboard({
  movies,
  selectedMovies,
  toggleMovieSelection,
  handleSubmit,
  handleShuffle,
  handleDeselect,
  handleHintClick,
  onStartGame,
  gameStarted,
  gameWon,
  gameOver,
  solvingGroup,
  hintUsed,
  setEnlargedMovie,
  enlargedMovie,
  showHintModal,
  isRevealing,
  handleShare,
}) {
  const [focusIndex, setFocusIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);

  // Grid is always 4 columns
  const COLS = 4;

  // Clamp index to valid range within current movies array
  const clampIndex = useCallback(
    (index) => {
      if (movies.length === 0) return -1;
      return Math.max(0, Math.min(index, movies.length - 1));
    },
    [movies.length]
  );

  // When movies change (group solved, shuffle), keep focus in bounds
  useEffect(() => {
    if (focusIndex >= movies.length) {
      setFocusIndex(movies.length > 0 ? movies.length - 1 : -1);
    }
  }, [movies.length, focusIndex]);

  const handleKeyDown = useCallback(
    (e) => {
      const key = e.key;
      const tag = e.target.tagName;

      // Never intercept when typing in form elements
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target.isContentEditable) return;

      // Never intercept Ctrl/Cmd/Alt combos (except our own)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Activate keyboard mode on first keypress
      if (!keyboardActive) {
        setKeyboardActive(true);
      }

      // ─── Help modal toggle ───
      if (key === '?' || (key === '/' && e.shiftKey)) {
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

      // ─── Enlarged poster modal open ───
      if (enlargedMovie) {
        if (key === 'Escape') {
          e.preventDefault();
          setEnlargedMovie(null);
        }
        return;
      }

      // ─── Hint modal open ───
      if (showHintModal) {
        // Let the HintModal's own Escape handler close it
        return;
      }

      // ─── Don't intercept if another dialog is open ───
      const hasOpenModal = document.querySelector(
        '[role="dialog"]:not([data-reel-help])'
      );
      if (hasOpenModal) {
        if (key === 'Escape') {
          // Let the modal's own handler deal with it
        }
        return;
      }

      // ─── Pre-start state: Enter or Space starts the game ───
      if (!gameStarted && !gameWon && !gameOver) {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          onStartGame?.();
        }
        return;
      }

      // ─── Post-game state (won or lost, not revealing) ───
      if ((gameWon || gameOver) && !isRevealing) {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          handleShare?.();
        }
        return;
      }

      // ─── During reveal or solving animation — suppress all ───
      if (isRevealing || solvingGroup) return;

      // ─── Active gameplay ───

      // Arrow navigation through 4-column grid
      if (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight'
      ) {
        e.preventDefault();
        if (movies.length === 0) return;

        setFocusIndex((prev) => {
          // If no focus yet, start at first cell
          if (prev < 0) return 0;

          let next = prev;
          switch (key) {
            case 'ArrowRight':
              next = prev + 1;
              break;
            case 'ArrowLeft':
              next = prev - 1;
              break;
            case 'ArrowDown':
              next = prev + COLS;
              break;
            case 'ArrowUp':
              next = prev - COLS;
              break;
          }
          return clampIndex(next);
        });
        return;
      }

      // Space: toggle selection on focused movie
      if (key === ' ') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < movies.length) {
          toggleMovieSelection(movies[focusIndex]);
        }
        return;
      }

      // Enter: submit guess when 4 selected
      if (key === 'Enter') {
        e.preventDefault();
        if (selectedMovies.length === 4) {
          handleSubmit();
        }
        return;
      }

      // Backspace: deselect the last selected movie (stack undo)
      if (key === 'Backspace') {
        e.preventDefault();
        if (selectedMovies.length > 0) {
          const lastMovie = selectedMovies[selectedMovies.length - 1];
          toggleMovieSelection(lastMovie);
        }
        return;
      }

      // Escape: clear selections or dismiss
      if (key === 'Escape') {
        e.preventDefault();
        if (selectedMovies.length > 0) {
          handleDeselect();
        }
        return;
      }

      // S: shuffle
      if (key === 's' || key === 'S') {
        e.preventDefault();
        handleShuffle();
        return;
      }

      // C: clear all selections
      if (key === 'c' || key === 'C') {
        e.preventDefault();
        if (selectedMovies.length > 0) {
          handleDeselect();
        }
        return;
      }

      // H: use hint
      if (key === 'h' || key === 'H') {
        e.preventDefault();
        if (!hintUsed) {
          handleHintClick();
        }
        return;
      }

      // E: enlarge focused poster
      if (key === 'e' || key === 'E') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < movies.length) {
          setEnlargedMovie(movies[focusIndex]);
        }
        return;
      }
    },
    [
      keyboardActive,
      showShortcuts,
      enlargedMovie,
      showHintModal,
      gameStarted,
      gameWon,
      gameOver,
      isRevealing,
      solvingGroup,
      movies,
      focusIndex,
      selectedMovies,
      hintUsed,
      COLS,
      clampIndex,
      toggleMovieSelection,
      handleSubmit,
      handleShuffle,
      handleDeselect,
      handleHintClick,
      handleShare,
      onStartGame,
      setEnlargedMovie,
    ]
  );

  // Attach global keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused movie into view
  useEffect(() => {
    if (focusIndex < 0 || !keyboardActive) return;
    const el = document.querySelector(`[data-reel-kb-index="${focusIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIndex, keyboardActive]);

  // Hide keyboard focus on mouse/touch usage
  useEffect(() => {
    const handlePointer = () => setFocusIndex(-1);
    window.addEventListener('mousedown', handlePointer);
    window.addEventListener('touchstart', handlePointer);
    return () => {
      window.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('touchstart', handlePointer);
    };
  }, []);

  return {
    focusIndex,
    showShortcuts,
    setShowShortcuts,
    keyboardActive,
  };
}
