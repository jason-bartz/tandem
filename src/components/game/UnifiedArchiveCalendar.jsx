'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import CalendarDayCell from './CalendarDayCell';
import CalendarDatePicker from './CalendarDatePicker';
import PaywallModal from '@/components/PaywallModal';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import CalendarSkeleton from '@/components/shared/CalendarSkeleton';
import { getGameHistory } from '@/lib/storage';
import { getPuzzleRangeForMonth } from '@/lib/puzzleNumber';
import subscriptionService from '@/services/subscriptionService';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getCompletedCrypticPuzzles } from '@/lib/crypticStorage';

/**
 * UnifiedArchiveCalendar Component
 *
 * Unified calendar-based puzzle archive interface with tabs for both Tandem and Cryptic puzzles.
 * Shows month view with color-coded status dots for each puzzle.
 *
 * Features:
 * - Tabs to switch between Tandem (blue) and Cryptic (purple) archives
 * - Full month visible without scrolling
 * - Color-coded status indicators (green/yellow/red/grey dots)
 * - Month/year navigation with iOS-style picker
 * - Minimal design (no puzzle numbers or themes in calendar view)
 * - Subscription paywall integration
 * - Works identically on web and iOS native
 * - Uses LeftSidePanel for consistent slide-in behavior
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
 * @param {Function} props.onSelectPuzzle - Puzzle selection handler for Tandem (puzzleNumber)
 * @param {string} props.defaultTab - Default tab to show ('tandem' or 'cryptic')
 */
export default function UnifiedArchiveCalendar({
  isOpen,
  onClose,
  onSelectPuzzle,
  defaultTab = 'tandem',
}) {
  const router = useRouter();
  const { highContrast } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [puzzleData, setPuzzleData] = useState({});
  const [puzzleAccessMap, setPuzzleAccessMap] = useState({});
  const [completedCrypticPuzzles, setCompletedCrypticPuzzles] = useState(new Set());
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

  // First puzzle dates - use local timezone
  const firstTandemPuzzleDate = new Date(2025, 7, 15); // August 15, 2025
  const firstTandemPuzzleMonth = 7;
  const firstTandemPuzzleYear = 2025;

  const firstCrypticPuzzleDate = new Date(2025, 10, 3); // November 3, 2025
  const firstCrypticPuzzleMonth = 10;
  const firstCrypticPuzzleYear = 2025;

  // Current first puzzle date based on active tab
  const firstPuzzleDate = activeTab === 'tandem' ? firstTandemPuzzleDate : firstCrypticPuzzleDate;
  const firstPuzzleMonth =
    activeTab === 'tandem' ? firstTandemPuzzleMonth : firstCrypticPuzzleMonth;
  const firstPuzzleYear = activeTab === 'tandem' ? firstTandemPuzzleYear : firstCrypticPuzzleYear;

  // Get today's date in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to midnight for accurate comparison
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  /**
   * Load puzzles for the current month - Tandem puzzles
   */
  const loadTandemMonthData = useCallback(async (month, year) => {
    try {
      // Calculate the puzzle range for the current viewing month
      const puzzleRange = getPuzzleRangeForMonth(month, year);

      // If month is entirely before launch or in future, show empty calendar
      if (!puzzleRange) {
        return { monthData: {}, accessMap: {} };
      }

      const { startPuzzle, endPuzzle } = puzzleRange;

      // Get fresh game history first
      const gameHistory = await getGameHistory();

      // Fetch puzzles from API using puzzle numbers for the current month only
      const apiUrl = getApiUrl(`/api/puzzles/archive?start=${startPuzzle}&end=${endPuzzle}`);
      const response = await capacitorFetch(apiUrl, {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch puzzles');
      }

      const data = await response.json();

      // Build puzzle data map keyed by day of month
      const monthData = {};
      const accessMap = {};

      if (data && data.success && data.puzzles) {
        data.puzzles.forEach((puzzle) => {
          const [y, m, d] = puzzle.date.split('-').map(Number);
          const puzzleDate = new Date(y, m - 1, d); // Create date in local timezone

          // Only include puzzles that fall in the current viewing month (local timezone)
          if (puzzleDate.getMonth() !== month || puzzleDate.getFullYear() !== year) {
            return; // Skip this puzzle
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
          const hasAccess = subscriptionService.canAccessPuzzle(puzzle.number);
          accessMap[day] = !hasAccess; // Invert for lock display
        });
      }

      return { monthData, accessMap };
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[UnifiedArchiveCalendar] Failed to load Tandem month data:', error);
      }
      return { monthData: {}, accessMap: {} };
    }
  }, []);

  /**
   * Load puzzles for the current month - Cryptic puzzles
   */
  const loadCrypticMonthData = useCallback(async (month, year) => {
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Load puzzles for this month using public API
      const puzzlesResponse = await fetch(
        `/api/cryptic/puzzle?startDate=${startDate}&endDate=${endDate}`,
        {
          signal: abortControllerRef.current?.signal,
          credentials: 'include',
        }
      );

      // Load completed puzzles from local storage
      const completed = await getCompletedCrypticPuzzles();
      const completedSet = new Set(completed);
      setCompletedCrypticPuzzles(completedSet);

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

      return { monthData, accessMap: {} }; // Cryptic doesn't use accessMap in the same way
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[UnifiedArchiveCalendar] Failed to load Cryptic month data:', error);
      }
      return { monthData: {}, accessMap: {} };
    }
  }, []);

  /**
   * Load puzzles for the current month based on active tab
   */
  const loadMonthData = useCallback(
    async (month, year) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);

      try {
        let result;
        if (activeTab === 'tandem') {
          result = await loadTandemMonthData(month, year);
        } else {
          result = await loadCrypticMonthData(month, year);
        }

        setPuzzleData(result.monthData);
        setPuzzleAccessMap(result.accessMap);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, loadTandemMonthData, loadCrypticMonthData]
  );

  // Load data when month/year changes, modal opens, or tab changes
  useEffect(() => {
    if (isOpen) {
      loadMonthData(currentMonth, currentYear);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, currentMonth, currentYear, activeTab, loadMonthData]);

  // Reset to current month when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(todayMonth);
      setCurrentYear(todayYear);
    }
  }, [isOpen, todayMonth, todayYear]);

  // Reset to default tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  /**
   * Navigate to previous month
   */
  const handlePreviousMonth = () => {
    // Don't go before first puzzle month for the active tab
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

    const isToday = day === todayDay && currentMonth === todayMonth && currentYear === todayYear;

    if (activeTab === 'tandem') {
      // Check if locked
      const isLocked = puzzleAccessMap[day] === true;
      if (isLocked) {
        setShowPaywall(true);
        return;
      }

      // Load puzzle - pass date for proper admire mode detection
      onSelectPuzzle(puzzle.date);
    } else {
      // Cryptic - only require subscription for archive puzzles (not today's puzzle)
      const isArchivePuzzle = !isToday;
      if (isArchivePuzzle && !hasSubscription) {
        setShowPaywall(true);
        return;
      }

      // Navigate to the cryptic game with the selected date
      onClose?.();
      router.push(`/dailycryptic?date=${puzzle.date}`);
    }
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

      // Determine status based on active tab
      let status = 'no_puzzle';
      let shouldBeLocked = false;

      if (activeTab === 'tandem') {
        if (puzzle) {
          status = puzzle.status;
        } else if (!isPastFirstPuzzle || isFutureDate) {
          status = 'no_puzzle';
        }
        shouldBeLocked = puzzleAccessMap[day] === true;
      } else {
        // Cryptic
        const dateStr = puzzle?.date;
        const isCompleted = dateStr ? completedCrypticPuzzles.has(dateStr) : false;

        if (puzzle && isCompleted) {
          status = 'completed';
        } else if (puzzle && !isFutureDate) {
          status = 'not_played';
        } else if (!isPastFirstPuzzle || isFutureDate) {
          status = 'no_puzzle';
        }

        // Only lock archive puzzles (not today's puzzle)
        const isArchivePuzzle = puzzle && !isToday;
        shouldBeLocked = !hasSubscription && isArchivePuzzle;
      }

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

  // Get title with logo based on active tab
  const title = (
    <div className="flex items-center gap-2">
      <img
        src={activeTab === 'tandem' ? '/icons/ui/tandem.png' : '/icons/ui/cryptic.png'}
        alt={activeTab === 'tandem' ? 'Tandem' : 'Cryptic'}
        className="w-6 h-6"
      />
      <span>{activeTab === 'tandem' ? 'Tandem Puzzle Archive' : 'Cryptic Puzzle Archive'}</span>
    </div>
  );

  return (
    <>
      <LeftSidePanel
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        maxWidth="480px"
        contentClassName="px-6"
        headerClassName={
          activeTab === 'tandem'
            ? 'bg-accent-blue/30 dark:bg-accent-blue/30'
            : 'bg-accent-purple/30 dark:bg-accent-purple/30'
        }
        footer={
          /* Tab Buttons */
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tandem')}
              className={`
                flex-1 py-3 px-4
                rounded-2xl
                border-[3px]
                font-semibold
                transition-all
                flex items-center justify-center gap-2
                ${
                  activeTab === 'tandem'
                    ? highContrast
                      ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                      : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : highContrast
                      ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      : 'bg-accent-blue text-white border-black dark:border-gray-600 hover:bg-accent-blue/90 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              aria-label="Tandem Archive"
              aria-pressed={activeTab === 'tandem'}
            >
              <img src="/icons/ui/tandem.png" alt="" className="w-5 h-5" />
              Tandem
            </button>
            <button
              onClick={() => setActiveTab('cryptic')}
              className={`
                flex-1 py-3 px-4
                rounded-2xl
                border-[3px]
                font-semibold
                transition-all
                flex items-center justify-center gap-2
                ${
                  activeTab === 'cryptic'
                    ? highContrast
                      ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                      : 'bg-accent-purple text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : highContrast
                      ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      : 'bg-accent-purple text-white border-black dark:border-gray-600 hover:bg-accent-purple/90 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              aria-label="Cryptic Archive"
              aria-pressed={activeTab === 'cryptic'}
            >
              <img src="/icons/ui/cryptic.png" alt="" className="w-5 h-5" />
              Cryptic
            </button>
          </div>
        }
      >
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between mb-6 mt-2">
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
        <div className="grid grid-cols-7 gap-1 mb-3 mt-6">
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
        {isLoading ? (
          <CalendarSkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-2 mb-8">{generateCalendarDays()}</div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs mb-2">
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
      </LeftSidePanel>

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
