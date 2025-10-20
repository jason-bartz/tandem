import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import statsService from '@/services/stats.service';
import { sanitizeInput, checkAnswerWithPlurals, getCurrentPuzzleInfo } from '@/lib/utils';
import { savePuzzleProgress, savePuzzleResult, hasPlayedPuzzle } from '@/lib/storage';
import { playFailureSound, playSuccessSound } from '@/lib/sounds';
import { Capacitor } from '@capacitor/core';
import notificationService from '@/services/notificationService';

export function useGame() {
  const [gameState, setGameState] = useState(GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState([false, false, false, false]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isArchiveGame, setIsArchiveGame] = useState(false);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hasCheckedAnswers, setHasCheckedAnswers] = useState(false);
  const [checkedWrongAnswers, setCheckedWrongAnswers] = useState([false, false, false, false]);
  const [hintedAnswers, setHintedAnswers] = useState([]);
  const [unlockedHints, setUnlockedHints] = useState(1);
  const [activeHintIndex, setActiveHintIndex] = useState(null);

  // Simple load puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      try {
        // Get Eastern Time date for consistency with puzzle rotation
        const { getCurrentPuzzleInfo } = await import('@/lib/utils');
        const puzzleInfo = getCurrentPuzzleInfo();
        const today = puzzleInfo.isoDate;
        setCurrentPuzzleDate(today);

        const response = await puzzleService.getPuzzle();

        if (response && response.puzzle) {
          setPuzzle({ ...response.puzzle, date: today });
        } else if (response) {
          // Maybe the response IS the puzzle
          setPuzzle({ ...response, date: today });
        } else {
          setError('No puzzle available');
        }
      } catch (err) {
        setError('Failed to load puzzle');
      } finally {
        setLoading(false);
      }
    }

    loadPuzzle();
  }, []);

  // Load specific puzzle for archive
  const loadPuzzle = useCallback(async (date = null) => {
    try {
      setLoading(true);
      setError(null);

      // Check if this is an archive game (has a specific date)
      const isArchive = date !== null;
      setIsArchiveGame(isArchive);

      // Set the current puzzle date (use ET today if not specified)
      let puzzleDate = date;
      if (!date) {
        const { getCurrentPuzzleInfo } = await import('@/lib/utils');
        const puzzleInfo = getCurrentPuzzleInfo();
        puzzleDate = puzzleInfo.isoDate;
      }
      setCurrentPuzzleDate(puzzleDate);

      const response = await puzzleService.getPuzzle(date);

      if (response && response.puzzle) {
        setPuzzle({ ...response.puzzle, date: response.date || puzzleDate }); // Add date to puzzle
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setCheckedWrongAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        setActiveHints([null, null, null, null]);
        return true;
      } else if (response) {
        setPuzzle({ ...response, date: response.date || puzzleDate }); // Add date to puzzle
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setCheckedWrongAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        setActiveHints([null, null, null, null]);
        return true;
      } else {
        setError('No puzzle available');
        return false;
      }
    } catch (err) {
      setError('Failed to load puzzle');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const startGame = useCallback(() => {
    if (!puzzle) {
      return;
    }

    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setError(null);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
    setActiveHints([null, null, null, null]);

    // Save initial progress to mark as attempted
    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: 0,
        mistakes: 0,
        hintsUsed: 0,
      });
    }
  }, [puzzle, currentPuzzleDate, isArchiveGame]);

  const updateAnswer = useCallback(
    (index, value) => {
      // Simple sanitization - no hint or locked letter logic needed
      const sanitized = sanitizeInput(value);

      setAnswers((prev) => {
        const newAnswers = [...prev];
        newAnswers[index] = sanitized;
        return newAnswers;
      });

      // Clear the wrong status when user starts typing again
      if (checkedWrongAnswers[index]) {
        setCheckedWrongAnswers((prev) => {
          const newCheckedWrong = [...prev];
          newCheckedWrong[index] = false;
          return newCheckedWrong;
        });
      }
    },
    [checkedWrongAnswers]
  );

  const completeGame = useCallback(
    async (won) => {
      setGameState(GAME_STATES.COMPLETE);

      // Play appropriate sound
      if (won) {
        playSuccessSound();
      } else {
        playFailureSound();
      }

      // Get the puzzle date from the puzzle object itself as a fallback
      const puzzleDateToUse = currentPuzzleDate || puzzle?.date || null;
      const todayDate = getCurrentPuzzleInfo().isoDate;
      const isArchive = isArchiveGame || (puzzleDateToUse && puzzleDateToUse !== todayDate);

      // Check if this is the first attempt BEFORE saving the result
      const isFirstAttempt = puzzleDateToUse ? !(await hasPlayedPuzzle(puzzleDateToUse)) : true;

      // Update stats BEFORE saving the puzzle result to preserve first attempt status
      try {
        console.log('[useGame] Calling statsService.updateStats with:', {
          completed: won,
          mistakes,
          solved,
          hintsUsed,
          isArchive,
          puzzleDate: puzzleDateToUse,
          isFirstAttempt,
        });
        await statsService.updateStats({
          completed: won,
          mistakes,
          solved,
          hintsUsed,
          isArchive: isArchive, // Pass archive flag to stats service
          puzzleDate: puzzleDateToUse, // Pass the puzzle date for streak tracking
          isFirstAttempt, // Pass the first attempt flag directly
        });
        console.log('[useGame] statsService.updateStats completed successfully');
      } catch (err) {
        console.error('[useGame] statsService.updateStats failed:', err);
        console.error('[useGame] Error details:', {
          message: err?.message,
          stack: err?.stack,
        });
      }

      // Save the final result AFTER updating stats
      if (puzzleDateToUse) {
        savePuzzleResult(puzzleDateToUse, {
          won,
          mistakes,
          solved,
          hintsUsed,
          theme: puzzle?.theme, // Save the theme with the result
          time: null, // Could add time tracking if needed
          isArchive: isArchive, // Pass the archive flag to properly track puzzle type
        });
      }

      // Handle notifications if the puzzle was won and it's today's puzzle
      if (won && !isArchive && Capacitor.isNativePlatform()) {
        try {
          await notificationService.onPuzzleCompleted();
        } catch (err) {
          console.error('Failed to handle notification on puzzle completion:', err);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mistakes, solved, hintsUsed, isArchiveGame, currentPuzzleDate, puzzle]
  );

  const checkSingleAnswer = useCallback(
    (index) => {
      if (!puzzle || !puzzle.puzzles || !puzzle.puzzles[index]) {
        return { isCorrect: false, gameComplete: false };
      }

      // Don't check if already correct
      if (correctAnswers[index]) {
        return { isCorrect: true, gameComplete: false };
      }

      const userAnswer = answers[index].trim();
      if (!userAnswer) {
        return { isCorrect: false, gameComplete: false };
      }

      const isCorrect = checkAnswerWithPlurals(userAnswer, puzzle.puzzles[index].answer);

      if (isCorrect) {
        // Mark as correct
        const newCorrectAnswers = [...correctAnswers];
        newCorrectAnswers[index] = true;
        setCorrectAnswers(newCorrectAnswers);

        // Clear wrong status if it was wrong before
        if (checkedWrongAnswers[index]) {
          const newCheckedWrongAnswers = [...checkedWrongAnswers];
          newCheckedWrongAnswers[index] = false;
          setCheckedWrongAnswers(newCheckedWrongAnswers);
        }

        // Clear active hint if this answer is showing a hint
        if (activeHintIndex === index) {
          setActiveHintIndex(null);
        }

        // Update solved count
        const newSolved = solved + 1;
        setSolved(newSolved);

        // Check if we should unlock second hint (after 2 correct answers)
        if (newSolved >= 2 && unlockedHints === 1) {
          setUnlockedHints(2);
          console.log('[checkSingleAnswer] Unlocked second hint!');
        }

        // Save progress
        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            started: true,
            solved: newSolved,
            mistakes,
            hintsUsed,
            hintedAnswers,
            unlockedHints: newSolved >= 2 ? 2 : unlockedHints,
          });
        }

        // Check if game is complete
        if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
          completeGame(true);
          return { isCorrect: true, gameComplete: true };
        }

        return { isCorrect: true, gameComplete: false };
      } else {
        // Mark as wrong only if not already marked
        if (!checkedWrongAnswers[index]) {
          const newCheckedWrongAnswers = [...checkedWrongAnswers];
          newCheckedWrongAnswers[index] = true;
          setCheckedWrongAnswers(newCheckedWrongAnswers);

          // Increment mistakes
          const newMistakes = mistakes + 1;
          setMistakes(newMistakes);

          // Save progress
          if (currentPuzzleDate) {
            savePuzzleProgress(currentPuzzleDate, {
              started: true,
              solved,
              mistakes: newMistakes,
              hintsUsed,
            });
          }

          // Check if game is over
          if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
            completeGame(false);
            return { isCorrect: false, gameComplete: true };
          }
        }

        return { isCorrect: false, gameComplete: false };
      }
    },
    [
      puzzle,
      answers,
      correctAnswers,
      checkedWrongAnswers,
      mistakes,
      solved,
      currentPuzzleDate,
      hintsUsed,
      activeHintIndex,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ]
  );

  const checkAnswers = useCallback(() => {
    if (!puzzle || !puzzle.puzzles) {
      return { correct: 0, incorrect: 0 };
    }

    setHasCheckedAnswers(true);

    let newMistakes = 0;
    let newSolved = 0;
    const newCorrectAnswers = [...correctAnswers];
    const newCheckedWrongAnswers = [...checkedWrongAnswers];

    puzzle.puzzles.forEach((p, i) => {
      if (correctAnswers[i]) {
        newSolved++;
        return;
      }

      const userAnswer = answers[i].trim();
      if (userAnswer) {
        if (checkAnswerWithPlurals(userAnswer, p.answer)) {
          newCorrectAnswers[i] = true;
          newCheckedWrongAnswers[i] = false; // Clear wrong status if now correct
          newSolved++;
        } else {
          // Only count as a new mistake if this answer wasn't already marked as wrong
          if (!checkedWrongAnswers[i]) {
            newMistakes++;
          }
          newCheckedWrongAnswers[i] = true; // Mark this specific answer as checked and wrong
        }
      }
    });

    setCorrectAnswers(newCorrectAnswers);
    setCheckedWrongAnswers(newCheckedWrongAnswers);
    setMistakes((prev) => prev + newMistakes);
    setSolved(newSolved);

    // Save progress after checking answers
    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: newSolved,
        mistakes: mistakes + newMistakes,
        hintsUsed,
      });
    }

    if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
      completeGame(true);
    } else if (mistakes + newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
      completeGame(false);
    }

    return {
      correct: newSolved - solved,
      incorrect: newMistakes,
    };
  }, [
    puzzle,
    answers,
    correctAnswers,
    checkedWrongAnswers,
    mistakes,
    solved,
    currentPuzzleDate,
    hintsUsed,
    activeHintIndex,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setError(null);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
    setHintedAnswers([]);
    setUnlockedHints(1);
    setActiveHintIndex(null);
    setLockedLetters([null, null, null, null]);
  }, []);

  const useHint = useCallback(
    (targetIndex) => {
      // Check if we can use a hint
      if (!puzzle || !puzzle.puzzles || hintsUsed >= unlockedHints) {
        console.log('[useHint] Cannot use hint:', {
          hasPuzzle: !!puzzle,
          hintsUsed,
          unlockedHints,
        });
        return false;
      }

      // Use the provided index or find the first unanswered
      let hintIndex = targetIndex;

      if (hintIndex === undefined || hintIndex === null || correctAnswers[hintIndex]) {
        // Find first unanswered puzzle
        hintIndex = correctAnswers.findIndex((correct) => !correct);
        if (hintIndex === -1) {
          console.log('[useHint] All puzzles already solved');
          return false;
        }
      }

      // Check if this answer already has a hint
      if (hintedAnswers.includes(hintIndex)) {
        console.log('[useHint] Answer already has hint:', hintIndex);
        return false;
      }

      // Check if puzzle has hint data
      const puzzleHint = puzzle.puzzles[hintIndex].hint;
      if (!puzzleHint) {
        console.log('[useHint] No hint available for puzzle:', hintIndex);
        // Fallback: Could generate a generic hint or show "No hint available"
        return false;
      }

      // Add this answer to the hinted list
      setHintedAnswers((prev) => [...prev, hintIndex]);

      // Set the active hint index to show the hint
      setActiveHintIndex(hintIndex);

      // Increment hints used
      setHintsUsed((prev) => prev + 1);

      // Check if we should unlock another hint (after 2 correct answers)
      if (solved >= 2 && unlockedHints === 1) {
        setUnlockedHints(2);
        console.log('[useHint] Unlocked second hint!');
      }

      // Save progress with hint usage
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
    isArchiveGame,
    hintsUsed,
    hintedAnswers,
    unlockedHints,
    activeHintIndex,
    hasCheckedAnswers,
    startGame,
    updateAnswer,
    checkAnswers,
    checkSingleAnswer,
    completeGame,
    resetGame,
    loadPuzzle,
    useHint,
  };
}
