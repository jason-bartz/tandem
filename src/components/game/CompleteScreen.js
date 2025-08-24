'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { formatTime, getCurrentPuzzleInfo } from '@/lib/utils';
import { playSuccessSound } from '@/lib/sounds';
import ThemeToggle from './ThemeToggle';
import StatsModal from './StatsModal';
import PlayerStatsModal from './PlayerStatsModal';
import ArchiveModal from './ArchiveModal';
import { useArchivePreload } from '@/hooks/useArchivePreload';

export default function CompleteScreen({
  won,
  time,
  mistakes,
  correctAnswers,
  puzzleTheme,
  onPlayAgain,
  theme,
  toggleTheme,
  hintsUsed,
  onSelectPuzzle,
  onReturnToWelcome
}) {
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const puzzleInfo = getCurrentPuzzleInfo();
  const { preloadArchive } = useArchivePreload();

  useEffect(() => {
    if (won) {
      // Play success sound
      try {
        playSuccessSound();
      } catch (e) {
        // Sound might fail on some browsers
      }
      
      // Trigger confetti with sky/teal theme colors
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Sky and teal colored confetti
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#0EA5E9', '#14B8A6', '#06B6D4', '#22D3EE', '#2DD4BF', '#5EEAD4']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#0EA5E9', '#14B8A6', '#06B6D4', '#22D3EE', '#2DD4BF', '#5EEAD4']
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [won]);


  return (
    <div className="animate-fade-in">
      {/* Control buttons positioned above the card */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setShowPlayerStats(true)}
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

      {/* Main completion card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-10 text-center">
        <div>
          <button 
            onClick={onReturnToWelcome}
            className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            title="Return to Welcome Screen"
          >
            <Image
              src={theme === 'dark' ? "/images/dark-mode-logo-2.webp" : "/images/main-logo.webp"}
              alt="Tandem Logo"
              width={96}
              height={96}
              className="rounded-2xl"
            />
          </button>
        
          <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            {won ? 'Congratulations!' : 'Better luck next time!'}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {won ? 'You solved today\'s puzzle!' : 'You\'ll get it tomorrow!'}
          </p>

          {puzzleTheme && (
            <div className="bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900 rounded-2xl p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Theme:</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{puzzleTheme}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {formatTime(time)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Time</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {mistakes}/4
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mistakes</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                #{puzzleInfo.number}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Puzzle</div>
            </div>
          </div>
          
          {hintsUsed > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              💡 {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setShowArchive(true)}
            onMouseEnter={() => preloadArchive()}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-teal-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Play from Archive
          </button>
        </div>

        <button
          onClick={() => setShowStats(true)}
          className="text-sky-600 dark:text-sky-400 hover:underline text-sm"
        >
          View All Statistics
        </button>
      </div>

      {showStats && (
        <StatsModal onClose={() => setShowStats(false)} />
      )}
      
      <PlayerStatsModal isOpen={showPlayerStats} onClose={() => setShowPlayerStats(false)} />
      <ArchiveModal 
        isOpen={showArchive} 
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          // Small delay to ensure modal closes before loading new puzzle
          setTimeout(() => {
            onSelectPuzzle(date);
          }, 100);
        }}
      />
    </div>
  );
}