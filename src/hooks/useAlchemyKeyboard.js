'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Keyboard shortcut definitions for the help modal
 */
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigate',
    shortcuts: [
      { keys: ['W', 'A', 'S', 'D'], description: 'Move through elements' },
      { keys: ['Enter'], description: 'Select focused element' },
      { keys: ['F'], description: 'Favorite focused element' },
      { keys: ['/'], description: 'Search' },
      { keys: ['R'], description: 'Cycle sort order' },
    ],
  },
  {
    category: 'Combine',
    shortcuts: [
      { keys: ['Enter'], description: 'Combine elements' },
      { keys: ['Tab'], description: 'Switch slot' },
      { keys: ['Esc'], description: 'Deselect / Dismiss' },
      { keys: ['+', '-'], description: 'Combine / Subtract mode' },
    ],
  },
];

/**
 * useAlchemyKeyboard - Keyboard controls for Daily Alchemy
 *
 * WASD / Arrow keys navigate the element bank grid.
 * Enter selects a focused element or combines when both slots are filled.
 * Esc progressively dismisses: search → favorites → deselect element.
 * Tab switches the active combination slot.
 */
export function useAlchemyKeyboard({
  sortedElementBank = [],
  selectElement,
  selectedA,
  selectedB,
  activeSlot,
  setActiveSlot,
  combineElements,
  deselectLastSelected,
  isCombining,
  isAnimating,
  lastResult,
  clearLastResult,
  selectResultElement,
  toggleOperatorMode,
  isSubtractMode,
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

  const hasUsedKeyboard = useRef(false);
  const sortCycleRef = useRef(['newest', 'alphabetical', 'firstDiscoveries', 'mostUsed', 'random']);

  const isSearchFocused = useCallback(() => {
    return document.activeElement === searchInputRef?.current;
  }, [searchInputRef]);

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

  // Approximate columns for vertical navigation
  const getColumnsEstimate = useCallback(() => {
    const width = window.innerWidth >= 1024 ? 500 : Math.min(window.innerWidth - 80, 400);
    return Math.max(1, Math.floor(width / 110));
  }, []);

  // Map WASD + Arrow keys to a direction
  const getNavDirection = useCallback((key) => {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'up';
      case 'ArrowDown':
      case 's':
      case 'S':
        return 'down';
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return 'left';
      case 'ArrowRight':
      case 'd':
      case 'D':
        return 'right';
      default:
        return null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (!hasUsedKeyboard.current) {
        hasUsedKeyboard.current = true;
        setKeyboardActive(true);
      }

      const key = e.key;
      const isInSearch = isSearchFocused();

      // ─── Help modal toggle ───
      if (key === '?' && !isInSearch) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // ─── Help modal open — only Esc closes it ───
      if (showHelp) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowHelp(false);
        }
        return;
      }

      // ─── Result card showing ───
      if (lastResult) {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          selectResultElement?.({ name: lastResult.element, emoji: lastResult.emoji });
          clearLastResult?.();
        } else if (key === 'Escape') {
          e.preventDefault();
          clearLastResult?.();
        }
        return;
      }

      // Don't intercept if another modal is open
      const hasOpenModal = document.querySelector('[role="dialog"]:not([data-alchemy-help])');
      if (hasOpenModal) return;

      // ─── Search field focused ───
      if (isInSearch) {
        if (key === 'Escape') {
          e.preventDefault();
          setSearchQuery?.('');
          searchInputRef?.current?.blur();
          if (sortedElementBank.length > 0) {
            setFocusIndex(0);
          }
        } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
          // Only arrow down exits search (WASD S would conflict with typing)
          if (key === 'ArrowDown') {
            e.preventDefault();
            searchInputRef?.current?.blur();
            setFocusIndex(0);
          }
        }
        return;
      }

      // ─── Disabled state ───
      if (disabled || (isComplete && !freePlayMode)) return;

      // ─── Navigation (WASD + Arrow keys) ───
      const dir = getNavDirection(key);
      if (dir) {
        e.preventDefault();
        if (sortedElementBank.length === 0) return;

        const cols = getColumnsEstimate();
        setFocusIndex((prev) => {
          if (prev < 0) return 0;
          let next = prev;
          switch (dir) {
            case 'right':
              next = prev + 1;
              break;
            case 'left':
              next = prev - 1;
              break;
            case 'down':
              next = prev + cols;
              break;
            case 'up':
              next = prev - cols;
              break;
          }
          return clampIndex(next);
        });
        return;
      }

      // ─── Enter / Space: select focused element, or combine ───
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < sortedElementBank.length) {
          selectElement?.(sortedElementBank[focusIndex]);
        } else if (key === 'Enter' && selectedA && selectedB && !isCombining && !isAnimating) {
          combineElements?.();
        }
        return;
      }

      // ─── Tab: switch active slot ───
      if (key === 'Tab') {
        e.preventDefault();
        setActiveSlot?.(activeSlot === 'first' ? 'second' : 'first');
        return;
      }

      // ─── Escape: dismiss in priority order ───
      if (key === 'Escape') {
        e.preventDefault();
        if (showFavoritesPanel) {
          onToggleFavoritesPanel?.();
        } else if (searchQuery) {
          setSearchQuery?.('');
        } else if (selectedA || selectedB) {
          deselectLastSelected?.();
        }
        return;
      }

      // ─── Backspace: same as Escape for deselection ───
      if (key === 'Backspace') {
        e.preventDefault();
        if (selectedA || selectedB) {
          deselectLastSelected?.();
        }
        return;
      }

      // ─── Search shortcut ───
      if (key === '/') {
        e.preventDefault();
        searchInputRef?.current?.focus();
        return;
      }

      // ─── Sort cycling ───
      if (key === 'r' || key === 'R') {
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
      showFavoritesPanel,
      searchQuery,
      selectElement,
      setActiveSlot,
      combineElements,
      deselectLastSelected,
      clearLastResult,
      selectResultElement,
      toggleOperatorMode,
      toggleFavorite,
      onToggleFavoritesPanel,
      setSortOrder,
      sortOrder,
      searchInputRef,
      setSearchQuery,
      clampIndex,
      getColumnsEstimate,
      getNavDirection,
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
    const el = document.querySelector(`[data-kb-index="${focusIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIndex, keyboardActive]);

  // Hide keyboard focus on mouse usage
  useEffect(() => {
    const handleMouseDown = () => setFocusIndex(-1);
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
