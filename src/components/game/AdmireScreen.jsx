'use client';
import { useState } from 'react';
import Image from 'next/image';
import { formatTime, getCurrentPuzzleInfo, generateShareText, formatDateShort } from '@/lib/utils';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from './UnifiedArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import ShareButton from './ShareButton';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useDeviceType } from '@/lib/deviceDetection';
import { ASSET_VERSION } from '@/lib/constants';
import Settings from '@/components/Settings';
import GlobalNavigation from '@/components/navigation/GlobalNavigation';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';

export default function AdmireScreen({
  puzzle,
  admireData,
  onReplay,
  onSelectPuzzle,
  onReturnToWelcome,
  theme,
}) {
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { lightTap, mediumTap } = useHaptics();
  const { highContrast } = useTheme();
  const { isMobilePhone } = useDeviceType();

  // Get the actual puzzle date
  const puzzleDate = puzzle?.date || getCurrentPuzzleInfo().isoDate;

  // Generate share text from stored completion data
  const hintPositions = admireData?.hintedAnswers || [];
  const shareText = generateShareText(
    puzzleDate,
    admireData?.theme || puzzle?.theme || 'Tandem Puzzle',
    admireData?.time,
    admireData?.mistakes,
    admireData?.hintsUsed,
    hintPositions,
    4, // All 4 solved
    false, // Not hard mode (would need to track this)
    false,
    puzzle?.difficultyRating
  );

  return (
    <GlobalNavigation
      onOpenStats={() => setShowPlayerStats(true)}
      onOpenArchive={() => setShowArchive(true)}
      onOpenHowToPlay={() => setShowHowToPlay(true)}
      onOpenSettings={() => setShowSettings(true)}
    >
      <div className="animate-fade-in -mt-16">
        {/* Main admire card */}
        <div
          className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center relative ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Back arrow button at top left */}
          <button
            onClick={() => {
              lightTap();
              onReturnToWelcome();
            }}
            className="absolute left-4 top-4 w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-50"
            title="Back to Home"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div>
            {/* Logo - Only show on tablet/desktop (not mobile phones) */}
            {!isMobilePhone && (
              <button
                onClick={() => {
                  lightTap();
                  onReturnToWelcome();
                }}
                className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                title="Return to Welcome Screen"
              >
                <Image
                  src={`${theme === 'dark' ? '/images/dark-mode-logo-2.webp' : '/images/main-logo.webp'}?v=${ASSET_VERSION}`}
                  alt="Tandem Logo"
                  width={96}
                  height={96}
                  className="rounded-2xl"
                />
              </button>
            )}

            <h1 className="font-bold mb-2 text-gray-800 dark:text-gray-200 text-3xl mt-8">
              <span className="inline-block">Completed Puzzle ✓</span>
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You solved this puzzle on{' '}
              {new Date(admireData?.timestamp || Date.now()).toLocaleDateString()}
            </p>

            {/* Theme Display */}
            {(admireData?.theme || puzzle?.theme) && (
              <div
                className={`rounded-2xl p-5 mb-6 relative overflow-hidden border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-yellow/20 dark:bg-yellow-900/40 border-accent-yellow'
                }`}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Theme:</p>
                <p
                  className={`text-2xl font-bold ${
                    highContrast ? 'text-hc-text' : 'text-accent-yellow dark:text-accent-yellow'
                  }`}
                >
                  {admireData?.theme || puzzle?.theme}
                </p>
              </div>
            )}

            {/* Completed Puzzle Display */}
            <div className="mb-4 space-y-2">
              {puzzle?.puzzles?.map((puzzleItem, index) => (
                <div
                  key={index}
                  className={`rounded-2xl p-3 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
                    highContrast
                      ? 'bg-hc-surface border-hc-border'
                      : 'bg-green-100 dark:bg-green-900/30 border-green-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{puzzleItem.emoji1}</span>
                      <span className="text-2xl">{puzzleItem.emoji2}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {admireData?.hintedAnswers?.includes(index) && (
                        <span className="text-accent-pink text-sm">💡</span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold text-center mt-1 ${
                      highContrast ? 'text-hc-text' : 'text-green-700 dark:text-green-300'
                    }`}
                  >
                    {puzzleItem.answer}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div
                className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-blue/20 dark:bg-sky-900/50 border-accent-blue'
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-accent-blue dark:text-accent-blue'
                  }`}
                >
                  {formatTime(admireData?.time || 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Time</div>
              </div>
              <div
                className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-orange/20 dark:bg-orange-900/50 border-accent-orange'
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-accent-orange dark:text-accent-orange'
                  }`}
                >
                  {admireData?.mistakes || 0}/4
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mistakes</div>
              </div>
              <div
                className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-pink/20 dark:bg-pink-900/50 border-accent-pink'
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-accent-pink dark:text-accent-pink'
                  }`}
                >
                  {formatDateShort(puzzleDate)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Date</div>
              </div>
            </div>

            {/* Hints indicator */}
            {admireData?.hintsUsed > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                💡 {admireData.hintsUsed} hint{admireData.hintsUsed > 1 ? 's' : ''} used
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <ShareButton shareText={shareText} />

            <button
              onClick={() => {
                mediumTap();
                onReplay();
              }}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] ${
                highContrast
                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-orange text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              Replay Puzzle
            </button>

            <button
              onClick={() => {
                lightTap();
                setShowArchive(true);
              }}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] ${
                highContrast
                  ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              Browse Archive
            </button>

            {/* View Stats and Leaderboard Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  lightTap();
                  setShowPlayerStats(true);
                }}
                className={`py-3 px-4 rounded-2xl font-semibold text-sm transition-all border-[3px] ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }`}
              >
                Stats
              </button>

              <button
                onClick={() => {
                  lightTap();
                  setShowLeaderboard(true);
                }}
                className={`py-3 px-4 rounded-2xl font-semibold text-sm transition-all border-[3px] ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }`}
              >
                Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UnifiedStatsModal isOpen={showPlayerStats} onClose={() => setShowPlayerStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(puzzleNumber) => {
          setShowArchive(false);
          setTimeout(() => {
            onSelectPuzzle(puzzleNumber);
          }, 100);
        }}
        defaultTab="tandem"
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="tandem"
        initialTab="daily"
      />
    </GlobalNavigation>
  );
}
