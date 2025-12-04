'use client';

import { useState, useEffect, useCallback } from 'react';
import wordListService from '@/lib/wordList';
import authService from '@/services/auth.service';

/**
 * Symmetry types for crossword puzzles
 */
const SYMMETRY_TYPES = {
  NONE: 'none',
  ROTATIONAL: 'rotational',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  DIAGONAL_NESW: 'diagonal-nesw',
  DIAGONAL_NWSE: 'diagonal-nwse',
};

/**
 * MiniPuzzleEditor - Enhanced manual editor for Daily Mini crossword puzzles
 * Features: word suggestions, autofill, and symmetry controls
 */
export default function MiniPuzzleEditor({ puzzle, date, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    date: date || '',
    difficulty: 'easy',
    // Grid is 5x5 array of letters (empty string for blank, "■" for black square)
    grid: Array(5)
      .fill()
      .map(() => Array(5).fill('')),
    clues: {
      across: [],
      down: [],
    },
  });

  const [errors, setErrors] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [symmetryType, setSymmetryType] = useState(SYMMETRY_TYPES.NONE);
  const [wordSuggestions, setWordSuggestions] = useState([]);
  const [currentDirection, setCurrentDirection] = useState('across');
  const [wordsLoaded, setWordsLoaded] = useState(false);
  const [generationMode, setGenerationMode] = useState('fill'); // 'fill' or 'scratch'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDifficulty, setGenerationDifficulty] = useState('medium'); // 'easy', 'medium', 'hard', 'expert'
  const [generationStats, setGenerationStats] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [cellConstraints, setCellConstraints] = useState(null); // For visual feedback

  // Load word lists on mount
  useEffect(() => {
    console.log('[MiniPuzzleEditor] Starting to load word lists...');
    wordListService
      .loadWordLists()
      .then(() => {
        setWordsLoaded(true);
        console.log('[MiniPuzzleEditor] Word lists loaded successfully');
        console.log(
          '[MiniPuzzleEditor] Sample 5-letter words:',
          wordListService.getWordsByLength(5).slice(0, 5)
        );
      })
      .catch((error) => {
        console.error('[MiniPuzzleEditor] Failed to load word lists:', error);
      });
  }, []);

  /**
   * Get symmetric cell position based on symmetry type
   */
  const getSymmetricCell = useCallback((row, col, type) => {
    const size = 5;
    switch (type) {
      case SYMMETRY_TYPES.ROTATIONAL:
        return { row: size - 1 - row, col: size - 1 - col };
      case SYMMETRY_TYPES.HORIZONTAL:
        return { row: size - 1 - row, col };
      case SYMMETRY_TYPES.VERTICAL:
        return { row, col: size - 1 - col };
      case SYMMETRY_TYPES.DIAGONAL_NESW:
        return { row: size - 1 - col, col: size - 1 - row };
      case SYMMETRY_TYPES.DIAGONAL_NWSE:
        return { row: col, col: row };
      default:
        return null;
    }
  }, []);

  /**
   * Apply symmetry to grid changes
   */
  const applySymmetry = useCallback(
    (grid, row, col, value) => {
      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = value.toUpperCase();

      if (symmetryType !== SYMMETRY_TYPES.NONE && value === '■') {
        const symmetric = getSymmetricCell(row, col, symmetryType);
        if (symmetric) {
          newGrid[symmetric.row][symmetric.col] = value;
        }
      }

      return newGrid;
    },
    [symmetryType, getSymmetricCell]
  );

  const handleGridChange = useCallback(
    (row, col, value) => {
      const newGrid = applySymmetry(formData.grid, row, col, value);
      setFormData((prev) => ({ ...prev, grid: newGrid }));
    },
    [formData.grid, applySymmetry]
  );

  const toggleBlackSquare = useCallback(
    (row, col) => {
      const currentValue = formData.grid[row][col];
      const newValue = currentValue === '■' ? '' : '■';
      handleGridChange(row, col, newValue);
    },
    [formData.grid, handleGridChange]
  );

  const advanceToNextCell = useCallback(() => {
    if (!selectedCell) return;

    let { row, col } = selectedCell;
    const grid = formData.grid;

    if (currentDirection === 'across') {
      // Move right, skip black squares
      do {
        col++;
      } while (col < 5 && grid[row][col] === '■');

      if (col < 5) {
        setSelectedCell({ row, col });
      }
    } else {
      // Move down, skip black squares
      do {
        row++;
      } while (row < 5 && grid[row][col] === '■');

      if (row < 5) {
        setSelectedCell({ row, col });
      }
    }
  }, [selectedCell, formData.grid, currentDirection]);

  const goToPreviousCell = useCallback(() => {
    if (!selectedCell) return;

    let { row, col } = selectedCell;
    const grid = formData.grid;

    if (currentDirection === 'across') {
      // Move left, skip black squares
      do {
        col--;
      } while (col >= 0 && grid[row][col] === '■');

      if (col >= 0) {
        const newGrid = formData.grid.map((r) => [...r]);
        newGrid[row][col] = '';
        setFormData((prev) => ({ ...prev, grid: newGrid }));
        setSelectedCell({ row, col });
      }
    } else {
      // Move up, skip black squares
      do {
        row--;
      } while (row >= 0 && grid[row][col] === '■');

      if (row >= 0) {
        const newGrid = formData.grid.map((r) => [...r]);
        newGrid[row][col] = '';
        setFormData((prev) => ({ ...prev, grid: newGrid }));
        setSelectedCell({ row, col });
      }
    }
  }, [selectedCell, formData.grid, currentDirection]);

  const handleLetterInGrid = useCallback(
    (letter) => {
      if (!selectedCell) return;

      const { row, col } = selectedCell;

      // Handle period as black square
      if (letter === '.') {
        const currentValue = formData.grid[row][col];
        const newValue = currentValue === '■' ? '' : '■';
        const newGrid = applySymmetry(formData.grid, row, col, newValue);
        setFormData((prev) => ({ ...prev, grid: newGrid }));
        return;
      }

      const newGrid = formData.grid.map((r) => [...r]);
      newGrid[row][col] = letter.toUpperCase();
      setFormData((prev) => ({ ...prev, grid: newGrid }));

      // Auto-advance to next cell in current direction
      setTimeout(() => advanceToNextCell(), 0);
    },
    [selectedCell, formData.grid, advanceToNextCell, applySymmetry]
  );

  const handleBackspaceInGrid = useCallback(() => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const currentValue = formData.grid[row][col];

    // If current cell is empty, go back to previous cell and clear it
    if (!currentValue || currentValue === '') {
      goToPreviousCell();
    } else {
      // Clear current cell
      const newGrid = formData.grid.map((r) => [...r]);
      newGrid[row][col] = '';
      setFormData((prev) => ({ ...prev, grid: newGrid }));
    }
  }, [selectedCell, formData.grid, goToPreviousCell]);

  const handleArrowKey = useCallback(
    (key) => {
      if (!selectedCell) return;

      const { row, col } = selectedCell;
      let newRow = row;
      let newCol = col;

      switch (key) {
        case 'ArrowUp':
          newRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(4, row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(4, col + 1);
          break;
      }

      if (newRow !== row || newCol !== col) {
        setSelectedCell({ row: newRow, col: newCol });
      }
    },
    [selectedCell]
  );

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Update word suggestions for current cell
   */
  const updateWordSuggestions = useCallback(() => {
    if (!selectedCell) {
      setWordSuggestions([]);
      return;
    }

    console.log(
      '[MiniPuzzleEditor] Getting suggestions for cell',
      selectedCell,
      'direction:',
      currentDirection
    );
    const suggestions = wordListService.getWordSuggestionsForCell(
      formData.grid,
      selectedCell.row,
      selectedCell.col,
      currentDirection
    );

    console.log('[MiniPuzzleEditor] Suggestions:', {
      pattern: suggestions.pattern,
      matchCount: suggestions.matches?.length || 0,
      firstFew: suggestions.matches?.slice(0, 5) || [],
    });

    setWordSuggestions(suggestions.matches || []);
  }, [selectedCell, formData.grid, currentDirection]);

  /**
   * Fill selected word position with suggested word
   */
  const fillWord = (word) => {
    if (!selectedCell || !word) return;

    const { row, col } = selectedCell;
    const newGrid = formData.grid.map((r) => [...r]);

    if (currentDirection === 'across') {
      // Find start of word
      let startCol = col;
      while (startCol > 0 && newGrid[row][startCol - 1] !== '■') {
        startCol--;
      }
      // Fill word
      for (let i = 0; i < word.length; i++) {
        if (startCol + i < 5) {
          newGrid[row][startCol + i] = word[i];
        }
      }
    } else {
      // Find start of word
      let startRow = row;
      while (startRow > 0 && newGrid[startRow - 1][col] !== '■') {
        startRow--;
      }
      // Fill word
      for (let i = 0; i < word.length; i++) {
        if (startRow + i < 5) {
          newGrid[startRow + i][col] = word[i];
        }
      }
    }

    setFormData((prev) => ({ ...prev, grid: newGrid }));
  };

  /**
   * Generate/Autofill using Trie-based API with enhanced algorithm
   */
  const autofillGrid = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationStats(null); // Clear previous stats
    console.log(
      `[Generator] Starting ${generationMode} mode with symmetry: ${symmetryType}, difficulty: ${generationDifficulty}...`
    );

    try {
      // Add timeout to prevent hanging forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('/api/admin/mini/generate', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true), // Include auth + CSRF token
        body: JSON.stringify({
          mode: generationMode,
          existingGrid: generationMode === 'fill' ? formData.grid : null,
          symmetry: symmetryType,
          maxRetries: 100,
          difficulty: generationDifficulty, // Pass difficulty level
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const result = await response.json();

      if (result.success) {
        console.log(`[Generator] Success! ${result.words.length} words placed`);
        console.log('[Generator] Stats:', result.stats);

        // Store generation statistics
        setGenerationStats(result.stats);

        // Update grid with generated solution
        setFormData((prev) => ({
          ...prev,
          grid: result.solution, // Use solution (filled grid) for editing
          clues: result.clues || prev.clues, // Update clues if provided
        }));

        // Show success message with stats
        const statsMsg = result.stats
          ? `\n\nGeneration Stats:\n- Time: ${result.stats.elapsedTime}ms\n- Attempts: ${result.stats.totalAttempts}\n- Backtracks: ${result.stats.backtrackCount}\n- Cache Hit Rate: ${result.stats.cacheHitRate?.toFixed(1)}%`
          : '';
        alert(`Puzzle generated successfully with ${result.words.length} words!${statsMsg}`);
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      console.error('[Generator] Error:', error);

      if (error.name === 'AbortError') {
        alert(
          'Generation timed out after 60 seconds. This might indicate a server issue. Please check the server console for errors.'
        );
      } else {
        alert(
          `Generation failed: ${error.message}\n\nPlease check the server console for more details.`
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClueChange = (direction, index, field, value) => {
    const newClues = { ...formData.clues };
    if (!newClues[direction][index]) {
      newClues[direction][index] = {};
    }
    newClues[direction][index] = {
      ...newClues[direction][index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, clues: newClues }));
  };

  const addClue = (direction) => {
    const newClues = { ...formData.clues };
    newClues[direction] = [
      ...newClues[direction],
      { number: newClues[direction].length + 1, clue: '', answer: '' },
    ];
    setFormData((prev) => ({ ...prev, clues: newClues }));
  };

  const removeClue = (direction, index) => {
    const newClues = { ...formData.clues };
    newClues[direction] = newClues[direction].filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, clues: newClues }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';

    // Validate grid has some filled cells
    const hasContent = formData.grid.some((row) => row.some((cell) => cell && cell !== '■'));
    if (!hasContent) {
      newErrors.grid = 'Grid must have at least one filled cell';
    }

    // Validate clues
    if (formData.clues.across.length === 0 && formData.clues.down.length === 0) {
      newErrors.clues = 'At least one clue is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Prepare data for submission (number will be auto-calculated by API)
      const puzzleData = {
        date: formData.date,
        difficulty: formData.difficulty,
        grid: formData.grid.map((row) => row.map((cell) => (cell ? cell : ''))), // Empty grid for users
        solution: formData.grid, // Full solution
        clues: formData.clues,
      };
      onSave(puzzleData);
    }
  };

  const clearGrid = () => {
    setFormData((prev) => ({
      ...prev,
      grid: Array(5)
        .fill()
        .map(() => Array(5).fill('')),
    }));
  };

  // Load puzzle data if editing
  useEffect(() => {
    if (puzzle) {
      setFormData({
        date: puzzle.date,
        difficulty: puzzle.difficulty || 'easy',
        grid: puzzle.solution || puzzle.grid, // Use solution if available
        clues: puzzle.clues,
      });
    } else if (date) {
      setFormData((prev) => ({ ...prev, date }));
    }
  }, [puzzle, date]);

  // Update word suggestions when cell selection changes
  useEffect(() => {
    if (selectedCell && wordsLoaded) {
      updateWordSuggestions();
    }
  }, [selectedCell, wordsLoaded, updateWordSuggestions]);

  // Auto-focus selected cell for better typing experience
  useEffect(() => {
    if (selectedCell) {
      const input = document.querySelector(
        `input.grid-cell:nth-child(${selectedCell.row * 5 + selectedCell.col + 1})`
      );
      if (input && document.activeElement !== input) {
        setTimeout(() => input.focus(), 0);
      }
    }
  }, [selectedCell]);

  // Physical keyboard support for editor
  useEffect(() => {
    const handlePhysicalKeyboard = (e) => {
      // Ignore if not focused on grid or if focused on other inputs
      if (
        !selectedCell ||
        (document.activeElement?.tagName === 'INPUT' &&
          !document.activeElement?.classList.contains('grid-cell'))
      ) {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspaceInGrid();
      } else if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        handleArrowKey(e.key);
      } else if (e.key === ' ') {
        e.preventDefault();
        // Space toggles direction
        setCurrentDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      } else if (/^[a-zA-Z.]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInGrid(e.key === '.' ? '.' : e.key.toUpperCase());
      }
    };

    document.addEventListener('keydown', handlePhysicalKeyboard);
    return () => document.removeEventListener('keydown', handlePhysicalKeyboard);
  }, [selectedCell, handleBackspaceInGrid, handleArrowKey, handleLetterInGrid]);

  return (
    <div className="bg-ghost-white dark:bg-gray-800 rounded-2xl border-[3px] border-black dark:border-white p-4 sm:p-6">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-black text-text-primary">
          {puzzle ? 'Edit' : 'Create'} Daily Mini Puzzle
        </h2>
        <div className="flex gap-2">
          <button
            onClick={autofillGrid}
            disabled={loading || !wordsLoaded || isGenerating}
            className="px-3 py-1.5 text-xs font-bold bg-accent-blue text-white rounded-lg border-[2px] border-black hover:translate-y-[-2px] transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
            title={
              generationMode === 'fill'
                ? 'Fill current pattern with valid words'
                : 'Generate entire puzzle from scratch'
            }
          >
            {isGenerating ? 'Generating...' : generationMode === 'fill' ? 'Autofill' : 'Generate'}
          </button>
          <button
            onClick={clearGrid}
            type="button"
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg border-[2px] border-black hover:translate-y-[-2px] transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
            title="Clear entire grid"
          >
            Clear Grid
          </button>
        </div>
      </div>

      {/* Generation Controls Panel */}
      <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-[3px] border-black">
        <h3 className="text-lg font-black text-text-primary mb-4">⚙️ Generation Controls</h3>

        {/* Generation Mode Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-text-primary mb-3">Generation Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGenerationMode('fill')}
              disabled={isGenerating}
              className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg border-[2px] transition-all ${
                generationMode === 'fill'
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
              style={generationMode === 'fill' ? { boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' } : {}}
            >
              <div className="text-left">
                <div className="font-bold">Fill Pattern</div>
                <div className="text-xs opacity-80">Fill existing black squares</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setGenerationMode('scratch')}
              disabled={isGenerating}
              className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg border-[2px] transition-all ${
                generationMode === 'scratch'
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
              style={
                generationMode === 'scratch' ? { boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' } : {}
              }
            >
              <div className="text-left">
                <div className="font-bold">Generate from Scratch</div>
                <div className="text-xs opacity-80">Create new pattern & fill</div>
              </div>
            </button>
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-text-primary mb-3">
            Word Difficulty
            <span className="text-xs font-normal ml-2 opacity-70">
              (Controls word frequency/commonness)
            </span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setGenerationDifficulty('easy')}
              disabled={isGenerating}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                generationDifficulty === 'easy'
                  ? 'bg-green-400 text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
              style={
                generationDifficulty === 'easy' ? { boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' } : {}
              }
            >
              <div>Easy</div>
              <div className="text-[10px] opacity-70">Common words</div>
            </button>
            <button
              type="button"
              onClick={() => setGenerationDifficulty('medium')}
              disabled={isGenerating}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                generationDifficulty === 'medium'
                  ? 'bg-yellow-400 text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
              style={
                generationDifficulty === 'medium'
                  ? { boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }
                  : {}
              }
            >
              <div>Medium</div>
              <div className="text-[10px] opacity-70">Balanced</div>
            </button>
            <button
              type="button"
              onClick={() => setGenerationDifficulty('hard')}
              disabled={isGenerating}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                generationDifficulty === 'hard'
                  ? 'bg-orange-400 text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
              style={
                generationDifficulty === 'hard' ? { boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' } : {}
              }
            >
              <div>Hard</div>
              <div className="text-[10px] opacity-70">Uncommon</div>
            </button>
            <button
              type="button"
              onClick={() => setGenerationDifficulty('expert')}
              disabled={isGenerating}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                generationDifficulty === 'expert'
                  ? 'bg-red-400 text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
              style={
                generationDifficulty === 'expert'
                  ? { boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }
                  : {}
              }
            >
              <div>Expert</div>
              <div className="text-[10px] opacity-70">All words</div>
            </button>
          </div>
        </div>

        {/* Generation Statistics */}
        {generationStats && (
          <div className="mt-4 p-3 bg-ghost-white dark:bg-gray-800 rounded-lg border-[2px] border-green-500">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-bold text-text-primary">📊 Last Generation Stats</h4>
              <button
                type="button"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                {showDebugPanel ? 'Hide' : 'Show'} Details
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
              <div className="p-2 bg-blue-50 dark:bg-gray-700 rounded">
                <div className="font-bold text-gray-600 dark:text-gray-400">Time</div>
                <div className="text-lg font-black text-blue-600">
                  {generationStats.elapsedTime}ms
                </div>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-gray-700 rounded">
                <div className="font-bold text-gray-600 dark:text-gray-400">Attempts</div>
                <div className="text-lg font-black text-purple-600">
                  {generationStats.totalAttempts}
                </div>
              </div>
              <div className="p-2 bg-orange-50 dark:bg-gray-700 rounded">
                <div className="font-bold text-gray-600 dark:text-gray-400">Backtracks</div>
                <div className="text-lg font-black text-orange-600">
                  {generationStats.backtrackCount}
                </div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-gray-700 rounded">
                <div className="font-bold text-gray-600 dark:text-gray-400">Cache Hit</div>
                <div className="text-lg font-black text-green-600">
                  {generationStats.cacheHitRate?.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            {generationStats.qualityScore !== undefined && (
              <div className="mt-2 p-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded border border-green-300">
                <h5 className="text-xs font-bold mb-1 text-green-700 dark:text-green-400">
                  ✨ Puzzle Quality
                </h5>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="font-bold text-gray-600 dark:text-gray-400">Score</div>
                    <div className="text-base font-black text-green-600">
                      {generationStats.qualityScore}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 dark:text-gray-400">2-letter</div>
                    <div
                      className={`text-base font-black ${generationStats.twoLetterWords === 0 ? 'text-green-600' : 'text-orange-600'}`}
                    >
                      {generationStats.twoLetterWords}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 dark:text-gray-400">3-letter</div>
                    <div className="text-base font-black text-blue-600">
                      {generationStats.threeLetterWords}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 dark:text-gray-400">4+ letter</div>
                    <div className="text-base font-black text-purple-600">
                      {generationStats.fourPlusWords}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Panel */}
            {showDebugPanel && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">
                <h5 className="text-xs font-bold mb-2">🐛 Debug Information</h5>
                <div className="text-xs font-mono space-y-1">
                  <div>
                    <span className="font-bold">Pattern Searches:</span>{' '}
                    {generationStats.patternSearches || 'N/A'}
                  </div>
                  <div>
                    <span className="font-bold">Flexibility Calculations:</span>{' '}
                    {generationStats.flexibilityCalculations || 'N/A'}
                  </div>
                  <div>
                    <span className="font-bold">Slots Filled:</span>{' '}
                    {generationStats.slotsFilled || 'N/A'}
                  </div>
                  <div>
                    <span className="font-bold">Cache Size:</span>{' '}
                    {generationStats.cacheSize || 'N/A'} entries
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="font-bold">Algorithm:</span> Two-level heuristic (MCV + LCV)
                  </div>
                  <div className="text-[10px] opacity-70 mt-1">
                    MCV = Most Constrained Variable, LCV = Least Constraining Value
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
              disabled={loading}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            <p className="text-xs text-text-secondary mt-1">
              Puzzle number will be auto-calculated from date
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
              disabled={loading}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Symmetry Controls */}
        <div>
          <label className="block text-sm font-bold text-text-primary mb-3">
            Black Square Symmetry
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSymmetryType(SYMMETRY_TYPES.NONE)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                symmetryType === SYMMETRY_TYPES.NONE
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
            >
              No Symmetry
            </button>
            <button
              type="button"
              onClick={() => setSymmetryType(SYMMETRY_TYPES.ROTATIONAL)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                symmetryType === SYMMETRY_TYPES.ROTATIONAL
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
            >
              Rotational
            </button>
            <button
              type="button"
              onClick={() => setSymmetryType(SYMMETRY_TYPES.HORIZONTAL)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                symmetryType === SYMMETRY_TYPES.HORIZONTAL
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
            >
              Horizontal
            </button>
            <button
              type="button"
              onClick={() => setSymmetryType(SYMMETRY_TYPES.VERTICAL)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                symmetryType === SYMMETRY_TYPES.VERTICAL
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
            >
              Vertical
            </button>
            <button
              type="button"
              onClick={() => setSymmetryType(SYMMETRY_TYPES.DIAGONAL_NESW)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                symmetryType === SYMMETRY_TYPES.DIAGONAL_NESW
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
            >
              NE/SW Diagonal
            </button>
            <button
              type="button"
              onClick={() => setSymmetryType(SYMMETRY_TYPES.DIAGONAL_NWSE)}
              className={`px-3 py-2 text-xs font-bold rounded-lg border-[2px] transition-all ${
                symmetryType === SYMMETRY_TYPES.DIAGONAL_NWSE
                  ? 'bg-accent-yellow text-gray-900 border-black'
                  : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
              }`}
            >
              NW/SE Diagonal
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Symmetry is applied when placing black squares (■)
          </p>
        </div>

        {/* Grid Editor with Word Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-text-primary">
                5×5 Grid * (Click cells to edit, double-click for black square ■)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentDirection('across')}
                  className={`px-2 py-1 text-xs font-bold rounded border-[2px] ${
                    currentDirection === 'across'
                      ? 'bg-accent-yellow text-gray-900 border-black'
                      : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
                  }`}
                >
                  Across
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDirection('down')}
                  className={`px-2 py-1 text-xs font-bold rounded border-[2px] ${
                    currentDirection === 'down'
                      ? 'bg-accent-yellow text-gray-900 border-black'
                      : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
                  }`}
                >
                  Down
                </button>
              </div>
            </div>
            <div className="inline-block bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
              <div className="grid grid-cols-5 gap-1">
                {formData.grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <input
                      key={`${rowIndex}-${colIndex}`}
                      type="text"
                      maxLength="1"
                      value={cell === '■' ? '■' : cell}
                      onChange={(e) => {
                        let newValue = e.target.value.toUpperCase();
                        // Handle period as black square
                        if (newValue === '.') {
                          newValue = '■';
                        }
                        if (newValue === '' || /^[A-Z■]$/.test(newValue)) {
                          handleGridChange(rowIndex, colIndex, newValue);
                          // If a letter was typed, auto-advance
                          if (/^[A-Z]$/.test(newValue)) {
                            setTimeout(() => advanceToNextCell(), 0);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Prevent default input behavior for special keys
                        if (
                          e.key === 'ArrowUp' ||
                          e.key === 'ArrowDown' ||
                          e.key === 'ArrowLeft' ||
                          e.key === 'ArrowRight' ||
                          e.key === ' '
                        ) {
                          e.preventDefault();
                        }
                      }}
                      onDoubleClick={() => toggleBlackSquare(rowIndex, colIndex)}
                      onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                      onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                      className={`grid-cell w-12 h-12 text-center text-lg font-bold uppercase border-[2px] ${
                        cell === '■'
                          ? 'bg-black text-white border-black'
                          : 'bg-ghost-white dark:bg-gray-800 border-black dark:border-white'
                      } ${
                        selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                          ? 'ring-2 ring-yellow-500'
                          : ''
                      }`}
                      disabled={loading}
                    />
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Tip: Type to fill letters and auto-advance. Type <strong>.</strong> (period) for black
              squares. Use arrows to navigate, Space to toggle direction.
            </p>
            {errors.grid && <p className="text-red-500 text-xs mt-1">{errors.grid}</p>}
          </div>

          {/* Word Suggestions Panel */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-bold text-text-primary mb-2">
              Word Suggestions ({currentDirection})
              {wordsLoaded && <span className="text-xs text-green-600 ml-2">✓ Loaded</span>}
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 border-[2px] border-black dark:border-white rounded-lg p-3 max-h-[400px] overflow-y-auto">
              {!wordsLoaded ? (
                <div>
                  <p className="text-xs text-text-secondary">Loading word lists...</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Check browser console for details
                  </p>
                </div>
              ) : !selectedCell ? (
                <p className="text-xs text-text-secondary">Select a cell to see suggestions</p>
              ) : wordSuggestions.length === 0 ? (
                <div>
                  <p className="text-xs text-text-secondary">
                    No valid words found for this pattern
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Try filling more letters or check console
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-text-secondary mb-2">
                    {wordSuggestions.length} word{wordSuggestions.length !== 1 ? 's' : ''} found
                  </p>
                  {wordSuggestions.map((word, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => fillWord(word)}
                      className="w-full text-left px-2 py-1 text-sm font-mono bg-ghost-white dark:bg-gray-800 hover:bg-accent-yellow dark:hover:bg-accent-yellow hover:text-gray-900 border border-gray-300 rounded transition-colors"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Across Clues */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-text-primary">Across Clues</label>
            <button
              type="button"
              onClick={() => addClue('across')}
              className="px-2 py-1 text-xs font-bold bg-accent-green text-white rounded-lg border-[2px] border-black"
              disabled={loading}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {formData.clues.across.map((clue, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <input
                  type="number"
                  placeholder="#"
                  value={clue.number || ''}
                  onChange={(e) => handleClueChange('across', index, 'number', e.target.value)}
                  className="col-span-1 px-2 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm"
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="Clue text"
                  value={clue.clue || ''}
                  onChange={(e) => handleClueChange('across', index, 'clue', e.target.value)}
                  className="col-span-7 px-3 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm"
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="ANSWER"
                  value={clue.answer || ''}
                  onChange={(e) =>
                    handleClueChange('across', index, 'answer', e.target.value.toUpperCase())
                  }
                  className="col-span-3 px-3 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm uppercase"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => removeClue('across', index)}
                  className="col-span-1 px-2 py-2 text-xs font-bold bg-red-500 text-white rounded-lg border-[2px] border-black"
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Down Clues */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-text-primary">Down Clues</label>
            <button
              type="button"
              onClick={() => addClue('down')}
              className="px-2 py-1 text-xs font-bold bg-accent-green text-white rounded-lg border-[2px] border-black"
              disabled={loading}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {formData.clues.down.map((clue, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <input
                  type="number"
                  placeholder="#"
                  value={clue.number || ''}
                  onChange={(e) => handleClueChange('down', index, 'number', e.target.value)}
                  className="col-span-1 px-2 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm"
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="Clue text"
                  value={clue.clue || ''}
                  onChange={(e) => handleClueChange('down', index, 'clue', e.target.value)}
                  className="col-span-7 px-3 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm"
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="ANSWER"
                  value={clue.answer || ''}
                  onChange={(e) =>
                    handleClueChange('down', index, 'answer', e.target.value.toUpperCase())
                  }
                  className="col-span-3 px-3 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm uppercase"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => removeClue('down', index)}
                  className="col-span-1 px-2 py-2 text-xs font-bold bg-red-500 text-white rounded-lg border-[2px] border-black"
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {errors.clues && <p className="text-red-500 text-xs mt-1">{errors.clues}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t-2 border-black dark:border-white">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 font-bold bg-accent-yellow text-gray-900 rounded-lg border-[3px] border-black hover:translate-y-[-2px] transition-all disabled:opacity-50"
            style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
          >
            {loading ? 'Saving...' : puzzle ? 'Update Puzzle' : 'Create Puzzle'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-lg border-[3px] border-black dark:border-white hover:translate-y-[-2px] transition-all"
            style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
