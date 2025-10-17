import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import { sanitizeInput, checkAnswerWithPlurals, getCorrectPositions } from '@/lib/utils';
import {
  savePuzzleProgress,
  savePuzzleResult,
  updateGameStats,
  hasPlayedPuzzle,
} from '@/lib/storage';
import { playFailureSound, playSuccessSound } from '@/lib/sounds';

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
  const [error, setError] = useState(initialPuzzleData ? null : 'Failed to load puzzle');
  const [isArchiveGame, setIsArchiveGame] = useState(false);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(initialPuzzleData?.date || null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hasCheckedAnswers, setHasCheckedAnswers] = useState(false);
  const [checkedWrongAnswers, setCheckedWrongAnswers] = useState([false, false, false, false]);
  const [won, setWon] = useState(false);
  const [activeHints, setActiveHints] = useState([null, null, null, null]);
  const [hintPositionsUsed, setHintPositionsUsed] = useState([false, false, false, false]);
  const [lockedLetters, setLockedLetters] = useState([null, null, null, null]);
  const [isHardMode, setIsHardMode] = useState(false);
  const [hardModeTimeUp, setHardModeTimeUp] = useState(false);

  // Only load puzzle if we don't have initial data
  useEffect(() => {
    if (!initialPuzzleData) {
      async function loadPuzzle() {
        try {
          const today = new Date().toISOString().split('T')[0];
          setCurrentPuzzleDate(today);

          const response = await puzzleService.getPuzzle();

          if (response && response.puzzle) {
            // Add puzzleNumber and date to the puzzle object if it's not there
            const puzzleWithData = {
              ...response.puzzle,
              puzzleNumber: response.puzzle.puzzleNumber || response.puzzleNumber,
              date: response.date || today,
            };
            setPuzzle(puzzleWithData);
            setError(null);
          } else if (response) {
            setPuzzle(response);
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
        setActiveHints([null, null, null, null]);
        setHintPositionsUsed([false, false, false, false]);
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
        setActiveHints([null, null, null, null]);
        setHintPositionsUsed([false, false, false, false]);
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
    setActiveHints([null, null, null, null]);
    setHintPositionsUsed([false, false, false, false]);
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
      const hint = activeHints[index];
      const locked = lockedLetters[index];

      // Get the full answer length from puzzle data
      const puzzleItem = puzzle?.puzzles?.[index];
      const fullAnswer = puzzleItem?.answer
        ? puzzleItem.answer.includes(',')
          ? puzzleItem.answer.split(',')[0].trim()
          : puzzleItem.answer
        : null;
      const answerLength = fullAnswer ? fullAnswer.length : 15;

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
          // This comes from our keyboard handlers or backspace handler
          processedValue = value;
        } else {
          // Value doesn't have locked letters in correct positions
          // This shouldn't happen with our current implementation, but handle it as a fallback
          // Build a character array to the FULL answer length
          const chars = new Array(answerLength).fill(' ');

          // Copy non-space characters from value, but not at locked positions
          for (let i = 0; i < value.length && i < answerLength; i++) {
            if (!locked[i] && value[i] !== ' ') {
              chars[i] = value[i];
            }
          }

          // Ensure locked letters are at their positions
          Object.keys(locked).forEach((pos) => {
            const position = parseInt(pos);
            if (position < answerLength) {
              chars[position] = locked[pos];
            }
          });

          processedValue = chars.join('');
        }
      }

      if (hint) {
        const hintLetter = hint.firstLetter;
        if (processedValue.length === 0) {
          processedValue = hintLetter;
        } else if (!processedValue.toUpperCase().startsWith(hintLetter)) {
          processedValue = hintLetter + processedValue;
        } else if (processedValue.toUpperCase() === hintLetter) {
          processedValue = hintLetter;
        }
      }

      const sanitized = sanitizeInput(processedValue);
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
    [checkedWrongAnswers, activeHints, lockedLetters, puzzle]
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

      // Update stats with proper parameters
      updateGameStats(won, isFirstAttempt, isArchiveGame, currentPuzzleDate);

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
          hintPositionsUsed: hintPositionsUsed,
          attempted: true,
        });
      }
    },
    [isArchiveGame, mistakes, solved, currentPuzzleDate, hintsUsed, hintPositionsUsed]
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

        // Clear hint and locked letters for this puzzle if they were active
        if (activeHints[index]) {
          const newActiveHints = [...activeHints];
          newActiveHints[index] = null;
          setActiveHints(newActiveHints);
        }

        if (lockedLetters[index]) {
          const newLockedLetters = [...lockedLetters];
          newLockedLetters[index] = null;
          setLockedLetters(newLockedLetters);
        }

        setSolved((prev) => {
          const newSolved = prev + 1;

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
        // Check for correct positions (new mechanic)
        const correctPositions = getCorrectPositions(userAnswer, puzzleItem.answer);

        if (correctPositions) {
          // We have some letters in correct positions!
          // Update locked letters for this puzzle
          setLockedLetters((prev) => {
            const newLockedLetters = [...prev];
            newLockedLetters[index] = correctPositions;
            return newLockedLetters;
          });

          // Build the new answer with only locked letters, preserving positions
          setAnswers((prev) => {
            const newAnswers = [...prev];
            // Get the full answer length
            const fullAnswer = puzzleItem.answer.includes(',')
              ? puzzleItem.answer.split(',')[0].trim()
              : puzzleItem.answer;
            const answerLength = fullAnswer.length;

            // Build string with spaces to preserve positions, using full answer length
            let newAnswer = '';
            for (let i = 0; i < answerLength; i++) {
              if (correctPositions[i]) {
                newAnswer += correctPositions[i];
              } else {
                // Use empty string (will be trimmed for display)
                newAnswer += ' ';
              }
            }
            newAnswers[index] = newAnswer;
            return newAnswers;
          });
        } else {
          // No correct positions, clear the answer
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
      activeHints,
      lockedLetters,
    ]
  );

  const checkAnswers = useCallback(() => {
    let correct = 0;
    let incorrect = 0;
    const newCorrectAnswers = [...correctAnswers];
    const newCheckedWrong = [...checkedWrongAnswers];

    setHasCheckedAnswers(true);

    answers.forEach((answer, index) => {
      if (!correctAnswers[index] && answer.trim()) {
        const puzzleItem = puzzle.puzzles[index];
        const isCorrect = checkAnswerWithPlurals(answer, puzzleItem.answer);

        if (isCorrect) {
          newCorrectAnswers[index] = true;
          correct++;
        } else {
          incorrect++;
          newCheckedWrong[index] = true;
        }
      }
    });

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
  ]);

  const useHint = useCallback(
    (_targetIndex) => {
      if (!puzzle || !puzzle.puzzles || hintsUsed > 0) {
        return;
      }

      // Find the next unfilled position level across all answers
      // For example, if all first positions are filled (via hints or locked letters),
      // move to the second position, and so on

      let hintPosition = 0;
      let candidateIndices = [];

      // Find all unanswered puzzles
      const unansweredIndices = [];
      for (let i = 0; i < puzzle.puzzles.length; i++) {
        if (!correctAnswers[i]) {
          unansweredIndices.push(i);
        }
      }

      if (unansweredIndices.length === 0) {
        return;
      }

      // Determine which position to hint at by finding the first unfilled position across all answers
      const maxAnswerLength = Math.max(
        ...puzzle.puzzles.map((p) => {
          const ans = p.answer.includes(',') ? p.answer.split(',')[0].trim() : p.answer;
          return ans.length;
        })
      );

      for (let pos = 0; pos < maxAnswerLength; pos++) {
        candidateIndices = [];

        for (const idx of unansweredIndices) {
          const locked = lockedLetters[idx];
          const answer = answers[idx];

          // Check if this position is already filled (either locked or in answer)
          const isPositionFilled = (locked && locked[pos]) || (answer && answer.length > pos);

          if (!isPositionFilled) {
            candidateIndices.push(idx);
          }
        }

        // If we found puzzles with this position unfilled, use this position
        if (candidateIndices.length > 0) {
          hintPosition = pos;
          break;
        }
      }

      // If no unfilled positions found (shouldn't happen), just use first unanswered puzzle
      if (candidateIndices.length === 0) {
        candidateIndices = unansweredIndices;
        hintPosition = 0;
      }

      // Randomly select one of the candidates
      const hintIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];

      // Get the answer and create hint data
      const fullAnswer = puzzle.puzzles[hintIndex].answer;
      const firstAnswer = fullAnswer.includes(',') ? fullAnswer.split(',')[0].trim() : fullAnswer;

      // Create hint data with the appropriate position letter
      const hintLetter = firstAnswer.charAt(hintPosition).toUpperCase();
      const hintData = {
        firstLetter: hintLetter,
        position: hintPosition,
        length: firstAnswer.length,
        fullAnswer: firstAnswer.toUpperCase(),
      };

      // Update active hints
      const newActiveHints = [...activeHints];
      newActiveHints[hintIndex] = hintData;
      setActiveHints(newActiveHints);

      // Mark this position as having used a hint (this won't be cleared)
      const newHintPositions = [...hintPositionsUsed];
      newHintPositions[hintIndex] = true;
      setHintPositionsUsed(newHintPositions);

      // Update the answer to include the hint letter at the correct position
      const newAnswers = [...answers];
      const currentAnswer = answers[hintIndex] || '';
      const locked = lockedLetters[hintIndex];

      // Build new answer with hint letter at the right position
      let newAnswer = '';
      for (let i = 0; i <= hintPosition; i++) {
        if (locked && locked[i]) {
          newAnswer += locked[i];
        } else if (i === hintPosition) {
          newAnswer += hintLetter;
        } else if (i < currentAnswer.length) {
          newAnswer += currentAnswer[i];
        } else {
          newAnswer += '';
        }
      }
      newAnswers[hintIndex] = newAnswer;
      setAnswers(newAnswers);

      setHintsUsed(1);

      // Save progress with hint usage
      if (currentPuzzleDate) {
        savePuzzleProgress(currentPuzzleDate, {
          started: true,
          solved,
          mistakes,
          hintsUsed: 1,
        });
      }
    },
    [
      puzzle,
      correctAnswers,
      hintsUsed,
      activeHints,
      hintPositionsUsed,
      lockedLetters,
      answers,
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
    setActiveHints([null, null, null, null]);
    setHintPositionsUsed([false, false, false, false]);
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
    activeHints,
    hintPositionsUsed,
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
