'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import logger from '@/lib/logger';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import {
  playCombineSound,
  playFailureSound,
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
  SOUP_CONFIG,
  STARTER_ELEMENTS,
  SORT_OPTIONS,
  formatTime,
  generateShareText,
  getRandomMessage,
  CONGRATS_MESSAGES,
  GAME_OVER_MESSAGES,
} from '@/lib/daily-alchemy.constants';

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
 * Custom hook for Daily Alchemy game logic
 * @param {string|null} initialDate - Date for archive puzzles
 * @param {boolean} isFreePlay - If true, runs in free play mode (no target, no timer)
 */
export function useDailyAlchemyGame(initialDate = null, isFreePlay = false) {
  const { user, loading: authLoading } = useAuth();
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
  const [remainingTime, setRemainingTime] = useState(SOUP_CONFIG.TIME_LIMIT_SECONDS); // Countdown timer for daily mode
  const [isPaused, setIsPaused] = useState(false);
  const pausedAtRef = useRef(null); // Track when we paused to calculate elapsed time correctly
  const [isGameOver, setIsGameOver] = useState(false);

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
  const [hintsRemaining, setHintsRemaining] = useState(4);
  const [solutionPath, setSolutionPath] = useState([]);
  const [lastHintStep, setLastHintStep] = useState(null); // Track step from last hint for consecutive hints

  // Creative Mode save state
  const [isSavingCreative, setIsSavingCreative] = useState(false);
  const [creativeSaveSuccess, setCreativeSaveSuccess] = useState(false);
  const [isLoadingCreative, setIsLoadingCreative] = useState(false);
  const [creativeLoadComplete, setCreativeLoadComplete] = useState(false); // Tracks if initial load finished

  // Autosave state for Creative Mode
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveComplete, setAutoSaveComplete] = useState(false);
  const lastAutoSaveDiscoveryCount = useRef(0); // Track discoveries at last autosave
  const lastAutoSaveFirstDiscoveryCount = useRef(0); // Track first discoveries at last autosave

  // Track user ID to detect account switches
  const previousUserIdRef = useRef(user?.id);

  // Saved progress state - tracks if there's a game in progress to resume
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const pendingSavedState = useRef(null);

  // First attempt tracking - only first successful attempt counts for leaderboard
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);

  // Refs for tracking
  const discoveredElements = useRef(new Set(['Earth', 'Water', 'Fire', 'Wind']));
  const puzzleDateRef = useRef(null);

  // Refs for selection state (allows stable callback for memoized components)
  const selectedARef = useRef(selectedA);
  const selectedBRef = useRef(selectedB);
  selectedARef.current = selectedA;
  selectedBRef.current = selectedB;

  // Load puzzle on mount (skip in free play mode)
  useEffect(() => {
    if (!isFreePlay) {
      loadPuzzle(initialDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate, isFreePlay]);

  // CRITICAL: Reset Creative Mode state when user changes (account switching)
  // This prevents User X's in-memory state from being saved under User Y's account
  useEffect(() => {
    const currentUserId = user?.id;
    const previousUserId = previousUserIdRef.current;

    // Detect user change (including logout -> login with different account)
    if (previousUserId !== currentUserId) {
      logger.info('[DailyAlchemy] User changed, resetting Creative Mode state', {
        previousUserId: previousUserId || 'none',
        currentUserId: currentUserId || 'none',
      });

      // Reset Creative Mode state to prevent cross-account contamination
      if (freePlayMode) {
        // If we were in Creative Mode, exit it completely
        setFreePlayMode(false);
        setGameState(SOUP_GAME_STATES.WELCOME);
        setHasStarted(false);
      }

      // Reset element bank to starter elements
      setElementBank([...STARTER_ELEMENTS]);
      discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);

      // Reset all game stats
      setMovesCount(0);
      setNewDiscoveries(0);
      setFirstDiscoveries(0);
      setFirstDiscoveryElements([]);
      setRecentElements([]);
      setCombinationPath([]);

      // Reset Creative Mode save state
      setCreativeLoadComplete(false);
      setIsSavingCreative(false);
      setCreativeSaveSuccess(false);
      setIsLoadingCreative(false);

      // Reset autosave tracking refs
      lastAutoSaveDiscoveryCount.current = 0;
      lastAutoSaveFirstDiscoveryCount.current = 0;
      setIsAutoSaving(false);
      setAutoSaveComplete(false);

      // Reset selections
      setSelectedA(null);
      setSelectedB(null);
      setLastResult(null);

      // Update the ref to track new user
      previousUserIdRef.current = currentUserId;
    }
  }, [user?.id, freePlayMode]);

  // Timer effect (disabled in free play mode)
  // Tracks both elapsed time (for stats) and remaining time (countdown for daily mode)
  useEffect(() => {
    if (freePlayMode) return; // No timer in free play
    if (gameState === SOUP_GAME_STATES.PLAYING && hasStarted && !isPaused && startTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
        // Calculate remaining time (countdown from TIME_LIMIT_SECONDS)
        const remaining = Math.max(0, SOUP_CONFIG.TIME_LIMIT_SECONDS - elapsed);
        setRemainingTime(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, hasStarted, isPaused, startTime, freePlayMode]);

  /**
   * Pause the timer and save current elapsed time
   */
  const pauseTimer = useCallback(() => {
    if (freePlayMode || isPaused || !hasStarted) return;

    // Calculate and save current elapsed time before pausing
    if (startTime) {
      const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(currentElapsed);
      pausedAtRef.current = currentElapsed;
    }

    setIsPaused(true);
    logger.info('[ElementSoup] Timer paused', { elapsedTime: pausedAtRef.current });
  }, [freePlayMode, isPaused, hasStarted, startTime]);

  /**
   * Resume the timer from where it was paused
   */
  const resumeTimer = useCallback(() => {
    if (freePlayMode || !isPaused || !hasStarted) return;

    // Recalculate startTime based on elapsed time when we paused
    const savedElapsed = pausedAtRef.current ?? elapsedTime;
    setStartTime(Date.now() - savedElapsed * 1000);
    pausedAtRef.current = null;

    setIsPaused(false);
    logger.info('[ElementSoup] Timer resumed', { elapsedTime: savedElapsed });
  }, [freePlayMode, isPaused, hasStarted, elapsedTime]);

  // Visibility change handler - pause timer when app/tab loses focus
  useEffect(() => {
    if (freePlayMode || !hasStarted || isComplete || isGameOver) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab/app is hidden - pause timer
        if (!isPaused && gameState === SOUP_GAME_STATES.PLAYING) {
          // Calculate and save current elapsed time before pausing
          if (startTime) {
            const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedTime(currentElapsed);
            pausedAtRef.current = currentElapsed;
          }
          setIsPaused(true);
          logger.info('[ElementSoup] Timer paused due to visibility change');
        }
      } else {
        // Tab/app is visible again - resume timer
        if (isPaused && gameState === SOUP_GAME_STATES.PLAYING) {
          const savedElapsed = pausedAtRef.current ?? elapsedTime;
          setStartTime(Date.now() - savedElapsed * 1000);
          pausedAtRef.current = null;
          setIsPaused(false);
          logger.info('[ElementSoup] Timer resumed after visibility change');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [
    freePlayMode,
    hasStarted,
    isComplete,
    isGameOver,
    isPaused,
    gameState,
    startTime,
    elapsedTime,
  ]);

  // Auto-save progress effect - only triggers on meaningful state changes
  // Note: elapsedTime intentionally excluded to avoid saving every second
  // Note: Only saves for daily puzzle mode, not Creative Mode (Creative Mode saves to Supabase)
  useEffect(() => {
    if (
      gameState === SOUP_GAME_STATES.PLAYING &&
      hasStarted &&
      puzzle &&
      user &&
      !isComplete &&
      !freePlayMode // Don't auto-save to localStorage in Creative Mode
    ) {
      const saveTimeout = setTimeout(() => {
        saveProgress();
      }, 5000); // Debounce 5 seconds

      return () => clearTimeout(saveTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementBank, movesCount, freePlayMode]);

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

        // Check if this puzzle was previously attempted (for leaderboard first-attempt-only)
        try {
          const attemptedKey = `${SOUP_STORAGE_KEYS.PUZZLE_ATTEMPTED}${targetDate}`;
          const wasAttempted = localStorage.getItem(attemptedKey);
          setIsFirstAttempt(!wasAttempted);
        } catch (err) {
          // If localStorage fails, assume first attempt
          setIsFirstAttempt(true);
        }

        // Store solution path for hints
        if (data.puzzle.solutionPath) {
          setSolutionPath(data.puzzle.solutionPath);
        }

        // Check for saved progress
        const savedState = loadSavedState(targetDate);
        if (savedState && !savedState.completed) {
          // Store saved state but don't restore yet - show welcome screen with Continue option
          pendingSavedState.current = savedState;
          setHasSavedProgress(true);
          setGameState(SOUP_GAME_STATES.WELCOME);
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
          setHintsRemaining(4); // Reset hints for fresh start
          setGameState(SOUP_GAME_STATES.WELCOME);
        }

        setLoading(false);
      } catch (err) {
        logger.error('[ElementSoup] Failed to load puzzle', { error: err.message });
        setError('It seems our Puzzlemaster is a little behind. Come back shortly!');
        setLoading(false);
      }
    },
    [user]
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
    if (savedState.newDiscoveries) setNewDiscoveries(savedState.newDiscoveries);
    if (savedState.firstDiscoveries) setFirstDiscoveries(savedState.firstDiscoveries);
    if (typeof savedState.hintsRemaining === 'number') {
      setHintsRemaining(savedState.hintsRemaining);
    }

    // Restore timer state - calculate startTime so the timer continues from where it left off
    const restoredElapsed = savedState.elapsedTime || 0;
    setElapsedTime(restoredElapsed);
    setRemainingTime(Math.max(0, SOUP_CONFIG.TIME_LIMIT_SECONDS - restoredElapsed));
    // Set startTime to a value that makes the timer calculation work correctly
    // Timer calculates: elapsed = (Date.now() - startTime) / 1000
    // So we need: startTime = Date.now() - (elapsedTime * 1000)
    setStartTime(Date.now() - restoredElapsed * 1000);
    setIsPaused(false);
    pausedAtRef.current = null;

    setHasStarted(true);
    setGameState(SOUP_GAME_STATES.PLAYING);
  }, []);

  /**
   * Resume game from saved progress (called when user clicks Continue on welcome screen)
   */
  const resumeGame = useCallback(() => {
    if (pendingSavedState.current) {
      playSoupStartSound();
      restoreSavedState(pendingSavedState.current);
      pendingSavedState.current = null;
      setHasSavedProgress(false);
    }
  }, [restoreSavedState]);

  /**
   * Save current progress to localStorage
   */
  const saveProgress = useCallback(() => {
    // Don't save to localStorage in Creative Mode - it uses Supabase instead
    if (!puzzle || isComplete || freePlayMode) return;

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
    freePlayMode,
    elementBank,
    combinationPath,
    movesCount,
    elapsedTime,
    newDiscoveries,
    firstDiscoveries,
    hintsRemaining,
  ]);

  // Save progress immediately when timer is paused (ensures elapsedTime is saved before user exits)
  useEffect(() => {
    if (isPaused && hasStarted && puzzle && user && !isComplete && !freePlayMode) {
      saveProgress();
    }
  }, [isPaused, hasStarted, puzzle, user, isComplete, freePlayMode, saveProgress]);

  /**
   * Start the game
   */
  const startGame = useCallback(() => {
    playSoupStartSound();

    // Reset to daily puzzle mode (not Creative Mode)
    setFreePlayMode(false);

    // Reset element bank to starter elements for daily puzzle
    setElementBank([...STARTER_ELEMENTS]);
    discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);

    // Reset all game state
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
    setHintsRemaining(4);
    setLastHintStep(null);

    // Start timer for daily puzzle
    setStartTime(Date.now());
    setElapsedTime(0);
    setRemainingTime(SOUP_CONFIG.TIME_LIMIT_SECONDS);
    setIsPaused(false);
    pausedAtRef.current = null;

    setGameState(SOUP_GAME_STATES.PLAYING);
    setHasStarted(true);
  }, []);

  /**
   * Load Creative Mode save from Supabase
   * Returns the save data if exists, null otherwise
   */
  const loadCreativeSave = useCallback(async () => {
    if (!user) return null;

    setIsLoadingCreative(true);
    try {
      const url = getApiUrl(SOUP_API.CREATIVE_SAVE);
      const response = await capacitorFetch(url, {}, true);

      if (!response.ok) {
        logger.error('[DailyAlchemy] Failed to load creative save');
        setIsLoadingCreative(false);
        return null;
      }

      const data = await response.json();
      setIsLoadingCreative(false);

      if (data.success && data.hasSave && data.save) {
        return data.save;
      }
      return null;
    } catch (err) {
      logger.error('[DailyAlchemy] Failed to load creative save', { error: err.message });
      setIsLoadingCreative(false);
      return null;
    }
  }, [user]);

  /**
   * Start free play mode (Creative Mode)
   * Automatically loads saved game if one exists
   */
  const startFreePlay = useCallback(async () => {
    playSoupStartSound();

    // IMPORTANT: Reset autosave tracking before loading to prevent stale data saves
    // This ensures we don't autosave old state while loading new state
    setCreativeLoadComplete(false);
    lastAutoSaveDiscoveryCount.current = 0;
    lastAutoSaveFirstDiscoveryCount.current = 0;

    setFreePlayMode(true);
    setIsComplete(false);
    setHasStarted(true);
    setSelectedA(null);
    setSelectedB(null);
    setLastResult(null);
    setStartTime(null);
    setElapsedTime(0);

    // Try to load existing save
    const savedGame = await loadCreativeSave();

    if (savedGame && savedGame.elementBank && savedGame.elementBank.length > 0) {
      // Restore from save
      logger.info('[DailyAlchemy] Restoring Creative Mode save', {
        elementCount: savedGame.elementBank.length,
      });

      const restoredBank = savedGame.elementBank.map((el) => ({
        id: el.name.toLowerCase().replace(/\s+/g, '-'),
        name: el.name,
        emoji: el.emoji || '✨',
        isStarter: STARTER_ELEMENTS.some((s) => s.name === el.name),
      }));

      setElementBank(restoredBank);
      discoveredElements.current = new Set(restoredBank.map((el) => el.name));
      setMovesCount(savedGame.totalMoves || 0);
      setNewDiscoveries(savedGame.totalDiscoveries || 0);
      setFirstDiscoveries(savedGame.firstDiscoveries || 0);
      setFirstDiscoveryElements(savedGame.firstDiscoveryElements || []);

      // Sync autosave refs with loaded state to prevent immediate autosave
      lastAutoSaveDiscoveryCount.current = savedGame.totalDiscoveries || 0;
      lastAutoSaveFirstDiscoveryCount.current = savedGame.firstDiscoveries || 0;
    } else {
      // Fresh start
      setElementBank([...STARTER_ELEMENTS]);
      discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
      setMovesCount(0);
      setNewDiscoveries(0);
      setFirstDiscoveries(0);
      setFirstDiscoveryElements([]);
    }

    setCombinationPath([]);
    setRecentElements([]);
    setGameState(SOUP_GAME_STATES.PLAYING);

    // Mark load as complete - autosave is now safe to run
    setCreativeLoadComplete(true);
  }, [loadCreativeSave]);

  /**
   * Save Creative Mode progress to Supabase
   */
  const saveCreativeMode = useCallback(async () => {
    if (!user || !freePlayMode) {
      return false;
    }

    setIsSavingCreative(true);
    setCreativeSaveSuccess(false);

    try {
      const url = getApiUrl(SOUP_API.CREATIVE_SAVE);
      const response = await capacitorFetch(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elementBank: elementBank.map((el) => ({
              name: el.name,
              emoji: el.emoji,
              isStarter: el.isStarter || false,
            })),
            totalMoves: movesCount,
            totalDiscoveries: newDiscoveries,
            firstDiscoveries,
            firstDiscoveryElements,
          }),
        },
        true
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[DailyAlchemy] Failed to save creative mode', {
          status: response.status,
          error: errorData.error || 'Unknown error',
        });
        setIsSavingCreative(false);
        return false;
      }

      const data = await response.json();
      logger.info('[DailyAlchemy] Creative Mode saved successfully', {
        elementCount: elementBank.length,
        savedAt: data.savedAt,
      });

      setIsSavingCreative(false);
      setCreativeSaveSuccess(true);

      // Clear success indicator after 2 seconds
      setTimeout(() => setCreativeSaveSuccess(false), 2000);

      return true;
    } catch (err) {
      logger.error('[DailyAlchemy] Failed to save creative mode', { error: err.message });
      setIsSavingCreative(false);
      return false;
    }
  }, [
    user,
    freePlayMode,
    elementBank,
    movesCount,
    newDiscoveries,
    firstDiscoveries,
    firstDiscoveryElements,
  ]);

  /**
   * Clear Creative Mode save and reset to starter elements
   */
  const clearCreativeMode = useCallback(async () => {
    if (!user) return false;

    try {
      const url = getApiUrl(SOUP_API.CREATIVE_SAVE);
      const response = await capacitorFetch(url, { method: 'DELETE' }, true);

      if (!response.ok) {
        logger.error('[DailyAlchemy] Failed to clear creative save');
        return false;
      }

      logger.info('[DailyAlchemy] Creative Mode save cleared');

      // Reset to starter elements
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

      // Reset autosave tracking refs to match cleared state
      lastAutoSaveDiscoveryCount.current = 0;
      lastAutoSaveFirstDiscoveryCount.current = 0;

      return true;
    } catch (err) {
      logger.error('[DailyAlchemy] Failed to clear creative save', { error: err.message });
      return false;
    }
  }, [user]);

  /**
   * Autosave for Creative Mode
   * Triggers on:
   * - Every 5 new discoveries
   * - Every first discovery
   */
  useEffect(() => {
    // Only autosave in Creative Mode with authenticated user
    if (!freePlayMode || !user || !hasStarted) return;

    // CRITICAL: Don't autosave until initial load is complete
    // This prevents saving stale/previous user data during the load phase
    if (!creativeLoadComplete) return;

    // Don't autosave if already saving
    if (isSavingCreative || isAutoSaving) return;

    // Check if we should trigger autosave
    const discoveryCountSinceLastSave = newDiscoveries - lastAutoSaveDiscoveryCount.current;
    const shouldSaveEveryFive = discoveryCountSinceLastSave >= 5 && newDiscoveries > 0;
    const hasNewFirstDiscovery = firstDiscoveries > lastAutoSaveFirstDiscoveryCount.current;

    if (shouldSaveEveryFive || hasNewFirstDiscovery) {
      // Trigger autosave
      const doAutoSave = async () => {
        setIsAutoSaving(true);
        setAutoSaveComplete(false);

        try {
          const url = getApiUrl(SOUP_API.CREATIVE_SAVE);
          const response = await capacitorFetch(
            url,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                elementBank: elementBank.map((el) => ({
                  name: el.name,
                  emoji: el.emoji,
                  isStarter: el.isStarter || false,
                })),
                totalMoves: movesCount,
                totalDiscoveries: newDiscoveries,
                firstDiscoveries,
                firstDiscoveryElements,
              }),
            },
            true
          );

          if (response.ok) {
            logger.info('[DailyAlchemy] Creative Mode autosaved', {
              elementCount: elementBank.length,
              trigger: shouldSaveEveryFive ? 'every5' : 'firstDiscovery',
            });
            lastAutoSaveDiscoveryCount.current = newDiscoveries;
            lastAutoSaveFirstDiscoveryCount.current = firstDiscoveries;
          }
        } catch (err) {
          logger.error('[DailyAlchemy] Autosave failed', { error: err.message });
        }

        setIsAutoSaving(false);
        setAutoSaveComplete(true);

        // Clear the "complete" indicator after 2 seconds
        setTimeout(() => setAutoSaveComplete(false), 2000);
      };

      doAutoSave();
    }
  }, [
    freePlayMode,
    user,
    hasStarted,
    creativeLoadComplete,
    newDiscoveries,
    firstDiscoveries,
    firstDiscoveryElements,
    elementBank,
    movesCount,
    isSavingCreative,
    isAutoSaving,
  ]);

  /**
   * Select an element from the bank
   * Uses refs to read current selection state, allowing a stable callback
   * that works with memoized ElementChip components
   */
  const selectElement = useCallback((element) => {
    // Play plunk sound when selecting an element
    playPlunkSound();

    // Read current values from refs (not stale closure values)
    const currentA = selectedARef.current;
    const currentB = selectedBRef.current;

    if (!currentA) {
      setSelectedA(element);
    } else if (!currentB) {
      // (Same element selected is valid in Element Soup)
      setSelectedB(element);
    } else {
      // Both slots full - replace the second
      setSelectedB(element);
    }
  }, []);

  /**
   * Clear selections
   */
  const clearSelections = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
    setLastHintStep(null); // Clear hint step tracking when selections are cleared
  }, []);

  /**
   * Select a result element into the first slot (called when user swipes up the result popup)
   */
  const selectResultElement = useCallback((element) => {
    const elementToSelect = {
      id: element.name.toLowerCase().replace(/\s+/g, '-'),
      name: element.name,
      emoji: element.emoji,
      isStarter: false,
    };

    setSelectedA(elementToSelect);
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

      // Clear both selection slots after combination
      setSelectedA(null);
      setSelectedB(null);
      setLastHintStep(null); // Clear hint step tracking
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
      // Also mark as attempted (for leaderboard first-attempt tracking)
      if (!freePlayMode) {
        const attemptedKey = `${SOUP_STORAGE_KEYS.PUZZLE_ATTEMPTED}${puzzleDateRef.current}`;
        localStorage.setItem(attemptedKey, 'true');
      }
    } catch (err) {
      logger.error('[ElementSoup] Failed to save completion', { error: err.message });
    }

    // Generate local completion stats
    const localParComparison =
      movesCount === puzzle?.parMoves
        ? '0'
        : movesCount > puzzle?.parMoves
          ? `+${movesCount - puzzle?.parMoves}`
          : `${movesCount - puzzle?.parMoves}`;
    const congratsMessage = getRandomMessage(CONGRATS_MESSAGES);

    // Set initial local stats (will be updated with server stats if authenticated)
    setCompletionStats({
      parComparison: localParComparison,
      congratsMessage,
    });

    // Record stats to server if authenticated
    if (user && !statsRecorded && !isArchive) {
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
          // Merge server stats with local congratsMessage
          setCompletionStats({
            ...data.stats,
            congratsMessage,
          });
        }
      } catch (err) {
        logger.error('[ElementSoup] Failed to record stats', { error: err.message });
      }

      // Submit to leaderboard (only on first attempt - retries after failure don't count)
      if (isFirstAttempt) {
        try {
          await capacitorFetch(
            getApiUrl('/api/leaderboard/daily'),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gameType: 'soup',
                puzzleDate: puzzleDateRef.current,
                score: elapsedTime,
                metadata: { movesCount, firstDiscoveries, newDiscoveries },
              }),
            },
            true // Include auth
          );
        } catch (err) {
          logger.error('[ElementSoup] Failed to submit to leaderboard', { error: err.message });
        }
      } else {
        logger.info('[ElementSoup] Skipping leaderboard submission - not first attempt');
      }
    }
  }, [
    isComplete,
    statsRecorded,
    user,
    isArchive,
    puzzle,
    elementBank,
    combinationPath,
    movesCount,
    elapsedTime,
    newDiscoveries,
    firstDiscoveries,
    isFirstAttempt,
  ]);

  /**
   * Handle game over (time ran out)
   */
  const handleGameOver = useCallback(() => {
    if (isGameOver || isComplete) return;

    logger.info('[ElementSoup] Game over - time ran out');

    setIsGameOver(true);
    setGameState(SOUP_GAME_STATES.GAME_OVER);

    // Mark this puzzle as attempted (so retries don't count for leaderboard)
    if (puzzleDateRef.current && !freePlayMode) {
      try {
        const attemptedKey = `${SOUP_STORAGE_KEYS.PUZZLE_ATTEMPTED}${puzzleDateRef.current}`;
        localStorage.setItem(attemptedKey, 'true');
        setIsFirstAttempt(false);
      } catch (err) {
        logger.error('[ElementSoup] Failed to save attempted marker', { error: err.message });
      }
    }

    // Play failure sound
    playFailureSound();

    // Generate game over message
    setCompletionStats({
      gameOverMessage: getRandomMessage(GAME_OVER_MESSAGES),
    });
  }, [isGameOver, isComplete, freePlayMode]);

  // Game over effect - triggers when time runs out in daily mode
  useEffect(() => {
    if (freePlayMode) return; // No game over in free play
    if (
      gameState === SOUP_GAME_STATES.PLAYING &&
      remainingTime === 0 &&
      !isComplete &&
      !isGameOver
    ) {
      handleGameOver();
    }
  }, [remainingTime, gameState, freePlayMode, isComplete, isGameOver, handleGameOver]);

  // Check for win condition (must be after handlePuzzleComplete is defined)
  // Skipped in free play mode - no win condition
  useEffect(() => {
    if (freePlayMode) return; // No win condition in free play
    if (puzzle && !isComplete && !isGameOver && gameState === SOUP_GAME_STATES.PLAYING) {
      const targetFound = elementBank.some(
        (el) => el.name.toLowerCase() === puzzle.targetElement.toLowerCase()
      );

      if (targetFound) {
        handlePuzzleComplete();
      }
    }
  }, [elementBank, puzzle, isComplete, isGameOver, gameState, handlePuzzleComplete, freePlayMode]);

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
    setIsGameOver(false); // Reset game over state
    setStatsRecorded(false);
    setCompletionStats(null);
    setHintsRemaining(4); // Reset hints
    setLastHintStep(null); // Clear hint step tracking
    setStartTime(Date.now());
    setElapsedTime(0);
    setRemainingTime(SOUP_CONFIG.TIME_LIMIT_SECONDS); // Reset countdown
    setIsPaused(false);
    pausedAtRef.current = null;
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
   * Prioritizes steps later in the solution path (closer to the target).
   * Within a step, prefers non-starter elements.
   * Only shows starter elements if that's all that's available.
   *
   * Consecutive hints: If player uses two hints in a row, the second hint
   * adds the other element from the same combination step.
   */
  const useHint = useCallback(() => {
    if (hintsRemaining <= 0 || !solutionPath || solutionPath.length === 0) return;
    if (freePlayMode || isComplete || isCombining || isAnimating) return;

    // Play the hint sound
    playHintSound();

    // Check if this is a consecutive hint (second hint for the same step)
    // We have a pending step if: lastHintStep exists, first element is selected,
    // and the result hasn't been discovered yet
    if (
      lastHintStep &&
      selectedA &&
      selectedA.name.toLowerCase() === lastHintStep.firstElement.toLowerCase() &&
      !discoveredElements.current.has(lastHintStep.step.result)
    ) {
      // Consecutive hint: add the second element to slot B
      const secondElement = elementBank.find(
        (el) => el.name.toLowerCase() === lastHintStep.secondElement.toLowerCase()
      );

      if (secondElement) {
        setSelectedB(secondElement);
        setLastHintStep(null); // Clear the hint step after both elements are selected
        setHintsRemaining((prev) => prev - 1);
        return;
      }
    }

    const starterNames = new Set(STARTER_ELEMENTS.map((s) => s.name));

    // Find all steps where the player hasn't discovered the result yet
    // but has both inputs available (can make progress)
    // Track the original index to prioritize steps closer to the target
    const availableSteps = solutionPath
      .map((step, index) => ({ ...step, pathIndex: index }))
      .filter((step) => {
        return (
          !discoveredElements.current.has(step.result) &&
          discoveredElements.current.has(step.elementA) &&
          discoveredElements.current.has(step.elementB)
        );
      });

    let elementToSelect = null;
    let stepForHint = null;
    let firstElementName = null;
    let secondElementName = null;

    if (availableSteps.length > 0) {
      // Prioritize steps later in the solution path (closer to target)
      // Then use starter count as a tiebreaker
      const sortedSteps = [...availableSteps].sort((a, b) => {
        // First: prefer later steps (higher index = closer to target)
        if (a.pathIndex !== b.pathIndex) {
          return b.pathIndex - a.pathIndex;
        }
        // Tiebreaker: fewer starters is better
        const aStarterCount =
          (starterNames.has(a.elementA) ? 1 : 0) + (starterNames.has(a.elementB) ? 1 : 0);
        const bStarterCount =
          (starterNames.has(b.elementA) ? 1 : 0) + (starterNames.has(b.elementB) ? 1 : 0);
        return aStarterCount - bStarterCount;
      });

      const bestStep = sortedSteps[0];
      stepForHint = bestStep;

      // Within the chosen step, prefer the non-starter element if one exists
      const elementAIsStarter = starterNames.has(bestStep.elementA);
      const elementBIsStarter = starterNames.has(bestStep.elementB);

      if (!elementAIsStarter && elementBIsStarter) {
        firstElementName = bestStep.elementA;
        secondElementName = bestStep.elementB;
      } else if (elementAIsStarter && !elementBIsStarter) {
        firstElementName = bestStep.elementB;
        secondElementName = bestStep.elementA;
      } else {
        // Both are starters or both are non-starters - just pick elementA first
        firstElementName = bestStep.elementA;
        secondElementName = bestStep.elementB;
      }

      elementToSelect = elementBank.find(
        (el) => el.name.toLowerCase() === firstElementName.toLowerCase()
      );
    } else {
      // No steps where player has both inputs - find the LAST step in the path
      // where the result isn't discovered (closest to target) and work backwards
      let targetStep = null;
      for (let i = solutionPath.length - 1; i >= 0; i--) {
        if (!discoveredElements.current.has(solutionPath[i].result)) {
          targetStep = solutionPath[i];
          break;
        }
      }

      if (targetStep) {
        // Find which input is missing and look for a step that creates it
        const needsA = !discoveredElements.current.has(targetStep.elementA);
        const needsB = !discoveredElements.current.has(targetStep.elementB);
        const neededElement = needsA ? targetStep.elementA : needsB ? targetStep.elementB : null;

        if (neededElement) {
          // Find an earlier step that creates the needed element
          const earlierStep = solutionPath.find((step) => {
            return (
              step.result.toLowerCase() === neededElement.toLowerCase() &&
              discoveredElements.current.has(step.elementA) &&
              discoveredElements.current.has(step.elementB)
            );
          });

          if (earlierStep) {
            stepForHint = earlierStep;
            // Prefer non-starter element from the earlier step
            const elementAIsStarter = starterNames.has(earlierStep.elementA);
            const elementBIsStarter = starterNames.has(earlierStep.elementB);

            if (!elementAIsStarter && elementBIsStarter) {
              firstElementName = earlierStep.elementA;
              secondElementName = earlierStep.elementB;
            } else if (elementAIsStarter && !elementBIsStarter) {
              firstElementName = earlierStep.elementB;
              secondElementName = earlierStep.elementA;
            } else {
              firstElementName = earlierStep.elementA;
              secondElementName = earlierStep.elementB;
            }

            elementToSelect = elementBank.find(
              (el) => el.name.toLowerCase() === firstElementName.toLowerCase()
            );
          }
        }
      }
    }

    if (elementToSelect && stepForHint) {
      // Store the hint step for potential consecutive hint
      setLastHintStep({
        step: stepForHint,
        firstElement: firstElementName,
        secondElement: secondElementName,
      });

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
    lastHintStep,
    selectedA,
  ]);

  /**
   * Memoized sorted and filtered element bank
   */
  const sortedElementBank = useMemo(() => {
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
    sortedElementBank,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,

    // Selection
    selectedA,
    selectedB,
    selectElement,
    selectResultElement,
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
    remainingTime,
    isPaused,
    pauseTimer,
    resumeTimer,
    formatTime,
    timeLimit: SOUP_CONFIG.TIME_LIMIT_SECONDS,

    // Stats
    movesCount,
    newDiscoveries,
    firstDiscoveries,
    firstDiscoveryElements,
    recentElements,

    // Completion
    isComplete,
    isGameOver,
    completionStats,
    getShareText,

    // Actions
    startGame,
    startFreePlay,
    loadPuzzle,
    resetGame,
    resumeGame,
    hasSavedProgress,

    // Creative Mode save
    saveCreativeMode,
    clearCreativeMode,
    isSavingCreative,
    creativeSaveSuccess,
    isLoadingCreative,

    // Creative Mode autosave
    isAutoSaving,
    autoSaveComplete,

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

export default useDailyAlchemyGame;
