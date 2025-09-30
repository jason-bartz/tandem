/**
 * Memoized components for performance optimization
 * Prevents unnecessary re-renders
 */

'use client';
import { memo } from 'react';
import PuzzleRow from './PuzzleRow';
import StatsBar from './StatsBar';

// Memoized PuzzleRow - only re-renders when its specific props change
export const MemoizedPuzzleRow = memo(PuzzleRow, (prevProps, nextProps) => {
  return (
    prevProps.emoji === nextProps.emoji &&
    prevProps.answer === nextProps.answer &&
    prevProps.isCorrect === nextProps.isCorrect &&
    prevProps.isWrong === nextProps.isWrong &&
    prevProps.activeHint === nextProps.activeHint &&
    prevProps.index === nextProps.index
  );
});
MemoizedPuzzleRow.displayName = 'MemoizedPuzzleRow';

// Memoized StatsBar - only re-renders when stats change
export const MemoizedStatsBar = memo(StatsBar, (prevProps, nextProps) => {
  return (
    prevProps.mistakes === nextProps.mistakes &&
    prevProps.solved === nextProps.solved &&
    prevProps.time === nextProps.time &&
    prevProps.hintsUsed === nextProps.hintsUsed
  );
});
MemoizedStatsBar.displayName = 'MemoizedStatsBar';

// Export all memoized components
export default {
  MemoizedPuzzleRow,
  MemoizedStatsBar,
};
