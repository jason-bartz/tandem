'use client';

import { useState, useMemo, memo } from 'react';

const RENDER_LIMIT = 200;

/**
 * CandidateList — CrossFire-style scored candidate word list
 *
 * Shows all viable words for the selected slot with Word Score and Grid Score columns.
 * Supports filtering, click-to-place, and hover preview.
 * Filter searches ALL candidates; only top RENDER_LIMIT are rendered to keep typing fast.
 */
export default memo(function CandidateList({
  candidates,
  totalCandidates,
  viableCandidates,
  slot,
  isLoading,
  onPlaceWord,
  onHoverWord,
  disabled,
}) {
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  const sortedCandidates = useMemo(() => {
    if (!candidates || candidates.length === 0) return [];

    let filtered = candidates;
    if (filter) {
      const upper = filter.toUpperCase();
      filtered = candidates.filter((c) => c.word.includes(upper));
    }

    const sorted = [...filtered];
    sorted.sort(
      (a, b) => b.gridScore * b.wordScore - a.gridScore * a.wordScore || b.wordScore - a.wordScore
    );

    return sorted;
  }, [candidates, filter]);

  const visibleCandidates = useMemo(() => {
    if (showAll || filter) return sortedCandidates;
    return sortedCandidates.slice(0, RENDER_LIMIT);
  }, [sortedCandidates, showAll, filter]);

  const hiddenCount = sortedCandidates.length - visibleCandidates.length;

  if (!slot) {
    return (
      <div className="text-xs text-text-secondary p-3">Select a cell to see candidate words</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-text-primary">
            {slot.direction} {slot.length}
          </span>
        </div>
        <div className="text-[11px] font-medium text-text-secondary mt-0.5">
          {totalCandidates > 0 ? (
            <>
              <span className="font-bold text-text-primary">{viableCandidates}</span>
              {' of '}
              {totalCandidates.toLocaleString()}
              {' viable'}
              {filter && ` (${sortedCandidates.length} shown)`}
            </>
          ) : (
            'No matches'
          )}
        </div>
      </div>

      {/* Filter */}
      <input
        type="text"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setShowAll(false);
        }}
        placeholder="Filter..."
        className="w-full px-2 py-1 text-xs rounded border-[2px] border-gray-300 dark:border-gray-600 bg-ghost-white dark:bg-gray-800 text-text-primary mb-2"
      />

      {/* Candidate table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin h-4 w-4 border-2 border-accent-blue border-t-transparent rounded-full mr-2" />
          <span className="text-xs text-text-secondary">Finding candidates...</span>
        </div>
      ) : sortedCandidates.length === 0 ? (
        <div className="text-xs text-text-secondary p-3 text-center">
          {filter ? 'No matches for filter' : 'No viable candidates'}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-1 px-1 py-1 text-[10px] font-bold text-text-secondary border-b border-gray-300 dark:border-gray-600 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
            <div className="col-span-5">Word</div>
            <div className="col-span-3 text-right">W.Sc</div>
            <div className="col-span-4 text-right">G.Sc</div>
          </div>

          <div className="space-y-0">
            {visibleCandidates.map((cand, i) => (
              <button
                key={cand.word}
                type="button"
                onClick={() => onPlaceWord?.(cand.word)}
                onMouseEnter={() => onHoverWord?.(cand.word)}
                onMouseLeave={() => onHoverWord?.(null)}
                disabled={disabled}
                title={`${cand.word} — Word: ${cand.wordScore}, Grid: ${cand.gridScore.toFixed(1)}`}
                className={`w-full grid grid-cols-12 gap-1 px-1 py-1 text-xs transition-colors ${
                  !cand.viable
                    ? 'opacity-40 line-through'
                    : 'hover:bg-accent-yellow hover:text-gray-900'
                } ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-100/50 dark:bg-gray-800/50'}`}
              >
                <span className="col-span-5 font-mono font-bold text-left truncate">
                  {cand.word}
                </span>
                <span className="col-span-3 text-right tabular-nums">{cand.wordScore}</span>
                <span
                  className={`col-span-4 text-right tabular-nums ${
                    cand.gridScore >= 8
                      ? 'text-green-600 dark:text-green-400'
                      : cand.gridScore >= 4
                        ? 'text-text-primary'
                        : 'text-red-500'
                  }`}
                >
                  {cand.gridScore.toFixed(1)}
                </span>
              </button>
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-[11px] font-bold text-accent-blue hover:underline"
            >
              Show {hiddenCount} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
});
