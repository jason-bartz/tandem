import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import statsService from '@/services/stats.service';
import { sanitizeInput } from '@/lib/utils';

export function useGame() {
  const [gameState, setGameState] = useState(GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState([false, false, false, false]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load puzzle on mount - FIXED VERSION
  useEffect(() => {
    let mounted = true;
    
    const loadInitialPuzzle = async () => {
      try {
        console.log('Loading puzzle...');
        const data = await puzzleService.getPuzzle();
        
        if (!mounted) return;
        
        console.log('Puzzle data received:', data);
        
        if (data && data.puzzle) {
          setPuzzle(data.puzzle);
          setLoading(false);
          setError(null);
          console.log('Puzzle successfully set in state');
        } else {
          setError('No puzzle available for today');
          setLoading(false);
        }
      } catch (err) {
        if (!mounted) return;
        
        console.error('Failed to load puzzle:', err);
        setError('Failed to load puzzle. Please try again.');
        setLoading(false);
      }
    };
    
    loadInitialPuzzle();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Load puzzle function for date selection
  const loadPuzzle = useCallback(async (date = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await puzzleService.getPuzzle(date);
      
      if (data && data.puzzle) {
        setPuzzle(data.puzzle);
        setGameState(GAME_STATES.WELCOME); // Reset to welcome when loading new puzzle
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        setLoading(false);
        return true;
      } else {
        setError('No puzzle available');
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Failed to load puzzle:', err);
      setError('Failed to load puzzle. Please try again.');
      setLoading(false);
      return false;
    }
  }, []);

  // Start game - SIMPLIFIED
  const startGame = useCallback(() => {
    console.log('startGame called, puzzle:', puzzle);
    
    if (!puzzle) {
      console.error('Cannot start game without puzzle');
      return;
    }
    
    // Reset game state
    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setError(null);
    
    console.log('Game started successfully');
  }, [puzzle]);

  const updateAnswer = useCallback((index, value) => {
    const sanitized = sanitizeInput(value);
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = sanitized;
      return newAnswers;
    });
  }, []);

  const checkAnswers = useCallback(() => {
    if (!puzzle || !puzzle.puzzles) return { correct: 0, incorrect: 0 };

    let newMistakes = 0;
    let newSolved = 0;
    const newCorrectAnswers = [...correctAnswers];

    puzzle.puzzles.forEach((p, i) => {
      if (correctAnswers[i]) {
        newSolved++;
        return;
      }

      const userAnswer = answers[i].trim().toUpperCase();
      if (userAnswer) {
        if (userAnswer === p.answer.toUpperCase()) {
          newCorrectAnswers[i] = true;
          newSolved++;
        } else {
          newMistakes++;
        }
      }
    });

    setCorrectAnswers(newCorrectAnswers);
    setMistakes(prev => prev + newMistakes);
    setSolved(newSolved);

    if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
      completeGame(true);
    } else if (mistakes + newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
      completeGame(false);
    }

    return {
      correct: newSolved - solved,
      incorrect: newMistakes,
    };
  }, [puzzle, answers, correctAnswers, mistakes, solved]);

  const completeGame = useCallback(async (won) => {
    setGameState(GAME_STATES.COMPLETE);
    
    try {
      await statsService.updateStats({
        completed: won,
        mistakes,
        solved,
      });
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  }, [mistakes, solved]);

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setError(null);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Game state updated:', {
      gameState,
      hasPuzzle: !!puzzle,
      loading,
      error
    });
  }, [gameState, puzzle, loading, error]);

  return {
    gameState,
    puzzle,
    answers,
    correctAnswers,
    mistakes,
    solved,
    loading,
    error,
    startGame,
    updateAnswer,
    checkAnswers,
    completeGame,
    resetGame,
    loadPuzzle,
  };
}