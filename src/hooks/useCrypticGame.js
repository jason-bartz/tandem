import { useState, useEffect, useCallback, useRef } from 'react';
import { CRYPTIC_CONFIG, CRYPTIC_GAME_STATES } from '@/lib/constants';
import crypticService from '@/services/cryptic.service';
import {
  saveCrypticGameState,
  loadCrypticGameState,
  saveCrypticPuzzleProgress,
  loadCrypticPuzzleProgress,
  updateCrypticStatsAfterCompletion,
  clearCrypticGameState,
} from '@/lib/crypticStorage';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import logger from '@/lib/logger';

/**
 * Custom hook for managing The Daily Cryptic game state
 */
export function useCrypticGame() {
  // Game state
  const [gameState, setGameState] = useState(CRYPTIC_GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [unlockedHints, setUnlockedHints] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);

  // Timer state
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  /**
   * Load puzzle on mount
   */
  useEffect(() => {
    loadPuzzle();

    return () => {
      // Cleanup timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /**
   * Timer effect
   */
  useEffect(() => {
    if (gameState === CRYPTIC_GAME_STATES.PLAYING && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState, startTime]);

  /**
   * Save game state whenever it changes
   */
  useEffect(() => {
    if (gameState === CRYPTIC_GAME_STATES.PLAYING && puzzle) {
      // Fire and forget - we don't need to wait for storage to complete
      saveCrypticGameState({
        puzzle,
        userAnswer,
        hintsUsed,
        unlockedHints,
        attempts,
        startTime,
        elapsedTime,
        currentPuzzleDate,
      }).catch((err) => {
        logger.error('[useCrypticGame] Failed to save game state', { error: err.message });
      });
    }
  }, [userAnswer, hintsUsed, unlockedHints, attempts, elapsedTime]);

  /**
   * Load today's or a specific date's puzzle
   */
  const loadPuzzle = useCallback(async (date = null) => {
    try {
      setLoading(true);
      setError(null);

      // Get the puzzle date
      const puzzleInfo = getCurrentPuzzleInfo();
      const targetDate = date || puzzleInfo.isoDate;
      setCurrentPuzzleDate(targetDate);

      logger.info('[useCrypticGame] Loading puzzle', { date: targetDate });

      // Check if there's saved progress for this puzzle
      const savedProgress = await loadCrypticPuzzleProgress(targetDate);
      const savedState = await loadCrypticGameState();

      // Fetch the puzzle
      const response = await crypticService.getPuzzle(targetDate);

      if (!response.success) {
        setError(response.error || 'Failed to load puzzle');
        setLoading(false);
        return false;
      }

      setPuzzle(response.puzzle);

      // Restore saved state if it matches this puzzle
      if (savedState && savedState.currentPuzzleDate === targetDate) {
        setUserAnswer(savedState.userAnswer || '');
        setHintsUsed(savedState.hintsUsed || 0);
        setUnlockedHints(savedState.unlockedHints || []);
        setAttempts(savedState.attempts || 0);
        setElapsedTime(savedState.elapsedTime || 0);
        setStartTime(savedState.startTime || null);

        // Check if puzzle was completed
        if (savedProgress && savedProgress.completed) {
          setIsCorrect(true);
          setGameState(CRYPTIC_GAME_STATES.COMPLETE);
        } else {
          setGameState(CRYPTIC_GAME_STATES.WELCOME);
        }
      } else {
        // Fresh start
        resetGame();
        setGameState(CRYPTIC_GAME_STATES.WELCOME);
      }

      setLoading(false);
      return true;
    } catch (err) {
      logger.error('[useCrypticGame] Error loading puzzle', { error: err.message });
      setError('Failed to load puzzle');
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Start the game
   */
  const startGame = useCallback(() => {
    if (!puzzle) {
      logger.error('[useCrypticGame] Cannot start game without puzzle');
      return;
    }

    logger.info('[useCrypticGame] Starting game', { date: currentPuzzleDate });

    setGameState(CRYPTIC_GAME_STATES.PLAYING);
    setStartTime(Date.now());
    setElapsedTime(0);
    setUserAnswer('');
    setIsCorrect(false);
    setHintsUsed(0);
    setUnlockedHints([]);
    setAttempts(0);

    // Save initial progress (fire and forget)
    if (currentPuzzleDate) {
      saveCrypticPuzzleProgress(currentPuzzleDate, {
        started: true,
        startTime: Date.now(),
        completed: false,
        hintsUsed: 0,
      }).catch((err) => {
        logger.error('[useCrypticGame] Failed to save initial progress', { error: err.message });
      });
    }
  }, [puzzle, currentPuzzleDate]);

  /**
   * Update user's answer
   */
  const updateAnswer = useCallback((value) => {
    // Sanitize input - allow only letters (no spaces in user input, spaces are for display only)
    const sanitized = value.toUpperCase().replace(/[^A-Z]/g, '');

    // Limit to puzzle answer length (total letters excluding spaces)
    if (puzzle && sanitized.length <= puzzle.length) {
      setUserAnswer(sanitized);
    }
  }, [puzzle]);

  /**
   * Check if the answer is correct
   */
  const checkAnswer = useCallback(async () => {
    if (!puzzle || !userAnswer) {
      return false;
    }

    // Increment attempts immediately
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    try {
      // Normalize user answer - remove all spaces and convert to uppercase
      const normalizedUserAnswer = userAnswer.replace(/\s/g, '').toUpperCase();

      // Call the server-side validation API
      const response = await fetch('/api/cryptic/puzzle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: currentPuzzleDate,
          answer: normalizedUserAnswer,
        }),
      });

      if (!response.ok) {
        logger.error('[useCrypticGame] Failed to check answer', { status: response.status });
        return false;
      }

      const result = await response.json();

      if (result.correct) {
        // Correct answer!
        setIsCorrect(true);
        setCorrectAnswer(result.answer); // Store the correct answer from the API response
        setGameState(CRYPTIC_GAME_STATES.COMPLETE);

        const timeTaken = Math.floor((Date.now() - startTime) / 1000);

        // Save completion progress (fire and forget)
        saveCrypticPuzzleProgress(currentPuzzleDate, {
          completed: true,
          timeTaken,
          hintsUsed,
          attempts: newAttempts,
          completedAt: new Date().toISOString(),
        }).catch((err) => {
          logger.error('[useCrypticGame] Failed to save completion progress', { error: err.message });
        });

        // Update local stats (fire and forget)
        updateCrypticStatsAfterCompletion(currentPuzzleDate, timeTaken, hintsUsed).catch((err) => {
          logger.error('[useCrypticGame] Failed to update stats', { error: err.message });
        });

        // Save to server (async, don't wait)
        // Convert hint indices to types for backward compatibility
        const hintTypes = unlockedHints.map((idx) =>
          typeof idx === 'number' ? puzzle.hints[idx]?.type : idx
        ).filter(Boolean);

        crypticService.saveStats({
          puzzle_date: currentPuzzleDate,
          completed: true,
          time_taken: timeTaken,
          hints_used: hintsUsed,
          hints_used_types: hintTypes,
          attempts: newAttempts,
        }).catch((err) => {
          logger.error('[useCrypticGame] Failed to save stats to server', { error: err.message });
        });

        // Clear saved game state (fire and forget)
        clearCrypticGameState().catch((err) => {
          logger.error('[useCrypticGame] Failed to clear game state', { error: err.message });
        });

        logger.info('[useCrypticGame] Puzzle completed!', {
          date: currentPuzzleDate,
          timeTaken,
          hintsUsed,
          attempts: newAttempts,
        });

        return true;
      }

      // Incorrect answer
      logger.info('[useCrypticGame] Incorrect answer', { attempts: newAttempts });
      return false;
    } catch (error) {
      logger.error('[useCrypticGame] Error checking answer', { error: error.message });
      return false;
    }
  }, [puzzle, userAnswer, startTime, hintsUsed, unlockedHints, attempts, currentPuzzleDate]);

  /**
   * Use a hint - optionally specify which hint index to use
   */
  const useHint = useCallback((hintIndex = null) => {
    if (!puzzle || hintsUsed >= CRYPTIC_CONFIG.MAX_HINTS) {
      return null;
    }

    // If no specific index provided, use the next sequential one
    const targetIndex = hintIndex !== null ? hintIndex : hintsUsed;
    const hint = puzzle.hints[targetIndex];

    if (!hint) {
      logger.error('[useCrypticGame] No hint available at index', { index: targetIndex });
      return null;
    }

    // Check if this hint was already unlocked
    if (unlockedHints.includes(targetIndex)) {
      logger.warn('[useCrypticGame] Hint already unlocked', { index: targetIndex });
      return hint;
    }

    setHintsUsed((prev) => prev + 1);
    setUnlockedHints((prev) => [...prev, targetIndex]);

    logger.info('[useCrypticGame] Hint used', {
      hintIndex: targetIndex,
      hintType: hint.type,
      totalHintsUsed: hintsUsed + 1,
    });

    return hint;
  }, [puzzle, hintsUsed, unlockedHints]);

  /**
   * Get available hints
   */
  const getAvailableHints = useCallback(() => {
    if (!puzzle || !puzzle.hints) return [];

    return puzzle.hints.slice(0, hintsUsed);
  }, [puzzle, hintsUsed]);

  /**
   * Get next hint (without using it)
   */
  const getNextHint = useCallback(() => {
    if (!puzzle || hintsUsed >= CRYPTIC_CONFIG.MAX_HINTS) {
      return null;
    }

    return puzzle.hints[hintsUsed];
  }, [puzzle, hintsUsed]);

  /**
   * Reset game state
   */
  const resetGame = useCallback(() => {
    setUserAnswer('');
    setHintsUsed(0);
    setUnlockedHints([]);
    setIsCorrect(false);
    setAttempts(0);
    setStartTime(null);
    setElapsedTime(0);
    setCorrectAnswer(null);
    setGameState(CRYPTIC_GAME_STATES.WELCOME);
    // Clear game state (fire and forget)
    clearCrypticGameState().catch((err) => {
      logger.error('[useCrypticGame] Failed to clear game state', { error: err.message });
    });
  }, []);

  /**
   * Return to welcome screen
   */
  const returnToWelcome = useCallback(() => {
    setGameState(CRYPTIC_GAME_STATES.WELCOME);
  }, []);

  /**
   * Play a different puzzle (from archive)
   */
  const playPuzzle = useCallback(async (date) => {
    const success = await loadPuzzle(date);
    if (success) {
      resetGame();
    }
  }, [loadPuzzle, resetGame]);

  return {
    // State
    gameState,
    puzzle,
    userAnswer,
    hintsUsed,
    unlockedHints,
    isCorrect,
    attempts,
    loading,
    error,
    elapsedTime,
    currentPuzzleDate,
    correctAnswer,

    // Actions
    updateAnswer,
    checkAnswer,
    useHint,
    getAvailableHints,
    getNextHint,
    startGame,
    resetGame,
    returnToWelcome,
    loadPuzzle,
    playPuzzle,

    // Computed
    canUseHint: hintsUsed < CRYPTIC_CONFIG.MAX_HINTS,
    hasUnlockedHints: hintsUsed > 0,
    remainingHints: CRYPTIC_CONFIG.MAX_HINTS - hintsUsed,
  };
}

export default useCrypticGame;
