'use client';

import { useMemo } from 'react';

/**
 * LetterCounts — CrossFire-style compact letter frequency display.
 * Shows A:count pairs in a grid layout, placed below the candidate panel.
 */
export default function LetterCounts({ grid }) {
  const counts = useMemo(() => {
    const result = {};
    for (let i = 0; i < 26; i++) {
      result[String.fromCharCode(65 + i)] = 0;
    }

    let totalLetters = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell && cell !== '■' && /^[A-Z]$/i.test(cell)) {
          result[cell.toUpperCase()]++;
          totalLetters++;
        }
      }
    }

    return { letters: result, total: totalLetters };
  }, [grid]);

  const entries = Object.entries(counts.letters);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-[2px] border-black dark:border-white rounded-lg px-2.5 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide">
          Letter counts
        </span>
        <span className="text-[10px] font-medium text-text-secondary">{counts.total}/25</span>
      </div>
      <div className="grid grid-cols-7 gap-x-2 gap-y-0.5">
        {entries.map(([letter, count]) => (
          <span
            key={letter}
            className={`text-[11px] font-mono whitespace-nowrap ${
              count === 0
                ? 'text-gray-300 dark:text-gray-600'
                : count >= 3
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-text-primary font-medium'
            }`}
          >
            {letter}:{count}
          </span>
        ))}
      </div>
    </div>
  );
}
