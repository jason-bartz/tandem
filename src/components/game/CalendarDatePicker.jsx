'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * CalendarDatePicker Component
 *
 * iOS-style date picker for selecting month and year.
 * Mimics the native iOS UIDatePicker with scrollable wheel interface.
 *
 * Features:
 * - Scrollable month and year pickers
 * - "Today" quick action button
 * - "Done" confirmation
 * - Smooth scroll animations
 * - Follows Apple HIG design patterns
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether picker is visible
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSelect - Selection handler (month, year)
 * @param {number} props.currentMonth - Currently selected month (0-11)
 * @param {number} props.currentYear - Currently selected year
 * @param {number} props.minYear - Minimum selectable year (default: 2021)
 * @param {number} props.maxYear - Maximum selectable year (default: current year)
 */
export default function CalendarDatePicker({
  isOpen,
  onClose,
  onSelect,
  currentMonth = new Date().getMonth(),
  currentYear = new Date().getFullYear(),
  minYear = 2021,
  maxYear = new Date().getFullYear(),
}) {
  const { highContrast } = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const monthPickerRef = useRef(null);
  const yearPickerRef = useRef(null);

  const months = [
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

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // First puzzle was in August 2025 (month index 7)
  const firstPuzzleMonth = 7; // August
  const firstPuzzleYear = 2025;

  // Helper to check if a month is selectable
  const isMonthSelectable = (monthIndex, year) => {
    // If year is before first puzzle year, not selectable
    if (year < firstPuzzleYear) return false;
    // If year is the first puzzle year, only months from August onward
    if (year === firstPuzzleYear) return monthIndex >= firstPuzzleMonth;
    // All other months are selectable
    return true;
  };

  const handleToday = () => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    setSelectedMonth(month);
    setSelectedYear(year);
    onSelect(month, year);
    onClose();
  };

  const handleDone = () => {
    onSelect(selectedMonth, selectedYear);
    onClose();
  };

  // Scroll to selected items when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Scroll month picker to selected month
        if (monthPickerRef.current) {
          const monthElement = monthPickerRef.current.querySelector(
            `[data-month="${currentMonth}"]`
          );
          if (monthElement) {
            monthElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }

        // Scroll year picker to selected year
        if (yearPickerRef.current) {
          const yearElement = yearPickerRef.current.querySelector(`[data-year="${currentYear}"]`);
          if (yearElement) {
            yearElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [isOpen, currentMonth, currentYear]);

  if (!isOpen) {
    return null;
  }

  const picker = (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black bg-opacity-50 animate-backdrop-enter"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-picker-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full max-w-md
          rounded-t-[32px]
          border-t-[3px] border-l-[3px] border-r-[3px]
          p-4
          animate-slide-up-enter
          ${
            highContrast
              ? 'bg-hc-background border-hc-border'
              : 'bg-ghost-white dark:bg-bg-card border-black dark:border-gray-600'
          }
        `}
        style={{
          maxHeight: '60vh',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleToday}
            className={`
              px-4 py-2
              text-sm font-semibold
              rounded-xl
              transition-all
              ${
                highContrast
                  ? 'text-hc-primary hover:bg-hc-focus hover:text-white'
                  : 'text-accent-blue hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }
            `}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            Today
          </button>

          <h3 id="date-picker-title" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Select Date
          </h3>

          <button
            onClick={handleDone}
            className={`
              px-4 py-2
              text-sm font-bold
              rounded-xl
              transition-all
              ${
                highContrast
                  ? 'bg-hc-primary text-white hover:bg-hc-focus'
                  : 'bg-accent-blue text-white hover:bg-blue-600'
              }
            `}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            Done
          </button>
        </div>

        {/* Picker Wheels */}
        <div className="flex gap-4 mb-4" style={{ height: '200px' }}>
          {/* Month Picker */}
          <div className="flex-1 relative">
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y-2 border-gray-300 dark:border-gray-600 pointer-events-none"
              style={{ zIndex: 1 }}
            />
            <div
              ref={monthPickerRef}
              className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'y mandatory',
                scrollPaddingTop: '80px',
                scrollPaddingBottom: '80px',
              }}
            >
              {/* Spacers for centering */}
              <div style={{ height: '80px' }} />

              {months.map((month, index) => {
                const selectable = isMonthSelectable(index, selectedYear);
                return (
                  <button
                    key={index}
                    data-month={index}
                    onClick={() => selectable && setSelectedMonth(index)}
                    disabled={!selectable}
                    className={`
                      w-full h-10 flex items-center justify-center
                      snap-center
                      text-base font-medium
                      transition-all
                      ${
                        !selectable
                          ? 'opacity-30 cursor-not-allowed'
                          : selectedMonth === index
                            ? 'text-gray-900 dark:text-white scale-110'
                            : 'text-gray-400 dark:text-gray-500 scale-90'
                      }
                    `}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {month}
                  </button>
                );
              })}

              {/* Spacers for centering */}
              <div style={{ height: '80px' }} />
            </div>
          </div>

          {/* Year Picker */}
          <div className="flex-1 relative">
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y-2 border-gray-300 dark:border-gray-600 pointer-events-none"
              style={{ zIndex: 1 }}
            />
            <div
              ref={yearPickerRef}
              className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'y mandatory',
                scrollPaddingTop: '80px',
                scrollPaddingBottom: '80px',
              }}
            >
              {/* Spacers for centering */}
              <div style={{ height: '80px' }} />

              {years.map((year) => (
                <button
                  key={year}
                  data-year={year}
                  onClick={() => setSelectedYear(year)}
                  className={`
                    w-full h-10 flex items-center justify-center
                    snap-center
                    text-base font-medium
                    transition-all
                    ${
                      selectedYear === year
                        ? 'text-gray-900 dark:text-white scale-110'
                        : 'text-gray-400 dark:text-gray-500 scale-90'
                    }
                  `}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {year}
                </button>
              ))}

              {/* Spacers for centering */}
              <div style={{ height: '80px' }} />
            </div>
          </div>
        </div>

        {/* Selected Date Display */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {months[selectedMonth]} {selectedYear}
          </p>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );

  // Render to body using portal to ensure proper z-index stacking
  return typeof document !== 'undefined' ? createPortal(picker, document.body) : null;
}
