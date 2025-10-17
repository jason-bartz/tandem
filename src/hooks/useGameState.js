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

      // If we have locked letters, preserve them in their positions
      if (locked) {
        // For deletions with locked letters, the value should already be properly formatted
        // from the backspace handler, so just sanitize and save it
        if (value.includes(' ') || Object.keys(locked).some((pos) => value[pos] === locked[pos])) {
          // Value already has locked letters in position, just sanitize
          processedValue = value;
        } else {
          // This is new input, need to place characters around locked letters
          // Get all positions with locked letters
          const lockedPositions = Object.keys(locked)
            .map(Number)
            .sort((a, b) => a - b);
          const maxPos = Math.max(...lockedPositions);

          // Build a character array to work with positions
          const chars = new Array(Math.max(maxPos + 1, value.length)).fill(' ');

          // First, place all locked letters in their positions
          Object.keys(locked).forEach((pos) => {
            chars[parseInt(pos)] = locked[pos];
          });

          // Extract only user-entered (non-locked, non-space) characters from the input
          const userChars = [];
          for (let i = 0; i < value.length; i++) {
            const char = value[i];
            // Skip if this is a locked position or if it's a space
            if (!locked[i] && char !== ' ' && char !== locked[i]) {
              userChars.push(char);
            }
          }

          // Place user characters in non-locked positions only
          let userCharIndex = 0;
          for (let i = 0; i < chars.length && userCharIndex < userChars.length; i++) {
            if (!locked[i]) {
              chars[i] = userChars[userCharIndex];
              userCharIndex++;
            }
          }

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
