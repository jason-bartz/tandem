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

  useEffect(() => {
    loadPuzzle();
  }, []);

  const loadPuzzle = async (date = null) => {
    try {
      setLoading(true);
      setError(null);
      const data = await puzzleService.getPuzzle(date);
      
      console.log('Loaded puzzle data:', data); // Debug log
      
      if (data.puzzle) {
        setPuzzle(data.puzzle);
        console.log('Set puzzle state:', data.puzzle); // Debug log
      } else {
        setError('No puzzle available for today');
      }
    } catch (err) {
      setError('Failed to load puzzle. Please try again.');
      console.error('Failed to load puzzle:', err);
    } finally {
      setLoading(false);
    }
  };

  const startGame = useCallback(() => {
    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
  }, []);

  const updateAnswer = useCallback((index, value) => {
    const sanitized = sanitizeInput(value);
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = sanitized;
      return newAnswers;
    });
  }, []);

  const checkAnswers = useCallback(() => {
    if (!puzzle) return { correct: 0, incorrect: 0 };

    let newMistakes = 0;
    let newSolved = 0;
    const newCorrectAnswers = [...correctAnswers];

    puzzle.puzzles.forEach((p, i) => {
      if (correctAnswers[i]) {
        newSolved++;
        return;
      }

      const userAnswer = answers[i].trim();
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
    startGame,
    updateAnswer,
    checkAnswers,
    completeGame,
    resetGame,
    loadPuzzle,
  };
}