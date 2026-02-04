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
  hintsRemaining = 0,
  onUseHint,
  hintDisabled = false,
  isCountdown = false,
  centered = false, // When true, centers the target with stats on right
}) {
  // Determine timer warning state for countdown mode
  const isLowTime = isCountdown && time <= 60; // Last minute
  const isCriticalTime = isCountdown && time <= 30; // Last 30 seconds

  return (
    <div
      className={cn(
        'flex items-center mb-3',
        // On mobile: always justify-between (left-aligned target, right-aligned stats)
        // On desktop with centered: center the target
        centered ? 'justify-between lg:justify-center' : 'justify-between'
      )}
    >
      {/* Spacer for centering - only visible on desktop when centered */}
      {centered && <div className="hidden lg:block lg:flex-1" />}

      {/* Center - Target */}
      <TargetDisplay
        targetElement={targetElement}
        targetEmoji={targetEmoji}
        isFound={isTargetFound}
      />

      {/* Right side - Stats and Hints */}
      <div className={cn('flex items-center gap-3', centered && 'lg:flex-1 lg:justify-end')}>
        {/* Hint Button */}
        {hintsRemaining > 0 && onUseHint && (
          <button
            onClick={onUseHint}
            disabled={hintDisabled}
            className={cn(
              'flex items-center gap-1 transition-all duration-200',
              hintDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:scale-105 hover:opacity-80 active:scale-95 cursor-pointer'
            )}
            aria-label={`Use hint (${hintsRemaining} of 4 remaining)`}
            title="Use hint"
          >
            <Image
              src="/icons/ui/hint.png"
              alt="Hint"
              width={22}
              height={22}
              className="w-[22px] h-[22px]"
            />
            <span className="font-bold text-text-primary text-sm">{hintsRemaining}/4</span>
          </button>
        )}

        {/* Timer */}
        <div className="flex items-center gap-1">
          <Image
            src="/icons/ui/stopwatch.png"
            alt="Time"
            width={18}
            height={18}
            className={cn('opacity-70', isCriticalTime && 'opacity-100')}
          />
          <span
            className={cn(
              'font-bold text-base tabular-nums transition-colors',
              isCriticalTime
                ? 'text-red-500 dark:text-red-400 animate-pulse'
                : isLowTime
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-text-primary'
            )}
          >
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
