import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Use ref to track if already loading to prevent double fetches
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Load puzzle on mount - NO DEPENDENCIES
  useEffect(() => {
    const loadInitialPuzzle = async () => {
      // Prevent double loading
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        console.log('Fetching puzzle...');
        setLoading(true);
        setError(null);
        
        const data = await puzzleService.getPuzzle();
        
        // Check if component is still mounted
        if (!isMountedRef.current) return;
        
        console.log('Puzzle data received:', data);
        
        if (data && data.puzzle) {
          // Ensure puzzle has correct structure
          const puzzleData = data.puzzle;
          
          // Handle old structure if needed
          if (!puzzleData.puzzles && puzzleData.emojiPairs && puzzleData.words) {
            puzzleData.puzzles = puzzleData.emojiPairs.map((emoji, index) => ({
              emoji: emoji,
              answer: puzzleData.words[index] || puzzleData.correctAnswers?.[index]
            }));
          }
          
          setPuzzle(puzzleData);
          console.log('Puzzle set successfully:', puzzleData);
        } else {
          setError('No puzzle available for today');
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Failed to load puzzle:', err);
        setError('Failed to load puzzle. Please try again.');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          isLoadingRef.current = false;
        }
      }
    };

    loadInitialPuzzle();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - run once on mount

  // Function to load a specific puzzle (for archive)
  const loadPuzzle = useCallback(async (date = null) => {
    try {
      setLoading(true);
      setError(null);
      setGameState(GAME_STATES.WELCOME);
      
      const data = await puzzleService.getPuzzle(date);
      
      if (!isMountedRef.current) return false;
      
      if (data && data.puzzle) {
        const puzzleData = data.puzzle;
        
        // Handle old structure
        if (!puzzleData.puzzles && puzzleData.emojiPairs && puzzleData.words) {
          puzzleData.puzzles = puzzleData.emojiPairs.map((emoji, index) => ({
            emoji: emoji,
            answer: puzzleData.words[index] || puzzleData.correctAnswers?.[index]
          }));
        }
        
        setPuzzle(puzzleData);
        // Reset game state
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
      setError('Failed to load puzzle. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const startGame = useCallback(() => {
    console.log('Starting game with puzzle:', puzzle);
    
    if (!puzzle) {
      console.error('Cannot start game without puzzle');
      setError('Please wait for puzzle to load');
      return;
    }
    
    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setError(null);
    console.log('Game started');
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
      console.error('No puzzle to check');
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

    // Check game completion
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
    console.log('State update:', {
      gameState,
      hasPuzzle: !!puzzle,
      puzzleTheme: puzzle?.theme,
      loading,
      error
    });
  }, [gameState, puzzle, loading, error]);

  return {
    // State
    gameState,
    puzzle,
    answers,
    correctAnswers,
    mistakes,
    solved,
    loading,
    error,
    
    // Actions
    startGame,
    updateAnswer,
    checkAnswers,
    completeGame,
    resetGame,
    loadPuzzle,
  };
}