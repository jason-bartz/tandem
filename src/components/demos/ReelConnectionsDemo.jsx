'use client';
import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import DemoContainer from './DemoContainer';
import useDemoTimeline from './useDemoTimeline';

// Movies with emojis for visual interest — groups are scattered across the grid
const MOCK_MOVIES = [
  { title: 'Alien', emoji: '👽', color: 'bg-emerald-700', group: 0 },
  { title: 'Inception', emoji: '🌀', color: 'bg-indigo-700', group: 1 },
  { title: 'Up', emoji: '🎈', color: 'bg-sky-600', group: 2 },
  { title: 'Drive', emoji: '🏎️', color: 'bg-pink-700', group: 3 },
  { title: 'Jaws', emoji: '🦈', color: 'bg-blue-700', group: 0 },
  { title: 'Coco', emoji: '💀', color: 'bg-orange-600', group: 2 },
  { title: 'Tenet', emoji: '⏳', color: 'bg-cyan-800', group: 1 },
  { title: 'Heat', emoji: '🔥', color: 'bg-red-800', group: 3 },
  { title: 'Psycho', emoji: '🔪', color: 'bg-purple-800', group: 0 },
  { title: 'Fury', emoji: '💥', color: 'bg-stone-700', group: 3 },
  { title: 'Memento', emoji: '📷', color: 'bg-gray-700', group: 1 },
  { title: 'Moana', emoji: '🌊', color: 'bg-blue-500', group: 2 },
  { title: 'The Ring', emoji: '📼', color: 'bg-slate-700', group: 0 },
  { title: 'Primer', emoji: '🔬', color: 'bg-teal-800', group: 1 },
  { title: 'Brave', emoji: '🏹', color: 'bg-emerald-600', group: 2 },
  { title: 'Ronin', emoji: '⚔️', color: 'bg-amber-800', group: 3 },
];

const CATEGORIES = [
  { name: 'Horror Classics', color: 'bg-red-500', indices: [0, 4, 8, 12] },
  { name: 'Mind-Bending Plots', color: 'bg-blue-500', indices: [1, 6, 10, 13] },
  { name: 'Animated Films', color: 'bg-green-500', indices: [2, 5, 11, 14] },
  { name: 'Action & Cars', color: 'bg-amber-500', indices: [3, 7, 9, 15] },
];

// Select scattered movies (not sequential), submit, reveal
export const REEL_TIMELINE = [
  // Horror: indices 0, 4, 8, 12 (scattered across grid)
  { at: 0.5, action: 'select', data: { index: 0 } },
  { at: 0.9, action: 'select', data: { index: 4 } },
  { at: 1.3, action: 'select', data: { index: 8 } },
  { at: 1.7, action: 'select', data: { index: 12 } },
  { at: 2.3, action: 'submit' },
  { at: 2.8, action: 'reveal', data: { categoryIdx: 0 } },
  // Mind-Bending: indices 1, 6, 10, 13
  { at: 4.0, action: 'select', data: { index: 1 } },
  { at: 4.3, action: 'select', data: { index: 6 } },
  { at: 4.6, action: 'select', data: { index: 10 } },
  { at: 4.9, action: 'select', data: { index: 13 } },
  { at: 5.5, action: 'submit' },
  { at: 6.0, action: 'reveal', data: { categoryIdx: 1 } },
  // Animated: indices 2, 5, 11, 14
  { at: 7.2, action: 'select', data: { index: 2 } },
  { at: 7.5, action: 'select', data: { index: 5 } },
  { at: 7.8, action: 'select', data: { index: 11 } },
  { at: 8.1, action: 'select', data: { index: 14 } },
  { at: 8.7, action: 'submit' },
  { at: 9.2, action: 'reveal', data: { categoryIdx: 2 } },
  // Action auto-reveals (last group)
  { at: 10.4, action: 'reveal', data: { categoryIdx: 3 } },
  // Pause before loop
  { at: 12.5, action: 'reset' },
];

function MovieCard({ movie, isSelected }) {
  return (
    <motion.div
      className={`aspect-[2/3] rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
        isSelected ? 'ring-2 ring-accent-yellow' : ''
      } ${movie.color}`}
      animate={isSelected ? { scale: 0.93 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <span className="text-sm">{movie.emoji}</span>
      <span className="text-[8px] font-bold text-white text-center leading-tight px-0.5">
        {movie.title}
      </span>
    </motion.div>
  );
}

export default function ReelConnectionsDemo({ timeline, onCaptionChange } = {}) {
  const { reduceMotion } = useTheme();
  const activeTimeline = timeline || REEL_TIMELINE;
  const { history, caption } = useDemoTimeline(activeTimeline, { paused: reduceMotion });

  useEffect(() => {
    if (onCaptionChange && caption !== null) {
      onCaptionChange(caption);
    }
  }, [caption, onCaptionChange]);

  const state = useMemo(() => {
    const selected = new Set();
    const revealedCategories = [];
    const revealedIndices = new Set();

    for (let i = 0; i < history.length; i++) {
      const event = activeTimeline[i];
      if (!event) break;
      if (event.action === 'select') {
        selected.add(event.data.index);
      }
      if (event.action === 'submit') {
        selected.clear();
      }
      if (event.action === 'reveal') {
        selected.clear();
        const cat = CATEGORIES[event.data.categoryIdx];
        revealedCategories.push(cat);
        cat.indices.forEach((idx) => revealedIndices.add(idx));
      }
      if (event.action === 'reset') {
        selected.clear();
        revealedCategories.length = 0;
        revealedIndices.clear();
      }
    }

    return {
      selected: new Set(selected),
      revealedCategories: [...revealedCategories],
      revealedIndices: new Set(revealedIndices),
    };
  }, [history, activeTimeline]);

  // Build the grid: revealed categories at top (same card size), remaining movies below
  const remainingMovies = MOCK_MOVIES.map((movie, i) => ({ movie, index: i })).filter(
    ({ index }) => !state.revealedIndices.has(index)
  );

  const staticContent = (
    <div className="p-3 bg-gray-950">
      <div className="grid grid-cols-4 gap-1">
        {MOCK_MOVIES.map((movie, i) => (
          <div
            key={i}
            className={`aspect-[2/3] rounded-md flex flex-col items-center justify-center gap-0.5 ${movie.color}`}
          >
            <span className="text-sm">{movie.emoji}</span>
            <span className="text-[8px] font-bold text-white text-center leading-tight px-0.5">
              {movie.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <DemoContainer staticContent={staticContent}>
      <div className="p-3 bg-gray-950">
        {/* Full 4-column grid: revealed rows on top, remaining cards fill below */}
        <div className="grid grid-cols-4 gap-1">
          {/* Revealed category rows — 4 poster cards with connection name overlaid */}
          {state.revealedCategories.map((cat) => (
            <motion.div
              key={cat.name}
              className={`col-span-4 ${cat.color} rounded-md relative grid grid-cols-4 gap-1 p-1`}
              initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {cat.indices.map((idx) => (
                <div
                  key={idx}
                  className="aspect-[2/3] rounded-sm flex flex-col items-center justify-center gap-0.5 bg-white/10"
                >
                  <span className="text-xs">{MOCK_MOVIES[idx].emoji}</span>
                  <span className="text-[7px] font-bold text-white/90 text-center leading-tight">
                    {MOCK_MOVIES[idx].title}
                  </span>
                </div>
              ))}
              {/* Connection name overlay — centered over the posters like the real game */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`${cat.color} px-2 py-1 rounded-md`}>
                  <span className="text-[9px] font-bold text-white">{cat.name}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Remaining unrevealed movies */}
          {remainingMovies.map(({ movie, index }) => (
            <MovieCard key={index} movie={movie} isSelected={state.selected.has(index)} />
          ))}
        </div>

        {/* Submit button area */}
        <div className="flex justify-center mt-2">
          <motion.div
            className={`px-4 py-1 rounded-md text-[10px] font-bold transition-colors duration-200 ${
              state.selected.size === 4
                ? 'bg-accent-yellow text-gray-900'
                : 'bg-gray-700 text-gray-400'
            }`}
            animate={state.selected.size === 4 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            Submit
          </motion.div>
        </div>
      </div>
    </DemoContainer>
  );
}
