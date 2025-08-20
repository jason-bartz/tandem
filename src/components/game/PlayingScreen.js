'use client';
import { useState } from 'react';
import Image from 'next/image';
import { formatTime } from '@/lib/utils';
import PuzzleRow from './PuzzleRow';
import StatsBar from './StatsBar';
import ThemeToggle from './ThemeToggle';
import RulesModal from './RulesModal';
import PlayerStatsModal from './PlayerStatsModal';

export default function PlayingScreen({
  puzzle,
  answers,
  correctAnswers,
  mistakes,
  solved,
  time,
  onUpdateAnswer,
  onCheckAnswers,
  theme,
  toggleTheme
}) {
  const hasAnyInput = answers.some(answer => answer.trim() !== '');
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  return (
    <div className="animate-slide-up">
      {/* Control buttons positioned above the card */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setShowRules(true)}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="How to Play"
        >
          💡
        </button>
        <button
          onClick={() => setShowStats(true)}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Main game card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header with gradient matching outdoor theme */}
        <div className="bg-gradient-to-r from-sky-500 to-teal-400 p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-2 relative">
            <Image
              src="/images/main-logo.webp"
              alt="Tandem Logo"
              width={64}
              height={64}
              className="rounded-xl"
              priority
            />
          </div>
          <div className="text-white/90 text-sm font-medium">
            Daily Puzzle #{puzzle?.puzzleNumber || ''}
          </div>
        </div>

        <div className="p-6">
          <StatsBar
            time={formatTime(time)}
            mistakes={mistakes}
            solved={solved}
          />

          {puzzle && puzzle.puzzles ? (
            <>
              <div className="flex flex-col gap-4 mb-6">
                {puzzle.puzzles.map((p, index) => (
                  <PuzzleRow
                    key={index}
                    emoji={p.emoji}
                    value={answers[index]}
                    onChange={(value) => onUpdateAnswer(index, value)}
                    isCorrect={correctAnswers[index]}
                    index={index}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No puzzle data available
            </div>
          )}

          <button
            onClick={onCheckAnswers}
            disabled={!hasAnyInput}
            className="w-full p-4 bg-gradient-to-r from-sky-500 to-teal-400 text-white border-none rounded-xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Check Answers
          </button>
        </div>
      </div>
      
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <PlayerStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </div>
  );
}