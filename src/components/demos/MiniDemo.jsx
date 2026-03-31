'use client';
import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import DemoContainer from './DemoContainer';
import useDemoTimeline from './useDemoTimeline';

// Simple 5x5 grid: null = black square, string = answer letter
const GRID = [
  ['S', 'T', 'A', 'R', null],
  ['H', null, null, 'I', 'F'],
  ['A', 'C', 'E', 'S', null],
  ['R', null, null, 'E', 'N'],
  ['P', 'E', 'N', null, 'D'],
];

const CLUES = {
  across: {
    '1A': {
      text: 'Celestial body',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    },
    '3A': {
      text: 'Playing cards',
      cells: [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
      ],
    },
    '5A': {
      text: 'Writing tool',
      cells: [
        [4, 0],
        [4, 1],
        [4, 2],
      ],
    },
  },
  down: {
    '1D': {
      text: 'Keen',
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    },
    '2D': {
      text: 'Climb',
      cells: [
        [0, 3],
        [1, 3],
        [2, 3],
        [3, 3],
      ],
    },
  },
};

// Timeline: type across clue 1, then down clue 1D partial, then across 3, etc.
export const MINI_TIMELINE = [
  // Highlight 1-Across and type STAR
  { at: 0.5, action: 'highlightClue', data: { clue: '1A' } },
  { at: 1.0, action: 'typeCell', data: { row: 0, col: 0, letter: 'S' } },
  { at: 1.3, action: 'typeCell', data: { row: 0, col: 1, letter: 'T' } },
  { at: 1.6, action: 'typeCell', data: { row: 0, col: 2, letter: 'A' } },
  { at: 1.9, action: 'typeCell', data: { row: 0, col: 3, letter: 'R' } },
  // Move to 3-Across: ACES
  { at: 2.8, action: 'highlightClue', data: { clue: '3A' } },
  { at: 3.2, action: 'typeCell', data: { row: 2, col: 0, letter: 'A' } },
  { at: 3.5, action: 'typeCell', data: { row: 2, col: 1, letter: 'C' } },
  { at: 3.8, action: 'typeCell', data: { row: 2, col: 2, letter: 'E' } },
  { at: 4.1, action: 'typeCell', data: { row: 2, col: 3, letter: 'S' } },
  // 5-Across: PEN
  { at: 5.0, action: 'highlightClue', data: { clue: '5A' } },
  { at: 5.4, action: 'typeCell', data: { row: 4, col: 0, letter: 'P' } },
  { at: 5.7, action: 'typeCell', data: { row: 4, col: 1, letter: 'E' } },
  { at: 6.0, action: 'typeCell', data: { row: 4, col: 2, letter: 'N' } },
  // 1-Down: SHARP (S, H, A, R, P — S and A and P already filled)
  { at: 6.9, action: 'highlightClue', data: { clue: '1D' } },
  { at: 7.3, action: 'typeCell', data: { row: 1, col: 0, letter: 'H' } },
  { at: 7.8, action: 'typeCell', data: { row: 3, col: 0, letter: 'R' } },
  // 2-Down: RISE
  { at: 8.7, action: 'highlightClue', data: { clue: '2D' } },
  { at: 9.1, action: 'typeCell', data: { row: 1, col: 3, letter: 'I' } },
  { at: 9.6, action: 'typeCell', data: { row: 3, col: 3, letter: 'E' } },
  // Fill remaining: IF (1,3-4), FN (1,4 + 3,4 + 4,4)
  { at: 10.3, action: 'typeCell', data: { row: 1, col: 4, letter: 'F' } },
  { at: 10.6, action: 'typeCell', data: { row: 3, col: 4, letter: 'N' } },
  { at: 10.9, action: 'typeCell', data: { row: 4, col: 4, letter: 'D' } },
  // All complete
  { at: 11.5, action: 'complete' },
  // Pause before loop
  { at: 13.5, action: 'reset' },
];

function Cell({ letter, isBlack, isHighlighted, isSelected, isCorrect, clueNumber }) {
  if (isBlack) {
    return <div className="aspect-square bg-gray-900 dark:bg-gray-950" />;
  }

  const bgClass = isCorrect
    ? 'bg-accent-green dark:bg-accent-green text-gray-900'
    : isSelected
      ? 'bg-accent-blue dark:bg-accent-blue text-gray-900'
      : isHighlighted
        ? 'bg-blue-100 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100'
        : 'bg-bg-card dark:bg-gray-900 text-gray-900 dark:text-gray-100';

  return (
    <div
      className={`aspect-square relative flex items-center justify-center border-r border-b border-border-main ${bgClass}`}
    >
      {clueNumber && (
        <span className="absolute top-0 left-0.5 text-[6px] font-bold text-gray-700 dark:text-gray-300">
          {clueNumber}
        </span>
      )}
      <span className="text-xs font-bold">{letter || ''}</span>
    </div>
  );
}

// Map cells to clue numbers
const CLUE_NUMBERS = {};
CLUE_NUMBERS['0,0'] = '1';
CLUE_NUMBERS['0,3'] = '2';
CLUE_NUMBERS['2,0'] = '3';
CLUE_NUMBERS['2,3'] = '4';
CLUE_NUMBERS['4,0'] = '5';
CLUE_NUMBERS['1,4'] = '6';
CLUE_NUMBERS['3,4'] = '7';

export default function MiniDemo({ timeline, onCaptionChange } = {}) {
  const { reduceMotion } = useTheme();
  const activeTimeline = timeline || MINI_TIMELINE;
  const { history, caption } = useDemoTimeline(activeTimeline, { paused: reduceMotion });

  useEffect(() => {
    if (onCaptionChange && caption !== null) {
      onCaptionChange(caption);
    }
  }, [caption, onCaptionChange]);

  const state = useMemo(() => {
    const filled = {};
    let activeClue = null;
    let complete = false;
    let selectedCell = null;

    for (let i = 0; i < history.length; i++) {
      const event = activeTimeline[i];
      if (!event) break;
      switch (event.action) {
        case 'highlightClue':
          activeClue = event.data.clue;
          break;
        case 'typeCell':
          filled[`${event.data.row},${event.data.col}`] = event.data.letter;
          selectedCell = `${event.data.row},${event.data.col}`;
          break;
        case 'complete':
          complete = true;
          activeClue = null;
          selectedCell = null;
          break;
        case 'reset':
          Object.keys(filled).forEach((k) => delete filled[k]);
          activeClue = null;
          complete = false;
          selectedCell = null;
          break;
      }
    }

    // Get highlighted cells for active clue
    const highlightedCells = new Set();
    if (activeClue) {
      const clueGroup = activeClue.endsWith('A') ? 'across' : 'down';
      const clueData = CLUES[clueGroup][activeClue];
      if (clueData) {
        clueData.cells.forEach(([r, c]) => highlightedCells.add(`${r},${c}`));
      }
    }

    return { filled: { ...filled }, activeClue, highlightedCells, complete, selectedCell };
  }, [history, activeTimeline]);

  // Get active clue text
  const activeClueText = useMemo(() => {
    if (!state.activeClue) return null;
    const clueGroup = state.activeClue.endsWith('A') ? 'across' : 'down';
    return CLUES[clueGroup][state.activeClue]?.text;
  }, [state.activeClue]);

  const staticContent = (
    <div className="p-3 bg-bg-surface dark:bg-gray-900">
      <div className="grid grid-cols-5 gap-0 border border-border-main max-w-[160px] mx-auto">
        {GRID.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              isBlack={cell === null}
              clueNumber={CLUE_NUMBERS[`${r},${c}`]}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <DemoContainer staticContent={staticContent}>
      <div className="p-3 bg-bg-surface dark:bg-gray-900">
        {/* Active clue display */}
        <div className="h-5 mb-2 flex items-center justify-center">
          {activeClueText && (
            <motion.span
              className="text-[10px] font-medium text-text-secondary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              key={state.activeClue}
            >
              {state.activeClue}: {activeClueText}
            </motion.span>
          )}
          {state.complete && (
            <motion.span
              className="text-[10px] font-bold text-accent-green"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Complete!
            </motion.span>
          )}
        </div>

        {/* 5x5 Grid */}
        <div className="grid grid-cols-5 gap-0 border border-border-main max-w-[160px] mx-auto">
          {GRID.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              return (
                <Cell
                  key={`${r}-${c}`}
                  letter={state.filled[key] || ''}
                  isBlack={cell === null}
                  isHighlighted={state.highlightedCells.has(key)}
                  isSelected={state.selectedCell === key}
                  isCorrect={state.complete && cell !== null}
                  clueNumber={CLUE_NUMBERS[key]}
                />
              );
            })
          )}
        </div>
      </div>
    </DemoContainer>
  );
}
