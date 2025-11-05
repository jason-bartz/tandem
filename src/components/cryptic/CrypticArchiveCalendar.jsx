'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import CalendarDayCell from '../game/CalendarDayCell';
import CalendarDatePicker from '../game/CalendarDatePicker';
import PaywallModal from '@/components/PaywallModal';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getCompletedCrypticPuzzles } from '@/lib/crypticStorage';

/**
 * CrypticArchiveCalendar Component
 *
 * Calendar-based cryptic puzzle archive interface matching the Tandem Daily archive.
 * Shows month view with color-coded status dots for each puzzle.
 *
 * Features:
 * - Full month visible without scrolling
 * - Color-coded status indicators (green dot for completed, grey for unavailable)
 * - Month/year navigation with iOS-style picker
 * - Minimal design (no puzzle numbers or themes)
 * - Subscription paywall integration
 *
 * Follows Apple HIG with:
 * - Clear visual hierarchy
 * - Smooth animations
 * - Proper touch targets
 * - Accessibility support
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close handler
 */
export default function CrypticArchiveCalendar({ isOpen, onClose }) {
  const router = useRouter();
  const { highContrast } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [puzzleData, setPuzzleData] = useState({});
  const [completedPuzzles, setCompletedPuzzles] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // First cryptic puzzle date (November 3, 2025)
  const firstPuzzleDate = new Date(2025, 10, 3); // Month is 0-indexed, so 10 = November
  const firstPuzzleMonth = 10; // November
  const firstPuzzleYear = 2025;

  // Get today's date in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  /**
   * Load puzzles for the current month
   */
  const loadMonthData = useCallback(async (month, year) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Load puzzles for this month using public API
      const puzzlesResponse = await fetch(
        `/api/cryptic/puzzle?startDate=${startDate}&endDate=${endDate}`,
        {
          signal: abortControllerRef.current.signal,
          credentials: 'include', // Include cookies for authentication
        }
      );

      // Load completed puzzles from local storage
      const completed = await getCompletedCrypticPuzzles();
      const completedSet = new Set(completed);

      const monthData = {};

      if (puzzlesResponse.ok) {
        const puzzlesData = await puzzlesResponse.json();
        if (puzzlesData.success && puzzlesData.puzzles) {
          puzzlesData.puzzles.forEach((puzzle) => {
            const puzzleDate = new Date(puzzle.date + 'T00:00:00'); // Parse in local timezone
            if (puzzleDate.getMonth() === month && puzzleDate.getFullYear() === year) {
              const day = puzzleDate.getDate();
              monthData[day] = {
                id: puzzle.id,
                date: puzzle.date,
              };
            }
          });
        }
      }

      setPuzzleData(monthData);
      setCompletedPuzzles(completedSet);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[CrypticArchiveCalendar] Failed to load month data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data when month/year changes or modal opens
  useEffect(() => {
    if (isOpen) {
      loadMonthData(currentMonth, currentYear);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, currentMonth, currentYear, loadMonthData]);

  // Reset to current month when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(todayMonth);
      setCurrentYear(todayYear);
    }
  }, [isOpen, todayMonth, todayYear]);

  /**
   * Navigate to previous month
   */
  const handlePreviousMonth = () => {
    // Don't go before November 2025 (first puzzle month)
    if (currentYear === firstPuzzleYear && currentMonth === firstPuzzleMonth) {
      return;
    }

    if (currentMonth === 0) {
      if (currentYear > firstPuzzleYear) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      }
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  /**
   * Navigate to next month
   */
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      if (currentYear < todayYear) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      }
    } else {
      if (currentYear === todayYear && currentMonth >= todayMonth) {
        return;
      }
      setCurrentMonth(currentMonth + 1);
    }
  };

  /**
   * Handle date picker selection
   */
  const handleDateSelect = (month, year) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  /**
   * Handle day cell click
   */
  const handleDayClick = (day) => {
    const puzzle = puzzleData[day];
    if (!puzzle) return;

    // Check if this is today's puzzle
    const isToday = day === todayDay && currentMonth === todayMonth && currentYear === todayYear;

    // Only require subscription for archive puzzles (not today's puzzle)
    const isArchivePuzzle = !isToday;
    if (isArchivePuzzle && !hasSubscription) {
      setShowPaywall(true);
      return;
    }

    // Navigate to the cryptic game with the selected date
    onClose?.();
    router.push(`/dailycryptic?date=${puzzle.date}`);
  };

  /**
   * Handle purchase complete
   */
  const handlePurchaseComplete = () => {
    // Reload current month data with new subscription status
    loadMonthData(currentMonth, currentYear);
  };

  /**
   * Generate calendar grid
   */
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const puzzle = puzzleData[day];
      const isToday = day === todayDay && currentMonth === todayMonth && currentYear === todayYear;

      // Check if this date is after first puzzle
      const currentDate = new Date(currentYear, currentMonth, day);
      const isPastFirstPuzzle = currentDate >= firstPuzzleDate;

      // Check if this is a future date
      const isFutureDate = currentDate > today;

      // Check if completed (from local storage)
      const dateStr = puzzle?.date;
      const isCompleted = dateStr ? completedPuzzles.has(dateStr) : false;

      // Determine status
      let status = 'no_puzzle';
      if (puzzle && isCompleted) {
        status = 'completed';
      } else if (puzzle && !isFutureDate) {
        status = 'not_played';
      } else if (!isPastFirstPuzzle || isFutureDate) {
        status = 'no_puzzle';
      }

      // Only lock archive puzzles (not today's puzzle)
      // Today's puzzle is free for all users
      const isArchivePuzzle = puzzle && !isToday;
      const shouldBeLocked = !hasSubscription && isArchivePuzzle;

      days.push(
        <CalendarDayCell
          key={day}
          day={day}
          status={status}
          isToday={isToday}
          isCurrentMonth={true}
          isLocked={shouldBeLocked}
          onClick={() => handleDayClick(day)}
          isPastFirstPuzzle={isPastFirstPuzzle}
          isFutureDate={isFutureDate}
        />
      );
    }

    return days;
  };

  // Check if can navigate to previous month
  const canGoPrevious =
    currentYear > firstPuzzleYear ||
    (currentYear === firstPuzzleYear && currentMonth > firstPuzzleMonth);

  // Check if can navigate to next month
  const canGoNext =
    currentYear < todayYear || (currentYear === todayYear && currentMonth < todayMonth);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cryptic-archive-title"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`
            rounded-[32px]
            border-[3px]
            p-6
            w-full max-w-md
            animate-modal-enter
            ${
              highContrast
                ? 'bg-hc-background border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                : 'bg-white dark:bg-bg-card border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            }
          `}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2
              id="cryptic-archive-title"
              className="text-2xl font-bold text-gray-800 dark:text-gray-200"
            >
              Daily Cryptic Archive
            </h2>
            <button
              onClick={onClose}
              className={`
                w-8 h-8
                rounded-xl
                border-[2px]
                flex items-center justify-center
                text-lg font-bold
                transition-all
                ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
                }
              `}
              aria-label="Close"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              ×
            </button>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousMonth}
              disabled={!canGoPrevious}
              className={`
                w-10 h-10
                rounded-xl
                border-[2px]
                flex items-center justify-center
                text-xl
                transition-all
                ${
                  !canGoPrevious
                    ? 'opacity-30 cursor-not-allowed text-gray-800 dark:text-gray-200'
                    : highContrast
                      ? 'border-hc-border text-hc-text hover:bg-hc-focus hover:text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                }
              `}
              aria-label="Previous month"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              ‹
            </button>

            <button
              onClick={() => setShowDatePicker(true)}
              className={`
                px-4 py-2
                rounded-xl
                border-[2px]
                font-semibold
                transition-all
                ${
                  highContrast
                    ? 'border-hc-border text-hc-text hover:bg-hc-focus hover:text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                }
              `}
              aria-label="Select month and year"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              {monthNames[currentMonth]} {currentYear}
            </button>

            <button
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className={`
                w-10 h-10
                rounded-xl
                border-[2px]
                flex items-center justify-center
                text-xl
                transition-all
                ${
                  !canGoNext
                    ? 'opacity-30 cursor-not-allowed text-gray-800 dark:text-gray-200'
                    : highContrast
                      ? 'border-hc-border text-hc-text hover:bg-hc-focus hover:text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                }
              `}
              aria-label="Next month"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              ›
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((name) => (
              <div
                key={name}
                className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {isLoading
              ? // Loading skeleton
                Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
                  />
                ))
              : generateCalendarDays()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-full ${highContrast ? 'bg-hc-success' : 'bg-accent-green'}`}
              />
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-gray-600 dark:text-gray-400">Unavailable</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              w-full py-3
              rounded-2xl
              border-[3px]
              font-semibold text-white
              transition-all
              ${
                highContrast
                  ? 'bg-hc-primary border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-blue border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }
            `}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Date Picker Modal */}
      <CalendarDatePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateSelect}
        currentMonth={currentMonth}
        currentYear={currentYear}
        minYear={firstPuzzleYear}
        maxYear={todayYear}
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
}
