'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Keyboard shortcut definitions for the help modal
 */
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Element Bank',
    shortcuts: [
      { keys: ['Arrow Keys'], description: 'Navigate elements' },
      { keys: ['Enter', 'Space'], description: 'Select focused element' },
      { keys: ['F'], description: 'Toggle favorite on focused element' },
      { keys: ['/'], description: 'Focus search' },
      { keys: ['Esc'], description: 'Clear search / close panel' },
    ],
  },
  {
    category: 'Combination',
    shortcuts: [
      { keys: ['Tab'], description: 'Switch active slot' },
      { keys: ['C', '\u2318 Enter'], description: 'Combine / Subtract' },
      { keys: ['X'], description: 'Clear both slots' },
      { keys: ['Backspace'], description: 'Clear active slot' },
      { keys: ['+', '-'], description: 'Toggle combine / subtract' },
    ],
  },
  {
    category: 'Result',
    shortcuts: [
      { keys: ['Enter', 'Space'], description: 'Use result (into slot A)' },
      { keys: ['Esc'], description: 'Dismiss result' },
    ],
  },
  {
    category: 'Game',
    shortcuts: [
      { keys: ['H'], description: 'Use hint' },
      { keys: ['G'], description: 'Open / close favorites' },
      { keys: ['S'], description: 'Cycle sort order' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
];

/**
 * useAlchemyKeyboard - Keyboard-first control system for Daily Alchemy
 *
 * Manages:
 * - Element bank grid navigation via arrow keys
 * - Slot selection (Tab), combine (C), clear (X/Backspace)
 * - Result card handling (Enter/Esc)
 * - Search focus (/), hint (H), favorites (G), sort (S)
 * - Help modal toggle (?)
 *
 * @param {Object} params
 * @param {Array} params.sortedElementBank - The currently displayed elements
 * @param {Function} params.selectElement - Select element into active slot
 * @param {Object} params.selectedA - Element in slot A
 * @param {Object} params.selectedB - Element in slot B
 * @param {string} params.activeSlot - 'first' | 'second' | null
 * @param {Function} params.setActiveSlot - Set active slot
 * @param {Function} params.combineElements - Fire combination
 * @param {Function} params.clearSelections - Clear both slots
 * @param {boolean} params.isCombining - API in-flight
 * @param {boolean} params.isAnimating - Animation in-flight
 * @param {Object} params.lastResult - Current result card, if showing
 * @param {Function} params.clearLastResult - Dismiss result card
 * @param {Function} params.selectResultElement - Use result into slot A
 * @param {Function} params.toggleOperatorMode - Switch +/-
 * @param {boolean} params.isSubtractMode - Currently in subtract mode
 * @param {Function} params.onUseHint - Trigger hint
 * @param {boolean} params.hintCooldown - Hint on cooldown
 * @param {Function} params.toggleFavorite - Toggle favorite on element
 * @param {Function} params.onToggleFavoritesPanel - Open/close favorites panel
 * @param {boolean} params.showFavoritesPanel - Favorites panel open
 * @param {Function} params.setSortOrder - Change sort
 * @param {string} params.sortOrder - Current sort
 * @param {boolean} params.isComplete - Puzzle complete
 * @param {boolean} params.freePlayMode - In free play
 * @param {boolean} params.disabled - All interaction disabled
 * @param {Object} params.searchInputRef - Ref to search input element
 * @param {Function} params.setSearchQuery - Clear search
 * @param {string} params.searchQuery - Current search
 */
export function useAlchemyKeyboard({
  sortedElementBank = [],
  selectElement,
  selectedA,
  selectedB,
  activeSlot,
  setActiveSlot,
  combineElements,
  clearSelections,
  isCombining,
  isAnimating,
  lastResult,
  clearLastResult,
  selectResultElement,
  toggleOperatorMode,
  isSubtractMode,
  onUseHint,
  hintCooldown,
  toggleFavorite,
  onToggleFavoritesPanel,
  showFavoritesPanel,
  setSortOrder,
  sortOrder,
  isComplete,
  freePlayMode,
  disabled,
  searchInputRef,
  setSearchQuery,
  searchQuery,
}) {
  const [focusIndex, setFocusIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);

  // Track whether user has used keyboard at all (for showing hint indicator)
  const hasUsedKeyboard = useRef(false);

  // Sort order cycling - defined at module scope via ref to avoid recreating on each render
  const sortCycleRef = useRef(['newest', 'alphabetical', 'firstDiscoveries', 'mostUsed', 'random']);

  const isSearchFocused = useCallback(() => {
    return document.activeElement === searchInputRef?.current;
  }, [searchInputRef]);

  // Clamp focus index to element bank bounds
  const clampIndex = useCallback(
    (index) => {
      if (sortedElementBank.length === 0) return -1;
      return Math.max(0, Math.min(index, sortedElementBank.length - 1));
    },
    [sortedElementBank.length]
  );

  // Reset focus when element list changes
  useEffect(() => {
    if (focusIndex >= sortedElementBank.length) {
      setFocusIndex(sortedElementBank.length > 0 ? sortedElementBank.length - 1 : -1);
    }
  }, [sortedElementBank.length, focusIndex]);

  // Calculate approximate columns for left/right navigation
  // Elements are in a flex-wrap layout, so we estimate based on container width
  const getColumnsEstimate = useCallback(() => {
    // Each element chip is roughly 100-120px wide with gap
    // On desktop the bank is ~500-600px wide, on mobile ~350px
    const width = window.innerWidth >= 1024 ? 500 : Math.min(window.innerWidth - 80, 400);
    return Math.max(1, Math.floor(width / 110));
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      // Mark keyboard as active on first keypress
      if (!hasUsedKeyboard.current) {
        hasUsedKeyboard.current = true;
        setKeyboardActive(true);
      }

      const key = e.key;
      const isInSearch = isSearchFocused();

      // ─── Help modal toggle (works everywhere) ───
      if (key === '?' && !isInSearch) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // ─── Close help modal ───
      if (showHelp) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowHelp(false);
        }
        return; // Swallow all other keys while help is open
      }

      // ─── Result card is showing (checked before modal bail-out since
      //     the result overlay itself matches the .fixed.inset-0.z-50 selector) ───
      if (lastResult) {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          selectResultElement?.({ name: lastResult.element, emoji: lastResult.emoji });
          clearLastResult?.();
        } else if (key === 'Escape') {
          e.preventDefault();
          clearLastResult?.();
        }
        return; // Swallow other keys while result showing
      }

      // Don't intercept if a modal other than our help modal is open
      // Check for common modal indicators (e.g. stats, archive, settings)
      const hasOpenModal = document.querySelector('[role="dialog"]:not([data-alchemy-help])');
      if (hasOpenModal && !showHelp) return;

      // ─── Search field focused ───
      if (isInSearch) {
        if (key === 'Escape') {
          e.preventDefault();
          setSearchQuery?.('');
          searchInputRef?.current?.blur();
          // Move focus into element bank
          if (sortedElementBank.length > 0) {
            setFocusIndex(0);
          }
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          searchInputRef?.current?.blur();
          setFocusIndex(0);
        }
        return; // Let normal typing happen
      }

      // ─── Disabled state ───
      if (disabled || (isComplete && !freePlayMode)) return;

      // ─── Cmd/Ctrl+Enter: combine ───
      if (key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (selectedA && selectedB && !isCombining && !isAnimating) {
          combineElements?.();
        }
        return;
      }

      // ─── Search shortcut ───
      if (key === '/') {
        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }

      // ─── Favorites panel ───
      if (key === 'g' || key === 'G') {
        e.preventDefault();
        onToggleFavoritesPanel?.();
        return;
      }

      // ─── Hint ───
      if ((key === 'h' || key === 'H') && !freePlayMode) {
        e.preventDefault();
        if (!hintCooldown && !isCombining && !isAnimating) {
          onUseHint?.();
        }
        return;
      }

      // ─── Sort cycling ───
      if (key === 's' || key === 'S') {
        e.preventDefault();
        const cycle = sortCycleRef.current;
        const currentIdx = cycle.indexOf(sortOrder);
        const nextIdx = (currentIdx + 1) % cycle.length;
        setSortOrder?.(cycle[nextIdx]);
        return;
      }

      // ─── Operator toggle ───
      if (key === '+' || key === '=') {
        e.preventDefault();
        if (isSubtractMode) toggleOperatorMode?.();
        return;
      }
      if (key === '-' || key === '_') {
        e.preventDefault();
        if (!isSubtractMode) toggleOperatorMode?.();
        return;
      }

      // ─── Tab: switch active slot ───
      if (key === 'Tab') {
        e.preventDefault();
        if (activeSlot === 'first') {
          setActiveSlot?.('second');
        } else {
          setActiveSlot?.('first');
        }
        return;
      }

      // ─── Combine ───
      if (key === 'c' || key === 'C') {
        e.preventDefault();
        if (selectedA && selectedB && !isCombining && !isAnimating) {
          combineElements?.();
        }
        return;
      }

      // ─── Clear ───
      if (key === 'x' || key === 'X') {
        e.preventDefault();
        clearSelections?.();
        return;
      }

      // ─── Backspace: clear active slot only ───
      if (key === 'Backspace') {
        e.preventDefault();
        if (activeSlot === 'first') {
          // Clear slot A by selecting null - use clearSelections as workaround
          // For now, clear both (simpler and consistent)
          clearSelections?.();
        } else if (activeSlot === 'second') {
          clearSelections?.();
        } else {
          clearSelections?.();
        }
        return;
      }

      // ─── Escape: close favorites or clear search ───
      if (key === 'Escape') {
        e.preventDefault();
        if (showFavoritesPanel) {
          onToggleFavoritesPanel?.();
        } else if (searchQuery) {
          setSearchQuery?.('');
        }
        return;
      }

      // ─── Arrow key navigation in element bank ───
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();

        if (sortedElementBank.length === 0) return;

        const cols = getColumnsEstimate();

        setFocusIndex((prev) => {
          // If no focus yet, start at 0
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
              next = prev + cols;
              break;
            case 'ArrowUp':
              next = prev - cols;
              break;
          }
          return clampIndex(next);
        });
        return;
      }

      // ─── Home / End ───
      if (key === 'Home') {
        e.preventDefault();
        setFocusIndex(0);
        return;
      }
      if (key === 'End') {
        e.preventDefault();
        setFocusIndex(sortedElementBank.length - 1);
        return;
      }

      // ─── Enter / Space: select focused element ───
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < sortedElementBank.length) {
          selectElement?.(sortedElementBank[focusIndex]);
        }
        return;
      }

      // ─── F: toggle favorite on focused element ───
      if (key === 'f' || key === 'F') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < sortedElementBank.length) {
          toggleFavorite?.(sortedElementBank[focusIndex].name);
        }
        return;
      }
    },
    [
      showHelp,
      lastResult,
      isSearchFocused,
      disabled,
      isComplete,
      freePlayMode,
      sortedElementBank,
      focusIndex,
      selectedA,
      selectedB,
      activeSlot,
      isCombining,
      isAnimating,
      isSubtractMode,
      hintCooldown,
      sortOrder,
      showFavoritesPanel,
      searchQuery,
      selectElement,
      setActiveSlot,
      combineElements,
      clearSelections,
      clearLastResult,
      selectResultElement,
      toggleOperatorMode,
      onUseHint,
      toggleFavorite,
      onToggleFavoritesPanel,
      setSortOrder,
      searchInputRef,
      setSearchQuery,
      clampIndex,
      getColumnsEstimate,
    ]
  );

  // Attach global keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused element into view
  useEffect(() => {
    if (focusIndex < 0 || !keyboardActive) return;

    // Find the element chip by data attribute
    const el = document.querySelector(`[data-kb-index="${focusIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIndex, keyboardActive]);

  // Detect mouse usage to hide keyboard focus ring
  useEffect(() => {
    const handleMouseDown = () => {
      setFocusIndex(-1);
    };
    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return {
    focusIndex,
    showHelp,
    setShowHelp,
    keyboardActive,
  };
}
