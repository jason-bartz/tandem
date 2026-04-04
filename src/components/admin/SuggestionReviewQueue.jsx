'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import authService from '@/services/auth.service';
import { ASSET_VERSION } from '@/lib/constants';
import { Loader2, AlertTriangle } from 'lucide-react';

const GAMES = {
  tandem: {
    name: 'Daily Tandem',
    shortName: 'Tandem',
    icon: 'tandem.png',
    color: 'accent-blue',
    count: 3,
  },
  mini: {
    name: 'Daily Mini',
    shortName: 'Mini',
    icon: 'mini.png',
    color: 'accent-yellow',
    count: 4,
  },
  soup: {
    name: 'Daily Alchemy',
    shortName: 'Alchemy',
    icon: 'daily-alchemy.png',
    color: 'accent-green',
    count: 3,
  },
  reel: {
    name: 'Reel Connections',
    shortName: 'Reel',
    icon: 'movie.png',
    color: 'accent-red',
    count: 2,
  },
};

const GAME_ORDER = ['tandem', 'mini', 'soup', 'reel'];

export default function SuggestionReviewQueue({ date, onSelectSuggestion, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchSuggestions = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/suggestions?date=${date}`, {
        headers: await authService.getAuthHeaders(true),
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        if (data.suggestions?.length > 0 && !activeGame) {
          setActiveGame(data.suggestions[0].puzzleType);
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [date, activeGame]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleGenerate = async (games) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/suggestions/generate', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          date,
          games: games || undefined,
          force: true,
        }),
      });
      if (response.ok) {
        await fetchSuggestions();
      }
    } catch {
      // silently handle
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const response = await fetch('/api/admin/suggestions', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ id, status }),
      });
      if (response.ok) {
        await fetchSuggestions();
      }
    } catch {
      // silently handle
    } finally {
      setUpdatingId(null);
    }
  };

  const suggestionsByGame = {};
  for (const group of suggestions) {
    suggestionsByGame[group.puzzleType] = group.options;
  }

  const pendingCounts = {};
  for (const game of GAME_ORDER) {
    const opts = suggestionsByGame[game] || [];
    pendingCounts[game] = opts.filter((o) => o.status === 'pending').length;
  }
  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  const currentOptions = activeGame ? suggestionsByGame[activeGame] || [] : [];

  return (
    <div className="bg-bg-surface rounded-2xl border-2 border-border-light overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border-light flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold text-text-primary whitespace-nowrap">
            Puzzle Suggestions
          </h3>
          {totalPending > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-flat-accent text-white rounded-full">
              {totalPending}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate All'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-bg-card rounded-lg transition-colors text-text-secondary text-xs font-bold"
              aria-label="Close"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Game tabs */}
      <div className="flex border-b border-border-light overflow-x-auto scrollbar-hide">
        {GAME_ORDER.map((gameId) => {
          const game = GAMES[gameId];
          const isActive = activeGame === gameId;
          const pending = pendingCounts[gameId];
          const hasOptions = (suggestionsByGame[gameId] || []).length > 0;

          return (
            <button
              key={gameId}
              onClick={() => setActiveGame(gameId)}
              className={`
                flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 flex-1 sm:flex-none justify-center sm:justify-start
                ${isActive ? `border-${game.color} text-text-primary bg-bg-card` : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-card/50'}
              `}
            >
              <Image
                src={`/ui/games/${game.icon}?v=${ASSET_VERSION}`}
                alt=""
                width={16}
                height={16}
              />
              <span className="hidden sm:inline">{game.name}</span>
              <span className="sm:hidden">{game.shortName}</span>
              {pending > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-${game.color} text-white`}
                >
                  {pending}
                </span>
              )}
              {!hasOptions && <span className="text-text-muted text-[10px]">--</span>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-text-muted" />
          </div>
        ) : currentOptions.length === 0 ? (
          <EmptyState
            gameId={activeGame}
            generating={generating}
            onGenerate={() => handleGenerate(activeGame ? [activeGame] : undefined)}
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {currentOptions.map((option) => (
              <SuggestionCard
                key={option.id}
                option={option}
                gameId={activeGame}
                optionCount={currentOptions.length}
                onSelect={() => {
                  if (onSelectSuggestion) {
                    onSelectSuggestion(activeGame, option);
                  }
                }}
                onDismiss={() => handleUpdateStatus(option.id, 'dismissed')}
                onRestore={() => handleUpdateStatus(option.id, 'pending')}
                updating={updatingId === option.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ gameId, generating, onGenerate }) {
  const game = GAMES[gameId];
  return (
    <div className="text-center py-12">
      <p className="text-sm text-text-secondary mb-3">
        No suggestions for {game?.name || 'this game'} yet
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {generating ? 'Generating...' : `Generate ${game?.count || 3} Options`}
      </button>
    </div>
  );
}

function SuggestionCard({ option, gameId, optionCount, onSelect, onDismiss, onRestore, updating }) {
  const data = option.puzzle_data;
  const isError = !!data?.error;
  const isDismissed = option.status === 'dismissed';
  const isSelected = option.status === 'selected';

  // Cards share available width equally, with a sensible min
  // On mobile they scroll horizontally with snap
  const widthClass =
    optionCount <= 2
      ? 'min-w-[280px] sm:min-w-0 sm:flex-1'
      : optionCount === 3
        ? 'min-w-[280px] sm:min-w-0 sm:flex-1'
        : 'min-w-[260px] sm:min-w-0 sm:flex-1';

  return (
    <div
      className={`
        relative rounded-2xl border-2 transition-all flex flex-col snap-start flex-shrink-0 ${widthClass}
        ${isSelected ? 'border-accent-green bg-accent-green/5' : isDismissed ? 'border-border-light bg-bg-surface opacity-60' : 'border-border-light bg-bg-card hover:border-text-muted'}
        ${isError ? 'border-accent-red/50 bg-accent-red/5' : ''}
      `}
    >
      {/* Status badge */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-accent-green text-white rounded-full">
          Selected
        </div>
      )}

      {/* Option header */}
      <div className="px-4 py-2.5 border-b border-border-light flex items-center justify-between">
        <span className="text-xs font-bold text-text-secondary">Option {option.option_number}</span>
        <span className="text-xs font-bold text-text-primary">
          {option.quality_score?.toFixed(1) || '--'}
        </span>
      </div>

      {/* Game-specific preview — takes up remaining space */}
      <div className="p-4 flex-1">
        {isError ? (
          <div className="flex items-start gap-2 text-accent-red text-xs">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{data.error}</span>
          </div>
        ) : (
          <GamePreview gameId={gameId} data={data} />
        )}
      </div>

      {/* Quality notes — collapsed by default if many */}
      {data?.qualityNotes?.length > 0 && <QualityNotes notes={data.qualityNotes} />}

      {/* Actions */}
      <div className="px-4 py-2.5 border-t border-border-light flex items-center gap-2">
        {isDismissed ? (
          <button
            onClick={onRestore}
            disabled={updating}
            className="flex-1 px-2 py-1.5 text-xs font-bold text-text-secondary bg-bg-surface rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-center"
          >
            Restore
          </button>
        ) : isSelected ? (
          <button
            onClick={onSelect}
            className="flex-1 px-2 py-1.5 text-xs font-bold text-white bg-accent-green rounded-xl hover:opacity-90 transition-colors text-center"
          >
            Open in Editor
          </button>
        ) : (
          <>
            <button
              onClick={onSelect}
              disabled={updating || isError}
              className="flex-1 px-2 py-1.5 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 text-center"
            >
              {updating ? 'Loading...' : 'Use This'}
            </button>
            <button
              onClick={onDismiss}
              disabled={updating}
              className="px-3 py-1.5 text-xs font-bold text-text-secondary bg-bg-surface rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QualityNotes({ notes }) {
  const [expanded, setExpanded] = useState(false);
  const warnings = notes.filter((n) => n.startsWith('WARNING'));
  const infos = notes.filter((n) => !n.startsWith('WARNING'));
  const hasMany = notes.length > 3;

  return (
    <div className="px-4 pb-2">
      {warnings.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {warnings.map((note, i) => (
            <p key={`w-${i}`} className="text-[10px] text-accent-red">
              {note}
            </p>
          ))}
        </div>
      )}
      {expanded ? (
        <div className="space-y-0.5">
          {infos.map((note, i) => (
            <p key={`i-${i}`} className="text-[10px] text-text-muted">
              {note}
            </p>
          ))}
        </div>
      ) : infos.length > 0 ? (
        <p className="text-[10px] text-text-muted">
          {infos.length} note{infos.length !== 1 ? 's' : ''}
        </p>
      ) : null}
      {(hasMany || infos.length > 0) && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] text-primary font-semibold mt-0.5"
        >
          Show details
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[10px] text-primary font-semibold mt-0.5"
        >
          Hide details
        </button>
      )}
    </div>
  );
}

function GamePreview({ gameId, data }) {
  switch (gameId) {
    case 'tandem':
      return <TandemPreview data={data} />;
    case 'mini':
      return <MiniPreview data={data} />;
    case 'soup':
      return <AlchemyPreview data={data} />;
    case 'reel':
      return <ReelPreview data={data} />;
    default:
      return (
        <pre className="text-xs text-text-muted overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      );
  }
}

function TandemPreview({ data }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-text-primary">{data.theme}</p>
        {data.difficultyRating && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              data.difficultyRating === 'easy'
                ? 'bg-accent-green/20 text-accent-green'
                : data.difficultyRating === 'medium'
                  ? 'bg-flat-accent/20 text-flat-accent'
                  : 'bg-accent-red/20 text-accent-red'
            }`}
          >
            {data.difficultyRating}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {data.puzzles?.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-base leading-none">{p.emoji}</span>
            <span className="text-text-secondary font-medium">{p.answer}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniPreview({ data }) {
  const solution = data.solution;
  if (!solution) return <p className="text-xs text-text-muted">No grid data</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-0.5 w-fit mx-auto">
        {solution.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-sm ${
                cell === '■'
                  ? 'bg-text-primary'
                  : 'bg-bg-surface border border-border-light text-text-primary'
              }`}
            >
              {cell !== '■' ? cell : ''}
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-text-muted text-center">
        {data.words?.length || 0} words
        {data.clues?.across?.length
          ? ` / ${data.clues.across.length}A ${data.clues.down?.length || 0}D`
          : ''}
      </p>
      {/* Show clues preview */}
      {data.clues && (
        <div className="space-y-2 text-xs">
          {data.clues.across?.length > 0 && (
            <div>
              <p className="font-bold text-text-primary mb-0.5">Across</p>
              {data.clues.across.map((c, i) => (
                <p key={i} className="text-text-secondary">
                  {c.number}. {c.clue}
                </p>
              ))}
            </div>
          )}
          {data.clues.down?.length > 0 && (
            <div>
              <p className="font-bold text-text-primary mb-0.5">Down</p>
              {data.clues.down.map((c, i) => (
                <p key={i} className="text-text-secondary">
                  {c.number}. {c.clue}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlchemyPreview({ data }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{data.targetEmoji}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary">{data.targetElement}</p>
          <p className="text-xs text-text-muted">
            Par: {data.parMoves} moves / Path: {data.shortestPathLength} steps
          </p>
        </div>
      </div>
      {data.difficulty && (
        <span
          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            data.difficulty === 'easy'
              ? 'bg-accent-green/20 text-accent-green'
              : data.difficulty === 'medium'
                ? 'bg-flat-accent/20 text-flat-accent'
                : 'bg-accent-red/20 text-accent-red'
          }`}
        >
          {data.difficulty}
        </span>
      )}
      {data.description && <p className="text-xs text-text-secondary">{data.description}</p>}
    </div>
  );
}

function ReelPreview({ data }) {
  const difficultyColors = {
    easiest: 'bg-accent-green/20 text-accent-green',
    easy: 'bg-accent-blue/20 text-accent-blue',
    medium: 'bg-flat-accent/20 text-flat-accent',
    hardest: 'bg-accent-red/20 text-accent-red',
  };

  return (
    <div className="space-y-3">
      {data.groups?.map((group, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${difficultyColors[group.difficulty] || 'bg-bg-surface text-text-muted'}`}
            >
              {group.difficulty}
            </span>
            <span className="text-sm font-semibold text-text-primary">{group.connection}</span>
          </div>
          {group.movies?.length > 0 && (
            <div className="flex gap-1.5 pl-1">
              {group.movies.slice(0, 4).map((movie, j) => (
                <div
                  key={j}
                  className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-surface"
                  title={`${movie.title} (${movie.year})`}
                >
                  {movie.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
              <div className="flex flex-col justify-center gap-0.5 ml-1 min-w-0">
                {group.movies.slice(0, 4).map((movie, j) => (
                  <p key={j} className="text-[10px] text-text-muted leading-tight truncate">
                    {movie.title}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {!data.allMoviesVerified && (
        <p className="text-[10px] text-accent-red flex items-center gap-1">
          <AlertTriangle size={10} className="flex-shrink-0" />
          Some movies not verified
        </p>
      )}
    </div>
  );
}
