'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';
import CandidateList from './CandidateList';
import LetterCounts from './LetterCounts';

const SYMMETRY_TYPES = {
  NONE: 'none',
  ROTATIONAL: 'rotational',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  DIAGONAL_NESW: 'diagonal-nesw',
  DIAGONAL_NWSE: 'diagonal-nwse',
};

/**
 * MiniPuzzleEditor — CrossFire-inspired crossword construction tool
 *
 * Features:
 * - CSP solver with scored word dictionary (via /api/admin/mini/fill)
 * - Candidate list with Word Score + Grid Score columns
 * - Quick Fill: auto-fill with randomness (each click = different fill)
 * - Best Location: jump to most constrained slot
 * - Grid Preview: hover candidates to preview gray letters
 * - Letter counts: A-Z frequency in current grid
 * - Fill/Clues tabs in right panel
 * - AI clue generation (kept from original)
 */
export default function MiniPuzzleEditor({ puzzle, date, onSave, onCancel, loading }) {
  // ─── Core State ────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    date: date || '',
    difficulty: 'easy',
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
  const symmetryType = SYMMETRY_TYPES.NONE;
  const [currentDirection, setCurrentDirection] = useState('across');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);

  // ─── Phase 4: New State ────────────────────────────────────────
  const [candidates, setCandidates] = useState([]);
  const [candidateSlot, setCandidateSlot] = useState(null);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [viableCandidates, setViableCandidates] = useState(0);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [previewWord, setPreviewWord] = useState(null); // Hovered candidate for gray preview
  const [status, setStatus] = useState('Ready');
  const [gridHistory, setGridHistory] = useState([]);
  const [fillScores, setFillScores] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // ─── Phase 5: Theme Seed State ───────────────────────────────
  const [themeInput, setThemeInput] = useState('');
  const [seedWords, setSeedWords] = useState(null); // AI-generated seed words with validation

  // ─── Grid Words Extraction ────────────────────────────────────
  const extractGridWords = useCallback((grid) => {
    const clueNumbers = Array(5)
      .fill()
      .map(() => Array(5).fill(null));
    const words = { across: [], down: [] };
    let currentNumber = 1;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = grid[row][col];
        if (cell === '■' || cell === '') continue;

        const startsAcross =
          (col === 0 || grid[row][col - 1] === '■') &&
          col < 4 &&
          grid[row][col + 1] !== '■' &&
          grid[row][col + 1] !== '';

        const startsDown =
          (row === 0 || grid[row - 1][col] === '■') &&
          row < 4 &&
          grid[row + 1][col] !== '■' &&
          grid[row + 1][col] !== '';

        if (startsAcross || startsDown) {
          clueNumbers[row][col] = currentNumber;

          if (startsAcross) {
            let word = '';
            let c = col;
            while (c < 5 && grid[row][c] !== '■' && grid[row][c] !== '') {
              word += grid[row][c];
              c++;
            }
            if (word.length >= 2) {
              words.across.push({
                number: currentNumber,
                word: word.toUpperCase(),
                row,
                col,
                direction: 'across',
              });
            }
          }

          if (startsDown) {
            let word = '';
            let r = row;
            while (r < 5 && grid[r][col] !== '■' && grid[r][col] !== '') {
              word += grid[r][col];
              r++;
            }
            if (word.length >= 2) {
              words.down.push({
                number: currentNumber,
                word: word.toUpperCase(),
                row,
                col,
                direction: 'down',
              });
            }
          }

          currentNumber++;
        }
      }
    }

    return { clueNumbers, words };
  }, []);

  const { words: gridWords } = extractGridWords(formData.grid);

  // ─── Symmetry ──────────────────────────────────────────────────
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

  // ─── Grid Manipulation ─────────────────────────────────────────
  const handleGridChange = useCallback(
    (row, col, value) => {
      const newGrid = applySymmetry(formData.grid, row, col, value);
      setFormData((prev) => ({ ...prev, grid: newGrid }));
    },
    [formData.grid, applySymmetry]
  );

  const getCurrentWordCells = useCallback(() => {
    if (!selectedCell) return [];

    const { row, col } = selectedCell;
    const grid = formData.grid;
    const cells = [];

    if (currentDirection === 'across') {
      let startCol = col;
      while (startCol > 0 && grid[row][startCol - 1] !== '■') startCol--;
      let endCol = col;
      while (endCol < 4 && grid[row][endCol + 1] !== '■') endCol++;
      for (let c = startCol; c <= endCol; c++) cells.push({ row, col: c });
    } else {
      let startRow = row;
      while (startRow > 0 && grid[startRow - 1][col] !== '■') startRow--;
      let endRow = row;
      while (endRow < 4 && grid[endRow + 1][col] !== '■') endRow++;
      for (let r = startRow; r <= endRow; r++) cells.push({ row: r, col });
    }

    return cells;
  }, [selectedCell, formData.grid, currentDirection]);

  const currentWordCells = getCurrentWordCells();
  const currentWordCellsSet = new Set(currentWordCells.map((c) => `${c.row},${c.col}`));

  // Compute current slot ID for fill API
  const currentSlotId = useMemo(() => {
    if (!selectedCell || currentWordCells.length < 2) return null;
    const first = currentWordCells[0];
    return `${currentDirection}-${first.row}-${first.col}`;
  }, [selectedCell, currentWordCells, currentDirection]);

  // Compute preview cells from hovered candidate word
  const previewCells = useMemo(() => {
    if (!previewWord || !currentWordCells.length) return new Map();
    const cells = new Map();
    for (let i = 0; i < currentWordCells.length && i < previewWord.length; i++) {
      const { row, col } = currentWordCells[i];
      const existing = formData.grid[row][col];
      // Only show preview for empty cells or cells that would change
      if (!existing || existing === '' || existing !== previewWord[i]) {
        cells.set(`${row},${col}`, previewWord[i]);
      }
    }
    return cells;
  }, [previewWord, currentWordCells, formData.grid]);

  const currentWordHasEmpty = useMemo(() => {
    return currentWordCells.some(({ row, col }) => {
      const cell = formData.grid[row][col];
      return !cell || cell === '';
    });
  }, [currentWordCells, formData.grid]);

  const isBoardFilled = useMemo(() => {
    return formData.grid.every((row) => row.every((cell) => cell && cell !== ''));
  }, [formData.grid]);

  const advanceToNextCell = useCallback(() => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const grid = formData.grid;

    if (currentDirection === 'across') {
      let r = row;
      let c = col + 1;
      while (r < 5) {
        while (c < 5) {
          if (grid[r][c] !== '■') {
            setSelectedCell({ row: r, col: c });
            return;
          }
          c++;
        }
        r++;
        c = 0;
      }
    } else {
      let r = row + 1;
      let c = col;
      while (c < 5) {
        while (r < 5) {
          if (grid[r][c] !== '■') {
            setSelectedCell({ row: r, col: c });
            return;
          }
          r++;
        }
        c++;
        r = 0;
      }
    }
  }, [selectedCell, formData.grid, currentDirection]);

  const goToPreviousCell = useCallback(() => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const grid = formData.grid;

    if (currentDirection === 'across') {
      let r = row;
      let c = col - 1;
      while (r >= 0) {
        while (c >= 0) {
          if (grid[r][c] !== '■') {
            const newGrid = formData.grid.map((rowArr) => [...rowArr]);
            newGrid[r][c] = '';
            setFormData((prev) => ({ ...prev, grid: newGrid }));
            setSelectedCell({ row: r, col: c });
            return;
          }
          c--;
        }
        r--;
        c = 4;
      }
    } else {
      let r = row - 1;
      let c = col;
      while (c >= 0) {
        while (r >= 0) {
          if (grid[r][c] !== '■') {
            const newGrid = formData.grid.map((rowArr) => [...rowArr]);
            newGrid[r][c] = '';
            setFormData((prev) => ({ ...prev, grid: newGrid }));
            setSelectedCell({ row: r, col: c });
            return;
          }
          r--;
        }
        c--;
        r = 4;
      }
    }
  }, [selectedCell, formData.grid, currentDirection]);

  const handleLetterInGrid = useCallback(
    (letter) => {
      if (!selectedCell) return;

      const { row, col } = selectedCell;

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

      setTimeout(() => advanceToNextCell(), 0);
    },
    [selectedCell, formData.grid, advanceToNextCell, applySymmetry]
  );

  const handleBackspaceInGrid = useCallback(() => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const currentValue = formData.grid[row][col];

    if (!currentValue || currentValue === '') {
      goToPreviousCell();
    } else {
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

  // ─── Fill Word ──────────────────────────────────────────────────
  const fillWord = useCallback(
    (word) => {
      if (!selectedCell || !word) return;

      setGridHistory((prev) => [...prev, formData.grid.map((r) => [...r])]);
      setFillScores(null);

      const { row, col } = selectedCell;
      const newGrid = formData.grid.map((r) => [...r]);

      if (currentDirection === 'across') {
        let startCol = col;
        while (startCol > 0 && newGrid[row][startCol - 1] !== '■') startCol--;
        for (let i = 0; i < word.length; i++) {
          if (startCol + i < 5) newGrid[row][startCol + i] = word[i];
        }
      } else {
        let startRow = row;
        while (startRow > 0 && newGrid[startRow - 1][col] !== '■') startRow--;
        for (let i = 0; i < word.length; i++) {
          if (startRow + i < 5) newGrid[startRow + i][col] = word[i];
        }
      }

      setFormData((prev) => ({ ...prev, grid: newGrid }));
      setPreviewWord(null);
    },
    [selectedCell, formData.grid, currentDirection]
  );

  // ─── Undo ───────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (gridHistory.length === 0) return;
    const prev = gridHistory[gridHistory.length - 1];
    setGridHistory((h) => h.slice(0, -1));
    setFormData((fd) => ({ ...fd, grid: prev }));
    setFillScores(null);
  }, [gridHistory]);

  // ─── AI Fill Word ───────────────────────────────────────────────
  const aiFillWord = useCallback(async () => {
    if (!currentSlotId || !currentWordHasEmpty) return;

    // Use already-loaded candidates if they match current slot
    if (candidates.length > 0 && candidateSlot?.id === currentSlotId) {
      const best = candidates.find((c) => c.viable);
      if (best) {
        fillWord(best.word);
        setStatus(`Placed ${best.word} (score: ${best.wordScore})`);
        return;
      }
    }

    // Fetch candidates fresh
    setStatus('Finding best word...');
    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'candidates',
          grid: formData.grid,
          slotId: currentSlotId,
          minScore: 25,
        }),
      });

      if (!response.ok) throw new Error('Failed');
      const result = await response.json();

      if (result.success && result.candidates?.length > 0) {
        const best = result.candidates.find((c) => c.viable) || result.candidates[0];
        if (best) {
          fillWord(best.word);
          setStatus(`Placed ${best.word} (score: ${best.wordScore})`);
          return;
        }
      }
      setStatus('No viable words for this slot');
    } catch (error) {
      logger.error('[MiniPuzzleEditor] AI fill error:', error);
      setStatus('No viable words found');
    }
  }, [currentSlotId, currentWordHasEmpty, candidates, candidateSlot, formData.grid, fillWord]);

  // ─── Fill API: Fetch Candidates ─────────────────────────────────
  const fetchCandidates = useCallback(async () => {
    if (!currentSlotId || isLoadingCandidates) return;

    // Don't fetch if selected cell is a black square
    if (selectedCell && formData.grid[selectedCell.row][selectedCell.col] === '■') {
      setCandidates([]);
      setCandidateSlot(null);
      return;
    }

    setIsLoadingCandidates(true);
    setStatus('Finding candidates...');

    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'candidates',
          grid: formData.grid,
          slotId: currentSlotId,
          minScore: 25,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch candidates');
      }

      const result = await response.json();
      if (result.success) {
        setCandidates(result.candidates || []);
        setCandidateSlot(result.slot);
        setTotalCandidates(result.totalCandidates || 0);
        setViableCandidates(result.viableCandidates || 0);
        setStatus('Ready');
      }
    } catch (error) {
      logger.error('[MiniPuzzleEditor] Candidate fetch error:', error);
      setCandidates([]);
      setStatus('Error loading candidates');
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [currentSlotId, formData.grid, selectedCell, isLoadingCandidates]);

  // ─── Fill API: Quick Fill ───────────────────────────────────────
  const quickFill = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setStatus('Filling grid...');

    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'quickfill',
          grid: formData.grid,
          minScore: 40,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Quick fill failed');
      }

      const result = await response.json();

      if (result.success) {
        setGridHistory((prev) => [...prev, formData.grid.map((r) => [...r])]);
        setFormData((prev) => ({ ...prev, grid: result.solution }));
        // Scores will be populated by the auto-evaluate effect
        setFillScores(null);
        setStatus(`Filled in ${result.elapsedMs}ms (avg score: ${result.averageWordScore})`);
      } else {
        setStatus(`Fill failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('[MiniPuzzleEditor] Quick fill error:', error);
      setStatus(`Fill failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, formData.grid]);

  // ─── Fill API: Best Location ────────────────────────────────────
  const bestLocation = useCallback(async () => {
    setStatus('Finding best location...');

    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'bestlocation',
          grid: formData.grid,
          minScore: 25,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Best location failed');
      }

      const result = await response.json();

      if (result.success && result.slot) {
        // Navigate to the best slot
        setSelectedCell({ row: result.slot.startRow, col: result.slot.startCol });
        setCurrentDirection(result.slot.direction);
        setStatus(result.reason);
      } else {
        setStatus(result.reason || 'All slots filled');
      }
    } catch (error) {
      logger.error('[MiniPuzzleEditor] Best location error:', error);
      setStatus(`Error: ${error.message}`);
    }
  }, [formData.grid]);

  // ─── Fill API: Theme Seed Words ────────────────────────────────
  const fetchThemeSeedWords = useCallback(async () => {
    if (!themeInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setStatus('Generating theme words...');
    setSeedWords(null);

    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'themeseed',
          grid: formData.grid,
          theme: themeInput.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Theme seed generation failed');
      }

      const result = await response.json();

      if (result.success) {
        setSeedWords(result.seedWords);
        const validCount = result.validCount;
        setStatus(`Found ${validCount} valid theme words (${result.elapsedMs}ms)`);
      } else {
        throw new Error(result.error || 'No seed words generated');
      }
    } catch (error) {
      logger.error('[MiniPuzzleEditor] Theme seed error:', error);
      setStatus(`Theme failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [themeInput, isGenerating, formData.grid]);

  const themedFill = useCallback(async () => {
    if (!themeInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setStatus('Generating themed puzzle...');

    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'themedFill',
          grid: formData.grid,
          theme: themeInput.trim(),
          minScore: 25,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Themed fill failed');
      }

      const result = await response.json();

      if (result.success) {
        setGridHistory((prev) => [...prev, formData.grid.map((r) => [...r])]);
        setFormData((prev) => ({ ...prev, grid: result.solution }));
        // Scores will be populated by the auto-evaluate effect
        setFillScores(null);
        const seedList = result.seedWords?.map((s) => s.word).join(', ') || '';
        setStatus(`Themed fill complete (${result.elapsedMs}ms, seeds: ${seedList})`);
        setSeedWords(
          result.seedWords?.map((s) => ({
            word: s.word,
            inDictionary: true,
            score: 0,
          })) || null
        );
      } else {
        // Show seed words even on failure so user can try manually
        if (result.seedWords) {
          setSeedWords(result.seedWords);
        }
        setStatus(`Themed fill failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('[MiniPuzzleEditor] Themed fill error:', error);
      setStatus(`Themed fill failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [themeInput, isGenerating, formData.grid]);

  // ─── Grid Evaluation ──────────────────────────────────────────
  const evaluateGrid = useCallback(async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);

    try {
      const response = await fetch('/api/admin/mini/fill', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          action: 'evaluate',
          grid: formData.grid,
        }),
      });

      if (!response.ok) return;
      const result = await response.json();

      if (result.success && result.quality) {
        setFillScores(result.quality);
      }
    } catch {
      // Silently fail — evaluation is non-critical
    } finally {
      setIsEvaluating(false);
    }
  }, [formData.grid, isEvaluating]);

  // ─── Clue Management ───────────────────────────────────────────
  const handleClueChange = (direction, index, field, value) => {
    const newClues = { ...formData.clues };
    if (!newClues[direction][index]) {
      newClues[direction][index] = {};
    }
    const processedValue = field === 'number' ? parseInt(value, 10) || 0 : value;
    newClues[direction][index] = {
      ...newClues[direction][index],
      [field]: processedValue,
    };
    setFormData((prev) => ({ ...prev, clues: newClues }));
  };

  const generateAiClues = async () => {
    const allWords = [...gridWords.across, ...gridWords.down];
    if (allWords.length === 0) {
      alert('No words in the grid to generate clues for.');
      return;
    }

    const hasIncompleteWords = allWords.some((w) => !w.word || w.word.includes('.'));
    if (hasIncompleteWords) {
      alert('Please fill in all words completely before generating clues.');
      return;
    }

    setIsGeneratingClues(true);
    setStatus('Generating clues...');

    try {
      const response = await fetch('/api/admin/mini/clues', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ words: allWords }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate clues');
      }

      const result = await response.json();

      if (result.success && result.clues) {
        const newAcross = formData.clues.across.map((clue) => {
          const generated = result.clues.find(
            (c) => c.word === clue.answer && c.direction === 'across'
          );
          return generated ? { ...clue, clue: generated.clue } : clue;
        });

        const newDown = formData.clues.down.map((clue) => {
          const generated = result.clues.find(
            (c) => c.word === clue.answer && c.direction === 'down'
          );
          return generated ? { ...clue, clue: generated.clue } : clue;
        });

        setFormData((prev) => ({
          ...prev,
          clues: { across: newAcross, down: newDown },
        }));

        setStatus(`Generated ${result.clues.length} clues`);
      }
    } catch (error) {
      logger.error('[MiniPuzzleEditor] AI clue generation error:', error);
      setStatus(`Clue generation failed: ${error.message}`);
    } finally {
      setIsGeneratingClues(false);
    }
  };

  // ─── Form Validation & Submit ──────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';

    const hasContent = formData.grid.some((row) => row.some((cell) => cell && cell !== '■'));
    if (!hasContent) {
      newErrors.grid = 'Grid must have at least one filled cell';
    }

    if (formData.clues.across.length === 0 && formData.clues.down.length === 0) {
      newErrors.clues = 'At least one clue is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const puzzleData = {
        date: formData.date,
        difficulty: formData.difficulty,
        grid: formData.grid.map((row) => row.map((cell) => (cell ? cell : ''))),
        solution: formData.grid,
        clues: formData.clues,
      };
      onSave(puzzleData);
    }
  };

  const clearAll = () => {
    if (!confirm('Clear all grid content and clues? This cannot be undone.')) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      grid: Array(5)
        .fill()
        .map(() => Array(5).fill('')),
      clues: { across: [], down: [] },
    }));
    setSelectedCell(null);
    setCandidates([]);
    setCandidateSlot(null);
    setGridHistory([]);
    setFillScores(null);
    setStatus('Ready');
  };

  // ─── Effects ───────────────────────────────────────────────────

  // Load puzzle data if editing
  useEffect(() => {
    if (puzzle) {
      setFormData({
        date: puzzle.date,
        difficulty: puzzle.difficulty || 'easy',
        grid: puzzle.solution || puzzle.grid,
        clues: puzzle.clues,
      });
    } else if (date) {
      setFormData((prev) => ({ ...prev, date }));
    }
  }, [puzzle, date]);

  // Auto-sync clues with grid changes
  useEffect(() => {
    const newAcross = gridWords.across.map((wordInfo) => {
      const existingClue = formData.clues.across.find(
        (c) => c.answer === wordInfo.word || c.number === wordInfo.number
      );
      return {
        number: wordInfo.number,
        clue: existingClue?.clue || '',
        answer: wordInfo.word,
      };
    });

    const newDown = gridWords.down.map((wordInfo) => {
      const existingClue = formData.clues.down.find(
        (c) => c.answer === wordInfo.word || c.number === wordInfo.number
      );
      return {
        number: wordInfo.number,
        clue: existingClue?.clue || '',
        answer: wordInfo.word,
      };
    });

    const cluesChanged =
      JSON.stringify(newAcross) !== JSON.stringify(formData.clues.across) ||
      JSON.stringify(newDown) !== JSON.stringify(formData.clues.down);

    if (cluesChanged && (newAcross.length > 0 || newDown.length > 0)) {
      setFormData((prev) => ({
        ...prev,
        clues: { across: newAcross, down: newDown },
      }));
    }
  }, [gridWords.across, gridWords.down]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-evaluate grid quality when board is filled (debounced to avoid lag while typing)
  useEffect(() => {
    if (!isBoardFilled) {
      setFillScores(null);
      return;
    }
    const timer = setTimeout(() => evaluateGrid(), 500);
    return () => clearTimeout(timer);
  }, [isBoardFilled, formData.grid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch candidates when slot selection changes
  useEffect(() => {
    if (currentSlotId) {
      fetchCandidates();
    } else {
      setCandidates([]);
      setCandidateSlot(null);
    }
    setPreviewWord(null);
  }, [currentSlotId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus selected cell
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

  // Physical keyboard support
  useEffect(() => {
    const handlePhysicalKeyboard = (e) => {
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
        setCurrentDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      } else if (/^[a-zA-Z.]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInGrid(e.key === '.' ? '.' : e.key.toUpperCase());
      }
    };

    document.addEventListener('keydown', handlePhysicalKeyboard);
    return () => document.removeEventListener('keydown', handlePhysicalKeyboard);
  }, [selectedCell, handleBackspaceInGrid, handleArrowKey, handleLetterInGrid]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="bg-ghost-white dark:bg-gray-800 rounded-2xl border-[3px] border-black dark:border-white p-3 sm:p-4">
      {/* Header + Status */}
      <div className="mb-3">
        <h2 className="text-lg font-black text-text-primary">
          {puzzle ? 'Edit puzzle' : 'Create new puzzle'}
        </h2>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div
            className={`px-3 py-0.5 text-[11px] font-bold rounded-full border ${
              status === 'Ready'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300'
                : status.includes('failed') || status.includes('Error')
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300'
            }`}
          >
            {status}
          </div>
          {fillScores &&
            isBoardFilled &&
            (() => {
              const s = fillScores.score;
              const { label, bg, text, border } =
                s >= 85
                  ? {
                      label: 'Excellent',
                      bg: 'bg-green-100 dark:bg-green-900/30',
                      text: 'text-green-700 dark:text-green-400',
                      border: 'border-green-300',
                    }
                  : s >= 70
                    ? {
                        label: 'Good',
                        bg: 'bg-teal-100 dark:bg-teal-900/30',
                        text: 'text-teal-700 dark:text-teal-400',
                        border: 'border-teal-300',
                      }
                    : s >= 55
                      ? {
                          label: 'Average',
                          bg: 'bg-amber-100 dark:bg-amber-900/30',
                          text: 'text-amber-700 dark:text-amber-400',
                          border: 'border-amber-300',
                        }
                      : s >= 40
                        ? {
                            label: 'Below Avg',
                            bg: 'bg-orange-100 dark:bg-orange-900/30',
                            text: 'text-orange-700 dark:text-orange-400',
                            border: 'border-orange-300',
                          }
                        : {
                            label: 'Poor',
                            bg: 'bg-red-100 dark:bg-red-900/30',
                            text: 'text-red-700 dark:text-red-400',
                            border: 'border-red-300',
                          };
              return (
                <div
                  className={`px-3 py-0.5 text-[11px] font-bold rounded-full border ${bg} ${text} ${border}`}
                  title={`Avg: ${fillScores.averageWordScore} · Min: ${fillScores.minWordScore}${fillScores.weakWordCount > 0 ? ` · ${fillScores.weakWordCount} weak` : ''} · ${fillScores.letterVariety} unique letters`}
                >
                  {s} &middot; {label}
                </div>
              );
            })()}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex gap-1.5 mb-3">
        <button
          type="button"
          onClick={undo}
          disabled={loading || gridHistory.length === 0}
          className="px-2 py-1 text-xs font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-lg border-[2px] border-black dark:border-white hover:translate-y-[-1px] transition-all disabled:opacity-50"
          style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          title="Undo last word or fill"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={quickFill}
          disabled={loading || isGenerating}
          className="px-2 sm:px-2.5 py-1 text-xs font-bold bg-accent-blue text-white rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
          style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          title="Auto-fill grid using CSP solver (each click = different fill)"
        >
          {isGenerating ? 'Filling...' : 'Quick Fill'}
        </button>
        <button
          type="button"
          onClick={bestLocation}
          disabled={loading || isGenerating}
          className="px-2 sm:px-2.5 py-1 text-xs font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-lg border-[2px] border-black dark:border-white hover:translate-y-[-1px] transition-all disabled:opacity-50"
          style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          title="Jump to the most constrained unfilled slot"
        >
          <span className="sm:hidden">Best</span>
          <span className="hidden sm:inline">Best Location</span>
        </button>
        <button
          type="button"
          onClick={aiFillWord}
          disabled={loading || isGenerating || !currentSlotId || !currentWordHasEmpty}
          className="px-2 sm:px-2.5 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
          style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          title="Fill selected word with best candidate"
        >
          <span className="sm:hidden">AI</span>
          <span className="hidden sm:inline">AI Fill</span>
        </button>
      </div>

      {/* Theme Seed Row */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <input
          type="text"
          value={themeInput}
          onChange={(e) => setThemeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              themedFill();
            }
          }}
          placeholder="Theme (e.g. Space, Italian food...)"
          className="flex-1 min-w-[160px] px-2.5 py-1 text-xs rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary placeholder:text-text-secondary"
          disabled={loading || isGenerating}
        />
        <button
          type="button"
          onClick={themedFill}
          disabled={loading || isGenerating || !themeInput.trim()}
          className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
          style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          title="Generate themed puzzle: AI picks seed words, CSP fills the rest"
        >
          {isGenerating ? 'Generating...' : 'Theme Fill'}
        </button>
        <button
          type="button"
          onClick={fetchThemeSeedWords}
          disabled={loading || isGenerating || !themeInput.trim()}
          className="px-2.5 py-1 text-xs font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-lg border-[2px] border-black dark:border-white hover:translate-y-[-1px] transition-all disabled:opacity-50"
          style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          title="Preview theme words without filling (validate against dictionary)"
        >
          Preview Words
        </button>
      </div>

      {/* Seed Words Preview */}
      {seedWords && seedWords.length > 0 && (
        <div className="mb-4 p-2 bg-emerald-50 dark:bg-emerald-900/20 border-[2px] border-emerald-300 dark:border-emerald-700 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              Theme Seeds
            </span>
            <button
              type="button"
              onClick={() => setSeedWords(null)}
              className="text-[10px] text-text-secondary hover:text-text-primary"
            >
              dismiss
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {seedWords.map((sw) => (
              <span
                key={sw.word}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded border ${
                  sw.inDictionary
                    ? 'bg-emerald-100 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                    : 'bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600 line-through'
                }`}
                title={sw.inDictionary ? `In dictionary (score: ${sw.score})` : 'Not in dictionary'}
              >
                {sw.word}
                {sw.inDictionary && sw.score > 0 && (
                  <span className="text-[9px] ml-0.5 opacity-60">{sw.score}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
              disabled={loading}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
              disabled={loading}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Grid + Right Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Grid Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-primary">5x5 Grid *</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentDirection('across')}
                  className={`px-2 py-0.5 text-xs font-bold rounded border-[2px] ${
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
                  className={`px-2 py-0.5 text-xs font-bold rounded border-[2px] ${
                    currentDirection === 'down'
                      ? 'bg-accent-yellow text-gray-900 border-black'
                      : 'bg-ghost-white dark:bg-gray-700 text-text-primary border-gray-300'
                  }`}
                >
                  Down
                </button>
              </div>
            </div>

            {/* Grid with Preview Support */}
            <div className="inline-block rounded-lg overflow-hidden border-2 border-black dark:border-white">
              <div className="grid grid-cols-5">
                {formData.grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const cellKey = `${rowIndex},${colIndex}`;
                    const previewLetter = previewCells.get(cellKey);
                    const isSelected =
                      selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                    const isInWord = currentWordCellsSet.has(cellKey);

                    return (
                      <div key={cellKey} className="relative">
                        <input
                          type="text"
                          maxLength="1"
                          value={cell === '■' ? '■' : cell}
                          onChange={(e) => {
                            let newValue = e.target.value.toUpperCase();
                            if (newValue === '.') newValue = '■';
                            if (newValue === '' || /^[A-Z■]$/.test(newValue)) {
                              handleGridChange(rowIndex, colIndex, newValue);
                              if (/^[A-Z]$/.test(newValue)) {
                                setTimeout(() => advanceToNextCell(), 0);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
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
                          onDoubleClick={() =>
                            setCurrentDirection((d) => (d === 'across' ? 'down' : 'across'))
                          }
                          onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                          onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                          className={`grid-cell w-10 h-10 sm:w-12 sm:h-12 text-center text-base sm:text-lg font-bold uppercase border-r border-b border-gray-400 dark:border-gray-500 ${
                            colIndex === 4 ? 'border-r-0' : ''
                          } ${rowIndex === 4 ? 'border-b-0' : ''} ${
                            cell === '■'
                              ? 'bg-black text-white'
                              : isSelected
                                ? 'bg-accent-blue text-white ring-2 ring-yellow-400 ring-inset'
                                : isInWord
                                  ? 'bg-blue-100 dark:bg-blue-900/40'
                                  : 'bg-white dark:bg-gray-800'
                          }`}
                          style={previewLetter && !cell ? { color: 'transparent' } : undefined}
                          disabled={loading}
                        />
                        {/* Preview overlay for gray letters */}
                        {previewLetter && (!cell || cell === '') && (
                          <span className="absolute inset-0 flex items-center justify-center text-base sm:text-lg font-bold text-gray-400 dark:text-gray-500 pointer-events-none">
                            {previewLetter}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <p className="text-xs text-text-secondary mt-1.5">
              Type letters to auto-advance. <strong>.</strong> for black squares. Space to toggle
              direction. Arrows to navigate.
            </p>
            {errors.grid && <p className="text-red-500 text-xs mt-1">{errors.grid}</p>}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 border-[2px] border-black dark:border-white rounded-lg p-3 flex-1 min-h-[300px] max-h-[500px] flex flex-col">
              <CandidateList
                candidates={candidates}
                totalCandidates={totalCandidates}
                viableCandidates={viableCandidates}
                slot={candidateSlot}
                isLoading={isLoadingCandidates}
                onPlaceWord={fillWord}
                onHoverWord={setPreviewWord}
                disabled={loading || isGenerating}
              />
            </div>
            <LetterCounts grid={formData.grid} />
          </div>
        </div>

        {/* Clues Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-text-primary">
              Clues ({gridWords.across.length + gridWords.down.length})
            </h3>
            <button
              type="button"
              onClick={generateAiClues}
              disabled={
                loading ||
                isGeneratingClues ||
                (gridWords.across.length === 0 && gridWords.down.length === 0)
              }
              className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg border-[2px] border-black hover:bg-purple-700 disabled:opacity-50 transition-all"
              style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
            >
              {isGeneratingClues ? 'Generating...' : 'Generate Clues'}
            </button>
          </div>
          {errors.clues && <p className="text-red-500 text-xs mb-2">{errors.clues}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-text-primary mb-1.5 block">
                Across ({formData.clues.across.length})
              </label>
              <div className="space-y-1.5">
                {formData.clues.across.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No across words yet.</p>
                ) : (
                  formData.clues.across.map((clue, index) => (
                    <div key={index} className="flex gap-1 items-start">
                      <span className="px-1 py-1 text-[10px] font-bold text-text-secondary min-w-[20px] text-center">
                        {clue.number}
                      </span>
                      <input
                        type="text"
                        placeholder="Enter clue..."
                        value={clue.clue || ''}
                        onChange={(e) => handleClueChange('across', index, 'clue', e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs bg-ghost-white dark:bg-gray-800"
                        disabled={loading}
                      />
                      <span className="px-1 py-1 text-[10px] font-mono font-bold text-text-secondary">
                        {clue.answer}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-text-primary mb-1.5 block">
                Down ({formData.clues.down.length})
              </label>
              <div className="space-y-1.5">
                {formData.clues.down.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No down words yet.</p>
                ) : (
                  formData.clues.down.map((clue, index) => (
                    <div key={index} className="flex gap-1 items-start">
                      <span className="px-1 py-1 text-[10px] font-bold text-text-secondary min-w-[20px] text-center">
                        {clue.number}
                      </span>
                      <input
                        type="text"
                        placeholder="Enter clue..."
                        value={clue.clue || ''}
                        onChange={(e) => handleClueChange('down', index, 'clue', e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs bg-ghost-white dark:bg-gray-800"
                        disabled={loading}
                      />
                      <span className="px-1 py-1 text-[10px] font-mono font-bold text-text-secondary">
                        {clue.answer}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t-2 border-black dark:border-white">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-md sm:rounded-lg border-[2px] border-black dark:border-white hover:translate-y-[-1px] transition-all"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Calendar</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold bg-accent-yellow text-gray-900 rounded-md sm:rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            <span className="sm:hidden">{loading ? 'Saving...' : 'Save'}</span>
            <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save Puzzle'}</span>
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={isGenerating}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold bg-red-600 text-white rounded-md sm:rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
            title="Clear grid, clues, and stats"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
