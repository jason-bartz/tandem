/**
 * Game logic hook
 * Handles answer checking, hints, and game completion
 */

import { useCallback } from 'react';
import { GAME_CONFIG } from '@/lib/constants';
import { checkAnswerWithPlurals } from '@/lib/utils';
import { savePuzzleProgress } from '@/lib/storage';
import logger from '@/lib/logger';

export function useGameLogic(
  puzzle,
  answers,
  correctAnswers,
  checkedWrongAnswers,
  mistakes,
  solved,
  hintsUsed,
  activeHints,
  currentPuzzleDate,
  setters
) {
  const {
    setCorrectAnswers,
    setCheckedWrongAnswers,
    setMistakes,
    setSolved,
    setHintsUsed,
    setActiveHints,
    setAnswers,
    setHasCheckedAnswers
  } = setters;

  const checkSingleAnswer = useCallback((index, onComplete) => {
    if (!puzzle || !puzzle.puzzles || !puzzle.puzzles[index]) {
      return { isCorrect: false, gameComplete: false };
    }

    if (correctAnswers[index]) {
      return { isCorrect: true, gameComplete: false };
    }

    const userAnswer = answers[index].trim();
    if (!userAnswer) {
      return { isCorrect: false, gameComplete: false };
    }

    const isCorrect = checkAnswerWithPlurals(userAnswer, puzzle.puzzles[index].answer);

    if (isCorrect) {
      const newCorrectAnswers = [...correctAnswers];
      newCorrectAnswers[index] = true;
      setCorrectAnswers(newCorrectAnswers);

      if (checkedWrongAnswers[index]) {
        const newCheckedWrongAnswers = [...checkedWrongAnswers];
        newCheckedWrongAnswers[index] = false;
        setCheckedWrongAnswers(newCheckedWrongAnswers);
      }

      if (activeHints[index]) {
        const newActiveHints = [...activeHints];
        newActiveHints[index] = null;
        setActiveHints(newActiveHints);
      }

      const newSolved = solved + 1;
      setSolved(newSolved);

      if (currentPuzzleDate) {
        savePuzzleProgress(currentPuzzleDate, {
          started: true,
          solved: newSolved,
          mistakes,
          hintsUsed
        });
      }

      if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
        onComplete(true);
        return { isCorrect: true, gameComplete: true };
      }

      return { isCorrect: true, gameComplete: false };
    } else {
      if (!checkedWrongAnswers[index]) {
        const newCheckedWrongAnswers = [...checkedWrongAnswers];
        newCheckedWrongAnswers[index] = true;
        setCheckedWrongAnswers(newCheckedWrongAnswers);

        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);

        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            started: true,
            solved,
            mistakes: newMistakes,
            hintsUsed
          });
        }

        if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
          onComplete(false);
          return { isCorrect: false, gameComplete: true };
        }
      }

      return { isCorrect: false, gameComplete: false };
    }
  }, [puzzle, answers, correctAnswers, checkedWrongAnswers, mistakes, solved, currentPuzzleDate, hintsUsed, activeHints]);

  const checkAnswers = useCallback((onComplete) => {
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
          newCheckedWrongAnswers[i] = false;
          newSolved++;
        } else {
          if (!checkedWrongAnswers[i]) {
            newMistakes++;
          }
          newCheckedWrongAnswers[i] = true;
        }
      }
    });

    setCorrectAnswers(newCorrectAnswers);
    setCheckedWrongAnswers(newCheckedWrongAnswers);
    setMistakes(prev => prev + newMistakes);
    setSolved(newSolved);

    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: newSolved,
        mistakes: mistakes + newMistakes,
        hintsUsed
      });
    }

    if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
      onComplete(true);
    } else if (mistakes + newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
      onComplete(false);
    }

    return {
      correct: newSolved - solved,
      incorrect: newMistakes,
    };
  }, [puzzle, answers, correctAnswers, checkedWrongAnswers, mistakes, solved, currentPuzzleDate, hintsUsed]);

  const useHint = useCallback((targetIndex) => {
    if (!puzzle || !puzzle.puzzles || hintsUsed > 0) {
      return;
    }

    let hintIndex = targetIndex;

    if (hintIndex === undefined || hintIndex === null || correctAnswers[hintIndex]) {
      const unansweredIndices = [];
      for (let i = 0; i < puzzle.puzzles.length; i++) {
        if (!correctAnswers[i]) {
          unansweredIndices.push(i);
        }
      }

      if (unansweredIndices.length === 0) {
        return;
      }

      hintIndex = unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
    }

    const fullAnswer = puzzle.puzzles[hintIndex].answer;
    const firstAnswer = fullAnswer.includes(',')
      ? fullAnswer.split(',')[0].trim()
      : fullAnswer;

    const hintData = {
      firstLetter: firstAnswer.charAt(0).toUpperCase(),
      length: firstAnswer.length,
      fullAnswer: firstAnswer.toUpperCase()
    };

    const newActiveHints = [...activeHints];
    newActiveHints[hintIndex] = hintData;
    setActiveHints(newActiveHints);

    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[hintIndex] = hintData.firstLetter;
      return newAnswers;
    });

    setHintsUsed(1);

    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved,
        mistakes,
        hintsUsed: 1
      });
    }
  }, [puzzle, correctAnswers, hintsUsed, activeHints, currentPuzzleDate, solved, mistakes]);

  return {
    checkSingleAnswer,
    checkAnswers,
    useHint
  };
}