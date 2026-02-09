'use client';

import { useState, useMemo } from 'react';

/**
 * CandidateList — CrossFire-style scored candidate word list
 *
 * Shows all viable words for the selected slot with Word Score and Grid Score columns.
 * Supports sorting, filtering, click-to-place, and hover preview.
 */
export default function CandidateList({
  candidates,
  totalCandidates,
  viableCandidates,
  slot,
  isLoading,
  onPlaceWord,
  onHoverWord,
  disabled,
}) {
  const [sortBy, setSortBy] = useState('combined'); // 'combined' | 'wordScore' | 'gridScore' | 'score' | 'alpha'
  const [filter, setFilter] = useState('');

  const sortedCandidates = useMemo(() => {
    if (!candidates || candidates.length === 0) return [];

    let filtered = candidates;
    if (filter) {
      const upper = filter.toUpperCase();
      filtered = candidates.filter((c) => c.word.includes(upper));
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'wordScore':
        sorted.sort((a, b) => b.wordScore - a.wordScore || a.word.localeCompare(b.word));
        break;
      case 'gridScore':
        sorted.sort((a, b) => b.gridScore - a.gridScore || b.wordScore - a.wordScore);
        break;
      case 'score':
        sorted.sort(
          (a, b) =>
            b.gridScore * b.wordScore - a.gridScore * a.wordScore || b.wordScore - a.wordScore
        );
        break;
      case 'alpha':
        sorted.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'combined':
      default:
        sorted.sort(
          (a, b) =>
            b.gridScore * b.wordScore - a.gridScore * a.wordScore || b.wordScore - a.wordScore
        );
        break;
    }

    return sorted;
  }, [candidates, sortBy, filter]);

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
          <span className="text-sm font-black font-mono tracking-widest text-text-primary">
            {slot.pattern}
          </span>
          <span className="text-[10px] font-bold uppercase text-text-secondary">
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
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter..."
        className="w-full px-2 py-1 text-xs rounded border-[2px] border-gray-300 dark:border-gray-600 bg-ghost-white dark:bg-gray-800 text-text-primary mb-2"
      />

      {/* Sort buttons */}
      <div className="flex gap-1 mb-2">
        {[
          { key: 'combined', label: 'Best' },
          { key: 'wordScore', label: 'W.Sc' },
          { key: 'gridScore', label: 'G.Sc' },
          { key: 'score', label: 'F.Sc' },
          { key: 'alpha', label: 'A-Z' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortBy(key)}
            className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
              sortBy === key
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'bg-ghost-white dark:bg-gray-800 text-text-secondary border-gray-300 dark:border-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

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
          <div className="grid grid-cols-12 gap-1 px-1 py-1 text-[10px] font-bold text-text-secondary border-b border-gray-300 dark:border-gray-600 sticky top-0 bg-gray-50 dark:bg-gray-900">
            <div className="col-span-4">Word</div>
            <div className="col-span-2 text-right">W.Sc</div>
            <div className="col-span-3 text-right">G.Sc</div>
            <div className="col-span-3 text-right">F.Sc</div>
          </div>

          <div className="space-y-0">
            {sortedCandidates.map((cand, i) => (
              <button
                key={cand.word}
                type="button"
                onClick={() => onPlaceWord?.(cand.word)}
                onMouseEnter={() => onHoverWord?.(cand.word)}
                onMouseLeave={() => onHoverWord?.(null)}
                disabled={disabled}
                className={`w-full grid grid-cols-12 gap-1 px-1 py-1 text-xs transition-colors ${
                  !cand.viable
                    ? 'opacity-40 line-through'
                    : 'hover:bg-accent-yellow hover:text-gray-900'
                } ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-100/50 dark:bg-gray-800/50'}`}
              >
                <span className="col-span-4 font-mono font-bold text-left truncate">
                  {cand.word}
                </span>
                <span className="col-span-2 text-right tabular-nums">{cand.wordScore}</span>
                <span
                  className={`col-span-3 text-right tabular-nums ${
                    cand.gridScore >= 8
                      ? 'text-green-600 dark:text-green-400'
                      : cand.gridScore >= 4
                        ? 'text-text-primary'
                        : 'text-red-500'
                  }`}
                >
                  {cand.gridScore.toFixed(1)}
                </span>
                <span className="col-span-3 text-right tabular-nums text-text-secondary">
                  {((cand.wordScore * cand.gridScore) / 100).toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
