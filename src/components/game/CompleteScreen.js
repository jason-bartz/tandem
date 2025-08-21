'use client';
import { useState } from 'react';
import Image from 'next/image';
import { formatTime, generateShareText, getCurrentPuzzleInfo } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import StatsModal from './StatsModal';
import PlayerStatsModal from './PlayerStatsModal';
import ArchiveModal from './ArchiveModal';
import html2canvas from 'html2canvas';

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
  onSelectPuzzle
}) {
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const puzzleInfo = getCurrentPuzzleInfo();

  const shareResults = async () => {
    // First generate and download the image
    const element = document.getElementById('share-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Always download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tandem-puzzle-${puzzleInfo.number}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Also copy text to clipboard
        const shareText = generateShareText(
          puzzleInfo.number,
          formatTime(time),
          mistakes,
          correctAnswers,
          hintsUsed
        );
        navigator.clipboard.writeText(shareText);
      });
    } catch (err) {
      // Failed to generate image
    }
  };


  return (
    <div className="animate-fade-in">
      {/* Control buttons positioned above the card */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setShowPlayerStats(true)}
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

      {/* Main completion card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-10 text-center">
        {/* Content for sharing (without buttons) - add padding and background */}
        <div id="share-content" className="p-8 -m-10 mb-6 bg-white dark:bg-gray-900">
          <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center">
            <Image
              src={theme === 'dark' ? "/images/dark-mode-logo-2.webp" : "/images/main-logo.webp"}
              alt="Tandem Logo"
              width={96}
              height={96}
              className="rounded-2xl"
            />
          </div>
        
          <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            {won ? 'Congratulations!' : 'Better luck next time!'}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {won ? 'You solved today\'s puzzle!' : 'You\'ll get it tomorrow!'}
          </p>

          {puzzleTheme && (
            <div className="bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900 rounded-2xl p-4 mb-6 mx-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Theme:</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{puzzleTheme}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6 px-4">
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
            <div className="text-sm text-gray-600 dark:text-gray-400 pb-4">
              💡 {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={shareResults}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-teal-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Share Results
          </button>
          <button
            onClick={() => setShowArchive(true)}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
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
        onSelectPuzzle={onSelectPuzzle}
      />
    </div>
  );
}