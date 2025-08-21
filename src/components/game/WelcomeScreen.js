'use client';
import { useState } from 'react';
import Image from 'next/image';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import PlayerStatsModal from './PlayerStatsModal';
import ArchiveModal from './ArchiveModal';

export default function WelcomeScreen({ onStart, theme, toggleTheme, onSelectPuzzle, puzzle }) {
  const puzzleInfo = getCurrentPuzzleInfo();
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  return (
    <div className="animate-fade-in">
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

      {/* Main welcome card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-10 text-center">
        <div className="w-24 h-24 mx-auto mb-5 relative">
          <Image
            src={theme === 'dark' ? "/images/dark-mode-logo.webp" : "/images/main-logo.webp"}
            alt="Tandem Logo"
            width={96}
            height={96}
            className="rounded-2xl"
            priority
          />
        </div>
        
        <p className="text-gray-text dark:text-gray-300 text-lg font-medium mb-8">
          4 answers. 2 emojis each. 1 theme.
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
          <h3 className="text-sm uppercase tracking-wider text-gray-text dark:text-gray-300 mb-4 font-semibold">
            How to Play
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl">
                👀
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm">Look at each emoji pair</span>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl">
                💭
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm">Guess what they represent</span>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl">
                🎯
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm">Use the theme to guide your answers</span>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl">
                ✅
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm">4 mistakes allowed</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={onStart}
          disabled={!puzzle}
          className="w-full p-4 bg-gradient-to-r from-sky-500 to-teal-400 text-white border-none rounded-2xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {puzzle ? "Play Today's Puzzle" : "Loading Puzzle..."}
        </button>
        
        <div className="text-gray-text dark:text-gray-400 text-sm mt-4">
          Puzzle #{puzzleInfo.number} • {puzzleInfo.date}
        </div>
      </div>
      
      <PlayerStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModal 
        isOpen={showArchive} 
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={onSelectPuzzle}
      />
    </div>
  );
}