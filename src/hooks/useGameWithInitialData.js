import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import { sanitizeInput, checkAnswerWithPlurals } from '@/lib/utils';
import { savePuzzleProgress, savePuzzleResult, updateGameStats, hasPlayedToday } from '@/lib/storage';
import { playFailureSound, playSuccessSound } from '@/lib/sounds';

export function useGameWithInitialData(initialPuzzleData) {
  const [gameState, setGameState] = useState(GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(initialPuzzleData?.puzzle || null);
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

  // Only load puzzle if we don't have initial data
  useEffect(() => {
    if (!initialPuzzleData) {
      async function loadPuzzle() {
        try {
          const today = new Date().toISOString().split('T')[0];
          setCurrentPuzzleDate(today);
          
          const response = await puzzleService.getPuzzle();
          
          if (response && response.puzzle) {
            // Add puzzleNumber to the puzzle object if it's not there
            const puzzleWithNumber = {
              ...response.puzzle,
              puzzleNumber: response.puzzle.puzzleNumber || response.puzzleNumber
            };
            setPuzzle(puzzleWithNumber);
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
  const loadPuzzle = useCallback(async (date = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const isArchive = date !== null;
      setIsArchiveGame(isArchive);
      
      const puzzleDate = date || new Date().toISOString().split('T')[0];
      setCurrentPuzzleDate(puzzleDate);
      
      const response = await puzzleService.getPuzzle(date);
      
      if (response && response.puzzle) {
        // Add puzzleNumber to the puzzle object if it's not there
        const puzzleWithNumber = {
          ...response.puzzle,
          puzzleNumber: response.puzzle.puzzleNumber || response.puzzleNumber
        };
        setPuzzle(puzzleWithNumber);
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
    setWon(won);
    
    if (won) {
      playSuccessSound();
    } else {
      playFailureSound();
    }
    
    // Check if this is the first attempt for today's puzzle
    const today = new Date().toISOString().split('T')[0];
    const isFirstAttempt = !isArchiveGame && currentPuzzleDate === today && !hasPlayedToday();
    
    // Update stats with proper parameters
    updateGameStats(won, isFirstAttempt, isArchiveGame);
    
    if (!isArchiveGame) {
      try {
        await puzzleService.submitCompletion({
          completed: won,
          time: 0,
          mistakes: mistakes
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
        attempted: true
      });
    }
  }, [isArchiveGame, mistakes, solved, currentPuzzleDate, hintsUsed]);

  const checkSingleAnswer = useCallback((index) => {
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
      setCorrectAnswers(prev => {
        const newCorrect = [...prev];
        newCorrect[index] = true;
        return newCorrect;
      });
      
      setSolved(prev => {
        const newSolved = prev + 1;
        
        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            solved: newSolved,
            mistakes: mistakes,
            hintsUsed: hintsUsed
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
      setMistakes(prev => {
        const newMistakes = Math.min(prev + 1, GAME_CONFIG.MAX_MISTAKES);
        
        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            solved: solved,
            mistakes: newMistakes,
            hintsUsed: hintsUsed
          });
        }
        
        if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
          completeGame(false);
        }
        
        return newMistakes;
      });
      
      setCheckedWrongAnswers(prev => {
        const newCheckedWrong = [...prev];
        newCheckedWrong[index] = true;
        return newCheckedWrong;
      });
      
      return { isCorrect: false, gameComplete: mistakes + 1 >= GAME_CONFIG.MAX_MISTAKES };
    }
  }, [answers, correctAnswers, puzzle, solved, mistakes, completeGame, currentPuzzleDate, hintsUsed]);

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
      setSolved(prev => {
        const newSolved = prev + correct;
        
        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            solved: newSolved,
            mistakes: mistakes + incorrect,
            hintsUsed: hintsUsed
          });
        }
        
        if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
          completeGame(true);
        }
        return newSolved;
      });
    }
    
    if (incorrect > 0) {
      setMistakes(prev => {
        const newMistakes = Math.min(prev + incorrect, GAME_CONFIG.MAX_MISTAKES);
        
        if (currentPuzzleDate) {
          savePuzzleProgress(currentPuzzleDate, {
            solved: solved + correct,
            mistakes: newMistakes,
            hintsUsed: hintsUsed
          });
        }
        
        if (newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
          completeGame(false);
        }
        return newMistakes;
      });
    }
    
    return { correct, incorrect };
  }, [answers, correctAnswers, puzzle, solved, mistakes, completeGame, currentPuzzleDate, hintsUsed, checkedWrongAnswers]);

  const useHint = useCallback((index) => {
    if (correctAnswers[index] || !puzzle?.puzzles[index]) {
      return false;
    }
    
    // Get the correct answer (use first if multiple)
    const puzzleItem = puzzle.puzzles[index];
    let answer = puzzleItem.answer;
    
    // If answer has multiple options separated by comma, use the first one
    if (answer.includes(',')) {
      answer = answer.split(',')[0].trim();
    }
    
    // Fill in the complete answer
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = answer;
      return newAnswers;
    });
    
    // Mark this answer as correct
    setCorrectAnswers(prev => {
      const newCorrect = [...prev];
      newCorrect[index] = true;
      return newCorrect;
    });
    
    // Clear wrong status if it was set
    setCheckedWrongAnswers(prev => {
      const newCheckedWrong = [...prev];
      newCheckedWrong[index] = false;
      return newCheckedWrong;
    });
    
    // Increment solved count
    setSolved(prev => {
      const newSolved = prev + 1;
      
      // Check if game is complete
      if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
        completeGame(true);
      }
      
      return newSolved;
    });
    
    // Track hint usage
    setHintsUsed(prev => {
      const newHintsUsed = prev + 1;
      if (currentPuzzleDate) {
        savePuzzleProgress(currentPuzzleDate, {
          solved: solved + 1,
          mistakes: mistakes,
          hintsUsed: newHintsUsed
        });
      }
      return newHintsUsed;
    });
    
    return true;
  }, [correctAnswers, puzzle, solved, mistakes, currentPuzzleDate, completeGame]);

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setCheckedWrongAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setHintsUsed(0);
    setHasCheckedAnswers(false);
  }, []);

  const returnToWelcome = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
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
    startGame,
    updateAnswer,
    checkAnswers,
    checkSingleAnswer,
    completeGame,
    loadPuzzle,
    useHint,
    resetGame,
    returnToWelcome
  };
}