'use client';
import { useState } from 'react';
import Image from 'next/image';
import { formatTime, formatDateShort } from '@/lib/utils';
import { playHintSound, playCorrectSound, playErrorSound } from '@/lib/sounds';
import PuzzleRow from './PuzzleRow';
import StatsBar from './StatsBar';
import ThemeToggle from './ThemeToggle';
import RulesModal from './RulesModal';
import PlayerStatsModal from './PlayerStatsModal';
import ArchiveModal from './ArchiveModal';
import { useArchivePreload } from '@/hooks/useArchivePreload';

export default function PlayingScreen({
  puzzle,
  answers,
  correctAnswers,
  checkedWrongAnswers,
  mistakes,
  solved,
  time,
  onUpdateAnswer,
  onCheckAnswers,
  onCheckSingleAnswer,
  theme,
  toggleTheme,
  onSelectPuzzle,
  hintsUsed,
  onUseHint,
  hasCheckedAnswers,
  onReturnToWelcome,
  activeHints
}) {
  const hasAnyInput = answers.some(answer => answer.trim() !== '');
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const { preloadArchive } = useArchivePreload();
  
  const handleEnterPress = (index) => {
    // Check the current answer
    if (onCheckSingleAnswer) {
      const result = onCheckSingleAnswer(index);
      
      // Only play individual answer sounds if the game isn't complete
      // (game completion sounds are handled in completeGame function)
      if (!result.gameComplete) {
        try {
          if (result.isCorrect) {
            playCorrectSound();  // Simple ding for individual correct answer
          } else if (answers[index].trim()) {
            // Only play error sound if there was actually an answer entered
            playErrorSound();
          }
        } catch (e) {
          // Sound might fail on some browsers
        }
      }
      
      // Only move to next field if the answer was correct and game isn't complete
      if (result.isCorrect && !result.gameComplete) {
        setTimeout(() => {
          const inputs = document.querySelectorAll('input[type="text"]:not([disabled])');
          const currentIndex = Array.from(inputs).findIndex(input => document.activeElement === input);
          if (currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          }
        }, 300);
      }
      // If wrong or game complete, cursor stays in the same field
    }
  };
  
  const handleUseHint = () => {
    // Find all unsolved puzzles and randomly select one for the hint
    const unsolvedIndices = [];
    for (let i = 0; i < 4; i++) {
      if (!correctAnswers[i]) {
        unsolvedIndices.push(i);
      }
    }
    
    if (unsolvedIndices.length > 0) {
      // Randomly select one of the unsolved puzzles
      const randomIndex = Math.floor(Math.random() * unsolvedIndices.length);
      const hintIndex = unsolvedIndices[randomIndex];
      
      try {
        playHintSound();
      } catch (e) {
        // Sound might fail on some browsers
      }
      onUseHint(hintIndex);
    }
  };
  
  return (
    <div className="animate-slide-up">
      {/* Control buttons positioned above the card */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setShowStats(true)}
          className="w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <button
          onClick={() => setShowArchive(true)}
          onMouseEnter={() => preloadArchive()}
          className="w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="Archive"
        >
          📅
        </button>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Main game card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header with gradient matching outdoor theme */}
        <div className="bg-gradient-to-r from-sky-500 to-teal-400 dark:from-gray-900 dark:to-gray-900 p-5 text-center">
          <button 
            onClick={onReturnToWelcome}
            className="w-16 h-16 mx-auto mb-2 relative cursor-pointer hover:scale-110 transition-transform"
            title="Return to Welcome Screen"
          >
            <Image
              src={theme === 'dark' ? "/images/dark-mode-logo-2.webp" : "/images/alt-logo.webp"}
              alt="Tandem Logo"
              width={64}
              height={64}
              className="rounded-xl"
              priority
            />
          </button>
          <div className="text-white/90 text-sm font-medium">
            Daily Puzzle {puzzle?.date ? formatDateShort(puzzle.date) : ''}
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
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 rounded-full">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme: </span>
                <span className="text-base font-semibold text-sky-700 dark:text-sky-300">
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
                isWrong={checkedWrongAnswers && checkedWrongAnswers[index]}
                index={index}
                onEnterPress={() => handleEnterPress(index)}
                hintData={activeHints && activeHints[index]}
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
                onClick={handleUseHint}
                className="w-full p-3 bg-yellow-400 hover:bg-yellow-500 dark:bg-amber-600 dark:hover:bg-amber-700 text-gray-800 dark:text-gray-100 border-none rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
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
        key={showArchive ? Date.now() : 'closed'}
        isOpen={showArchive} 
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={onSelectPuzzle}
      />
    </div>
  );
}