'use client';
import { useState, useEffect } from 'react';
import adminService from '@/services/admin.service';
import { formatDate } from '@/lib/utils';
import { getHolidaysForMonth } from '@/lib/holidays';

export default function PuzzleCalendar({
  onEditPuzzle,
  currentMonth: propCurrentMonth,
  onMonthChange,
}) {
  const [currentMonth, setCurrentMonthState] = useState(propCurrentMonth || new Date());
  const [puzzles, setPuzzles] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Sync with prop if provided
  useEffect(() => {
    if (propCurrentMonth) {
      setCurrentMonthState(propCurrentMonth);
    }
  }, [propCurrentMonth]);

  // Update internal state and notify parent
  const setCurrentMonth = (newMonth) => {
    setCurrentMonthState(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  useEffect(() => {
    loadMonthPuzzles();
  }, [currentMonth]);

  const loadMonthPuzzles = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const result = await adminService.getPuzzlesRange(startDate, endDate);
      if (result.success) {
        setPuzzles(result.puzzles || {});
      }
    } catch (error) {
      console.error('Failed to load puzzles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDeletePuzzle = async (date) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) {
      return;
    }

    try {
      const result = await adminService.deletePuzzle(date);
      if (result.success) {
        loadMonthPuzzles();
      }
    } catch (error) {
      console.error('Failed to delete puzzle:', error);
    }
  };

  const getPuzzleForDay = (day) => {
    if (!day) {
      return null;
    }
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return puzzles[date];
  };

  const hasAllHints = (puzzle) => {
    if (!puzzle || !puzzle.puzzles || puzzle.puzzles.length === 0) {
      return false;
    }
    // Check if all puzzles have non-empty hints
    return puzzle.puzzles.every((p) => p.hint && p.hint.trim().length > 0);
  };

  const isToday = (day) => {
    if (!day) {
      return false;
    }
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full w-full overflow-x-auto">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="text-base sm:text-lg font-medium text-gray-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors flex items-center gap-2"
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
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 w-72 sm:w-80">
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
                      className={`px-3 py-2 rounded text-sm ${
                        currentMonth.getMonth() === index
                          ? 'bg-sky-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
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
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-center dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={() => setShowMonthPicker(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePreviousMonth}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ←
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
          Loading puzzles...
        </div>
      ) : (
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
            {getDaysInMonth().map((day, index) => {
              const puzzle = getPuzzleForDay(day);
              const dateStr = day
                ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                    .toISOString()
                    .split('T')[0]
                : '';
              const holidays = getHolidaysForMonth(
                currentMonth.getFullYear(),
                currentMonth.getMonth()
              );
              const holiday = day ? holidays[day] : null;

              return (
                <div
                  key={index}
                  className={`
                    relative min-h-[80px] sm:min-h-[100px] md:h-32 p-1.5 sm:p-2 rounded border sm:rounded-lg overflow-hidden
                    ${day ? 'cursor-pointer hover:border-plum' : ''}
                    ${isToday(day) ? 'border-plum bg-plum/5' : 'border-gray-200 dark:border-gray-700'}
                    ${puzzle ? 'bg-green-50 dark:bg-green-900/20' : ''}
                    ${holiday && !puzzle ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                  `}
                  onClick={() =>
                    day &&
                    setSelectedPuzzle(puzzle ? { ...puzzle, date: dateStr } : { date: dateStr })
                  }
                >
                  {day && (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {day}
                        </div>
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
                        <div className="text-[8px] sm:text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 sm:mt-1 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                          {holiday}
                        </div>
                      )}
                      {puzzle && (
                        <div className="mt-0.5 sm:mt-1 flex-1">
                          <div className="text-[9px] sm:text-[11px] text-gray-600 dark:text-gray-400 leading-tight break-words">
                            {puzzle.theme}
                          </div>
                          <div className="text-xs sm:text-sm mt-0.5 sm:mt-1">
                            {puzzle.puzzles[0].emoji}
                          </div>
                        </div>
                      )}
                      {puzzle && hasAllHints(puzzle) && (
                        <div
                          className="absolute bottom-1 left-1 text-[10px] sm:text-xs"
                          title="All hints filled"
                        >
                          💡
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedPuzzle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
              {selectedPuzzle.theme ? 'Puzzle Details' : 'No Puzzle'} -{' '}
              {formatDate(selectedPuzzle.date, 'short')}
            </h3>

            {selectedPuzzle.theme ? (
              <>
                <div className="mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Theme:</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    {selectedPuzzle.theme}
                  </p>
                </div>

                <div className="space-y-2 mb-4 sm:mb-6">
                  {selectedPuzzle.puzzles.map((p, i) => (
                    <div key={i} className="flex items-center space-x-3 sm:space-x-4">
                      <span className="text-xl sm:text-2xl">{p.emoji}</span>
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                        {p.answer}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      onEditPuzzle({ ...selectedPuzzle, date: selectedPuzzle.date });
                      setSelectedPuzzle(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePuzzle(selectedPuzzle.date)}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedPuzzle(null)}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                  No puzzle scheduled for this date.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      onEditPuzzle({ date: selectedPuzzle.date });
                      setSelectedPuzzle(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm sm:text-base bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    Create Puzzle
                  </button>
                  <button
                    onClick={() => setSelectedPuzzle(null)}
                    className="flex-1 px-4 py-2 text-sm sm:text-base bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
