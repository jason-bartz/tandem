'use client';
import { useState } from 'react';
import Image from 'next/image';
import { formatTime } from '@/lib/utils';
import PuzzleRow from './PuzzleRow';
import StatsBar from './StatsBar';
import ThemeToggle from './ThemeToggle';
import RulesModal from './RulesModal';
import PlayerStatsModal from './PlayerStatsModal';
import ArchiveModal from './ArchiveModal';

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
  toggleTheme,
  onSelectPuzzle,
  hintsUsed,
  onUseHint,
  hasCheckedAnswers
}) {
  const hasAnyInput = answers.some(answer => answer.trim() !== '');
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  
  const handleEnterPress = (index) => {
    // Move to next input field
    const inputs = document.querySelectorAll('input[type="text"]:not([disabled])');
    const currentIndex = Array.from(inputs).findIndex(input => document.activeElement === input);
    if (currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus();
    }
  };
  
  return (
    <div className="animate-slide-up">
      {/* Control buttons positioned above the card */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setShowStats(true)}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <button
          onClick={() => setShowArchive(true)}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="Archive"
        >
          📅
        </button>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Main game card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header with gradient matching outdoor theme */}
        <div className="bg-gradient-to-r from-sky-500 to-teal-400 p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-2 relative">
            <Image
              src={theme === 'dark' ? "/images/dark-mode-logo-2.webp" : "/images/alt-logo.webp"}
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

          {/* Theme Display */}
          {puzzle?.theme && (
            <div className="text-center mb-4">
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme: </span>
                <span className="text-base font-semibold text-purple-700 dark:text-purple-300">
                  {puzzle.theme}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 mb-6">
            {puzzle && puzzle.puzzles && puzzle.puzzles.map((p, index) => (
              <PuzzleRow
                key={index}
                emoji={p.emoji || '❓❓'}
                value={answers[index]}
                onChange={(value) => onUpdateAnswer(index, value)}
                isCorrect={correctAnswers[index]}
                index={index}
                hasBeenChecked={hasCheckedAnswers}
                onEnterPress={() => handleEnterPress(index)}
              />
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={onCheckAnswers}
              disabled={!hasAnyInput}
              className="w-full p-4 bg-gradient-to-r from-sky-500 to-teal-400 text-white border-none rounded-xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Check Answers
            </button>
            
            {hintsUsed === 0 && solved < 4 && (
              <button
                onClick={onUseHint}
                className="w-full p-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 border-none rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span className="text-xl">💡</span>
                Use Hint (1 available)
              </button>
            )}
          </div>
        </div>
      </div>
      
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <PlayerStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModal 
        isOpen={showArchive} 
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={onSelectPuzzle}
      />
    </div>
  );
}