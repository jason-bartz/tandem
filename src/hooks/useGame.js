import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import statsService from '@/services/stats.service';
import { sanitizeInput, checkAnswerWithPlurals, getCurrentPuzzleInfo } from '@/lib/utils';
import { savePuzzleProgress, savePuzzleResult, hasPlayedPuzzle } from '@/lib/storage';
import { playFailureSound, playSuccessSound } from '@/lib/sounds';

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
  const [activeHints, setActiveHints] = useState([null, null, null, null]);

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
      
      console.log('[useGame] loadPuzzle response:', {
        date,
        puzzleDate,
        isArchive,
        response: response ? 'exists' : 'null'
      });
      
      if (response && response.puzzle) {
        setPuzzle({ ...response.puzzle, date: puzzleDate }); // Add date to puzzle
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setCheckedWrongAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        setActiveHints([null, null, null, null]);
        return true;
      } else if (response) {
        setPuzzle({ ...response, date: puzzleDate }); // Add date to puzzle
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
    
    console.log('[useGame] startGame called:', {
      currentPuzzleDate,
      isArchiveGame,
      puzzle: puzzle?.date || 'no date in puzzle'
    });
    
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
        hintsUsed: 0
      });
    }
  }, [puzzle, currentPuzzleDate, isArchiveGame]);

  const updateAnswer = useCallback((index, value) => {
    const sanitized = sanitizeInput(value);
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = sanitized;
      return newAnswers;
    });
    // Clear the wrong status when user starts typing again
    if (checkedWrongAnswers[index]) {
      setCheckedWrongAnswers(prev => {
        const newCheckedWrong = [...prev];
        newCheckedWrong[index] = false;
        return newCheckedWrong;
      });
    }
  }, [checkedWrongAnswers]);

  const completeGame = useCallback(async (won) => {
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
    const isFirstAttempt = puzzleDateToUse ? !hasPlayedPuzzle(puzzleDateToUse) : true;
    
    console.log('[useGame] completeGame:', {
      currentPuzzleDate,
      puzzleDateToUse,
      puzzleDate: puzzle?.date,
      isArchiveGame,
      isArchive,
      isFirstAttempt,
      won,
      hasPlayedBefore: puzzleDateToUse ? hasPlayedPuzzle(puzzleDateToUse) : false
    });
    
    // Save the final result
    if (puzzleDateToUse) {
      savePuzzleResult(puzzleDateToUse, {
        won,
        mistakes,
        solved,
        hintsUsed,
        time: null // Could add time tracking if needed
      });
    }
    
    try {
      await statsService.updateStats({
        completed: won,
        mistakes,
        solved,
        hintsUsed,
        isArchive: isArchive, // Pass archive flag to stats service
        puzzleDate: puzzleDateToUse, // Pass the puzzle date for streak tracking
        isFirstAttempt, // Pass the first attempt flag directly
      });
    } catch (err) {
      // Silently fail saving stats
      console.error('[useGame] Failed to save stats:', err);
    }
  }, [mistakes, solved, hintsUsed, isArchiveGame, currentPuzzleDate, puzzle]);

  const checkSingleAnswer = useCallback((index) => {
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
      
      // Clear hint for this puzzle if it was active
      if (activeHints[index]) {
        const newActiveHints = [...activeHints];
        newActiveHints[index] = null;
        setActiveHints(newActiveHints);
      }
      
      // Update solved count
      const newSolved = solved + 1;
      setSolved(newSolved);
      
      // Save progress
      if (currentPuzzleDate) {
        savePuzzleProgress(currentPuzzleDate, {
          started: true,
          solved: newSolved,
          mistakes,
          hintsUsed
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
            hintsUsed
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
  }, [puzzle, answers, correctAnswers, checkedWrongAnswers, mistakes, solved, currentPuzzleDate, hintsUsed, activeHints]);

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
    setMistakes(prev => prev + newMistakes);
    setSolved(newSolved);

    // Save progress after checking answers
    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: newSolved,
        mistakes: mistakes + newMistakes,
        hintsUsed
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
  }, [puzzle, answers, correctAnswers, checkedWrongAnswers, mistakes, solved, currentPuzzleDate, hintsUsed, activeHints]);

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
    setActiveHints([null, null, null, null]);
  }, []);
  
  const useHint = useCallback((targetIndex) => {
    if (!puzzle || !puzzle.puzzles || hintsUsed > 0) {
      return;
    }
    
    // Use the provided index or find a random unanswered puzzle
    let hintIndex = targetIndex;
    
    if (hintIndex === undefined || hintIndex === null || correctAnswers[hintIndex]) {
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
      
      // Randomly select one
      hintIndex = unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
    }
    
    // Get the answer and create hint data
    const fullAnswer = puzzle.puzzles[hintIndex].answer;
    const firstAnswer = fullAnswer.includes(',') 
      ? fullAnswer.split(',')[0].trim() 
      : fullAnswer;
    
    // Create hint data with first letter and character count
    const hintData = {
      firstLetter: firstAnswer.charAt(0).toUpperCase(),
      length: firstAnswer.length,
      fullAnswer: firstAnswer.toUpperCase()
    };
    
    // Update active hints
    const newActiveHints = [...activeHints];
    newActiveHints[hintIndex] = hintData;
    setActiveHints(newActiveHints);
    
    setHintsUsed(1);
    
    // Save progress with hint usage
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
    hasCheckedAnswers,
    activeHints,
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