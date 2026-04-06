'use client';

import { useState, useEffect } from 'react';

/**
 * MiniPuzzleCalendar - Calendar view for managing Daily Mini puzzles
 * Shows which dates have puzzles and allows selecting dates to create/edit
 */
export default function MiniPuzzleCalendar({ puzzles = [], onSelectDate, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [puzzleMap, setPuzzleMap] = useState(new Map());

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

  // Get puzzle for date
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

        days.push(
          <div
            key={dayNumber}
            className={`
              relative aspect-square min-h-0 p-2 rounded-lg border overflow-hidden transition-all cursor-pointer
              ${today ? 'border-accent-yellow bg-accent-yellow/20' : ''}
              ${puzzleExists ? 'bg-accent-green/10' : ''}
              ${selected ? 'ring-2 ring-yellow-600 dark:ring-yellow-400' : ''}
              hover:border-accent-yellow
            `}
            onClick={() => handleDayClick(dayNumber)}
          >
            <div className="flex justify-between items-start">
              <div className="text-sm font-bold text-text-primary">{dayNumber}</div>
              {puzzleExists && <div className="text-[10px] sm:text-xs text-accent-green">✓</div>}
            </div>
            {/* Show puzzle number if exists */}
            {puzzle && (
              <div className="text-[8px] sm:text-[10px] text-text-secondary mt-0.5">
                #{puzzle.number}
              </div>
            )}
          </div>
        );
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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-ghost-white dark:bg-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-black text-text-primary">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-bold bg-accent-yellow text-gray-900 rounded-md transition-all duration-200"
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="px-3 py-2 text-sm font-bold bg-ghost-white dark:bg-gray-700 rounded-md transition-all duration-200"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-2 text-sm font-bold bg-ghost-white dark:bg-gray-700 rounded-md transition-all duration-200"
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-accent-yellow/20 border border-accent-yellow rounded" />
          <span className="text-text-secondary">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-accent-green/10 border rounded" />
          <span className="text-text-secondary">Has Puzzle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 ring-2 ring-yellow-600 border rounded" />
          <span className="text-text-secondary">Selected</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] sm:text-xs font-bold text-text-secondary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">{renderDays()}</div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t">
        <div className="text-sm text-text-secondary">
          <strong className="text-text-primary">{puzzles.length}</strong> puzzle
          {puzzles.length !== 1 ? 's' : ''} in database
        </div>
      </div>
    </div>
  );
}
