'use client';
import { useState } from 'react';
import { formatTime, generateShareText, getCurrentPuzzleInfo } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import StatsModal from './StatsModal';
import RulesModal from './RulesModal';
import PlayerStatsModal from './PlayerStatsModal';
import html2canvas from 'html2canvas';

export default function CompleteScreen({
  won,
  time,
  mistakes,
  correctAnswers,
  puzzleTheme,
  onPlayAgain,
  theme,
  toggleTheme
}) {
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const puzzleInfo = getCurrentPuzzleInfo();

  const shareResults = async () => {
    const shareText = generateShareText(
      puzzleInfo.number,
      formatTime(time),
      mistakes,
      correctAnswers
    );

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          title: 'Tandem Results'
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    }
  };

  const shareImage = async () => {
    const element = document.getElementById('completion-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        scale: 2,
        logging: false
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'tandem-results.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Tandem Results',
              text: generateShareText(puzzleInfo.number, formatTime(time), mistakes, correctAnswers)
            });
          } catch (err) {
            console.log('Share failed:', err);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tandem-results.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  };

  return (
    <div className="animate-fade-in">
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
          onClick={() => setShowPlayerStats(true)}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Main completion card */}
      <div id="completion-content" className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-10 text-center">
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-sky-500 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-teal-400 animate-pulse ml-4" />
          </div>
        </div>
        
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

        <div className="space-y-3 mb-6">
          <button
            onClick={shareResults}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-teal-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Share Results
          </button>
          <button
            onClick={shareImage}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Share as Image
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
      
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <PlayerStatsModal isOpen={showPlayerStats} onClose={() => setShowPlayerStats(false)} />
    </div>
  );
}