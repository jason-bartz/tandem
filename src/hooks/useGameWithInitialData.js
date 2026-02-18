import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import { sanitizeInput, sanitizeInputPreserveSpaces, checkAnswerWithPlurals } from '@/lib/utils';
import {
  savePuzzleProgress,
  savePuzzleResult,
  updateGameStats,
  hasPlayedPuzzle,
  getPuzzleResult,
} from '@/lib/storage';
import { playFailureSound, playSuccessSound } from '@/lib/sounds';
import statsService from '@/services/stats.service';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import logger from '@/lib/logger';
import { trackGameStart, trackGameComplete, GAME_TYPES } from '@/lib/gameAnalytics';
import { useAuth } from '@/contexts/AuthContext';

export function useGameWithInitialData(initialPuzzleData) {
  const { markServiceUnavailable } = useAuth();
  const [gameState, setGameState] = useState(GAME_STATES.WELCOME);
  // Make sure the puzzle includes the date from initialPuzzleData
  const [puzzle, setPuzzle] = useState(
    initialPuzzleData?.puzzle
      ? {
          ...initialPuzzleData.puzzle,
          date: initialPuzzleData.date || initialPuzzleData.puzzle.date,
        }
      : null
  );
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState([false, false, false, false]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [loading, setLoading] = useState(!initialPuzzleData);
  const [error, setError] = useState(null);
  const [isArchiveGame, setIsArchiveGame] = useState(false);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(initialPuzzleData?.date || null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hasCheckedAnswers, setHasCheckedAnswers] = useState(false);
  const [checkedWrongAnswers, setCheckedWrongAnswers] = useState([false, false, false, false]);
  const [won, setWon] = useState(false);
  const [hintedAnswers, setHintedAnswers] = useState([]);
  const [unlockedHints, setUnlockedHints] = useState(1);
  const [activeHintIndex, setActiveHintIndex] = useState(null);
  const [lockedLetters, setLockedLetters] = useState([null, null, null, null]);
  const [isHardMode, setIsHardMode] = useState(false);
  const [hardModeTimeUp, setHardModeTimeUp] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [completionTime, setCompletionTime] = useState(null);
  const [admireData, setAdmireData] = useState(null);

  // Following Wordle's approach: client-side fetches puzzle using local timezone
  useEffect(() => {
    if (!initialPuzzleData) {
      async function loadPuzzle() {
        try {
          // Client-side puzzle fetch - puzzleService.getPuzzle() will use client's local date
          const response = await puzzleService.getPuzzle();

          if (response && response.puzzle) {
            // Add puzzleNumber and date to the puzzle object if it's not there
            const puzzleWithData = {
              ...response.puzzle,
              puzzleNumber: response.puzzle.puzzleNumber || response.puzzleNumber,
              date: response.date || response.puzzle.date,
            };

            setPuzzle(puzzleWithData);
            setCurrentPuzzleDate(response.date);
            setError(null);
          } else {
            // No puzzle available in response
            setError(
              "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
            );
          }
        } catch (err) {
          if (
            err.name === 'AbortError' ||
            err.status >= 500 ||
            err.message?.includes('API Error: 5')
          ) {
            markServiceUnavailable();
          }
          setError('Failed to load puzzle');
        } finally {
          setLoading(false);
        }
      }

      loadPuzzle();
    }
  }, [initialPuzzleData, markServiceUnavailable]);

  // Load specific puzzle for archive
  const loadPuzzle = useCallback(
    async (identifier = null, forceReplay = false) => {
      try {
        setLoading(true);
        setError(null);

        const isArchive = identifier !== null;
        setIsArchiveGame(isArchive);

        if (!forceReplay && identifier) {
          const existingResult = await getPuzzleResult(identifier);

          if (existingResult && existingResult.won) {
            // Enter admire mode to view the completed puzzle
            const response = await puzzleService.getPuzzle(identifier);

            if (response && response.puzzle) {
              setPuzzle({ ...response.puzzle, date: response.date || identifier });
              setCurrentPuzzleDate(response.date || identifier);
              setAdmireData(existingResult);
              setGameState(GAME_STATES.ADMIRE);
              setLoading(false);
              return true;
            }
            // If no puzzle found, fall through to show error
          }
        }

        // identifier can be a puzzle number, date string, or null for today

        const response = await puzzleService.getPuzzle(identifier);

        if (response && response.puzzle) {
          // Add puzzleNumber and date to the puzzle object if it's not there
          const puzzleWithData = {
            ...response.puzzle,
            puzzleNumber: response.puzzle.puzzleNumber || response.puzzleNumber,
            date: response.date || response.puzzle.date,
          };

          setCurrentPuzzleDate(response.date);
          setPuzzle(puzzleWithData);
          // Archive puzzles should start immediately in PLAYING mode
          // Today's puzzle shows WELCOME screen
          setGameState(isArchive ? GAME_STATES.PLAYING : GAME_STATES.WELCOME);
          setAnswers(['', '', '', '']);
          setCorrectAnswers([false, false, false, false]);
          setCheckedWrongAnswers([false, false, false, false]);
          setMistakes(0);
          setSolved(0);
          setHintsUsed(0);
          setHintedAnswers([]);
          setUnlockedHints(1);
          setActiveHintIndex(null);
          setLockedLetters([null, null, null, null]);

          return true;
        } else {
          // No puzzle available in response
          logger.error('[useGameWithInitialData] No puzzle in response', null, { response });
          setError(
            "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
          );
          return false;
        }
      } catch (err) {
        logger.error('[useGameWithInitialData] Error loading puzzle', err);
        if (
          err.name === 'AbortError' ||
          err.status >= 500 ||
          err.message?.includes('API Error: 5')
        ) {
          markServiceUnavailable();
        }
        setError(`Failed to load puzzle: ${err.message}`);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [markServiceUnavailable]
  );

  const startGame = useCallback(() => {
    if (!puzzle) {
      return;
    }

    // Track game start
    trackGameStart(GAME_TYPES.TANDEM, puzzle.puzzleNumber, currentPuzzleDate);

    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setError(null);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
    setHintedAnswers([]);
    setUnlockedHints(1);
    setActiveHintIndex(null);
    setLockedLetters([null, null, null, null]);

    // Start time tracking for leaderboard
    setStartTime(Date.now());
    setCompletionTime(null);

    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: 0,
        mistakes: 0,
        hintsUsed: 0,
      });
    }
  }, [puzzle, currentPuzzleDate]);

  const updateAnswer = useCallback(
    (index, value) => {
      // Simple update - just set the value
      // Locked letter logic is handled in keyboard handlers, not here
      const hasLockedLetters = lockedLetters && lockedLetters[index];
      const sanitized = hasLockedLetters
        ? sanitizeInputPreserveSpaces(value)
        : sanitizeInput(value);

      setAnswers((prev) => {
        const newAnswers = [...prev];
        newAnswers[index] = sanitized;
        return newAnswers;
      });

      if (checkedWrongAnswers[index]) {
        setCheckedWrongAnswers((prev) => {
          const newCheckedWrong = [...prev];
          newCheckedWrong[index] = false;
          return newCheckedWrong;
        });
      }
    },
    [checkedWrongAnswers, lockedLetters]
  );

  const completeGame = useCallback(
    async (won) => {
      // CRITICAL: Capture hintedAnswers at the start before any state changes
      const capturedHintedAnswers = [...hintedAnswers];

      const endTime = Date.now();
      const timeTaken = startTime ? Math.floor((endTime - startTime) / 1000) : 0; // Time in seconds
      setCompletionTime(timeTaken);

      // Set won state immediately for sounds
      setWon(won);

      if (won) {
        playSuccessSound();
      } else {
        playFailureSound();
      }

      // Track game completion for analytics
      trackGameComplete({
        gameType: GAME_TYPES.TANDEM,
        puzzleNumber: puzzle?.puzzleNumber,
        puzzleDate: currentPuzzleDate,
        won,
        timeSeconds: timeTaken,
        mistakes,
        hintsUsed,
      });

      // Transition to complete screen quickly - stats save in background
      // Short delay for success sound to register before screen change
      setTimeout(() => {
        setGameState(GAME_STATES.COMPLETE);
      }, 150);

      // Save stats in background (non-blocking for UI)
      const isFirstAttempt = currentPuzzleDate && !(await hasPlayedPuzzle(currentPuzzleDate));

      try {
        await statsService.updateStats({
          completed: won,
          mistakes,
          solved,
          time: timeTaken, // CRITICAL FIX: Include completion time for stats
          hintsUsed,
          isArchive: isArchiveGame,
          puzzleDate: currentPuzzleDate,
          isFirstAttempt,
        });
      } catch (err) {
        logger.error('[useGameWithInitialData] statsService.updateStats failed', err);
        // Fall back to direct storage update if service fails
        updateGameStats(won, isFirstAttempt, isArchiveGame, currentPuzzleDate);
      }

      if (!isArchiveGame) {
        try {
          await puzzleService.submitCompletion({
            completed: won,
            time: timeTaken,
            mistakes: mistakes,
          });
        } catch (err) {
          logger.error('Failed to submit completion', err);
        }

        // Submit to leaderboard if won and time is valid

        if (won && timeTaken > 0 && currentPuzzleDate) {
          // Submit daily speed score
          const payload = {
            gameType: 'tandem',
            puzzleDate: currentPuzzleDate,
            score: timeTaken,
            metadata: { hintsUsed, mistakes, solved },
          };

          try {
            const response = await capacitorFetch(getApiUrl('/api/leaderboard/daily'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
              logger.error('[useGameWithInitialData] Leaderboard submission failed', null, result);
            }
          } catch (err) {
            logger.error('[useGameWithInitialData] Failed to submit to leaderboard', err);
            // Fail silently - leaderboard submission is not critical
          }

          // Submit streak to leaderboard if won (streak updated by statsService)
          if (won) {
            try {
              // Get updated stats to get current streak
              const stats = await updateGameStats(
                won,
                isFirstAttempt,
                isArchiveGame,
                currentPuzzleDate
              );
              const currentStreak = stats?.currentStreak || 0;

              if (currentStreak > 0) {
                const streakResponse = await capacitorFetch(getApiUrl('/api/leaderboard/streak'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    gameType: 'tandem',
                    streak: currentStreak,
                  }),
                });

                await streakResponse.json();
              }
            } catch (err) {
              logger.error('[useGameWithInitialData] Failed to submit streak', err);
              // Fail silently
            }
          }
        }
      }

      // CRITICAL: Save hintedAnswers with the puzzle result
      if (currentPuzzleDate) {
        savePuzzleResult(currentPuzzleDate, {
          won: won,
          completed: won,
          failed: !won,
          status: won ? 'completed' : 'failed',
          mistakes: mistakes,
          solved: solved,
          time: timeTaken,
          hintsUsed: hintsUsed,
          hintedAnswers: capturedHintedAnswers, // CRITICAL FIX: Include which puzzles had hints
          attempted: true,
          isArchive: isArchiveGame, // Pass the archive flag to properly track puzzle type
        });
      }
    },
    [isArchiveGame, mistakes, solved, currentPuzzleDate, hintsUsed, hintedAnswers, startTime]
  );

  const checkSingleAnswer = useCallback(
    (index) => {
      if (correctAnswers[index]) {
        return { isCorrect: false, gameComplete: false };
      }

      // Don't trim if we have locked letters, as positions matter
      const hasLockedLetters = lockedLetters && lockedLetters[index];
      const userAnswer = hasLockedLetters ? answers[index] : answers[index].trim();
      if (!userAnswer || !userAnswer.trim()) {
        return { isCorrect: false, gameComplete: false };
      }

      const puzzleItem = puzzle.puzzles[index];
      const isCorrect = checkAnswerWithPlurals(userAnswer.trim(), puzzleItem.answer);

      if (isCorrect) {
        setCorrectAnswers((prev) => {
          const newCorrect = [...prev];
          newCorrect[index] = true;
          return newCorrect;
        });

        if (activeHintIndex === index) {
          setActiveHintIndex(null);
        }

        setLockedLetters((prev) => {
          const newLocked = [...prev];
          newLocked[index] = null;
          return newLocked;
        });

        setSolved((prev) => {
          const newSolved = prev + 1;

          if (newSolved >= 2 && unlockedHints === 1) {
            setUnlockedHints(2);
          }

          if (currentPuzzleDate) {
            savePuzzleProgress(currentPuzzleDate, {
              solved: newSolved,
              mistakes: mistakes,
              hintsUsed: hintsUsed,
            });
          }

          if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
            completeGame(true);
            return newSolved;
          }

          return newSolved;
        });

        return { isCorrect: true, gameComplete: solved + 1 === GAME_CONFIG.PUZZLE_COUNT };
      } else {
        // Wrong answer - check for letters in correct positions (smart hints)
        const correctAnswer = puzzleItem.answer.toLowerCase();
        const userAnswerLower = userAnswer.toLowerCase();
        const lockedPositions = {};

        // Compare character by character to find letters in correct positions
        for (let i = 0; i < Math.min(userAnswerLower.length, correctAnswer.length); i++) {
          if (userAnswerLower[i] === correctAnswer[i]) {
            // Store uppercase version for consistency with sanitized input
            lockedPositions[i] = userAnswerLower[i].toUpperCase();
          }
        }

        // Build new answer with only locked letters (spaces for unlocked positions)
        let newAnswer = '';
        if (Object.keys(lockedPositions).length > 0) {
          // Create answer with locked letters in their positions and spaces elsewhere
          for (let i = 0; i < correctAnswer.length; i++) {
            if (lockedPositions[i]) {
              newAnswer += lockedPositions[i];
            } else {
              newAnswer += ' ';
            }
          }

          setLockedLetters((prev) => {
            const newLocked = [...prev];
            newLocked[index] = lockedPositions;
            return newLocked;
          });

          setAnswers((prev) => {
            const newAnswers = [...prev];
            newAnswers[index] = newAnswer;
            return newAnswers;
          });
        } else {
          // No matching letters, clear the input completely
          setAnswers((prev) => {
            const newAnswers = [...prev];
            newAnswers[index] = '';
            return newAnswers;
          });
        }

        setMistakes((prev) => {
          const newMistakes = Math.min(prev + 1, GAME_CONFIG.MAX_MISTAKES);

          if (currentPuzzleDate) {
            savePuzzleProgress(currentPuzzleDate, {
              solved: solved,
              mistakes: newMistakes,
              hintsUsed: hintsUsed,
            });
          }

          if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
            completeGame(false);
          }

          return newMistakes;
        });

        setCheckedWrongAnswers((prev) => {
          const newCheckedWrong = [...prev];
          newCheckedWrong[index] = true;
          return newCheckedWrong;
        });

        return { isCorrect: false, gameComplete: mistakes + 1 >= GAME_CONFIG.MAX_MISTAKES };
      }
    },
    [
      answers,
      correctAnswers,
      puzzle,
      solved,
      mistakes,
      completeGame,
      currentPuzzleDate,
      hintsUsed,
      activeHintIndex,
      unlockedHints,
      lockedLetters,
    ]
  );

  const checkAnswers = useCallback(() => {
    let correct = 0;
    let incorrect = 0;
    const newCorrectAnswers = [...correctAnswers];
    const newCheckedWrong = [...checkedWrongAnswers];
    const newLockedLetters = [...lockedLetters];
    const newAnswers = [...answers];

    setHasCheckedAnswers(true);

    answers.forEach((answer, index) => {
      if (!correctAnswers[index] && answer.trim()) {
        const puzzleItem = puzzle.puzzles[index];
        // Don't trim for comparison if we have locked letters
        const hasLockedLetters = lockedLetters && lockedLetters[index];
        const answerToCheck = hasLockedLetters ? answer.trim() : answer;
        const isCorrect = checkAnswerWithPlurals(answerToCheck, puzzleItem.answer);

        if (isCorrect) {
          newCorrectAnswers[index] = true;
          correct++;

          newLockedLetters[index] = null;
        } else {
          incorrect++;
          newCheckedWrong[index] = true;

          // Check for letters in correct positions (smart hints)
          const correctAnswer = puzzleItem.answer.toLowerCase();
          // Use original answer (not trimmed) to preserve positions
          const userAnswerLower = answer.toLowerCase();
          const lockedPositions = {};

          // Compare character by character
          for (let i = 0; i < Math.min(userAnswerLower.length, correctAnswer.length); i++) {
            if (userAnswerLower[i] === correctAnswer[i]) {
              // Store uppercase version for consistency with sanitized input
              lockedPositions[i] = userAnswerLower[i].toUpperCase();
            }
          }

          // Build new answer with only locked letters
          if (Object.keys(lockedPositions).length > 0) {
            let lockedAnswer = '';
            for (let i = 0; i < correctAnswer.length; i++) {
              if (lockedPositions[i]) {
                lockedAnswer += lockedPositions[i];
              } else {
                lockedAnswer += ' ';
              }
            }
            newLockedLetters[index] = lockedPositions;
            newAnswers[index] = lockedAnswer;
          } else {
            // No matching letters, clear the input
            newAnswers[index] = '';
          }
        }
      }
    });

    setAnswers(newAnswers);
    setLockedLetters(newLockedLetters);
    setCorrectAnswers(newCorrectAnswers);
    setCheckedWrongAnswers(newCheckedWrong);

    if (correct > 0) {
      setSolved((prev) => {
        const newSolved = prev + correct;

        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            solved: newSolved,
            mistakes: mistakes + incorrect,
            hintsUsed: hintsUsed,
          });
        }

        if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
          completeGame(true);
        }
        return newSolved;
      });
    }

    if (incorrect > 0) {
      setMistakes((prev) => {
        const newMistakes = Math.min(prev + incorrect, GAME_CONFIG.MAX_MISTAKES);

        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            solved: solved + correct,
            mistakes: newMistakes,
            hintsUsed: hintsUsed,
          });
        }

        if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
          completeGame(false);
        }
        return newMistakes;
      });
    }

    return { correct, incorrect };
  }, [
    answers,
    correctAnswers,
    puzzle,
    solved,
    mistakes,
    completeGame,
    currentPuzzleDate,
    hintsUsed,
    checkedWrongAnswers,
    lockedLetters,
  ]);

  const useHint = useCallback(
    (targetIndex) => {
      if (!puzzle || !puzzle.puzzles || hintsUsed >= unlockedHints) {
        return false;
      }

      let hintIndex = targetIndex;

      if (hintIndex === undefined || hintIndex === null || correctAnswers[hintIndex]) {
        hintIndex = correctAnswers.findIndex((correct) => !correct);
        if (hintIndex === -1) {
          return false;
        }
      }

      if (hintedAnswers.includes(hintIndex)) {
        setActiveHintIndex(hintIndex);
        return true;
      }

      const puzzleHint = puzzle.puzzles[hintIndex].hint;
      if (!puzzleHint) {
        return false;
      }

      setHintedAnswers((prev) => {
        const newHintedAnswers = [...prev, hintIndex];

        return newHintedAnswers;
      });

      setActiveHintIndex(hintIndex);

      setHintsUsed((prev) => prev + 1);

      if (solved >= 2 && unlockedHints === 1) {
        setUnlockedHints(2);
      }

      if (currentPuzzleDate) {
        savePuzzleProgress(currentPuzzleDate, {
          started: true,
          solved,
          mistakes,
          hintsUsed: hintsUsed + 1,
          hintedAnswers: [...hintedAnswers, hintIndex],
          unlockedHints,
          activeHintIndex: hintIndex,
        });
      }

      return true;
    },
    [
      puzzle,
      correctAnswers,
      hintsUsed,
      unlockedHints,
      hintedAnswers,
      currentPuzzleDate,
      solved,
      mistakes,
    ]
  );

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
    setHintedAnswers([]);
    setUnlockedHints(1);
    setActiveHintIndex(null);
    setLockedLetters([null, null, null, null]);
    setHardModeTimeUp(false);
  }, []);

  const returnToWelcome = useCallback(() => {
    // If we were playing an archive game, reload today's puzzle
    if (isArchiveGame) {
      loadPuzzle(null); // Load today's puzzle
    } else {
      // Just return to welcome screen

      setGameState(GAME_STATES.WELCOME);
    }
  }, [isArchiveGame, loadPuzzle]);

  const replayFromAdmire = useCallback(() => {
    setAdmireData(null);
    setGameState(GAME_STATES.PLAYING);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
    setHintedAnswers([]);
    setUnlockedHints(1);
    setActiveHintIndex(null);
    setLockedLetters([null, null, null, null]);

    // Save initial progress to mark as attempted
    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: 0,
        mistakes: 0,
        hintsUsed: 0,
      });
    }
  }, [currentPuzzleDate]);

  // Function to end game (used for hard mode timeout)
  const endGame = useCallback((hasWon) => {
    setWon(hasWon);
    setGameState(GAME_STATES.COMPLETE);
    if (!hasWon) {
      playFailureSound();
    }
  }, []);

  // Helper to handle backspace with locked letters
  const handleBackspace = useCallback(
    (index) => {
      const currentValue = answers[index] || '';
      const locked = lockedLetters[index];

      if (!locked || Object.keys(locked).length === 0) {
        // No locked letters, just remove last character
        updateAnswer(index, currentValue.slice(0, -1));
        return;
      }

      for (let i = currentValue.length - 1; i >= 0; i--) {
        if (!locked[i] && currentValue[i] !== ' ') {
          // Remove this character
          const chars = currentValue.split('');
          chars[i] = ' ';
          updateAnswer(index, chars.join(''));
          return;
        }
      }
      // If we got here, there's nothing to delete
    },
    [answers, lockedLetters, updateAnswer]
  );

  // Helper to handle letter input with locked letters
  const handleLetterInput = useCallback(
    (index, letter, maxLength) => {
      const currentValue = answers[index] || '';
      const locked = lockedLetters[index];

      if (!locked || Object.keys(locked).length === 0) {
        // No locked letters, just append if under max length
        if (currentValue.length < maxLength) {
          updateAnswer(index, currentValue + letter);
        }
        return;
      }

      for (let i = 0; i < maxLength; i++) {
        if (!locked[i] && (!currentValue[i] || currentValue[i] === ' ')) {
          // This position is unlocked and empty, fill it
          const chars = (currentValue + ' '.repeat(maxLength)).split('').slice(0, maxLength);
          chars[i] = letter;
          updateAnswer(index, chars.join(''));
          return;
        }
      }
      // If we got here, all unlocked positions are filled
    },
    [answers, lockedLetters, updateAnswer]
  );

  const resetStartTime = useCallback(() => {
    setStartTime(Date.now());
  }, []);

  return {
    gameState,
    puzzle,
    answers,
    correctAnswers,
    checkedWrongAnswers,
    mistakes,
    solved,
    loading,
    error,
    won,
    hintsUsed,
    hasCheckedAnswers,
    hintedAnswers,
    unlockedHints,
    activeHintIndex,
    lockedLetters,
    isHardMode,
    hardModeTimeUp,
    completionTime,
    admireData,
    setIsHardMode,
    setHardModeTimeUp,
    startGame,
    updateAnswer,
    checkAnswers,
    checkSingleAnswer,
    completeGame,
    loadPuzzle,
    useHint,
    resetGame,
    returnToWelcome,
    replayFromAdmire,
    endGame,
    handleBackspace,
    handleLetterInput,
    resetStartTime,
  };
}
