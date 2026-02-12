import { useState, useEffect, useCallback, useRef } from 'react';
import { MINI_GAME_STATES } from '@/lib/constants';
import miniService from '@/services/mini.service';
import {
  saveMiniGameState,
  loadMiniGameState,
  saveMiniPuzzleProgress,
  loadMiniPuzzleProgress,
  updateMiniStatsAfterCompletion,
  clearMiniGameState,
} from '@/lib/miniStorage';
import {
  getCurrentMiniPuzzleInfo,
  createEmptyGrid,
  cloneGrid,
  generateClueNumbers,
  getClueForCell,
  getNextCell,
  getNextClue,
  getNextClueInSection,
  getPreviousClue,
  isCellCorrect,
  isWordCorrect,
  isWordFilled,
  isPuzzleComplete,
  getFirstEditableCell,
  isEditableCell,
  DIRECTION,
} from '@/lib/miniUtils';
import logger from '@/lib/logger';
import { playCorrectSound } from '@/lib/sounds';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import { trackGameStart, trackGameComplete, GAME_TYPES } from '@/lib/gameAnalytics';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Custom hook for managing The Daily Mini crossword game state
 */
export function useMiniGame(providedDate = null) {
  const { markServiceUnavailable } = useAuth();
  // Game state
  const [gameState, setGameState] = useState(MINI_GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [userGrid, setUserGrid] = useState(createEmptyGrid());
  const [solutionGrid, setSolutionGrid] = useState(null);
  const [clueNumbers, setClueNumbers] = useState(null);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [direction, setDirection] = useState(DIRECTION.ACROSS);
  const [currentClue, setCurrentClue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState(null);
  const [isArchive, setIsArchive] = useState(false);
  const [admireData, setAdmireData] = useState(null);

  // Timer state
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(null);
  const timerRef = useRef(null);

  // Check/Reveal state
  const [checksUsed, setChecksUsed] = useState(0);
  const [revealsUsed, setRevealsUsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [autoCheck, setAutoCheck] = useState(false);
  const [correctCells, setCorrectCells] = useState(new Set());

  // Completion state
  const [isComplete, setIsComplete] = useState(false);

  /**
   * Load puzzle on mount or when date changes
   */
  useEffect(() => {
    loadPuzzle(providedDate);

    return () => {
      // Cleanup timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [providedDate]);

  /**
   * Timer effect - runs when game is playing and not paused
   */
  useEffect(() => {
    if (gameState === MINI_GAME_STATES.PLAYING && hasStarted && !isPaused && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState, hasStarted, isPaused, startTime]);

  /**
   * Auto-save game state
   */
  useEffect(() => {
    if (gameState === MINI_GAME_STATES.PLAYING && puzzle && hasStarted) {
      const saveTimeout = setTimeout(() => {
        saveMiniGameState({
          puzzle,
          userGrid,
          selectedCell,
          direction,
          startTime,
          elapsedTime,
          isPaused,
          pausedAt,
          checksUsed,
          revealsUsed,
          mistakes,
          autoCheck,
          correctCells: Array.from(correctCells),
          currentPuzzleDate,
        }).catch((err) => {
          logger.error('[useMiniGame] Failed to save game state', { error: err.message });
        });
      }, 2000); // Debounce saves

      return () => clearTimeout(saveTimeout);
    }
  }, [userGrid, selectedCell, direction, elapsedTime, checksUsed, revealsUsed, mistakes]);

  /**
   * Update current clue when selection or direction changes
   * IMPORTANT: This updates both currentClue and potentially corrects the direction
   */
  useEffect(() => {
    if (!solutionGrid || !clueNumbers) return;

    logger.debug('[useMiniGame] useEffect triggered', { selectedCell, direction });

    const clue = getClueForCell(
      solutionGrid,
      clueNumbers,
      selectedCell.row,
      selectedCell.col,
      direction
    );

    if (!clue) {
      logger.warn('[useMiniGame] getClueForCell returned null');
      return;
    }

    logger.debug('[useMiniGame] getClueForCell returned', JSON.stringify(clue));

    // Always update the current clue with what getClueForCell returned
    setCurrentClue(clue);

    // If the returned clue has a different direction than what we requested,
    // update the direction state (this happens when the preferred direction doesn't exist)
    // This will trigger this useEffect again, but with the correct direction
    if (clue.direction && clue.direction !== direction) {
      logger.debug('[useMiniGame] Direction mismatch - updating', {
        from: direction,
        to: clue.direction,
      });
      setDirection(clue.direction);
    }
  }, [selectedCell, direction, solutionGrid, clueNumbers]);

  /**
   * Auto-check on cell completion
   */
  useEffect(() => {
    if (autoCheck && solutionGrid && hasStarted) {
      checkAllCells();
    }
  }, [userGrid, autoCheck]);

  /**
   * Check if puzzle is complete
   */
  useEffect(() => {
    if (solutionGrid && hasStarted) {
      const complete = isPuzzleComplete(userGrid, solutionGrid);
      if (complete && !isComplete) {
        handlePuzzleComplete();
      }
    }
  }, [userGrid, solutionGrid, hasStarted]);

  /**
   * Load puzzle
   */
  const loadPuzzle = useCallback(
    async (date = null) => {
      try {
        setLoading(true);
        setError(null);

        // Get puzzle date
        const puzzleInfo = getCurrentMiniPuzzleInfo();
        const targetDate = date || puzzleInfo.isoDate;
        setCurrentPuzzleDate(targetDate);

        // Determine if archive
        const isArchivePuzzle = date !== null && date !== puzzleInfo.isoDate;
        setIsArchive(isArchivePuzzle);

        logger.info('[useMiniGame] Loading puzzle', {
          date: targetDate,
          isArchive: isArchivePuzzle,
        });

        // Load saved progress
        const savedProgress = await loadMiniPuzzleProgress(targetDate);
        const savedState = await loadMiniGameState();

        // Fetch puzzle from API
        const response = await miniService.getPuzzle(targetDate);

        if (!response.success) {
          if (response.status >= 500) {
            markServiceUnavailable();
          }
          setError(
            "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
          );
          setLoading(false);
          return false;
        }

        const puzzleData = response.puzzle;
        setPuzzle(puzzleData);

        // Set solution grid and generate clue numbers
        setSolutionGrid(puzzleData.grid);
        const numbers = generateClueNumbers(puzzleData.grid);
        setClueNumbers(numbers);

        // Initialize grid and selection
        const emptyGrid = createEmptyGrid();
        setUserGrid(emptyGrid);

        const firstCell = getFirstEditableCell(puzzleData.grid);
        setSelectedCell(firstCell);

        // Restore saved state if applicable
        if (savedState && savedState.currentPuzzleDate === targetDate) {
          if (savedProgress && savedProgress.completed) {
            // Puzzle completed - enter admire mode
            logger.info('[useMiniGame] Entering ADMIRE mode for completed puzzle');
            setAdmireData(savedProgress);
            setUserGrid(savedProgress.grid || emptyGrid);
            setGameState(MINI_GAME_STATES.ADMIRE);
          } else {
            // Restore in-progress state
            setUserGrid(savedState.userGrid || emptyGrid);
            setSelectedCell(savedState.selectedCell || firstCell);
            setDirection(savedState.direction || DIRECTION.ACROSS);
            setStartTime(savedState.startTime || null);
            setElapsedTime(savedState.elapsedTime || 0);
            setIsPaused(savedState.isPaused || false);
            setPausedAt(savedState.pausedAt || null);
            setChecksUsed(savedState.checksUsed || 0);
            setRevealsUsed(savedState.revealsUsed || 0);
            setMistakes(savedState.mistakes || 0);
            setAutoCheck(savedState.autoCheck || false);
            setCorrectCells(new Set(savedState.correctCells || []));
            setHasStarted(!!savedState.startTime);

            // If started but not paused, resume timer
            if (savedState.startTime && !savedState.isPaused) {
              setGameState(MINI_GAME_STATES.PLAYING);
            } else if (savedState.startTime && savedState.isPaused) {
              setGameState(MINI_GAME_STATES.PLAYING);
            } else {
              setGameState(MINI_GAME_STATES.START);
            }
          }
        } else {
          // Reset all state for fresh puzzle (archive or new daily)
          setUserGrid(emptyGrid);
          setSelectedCell(firstCell);
          setDirection(DIRECTION.ACROSS);
          setStartTime(null);
          setElapsedTime(0);
          setHasStarted(false);
          setIsPaused(false);
          setPausedAt(null);
          setChecksUsed(0);
          setRevealsUsed(0);
          setMistakes(0);
          setAutoCheck(false);
          setCorrectCells(new Set());
          setIsComplete(false);
          setGameState(MINI_GAME_STATES.START);
        }

        setLoading(false);
        return true;
      } catch (err) {
        logger.error('[useMiniGame] Failed to load puzzle', { error: err.message });
        setError(
          "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!"
        );
        setLoading(false);
        return false;
      }
    },
    [markServiceUnavailable]
  );

  /**
   * Start the game and timer
   */
  const startGame = useCallback(() => {
    if (!hasStarted) {
      const now = Date.now();
      setStartTime(now);
      setHasStarted(true);
      setIsPaused(false);
      setPausedAt(null);
      // Track game start
      trackGameStart(GAME_TYPES.MINI, puzzle?.number, currentPuzzleDate);
    }
    setGameState(MINI_GAME_STATES.PLAYING);
  }, [hasStarted, puzzle?.number, currentPuzzleDate]);

  /**
   * Pause the timer
   */
  const pauseGame = useCallback(() => {
    if (!isPaused && hasStarted) {
      setIsPaused(true);
      setPausedAt(Date.now());
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isPaused, hasStarted]);

  /**
   * Resume the timer
   */
  const resumeGame = useCallback(() => {
    if (isPaused && hasStarted && pausedAt) {
      const pauseDuration = Date.now() - pausedAt;
      setStartTime((prev) => prev + pauseDuration);
      setIsPaused(false);
      setPausedAt(null);
    }
  }, [isPaused, hasStarted, pausedAt]);

  /**
   * Handle letter input
   */
  const handleLetterInput = useCallback(
    (letter) => {
      if (!hasStarted || gameState !== MINI_GAME_STATES.PLAYING || !solutionGrid) return;

      const { row, col } = selectedCell;

      if (!isEditableCell(solutionGrid, row, col)) return;

      // Update grid with the new letter
      const newGrid = cloneGrid(userGrid);
      newGrid[row][col] = letter.toUpperCase();
      setUserGrid(newGrid);

      // Check if we should advance to next cell or next clue
      const nextCell = getNextCell(solutionGrid, clueNumbers, row, col, direction, true);
      const isAtLastCell = nextCell.row === row && nextCell.col === col;

      if (isAtLastCell && currentClue?.cells && puzzle?.clues) {
        // We're at the last cell of the word - check if word is now complete
        // Use newGrid (with the letter we just typed) to check if word is filled
        if (isWordFilled(newGrid, currentClue.cells)) {
          // Word is complete! Advance to next clue in the same section (Across/Down)
          const nextClue = getNextClueInSection(
            puzzle.clues,
            currentClue.clueNumber,
            direction,
            solutionGrid,
            clueNumbers
          );

          if (nextClue?.cells?.length > 0) {
            // Move to the first cell of the next clue
            setSelectedCell(nextClue.cells[0]);
            // Direction stays the same (same section)
          }
        }
      } else if (!isAtLastCell) {
        // Not at last cell - advance to next cell in the word
        setSelectedCell(nextCell);
      }
    },
    [
      selectedCell,
      direction,
      userGrid,
      solutionGrid,
      clueNumbers,
      hasStarted,
      gameState,
      currentClue,
      puzzle,
    ]
  );

  /**
   * Handle backspace
   */
  const handleBackspace = useCallback(() => {
    if (!hasStarted || gameState !== MINI_GAME_STATES.PLAYING || !solutionGrid) return;

    const { row, col } = selectedCell;

    // Clear current cell if filled
    if (userGrid[row] && userGrid[row][col]) {
      const newGrid = cloneGrid(userGrid);
      newGrid[row][col] = '';
      setUserGrid(newGrid);
    } else {
      // Move to previous cell and clear it
      const prevCell = getNextCell(solutionGrid, clueNumbers, row, col, direction, false);
      if (prevCell.row !== row || prevCell.col !== col) {
        const newGrid = cloneGrid(userGrid);
        newGrid[prevCell.row][prevCell.col] = '';
        setUserGrid(newGrid);
        setSelectedCell(prevCell);
      }
    }
  }, [selectedCell, direction, userGrid, solutionGrid, clueNumbers, hasStarted, gameState]);

  /**
   * Select a cell
   */
  const selectCell = useCallback(
    (row, col) => {
      if (!solutionGrid || !isEditableCell(solutionGrid, row, col)) return;

      // If clicking the same cell, toggle direction
      if (row === selectedCell.row && col === selectedCell.col) {
        logger.debug('[useMiniGame] Toggling direction on same cell');
        setDirection((prev) => (prev === DIRECTION.ACROSS ? DIRECTION.DOWN : DIRECTION.ACROSS));
      } else {
        // When selecting a new cell, default to ACROSS
        // The useEffect will call getClueForCell which will determine the actual valid direction
        logger.debug('[useMiniGame] Selecting new cell', { row, col });
        setSelectedCell({ row, col });
        setDirection(DIRECTION.ACROSS);
      }
    },
    [selectedCell, solutionGrid]
  );

  /**
   * Navigate to next clue
   */
  const navigateToNextClue = useCallback(() => {
    if (!puzzle || !currentClue || !solutionGrid || !clueNumbers) return;

    const nextClue = getNextClue(
      puzzle.clues,
      currentClue.clueNumber,
      currentClue.direction,
      solutionGrid,
      clueNumbers
    );
    if (nextClue && nextClue.cells && nextClue.cells.length > 0) {
      setSelectedCell(nextClue.cells[0]);
      setDirection(nextClue.direction);
    }
  }, [puzzle, currentClue, solutionGrid, clueNumbers]);

  /**
   * Navigate to next clue within the same section (Across or Down)
   * Used for Tab key navigation
   */
  const navigateToNextClueInSection = useCallback(() => {
    if (!puzzle || !currentClue || !solutionGrid || !clueNumbers) return;

    const nextClue = getNextClueInSection(
      puzzle.clues,
      currentClue.clueNumber,
      currentClue.direction,
      solutionGrid,
      clueNumbers
    );
    if (nextClue && nextClue.cells && nextClue.cells.length > 0) {
      setSelectedCell(nextClue.cells[0]);
      setDirection(nextClue.direction);
    }
  }, [puzzle, currentClue, solutionGrid, clueNumbers]);

  /**
   * Navigate to previous clue
   */
  const navigateToPreviousClue = useCallback(() => {
    if (!puzzle || !currentClue || !solutionGrid || !clueNumbers) return;

    const prevClue = getPreviousClue(
      puzzle.clues,
      currentClue.clueNumber,
      currentClue.direction,
      solutionGrid,
      clueNumbers
    );
    if (prevClue && prevClue.cells && prevClue.cells.length > 0) {
      setSelectedCell(prevClue.cells[0]);
      setDirection(prevClue.direction);
    }
  }, [puzzle, currentClue, solutionGrid, clueNumbers]);

  /**
   * Navigate to specific clue
   */
  const navigateToClue = useCallback(
    (clueNumber, clueDirection) => {
      if (!solutionGrid || !clueNumbers) return;

      // Find the starting cell for this clue
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          if (clueNumbers[row][col] === clueNumber) {
            setSelectedCell({ row, col });
            setDirection(clueDirection);
            return;
          }
        }
      }
    },
    [solutionGrid, clueNumbers]
  );

  /**
   * Check current cell
   */
  const checkCell = useCallback(() => {
    if (!solutionGrid) return;

    const { row, col } = selectedCell;
    const correct = isCellCorrect(userGrid, solutionGrid, row, col);

    setChecksUsed((prev) => prev + 1);

    if (!correct) {
      // Clear incorrect cell
      const newGrid = cloneGrid(userGrid);
      newGrid[row][col] = '';
      setUserGrid(newGrid);
      setMistakes((prev) => prev + 1);
    } else {
      // Mark as correct
      setCorrectCells((prev) => new Set(prev).add(`${row},${col}`));
    }
  }, [selectedCell, userGrid, solutionGrid]);

  /**
   * Check current word
   */
  const checkWord = useCallback(() => {
    if (!solutionGrid || !currentClue) return;

    const { clueNumber, direction: clueDir, cells } = currentClue;
    const correct = isWordCorrect(userGrid, solutionGrid, clueNumbers, clueNumber, clueDir);

    setChecksUsed((prev) => prev + 1);

    if (!correct) {
      // Clear incorrect cells in the word
      const newGrid = cloneGrid(userGrid);
      let hasMistake = false;

      cells.forEach(({ row, col }) => {
        if (!isCellCorrect(userGrid, solutionGrid, row, col)) {
          newGrid[row][col] = '';
          hasMistake = true;
        } else {
          setCorrectCells((prev) => new Set(prev).add(`${row},${col}`));
        }
      });

      setUserGrid(newGrid);
      if (hasMistake) {
        setMistakes((prev) => prev + 1);
      }
    } else {
      // Mark all cells as correct
      cells.forEach(({ row, col }) => {
        setCorrectCells((prev) => new Set(prev).add(`${row},${col}`));
      });
    }
  }, [userGrid, solutionGrid, clueNumbers, currentClue]);

  /**
   * Check entire puzzle
   */
  const checkPuzzle = useCallback(() => {
    if (!solutionGrid) return;

    setChecksUsed((prev) => prev + 1);

    const newGrid = cloneGrid(userGrid);
    let hasMistakes = false;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (isEditableCell(solutionGrid, row, col)) {
          if (!isCellCorrect(userGrid, solutionGrid, row, col)) {
            newGrid[row][col] = '';
            hasMistakes = true;
          } else if (userGrid[row][col]) {
            setCorrectCells((prev) => new Set(prev).add(`${row},${col}`));
          }
        }
      }
    }

    setUserGrid(newGrid);
    if (hasMistakes) {
      setMistakes((prev) => prev + 1);
    }
  }, [userGrid, solutionGrid]);

  /**
   * Reveal current cell
   */
  const revealCell = useCallback(() => {
    if (!solutionGrid) return;

    const { row, col } = selectedCell;
    const newGrid = cloneGrid(userGrid);
    newGrid[row][col] = solutionGrid[row][col];
    setUserGrid(newGrid);
    setRevealsUsed((prev) => prev + 1);
    setCorrectCells((prev) => new Set(prev).add(`${row},${col}`));
    playCorrectSound();
  }, [selectedCell, userGrid, solutionGrid]);

  /**
   * Reveal current word
   */
  const revealWord = useCallback(() => {
    if (!solutionGrid || !currentClue) return;

    const { cells } = currentClue;
    const newGrid = cloneGrid(userGrid);

    cells.forEach(({ row, col }) => {
      newGrid[row][col] = solutionGrid[row][col];
      setCorrectCells((prev) => new Set(prev).add(`${row},${col}`));
    });

    setUserGrid(newGrid);
    setRevealsUsed((prev) => prev + 1);
    playCorrectSound();
  }, [userGrid, solutionGrid, currentClue]);

  /**
   * Reveal entire puzzle
   */
  const revealPuzzle = useCallback(() => {
    if (!solutionGrid) return;

    setUserGrid(cloneGrid(solutionGrid));
    setRevealsUsed((prev) => prev + 1);

    // Mark all cells as correct
    const allCorrect = new Set();
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (isEditableCell(solutionGrid, row, col)) {
          allCorrect.add(`${row},${col}`);
        }
      }
    }
    setCorrectCells(allCorrect);
  }, [solutionGrid]);

  /**
   * Check all cells (for auto-check)
   */
  const checkAllCells = useCallback(() => {
    if (!solutionGrid) return;

    const newCorrect = new Set(correctCells);

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (isEditableCell(solutionGrid, row, col)) {
          if (isCellCorrect(userGrid, solutionGrid, row, col)) {
            newCorrect.add(`${row},${col}`);
          }
        }
      }
    }

    setCorrectCells(newCorrect);
  }, [userGrid, solutionGrid, correctCells]);

  /**
   * Toggle auto-check
   */
  const toggleAutoCheck = useCallback(() => {
    setAutoCheck((prev) => !prev);
  }, []);

  /**
   * Handle puzzle completion
   */
  const handlePuzzleComplete = useCallback(async () => {
    if (isComplete) return;

    setIsComplete(true);
    // Note: Don't set game state to COMPLETE yet - wait until stats are updated
    // to prevent race condition where MiniCompleteScreen loads stats before they're saved

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const finalTime = elapsedTime;
    const perfectSolve = checksUsed === 0 && revealsUsed === 0 && mistakes === 0;

    // Save completion progress
    const completionData = {
      completed: true,
      grid: userGrid,
      timeTaken: finalTime,
      checksUsed,
      revealsUsed,
      mistakes,
      perfectSolve,
      completedAt: new Date().toISOString(),
    };

    await saveMiniPuzzleProgress(currentPuzzleDate, completionData);

    // Update stats BEFORE transitioning to complete screen
    await updateMiniStatsAfterCompletion(
      currentPuzzleDate,
      finalTime,
      checksUsed,
      revealsUsed,
      mistakes,
      isArchive
    );

    // Track game completion for analytics
    trackGameComplete({
      gameType: GAME_TYPES.MINI,
      puzzleNumber: puzzle?.number,
      puzzleDate: currentPuzzleDate,
      won: true, // Mini is always a win when completed
      timeSeconds: finalTime,
      mistakes,
      hintsUsed: checksUsed + revealsUsed,
    });

    // Now transition to complete screen - stats are saved
    setGameState(MINI_GAME_STATES.COMPLETE);

    // Submit to leaderboard if not archive and time is valid
    if (!isArchive && finalTime > 0 && currentPuzzleDate) {
      const payload = {
        gameType: 'mini',
        puzzleDate: currentPuzzleDate,
        score: finalTime,
        metadata: { checksUsed, revealsUsed, mistakes },
      };

      try {
        const response = await capacitorFetch(getApiUrl('/api/leaderboard/daily'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          logger.info('[useMiniGame] Leaderboard submission successful', result);
        } else {
          const error = await response.json();
          logger.error('[useMiniGame] Leaderboard submission failed', error);
        }
      } catch (error) {
        logger.error('[useMiniGame] Error submitting to leaderboard', { error: error.message });
      }
    }

    // Clear game state
    await clearMiniGameState();

    logger.info('[useMiniGame] Puzzle completed!', {
      time: finalTime,
      perfectSolve,
      checks: checksUsed,
      reveals: revealsUsed,
      mistakes,
    });
  }, [
    isComplete,
    elapsedTime,
    checksUsed,
    revealsUsed,
    mistakes,
    userGrid,
    currentPuzzleDate,
    isArchive,
  ]);

  /**
   * Reset puzzle (for testing)
   */
  const resetPuzzle = useCallback(() => {
    setUserGrid(createEmptyGrid());
    setSelectedCell(getFirstEditableCell(solutionGrid));
    setDirection(DIRECTION.ACROSS);
    setStartTime(null);
    setElapsedTime(0);
    setHasStarted(false);
    setIsPaused(false);
    setPausedAt(null);
    setChecksUsed(0);
    setRevealsUsed(0);
    setMistakes(0);
    setCorrectCells(new Set());
    setIsComplete(false);
    setGameState(MINI_GAME_STATES.START);
    clearMiniGameState();
  }, [solutionGrid]);

  return {
    // State
    gameState,
    puzzle,
    userGrid,
    solutionGrid,
    clueNumbers,
    selectedCell,
    direction,
    currentClue,
    loading,
    error,
    currentPuzzleDate,
    isArchive,
    admireData,

    // Timer
    hasStarted,
    startTime,
    elapsedTime,
    isPaused,

    // Check/Reveal
    checksUsed,
    revealsUsed,
    mistakes,
    autoCheck,
    correctCells,

    // Completion
    isComplete,

    // Actions
    startGame,
    pauseGame,
    resumeGame,
    handleLetterInput,
    handleBackspace,
    selectCell,
    navigateToNextClue,
    navigateToNextClueInSection,
    navigateToPreviousClue,
    navigateToClue,
    checkCell,
    checkWord,
    checkPuzzle,
    revealCell,
    revealWord,
    revealPuzzle,
    toggleAutoCheck,
    resetPuzzle,
    loadPuzzle,
  };
}

export default useMiniGame;
