'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import CalendarDayCell from './CalendarDayCell';
import CalendarDatePicker from './CalendarDatePicker';
import PaywallModal from '@/components/PaywallModal';
import { getGameHistory } from '@/lib/storage';
import { getCurrentPuzzleNumber } from '@/lib/puzzleNumber';
import subscriptionService from '@/services/subscriptionService';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import platformService from '@/services/platform';

/**
 * ArchiveCalendar Component
 *
 * Calendar-based puzzle archive interface matching NYT Games (Wordle, Connections).
 * Shows month view with color-coded status dots for each puzzle.
 *
 * Features:
 * - Full month visible without scrolling
 * - Color-coded status indicators (green/yellow/red/grey dots)
 * - Month/year navigation with iOS-style picker
 * - Minimal design (no puzzle numbers or themes)
 * - Subscription paywall integration
 * - Works identically on web and iOS native
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
 * @param {Function} props.onSelectPuzzle - Puzzle selection handler (puzzleNumber)
 */
export default function ArchiveCalendar({ isOpen, onClose, onSelectPuzzle }) {
  const { highContrast } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [puzzleData, setPuzzleData] = useState({});
  const [puzzleAccessMap, setPuzzleAccessMap] = useState({});
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

  // Get first puzzle date (August 15, 2025) - use local timezone
  const firstPuzzleDate = new Date(2025, 7, 15); // Month is 0-indexed, so 7 = August
  const firstPuzzleMonth = 7; // August
  const firstPuzzleYear = 2025;

  // Get today's date in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to midnight for accurate comparison
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
      // Instead of querying by date, get all puzzles from 1 to current
      // This is simpler and avoids timezone conversion issues
      const currentNum = getCurrentPuzzleNumber();

      // Fetch puzzles from API using puzzle numbers (not dates)
      let response;
      let data;

      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const apiUrl = platformService.getApiUrl('/api/puzzles/archive');
        response = await CapacitorHttp.get({
          url: `${apiUrl}?start=1&end=${currentNum}&limit=100`,
          headers: {
            Accept: 'application/json',
          },
          responseType: 'json',
        });

        if (response.status >= 400) {
          throw new Error('Failed to fetch puzzles');
        }

        data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } else {
        response = await fetch(`/api/puzzles/archive?start=1&end=${currentNum}&limit=100`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch puzzles');
        }

        data = await response.json();
      }

      // Get game history for status
      const gameHistory = await getGameHistory();

      // Build puzzle data map keyed by day of month
      // Filter to only puzzles that fall in the current viewing month (in local timezone)
      const monthData = {};
      const accessMap = {};

      if (data && data.success && data.puzzles) {
        data.puzzles.forEach((puzzle) => {
          // The API returns dates in UTC format (YYYY-MM-DD from getDateForPuzzleNumber)
          // We need to check which LOCAL date this puzzle corresponds to
          // Parse the UTC date string
          const [y, m, d] = puzzle.date.split('-').map(Number);
          const puzzleDate = new Date(y, m - 1, d); // Create date in local timezone

          // Only include puzzles that fall in the current viewing month (local timezone)
          if (puzzleDate.getMonth() !== month || puzzleDate.getFullYear() !== year) {
            return; // Skip this puzzle, it's not in the current month
          }

          const day = puzzleDate.getDate();
          const historyData = gameHistory[puzzle.date] || {};

          monthData[day] = {
            number: puzzle.number,
            date: puzzle.date,
            status: historyData.status || 'not_played',
            completed: historyData.completed || false,
            failed: historyData.failed || false,
            attempted: historyData.attempted || false,
          };

          // Check access permissions
          const hasAccess =
            !Capacitor.isNativePlatform() || subscriptionService.canAccessPuzzle(puzzle.number);
          accessMap[day] = !hasAccess; // Invert for lock display
        });
      }

      setPuzzleData(monthData);
      setPuzzleAccessMap(accessMap);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[ArchiveCalendar] Failed to load month data:', error);
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
    // Don't go before August 2025 (first puzzle month)
    if (currentYear === firstPuzzleYear && currentMonth === firstPuzzleMonth) {
      return;
    }

    if (currentMonth === 0) {
      // Don't go before first puzzle year
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
      // Don't go beyond current month
      if (currentYear < todayYear) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      }
    } else {
      // Don't go beyond current month
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

    // Check if locked
    const isLocked = puzzleAccessMap[day] === true;
    if (isLocked) {
      setShowPaywall(true);
      return;
    }

    // Load puzzle
    onSelectPuzzle(puzzle.number);
  };

  /**
   * Handle purchase complete
   */
  const handlePurchaseComplete = () => {
    subscriptionService.refreshSubscriptionStatus().then(() => {
      // Reload current month data with new subscription status
      loadMonthData(currentMonth, currentYear);
    });
  };

  /**
   * Generate calendar grid
   */
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

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

      // Determine status
      let status = 'no_puzzle';
      if (puzzle) {
        status = puzzle.status;
      } else if (!isPastFirstPuzzle || isFutureDate) {
        status = 'no_puzzle';
      }

      days.push(
        <CalendarDayCell
          key={day}
          day={day}
          status={status}
          isToday={isToday}
          isCurrentMonth={true}
          isLocked={puzzleAccessMap[day] === true}
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
        aria-labelledby="archive-title"
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
            <h2 id="archive-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Archive
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
                    ? 'opacity-30 cursor-not-allowed'
                    : highContrast
                      ? 'border-hc-border hover:bg-hc-focus hover:text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
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
                    ? 'border-hc-border hover:bg-hc-focus hover:text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
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
                    ? 'opacity-30 cursor-not-allowed'
                    : highContrast
                      ? 'border-hc-border hover:bg-hc-focus hover:text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
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
              <div
                className={`w-3 h-3 rounded-full ${highContrast ? 'bg-hc-warning' : 'bg-accent-yellow'}`}
              />
              <span className="text-gray-600 dark:text-gray-400">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-full ${highContrast ? 'bg-hc-error' : 'bg-accent-red'}`}
              />
              <span className="text-gray-600 dark:text-gray-400">Failed</span>
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
