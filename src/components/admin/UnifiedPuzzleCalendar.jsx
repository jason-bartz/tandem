'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import authService from '@/services/auth.service';
import { getHolidaysForMonth } from '@/lib/holidays';
import logger from '@/lib/logger';
import { ASSET_VERSION } from '@/lib/constants';

// Game configuration for easy extensibility
const GAMES = {
  tandem: {
    id: 'tandem',
    name: 'Daily Tandem',
    icon: '/ui/games/tandem.png',
    color: 'accent-yellow',
  },
  mini: {
    id: 'mini',
    name: 'Daily Mini',
    icon: '/ui/games/mini.png',
    color: 'accent-blue',
  },
  soup: {
    id: 'soup',
    name: 'Daily Alchemy',
    icon: `/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`,
    color: 'accent-green',
  },
  reel: {
    id: 'reel',
    name: 'Reel Connections',
    icon: '/ui/games/movie.png',
    color: 'accent-red',
  },
};

// Holiday emoji mapping
const getHolidayEmoji = (holidayName) => {
  const emojiMap = {
    Christmas: '🎄',
    'Christmas Eve': '🎄',
    Halloween: '🎃',
    "Valentine's Day": '❤️',
    Easter: '🐰',
    Thanksgiving: '🦃',
    'Independence Day': '🎆',
    "New Year's Day": '🎊',
    "New Year's Eve": '🎊',
    "St. Patrick's Day": '☘️',
    "Mother's Day": '💐',
    "Father's Day": '👔',
    'Memorial Day': '🇺🇸',
    'Labor Day': '👷',
    'Veterans Day': '🎖️',
    "Presidents' Day": '🏛️',
    'MLK Jr. Day': '✊',
    "April Fool's Day": '🃏',
    'Earth Day': '🌍',
    'Cinco de Mayo': '🇲🇽',
    Juneteenth: '✊',
    'Groundhog Day': '🦫',
    'Black Friday': '🛍️',
    'Cyber Monday': '💻',
    'Daylight Saving': '⏰',
    'Fall Back': '⏰',
    'Patriot Day': '🇺🇸',
    "Women's Equality Day": '♀️',
    'Columbus Day': '🧭',
  };
  return emojiMap[holidayName] || '🎉';
};

export default function UnifiedPuzzleCalendar({ onSelectDate, onRefresh }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [puzzleData, setPuzzleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Format date as YYYY-MM-DD
  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Load all puzzle data for current view
  const loadPuzzleData = useCallback(async () => {
    setLoading(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Calculate date range for fetching (include buffer for calendar display)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Buffer for days from prev/next month shown in calendar
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const formatApiDate = (d) => d.toISOString().split('T')[0];

    try {
      const headers = await authService.getAuthHeaders();

      // Fetch all four puzzle types in parallel
      const [tandemRes, miniRes, soupRes, reelRes] = await Promise.all([
        fetch(
          `/api/admin/puzzles?start=${formatApiDate(startDate)}&end=${formatApiDate(endDate)}`,
          {
            headers,
          }
        ),
        fetch('/api/admin/mini/puzzles?limit=365', { headers }),
        fetch('/api/admin/daily-alchemy/puzzles?limit=365', { headers }),
        fetch('/api/admin/reel-connections/puzzles?limit=365', { headers }),
      ]);

      const [tandemData, miniData, soupData, reelData] = await Promise.all([
        tandemRes.json(),
        miniRes.json(),
        soupRes.json(),
        reelRes.json(),
      ]);

      // Merge all data into unified structure keyed by date
      const merged = {};

      // Add Tandem puzzles (keyed by date inside puzzles property)
      if (tandemData?.puzzles && typeof tandemData.puzzles === 'object') {
        Object.entries(tandemData.puzzles).forEach(([date, puzzle]) => {
          if (!merged[date]) merged[date] = {};
          merged[date].tandem = puzzle;
        });
      }

      // Add Mini puzzles
      if (miniData?.puzzles) {
        miniData.puzzles.forEach((puzzle) => {
          if (!merged[puzzle.date]) merged[puzzle.date] = {};
          merged[puzzle.date].mini = puzzle;
        });
      }

      // Add Daily Alchemy puzzles
      if (soupData?.puzzles) {
        soupData.puzzles.forEach((puzzle) => {
          if (!merged[puzzle.date]) merged[puzzle.date] = {};
          merged[puzzle.date].soup = puzzle;
        });
      }

      // Add Reel Connections puzzles
      if (reelData?.puzzles) {
        reelData.puzzles.forEach((puzzle) => {
          if (!merged[puzzle.date]) merged[puzzle.date] = {};
          merged[puzzle.date].reel = puzzle;
        });
      }

      setPuzzleData(merged);
    } catch (error) {
      logger.error('Error loading puzzle data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Load data on mount and when month changes
  useEffect(() => {
    loadPuzzleData();
  }, [loadPuzzleData]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefresh) {
      onRefresh(loadPuzzleData);
    }
  }, [onRefresh, loadPuzzleData]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    const holidays = getHolidaysForMonth(year, month);
    const today = new Date();
    const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    // Empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ empty: true, key: `empty-start-${i}` });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const dayData = puzzleData[dateKey] || {};
      const holiday = holidays[day] || null;
      const isToday = dateKey === todayStr;

      days.push({
        day,
        dateKey,
        isToday,
        holiday,
        holidayEmoji: holiday ? getHolidayEmoji(holiday) : null,
        hasTandem: !!dayData.tandem,
        hasMini: !!dayData.mini,
        hasSoup: !!dayData.soup,
        hasReel: !!dayData.reel,
        puzzleCount:
          (dayData.tandem ? 1 : 0) +
          (dayData.mini ? 1 : 0) +
          (dayData.soup ? 1 : 0) +
          (dayData.reel ? 1 : 0),
      });
    }

    // Empty cells for days after month ends
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        days.push({ empty: true, key: `empty-end-${i}` });
      }
    }

    return days;
  };

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

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = generateCalendarDays();

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="text-lg sm:text-xl font-bold text-text-primary hover:text-accent-blue transition-colors flex items-center gap-2"
          >
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            <svg
              className={`w-4 h-4 transition-transform ${showMonthPicker ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Month picker dropdown */}
          {showMonthPicker && (
            <div className="absolute top-full left-0 mt-2 bg-bg-surface border-[3px] border-black dark:border-white rounded-lg shadow-lg z-50 p-3 min-w-[280px]">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {monthNames.map((name, index) => (
                  <button
                    key={name}
                    onClick={() => {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), index, 1));
                      setShowMonthPicker(false);
                    }}
                    className={`px-2 py-1.5 text-xs font-bold rounded-lg border-[2px] transition-all ${
                      index === currentMonth.getMonth()
                        ? 'bg-accent-yellow border-black text-gray-900'
                        : 'bg-bg-card border-gray-300 dark:border-gray-600 text-text-primary hover:border-black dark:hover:border-white'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1)
                    )
                  }
                  className="px-3 py-1 text-sm font-bold bg-bg-card border-[2px] border-black dark:border-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ←
                </button>
                <span className="text-sm font-bold text-text-primary min-w-[60px] text-center">
                  {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1)
                    )
                  }
                  className="px-3 py-1 text-sm font-bold bg-bg-card border-[2px] border-black dark:border-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs sm:text-sm font-bold bg-accent-yellow text-gray-900 border-[2px] border-black rounded-lg hover:translate-y-[-1px] transition-all"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            Today
          </button>
          <button
            onClick={goToPreviousMonth}
            className="p-2 font-bold bg-bg-card rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 font-bold bg-bg-card rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-secondary">
        <div className="flex items-center gap-1.5">
          {/* Mobile: dot, Desktop: icon */}
          <span className="sm:hidden w-2 h-2 rounded-full bg-accent-yellow"></span>
          <Image
            src={GAMES.tandem.icon}
            alt=""
            width={16}
            height={16}
            className="hidden sm:block"
          />
          <span>Tandem</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mobile: dot, Desktop: icon */}
          <span className="sm:hidden w-2 h-2 rounded-full bg-accent-blue"></span>
          <Image src={GAMES.mini.icon} alt="" width={16} height={16} className="hidden sm:block" />
          <span>Mini</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mobile: dot, Desktop: icon */}
          <span className="sm:hidden w-2 h-2 rounded-full bg-accent-green"></span>
          <Image src={GAMES.soup.icon} alt="" width={16} height={16} className="hidden sm:block" />
          <span>Alchemy</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mobile: dot, Desktop: icon */}
          <span className="sm:hidden w-2 h-2 rounded-full bg-accent-red"></span>
          <Image src={GAMES.reel.icon} alt="" width={16} height={16} className="hidden sm:block" />
          <span>Reel</span>
        </div>
        <span className="text-text-muted">|</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-accent-yellow/30 border border-accent-yellow"></span>
          <span>Today</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border-[3px] border-black dark:border-white rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-bg-card border-b-[3px] border-black dark:border-white">
          {dayHeaders.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs sm:text-sm font-bold text-text-primary border-r last:border-r-0 border-gray-200 dark:border-gray-700"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {days.map((dayInfo) => {
            if (dayInfo.empty) {
              return (
                <div
                  key={dayInfo.key}
                  className="aspect-square bg-gray-50 dark:bg-gray-900/50 border-r border-b last:border-r-0 border-gray-200 dark:border-gray-700"
                />
              );
            }

            const hasPuzzles = dayInfo.puzzleCount > 0;

            return (
              <button
                key={dayInfo.dateKey}
                onClick={() => onSelectDate(dayInfo.dateKey, puzzleData[dayInfo.dateKey] || {})}
                className={`
                  aspect-square p-1 sm:p-2 flex flex-col items-start justify-start
                  border-r border-b last:border-r-0 border-gray-200 dark:border-gray-700
                  transition-all hover:bg-accent-yellow/10 active:scale-95
                  ${dayInfo.isToday ? 'bg-accent-yellow/20 ring-2 ring-inset ring-accent-yellow' : 'bg-bg-surface'}
                  ${hasPuzzles ? 'bg-accent-green/5' : ''}
                  ${dayInfo.holiday && !hasPuzzles ? 'bg-accent-orange/10' : ''}
                `}
              >
                {/* Day number with mobile holiday emoji */}
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      dayInfo.isToday ? 'text-accent-yellow' : 'text-text-primary'
                    }`}
                  >
                    {dayInfo.day}
                  </span>
                  {/* Holiday emoji inline on mobile */}
                  {dayInfo.holiday && (
                    <span className="sm:hidden text-xs">{dayInfo.holidayEmoji}</span>
                  )}
                </div>

                {/* Holiday indicator - desktop only */}
                {dayInfo.holiday && (
                  <div className="hidden sm:block mt-0.5 text-left">
                    <span className="text-base">{dayInfo.holidayEmoji}</span>
                    <p className="hidden lg:block text-[10px] text-text-secondary leading-tight truncate max-w-full">
                      {dayInfo.holiday}
                    </p>
                  </div>
                )}

                {/* Game indicators - dots on mobile, icons on desktop */}
                {/* Use 2x2 grid when all 4 puzzles exist, otherwise single row */}
                <div
                  className={`mt-auto ${
                    dayInfo.puzzleCount === 4
                      ? 'grid grid-cols-2 gap-0.5 sm:gap-1'
                      : 'flex items-center justify-start gap-0.5 sm:gap-1'
                  }`}
                >
                  {dayInfo.hasTandem && (
                    <>
                      {/* Mobile: colored dot */}
                      <span className="sm:hidden w-2 h-2 rounded-full bg-accent-yellow"></span>
                      {/* Desktop: icon */}
                      <div className="hidden sm:block w-5 h-5 relative">
                        <Image
                          src={GAMES.tandem.icon}
                          alt="Tandem"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </>
                  )}
                  {dayInfo.hasMini && (
                    <>
                      {/* Mobile: colored dot */}
                      <span className="sm:hidden w-2 h-2 rounded-full bg-accent-blue"></span>
                      {/* Desktop: icon */}
                      <div className="hidden sm:block w-5 h-5 relative">
                        <Image src={GAMES.mini.icon} alt="Mini" fill className="object-contain" />
                      </div>
                    </>
                  )}
                  {dayInfo.hasSoup && (
                    <>
                      {/* Mobile: colored dot */}
                      <span className="sm:hidden w-2 h-2 rounded-full bg-accent-green"></span>
                      {/* Desktop: icon */}
                      <div className="hidden sm:block w-5 h-5 relative">
                        <Image src={GAMES.soup.icon} alt="Soup" fill className="object-contain" />
                      </div>
                    </>
                  )}
                  {dayInfo.hasReel && (
                    <>
                      {/* Mobile: colored dot */}
                      <span className="sm:hidden w-2 h-2 rounded-full bg-accent-red"></span>
                      {/* Desktop: icon */}
                      <div className="hidden sm:block w-5 h-5 relative">
                        <Image src={GAMES.reel.icon} alt="Reel" fill className="object-contain" />
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
