import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import statsService from '@/services/stats.service';
import { sanitizeInput } from '@/lib/utils';
import { savePuzzleProgress, savePuzzleResult } from '@/lib/storage';

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

  // Simple load puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      try {
        // Set today's date as the current puzzle date
        const today = new Date().toISOString().split('T')[0];
        setCurrentPuzzleDate(today);
        
        const response = await puzzleService.getPuzzle();
        
        if (response && response.puzzle) {
          setPuzzle(response.puzzle);
        } else if (response) {
          // Maybe the response IS the puzzle
          setPuzzle(response);
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
      
      // Set the current puzzle date (use today if not specified)
      const puzzleDate = date || new Date().toISOString().split('T')[0];
      setCurrentPuzzleDate(puzzleDate);
      
      const response = await puzzleService.getPuzzle(date);
      
      if (response && response.puzzle) {
        setPuzzle(response.puzzle);
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setCheckedWrongAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        return true;
      } else if (response) {
        setPuzzle(response);
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setCheckedWrongAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
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
    
    // Save initial progress to mark as attempted
    if (currentPuzzleDate) {
      savePuzzleProgress(currentPuzzleDate, {
        started: true,
        solved: 0,
        mistakes: 0,
        hintsUsed: 0
      });
    }
  }, [puzzle, currentPuzzleDate]);

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

      const userAnswer = answers[i].trim().toUpperCase();
      if (userAnswer) {
        if (userAnswer === p.answer.toUpperCase()) {
          newCorrectAnswers[i] = true;
          newCheckedWrongAnswers[i] = false; // Clear wrong status if now correct
          newSolved++;
        } else {
          newMistakes++;
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
  }, [puzzle, answers, correctAnswers, checkedWrongAnswers, mistakes, solved, currentPuzzleDate, hintsUsed]);

  const completeGame = useCallback(async (won) => {
    setGameState(GAME_STATES.COMPLETE);
    
    // Save the final result
    if (currentPuzzleDate) {
      savePuzzleResult(currentPuzzleDate, {
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
        isArchive: isArchiveGame, // Pass archive flag to stats service
      });
    } catch (err) {
      // Silently fail saving stats
    }
  }, [mistakes, solved, hintsUsed, isArchiveGame, currentPuzzleDate]);

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
  }, []);
  
  const useHint = useCallback(() => {
    if (!puzzle || !puzzle.puzzles || hintsUsed > 0) {
      return;
    }
    
    // Find all unanswered puzzles
    const unansweredIndices = [];
    for (let i = 0; i < puzzle.puzzles.length; i++) {
      if (!correctAnswers[i] && !answers[i]) {
        unansweredIndices.push(i);
      }
    }
    
    // If there are unanswered puzzles, randomly select one
    if (unansweredIndices.length > 0) {
      const randomIndex = unansweredIndices[Math.floor(Math.random() * unansweredIndices.length)];
      
      const newAnswers = [...answers];
      newAnswers[randomIndex] = puzzle.puzzles[randomIndex].answer;
      setAnswers(newAnswers);
      
      const newCorrectAnswers = [...correctAnswers];
      newCorrectAnswers[randomIndex] = true;
      setCorrectAnswers(newCorrectAnswers);
      
      setSolved(prev => prev + 1);
      setHintsUsed(1);
      
      // Check if game is complete
      if (solved + 1 === GAME_CONFIG.PUZZLE_COUNT) {
        completeGame(true);
      }
    }
  }, [puzzle, answers, correctAnswers, hintsUsed, solved, completeGame]);

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
    startGame,
    updateAnswer,
    checkAnswers,
    completeGame,
    resetGame,
    loadPuzzle,
    useHint,
  };
}