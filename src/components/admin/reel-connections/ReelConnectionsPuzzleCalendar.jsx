'use client';

import { useState, useEffect } from 'react';
import { getHolidaysForMonth } from '@/lib/holidays';

/**
 * ReelConnectionsPuzzleCalendar - Calendar view for managing Reel Connections puzzles
 * Shows which dates have puzzles and allows selecting dates to create/edit
 */
export default function ReelConnectionsPuzzleCalendar({
  puzzles = [],
  onSelectDate,
  selectedDate,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [puzzleMap, setPuzzleMap] = useState(new Map());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    // Create a map of date -> puzzle for quick lookup
    const map = new Map();
    puzzles.forEach((puzzle) => {
      map.set(puzzle.date, puzzle);
    });
    setPuzzleMap(map);
  }, [puzzles]);

  // Get days in current month
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

  // Navigate months
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Format date as YYYY-MM-DD
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

  const hasPuzzle = (day) => {
    const dateStr = formatDate(day);
    return puzzleMap.has(dateStr);
  };

  const getPuzzle = (day) => {
    const dateStr = formatDate(day);
    return puzzleMap.get(dateStr);
  };

  const isSelected = (day) => {
    const dateStr = formatDate(day);
    return selectedDate === dateStr;
  };

  const handleDayClick = (day) => {
    const dateStr = formatDate(day);
    onSelectDate?.(dateStr);
  };

  // Render calendar days
  const renderDays = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;
    const holidays = getHolidaysForMonth(currentMonth.getFullYear(), currentMonth.getMonth());

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startingDayOfWeek + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

      if (!isValidDay) {
        days.push(<div key={`empty-${i}`} className="aspect-square min-h-0" />);
      } else {
        const today = isToday(dayNumber);
        const puzzleExists = hasPuzzle(dayNumber);
        const puzzle = getPuzzle(dayNumber);
        const selected = isSelected(dayNumber);
        const holiday = holidays[dayNumber];

        days.push(
          <div
            key={dayNumber}
            className={`
              relative aspect-square min-h-0 p-1.5 sm:p-2 rounded-lg border overflow-hidden transition-all cursor-pointer
              ${today ? 'border-accent-yellow bg-accent-yellow/20' : ''}
              ${puzzleExists ? 'bg-accent-red/10' : ''}
              ${holiday && !puzzleExists ? 'bg-accent-orange/10' : ''}
              ${selected ? 'ring-2 ring-accent-red dark:ring-accent-red' : ''}
              hover:border-accent-red
            `}
            onClick={() => handleDayClick(dayNumber)}
          >
            <div className="flex justify-between items-start">
              <div className="text-xs sm:text-sm font-bold text-text-primary">{dayNumber}</div>
              {holiday && (
                <div className="text-[10px] sm:text-xs">
                  {holiday === 'Christmas'
                    ? '🎄'
                    : holiday === 'Halloween'
                      ? '🎃'
                      : holiday === "Valentine's Day"
                        ? '❤️'
                        : holiday === 'Easter'
                          ? '🐰'
                          : holiday === 'Thanksgiving'
                            ? '🦃'
                            : holiday === 'Independence Day'
                              ? '🎆'
                              : holiday === "New Year's Day"
                                ? '🎊'
                                : holiday === "St. Patrick's Day"
                                  ? '☘️'
                                  : '🎉'}
                </div>
              )}
            </div>
            {holiday && (
              <div className="hidden sm:block text-[8px] sm:text-[10px] text-text-primary mt-0.5 sm:mt-1 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                {holiday}
              </div>
            )}

            {/* Display first connection on desktop */}
            {puzzle && puzzle.groups && puzzle.groups[0] && (
              <div className="mt-0.5 sm:mt-1 flex-1">
                <div className="hidden sm:block text-[9px] sm:text-[11px] text-text-primary font-medium leading-tight break-words line-clamp-3">
                  {puzzle.groups[0].connection}
                </div>
              </div>
            )}

            {/* Puzzle indicator - movie icon */}
            {puzzleExists && (
              <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                <div className="sm:hidden text-xs">🎬</div>
              </div>
            )}
          </div>
        );
      }
    }

    return days;
  };

  return (
    <div className="bg-bg-surface rounded-lg p-3 sm:p-6 dark:">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="text-base sm:text-lg font-bold text-text-primary hover:text-accent-red transition-colors flex items-center gap-2"
          >
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showMonthPicker && (
            <div className="absolute top-full left-0 mt-2 bg-bg-surface rounded-lg p-4 z-50 w-72 sm:w-80 dark:">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ].map((month, index) => (
                  <button
                    key={month}
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(index);
                      setCurrentMonth(newDate);
                      setShowMonthPicker(false);
                    }}
                    className={`px-3 py-2 rounded text-sm font-bold border transition-transform ${
                      currentMonth.getMonth() === index
                        ? 'bg-accent-red text-white'
                        : 'bg-bg-card text-text-secondary hover:bg-accent-red/20'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={currentMonth.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(currentMonth);
                    newDate.setFullYear(parseInt(e.target.value));
                    setCurrentMonth(newDate);
                  }}
                  min="2024"
                  max="2030"
                  className="flex-1 px-3 py-2 rounded text-center bg-bg-card text-text-primary font-bold dark:"
                />
                <button
                  onClick={() => setShowMonthPicker(false)}
                  className="px-4 py-2 bg-accent-green rounded text-white font-bold transition-transform dark:"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={goToToday}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-accent-red text-white rounded-lg font-bold transition-transform dark:"
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="p-1.5 sm:p-2 text-text-primary font-bold text-lg hover:text-accent-red transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 sm:p-2 text-text-primary font-bold text-lg hover:text-accent-red transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-text-primary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">{renderDays()}</div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border-light">
        <div className="flex items-center gap-4 text-xs text-text-secondary font-medium">
          <div className="flex items-center gap-1.5">
            <div className="text-sm">🎬</div>
            <span className="hidden sm:inline">Has puzzle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-accent-yellow bg-accent-yellow/20" />
            <span className="hidden sm:inline">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-accent-red" />
            <span className="hidden sm:inline">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
