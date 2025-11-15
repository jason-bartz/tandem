/**
 * Game logic hook
 * Handles answer checking, hints, and game completion
 */

import { useCallback } from 'react';
import { GAME_CONFIG } from '@/lib/constants';
import { checkAnswerWithPlurals } from '@/lib/utils';
import { savePuzzleProgress } from '@/lib/storage';

export function useGameLogic(
  puzzle,
  answers,
  correctAnswers,
  checkedWrongAnswers,
  mistakes,
  solved,
  hintsUsed,
  hintedAnswers,
  unlockedHints,
  activeHintIndex,
  currentPuzzleDate,
  setters
) {
  const {
    setAnswers,
    setCorrectAnswers,
    setCheckedWrongAnswers,
    setMistakes,
    setSolved,
    setHintsUsed,
    setHintedAnswers,
    setUnlockedHints,
    setActiveHintIndex,
    setHasCheckedAnswers,
    setLockedLetters,
  } = setters;

  const checkSingleAnswer = useCallback(
    (index, onComplete) => {
      if (!puzzle || !puzzle.puzzles || !puzzle.puzzles[index]) {
        return { isCorrect: false, gameComplete: false };
      }

      if (correctAnswers[index]) {
        return { isCorrect: true, gameComplete: false };
      }

      // Don't trim if we have locked letters, as positions matter
      const hasLockedLetters = lockedLetters && lockedLetters[index];
      const userAnswer = hasLockedLetters ? answers[index] : answers[index].trim();
      if (!userAnswer || !userAnswer.trim()) {
        return { isCorrect: false, gameComplete: false };
      }

      const isCorrect = checkAnswerWithPlurals(userAnswer.trim(), puzzle.puzzles[index].answer);

      if (isCorrect) {
        const newCorrectAnswers = [...correctAnswers];
        newCorrectAnswers[index] = true;
        setCorrectAnswers(newCorrectAnswers);

        if (checkedWrongAnswers[index]) {
          const newCheckedWrongAnswers = [...checkedWrongAnswers];
          newCheckedWrongAnswers[index] = false;
          setCheckedWrongAnswers(newCheckedWrongAnswers);
        }

        setLockedLetters((prev) => {
          const newLocked = [...prev];
          newLocked[index] = null;
          return newLocked;
        });

        if (activeHintIndex === index) {
          setActiveHintIndex(null);
        }

        const newSolved = solved + 1;
        setSolved(newSolved);

        if (newSolved >= 2 && unlockedHints === 1) {
          setUnlockedHints(2);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hintEarned'));
          }
        }

        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            started: true,
            solved: newSolved,
            mistakes,
            hintsUsed,
          });
        }

        if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
          onComplete(true);
          return { isCorrect: true, gameComplete: true };
        }

        return { isCorrect: true, gameComplete: false };
      } else {
        // Check for letters in correct positions (smart hints)
        const correctAnswer = puzzle.puzzles[index].answer.toLowerCase();
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
        // and update the answers state
        if (Object.keys(lockedPositions).length > 0) {
          let newAnswer = '';
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
          // No matching letters, clear the input
          setAnswers((prev) => {
            const newAnswers = [...prev];
            newAnswers[index] = '';
            return newAnswers;
          });
        }

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
              hintsUsed,
            });
          }

          if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
            onComplete(false);
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
    ]
  );

  const checkAnswers = useCallback(
    (onComplete) => {
      if (!puzzle || !puzzle.puzzles) {
        return { correct: 0, incorrect: 0 };
      }

      setHasCheckedAnswers(true);

      let newMistakes = 0;
      let newSolved = 0;
      const newCorrectAnswers = [...correctAnswers];
      const newCheckedWrongAnswers = [...checkedWrongAnswers];
      const newLockedLetters = [...Array(4)].map(() => null);
      const newAnswers = [...answers];

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

            newLockedLetters[i] = null;
          } else {
            // Check for letters in correct positions (smart hints)
            const correctAnswer = p.answer.toLowerCase();
            const userAnswerLower = userAnswer.toLowerCase();
            const lockedPositions = {};

            // Compare character by character
            for (let j = 0; j < Math.min(userAnswerLower.length, correctAnswer.length); j++) {
              if (userAnswerLower[j] === correctAnswer[j]) {
                // Store uppercase version for consistency with sanitized input
                lockedPositions[j] = userAnswerLower[j].toUpperCase();
              }
            }

            // Build new answer with only locked letters
            if (Object.keys(lockedPositions).length > 0) {
              let lockedAnswer = '';
              for (let j = 0; j < correctAnswer.length; j++) {
                if (lockedPositions[j]) {
                  lockedAnswer += lockedPositions[j];
                } else {
                  lockedAnswer += ' ';
                }
              }
              newLockedLetters[i] = lockedPositions;
              newAnswers[i] = lockedAnswer;
            } else {
              // No matching letters, clear the input
              newAnswers[i] = '';
            }

            if (!checkedWrongAnswers[i]) {
              newMistakes++;
            }
            newCheckedWrongAnswers[i] = true;
          }
        }
      });

      setAnswers(newAnswers);
      setLockedLetters(newLockedLetters);

      setCorrectAnswers(newCorrectAnswers);
      setCheckedWrongAnswers(newCheckedWrongAnswers);
      setMistakes((prev) => prev + newMistakes);
      setSolved(newSolved);

      if (newSolved >= 2 && unlockedHints === 1) {
        setUnlockedHints(2);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hintEarned'));
        }
      }

      if (currentPuzzleDate) {
        savePuzzleProgress(currentPuzzleDate, {
          started: true,
          solved: newSolved,
          mistakes: mistakes + newMistakes,
          hintsUsed,
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
    ]
  );

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

      setHintedAnswers((prev) => [...prev, hintIndex]);
      setActiveHintIndex(hintIndex);
      setHintsUsed((prev) => prev + 1);

      if (solved >= 2 && unlockedHints === 1) {
        setUnlockedHints(2);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hintEarned'));
        }
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

  return {
    checkSingleAnswer,
    checkAnswers,
    useHint,
  };
}
