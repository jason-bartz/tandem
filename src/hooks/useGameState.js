/**
 * Game state management hook
 * Handles core game state, answers, and progress tracking
 */

import { useState, useCallback } from 'react';
import { GAME_STATES } from '@/lib/constants';
import { sanitizeInput } from '@/lib/utils';

export function useGameState() {
  const [gameState, setGameState] = useState(GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState([false, false, false, false]);
  const [checkedWrongAnswers, setCheckedWrongAnswers] = useState([false, false, false, false]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hasCheckedAnswers, setHasCheckedAnswers] = useState(false);
  const [activeHints, setActiveHints] = useState([null, null, null, null]);
  const [lockedLetters, setLockedLetters] = useState([null, null, null, null]);
  const [isArchiveGame, setIsArchiveGame] = useState(false);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(null);
  const [isHardMode, setIsHardMode] = useState(false);
  const [hardModeTimeUp, setHardModeTimeUp] = useState(false);

  const resetGameState = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
    setActiveHints([null, null, null, null]);
    setLockedLetters([null, null, null, null]);
    setHardModeTimeUp(false);
    // Note: We don't reset isHardMode here as it's a preference
  }, []);

  const updateAnswer = useCallback(
    (index, value) => {
      const hint = activeHints[index];
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
          // This comes from our keyboard handlers or backspace handler
          processedValue = value;
        } else {
          // Value doesn't have locked letters in correct positions
          // This shouldn't happen with our current implementation, but handle it as a fallback
          // Just ensure locked letters are placed correctly
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
    [checkedWrongAnswers, activeHints, lockedLetters]
  );

  return {
    // State
    gameState,
    setGameState,
    puzzle,
    setPuzzle,
    answers,
    setAnswers,
    correctAnswers,
    setCorrectAnswers,
    checkedWrongAnswers,
    setCheckedWrongAnswers,
    mistakes,
    setMistakes,
    solved,
    setSolved,
    hintsUsed,
    setHintsUsed,
    hasCheckedAnswers,
    setHasCheckedAnswers,
    activeHints,
    setActiveHints,
    lockedLetters,
    setLockedLetters,
    isArchiveGame,
    setIsArchiveGame,
    currentPuzzleDate,
    setCurrentPuzzleDate,
    isHardMode,
    setIsHardMode,
    hardModeTimeUp,
    setHardModeTimeUp,

    // Actions
    resetGameState,
    updateAnswer,
  };
}
