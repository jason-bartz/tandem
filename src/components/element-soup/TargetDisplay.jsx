'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * StatsDisplay - Shows time, moves count, and par (compact version)
 * Note: Currently unused but kept for potential future use
 */
export function StatsDisplay({ time, moves, parMoves, formatTime }) {
  return (
    <div className="flex items-center justify-between">
      {/* Timer */}
      <div className="font-bold text-text-primary text-base tabular-nums">{formatTime(time)}</div>

      {/* Moves and Par */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary">{moves}</span>
        </div>
        {parMoves && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-text-primary">{parMoves}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * TargetDisplay - Compact target element display (no border/box)
 */
export function TargetDisplay({ targetElement, targetEmoji, isFound = false }) {
  return (
    <div
      className={cn('flex items-center gap-2', isFound && 'animate-pulse')}
      role="status"
      aria-label={`Target: ${targetElement}${isFound ? ' (Found!)' : ''}`}
    >
      <span className="text-xl" role="img" aria-hidden="true">
        {targetEmoji}
      </span>
      <div className="flex flex-col">
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide',
            isFound
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-soup-dark dark:text-soup-primary'
          )}
        >
          {isFound ? 'Found!' : 'Target'}
        </span>
        <span className="text-sm font-bold text-text-primary leading-tight">{targetElement}</span>
      </div>
    </div>
  );
}

/**
 * StatsAndTargetRow - Compact stats bar similar to Mini/Tandem
 */
export function StatsAndTargetRow({
  time,
  moves,
  formatTime,
  targetElement,
  targetEmoji,
  parMoves,
  isTargetFound = false,
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      {/* Left side - Target */}
      <TargetDisplay
        targetElement={targetElement}
        targetEmoji={targetEmoji}
        isFound={isTargetFound}
      />

      {/* Right side - Stats */}
      <div className="flex items-center gap-4">
        {/* Timer */}
        <div className="flex items-center gap-1">
          <Image
            src="/icons/ui/stopwatch.png"
            alt="Time"
            width={18}
            height={18}
            className="opacity-70"
          />
          <span className="font-bold text-text-primary text-base tabular-nums">
            {formatTime(time)}
          </span>
        </div>

        {/* Moves */}
        <div className="flex items-center gap-1">
          <Image
            src="/icons/ui/par.png"
            alt="Moves"
            width={18}
            height={18}
            className="opacity-70"
          />
          <span className="font-bold text-text-primary">{moves}</span>
          {parMoves && <span className="text-sm text-text-secondary">/ {parMoves}</span>}
        </div>
      </div>
    </div>
  );
}

export default TargetDisplay;
