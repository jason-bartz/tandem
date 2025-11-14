'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import CrypticGuideModal from './CrypticGuideModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import GlobalNavigation from '@/components/navigation/GlobalNavigation';
import Settings from '@/components/Settings';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import CrypticWelcomeScreenSkeleton from '@/components/shared/CrypticWelcomeScreenSkeleton';

export default function CrypticWelcomeScreen({ puzzle, onStart, currentPuzzleDate, loading }) {
  const [showGuide, setShowGuide] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { highContrast } = useTheme();

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Show skeleton while loading
  if (loading || !puzzle) {
    return (
      <GlobalNavigation
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowGuide(true)}
        onOpenSettings={() => setShowSettings(true)}
      >
        <CrypticWelcomeScreenSkeleton />

        {/* Modals */}
        {showGuide && <CrypticGuideModal onClose={() => setShowGuide(false)} />}
        <UnifiedArchiveCalendar isOpen={showArchive} onClose={() => setShowArchive(false)} defaultTab="cryptic" onSelectPuzzle={() => {}} />
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </GlobalNavigation>
    );
  }

  return (
    <GlobalNavigation
      onOpenStats={() => setShowStats(true)}
      onOpenArchive={() => setShowArchive(true)}
      onOpenHowToPlay={() => setShowGuide(true)}
      onOpenSettings={() => setShowSettings(true)}
    >
      <div className="min-h-screen flex flex-col items-center justify-center p-4 -mt-16">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img
                src="/images/daily-cryptic-logo.webp"
                alt="Daily Cryptic"
                className="w-20 h-20 mx-auto rounded-2xl dark:hidden"
              />
              <img
                src="/images/daily-cryptic-logo-dark.webp"
                alt="Daily Cryptic"
                className="w-20 h-20 mx-auto rounded-2xl hidden dark:block"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Daily Cryptic</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Cryptic Word Puzzle</p>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {formatDate(currentPuzzleDate)}
            </p>
          </div>

          {/* Puzzle Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-8 mb-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Today&apos;s Clue
              </h2>
              <div className="text-3xl leading-relaxed text-gray-800 dark:text-gray-200">
                {puzzle.clue}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-4 items-center">
              {/* Start Puzzle - Main CTA */}
              <button
                onClick={onStart}
                className="w-full max-w-sm px-8 py-4 text-white text-lg font-bold rounded-[20px] border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                style={{ backgroundColor: '#cb6ce6' }}
              >
                Start Puzzle
              </button>

              {/* Archive and How to Play - Side by side */}
              <div className="flex gap-3 w-full max-w-sm">
                <button
                  onClick={() => setShowArchive(true)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-[16px] border-[3px] border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <img src="/icons/ui/archive.png" alt="" className="w-5 h-5 dark:hidden" />
                  <img
                    src="/icons/ui/archive-dark.png"
                    alt=""
                    className="w-5 h-5 hidden dark:block"
                  />
                  <span>Archive</span>
                </button>
                <button
                  onClick={() => setShowGuide(true)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-[16px] border-[3px] border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <img src="/icons/ui/how-to-play.png" alt="" className="w-5 h-5 dark:hidden" />
                  <img
                    src="/icons/ui/how-to-play-dark.png"
                    alt=""
                    className="w-5 h-5 hidden dark:block"
                  />
                  <span>How to Play</span>
                </button>
              </div>
            </div>

            {/* Free access note */}
            <div
              className={`mt-6 p-4 rounded-2xl text-center border-2 ${
                highContrast
                  ? 'bg-hc-surface border-hc-success'
                  : 'bg-accent-green/10 border-accent-green/30'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Free for all account holders!
              </p>
              <p
                className={`text-sm font-medium mt-1 flex items-center justify-center gap-2 ${
                  highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>Archive requires</span>
                <img
                  src="/icons/ui/tandem-unlimited.png"
                  alt="Tandem Unlimited"
                  className="w-5 h-5 inline-block dark:hidden"
                />
                <img
                  src="/icons/ui/tandem-unlimited-dark.png"
                  alt="Tandem Unlimited"
                  className="w-5 h-5 inline-block hidden dark:block"
                />
                <span>Tandem Unlimited.</span>
              </p>
            </div>
          </div>

          {/* Back to Tandem */}
          <div className="text-center">
            <button
              onClick={() => (window.location.href = '/')}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              ← Back to Tandem
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showGuide && <CrypticGuideModal onClose={() => setShowGuide(false)} />}
      <UnifiedArchiveCalendar isOpen={showArchive} onClose={() => setShowArchive(false)} defaultTab="cryptic" onSelectPuzzle={() => {}} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </GlobalNavigation>
  );
}
