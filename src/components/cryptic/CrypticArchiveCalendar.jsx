'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * CrypticArchiveCalendar - Browse and play past cryptic puzzles
 * Archive requires Tandem Unlimited subscription
 * Shows completion status and allows selecting puzzles to replay
 */
export default function CrypticArchiveCalendar({ isOpen, onClose }) {
  const router = useRouter();
  const { isActive: hasSubscription, loading: subscriptionLoading } = useSubscription();
  const { highContrast } = useTheme();
  const getIconPath = useUIIcon();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [puzzles, setPuzzles] = useState([]);
  const [userStats, setUserStats] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPuzzlesForMonth();
    }
  }, [isOpen, currentMonth]);

  const loadPuzzlesForMonth = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Load puzzles for this month
      const puzzlesResponse = await fetch(
        `/api/admin/cryptic/puzzles?startDate=${startDate}&endDate=${endDate}`
      );
      const puzzlesData = await puzzlesResponse.json();

      // Load user stats for this month
      const statsResponse = await fetch(`/api/cryptic/stats`);
      const statsData = await statsResponse.json();

      if (puzzlesResponse.ok) {
        setPuzzles(puzzlesData.puzzles || []);
      }

      if (statsResponse.ok && statsData.stats) {
        const statsMap = new Map();
        statsData.stats.forEach((stat) => {
          statsMap.set(stat.puzzle_date, stat);
        });
        setUserStats(statsMap);
      }
    } catch (error) {
      console.error('Error loading archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    const today = new Date();
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

    // Don't allow going past current month
    if (nextMonthDate <= today) {
      setCurrentMonth(nextMonthDate);
    }
  };

  const formatDate = (day) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isFutureDate = (day) => {
    const dateStr = formatDate(day);
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const hasPuzzle = (day) => {
    const dateStr = formatDate(day);
    return puzzles.some((p) => p.date === dateStr);
  };

  const isCompleted = (day) => {
    const dateStr = formatDate(day);
    const stat = userStats.get(dateStr);
    return stat?.completed || false;
  };

  const handleDayClick = (day) => {
    if (isFutureDate(day) || !hasPuzzle(day)) return;

    const dateStr = formatDate(day);
    // Navigate to the cryptic game with the selected date
    onClose?.();
    router.push(`/dailycryptic?date=${dateStr}`);
  };

  const renderDays = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startingDayOfWeek + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

      if (!isValidDay) {
        days.push(
          <div
            key={`empty-${i}`}
            className="aspect-square p-2 bg-gray-50 dark:bg-gray-800/50"
          />
        );
      } else {
        const today = isToday(dayNumber);
        const future = isFutureDate(dayNumber);
        const puzzleExists = hasPuzzle(dayNumber);
        const completed = isCompleted(dayNumber);

        days.push(
          <button
            key={dayNumber}
            onClick={() => handleDayClick(dayNumber)}
            disabled={future || !puzzleExists}
            className={`
              aspect-square p-2 relative border transition-all
              ${future ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' : ''}
              ${!puzzleExists && !future ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600' : ''}
              ${puzzleExists && !future ? 'bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer' : ''}
              ${today ? 'ring-2 ring-blue-500' : ''}
              ${completed ? 'bg-green-50 dark:bg-green-900/20' : ''}
              border-gray-200 dark:border-gray-700
            `}
          >
            <span className={`text-sm ${today ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {dayNumber}
            </span>

            {/* Completion indicator */}
            {completed && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="text-xs">✓</div>
              </div>
            )}

            {/* Puzzle available indicator */}
            {puzzleExists && !completed && !future && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              </div>
            )}
          </button>
        );
      }
    }

    return days;
  };

  if (!isOpen) return null;

  const canGoNext = () => {
    const today = new Date();
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    return nextMonthDate <= today;
  };

  // Show paywall if no subscription
  if (!subscriptionLoading && !hasSubscription) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`rounded-[32px] border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-2xl w-full p-10 text-center ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-white dark:bg-bg-card border-border-main dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}>
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Image
                src={highContrast ? '/images/main-logo.webp' : (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '/images/dark-mode-logo.webp' : '/images/main-logo.webp')}
                alt="Tandem Logo"
                width={80}
                height={80}
                className="dark:hidden"
              />
              <Image
                src="/images/dark-mode-logo.webp"
                alt="Tandem Logo"
                width={80}
                height={80}
                className="hidden dark:block"
              />
            </div>
            <h2 className={`text-3xl font-bold mb-2 ${
              highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
            }`}>
              Archive Requires Tandem Unlimited
            </h2>
            <p className={`text-lg ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
            }`}>
              The daily puzzle is free for all account holders, but the archive is exclusive to Tandem Unlimited subscribers.
            </p>
          </div>

          <div className={`rounded-2xl p-6 mb-6 text-left ${
            highContrast
              ? 'bg-hc-surface border-[3px] border-hc-border'
              : 'bg-gray-50 dark:bg-gray-800'
          }`}>
            <h3 className={`text-sm uppercase tracking-wider mb-4 font-semibold ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
            }`}>
              With Tandem Unlimited:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className={highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}>
                  Play all past puzzles in the archive for both Tandem and Daily Cryptic
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className={highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}>
                  Hard Mode for extra challenge
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className={highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}>
                  Sync and save your progress across devices
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                onClose();
                router.push('/account');
              }}
              className={`px-8 py-4 text-white text-lg font-bold rounded-[20px] border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
                highContrast
                  ? 'bg-hc-primary border-hc-border hover:bg-hc-focus'
                  : 'border-black dark:border-gray-600 dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
              }`}
              style={!highContrast ? { backgroundColor: '#cb6ce6' } : {}}
            >
              Get Tandem Unlimited
            </button>
            <button
              onClick={onClose}
              className={`px-8 py-4 text-lg font-bold rounded-[20px] border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
                highContrast
                  ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-black dark:border-gray-600 dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cryptic Archive</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>

            <button
              onClick={nextMonth}
              disabled={!canGoNext()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">{renderDays()}</div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    </div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                    <span>Coming soon</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
