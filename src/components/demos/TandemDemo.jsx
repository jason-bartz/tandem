'use client';
import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import DemoContainer from './DemoContainer';
import useDemoTimeline from './useDemoTimeline';

const MOCK_PUZZLES = [
  { emojis: '🌅☀️', answer: 'SUN', length: 3 },
  { emojis: '🍞🔥', answer: 'TOAST', length: 5 },
  { emojis: '📈💹', answer: 'STOCKS', length: 6 },
  { emojis: '🎈🎉', answer: 'PARTY', length: 5 },
];

export const TANDEM_TIMELINE = [
  // Select first puzzle and type answer
  { at: 0.5, action: 'focusRow', data: { row: 0 } },
  { at: 1.0, action: 'type', data: { row: 0, letters: 'S' } },
  { at: 1.2, action: 'type', data: { row: 0, letters: 'SU' } },
  { at: 1.4, action: 'type', data: { row: 0, letters: 'SUN' } },
  { at: 2.0, action: 'submit', data: { row: 0, correct: true } },
  // Second puzzle — wrong guess first
  { at: 3.0, action: 'focusRow', data: { row: 1 } },
  { at: 3.4, action: 'type', data: { row: 1, letters: 'B' } },
  { at: 3.6, action: 'type', data: { row: 1, letters: 'BR' } },
  { at: 3.8, action: 'type', data: { row: 1, letters: 'BRE' } },
  { at: 4.0, action: 'type', data: { row: 1, letters: 'BREA' } },
  { at: 4.2, action: 'type', data: { row: 1, letters: 'BREAD' } },
  { at: 4.8, action: 'submit', data: { row: 1, correct: false } },
  // Correct guess with revealed letter
  { at: 5.8, action: 'clearRow', data: { row: 1 } },
  { at: 6.2, action: 'type', data: { row: 1, letters: 'T' } },
  { at: 6.4, action: 'type', data: { row: 1, letters: 'TO' } },
  { at: 6.6, action: 'type', data: { row: 1, letters: 'TOA' } },
  { at: 6.8, action: 'type', data: { row: 1, letters: 'TOAS' } },
  { at: 7.0, action: 'type', data: { row: 1, letters: 'TOAST' } },
  { at: 7.6, action: 'submit', data: { row: 1, correct: true } },
  // Third puzzle
  { at: 8.5, action: 'focusRow', data: { row: 2 } },
  { at: 8.9, action: 'type', data: { row: 2, letters: 'S' } },
  { at: 9.1, action: 'type', data: { row: 2, letters: 'ST' } },
  { at: 9.3, action: 'type', data: { row: 2, letters: 'STO' } },
  { at: 9.5, action: 'type', data: { row: 2, letters: 'STOC' } },
  { at: 9.7, action: 'type', data: { row: 2, letters: 'STOCK' } },
  { at: 9.9, action: 'type', data: { row: 2, letters: 'STOCKS' } },
  { at: 10.5, action: 'submit', data: { row: 2, correct: true } },
  // Fourth puzzle
  { at: 11.3, action: 'focusRow', data: { row: 3 } },
  { at: 11.7, action: 'type', data: { row: 3, letters: 'P' } },
  { at: 11.9, action: 'type', data: { row: 3, letters: 'PA' } },
  { at: 12.1, action: 'type', data: { row: 3, letters: 'PAR' } },
  { at: 12.3, action: 'type', data: { row: 3, letters: 'PART' } },
  { at: 12.5, action: 'type', data: { row: 3, letters: 'PARTY' } },
  { at: 13.1, action: 'submit', data: { row: 3, correct: true } },
  // Pause before loop
  { at: 15.0, action: 'reset' },
];

function LetterBlock({ letter, state }) {
  const bgClass =
    state === 'correct'
      ? 'bg-accent-green text-white'
      : state === 'wrong'
        ? 'bg-accent-red/20 dark:bg-red-900/20 text-red-900 dark:text-red-400'
        : state === 'active'
          ? 'bg-accent-blue text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-text-primary';

  return (
    <div
      className={`w-5 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold ${bgClass}`}
    >
      {letter || ''}
    </div>
  );
}

function PuzzleRow({ puzzle, typed, rowState, isFocused }) {
  const letters = [];
  for (let i = 0; i < puzzle.length; i++) {
    const letter = typed?.[i] || '';
    let cellState = 'empty';
    if (rowState === 'correct') cellState = 'correct';
    else if (rowState === 'wrong') cellState = 'wrong';
    else if (letter && isFocused) cellState = 'active';
    letters.push({ letter, state: cellState });
  }

  return (
    <motion.div
      className="flex items-center gap-1.5"
      animate={rowState === 'wrong' ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-10 text-center text-base">{puzzle.emojis}</div>
      <div className="flex gap-0.5">
        {letters.map((l, i) => (
          <LetterBlock key={i} letter={l.letter} state={l.state} />
        ))}
      </div>
    </motion.div>
  );
}

export default function TandemDemo({ timeline, onCaptionChange } = {}) {
  const { reduceMotion } = useTheme();
  const activeTimeline = timeline || TANDEM_TIMELINE;
  const { history, caption } = useDemoTimeline(activeTimeline, { paused: reduceMotion });

  useEffect(() => {
    if (onCaptionChange && caption !== null) {
      onCaptionChange(caption);
    }
  }, [caption, onCaptionChange]);

  const state = useMemo(() => {
    const rows = MOCK_PUZZLES.map(() => ({
      typed: '',
      state: 'pending', // pending | wrong | correct
    }));
    let focusedRow = -1;
    let mistakes = 0;

    for (let i = 0; i < history.length; i++) {
      const event = activeTimeline[i];
      if (!event) break;
      switch (event.action) {
        case 'focusRow':
          focusedRow = event.data.row;
          break;
        case 'type':
          rows[event.data.row].typed = event.data.letters;
          break;
        case 'clearRow':
          rows[event.data.row].typed = '';
          rows[event.data.row].state = 'pending';
          break;
        case 'submit':
          if (event.data.correct) {
            rows[event.data.row].state = 'correct';
            rows[event.data.row].typed = MOCK_PUZZLES[event.data.row].answer;
          } else {
            rows[event.data.row].state = 'wrong';
            mistakes++;
          }
          break;
        case 'reset':
          rows.forEach((r) => {
            r.typed = '';
            r.state = 'pending';
          });
          focusedRow = -1;
          mistakes = 0;
          break;
      }
    }

    return { rows, focusedRow, mistakes };
  }, [history, activeTimeline]);

  const staticContent = (
    <div className="p-3 bg-bg-surface dark:bg-gray-900">
      <div className="space-y-2">
        {MOCK_PUZZLES.map((puzzle, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-10 text-center text-base">{puzzle.emojis}</div>
            <div className="flex gap-0.5">
              {Array.from({ length: puzzle.length }).map((_, j) => (
                <div key={j} className="w-5 h-6 rounded-sm bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <DemoContainer staticContent={staticContent}>
      <div className="p-3 bg-bg-surface dark:bg-gray-900">
        {/* Mistakes counter */}
        <div className="flex items-center justify-end gap-1 mb-2">
          <span className="text-[9px] text-text-muted">Mistakes:</span>
          <span
            className={`text-[10px] font-bold ${state.mistakes > 0 ? 'text-accent-red' : 'text-text-muted'}`}
          >
            {state.mistakes}/4
          </span>
        </div>

        {/* Puzzle rows */}
        <div className="space-y-2">
          {MOCK_PUZZLES.map((puzzle, i) => (
            <PuzzleRow
              key={i}
              puzzle={puzzle}
              typed={state.rows[i].typed}
              rowState={state.rows[i].state}
              isFocused={state.focusedRow === i}
            />
          ))}
        </div>

        {/* Check button */}
        <div className="flex justify-center mt-3">
          <motion.div
            className={`px-4 py-1 rounded-md text-[10px] font-bold transition-colors duration-200 ${
              state.focusedRow >= 0 && state.rows[state.focusedRow]?.typed
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-text-muted'
            }`}
          >
            Check
          </motion.div>
        </div>
      </div>
    </DemoContainer>
  );
}
