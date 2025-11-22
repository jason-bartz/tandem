'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCurrentPuzzleNumber, getDisplayDate } from '@/lib/puzzleNumber';
import { playStartSound, playButtonTone } from '@/lib/sounds';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from './UnifiedArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import GlobalNavigation from '@/components/navigation/GlobalNavigation';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useDeviceType } from '@/lib/deviceDetection';
import { ASSET_VERSION } from '@/lib/constants';
import { Capacitor } from '@capacitor/core';
import CrypticWelcomeCard from '@/components/cryptic/CrypticWelcomeCard';
import MiniWelcomeCard from '@/components/mini/MiniWelcomeCard';
import { getStreakMessage } from '@/lib/streakMessages';
import { loadStats, getPuzzleResult } from '@/lib/storage';
import { loadCrypticStats } from '@/lib/crypticStorage';
import { loadMiniStats } from '@/lib/miniStorage';

export default function WelcomeScreen({
  onStart,
  theme,
  _isAuto,
  _currentState,
  onSelectPuzzle,
  puzzle,
}) {
  const puzzleNumber = getCurrentPuzzleNumber();
  const displayDate = getDisplayDate(puzzleNumber);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { mediumTap, welcomeMelody } = useHaptics();
  const { highContrast } = useTheme();
  const { isMobilePhone } = useDeviceType();
  const isNativeApp = Capacitor.isNativePlatform();
  const getIconPath = useUIIcon();

  // Load stats on mount for streak display
  const [tandemStats, setTandemStats] = useState({ currentStreak: 0 });
  const [crypticStats, setCrypticStats] = useState({ currentStreak: 0 });
  const [miniStats, setMiniStats] = useState({ currentStreak: 0 });
  const [todayCompleted, setTodayCompleted] = useState(false);

  useEffect(() => {
    // Load stats for streak display and check if today's puzzle is completed
    const loadStatsData = async () => {
      try {
        const [tandem, cryptic, mini] = await Promise.all([
          loadStats(),
          loadCrypticStats(),
          loadMiniStats(),
        ]);
        setTandemStats(tandem);
        setCrypticStats(cryptic);
        setMiniStats(mini);

        if (puzzle?.date) {
          const result = await getPuzzleResult(puzzle.date);
          setTodayCompleted(result?.won || false);
        }
      } catch (err) {
        // Silently fail - streak just won't show
        console.error('Failed to load stats for streak display:', err);
      }
    };
    loadStatsData();
  }, [puzzle?.date]);

  useEffect(() => {
    // Play welcome sound and haptics on iOS after a delay to ensure splash is gone
    if (Capacitor.isNativePlatform()) {
      // Wait 500ms to ensure the splash screen has completely faded and the view is ready
      const timer = setTimeout(() => {
        try {
          playStartSound();
          welcomeMelody();
        } catch (e) {
          // Sound/haptics might fail on some devices
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [welcomeMelody]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePlayClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayClick = () => {
    try {
      playButtonTone(); // Use the new distinct button tone
      mediumTap(); // Medium tap for starting the game
    } catch (e) {
      // Sound might fail on some browsers
    }

    // If today's puzzle is completed, load it in admire mode
    if (todayCompleted && puzzle?.date) {
      onSelectPuzzle(puzzle.date);
    } else {
      onStart();
    }
  };

  // Placeholder for premium status check
  const checkPremiumStatus = () => {
    // This is handled in the parent component via subscription service
  };

  return (
    <GlobalNavigation
      onOpenStats={() => setShowStats(true)}
      onOpenArchive={() => setShowArchive(true)}
      onOpenHowToPlay={() => setShowHowToPlay(true)}
      onOpenSettings={() => setShowSettings(true)}
    >
      <div className="px-2 -mt-[52px]">
        {/* Main welcome card */}
        <div
          className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center mb-6 animate-fade-in-up delay-0 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Logo - Hide on native mobile app to save space, but show on web version */}
          {(!isMobilePhone || !isNativeApp) && (
            <div className="w-24 h-24 mx-auto mb-5 relative animate-scale-fade-in delay-0">
              <Image
                src={`${theme === 'dark' ? '/images/dark-mode-logo.webp' : '/images/main-logo.webp'}?v=${ASSET_VERSION}`}
                alt="Tandem Logo"
                width={96}
                height={96}
                className="rounded-2xl"
                priority
              />
            </div>
          )}

          {/* Title and Subtitle */}
          <div className="mb-4 animate-fade-in-up delay-100">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Daily Tandem</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Emoji Word Puzzle</p>
          </div>

          {/* Puzzle number and date */}
          <div className="mb-6 animate-fade-in-up delay-200">
            <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">
              Puzzle #{puzzleNumber}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{displayDate}</div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left animate-fade-in-up delay-300">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 p-2">
                  <Image src={getIconPath('peace')} alt="" width={24} height={24} />
                </div>
                <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                  Each emoji pair = 1 word
                </span>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 p-2">
                  <Image src={getIconPath('theme')} alt="" width={24} height={24} />
                </div>
                <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                  All answers share a hidden theme
                </span>
              </div>
              <div className="flex items-start">
                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 p-2">
                  <Image src={getIconPath('wrong')} alt="" width={24} height={24} />
                </div>
                <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                  4 chances to be wrong
                </span>
              </div>
            </div>
          </div>

          {/* Streak Display - Always reserve space to prevent layout shift */}
          <div className="mb-4 text-center flex items-center justify-center gap-1.5 min-h-[16px] animate-fade-in-up delay-400">
            {tandemStats.currentStreak > 0 && (
              <>
                <Image src="/icons/ui/hardmode.png" alt="" width={12} height={12} />
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {getStreakMessage(tandemStats.currentStreak, 'tandem')}
                </p>
              </>
            )}
          </div>

          <button
            onClick={handlePlayClick}
            disabled={!puzzle}
            className={`w-full h-14 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-fade-in-up delay-500
            ${
              highContrast
                ? 'bg-hc-primary border-[3px] border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-blue border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
            }
          `}
          >
            {!puzzle
              ? 'Loading Puzzle...'
              : todayCompleted
                ? 'You solved it!'
                : "Play Today's Tandem"}
          </button>
        </div>

        {/* Cryptic Welcome Card */}
        <div className="mb-6 animate-fade-in-up delay-600">
          <CrypticWelcomeCard currentStreak={crypticStats.currentStreak} />
        </div>

        {/* Mini Welcome Card */}
        <div className="mb-6 animate-fade-in-up delay-700">
          <MiniWelcomeCard currentStreak={miniStats.currentStreak} />
        </div>

        <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
        <UnifiedArchiveCalendar
          isOpen={showArchive}
          onClose={() => setShowArchive(false)}
          onSelectPuzzle={(puzzleNumber) => {
            setShowArchive(false);
            // Small delay to ensure modal closes before loading new puzzle
            setTimeout(() => {
              onSelectPuzzle(puzzleNumber);
            }, 100);
          }}
          defaultTab="tandem"
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        <Settings
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            // Refresh premium status when settings close
            checkPremiumStatus();
          }}
        />
      </div>
    </GlobalNavigation>
  );
}
