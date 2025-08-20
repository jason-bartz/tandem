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
      <div className="bg-gradient-to-r from-plum via-plum-light to-peach-light p-5 text-center relative">
        <div className="absolute top-5 right-5 flex gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="w-10 h-10 rounded-xl border-none bg-white/30 backdrop-blur-sm text-white text-xl cursor-pointer transition-all flex items-center justify-center hover:scale-110 hover:bg-white/40"
            title="How to Play"
          >
            💡
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="w-10 h-10 rounded-xl border-none bg-white/30 backdrop-blur-sm text-white text-xl cursor-pointer transition-all flex items-center justify-center hover:scale-110 hover:bg-white/40"
            title="Statistics"
          >
            📊
          </button>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
        
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
        <div className="text-white/80 text-sm">
          Daily Puzzle #{puzzle?.puzzleNumber || ''}
        </div>
      </div>

      <div className="p-6">
        <StatsBar
          time={formatTime(time)}
          mistakes={mistakes}
          solved={solved}
        />

        {puzzle && (
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
        )}

        <button
          onClick={onCheckAnswers}
          disabled={!hasAnyInput}
          className="w-full p-4 bg-gradient-to-r from-plum via-plum-light to-peach text-white border-none rounded-xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-lg hover:shadow-plum/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Check Answers
        </button>
      </div>
      
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <PlayerStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </div>
  );
}