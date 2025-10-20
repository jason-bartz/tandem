import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import { sanitizeInput, sanitizeInputPreserveSpaces, checkAnswerWithPlurals } from '@/lib/utils';
import {
  savePuzzleProgress,
  savePuzzleResult,
  updateGameStats,
  hasPlayedPuzzle,
} from '@/lib/storage';
import { playFailureSound, playSuccessSound } from '@/lib/sounds';
import statsService from '@/services/stats.service';

export function useGameWithInitialData(initialPuzzleData) {
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

  // Only load puzzle if we don't have initial data
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
          } else if (response) {
            setPuzzle(response);
            setCurrentPuzzleDate(response.date);
            setError(null);
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
    }
  }, [initialPuzzleData]);

  // Load specific puzzle for archive
  const loadPuzzle = useCallback(async (identifier = null) => {
    console.log(
      '[useGameWithInitialData] loadPuzzle called with identifier:',
      identifier,
      'type:',
      typeof identifier
    );
    try {
      setLoading(true);
      setError(null);

      const isArchive = identifier !== null;
      setIsArchiveGame(isArchive);
      console.log('[useGameWithInitialData] isArchive:', isArchive);

      // identifier can be a puzzle number, date string, or null for today
      console.log('[useGameWithInitialData] Calling puzzleService.getPuzzle with:', identifier);
      const response = await puzzleService.getPuzzle(identifier);
      console.log('[useGameWithInitialData] Response received:', response);

      if (response && response.puzzle) {
        console.log('[useGameWithInitialData] Response has puzzle:', response.puzzle);
        // Add puzzleNumber and date to the puzzle object if it's not there
        const puzzleWithData = {
          ...response.puzzle,
          puzzleNumber: response.puzzle.puzzleNumber || response.puzzleNumber,
          date: response.date || response.puzzle.date,
        };
        console.log('[useGameWithInitialData] Puzzle with data:', puzzleWithData);
        // Update current puzzle date from response
        setCurrentPuzzleDate(response.date);
        setPuzzle(puzzleWithData);
        setGameState(GAME_STATES.WELCOME);
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
        console.log('[useGameWithInitialData] Puzzle loaded successfully');
        return true;
      } else if (response) {
        console.log('[useGameWithInitialData] Response but no puzzle property:', response);
        // Update current puzzle date from response if available
        if (response.date) {
          setCurrentPuzzleDate(response.date);
        }
        setPuzzle(response);
        setGameState(GAME_STATES.WELCOME);
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
        console.error('[useGameWithInitialData] No response or empty response');
        setError('No puzzle available');
        return false;
      }
    } catch (err) {
      console.error('[useGameWithInitialData] Error loading puzzle:', err);
      console.error('[useGameWithInitialData] Error message:', err.message);
      console.error('[useGameWithInitialData] Error stack:', err.stack);
      setError(`Failed to load puzzle: ${err.message}`);
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
    setHintedAnswers([]);
    setUnlockedHints(1);
    setActiveHintIndex(null);
    setLockedLetters([null, null, null, null]);

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
      const locked = lockedLetters[index];

      let processedValue = value;

      // If we have locked letters, check if value is already properly formatted
      if (locked) {
        // Check if the value already has locked letters in their correct positions
        const hasLockedLettersInPlace = Object.keys(locked).every((pos) => {
          const position = parseInt(pos);
          return value[position] === locked[pos];
        });

        if (hasLockedLettersInPlace) {
          // Value is already properly formatted with locked letters in position
          processedValue = value;
        } else {
          // Value doesn't have locked letters in correct positions
          // Ensure locked letters are placed correctly
          const chars = value.split('');

          // Ensure the array is long enough
          const maxLockedPos = Math.max(...Object.keys(locked).map(Number));
          while (chars.length <= maxLockedPos) {
            chars.push(' ');
          }

          // Place locked letters at their positions
          Object.keys(locked).forEach((pos) => {
            const position = parseInt(pos);
            chars[position] = locked[pos];
          });

          processedValue = chars.join('');
        }
      }

      // Use different sanitization based on whether we have locked letters
      const sanitized = locked
        ? sanitizeInputPreserveSpaces(processedValue) // Preserve spaces for position-based input
        : sanitizeInput(processedValue); // Regular sanitization for normal input

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
      setGameState(GAME_STATES.COMPLETE);
      setWon(won);

      if (won) {
        playSuccessSound();
      } else {
        playFailureSound();
      }

      // Check if this is the first attempt for this puzzle (both daily and archive)
      const isFirstAttempt = currentPuzzleDate && !(await hasPlayedPuzzle(currentPuzzleDate));

      // Update stats through statsService (includes Game Center submission)
      try {
        console.log('[useGameWithInitialData] Calling statsService.updateStats');
        await statsService.updateStats({
          completed: won,
          mistakes,
          solved,
          hintsUsed,
          isArchive: isArchiveGame,
          puzzleDate: currentPuzzleDate,
          isFirstAttempt,
        });
        console.log('[useGameWithInitialData] statsService.updateStats completed');
      } catch (err) {
        console.error('[useGameWithInitialData] statsService.updateStats failed:', err);
        // Fall back to direct storage update if service fails
        updateGameStats(won, isFirstAttempt, isArchiveGame, currentPuzzleDate);
      }

      if (!isArchiveGame) {
        try {
          await puzzleService.submitCompletion({
            completed: won,
            time: 0,
            mistakes: mistakes,
          });
        } catch (err) {
          console.error('Failed to submit completion:', err);
        }
      }

      if (currentPuzzleDate) {
        savePuzzleResult(currentPuzzleDate, {
          won: won,
          completed: won,
          failed: !won,
          status: won ? 'completed' : 'failed',
          mistakes: mistakes,
          solved: solved,
          time: 0,
          hintsUsed: hintsUsed,
          attempted: true,
          isArchive: isArchiveGame, // Pass the archive flag to properly track puzzle type
        });
      }
    },
    [isArchiveGame, mistakes, solved, currentPuzzleDate, hintsUsed]
  );

  const checkSingleAnswer = useCallback(
    (index) => {
      if (correctAnswers[index]) {
        return { isCorrect: false, gameComplete: false };
      }

      const userAnswer = answers[index].trim();
      if (!userAnswer) {
        return { isCorrect: false, gameComplete: false };
      }

      const puzzleItem = puzzle.puzzles[index];
      const isCorrect = checkAnswerWithPlurals(userAnswer, puzzleItem.answer);

      if (isCorrect) {
        setCorrectAnswers((prev) => {
          const newCorrect = [...prev];
          newCorrect[index] = true;
          return newCorrect;
        });

        // Clear active hint if this answer is showing a hint
        if (activeHintIndex === index) {
          setActiveHintIndex(null);
        }

        // Clear locked letters for this answer since it's now correct
        setLockedLetters((prev) => {
          const newLocked = [...prev];
          newLocked[index] = null;
          return newLocked;
        });

        setSolved((prev) => {
          const newSolved = prev + 1;

          // Check if we should unlock second hint (after 2 correct answers)
          if (newSolved >= 2 && unlockedHints === 1) {
            setUnlockedHints(2);
            console.log('[checkSingleAnswer] Unlocked second hint!');
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
            lockedPositions[i] = userAnswerLower[i];
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

          // Update locked letters state
          setLockedLetters((prev) => {
            const newLocked = [...prev];
            newLocked[index] = lockedPositions;
            return newLocked;
          });

          // Update answer to show only locked letters
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
        const isCorrect = checkAnswerWithPlurals(answer, puzzleItem.answer);

        if (isCorrect) {
          newCorrectAnswers[index] = true;
          correct++;
          // Clear locked letters for correct answer
          newLockedLetters[index] = null;
        } else {
          incorrect++;
          newCheckedWrong[index] = true;

          // Check for letters in correct positions (smart hints)
          const correctAnswer = puzzleItem.answer.toLowerCase();
          const userAnswerLower = answer.trim().toLowerCase();
          const lockedPositions = {};

          // Compare character by character
          for (let i = 0; i < Math.min(userAnswerLower.length, correctAnswer.length); i++) {
            if (userAnswerLower[i] === correctAnswer[i]) {
              lockedPositions[i] = userAnswerLower[i];
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
      // Check if we can use a hint
      if (!puzzle || !puzzle.puzzles || hintsUsed >= unlockedHints) {
        console.log('[useHint] Cannot use hint:', {
          hasPuzzle: !!puzzle,
          hintsUsed,
          unlockedHints,
        });
        return false;
      }

      // Use the provided targetIndex if valid, otherwise find first unanswered
      let hintIndex = targetIndex;

      // Only fallback to first unanswered if targetIndex is not provided or already correct
      if (hintIndex === undefined || hintIndex === null || correctAnswers[hintIndex]) {
        // Find first unanswered puzzle as fallback
        hintIndex = correctAnswers.findIndex((correct) => !correct);
        if (hintIndex === -1) {
          console.log('[useHint] All puzzles already solved');
          return false;
        }
      }

      // Check if this answer already has a hint shown
      if (hintedAnswers.includes(hintIndex)) {
        console.log('[useHint] Answer already has hint shown:', hintIndex);
        // Allow showing hint again even if already used - just don't consume another hint
        // Just update the active hint index to show it again
        setActiveHintIndex(hintIndex);
        return true;
      }

      // Check if puzzle has hint data
      const puzzleHint = puzzle.puzzles[hintIndex].hint;
      if (!puzzleHint) {
        console.log('[useHint] No hint available for puzzle:', hintIndex);
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

      // Save progress
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

  // Function to end game (used for hard mode timeout)
  const endGame = useCallback((hasWon) => {
    setWon(hasWon);
    setGameState(GAME_STATES.COMPLETE);
    if (!hasWon) {
      playFailureSound();
    }
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
    endGame,
  };
}
