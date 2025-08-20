'use client';
import { useState } from 'react';
import { formatTime, generateShareText, getCurrentPuzzleInfo } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';
import StatsModal from './StatsModal';
import html2canvas from 'html2canvas';

export default function CompleteScreen({
  won,
  time,
  mistakes,
  correctAnswers,
  onPlayAgain,
  theme,
  toggleTheme,
  soundEnabled,
  toggleSound
}) {
  const [showStats, setShowStats] = useState(false);
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
        backgroundColor: null,
        scale: 2
      });
      
      canvas.toBlob((blob) => {
        if (navigator.share) {
          const file = new File([blob], 'tandem-result.png', { type: 'image/png' });
          navigator.share({
            files: [file],
            title: 'My Tandem Result'
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tandem-result.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  };

  return (
    <div id="completion-content" className="p-10 text-center relative animate-fade-in">
      <div className="absolute top-5 right-5 flex gap-2">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <button
          onClick={toggleSound}
          className="w-10 h-10 rounded-xl border-none bg-light-sand text-dark-text text-xl cursor-pointer transition-all flex items-center justify-center hover:scale-110 hover:bg-gray-text hover:text-white"
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>
      
      <div className="w-24 h-24 mx-auto mb-6 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-plum animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-peach animate-pulse ml-4" />
        </div>
      </div>
      
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-plum to-peach bg-clip-text text-transparent mb-3">
        {won ? 'Puzzle Complete!' : 'Game Over!'}
      </h2>
      
      <div className="text-gray-text text-sm mb-4">{puzzleInfo.date}</div>
      
      <div className="text-gray-text text-base mb-6">
        <div>Solved in {formatTime(time)}</div>
        <div>{mistakes} mistake{mistakes !== 1 ? 's' : ''}</div>
      </div>
      
      <div className="flex justify-center gap-2 mb-6 text-3xl">
        {correctAnswers.map((correct, index) => (
          <div
            key={index}
            className={`w-10 h-10 rounded-xl ${
              correct 
                ? 'bg-gradient-to-r from-plum to-peach' 
                : 'bg-light-sand'
            }`}
          />
        ))}
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={shareImage}
          className="flex-1 p-3.5 bg-dark-text dark:bg-gray-text text-off-white dark:text-dark-text border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Share Image
        </button>
        <button
          onClick={() => setShowStats(true)}
          className="flex-1 p-3.5 bg-light-sand text-dark-text border-none rounded-xl text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Statistics
        </button>
      </div>

      {showStats && (
        <StatsModal onClose={() => setShowStats(false)} />
      )}
    </div>
  );
}