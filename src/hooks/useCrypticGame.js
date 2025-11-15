/* eslint-disable no-console */
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
  loadCrypticStats,
} from '@/lib/crypticStorage';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import logger from '@/lib/logger';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';

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
  const [isArchive, setIsArchive] = useState(false); // Track if this is an archive puzzle
  const [admireData, setAdmireData] = useState(null); // Store completion data for admire mode

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

      // Determine if this is an archive puzzle
      // Archive puzzle = user explicitly provided a date different from today's date
      const isArchivePuzzle = date !== null && date !== puzzleInfo.isoDate;
      setIsArchive(isArchivePuzzle);

      logger.info('[useCrypticGame] Loading puzzle', {
        date: targetDate,
        isArchive: isArchivePuzzle,
      });

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

      // Restore saved state if it matches this puzzle AND it's in progress
      if (savedState && savedState.currentPuzzleDate === targetDate) {
        if (savedProgress && savedProgress.completed) {
          // Puzzle was completed - enter admire mode to view the completed puzzle
          logger.info('[useCrypticGame] Entering ADMIRE mode for completed puzzle');
          setAdmireData(savedProgress);
          setGameState(CRYPTIC_GAME_STATES.ADMIRE);
        } else {
          // Puzzle is in progress, restore the saved state
          setUserAnswer(savedState.userAnswer || '');
          setHintsUsed(savedState.hintsUsed || 0);
          setUnlockedHints(savedState.unlockedHints || []);
          setAttempts(savedState.attempts || 0);
          setElapsedTime(savedState.elapsedTime || 0);
          setStartTime(savedState.startTime || null);
          setGameState(CRYPTIC_GAME_STATES.WELCOME);
        }
      } else if (savedProgress && savedProgress.completed) {
        // Saved progress exists but no game state, and puzzle is completed - enter admire mode
        logger.info('[useCrypticGame] Entering ADMIRE mode for completed puzzle (no game state)');
        setAdmireData(savedProgress);
        setGameState(CRYPTIC_GAME_STATES.ADMIRE);
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
  const updateAnswer = useCallback(
    (value) => {
      // Sanitize input - allow only letters (no spaces in user input, spaces are for display only)
      const sanitized = value.toUpperCase().replace(/[^A-Z]/g, '');

      // Limit to puzzle answer length (total letters excluding spaces)
      if (puzzle && sanitized.length <= puzzle.length) {
        setUserAnswer(sanitized);
      }
    },
    [puzzle]
  );

  /**
   * Check if the answer is correct
   */
  const checkAnswer = useCallback(async () => {
    if (!puzzle || !userAnswer) {
      return false;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    try {
      // Normalize user answer - remove all spaces and convert to uppercase
      const normalizedUserAnswer = userAnswer.replace(/\s/g, '').toUpperCase();

      // Debug logging for iOS

      // Call the server-side validation API using capacitorFetch for iOS compatibility
      const response = await capacitorFetch(
        getApiUrl('/api/cryptic/puzzle'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: currentPuzzleDate,
            answer: normalizedUserAnswer,
          }),
        },
        false // Don't include auth headers - this is a public endpoint
      );

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
          answer: result.answer, // Store the answer for admire mode
          completedAt: new Date().toISOString(),
          isDaily: !isArchive, // Track if this was a daily puzzle
          isArchive: isArchive, // Track if this was an archive puzzle
        }).catch((err) => {
          logger.error('[useCrypticGame] Failed to save completion progress', {
            error: err.message,
          });
        });

        // CRITICAL: Only count daily puzzles (not archive) for streaks
        // This matches Tandem Daily's streak logic
        const isFirstAttemptCompletion = newAttempts === 1; // First time solving this puzzle
        updateCrypticStatsAfterCompletion(
          currentPuzzleDate,
          timeTaken,
          hintsUsed,
          isArchive, // Pass archive status
          isFirstAttemptCompletion // Pass first attempt status
        )
          .then(async (updatedStats) => {
            // Check and submit achievements after stats update
            if (typeof window !== 'undefined') {
              try {
                const gameCenterService = (await import('@/services/gameCenter.service')).default;
                const achievements =
                  await gameCenterService.checkAndSubmitCrypticAchievements(updatedStats);
                logger.info('[useCrypticGame] Achievements checked:', achievements.length);
              } catch (err) {
                logger.error('[useCrypticGame] Failed to check achievements', {
                  error: err.message,
                });
              }
            }
          })
          .catch((err) => {
            logger.error('[useCrypticGame] Failed to update stats', { error: err.message });
          });

        // Save to server (async, don't wait)
        // Convert hint indices to types for backward compatibility
        const hintTypes = unlockedHints
          .map((idx) => (typeof idx === 'number' ? puzzle.hints[idx]?.type : idx))
          .filter(Boolean);

        crypticService
          .saveStats({
            puzzle_date: currentPuzzleDate,
            completed: true,
            time_taken: timeTaken,
            hints_used: hintsUsed,
            hints_used_types: hintTypes,
            attempts: newAttempts,
          })
          .catch((err) => {
            logger.error('[useCrypticGame] Failed to save stats to server', { error: err.message });
          });

        // Submit to leaderboard if daily puzzle (not archive) and time is valid

        if (!isArchive && timeTaken > 0 && currentPuzzleDate) {
          // Submit daily speed score
          const payload = {
            gameType: 'cryptic',
            puzzleDate: currentPuzzleDate,
            score: timeTaken,
            metadata: { hintsUsed, attempts: newAttempts },
          };

          capacitorFetch(
            getApiUrl('/api/leaderboard/daily'),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
            true // Include auth headers
          )
            .then((response) => response.json())
            .then((_result) => {})
            .catch((err) => {
              logger.error('[useCrypticGame] Failed to submit to leaderboard', {
                error: err.message,
              });
              console.error('[useCrypticGame] Leaderboard error:', err);
              // Fail silently - leaderboard submission is not critical
            });

          // Submit streak to leaderboard
          loadCrypticStats()
            .then((stats) => {
              const currentStreak = stats?.currentStreak || 0;
              if (currentStreak > 0) {
                return capacitorFetch(
                  getApiUrl('/api/leaderboard/streak'),
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      gameType: 'cryptic',
                      streak: currentStreak,
                    }),
                  },
                  true // Include auth headers
                );
              }
            })
            .then((response) => {
              if (response) {
                return response.json();
              }
            })
            .then((result) => {
              if (result) {
              }
            })
            .catch((err) => {
              console.error('[useCrypticGame] Failed to submit streak:', err);
              // Fail silently
            });
        }

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
  const useHint = useCallback(
    (hintIndex = null) => {
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
    },
    [puzzle, hintsUsed, unlockedHints]
  );

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
   * Replay puzzle from admire mode
   */
  const replayFromAdmire = useCallback(() => {
    setAdmireData(null);
    setGameState(CRYPTIC_GAME_STATES.PLAYING);
    setUserAnswer('');
    setHintsUsed(0);
    setUnlockedHints([]);
    setIsCorrect(false);
    setAttempts(0);
    setStartTime(Date.now());
    setElapsedTime(0);

    // Save initial progress to mark as attempted
    if (currentPuzzleDate) {
      saveCrypticPuzzleProgress(currentPuzzleDate, {
        started: true,
        startTime: Date.now(),
        completed: false,
        hintsUsed: 0,
      }).catch((err) => {
        logger.error('[useCrypticGame] Failed to save initial progress on replay', {
          error: err.message,
        });
      });
    }
  }, [currentPuzzleDate]);

  /**
   * Play a different puzzle (from archive)
   */
  const playPuzzle = useCallback(
    async (date) => {
      await loadPuzzle(date);
      // Don't call resetGame() - loadPuzzle already sets the correct state
      // If the puzzle is completed, it enters ADMIRE mode
      // If not completed, it enters WELCOME mode
    },
    [loadPuzzle]
  );

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
    admireData,

    // Actions
    updateAnswer,
    checkAnswer,
    useHint,
    getAvailableHints,
    getNextHint,
    startGame,
    resetGame,
    returnToWelcome,
    replayFromAdmire,
    loadPuzzle,
    playPuzzle,

    // Computed
    canUseHint: hintsUsed < CRYPTIC_CONFIG.MAX_HINTS,
    hasUnlockedHints: hintsUsed > 0,
    remainingHints: CRYPTIC_CONFIG.MAX_HINTS - hintsUsed,
  };
}

export default useCrypticGame;
