'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { playButtonTone } from '@/lib/sounds';
import MiniGrid from './MiniGrid';

/**
 * MiniStartScreen Component
 * Displays blurred grid with Start button overlay
 * Timer begins when user clicks Start
 */
export default function MiniStartScreen({ puzzle, onStart }) {
  const { highContrast, reduceMotion } = useTheme();
  const { mediumTap } = useHaptics();

  const handleStartClick = () => {
    try {
      playButtonTone();
      mediumTap();
    } catch (e) {
      // Sound might fail
    }
    onStart?.();
  };

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-text-secondary">Loading puzzle...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      {/* Blurred grid in background */}
      <div className="relative w-full max-w-md">
        <MiniGrid
          grid={puzzle.grid}
          userGrid={puzzle.grid} // Show full grid (blurred)
          clueNumbers={puzzle.clueNumbers || []}
          selectedCell={{ row: 0, col: 0 }}
          currentDirection="across"
          currentClue={null}
          correctCells={new Set()}
          onCellClick={() => {}}
          disabled={true}
          blur={true}
        />

        {/* Start button overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className={`
              rounded-[32px]
              border-[3px] border-black dark:border-gray-600
              shadow-[6px_6px_0px_rgba(0,0,0,1)]
              dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]
              p-8
              ${
                highContrast
                  ? 'bg-hc-surface'
                  : 'bg-white dark:bg-gray-800'
              }
            `}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-text-primary mb-2">
                Ready to solve?
              </h2>
              <p className="text-sm text-text-secondary">
                Click Start to begin the timer
              </p>
            </div>

            <button
              onClick={handleStartClick}
              className={`
                w-full px-12 py-4
                rounded-[20px]
                border-[3px] border-black dark:border-gray-600
                shadow-[4px_4px_0px_rgba(0,0,0,1)]
                dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                font-black text-lg
                tracking-wider
                transition-all
                ${
                  highContrast
                    ? 'bg-hc-primary text-white'
                    : 'bg-accent-yellow dark:bg-accent-yellow text-gray-900'
                }
                ${
                  !reduceMotion &&
                  `hover:translate-x-[2px] hover:translate-y-[2px]
                  hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                  active:translate-x-[4px] active:translate-y-[4px]
                  active:shadow-none`
                }
              `}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
