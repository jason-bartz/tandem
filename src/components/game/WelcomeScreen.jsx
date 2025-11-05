'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCurrentPuzzleNumber, getDisplayDate } from '@/lib/puzzleNumber';
import { playStartSound, playButtonTone } from '@/lib/sounds';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import ArchiveCalendar from './ArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useDeviceType } from '@/lib/deviceDetection';
import { ASSET_VERSION } from '@/lib/constants';
import { Capacitor } from '@capacitor/core';
import CrypticWelcomeCard from '@/components/cryptic/CrypticWelcomeCard';
import DailyCrypticAnnouncementModal from '@/components/DailyCrypticAnnouncementModal';

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
  const [showCrypticAnnouncement, setShowCrypticAnnouncement] = useState(false);
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

  // Check if user has seen the Daily Cryptic announcement and show modal with delay
  useEffect(() => {
    const hasSeenAnnouncement = localStorage.getItem('hasSeenCrypticAnnouncement');

    if (!hasSeenAnnouncement) {
      // Show announcement after a 1.5 second delay for better UX
      const timer = setTimeout(() => {
        setShowCrypticAnnouncement(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

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

  const handleCloseAnnouncement = () => {
    setShowCrypticAnnouncement(false);
    // Mark announcement as seen so it doesn't show again
    localStorage.setItem('hasSeenCrypticAnnouncement', 'true');
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
          className={`w-12 h-12 rounded-2xl border-[3px] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          }`}
          title="Statistics"
        >
          <Image src={getIconPath('stats')} alt="Statistics" width={24} height={24} />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          className={`w-12 h-12 rounded-2xl border-[3px] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          }`}
          title="Archive"
        >
          <Image src={getIconPath('archive')} alt="Archive" width={24} height={24} />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className={`w-12 h-12 rounded-2xl border-[3px] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          }`}
          title="How to Play"
        >
          <Image src={getIconPath('how-to-play')} alt="How to Play" width={24} height={24} />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className={`w-12 h-12 rounded-2xl border-[3px] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-instant p-2 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          }`}
          title="Settings"
        >
          <Image src={getIconPath('settings')} alt="Settings" width={24} height={24} />
        </button>
      </div>

      {/* Main welcome card */}
      <div
        className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center mb-6 ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Logo - Hide on native mobile app to save space, but show on web version */}
        {(!isMobilePhone || !isNativeApp) && (
          <div className="w-24 h-24 mx-auto mb-5 relative">
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
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Tandem Daily</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Emoji Word Puzzle</p>
        </div>

        {/* Puzzle number and date */}
        <div className="mb-6">
          <div className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">
            Puzzle #{puzzleNumber}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{displayDate}</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
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

        <button
          onClick={handlePlayClick}
          disabled={!puzzle}
          className={`w-full p-4 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            ${
              highContrast
                ? 'bg-hc-primary border-[3px] border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-blue border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
            }
          `}
        >
          {puzzle ? "Play Today's Puzzle" : 'Loading Puzzle...'}
        </button>
      </div>

      {/* Cryptic Welcome Card */}
      <div className="mb-6">
        <CrypticWelcomeCard />
      </div>

      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(puzzleNumber) => {
          setShowArchive(false);
          // Small delay to ensure modal closes before loading new puzzle
          setTimeout(() => {
            onSelectPuzzle(puzzleNumber);
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
      <DailyCrypticAnnouncementModal
        isOpen={showCrypticAnnouncement}
        onClose={handleCloseAnnouncement}
      />
    </div>
  );
}
