/**
 * Game state management hook
 * Handles core game state, answers, and progress tracking
 */

import { useState, useCallback } from 'react';
import { GAME_STATES, GAME_CONFIG } from '@/lib/constants';
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
  const [isArchiveGame, setIsArchiveGame] = useState(false);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(null);

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
  }, []);

  const updateAnswer = useCallback((index, value) => {
    const hint = activeHints[index];
    let processedValue = value;

    if (hint) {
      const hintLetter = hint.firstLetter;
      if (value.length === 0) {
        processedValue = hintLetter;
      } else if (!value.toUpperCase().startsWith(hintLetter)) {
        processedValue = hintLetter + value;
      } else if (value.toUpperCase() === hintLetter) {
        processedValue = hintLetter;
      }
    }

    const sanitized = sanitizeInput(processedValue);
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = sanitized;
      return newAnswers;
    });

    if (checkedWrongAnswers[index]) {
      setCheckedWrongAnswers(prev => {
        const newCheckedWrong = [...prev];
        newCheckedWrong[index] = false;
        return newCheckedWrong;
      });
    }
  }, [checkedWrongAnswers, activeHints]);

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
    isArchiveGame,
    setIsArchiveGame,
    currentPuzzleDate,
    setCurrentPuzzleDate,

    // Actions
    resetGameState,
    updateAnswer
  };
}