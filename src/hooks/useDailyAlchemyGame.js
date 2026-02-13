'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import logger from '@/lib/logger';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import {
  playCombineSound,
  playCombineButtonSound,
  playFailureSound,
  playFirstDiscoverySound,
  playHintSound,
  playNewElementSound,
  playPlunkSound,
  playSoupStartSound,
  playSoupWinSound,
  playFavoriteAddSound,
  playFavoriteClearSound,
} from '@/lib/sounds';
import {
  SOUP_GAME_STATES,
  SOUP_API,
  SOUP_STORAGE_KEYS,
  SOUP_CONFIG,
  STARTER_ELEMENTS,
  SORT_OPTIONS,
  MAX_FAVORITES,
  formatTime,
  generateShareText,
  getRandomMessage,
  CONGRATS_MESSAGES,
  GAME_OVER_MESSAGES,
  HINT_PHRASES,
} from '@/lib/daily-alchemy.constants';
import { trackGameStart, trackGameComplete, GAME_TYPES } from '@/lib/gameAnalytics';
import {
  serializeSaveData,
  triggerFileDownload,
  generateSaveFileName,
  readFileAsText,
  parseSaveFile,
} from '@/lib/daily-alchemy-save-io';

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
 * Generate a unique element ID from a name.
 * Uses underscores for spaces to differentiate from hyphens in the original name.
 * This prevents ID collisions like "God Emperor" vs "God-Emperor".
 * @param {string} name - Element name
 * @returns {string} Unique ID
 */
function generateElementId(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
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
 * Get a random hint phrase with element name interpolated
 * @param {string} elementName - The element to hint about
 * @returns {string} Formatted hint message
 */
function getRandomHintPhrase(elementName) {
  const template = HINT_PHRASES[Math.floor(Math.random() * HINT_PHRASES.length)];
  return template.replace('{element}', elementName);
}

/**
 * Custom hook for Daily Alchemy game logic
 * @param {string|null} initialDate - Date for archive puzzles
 * @param {boolean} isFreePlay - If true, runs in free play mode (no target, no timer)
 */
export function useDailyAlchemyGame(initialDate = null, isFreePlay = false) {
  const {
    user,
    loading: authLoading,
    ensureAlchemySession,
    isAnonymous,
    markServiceUnavailable,
  } = useAuth();
  const { soupCombine, soupNewElement, soupFirstDiscovery } = useHaptics();

  // Core state
  const [gameState, setGameState] = useState(SOUP_GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(!isFreePlay); // No loading in free play
  const [error, setError] = useState(null);
  const [isArchive, setIsArchive] = useState(false);
  const [freePlayMode, setFreePlayMode] = useState(isFreePlay);
  const [coopMode, setCoopMode] = useState(false);

  // Element bank state
  const [elementBank, setElementBank] = useState([...STARTER_ELEMENTS]);
  const [sortOrder, setSortOrder] = useState(SORT_OPTIONS.NEWEST);
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites and usage tracking state
  // Favorites are now per-slot in creative mode, empty in daily mode
  const [favoriteElements, setFavoriteElements] = useState(new Set());
  const [elementUsageCount, setElementUsageCount] = useState(() => {
    // Load usage counts from localStorage on init
    try {
      const saved = localStorage.getItem(SOUP_STORAGE_KEYS.ELEMENT_USAGE);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showFavoritesPanel, setShowFavoritesPanel] = useState(false);

  // Selection state
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null); // 'first' | 'second' | null

  // Subtraction mode (Creative Mode only)
  const [isSubtractMode, setIsSubtractMode] = useState(false);

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
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHintMessage, setCurrentHintMessage] = useState(null);
  const [currentHintElement, setCurrentHintElement] = useState(null); // Track which element the hint is suggesting
  const [solutionPath, setSolutionPath] = useState([]);

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

  // Multi-slot Creative Mode state
  const [activeSaveSlot, setActiveSaveSlot] = useState(() => {
    try {
      const saved = localStorage.getItem(SOUP_STORAGE_KEYS.CREATIVE_ACTIVE_SLOT);
      const parsed = saved ? parseInt(saved, 10) : 1;
      return parsed >= 1 && parsed <= 3 ? parsed : 1;
    } catch {
      return 1;
    }
  });
  const [slotSummaries, setSlotSummaries] = useState([]); // For SavesModal display
  const [isSlotSwitching, setIsSlotSwitching] = useState(false); // Loading state for slot switches

  // Track user ID to detect account switches
  const previousUserIdRef = useRef(user?.id);

  // Saved progress state - tracks if there's a game in progress to resume
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const pendingSavedState = useRef(null);

  // First attempt tracking - only first successful attempt counts for leaderboard
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);

  // Refs for tracking
  const discoveredElements = useRef(new Set(['Earth', 'Water', 'Fire', 'Wind']));
  const madeCombinations = useRef(new Set()); // Track combinations to avoid counting duplicates
  const puzzleDateRef = useRef(null);

  // Refs for selection state (allows stable callback for memoized components)
  const selectedARef = useRef(selectedA);
  const selectedBRef = useRef(selectedB);
  const activeSlotRef = useRef(activeSlot);
  selectedARef.current = selectedA;
  selectedBRef.current = selectedB;
  activeSlotRef.current = activeSlot;

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
      // Skip reset when transitioning from no session to anonymous session
      // (anonymous session created during gameplay via ensureAlchemySession)
      const isAnonymousSignIn = !previousUserId && user?.is_anonymous === true;
      if (isAnonymousSignIn) {
        previousUserIdRef.current = currentUserId;
        return;
      }

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
      madeCombinations.current = new Set();

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

      // Reset multi-slot state
      setActiveSaveSlot(1);
      setSlotSummaries([]);
      setIsSlotSwitching(false);
      try {
        localStorage.removeItem(SOUP_STORAGE_KEYS.CREATIVE_ACTIVE_SLOT);
      } catch {
        // Ignore localStorage errors
      }

      // Reset selections
      setSelectedA(null);
      setSelectedB(null);
      setLastResult(null);

      // Update the ref to track new user
      previousUserIdRef.current = currentUserId;
    }
  }, [user?.id, user?.is_anonymous, freePlayMode]);

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
          if (response.status >= 500) {
            markServiceUnavailable();
          }
          setError(
            "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
          );
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success || !data.puzzle) {
          setError(
            "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
          );
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
              id: generateElementId(name),
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
          madeCombinations.current = new Set();
          setCombinationPath([]);
          setMovesCount(0);
          setNewDiscoveries(0);
          setFirstDiscoveries(0);
          setFirstDiscoveryElements([]);
          setHintsUsed(0); // Reset hints for fresh start
          setCurrentHintMessage(null);
          setCurrentHintElement(null);
          setGameState(SOUP_GAME_STATES.WELCOME);
        }

        setLoading(false);
      } catch (err) {
        logger.error('[ElementSoup] Failed to load puzzle', { error: err.message });
        if (err.name === 'AbortError' || err.status >= 500) {
          markServiceUnavailable();
        }
        setError(
          "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
        );
        setLoading(false);
      }
    },
    [user, markServiceUnavailable]
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
        id: generateElementId(name),
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
    if (typeof savedState.hintsUsed === 'number') {
      setHintsUsed(savedState.hintsUsed);
    }
    // Clear any hint message on restore (player will request new hint if needed)
    setCurrentHintMessage(null);
    setCurrentHintElement(null);

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
        hintsUsed,
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
    hintsUsed,
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

    // Track game start
    trackGameStart(GAME_TYPES.ALCHEMY, puzzle?.number, puzzleDateRef.current);

    // Reset to daily puzzle mode (not Creative Mode)
    setFreePlayMode(false);
    setIsSubtractMode(false);

    // Clear favorites for daily mode (favorites are per creative-mode slot only)
    setFavoriteElements(new Set());

    // Reset element bank to starter elements for daily puzzle
    setElementBank([...STARTER_ELEMENTS]);
    discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
    madeCombinations.current = new Set();

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
    setHintsUsed(0);
    setCurrentHintMessage(null);
    setCurrentHintElement(null);

    // Start timer for daily puzzle
    setStartTime(Date.now());
    setElapsedTime(0);
    setRemainingTime(SOUP_CONFIG.TIME_LIMIT_SECONDS);
    setIsPaused(false);
    pausedAtRef.current = null;

    setGameState(SOUP_GAME_STATES.PLAYING);
    setHasStarted(true);
  }, [puzzle?.number]);

  /**
   * Load Creative Mode save from Supabase
   * Returns the save data if exists, null otherwise
   */
  const loadCreativeSave = useCallback(
    async (slot) => {
      if (!user) return null;
      const slotToLoad = slot ?? activeSaveSlot;

      setIsLoadingCreative(true);
      try {
        const url = getApiUrl(`${SOUP_API.CREATIVE_SAVE}?slot=${slotToLoad}`);
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
    },
    [user, activeSaveSlot]
  );

  /**
   * Load all slot summaries (lightweight, for SavesModal display)
   */
  const loadSlotSummaries = useCallback(async () => {
    if (!user) return [];
    try {
      const url = getApiUrl(SOUP_API.CREATIVE_SAVES);
      const response = await capacitorFetch(url, {}, true);
      if (!response.ok) return [];
      const data = await response.json();
      if (data.success) {
        setSlotSummaries(data.saves);
        return data.saves;
      }
      return [];
    } catch (err) {
      logger.error('[DailyAlchemy] Failed to load slot summaries', { error: err.message });
      return [];
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

    // Try to load existing save for the active slot
    const savedGame = await loadCreativeSave(activeSaveSlot);

    if (savedGame && savedGame.elementBank && savedGame.elementBank.length > 0) {
      // Restore from save
      logger.info('[DailyAlchemy] Restoring Creative Mode save', {
        elementCount: savedGame.elementBank.length,
        slot: activeSaveSlot,
      });

      const restoredBank = savedGame.elementBank.map((el) => ({
        id: generateElementId(el.name),
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
      madeCombinations.current = new Set();
      setMovesCount(0);
      setNewDiscoveries(0);
      setFirstDiscoveries(0);
      setFirstDiscoveryElements([]);
    }

    setCombinationPath([]);
    madeCombinations.current = new Set(); // Also reset for restored games
    setRecentElements([]);

    // Load favorites: prefer server data, fallback to localStorage
    if (savedGame?.favorites?.length > 0) {
      setFavoriteElements(new Set(savedGame.favorites));
    } else {
      // Fallback to localStorage (migration path / unauthenticated users)
      try {
        const favKey = `${SOUP_STORAGE_KEYS.FAVORITE_ELEMENTS}_slot_${activeSaveSlot}`;
        const savedFavs = localStorage.getItem(favKey);
        if (savedFavs) {
          setFavoriteElements(new Set(JSON.parse(savedFavs)));
        } else {
          setFavoriteElements(new Set());
        }
      } catch {
        setFavoriteElements(new Set());
      }
    }

    setGameState(SOUP_GAME_STATES.PLAYING);

    // Mark load as complete - autosave is now safe to run
    setCreativeLoadComplete(true);
  }, [loadCreativeSave, activeSaveSlot]);

  /**
   * Start co-op mode with a given element bank
   * Called when joining or creating a co-op session
   */
  const startCoopMode = useCallback(
    (initialElementBank = null, initialFavorites = null) => {
      playSoupStartSound();

      // Disable creative mode autosave
      setCreativeLoadComplete(false);

      setFreePlayMode(true);
      setCoopMode(true);
      setIsComplete(false);
      setHasStarted(true);
      setSelectedA(null);
      setSelectedB(null);
      setLastResult(null);
      setStartTime(null);
      setElapsedTime(0);

      if (initialElementBank && initialElementBank.length > 0) {
        // Restore from provided element bank (from session or save)
        const restoredBank = initialElementBank.map((el) => ({
          id: generateElementId(el.name),
          name: el.name,
          emoji: el.emoji || '✨',
          isStarter: STARTER_ELEMENTS.some((s) => s.name === el.name),
          fromPartner: !!el.fromPartner,
        }));

        setElementBank(restoredBank);
        discoveredElements.current = new Set(restoredBank.map((el) => el.name));
        setMovesCount(0);
        setNewDiscoveries(restoredBank.filter((el) => !el.isStarter).length);
        setFirstDiscoveries(0);
        setFirstDiscoveryElements([]);
      } else {
        // Fresh start with 4 starter elements
        setElementBank([...STARTER_ELEMENTS]);
        discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
        setMovesCount(0);
        setNewDiscoveries(0);
        setFirstDiscoveries(0);
        setFirstDiscoveryElements([]);
      }

      setCombinationPath([]);
      madeCombinations.current = new Set();
      setRecentElements([]);

      // Load favorites: prefer provided data (from save slot), fallback to localStorage
      if (Array.isArray(initialFavorites) && initialFavorites.length > 0) {
        setFavoriteElements(new Set(initialFavorites));
      } else {
        try {
          const favKey = `${SOUP_STORAGE_KEYS.FAVORITE_ELEMENTS}_coop`;
          const savedFavs = localStorage.getItem(favKey);
          if (savedFavs) {
            setFavoriteElements(new Set(JSON.parse(savedFavs)));
          } else {
            setFavoriteElements(new Set());
          }
        } catch {
          setFavoriteElements(new Set());
        }
      }

      setGameState(SOUP_GAME_STATES.PLAYING);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * Add an element received from a co-op partner
   * Does NOT count as the local player's discovery for first-discovery tracking
   */
  const addPartnerElement = useCallback((element) => {
    const { name, emoji } = element;

    // Skip if already discovered
    if (discoveredElements.current.has(name)) return;

    discoveredElements.current.add(name);

    const newElement = {
      id: generateElementId(name),
      name,
      emoji: emoji || '✨',
      isStarter: false,
      isNew: true,
      fromPartner: true,
    };

    setElementBank((prev) => [newElement, ...prev]);
    setNewDiscoveries((prev) => prev + 1);
    setRecentElements((prev) => [name, ...prev].slice(0, 3));
  }, []);

  /**
   * Save Creative Mode progress to Supabase
   */
  const saveCreativeMode = useCallback(
    async (slot) => {
      if (!user || !freePlayMode) {
        return false;
      }
      const slotToSave = slot ?? activeSaveSlot;

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
              slotNumber: slotToSave,
              elementBank: elementBank.map((el) => ({
                name: el.name,
                emoji: el.emoji,
                isStarter: el.isStarter || false,
              })),
              totalMoves: movesCount,
              totalDiscoveries: newDiscoveries,
              firstDiscoveries,
              firstDiscoveryElements,
              favorites: [...favoriteElements],
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
          slot: slotToSave,
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
    },
    [
      user,
      freePlayMode,
      activeSaveSlot,
      elementBank,
      movesCount,
      newDiscoveries,
      firstDiscoveries,
      firstDiscoveryElements,
      favoriteElements,
    ]
  );

  /**
   * Clear Creative Mode save and reset to starter elements
   */
  const clearCreativeMode = useCallback(
    async (slot) => {
      if (!user) return false;
      const slotToClear = slot ?? activeSaveSlot;

      try {
        const url = getApiUrl(`${SOUP_API.CREATIVE_SAVE}?slot=${slotToClear}`);
        const response = await capacitorFetch(url, { method: 'DELETE' }, true);

        if (!response.ok) {
          logger.error('[DailyAlchemy] Failed to clear creative save');
          return false;
        }

        logger.info('[DailyAlchemy] Creative Mode save cleared', { slot: slotToClear });

        // Clear slot-specific favorites from localStorage
        try {
          localStorage.removeItem(`${SOUP_STORAGE_KEYS.FAVORITE_ELEMENTS}_slot_${slotToClear}`);
        } catch {
          // Ignore localStorage errors
        }

        // Only reset in-memory state if clearing the active slot
        if (slotToClear === activeSaveSlot) {
          setElementBank([...STARTER_ELEMENTS]);
          discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
          madeCombinations.current = new Set();
          setCombinationPath([]);
          setMovesCount(0);
          setNewDiscoveries(0);
          setFirstDiscoveries(0);
          setFirstDiscoveryElements([]);
          setRecentElements([]);
          setSelectedA(null);
          setSelectedB(null);
          setLastResult(null);
          setFavoriteElements(new Set());

          // Reset autosave tracking refs to match cleared state
          lastAutoSaveDiscoveryCount.current = 0;
          lastAutoSaveFirstDiscoveryCount.current = 0;
        }

        return true;
      } catch (err) {
        logger.error('[DailyAlchemy] Failed to clear creative save', { error: err.message });
        return false;
      }
    },
    [user, activeSaveSlot]
  );

  /**
   * Switch to a different save slot
   * Auto-saves current slot, loads the new slot, updates active slot
   */
  const switchSlot = useCallback(
    async (newSlotNumber) => {
      if (!user || newSlotNumber === activeSaveSlot || isSlotSwitching) return;

      setIsSlotSwitching(true);
      setCreativeLoadComplete(false); // Prevent autosave during switch

      try {
        // 1. Auto-save current slot (favorites included via saveCreativeMode)
        await saveCreativeMode(activeSaveSlot);

        // 2. Reset autosave tracking
        lastAutoSaveDiscoveryCount.current = 0;
        lastAutoSaveFirstDiscoveryCount.current = 0;

        // 3. Load new slot
        const savedGame = await loadCreativeSave(newSlotNumber);

        // 4. Restore or start fresh
        if (savedGame && savedGame.elementBank && savedGame.elementBank.length > 0) {
          const restoredBank = savedGame.elementBank.map((el) => ({
            id: generateElementId(el.name),
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
          lastAutoSaveDiscoveryCount.current = savedGame.totalDiscoveries || 0;
          lastAutoSaveFirstDiscoveryCount.current = savedGame.firstDiscoveries || 0;
        } else {
          setElementBank([...STARTER_ELEMENTS]);
          discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
          madeCombinations.current = new Set();
          setMovesCount(0);
          setNewDiscoveries(0);
          setFirstDiscoveries(0);
          setFirstDiscoveryElements([]);
        }

        // 5. Clear selections and results
        setCombinationPath([]);
        madeCombinations.current = new Set();
        setRecentElements([]);
        setSelectedA(null);
        setSelectedB(null);
        setLastResult(null);

        // 6. Load favorites: prefer server data, fallback to localStorage
        if (savedGame?.favorites?.length > 0) {
          setFavoriteElements(new Set(savedGame.favorites));
        } else {
          try {
            const newFavKey = `${SOUP_STORAGE_KEYS.FAVORITE_ELEMENTS}_slot_${newSlotNumber}`;
            const savedFavs = localStorage.getItem(newFavKey);
            setFavoriteElements(savedFavs ? new Set(JSON.parse(savedFavs)) : new Set());
          } catch {
            setFavoriteElements(new Set());
          }
        }

        // 7. Update active slot
        setActiveSaveSlot(newSlotNumber);
        try {
          localStorage.setItem(SOUP_STORAGE_KEYS.CREATIVE_ACTIVE_SLOT, String(newSlotNumber));
        } catch {
          // Ignore localStorage errors
        }

        // 8. Mark load complete
        setCreativeLoadComplete(true);
      } catch (err) {
        logger.error('[DailyAlchemy] Failed to switch slot', { error: err.message });
        setCreativeLoadComplete(true); // Re-enable autosave even on failure
      } finally {
        setIsSlotSwitching(false);
      }
    },
    [user, activeSaveSlot, isSlotSwitching, saveCreativeMode, loadCreativeSave]
  );

  /**
   * Rename a save slot
   */
  const renameSlot = useCallback(
    async (slotNumber, newName) => {
      if (!user) return false;
      try {
        const url = getApiUrl(SOUP_API.CREATIVE_SAVE);
        const response = await capacitorFetch(
          url,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slotNumber, name: newName }),
          },
          true
        );

        if (!response.ok) return false;

        // Update slotSummaries locally to avoid refetch
        setSlotSummaries((prev) =>
          prev.map((s) => (s.slot === slotNumber ? { ...s, name: newName } : s))
        );
        return true;
      } catch (err) {
        logger.error('[DailyAlchemy] Failed to rename slot', { error: err.message });
        return false;
      }
    },
    [user]
  );

  /**
   * Clear a specific save slot (wraps clearCreativeMode with summary updates)
   */
  const clearSlot = useCallback(
    async (slotNumber) => {
      const success = await clearCreativeMode(slotNumber);
      if (success) {
        setSlotSummaries((prev) =>
          prev.map((s) =>
            s.slot === slotNumber ? { slot: slotNumber, name: null, hasSave: false } : s
          )
        );
      }
      return success;
    },
    [clearCreativeMode]
  );

  /**
   * Export a save slot as a downloadable .da file
   */
  const exportSlot = useCallback(
    async (slotNumber) => {
      try {
        const saveData = await loadCreativeSave(slotNumber);
        if (!saveData) {
          return { success: false, error: 'No save data found for this slot.' };
        }

        const slotSummary = slotSummaries.find((s) => s.slot === slotNumber);
        const slotName = slotSummary?.name || `Save ${slotNumber}`;

        const exportData = serializeSaveData({ ...saveData, slotName });
        const jsonString = JSON.stringify(exportData, null, 2);
        const fileName = generateSaveFileName(slotName);
        triggerFileDownload(jsonString, fileName);

        logger.info('[DailyAlchemy] Save exported', {
          slot: slotNumber,
          elementCount: saveData.elementBank?.length,
        });

        return { success: true };
      } catch (err) {
        logger.error('[DailyAlchemy] Export failed', { error: err.message });
        return { success: false, error: 'Failed to export save.' };
      }
    },
    [loadCreativeSave, slotSummaries]
  );

  /**
   * Import a .da file into a save slot
   */
  const importSlot = useCallback(
    async (slotNumber, file) => {
      if (!user) return { success: false, error: 'Not signed in.' };

      try {
        const text = await readFileAsText(file);
        const { success, data, error } = parseSaveFile(text);
        if (!success) {
          return { success: false, error };
        }

        const { save } = data;

        // Write to slot via existing save endpoint
        const url = getApiUrl(SOUP_API.CREATIVE_SAVE);
        const response = await capacitorFetch(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slotNumber,
              elementBank: save.elementBank,
              totalMoves: save.totalMoves || 0,
              totalDiscoveries: save.totalDiscoveries || 0,
              firstDiscoveries: save.firstDiscoveries || 0,
              firstDiscoveryElements: save.firstDiscoveryElements || [],
              favorites: save.favorites || [],
            }),
          },
          true
        );

        if (!response.ok) {
          return { success: false, error: 'Failed to save imported data.' };
        }

        // Apply slot name if present
        if (save.slotName) {
          await capacitorFetch(
            url,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slotNumber, name: save.slotName }),
            },
            true
          );
        }

        // Refresh summaries
        await loadSlotSummaries();

        // Hot-reload if this is the active playing slot
        if (slotNumber === activeSaveSlot && freePlayMode) {
          const savedGame = await loadCreativeSave(slotNumber);
          if (savedGame && savedGame.elementBank?.length > 0) {
            const restoredBank = savedGame.elementBank.map((el) => ({
              id: generateElementId(el.name),
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
            lastAutoSaveDiscoveryCount.current = savedGame.totalDiscoveries || 0;
            lastAutoSaveFirstDiscoveryCount.current = savedGame.firstDiscoveries || 0;
            // Restore favorites from server
            setFavoriteElements(
              savedGame.favorites?.length > 0 ? new Set(savedGame.favorites) : new Set()
            );
          }
        }

        logger.info('[DailyAlchemy] Save imported', {
          slot: slotNumber,
          elementCount: save.elementBank.length,
        });

        return { success: true };
      } catch (err) {
        logger.error('[DailyAlchemy] Import failed', { error: err.message });
        return { success: false, error: 'Failed to import save file.' };
      }
    },
    [user, activeSaveSlot, freePlayMode, loadCreativeSave, loadSlotSummaries]
  );

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
                slotNumber: activeSaveSlot,
                elementBank: elementBank.map((el) => ({
                  name: el.name,
                  emoji: el.emoji,
                  isStarter: el.isStarter || false,
                })),
                totalMoves: movesCount,
                totalDiscoveries: newDiscoveries,
                firstDiscoveries,
                firstDiscoveryElements,
                favorites: [...favoriteElements],
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
    favoriteElements,
    activeSaveSlot,
  ]);

  // Persist favorites to localStorage (local cache / fallback for unauthenticated users)
  useEffect(() => {
    if (!freePlayMode) return; // Don't persist favorites in daily mode
    try {
      const key = coopMode
        ? `${SOUP_STORAGE_KEYS.FAVORITE_ELEMENTS}_coop`
        : `${SOUP_STORAGE_KEYS.FAVORITE_ELEMENTS}_slot_${activeSaveSlot}`;
      localStorage.setItem(key, JSON.stringify([...favoriteElements]));
    } catch (err) {
      logger.error('[DailyAlchemy] Failed to save favorites', { error: err.message });
    }
  }, [favoriteElements, freePlayMode, coopMode, activeSaveSlot]);

  // Persist usage counts to localStorage (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(SOUP_STORAGE_KEYS.ELEMENT_USAGE, JSON.stringify(elementUsageCount));
      } catch (err) {
        logger.error('[DailyAlchemy] Failed to save usage counts', { error: err.message });
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeout);
  }, [elementUsageCount]);

  /**
   * Toggle favorite status for an element
   * @param {string} elementName - Name of the element to toggle
   * @returns {boolean} - New favorite status
   */
  const toggleFavorite = useCallback((elementName) => {
    setFavoriteElements((prev) => {
      const next = new Set(prev);
      if (next.has(elementName)) {
        next.delete(elementName);
        return next;
      } else if (next.size < MAX_FAVORITES) {
        next.add(elementName);
        // Play pop sound when adding a favorite
        playFavoriteAddSound();
        return next;
      }
      // At max capacity, don't add
      return prev;
    });
  }, []);

  /**
   * Check if an element is a favorite
   * @param {string} elementName - Name of the element
   * @returns {boolean}
   */
  const isFavorite = useCallback(
    (elementName) => {
      return favoriteElements.has(elementName);
    },
    [favoriteElements]
  );

  /**
   * Clear all favorites
   */
  const clearAllFavorites = useCallback(() => {
    // Only play sound if there are favorites to clear
    setFavoriteElements((prev) => {
      if (prev.size > 0) {
        playFavoriteClearSound();
      }
      return new Set();
    });
  }, []);

  /**
   * Select an element from the bank
   * Uses refs to read current selection state, allowing a stable callback
   * that works with memoized ElementChip components.
   * Respects activeSlot to fill the targeted slot.
   */
  const selectElement = useCallback((element) => {
    // Play plunk sound when selecting an element
    playPlunkSound();

    // Read current values from refs (not stale closure values)
    const currentA = selectedARef.current;
    const currentB = selectedBRef.current;
    const active = activeSlotRef.current;

    if (active === 'first') {
      setSelectedA(element);
      // If B is empty, auto-move focus to B; otherwise stay on first for continued replacement
      if (!currentB) {
        setActiveSlot('second');
      }
    } else if (active === 'second') {
      setSelectedB(element);
      // If A is empty, auto-move focus to A; otherwise stay on second for continued replacement
      if (!currentA) {
        setActiveSlot('first');
      }
    } else {
      // No active slot - fill first empty
      if (!currentA) {
        setSelectedA(element);
        setActiveSlot('second'); // next click fills B
      } else if (!currentB) {
        setSelectedB(element);
        // Both full now, keep activeSlot as 'second' for continued replacement
        setActiveSlot('second');
      } else {
        // Both full, no active slot set - replace B (legacy behavior)
        setSelectedB(element);
        setActiveSlot('second');
      }
    }
  }, []);

  /**
   * Clear selections
   */
  const clearSelections = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
    setActiveSlot(null);
  }, []);

  /**
   * Select a result element into the first slot (called when user swipes up the result popup)
   */
  const selectResultElement = useCallback((element) => {
    const elementToSelect = {
      id: generateElementId(element.name),
      name: element.name,
      emoji: element.emoji,
      isStarter: false,
    };

    setSelectedA(elementToSelect);
    setSelectedB(null);
    setActiveSlot('second'); // Focus second slot so next element fills B
  }, []);

  /**
   * Toggle between combine and subtract mode (Creative Mode only)
   */
  const toggleOperatorMode = useCallback(() => {
    setIsSubtractMode((prev) => !prev);
  }, []);

  /**
   * Combine (or subtract) the selected elements
   */
  const combineElements = useCallback(async () => {
    if (!selectedA || !selectedB || isCombining || isAnimating) return;

    playCombineButtonSound();
    setIsCombining(true);
    // Don't clear lastResult here - let AnimatePresence handle transitions smoothly

    const ANIMATION_DURATION = 600; // ms - wiggle + bang animation

    // Ensure we have a userId for first discovery credit.
    // Creates an anonymous Supabase session if the user is not logged in.
    let currentUserId = user?.id || null;
    if (!currentUserId && ensureAlchemySession) {
      const anonUser = await ensureAlchemySession();
      currentUserId = anonUser?.id || null;
      if (!currentUserId) {
        logger.error('[DailyAlchemy] ensureAlchemySession returned no userId');
      }
    }
    const currentMode = isSubtractMode ? 'subtract' : 'combine';

    try {
      const url = getApiUrl(SOUP_API.COMBINE);
      const response = await capacitorFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elementA: selectedA.name,
          elementB: selectedB.name,
          userId: currentUserId,
          mode: currentMode,
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

      // IMPORTANT: Add to discoveredElements immediately to prevent race conditions
      // where multiple concurrent API calls could all pass the isNew check
      if (isNew) {
        discoveredElements.current.add(element);
      }

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

      // Create a normalized combination key
      // For combine: sort alphabetically so A+B == B+A
      // For subtract: order matters so A-B !== B-A
      const comboKey =
        currentMode === 'subtract'
          ? `${selectedA.name.toLowerCase()}-${selectedB.name.toLowerCase()}`
          : [selectedA.name.toLowerCase(), selectedB.name.toLowerCase()].sort().join('+');
      const isFirstTimeCombination = !madeCombinations.current.has(comboKey);

      // Only count moves for first-time combinations (duplicates don't count against par)
      if (isFirstTimeCombination) {
        madeCombinations.current.add(comboKey);
        setMovesCount((prev) => prev + 1);
      }

      // Track element usage for "Most Used" sorting
      setElementUsageCount((prev) => ({
        ...prev,
        [selectedA.name]: (prev[selectedA.name] || 0) + 1,
        [selectedB.name]: (prev[selectedB.name] || 0) + 1,
      }));

      // Add to combination path
      setCombinationPath((prev) => [
        ...prev,
        {
          step: prev.length + 1,
          elementA: selectedA.name,
          elementB: selectedB.name,
          result: element,
          isDuplicate: !isFirstTimeCombination,
          operator: currentMode === 'subtract' ? '-' : '+',
        },
      ]);

      // Handle new element discovery
      if (isNew) {
        setNewDiscoveries((prev) => prev + 1);

        // Add to element bank
        const newElement = {
          id: generateElementId(element),
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
        id: Date.now(),
        element,
        emoji,
        isNew,
        isFirstDiscovery,
        from: [selectedA.name, selectedB.name],
        fromEmojis: [selectedA.emoji, selectedB.emoji],
        operator: currentMode === 'subtract' ? '-' : '+',
      });

      // Clear both selection slots after combination
      setSelectedA(null);
      setSelectedB(null);
      setActiveSlot(null);

      // Only clear hint message if the user created the hinted element
      if (currentHintElement && element.toLowerCase() === currentHintElement.toLowerCase()) {
        setCurrentHintMessage(null);
        setCurrentHintElement(null);
      }
    } catch (err) {
      logger.error('[ElementSoup] Failed to combine elements', { error: err.message });
      // Show inline error instead of global error screen
      const errorMsg = isSubtractMode
        ? "Hmm, couldn't figure out that subtraction. Try a different pair!"
        : "Hmm, couldn't find a combination. Try a different pair!";
      setCombinationError(errorMsg);
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
    isSubtractMode,
    user,
    authLoading,
    ensureAlchemySession,
    clearSelections,
    soupCombine,
    soupNewElement,
    soupFirstDiscovery,
    currentHintElement,
  ]);

  /**
   * Handle puzzle completion
   */
  const handlePuzzleComplete = useCallback(async () => {
    if (isComplete || statsRecorded) return;

    logger.info('[ElementSoup] Puzzle completed!');

    // Play victory sound
    playSoupWinSound();

    // Track game completion for analytics
    trackGameComplete({
      gameType: GAME_TYPES.ALCHEMY,
      puzzleNumber: puzzle?.number,
      puzzleDate: puzzleDateRef.current,
      won: true,
      timeSeconds: elapsedTime,
      mistakes: 0,
      score: movesCount,
    });

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

          // Save stats to localStorage for unified stats display
          try {
            const statsToSave = {
              totalCompleted: data.stats.totalCompleted || 0,
              currentStreak: data.stats.currentStreak || 0,
              longestStreak: data.stats.longestStreak || 0,
              averageTime: data.stats.averageTime || 0,
              bestTime: data.stats.bestTime || 0,
              totalMoves: data.stats.totalMoves || 0,
              totalDiscoveries: data.stats.totalDiscoveries || 0,
              firstDiscoveries: data.stats.totalFirstDiscoveries || 0,
              underPar: data.stats.underPar || 0,
              atPar: data.stats.atPar || 0,
              overPar: data.stats.overPar || 0,
              lastPlayedDate: puzzleDateRef.current,
            };
            localStorage.setItem(SOUP_STORAGE_KEYS.STATS, JSON.stringify(statsToSave));

            // Check for achievement unlocks (fire-and-forget)
            import('@/lib/achievementNotifier')
              .then(({ checkAndNotifyAlchemyAchievements }) => {
                checkAndNotifyAlchemyAchievements({
                  longestStreak: statsToSave.longestStreak,
                  totalCompleted: statsToSave.totalCompleted,
                  firstDiscoveries: statsToSave.firstDiscoveries,
                }).catch((achErr) => {
                  logger.error('[ElementSoup] Failed to check achievements', {
                    error: achErr.message,
                  });
                });
              })
              .catch((importErr) => {
                logger.error('[ElementSoup] Failed to import achievement notifier', {
                  error: importErr.message,
                });
              });
          } catch (storageErr) {
            logger.error('[ElementSoup] Failed to save stats to localStorage', {
              error: storageErr.message,
            });
          }
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
                metadata: {
                  movesCount,
                  firstDiscoveries,
                  newDiscoveries,
                  hintsUsed,
                },
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
    hintsUsed,
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
      hintsUsed,
    });
  }, [puzzle, isComplete, elapsedTime, movesCount, firstDiscoveries, hintsUsed]);

  /**
   * Reset game (for same puzzle)
   */
  const resetGame = useCallback(() => {
    setElementBank([...STARTER_ELEMENTS]);
    discoveredElements.current = new Set(['Earth', 'Water', 'Fire', 'Wind']);
    madeCombinations.current = new Set();
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
    setHintsUsed(0); // Reset hints
    setCurrentHintMessage(null);
    setCurrentHintElement(null);
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
   * Use a hint - displays a message about which element to create next.
   * Uses the same smart algorithm to determine WHICH step to hint about,
   * but shows a message instead of auto-selecting elements.
   *
   * Prioritizes steps later in the solution path (closer to the target).
   * Within a step, prefers non-starter elements.
   */
  const useHint = useCallback(() => {
    if (!solutionPath || solutionPath.length === 0) return;
    if (freePlayMode || isComplete || isCombining || isAnimating) return;

    // Play the hint sound
    playHintSound();

    const starterNames = new Set(STARTER_ELEMENTS.map((s) => s.name.toLowerCase()));

    // Create lowercase set for case-insensitive comparison
    const discoveredLower = new Set(
      Array.from(discoveredElements.current).map((e) => e.toLowerCase())
    );

    // Find all steps where the player hasn't discovered the result yet
    // but has both inputs available (can make progress)
    const availableSteps = solutionPath
      .map((step, index) => ({ ...step, pathIndex: index }))
      .filter((step) => {
        return (
          !discoveredLower.has(step.result.toLowerCase()) &&
          discoveredLower.has(step.elementA.toLowerCase()) &&
          discoveredLower.has(step.elementB.toLowerCase())
        );
      });

    let hintElementName = null;

    if (availableSteps.length > 0) {
      // Prioritize steps later in the solution path (closer to target)
      const sortedSteps = [...availableSteps].sort((a, b) => {
        if (a.pathIndex !== b.pathIndex) {
          return b.pathIndex - a.pathIndex;
        }
        // Tiebreaker: fewer starters is better
        const aStarterCount =
          (starterNames.has(a.elementA.toLowerCase()) ? 1 : 0) +
          (starterNames.has(a.elementB.toLowerCase()) ? 1 : 0);
        const bStarterCount =
          (starterNames.has(b.elementA.toLowerCase()) ? 1 : 0) +
          (starterNames.has(b.elementB.toLowerCase()) ? 1 : 0);
        return aStarterCount - bStarterCount;
      });

      hintElementName = sortedSteps[0].result;
    } else {
      // No steps where player has both inputs - find the LAST step in the path
      // where the result isn't discovered (closest to target) and work backwards
      let targetStep = null;
      for (let i = solutionPath.length - 1; i >= 0; i--) {
        if (!discoveredLower.has(solutionPath[i].result.toLowerCase())) {
          targetStep = solutionPath[i];
          break;
        }
      }

      if (targetStep) {
        // Find which input is missing and look for a step that creates it
        const needsA = !discoveredLower.has(targetStep.elementA.toLowerCase());
        const needsB = !discoveredLower.has(targetStep.elementB.toLowerCase());
        const neededElement = needsA ? targetStep.elementA : needsB ? targetStep.elementB : null;

        if (neededElement) {
          // Find an earlier step that creates the needed element
          const earlierStep = solutionPath.find((step) => {
            return (
              step.result.toLowerCase() === neededElement.toLowerCase() &&
              discoveredLower.has(step.elementA.toLowerCase()) &&
              discoveredLower.has(step.elementB.toLowerCase())
            );
          });

          if (earlierStep) {
            hintElementName = earlierStep.result;
          }
        }
      }
    }

    // Set the hint message with a random phrase and track the hinted element
    if (hintElementName) {
      setCurrentHintMessage(getRandomHintPhrase(hintElementName));
      setCurrentHintElement(hintElementName); // Track which element we're hinting about
    }

    // Increment hints used counter
    setHintsUsed((prev) => prev + 1);
  }, [solutionPath, freePlayMode, isComplete, isCombining, isAnimating]);

  /**
   * Clear the current hint message and tracked hint element
   */
  const clearHintMessage = useCallback(() => {
    setCurrentHintMessage(null);
    setCurrentHintElement(null);
  }, []);

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
    } else if (sortOrder === SORT_OPTIONS.MOST_USED) {
      // Sort by usage count (most used first), then alphabetically as tiebreaker
      sorted.sort((a, b) => {
        const usageA = elementUsageCount[a.name] || 0;
        const usageB = elementUsageCount[b.name] || 0;
        if (usageA !== usageB) return usageB - usageA; // Higher usage first
        return a.name.localeCompare(b.name);
      });
    }
    // NEWEST is default order (newest first, which is how we add them)

    return sorted;
  }, [elementBank, searchQuery, sortOrder, firstDiscoveryElements, elementUsageCount]);

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
    activeSlot,
    setActiveSlot,

    // Operator mode
    isSubtractMode,
    toggleOperatorMode,

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

    // Multi-slot Creative Mode
    activeSaveSlot,
    slotSummaries,
    loadSlotSummaries,
    switchSlot,
    renameSlot,
    clearSlot,
    exportSlot,
    importSlot,
    isSlotSwitching,

    // Hints
    hintsUsed,
    useHint,
    currentHintMessage,
    clearHintMessage,

    // Solution path (for reveal on game over)
    solutionPath,

    // Mode
    freePlayMode,
    coopMode,
    startCoopMode,
    addPartnerElement,

    // Favorites
    favoriteElements,
    toggleFavorite,
    clearAllFavorites,
    isFavorite,
    showFavoritesPanel,
    setShowFavoritesPanel,
    maxFavorites: MAX_FAVORITES,

    // Usage tracking
    elementUsageCount,

    // Auth
    isAnonymous,

    // Helpers
    puzzleDate: puzzleDateRef.current,
    formattedDate: puzzleDateRef.current ? getFormattedDate(puzzleDateRef.current) : '',
    targetElement: puzzle?.targetElement,
    targetEmoji: puzzle?.targetEmoji,
    parMoves: puzzle?.parMoves,
  };
}

export default useDailyAlchemyGame;
