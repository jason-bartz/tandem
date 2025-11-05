'use client';

import { useState, useEffect } from 'react';
import { getHolidaysForMonth } from '@/lib/holidays';

/**
 * CrypticPuzzleCalendar - Calendar view for managing cryptic puzzles
 * Shows which dates have puzzles and allows selecting dates to create/edit
 */
export default function CrypticPuzzleCalendar({ puzzles = [], onSelectDate, selectedDate }) {
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

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  // Check if date has puzzle
  const hasPuzzle = (day) => {
    const dateStr = formatDate(day);
    return puzzleMap.has(dateStr);
  };

  // Get puzzle for date
  const getPuzzle = (day) => {
    const dateStr = formatDate(day);
    return puzzleMap.get(dateStr);
  };

  // Check if date is selected
  const isSelected = (day) => {
    const dateStr = formatDate(day);
    return selectedDate === dateStr;
  };

  // Handle day click
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
        days.push(<div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] md:h-32" />);
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
              relative min-h-[80px] sm:min-h-[100px] md:h-32 p-1.5 sm:p-2 rounded-lg border-[2px] overflow-hidden transition-all cursor-pointer
              ${today ? 'border-accent-yellow bg-accent-yellow/20' : 'border-border-main'}
              ${puzzleExists ? 'bg-accent-green/10' : ''}
              ${holiday && !puzzleExists ? 'bg-accent-orange/10' : ''}
              ${selected ? 'ring-2 ring-purple-600 dark:ring-purple-400' : ''}
              hover:border-accent-yellow hover:translate-y-[-2px]
            `}
            style={{ boxShadow: 'var(--shadow-small)' }}
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
            {/* Only show holiday name on desktop, not mobile */}
            {holiday && (
              <div className="hidden sm:block text-[8px] sm:text-[10px] text-text-primary mt-0.5 sm:mt-1 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                {holiday}
              </div>
            )}

            {/* Display clue text on desktop (like PuzzleCalendar shows theme) */}
            {puzzle && puzzle.clue && (
              <div className="mt-0.5 sm:mt-1 flex-1">
                <div className="hidden sm:block text-[9px] sm:text-[11px] text-text-primary font-medium leading-tight break-words line-clamp-3">
                  {puzzle.clue}
                </div>
              </div>
            )}

            {/* Puzzle indicator - only show green dot on mobile */}
            {puzzleExists && (
              <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                <div className="sm:hidden w-1.5 h-1.5 rounded-full bg-accent-green inline-block" />
              </div>
            )}
          </div>
        );
      }
    }

    return days;
  };

  return (
    <div
      className="bg-bg-surface rounded-lg border-[3px] border-border-main p-3 sm:p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="text-base sm:text-lg font-bold text-text-primary hover:text-accent-blue transition-colors flex items-center gap-2"
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
            <div
              className="absolute top-full left-0 mt-2 bg-bg-surface rounded-lg border-[3px] border-border-main p-4 z-50 w-72 sm:w-80"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
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
                    className={`px-3 py-2 rounded text-sm font-bold border-[2px] transition-transform ${
                      currentMonth.getMonth() === index
                        ? 'bg-accent-yellow border-border-main text-text-primary'
                        : 'bg-bg-card border-border-main text-text-secondary hover:bg-accent-yellow/20'
                    }`}
                    style={{ boxShadow: 'var(--shadow-small)' }}
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
                  className="flex-1 px-3 py-2 border-[3px] border-border-main rounded text-center bg-bg-card text-text-primary font-bold"
                  style={{ boxShadow: 'var(--shadow-small)' }}
                />
                <button
                  onClick={() => setShowMonthPicker(false)}
                  className="px-4 py-2 bg-accent-green border-[3px] border-border-main rounded text-white font-bold hover:translate-y-[-2px] transition-transform"
                  style={{ boxShadow: 'var(--shadow-button)' }}
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
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-accent-blue border-[2px] border-border-main text-white rounded-lg font-bold hover:translate-y-[-1px] transition-transform"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="p-1.5 sm:p-2 text-text-primary font-bold text-lg hover:text-accent-yellow transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 sm:p-2 text-text-primary font-bold text-lg hover:text-accent-yellow transition-colors"
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
      <div className="mt-6 pt-4 border-t-[3px] border-border-main">
        <div className="flex items-center gap-4 text-xs text-text-secondary font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-green" />
            <span>Has puzzle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-accent-yellow bg-accent-yellow/20" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-purple-600" />
            <span>Selected</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t-[3px] border-border-main">
        <p className="text-sm text-text-secondary font-medium">
          Total puzzles this month:{' '}
          <span className="font-bold text-text-primary">
            {
              puzzles.filter((p) => {
                const puzzleDate = new Date(p.date);
                return (
                  puzzleDate.getMonth() === currentMonth.getMonth() &&
                  puzzleDate.getFullYear() === currentMonth.getFullYear()
                );
              }).length
            }
          </span>
        </p>
      </div>
    </div>
  );
}
