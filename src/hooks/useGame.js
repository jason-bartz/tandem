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
  const [isArchiveGame, setIsArchiveGame] = useState(false);

  // Simple load puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      try {
        console.log('Starting to load puzzle...');
        const response = await puzzleService.getPuzzle();
        console.log('Response from service:', response);
        
        if (response && response.puzzle) {
          console.log('Found puzzle in response:', response.puzzle);
          setPuzzle(response.puzzle);
        } else if (response) {
          // Maybe the response IS the puzzle
          console.log('Response might be puzzle itself:', response);
          setPuzzle(response);
        } else {
          console.error('No valid response');
          setError('No puzzle available');
        }
      } catch (err) {
        console.error('Error loading puzzle:', err);
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
      
      const response = await puzzleService.getPuzzle(date);
      
      if (response && response.puzzle) {
        setPuzzle(response.puzzle);
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        return true;
      } else if (response) {
        setPuzzle(response);
        setGameState(GAME_STATES.WELCOME);
        setAnswers(['', '', '', '']);
        setCorrectAnswers([false, false, false, false]);
        setMistakes(0);
        setSolved(0);
        return true;
      } else {
        setError('No puzzle available');
        return false;
      }
    } catch (err) {
      console.error('Failed to load puzzle:', err);
      setError('Failed to load puzzle');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const startGame = useCallback(() => {
    if (!puzzle) {
      console.error('Cannot start game without puzzle');
      return;
    }
    
    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setError(null);
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
    if (!puzzle || !puzzle.puzzles) {
      return { correct: 0, incorrect: 0 };
    }

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
        isArchive: isArchiveGame, // Pass archive flag to stats service
      });
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  }, [mistakes, solved, isArchiveGame]);

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
    setError(null);
  }, []);

  return {
    gameState,
    puzzle,
    answers,
    correctAnswers,
    mistakes,
    solved,
    loading,
    error,
    isArchiveGame,
    startGame,
    updateAnswer,
    checkAnswers,
    completeGame,
    resetGame,
    loadPuzzle,
  };
}