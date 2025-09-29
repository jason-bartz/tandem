'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { playStartSound, playButtonTone } from '@/lib/sounds';
import ThemeToggle from './ThemeToggle';
import PlayerStatsModal from './PlayerStatsModal';
import ArchiveModal from './ArchiveModal';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import { useArchivePreload } from '@/hooks/useArchivePreload';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Capacitor } from '@capacitor/core';
import subscriptionService from '@/services/subscriptionService';

export default function WelcomeScreen({
  onStart,
  theme,
  toggleTheme,
  _isAuto,
  _currentState,
  onSelectPuzzle,
  puzzle,
}) {
  const puzzleInfo = getCurrentPuzzleInfo();
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const { preloadArchive } = useArchivePreload();
  const { lightTap, mediumTap, welcomeMelody } = useHaptics();
  const { highContrast } = useTheme();

  useEffect(() => {
    // Check premium status on mount
    checkPremiumStatus();

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

  const checkPremiumStatus = async () => {
    if (Capacitor.isNativePlatform()) {
      const isSubscribed = await subscriptionService.isSubscribed();
      setIsPremium(isSubscribed);
    }
  };

  const handlePlayClick = () => {
    try {
      playButtonTone(); // Use the new distinct button tone
      mediumTap(); // Medium tap for starting the game
    } catch (e) {
      // Sound might fail on some browsers
    }
    onStart();
  };

  return (
    <div className="animate-fade-in">
      {/* Control buttons positioned above the card */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          onMouseEnter={() => preloadArchive()}
          className={`w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all relative ${
            isPremium ? 'ring-2 ring-sky-400 ring-offset-2' : ''
          }`}
          title="Archive"
        >
          📅
          {isPremium && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-sky-500 to-teal-400 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="How to Play"
        >
          ❓
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="Settings"
        >
          ⚙️
        </button>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Main welcome card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-10 text-center">
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

        <p className="text-gray-text dark:text-gray-300 text-lg font-medium mb-8">
          4 answers. 2 emojis each. 1 theme.
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
          <h3 className="text-sm uppercase tracking-wider text-gray-text dark:text-gray-300 mb-4 font-semibold">
            How to Play
          </h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl flex-shrink-0">
                🎯
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                Use the theme to guide your answers
              </span>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl flex-shrink-0">
                ✌️
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                Each emoji pair = one word, or <em>tandem</em>
              </span>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 text-xl flex-shrink-0">
                ❌
              </div>
              <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
                4 mistakes allowed
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePlayClick}
          disabled={!puzzle}
          className={`w-full p-4 text-white rounded-2xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            ${
              highContrast
                ? 'bg-hc-primary border-4 border-hc-border hover:bg-hc-focus hover:shadow-lg'
                : 'bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500 border-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/30 dark:hover:shadow-sky-400/20'
            }
          `}
        >
          {puzzle ? "Play Today's Puzzle" : 'Loading Puzzle...'}
        </button>

        <div className="text-gray-text dark:text-gray-400 text-sm mt-4">{puzzleInfo.date}</div>
      </div>

      <PlayerStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
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
