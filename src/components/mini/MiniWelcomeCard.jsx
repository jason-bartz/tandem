'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import miniService from '@/services/mini.service';
import { getCurrentMiniPuzzleInfo } from '@/lib/miniUtils';
import { useTheme } from '@/contexts/ThemeContext';
import logger from '@/lib/logger';
import { getStreakMessage } from '@/lib/streakMessages';
import { playButtonTone } from '@/lib/sounds';
import { useHaptics } from '@/hooks/useHaptics';
import { loadMiniPuzzleProgress } from '@/lib/miniStorage';

const loadingMessages = [
  'Crafting crossword clues...',
  'Aligning grid squares...',
  'Sharpening pencils...',
  'Consulting dictionary...',
  'Brewing coffee...',
];

/**
 * Preview card for Daily Mini on the main Tandem welcome screen
 * Shows today's puzzle info and links to the full game
 */
export default function MiniWelcomeCard({ currentStreak = 0 }) {
  const router = useRouter();
  const { highContrast, isDark } = useTheme();
  const { mediumTap } = useHaptics();
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [isVisible, setIsVisible] = useState(true);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [, setMessageQueue] = useState(() => {
    const shuffled = [...loadingMessages].sort(() => Math.random() - 0.5);
    return shuffled.slice(1);
  });

  useEffect(() => {
    loadPuzzlePreview();
  }, []);

  useEffect(() => {
    if (!loading) return;

    let timeoutId = null;

    const interval = setInterval(() => {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setMessageQueue((prevQueue) => {
          if (prevQueue.length === 0) {
            const shuffled = [...loadingMessages].sort(() => Math.random() - 0.5);
            setLoadingText(shuffled[0]);
            return shuffled.slice(1);
          }
          const [nextMessage, ...remaining] = prevQueue;
          setLoadingText(nextMessage);
          return remaining;
        });
        setIsVisible(true);
      }, 300);
    }, 2000); // Increased to 2 seconds for better readability

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  const loadPuzzlePreview = async () => {
    try {
      setLoading(true);
      const puzzleInfo = getCurrentMiniPuzzleInfo();
      const response = await miniService.getPuzzle(puzzleInfo.isoDate);

      if (response.success && response.puzzle) {
        setPuzzle(response.puzzle);

        const progress = await loadMiniPuzzleProgress(puzzleInfo.isoDate);
        setTodayCompleted(progress?.completed || false);
      } else {
        setError('No puzzle available today');
      }
    } catch (err) {
      logger.error('[MiniWelcomeCard] Error loading puzzle preview', {
        error: err.message,
      });
      setError('Unable to load puzzle');
    } finally {
      setLoading(false);
    }
  };

  const getPuzzleNumber = () => {
    if (!puzzle) return 0;
    return puzzle.number || getCurrentMiniPuzzleInfo().number;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePlayClick = () => {
    try {
      playButtonTone();
      mediumTap();
    } catch (e) {
      // Sound might fail on some browsers
    }
    router.push('/dailymini');
  };

  if (loading) {
    return (
      <div
        className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center relative ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <p className="text-base font-bold text-gray-800 dark:text-gray-200 text-center">
              {loadingText}
            </p>
          </div>
        </div>

        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-5">
          <Image
            src={isDark ? '/images/mini-logo-dark.png' : '/images/mini-logo.png'}
            alt="Daily Mini"
            width={80}
            height={80}
            className="rounded-xl opacity-30"
            priority
          />
        </div>

        {/* Title skeleton */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-[12px] mx-auto mb-3 w-48 animate-pulse"></div>

        {/* Info skeleton */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-[8px] mx-auto mb-8 w-32 animate-pulse"></div>

        {/* Button skeleton */}
        <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-[20px] w-full animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        <p className="text-text-secondary mb-4">{error}</p>
        <button
          onClick={loadPuzzlePreview}
          className="px-6 py-2 rounded-[16px] border-[2px] border-black dark:border-gray-600 bg-accent-yellow dark:bg-accent-yellow text-gray-900 font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center ${
        highContrast
          ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
          : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* Header with Icon */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="w-20 h-20 relative mb-3">
          <Image
            src={isDark ? '/images/mini-logo-dark.png' : '/images/mini-logo.png'}
            alt="Daily Mini"
            width={80}
            height={80}
            className="rounded-xl"
            priority
          />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">Daily Mini</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Classic 5×5 mini crossword</p>
        </div>
      </div>

      {/* Puzzle Number */}
      <div className="mb-6 text-center">
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Puzzle #{getPuzzleNumber()}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(puzzle?.date || new Date().toISOString().split('T')[0])}
        </p>
      </div>

      {/* How to Play Section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-ghost-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 p-2">
            <Image src="/icons/ui/mini.png" alt="" width={24} height={24} />
          </div>
          <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
            Classic 5×5 mini crossword
          </span>
        </div>
      </div>

      {/* Streak Display */}
      {currentStreak > 0 && (
        <div className="mb-4 text-center flex items-center justify-center gap-1.5">
          <Image src="/icons/ui/hardmode.png" alt="" width={12} height={12} />
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {getStreakMessage(currentStreak, 'mini')}
          </p>
        </div>
      )}

      {/* Play Button */}
      <button
        onClick={handlePlayClick}
        disabled={loading}
        className={`w-full h-14 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          ${
            highContrast
              ? 'bg-hc-primary border-[3px] border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
          }
        `}
        style={!highContrast ? { backgroundColor: '#ffce00' } : {}}
      >
        <span className="text-gray-900">
          {todayCompleted ? 'You solved it!' : "Play Today's Mini"}
        </span>
      </button>
    </div>
  );
}
