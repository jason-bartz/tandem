'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import logger from '@/lib/logger';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import {
  playCombineSound,
  playFirstDiscoverySound,
  playHintSound,
  playNewElementSound,
  playPlunkSound,
  playSoupStartSound,
  playSoupWinSound,
} from '@/lib/sounds';
import {
  SOUP_GAME_STATES,
  SOUP_API,
  SOUP_STORAGE_KEYS,
  STARTER_ELEMENTS,
  SORT_OPTIONS,
  formatTime,
  generateShareText,
  getRandomMessage,
  CONGRATS_MESSAGES,
} from '@/lib/element-soup.constants';

/**
 * Get today's date in YYYY-MM-DD format based on ET timezone
 */
function getCurrentPuzzleDate() {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get formatted date string for display (MM/DD/YY format)
 */
function getFormattedDate(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

/**
 * Custom hook for Element Soup game logic
 * @param {string|null} initialDate - Date for archive puzzles
 * @param {boolean} isFreePlay - If true, runs in free play mode (no target, no timer)
 */
export function useElementSoupGame(initialDate = null, isFreePlay = false) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { soupCombine, soupNewElement, soupFirstDiscovery } = useHaptics();

  // Core state
  const [gameState, setGameState] = useState(SOUP_GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(!isFreePlay); // No loading in free play
  const [error, setError] = useState(null);
  const [isArchive, setIsArchive] = useState(false);
  const [freePlayMode, setFreePlayMode] = useState(isFreePlay);

  // Element bank state
  const [elementBank, setElementBank] = useState([...STARTER_ELEMENTS]);
  const [sortOrder, setSortOrder] = useState(SORT_OPTIONS.NEWEST);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection state
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);

  // Combination state
  const [isCombining, setIsCombining] = useState(false); // API loading state
  const [isAnimating, setIsAnimating] = useState(false); // Animation state (after API responds)
  const [lastResult, setLastResult] = useState(null);
  const [combinationPath, setCombinationPath] = useState([]);
  const [combinationError, setCombinationError] = useState(null); // Inline error for failed combinations

  // Timer state
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const isPaused = false; // Timer pause functionality not yet implemented

  // Stats tracking
  const [movesCount, setMovesCount] = useState(0);
  const [newDiscoveries, setNewDiscoveries] = useState(0);
  const [firstDiscoveries, setFirstDiscoveries] = useState(0);
  const [firstDiscoveryElements, setFirstDiscoveryElements] = useState([]);
  const [recentElements, setRecentElements] = useState([]); // Track last 5 discovered elements

  // Completion state
  const [isComplete, setIsComplete] = useState(false);
  const [completionStats, setCompletionStats] = useState(null);
  const [statsRecorded, setStatsRecorded] = useState(false);

  // Hint state
  const [hintsRemaining, setHintsRemaining] = useState(2);
  const [solutionPath, setSolutionPath] = useState([]);

  // Refs for tracking
  const discoveredElements = useRef(new Set(['Earth', 'Water', 'Fire', 'Wind']));
  const puzzleDateRef = useRef(null);

  // Load puzzle on mount (skip in free play mode)
  useEffect(() => {
    if (!isFreePlay) {
      loadPuzzle(initialDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate, isFreePlay]);

  // Timer effect (disabled in free play mode)
  useEffect(() => {
    if (freePlayMode) return; // No timer in free play
    if (gameState === SOUP_GAME_STATES.PLAYING && hasStarted && !isPaused && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, hasStarted, isPaused, startTime, freePlayMode]);

  // Auto-save progress effect
  useEffect(() => {
    if (
      gameState === SOUP_GAME_STATES.PLAYING &&
      hasStarted &&
      puzzle &&
      isAuthenticated &&
      !isComplete
    ) {
      const saveTimeout = setTimeout(() => {
        saveProgress();
      }, 5000); // Debounce 5 seconds

      return () => clearTimeout(saveTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementBank, movesCount, elapsedTime]);

  /**
   * Load puzzle from API
   */
  const loadPuzzle = useCallback(
    async (date = null) => {
      setLoading(true);
      setError(null);

      try {
        const targetDate = date || getCurrentPuzzleDate();
        const isArchivePuzzle = date && date !== getCurrentPuzzleDate();

        logger.info('[ElementSoup] Loading puzzle', {
          date: targetDate,
          isArchive: isArchivePuzzle,
        });

        const url = getApiUrl(`${SOUP_API.PUZZLE}?date=${targetDate}`);
        const response = await capacitorFetch(url);

        if (!response.ok) {
          setError('It seems our Puzzlemaster is a little behind. Come back shortly!');
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success || !data.puzzle) {
          setError('It seems our Puzzlemaster is a little behind. Come back shortly!');
          setLoading(false);
          return;
        }

        setPuzzle(data.puzzle);
        setIsArchive(isArchivePuzzle);
        puzzleDateRef.current = targetDate;

        // Store solution path for hints
        if (data.puzzle.solutionPath) {
          setSolutionPath(data.puzzle.solutionPath);
        }

        // Check for saved progress
        const savedState = loadSavedState(targetDate);
        if (savedState && !savedState.completed) {
          restoreSavedState(savedState);
        } else if (savedState?.completed) {
          // Already completed - show complete screen so user can play again
          setGameState(SOUP_GAME_STATES.COMPLETE);
          setIsComplete(true);
          setStatsRecorded(true); // Don't re-record stats
          if (savedState.elementBank) {
            const restoredBank = savedState.elementBank.map((name) => ({
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name,
              emoji: savedState.elementEmojis?.[name] || '✨',
              isStarter: STARTER_ELEMENTS.some((s) => s.name === name),
            }));
            setElementBank(restoredBank);
          }
          // Restore stats for display
          if (savedState.movesCount) setMovesCount(savedState.movesCount);
          if (savedState.elapsedTime) setElapsedTime(savedState.elapsedTime);
          if (savedState.firstDiscoveries) setFirstDiscoveries(savedState.firstDiscoveries);
          if (savedState.firstDiscoveryElements)
            setFirstDiscoveryElements(savedState.firstDiscoveryElements);
          // Set completion stats for display
          setCompletionStats({
            parComparison:
              savedState.movesCount === data.puzzle.parMoves
                ? '0'
                : savedState.movesCount > data.puzzle.parMoves
                  ? `+${savedState.movesCount - data.puzzle.parMoves}`
                  : `${savedState.movesCount - data.puzzle.parMoves}`,
            congratsMessage: getRandomMessage(CONGRATS_MESSAGES),
          });
        } else {
          // Fresh start
          setElementBank([...STARTER_ELEMENTS]);
          discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
          setCombinationPath([]);
          setMovesCount(0);
          setNewDiscoveries(0);
          setFirstDiscoveries(0);
          setFirstDiscoveryElements([]);
          setHintsRemaining(2); // Reset hints for fresh start
          setGameState(SOUP_GAME_STATES.WELCOME);
        }

        setLoading(false);
      } catch (err) {
        logger.error('[ElementSoup] Failed to load puzzle', { error: err.message });
        setError('It seems our Puzzlemaster is a little behind. Come back shortly!');
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  /**
   * Load saved state from localStorage
   */
  const loadSavedState = useCallback((date) => {
    try {
      const key = `${SOUP_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      logger.error('[ElementSoup] Failed to load saved state', { error: err.message });
      return null;
    }
  }, []);

  /**
   * Restore saved state
   */
  const restoreSavedState = useCallback((savedState) => {
    logger.info('[ElementSoup] Restoring saved state');

    // Restore element bank
    if (savedState.elementBank) {
      const restoredBank = savedState.elementBank.map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        emoji: savedState.elementEmojis?.[name] || '✨',
        isStarter: STARTER_ELEMENTS.some((s) => s.name === name),
      }));
      setElementBank(restoredBank);
      discoveredElements.current = new Set(savedState.elementBank);
    }

    // Restore other state
    if (savedState.combinationPath) setCombinationPath(savedState.combinationPath);
    if (savedState.movesCount) setMovesCount(savedState.movesCount);
    if (savedState.elapsedTime) setElapsedTime(savedState.elapsedTime);
    if (savedState.newDiscoveries) setNewDiscoveries(savedState.newDiscoveries);
    if (savedState.firstDiscoveries) setFirstDiscoveries(savedState.firstDiscoveries);
    if (typeof savedState.hintsRemaining === 'number') {
      setHintsRemaining(savedState.hintsRemaining);
    }

    setHasStarted(true);
    setGameState(SOUP_GAME_STATES.PLAYING);
  }, []);

  /**
   * Save current progress to localStorage
   */
  const saveProgress = useCallback(() => {
    if (!puzzle || isComplete) return;

    try {
      const key = `${SOUP_STORAGE_KEYS.PUZZLE_PROGRESS}${puzzleDateRef.current}`;
      const elementEmojis = {};
      elementBank.forEach((el) => {
        elementEmojis[el.name] = el.emoji;
      });

      const state = {
        elementBank: elementBank.map((el) => el.name),
        elementEmojis,
        combinationPath,
        movesCount,
        elapsedTime,
        newDiscoveries,
        firstDiscoveries,
        hintsRemaining,
        completed: false,
        savedAt: Date.now(),
      };

      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      logger.error('[ElementSoup] Failed to save progress', { error: err.message });
    }
  }, [
    puzzle,
    isComplete,
    elementBank,
    combinationPath,
    movesCount,
    elapsedTime,
    newDiscoveries,
    firstDiscoveries,
    hintsRemaining,
  ]);

  /**
   * Start the game
   */
  const startGame = useCallback(() => {
    playSoupStartSound();
    setGameState(SOUP_GAME_STATES.PLAYING);
    setHasStarted(true);
    if (!freePlayMode) {
      setStartTime(Date.now());
      setElapsedTime(0);
    }
  }, [freePlayMode]);

  /**
   * Start free play mode
   */
  const startFreePlay = useCallback(() => {
    playSoupStartSound();
    setFreePlayMode(true);
    setIsComplete(false); // Reset completion state for free play
    setGameState(SOUP_GAME_STATES.PLAYING);
    setHasStarted(true);
    // Clear selections
    setSelectedA(null);
    setSelectedB(null);
    setLastResult(null);
    // No timer in free play mode
    setStartTime(null);
    setElapsedTime(0);
  }, []);

  /**
   * Select an element from the bank
   */
  const selectElement = useCallback(
    (element) => {
      // Play plunk sound when selecting an element
      playPlunkSound();

      if (!selectedA) {
        setSelectedA(element);
      } else if (!selectedB) {
        // Both branches do the same thing, so just set selectedB
        // (Same element selected is valid in Element Soup)
        setSelectedB(element);
      } else {
        // Both slots full - replace the second
        setSelectedB(element);
      }
    },
    [selectedA]
  );

  /**
   * Clear selections
   */
  const clearSelections = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
  }, []);

  /**
   * Combine the selected elements
   */
  const combineElements = useCallback(async () => {
    if (!selectedA || !selectedB || isCombining || isAnimating) return;

    setIsCombining(true);
    // Don't clear lastResult here - let AnimatePresence handle transitions smoothly

    const ANIMATION_DURATION = 600; // ms - wiggle + bang animation

    const currentUserId = user?.id || null;

    try {
      const url = getApiUrl(SOUP_API.COMBINE);
      const response = await capacitorFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elementA: selectedA.name,
          elementB: selectedB.name,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to combine elements');
      }

      const data = await response.json();

      if (!data.success || !data.result) {
        throw new Error('Invalid combination result');
      }

      const { element, emoji, isFirstDiscovery } = data.result;

      // Check if this is a new element for the player (before animation)
      const isNew = !discoveredElements.current.has(element);

      // API done - now start the animation
      setIsCombining(false);
      setIsAnimating(true);

      // Play ONE sound based on outcome (mutually exclusive, priority order):
      // 1. First discovery (globally) - special fanfare
      // 2. New element (for you) - wondrous magical sound
      // 3. Existing element - simple chime
      if (isFirstDiscovery) {
        soupFirstDiscovery();
        playFirstDiscoverySound();
      } else if (isNew) {
        soupNewElement();
        playCombineSound(); // Wondrous magical sound for new discoveries
      } else {
        soupCombine();
        playNewElementSound(); // Simple chime for existing elements
      }

      // Wait for animation to complete before showing result
      await new Promise((resolve) => setTimeout(resolve, ANIMATION_DURATION));

      setIsAnimating(false);

      // Update moves count
      setMovesCount((prev) => prev + 1);

      // Add to combination path
      setCombinationPath((prev) => [
        ...prev,
        {
          step: prev.length + 1,
          elementA: selectedA.name,
          elementB: selectedB.name,
          result: element,
        },
      ]);

      // Handle new element discovery
      if (isNew) {
        discoveredElements.current.add(element);
        setNewDiscoveries((prev) => prev + 1);

        // Add to element bank
        const newElement = {
          id: element.toLowerCase().replace(/\s+/g, '-'),
          name: element,
          emoji: emoji,
          isStarter: false,
          isNew: true,
        };

        setElementBank((prev) => [newElement, ...prev]);

        // Track recent elements (last 3)
        setRecentElements((prev) => [element, ...prev].slice(0, 3));
      }

      // Track first discoveries
      if (isFirstDiscovery) {
        setFirstDiscoveries((prev) => prev + 1);
        setFirstDiscoveryElements((prev) => [...prev, element]);
      }

      setLastResult({
        element,
        emoji,
        isNew,
        isFirstDiscovery,
        from: [selectedA.name, selectedB.name],
      });

      // Clear selections after successful combination
      clearSelections();
    } catch (err) {
      logger.error('[ElementSoup] Failed to combine elements', { error: err.message });
      // Show inline error instead of global error screen
      setCombinationError("Hmm, couldn't find a combination. Try a different pair!");
      setIsCombining(false);
      setIsAnimating(false);
      // Clear selections so user can try again
      clearSelections();
      // Auto-dismiss error after 3 seconds
      setTimeout(() => setCombinationError(null), 3000);
    }
  }, [
    selectedA,
    selectedB,
    isCombining,
    isAnimating,
    user,
    authLoading,
    clearSelections,
    soupCombine,
    soupNewElement,
    soupFirstDiscovery,
  ]);

  /**
   * Handle puzzle completion
   */
  const handlePuzzleComplete = useCallback(async () => {
    if (isComplete || statsRecorded) return;

    logger.info('[ElementSoup] Puzzle completed!');

    // Play victory sound
    playSoupWinSound();

    setIsComplete(true);
    setGameState(SOUP_GAME_STATES.COMPLETE);

    // Save completion to localStorage
    const key = `${SOUP_STORAGE_KEYS.PUZZLE_PROGRESS}${puzzleDateRef.current}`;
    const elementEmojis = {};
    elementBank.forEach((el) => {
      elementEmojis[el.name] = el.emoji;
    });

    const completionState = {
      elementBank: elementBank.map((el) => el.name),
      elementEmojis,
      combinationPath,
      movesCount,
      elapsedTime,
      newDiscoveries,
      firstDiscoveries,
      completed: true,
      completedAt: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(completionState));
    } catch (err) {
      logger.error('[ElementSoup] Failed to save completion', { error: err.message });
    }

    // Record stats to server if authenticated
    if (isAuthenticated && !statsRecorded) {
      setStatsRecorded(true);

      try {
        const url = getApiUrl(SOUP_API.COMPLETE);
        const response = await capacitorFetch(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleDate: puzzleDateRef.current,
              puzzleNumber: puzzle?.number,
              timeTaken: elapsedTime,
              movesCount,
              parMoves: puzzle?.parMoves,
              elementBank: elementBank.map((el) => el.name),
              combinationPath,
              newDiscoveries,
              firstDiscoveries,
            }),
          },
          true // Include auth
        );

        if (response.ok) {
          const data = await response.json();
          setCompletionStats(data.stats);
        }
      } catch (err) {
        logger.error('[ElementSoup] Failed to record stats', { error: err.message });
      }
    }

    // Generate completion stats for display
    setCompletionStats({
      parComparison:
        movesCount === puzzle?.parMoves
          ? '0'
          : movesCount > puzzle?.parMoves
            ? `+${movesCount - puzzle?.parMoves}`
            : `${movesCount - puzzle?.parMoves}`,
      congratsMessage: getRandomMessage(CONGRATS_MESSAGES),
    });
  }, [
    isComplete,
    statsRecorded,
    isAuthenticated,
    puzzle,
    elementBank,
    combinationPath,
    movesCount,
    elapsedTime,
    newDiscoveries,
    firstDiscoveries,
  ]);

  // Check for win condition (must be after handlePuzzleComplete is defined)
  // Skipped in free play mode - no win condition
  useEffect(() => {
    if (freePlayMode) return; // No win condition in free play
    if (puzzle && !isComplete && gameState === SOUP_GAME_STATES.PLAYING) {
      const targetFound = elementBank.some(
        (el) => el.name.toLowerCase() === puzzle.targetElement.toLowerCase()
      );

      if (targetFound) {
        handlePuzzleComplete();
      }
    }
  }, [elementBank, puzzle, isComplete, gameState, handlePuzzleComplete, freePlayMode]);

  /**
   * Get share text for completed puzzle
   */
  const getShareText = useCallback(() => {
    if (!puzzle || !isComplete) return '';

    return generateShareText({
      date: puzzleDateRef.current,
      time: elapsedTime,
      moves: movesCount,
      par: puzzle.parMoves,
      firstDiscoveries,
    });
  }, [puzzle, isComplete, elapsedTime, movesCount, firstDiscoveries]);

  /**
   * Reset game (for same puzzle)
   */
  const resetGame = useCallback(() => {
    setElementBank([...STARTER_ELEMENTS]);
    discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
    setCombinationPath([]);
    setMovesCount(0);
    setNewDiscoveries(0);
    setFirstDiscoveries(0);
    setFirstDiscoveryElements([]);
    setRecentElements([]);
    setSelectedA(null);
    setSelectedB(null);
    setLastResult(null);
    setIsComplete(false);
    setStatsRecorded(false);
    setCompletionStats(null);
    setHintsRemaining(2); // Reset hints
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameState(SOUP_GAME_STATES.PLAYING);
    setHasStarted(true);

    // Clear saved progress
    if (puzzleDateRef.current) {
      try {
        const key = `${SOUP_STORAGE_KEYS.PUZZLE_PROGRESS}${puzzleDateRef.current}`;
        localStorage.removeItem(key);
      } catch (err) {
        // Ignore
      }
    }
  }, []);

  /**
   * Use a hint - selects an element from the solution path that will help reach the target
   * The hint finds the next step in the solution path that the player hasn't completed yet,
   * then selects one element from that step's combination.
   */
  const useHint = useCallback(() => {
    if (hintsRemaining <= 0 || !solutionPath || solutionPath.length === 0) return;
    if (freePlayMode || isComplete || isCombining || isAnimating) return;

    // Find the first step in the solution path where the result hasn't been discovered yet
    const nextStep = solutionPath.find((step) => {
      return !discoveredElements.current.has(step.result);
    });

    if (!nextStep) {
      // All steps completed - shouldn't happen but just in case
      return;
    }

    // Check which elements from the step the player has
    const hasElementA = discoveredElements.current.has(nextStep.elementA);
    const hasElementB = discoveredElements.current.has(nextStep.elementB);

    // Play the hint sound
    playHintSound();

    // Select the element that will help most
    // If player has both elements, select the first one
    // If player has one, select it (they need to combine it with the other)
    // If player has neither, we need to find an earlier step - but for now just select elementA
    let elementToSelect = null;

    if (hasElementA && hasElementB) {
      // Player has both - select elementA to start the combination
      elementToSelect = elementBank.find(
        (el) => el.name.toLowerCase() === nextStep.elementA.toLowerCase()
      );
    } else if (hasElementA) {
      elementToSelect = elementBank.find(
        (el) => el.name.toLowerCase() === nextStep.elementA.toLowerCase()
      );
    } else if (hasElementB) {
      elementToSelect = elementBank.find(
        (el) => el.name.toLowerCase() === nextStep.elementB.toLowerCase()
      );
    } else {
      // Player has neither - find an earlier step that creates one of these elements
      const earlierStep = solutionPath.find((step) => {
        return (
          (step.result.toLowerCase() === nextStep.elementA.toLowerCase() ||
            step.result.toLowerCase() === nextStep.elementB.toLowerCase()) &&
          discoveredElements.current.has(step.elementA) &&
          discoveredElements.current.has(step.elementB)
        );
      });

      if (earlierStep) {
        elementToSelect = elementBank.find(
          (el) => el.name.toLowerCase() === earlierStep.elementA.toLowerCase()
        );
      }
    }

    if (elementToSelect) {
      // Clear any existing selections first, then select the hint element
      setSelectedA(null);
      setSelectedB(null);
      // Use setTimeout to ensure state is cleared before selecting
      setTimeout(() => {
        selectElement(elementToSelect);
      }, 50);
    }

    // Decrement hints
    setHintsRemaining((prev) => prev - 1);
  }, [
    hintsRemaining,
    solutionPath,
    freePlayMode,
    isComplete,
    isCombining,
    isAnimating,
    elementBank,
    selectElement,
  ]);

  /**
   * Get sorted and filtered element bank
   */
  const getSortedElementBank = useCallback(() => {
    let sorted = [...elementBank];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      sorted = sorted.filter(
        (el) => el.name.toLowerCase().includes(query) || el.emoji.includes(query)
      );
    }

    // Apply sort
    if (sortOrder === SORT_OPTIONS.ALPHABETICAL) {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === SORT_OPTIONS.FIRST_DISCOVERIES) {
      // Sort first discoveries to the top, then newest
      sorted.sort((a, b) => {
        const aIsFirst = firstDiscoveryElements.includes(a.name);
        const bIsFirst = firstDiscoveryElements.includes(b.name);
        if (aIsFirst && !bIsFirst) return -1;
        if (!aIsFirst && bIsFirst) return 1;
        return 0; // Keep original order (newest) within each group
      });
    }
    // NEWEST is default order (newest first, which is how we add them)

    return sorted;
  }, [elementBank, searchQuery, sortOrder, firstDiscoveryElements]);

  return {
    // State
    gameState,
    puzzle,
    loading,
    error,
    isArchive,

    // Element bank
    elementBank,
    sortedElementBank: getSortedElementBank(),
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,

    // Selection
    selectedA,
    selectedB,
    selectElement,
    clearSelections,

    // Combination
    isCombining,
    isAnimating,
    combineElements,
    lastResult,
    clearLastResult: useCallback(() => setLastResult(null), []),
    combinationPath,
    combinationError,
    clearCombinationError: useCallback(() => setCombinationError(null), []),

    // Timer
    hasStarted,
    elapsedTime,
    isPaused,
    formatTime,

    // Stats
    movesCount,
    newDiscoveries,
    firstDiscoveries,
    firstDiscoveryElements,
    recentElements,

    // Completion
    isComplete,
    completionStats,
    getShareText,

    // Actions
    startGame,
    startFreePlay,
    loadPuzzle,
    resetGame,

    // Hints
    hintsRemaining,
    useHint,

    // Mode
    freePlayMode,

    // Helpers
    puzzleDate: puzzleDateRef.current,
    formattedDate: puzzleDateRef.current ? getFormattedDate(puzzleDateRef.current) : '',
    targetElement: puzzle?.targetElement,
    targetEmoji: puzzle?.targetEmoji,
    parMoves: puzzle?.parMoves,
  };
}

export default useElementSoupGame;
