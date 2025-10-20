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

        // Clear locked letters for this answer since it's now correct
        setLockedLetters((prev) => {
          const newLocked = [...prev];
          newLocked[index] = null;
          return newLocked;
        });

        // Clear active hint if this answer is showing a hint
        if (activeHintIndex === index) {
          setActiveHintIndex(null);
        }

        const newSolved = solved + 1;
        setSolved(newSolved);

        // Check if we should unlock second hint (after 2 correct answers)
        if (newSolved >= 2 && unlockedHints === 1) {
          setUnlockedHints(2);
          console.log('[checkSingleAnswer] Unlocked second hint!');

          // Dispatch event for HintEarnedToast
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

        // Compare character by character
        for (let i = 0; i < Math.min(userAnswerLower.length, correctAnswer.length); i++) {
          if (userAnswerLower[i] === correctAnswer[i]) {
            lockedPositions[i] = userAnswerLower[i];
          }
        }

        // Update locked letters if we found any matches
        if (Object.keys(lockedPositions).length > 0) {
          setLockedLetters((prev) => {
            const newLocked = [...prev];
            newLocked[index] = lockedPositions;
            return newLocked;
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
            // Clear locked letters for correct answer
            newLockedLetters[i] = null;
          } else {
            // Check for letters in correct positions (smart hints)
            const correctAnswer = p.answer.toLowerCase();
            const userAnswerLower = userAnswer.toLowerCase();
            const lockedPositions = {};

            // Compare character by character
            for (let j = 0; j < Math.min(userAnswerLower.length, correctAnswer.length); j++) {
              if (userAnswerLower[j] === correctAnswer[j]) {
                lockedPositions[j] = userAnswerLower[j];
              }
            }

            // Store locked letters if we found any matches
            if (Object.keys(lockedPositions).length > 0) {
              newLockedLetters[i] = lockedPositions;
            }

            if (!checkedWrongAnswers[i]) {
              newMistakes++;
            }
            newCheckedWrongAnswers[i] = true;
          }
        }
      });

      // Update locked letters state
      setLockedLetters(newLockedLetters);

      setCorrectAnswers(newCorrectAnswers);
      setCheckedWrongAnswers(newCheckedWrongAnswers);
      setMistakes((prev) => prev + newMistakes);
      setSolved(newSolved);

      // Check if we should unlock second hint (after 2 correct answers)
      if (newSolved >= 2 && unlockedHints === 1) {
        setUnlockedHints(2);
        console.log('[checkAnswers] Unlocked second hint!');

        // Dispatch event for HintEarnedToast
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

        // Dispatch event for HintEarnedToast
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hintEarned'));
        }
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

  return {
    checkSingleAnswer,
    checkAnswers,
    useHint,
  };
}
