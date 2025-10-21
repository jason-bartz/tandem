'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCurrentPuzzleNumber, getDisplayDate } from '@/lib/puzzleNumber';
import { playStartSound, playButtonTone } from '@/lib/sounds';
import StatsModal from './StatsModal';
import ArchiveModalPaginated from './ArchiveModalPaginated';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useDeviceType } from '@/lib/deviceDetection';
import { Capacitor } from '@capacitor/core';

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
  const { lightTap, mediumTap, welcomeMelody } = useHaptics();
  const { highContrast } = useTheme();
  const getIconPath = useUIIcon();
  const { isMobilePhone } = useDeviceType();
  const isNativeApp = Capacitor.isNativePlatform();

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

  // Handle Enter key to start the daily puzzle
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
    onStart();
  };

  // Placeholder for premium status check
  const checkPremiumStatus = () => {
    // This is handled in the parent component via subscription service
  };

  return (
    <div className="animate-fade-in px-2">
      {/* Control buttons positioned above the card - Dynamic Island aware */}
      <div className="flex justify-end gap-2 mb-4 pt-safe-ios">
        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
          }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-bg-card border-[3px] border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2"
          title="Statistics"
        >
          <Image src={getIconPath('stats')} alt="Statistics" width={24} height={24} />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-bg-card border-[3px] border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2"
          title="Archive"
        >
          <Image src={getIconPath('archive')} alt="Archive" width={24} height={24} />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-bg-card border-[3px] border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2"
          title="How to Play"
        >
          <Image src={getIconPath('how-to-play')} alt="How to Play" width={24} height={24} />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-bg-card border-[3px] border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2"
          title="Settings"
        >
          <Image src={getIconPath('settings')} alt="Settings" width={24} height={24} />
        </button>
      </div>

      {/* Main welcome card */}
      <div className="bg-white dark:bg-bg-card rounded-[32px] border-[3px] border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] overflow-hidden p-10 text-center">
        {/* Logo - Hide on native mobile app to save space, but show on web version */}
        {(!isMobilePhone || !isNativeApp) && (
          <div className="w-24 h-24 mx-auto mb-5 relative">
            <Image
              src={theme === 'dark' ? '/images/dark-mode-logo.webp' : '/images/main-logo.webp'}
              alt="Tandem Logo"
              width={96}
              height={96}
              className="rounded-2xl"
              priority
            />
          </div>
        )}

        {/* Puzzle number and date */}
        <div className="mb-6">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
            Puzzle #{puzzleNumber}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{displayDate}</div>
        </div>

        <p className="text-gray-text dark:text-gray-300 text-lg font-medium mb-8">
          4 pairs. 1 hidden theme.
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
          <h3 className="text-sm uppercase tracking-wider text-gray-text dark:text-gray-300 mb-4 font-semibold">
            How to Play
          </h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl flex-shrink-0">
                ✌️
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                Each emoji pair = 1 word
              </span>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl flex-shrink-0">
                📖
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                All answers share a hidden theme
              </span>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl flex-shrink-0">
                ❌
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                4 chances to be wrong
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePlayClick}
          disabled={!puzzle}
          className={`w-full p-4 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            ${
              highContrast
                ? 'bg-hc-primary border-[3px] border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-pink border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
            }
          `}
        >
          {puzzle ? "Play Today's Puzzle" : 'Loading Puzzle...'}
        </button>
      </div>

      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModalPaginated
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
  );
}
