'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReelConnectionsModal from './ReelConnectionsModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import storageService from '@/core/storage/storageService';

const STORAGE_KEY = 'reel-connections-stats';

/**
 * ArchiveModal - Calendar-based archive for Reel Connections puzzles
 * Styled with cinematic theme matching the game
 * No paywall - all archive puzzles are free
 */
export default function ArchiveModal({ isOpen, onClose, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [puzzleData, setPuzzleData] = useState({});
  const [completedDates, setCompletedDates] = useState(new Set());
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

  // First Reel Connections puzzle date - November 30, 2025
  const firstPuzzleDate = new Date(2025, 10, 30);
  const firstPuzzleMonth = 10; // November (0-indexed)
  const firstPuzzleYear = 2025;

  // Today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Load completed puzzles from storage when modal opens
  // Uses storageService which checks localStorage → IndexedDB → in-memory
  useEffect(() => {
    // Only load when modal is opening, not closing
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    // Small delay to ensure any pending stats saves have completed
    const timer = setTimeout(async () => {
      try {
        // Use storageService to check all storage layers (localStorage, IndexedDB, memory)
        const stored = await storageService.get(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.gameHistory && Array.isArray(parsed.gameHistory)) {
            const completed = new Set(parsed.gameHistory.filter((g) => g.won).map((g) => g.date));
            setCompletedDates(completed);
          } else {
            setCompletedDates(new Set());
          }
        } else {
          setCompletedDates(new Set());
        }
      } catch (error) {
        console.error('Error loading Reel Connections history:', error);
        setCompletedDates(new Set());
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Load puzzles for the current month
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

      const response = await fetch(
        `/api/reel-connections/archive?startDate=${startDate}&endDate=${endDate}`,
        { signal: abortControllerRef.current?.signal }
      );

      const monthData = {};

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.puzzles) {
          data.puzzles.forEach((puzzle) => {
            const puzzleDate = new Date(puzzle.date + 'T00:00:00');
            if (puzzleDate.getMonth() === month && puzzleDate.getFullYear() === year) {
              const day = puzzleDate.getDate();
              monthData[day] = {
                date: puzzle.date,
                id: puzzle.id,
              };
            }
          });
        }
      }

      setPuzzleData(monthData);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading Reel Connections archive:', error);
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

  const handlePreviousMonth = () => {
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

  const handleDayClick = (day) => {
    const puzzle = puzzleData[day];
    if (!puzzle) return;

    const currentDate = new Date(currentYear, currentMonth, day);
    if (currentDate > today || currentDate < firstPuzzleDate) return;

    onSelectDate?.(puzzle.date);
    onClose?.();
  };

  const canGoPrevious =
    currentYear > firstPuzzleYear ||
    (currentYear === firstPuzzleYear && currentMonth > firstPuzzleMonth);

  const canGoNext =
    currentYear < todayYear || (currentYear === todayYear && currentMonth < todayMonth);

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
      const currentDate = new Date(currentYear, currentMonth, day);
      const isPastFirstPuzzle = currentDate >= firstPuzzleDate;
      const isFutureDate = currentDate > today;
      const dateStr = puzzle?.date;
      const isCompleted = dateStr ? completedDates.has(dateStr) : false;
      const hasPuzzle = puzzle && isPastFirstPuzzle && !isFutureDate;
      const isInteractive = hasPuzzle;

      days.push(
        <button
          key={day}
          onClick={() => isInteractive && handleDayClick(day)}
          disabled={!isInteractive}
          className={`
                        relative flex flex-col items-center justify-center
                        min-h-[44px] aspect-square rounded-lg
                        transition-all duration-200
                        ${
                          isToday
                            ? 'bg-[#ffce00] text-[#0f0f1e] font-bold border-2 border-white'
                            : isInteractive
                              ? 'text-white/90 hover:bg-ghost-white/10 active:scale-95 cursor-pointer'
                              : 'text-white/30 cursor-not-allowed'
                        }
                    `}
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
          aria-label={`Day ${day}${isCompleted ? ', completed' : ''}${isToday ? ', today' : ''}`}
        >
          <div className="text-sm font-medium mb-1">{day}</div>

          {/* Status indicator */}
          {hasPuzzle && (
            <div
              className={`
                            w-2.5 h-2.5 rounded-full
                            ${
                              isCompleted
                                ? 'bg-green-400'
                                : 'border-2 border-white/50 bg-transparent'
                            }
                        `}
            />
          )}

          {/* Grey dot for no puzzle */}
          {!hasPuzzle && <div className="w-2 h-2 rounded-full bg-ghost-white/20" />}
        </button>
      );
    }

    return days;
  };

  return (
    <ReelConnectionsModal isOpen={isOpen} onClose={onClose} title="Puzzle Archive" maxHeight="85vh">
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            disabled={!canGoPrevious}
            className={`
                            w-10 h-10 rounded-xl border-2 flex items-center justify-center
                            transition-all
                            ${
                              !canGoPrevious
                                ? 'opacity-30 cursor-not-allowed border-white/20 text-white/30'
                                : 'border-white/30 text-white/80 hover:bg-ghost-white/10 active:scale-95'
                            }
                        `}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-lg font-bold text-white">
            {monthNames[currentMonth]} {currentYear}
          </div>

          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className={`
                            w-10 h-10 rounded-xl border-2 flex items-center justify-center
                            transition-all
                            ${
                              !canGoNext
                                ? 'opacity-30 cursor-not-allowed border-white/20 text-white/30'
                                : 'border-white/30 text-white/80 hover:bg-ghost-white/10 active:scale-95'
                            }
                        `}
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((name) => (
            <div key={name} className="text-center text-xs font-semibold text-white/50 py-2">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-ghost-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">{generateCalendarDays()}</div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-white/60">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-white/50 bg-transparent" />
            <span className="text-white/60">Not Played</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-ghost-white/20" />
            <span className="text-white/60">Unavailable</span>
          </div>
        </div>
      </div>
    </ReelConnectionsModal>
  );
}
