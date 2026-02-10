'use client';
import { memo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

/**
 * CalendarDayCell Component
 *
 * Individual day cell for the calendar archive view.
 * Displays puzzle status with color-coded dots matching NYT Games style.
 *
 * Status Colors:
 * - Grey dot: No puzzle available
 * - Green: Completed
 * - Yellow/Orange: In progress (attempted)
 * - Red: Failed
 * - White/outlined: Not started
 *
 * Follows Apple HIG with:
 * - Clear tap targets (min 44x44pt)
 * - Visual feedback on interaction
 * - Proper accessibility labels
 * - High contrast mode support
 *
 * @param {Object} props
 * @param {number} props.day - Day number (1-31)
 * @param {string} props.status - Puzzle status ('completed', 'failed', 'attempted', 'not_played', 'no_puzzle')
 * @param {boolean} props.isToday - Whether this is today's date
 * @param {boolean} props.isCurrentMonth - Whether day is in current month
 * @param {boolean} props.isLocked - Whether puzzle requires subscription
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isPastFirstPuzzle - Whether date is after first puzzle (June 2021)
 * @param {boolean} props.isFutureDate - Whether date is in the future
 */
const CalendarDayCell = memo(
  ({
    day,
    status = 'no_puzzle',
    isToday = false,
    isCurrentMonth = true,
    isLocked = false,
    onClick,
    isPastFirstPuzzle = true,
    isFutureDate = false,
  }) => {
    const { highContrast } = useTheme();

    // Determine if this cell should be interactive
    const isInteractive =
      isCurrentMonth && isPastFirstPuzzle && !isFutureDate && status !== 'no_puzzle';

    // Get status indicator style
    const getStatusStyle = () => {
      // No puzzle or disabled states
      if (!isCurrentMonth || !isPastFirstPuzzle || isFutureDate || status === 'no_puzzle') {
        return {
          dot: 'bg-gray-300 dark:bg-gray-600',
          size: 'w-2 h-2',
          border: '',
        };
      }

      // Active puzzle states
      switch (status) {
        case 'completed':
          return {
            dot: highContrast ? 'bg-hc-success' : 'bg-accent-green',
            size: 'w-3 h-3',
            border: '',
          };
        case 'failed':
          return {
            dot: highContrast ? 'bg-hc-error' : 'bg-accent-red',
            size: 'w-3 h-3',
            border: '',
          };
        case 'attempted':
          return {
            dot: highContrast ? 'bg-hc-warning' : 'bg-accent-yellow',
            size: 'w-3 h-3',
            border: '',
            halfCircle: true, // Special indicator for in-progress
          };
        case 'not_played':
          return {
            dot: 'bg-transparent',
            size: 'w-3 h-3',
            border: `border-2 ${highContrast ? 'border-hc-border' : 'border-gray-400 dark:border-gray-500'}`,
          };
        default:
          return {
            dot: 'bg-gray-300 dark:bg-gray-600',
            size: 'w-2 h-2',
            border: '',
          };
      }
    };

    const statusStyle = getStatusStyle();

    // Get cell background and text styles
    const getCellStyle = () => {
      if (!isCurrentMonth || !isPastFirstPuzzle || isFutureDate) {
        return 'text-gray-400 dark:text-gray-500 cursor-not-allowed';
      }

      if (isToday) {
        return highContrast
          ? 'text-hc-primary-text bg-hc-primary border-[2px] border-hc-border font-bold'
          : 'text-white bg-accent-pink border-[2px] border-black font-bold';
      }

      if (isInteractive) {
        return highContrast
          ? 'text-hc-text hover:bg-hc-primary hover:text-hc-primary-text active:scale-95 cursor-pointer'
          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 cursor-pointer';
      }

      return 'text-gray-400 dark:text-gray-600';
    };

    // Accessibility label
    const getAriaLabel = () => {
      if (!isCurrentMonth || !isPastFirstPuzzle || isFutureDate || status === 'no_puzzle') {
        return `Day ${day}, no puzzle available`;
      }

      const statusText =
        {
          completed: 'completed',
          failed: 'failed',
          attempted: 'in progress',
          not_played: 'not started',
        }[status] || 'unavailable';

      return `Day ${day}, puzzle ${statusText}${isLocked ? ', locked' : ''}${isToday ? ', today' : ''}`;
    };

    return (
      <button
        onClick={isInteractive ? onClick : undefined}
        disabled={!isInteractive}
        className={`
        relative
        flex flex-col items-center justify-center
        min-h-[44px] aspect-square
        rounded-lg
        transition-all duration-200
        ${getCellStyle()}
      `}
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        aria-label={getAriaLabel()}
        role="button"
        tabIndex={isInteractive ? 0 : -1}
      >
        {/* Day number */}
        <div className="text-sm font-medium mb-1">{day}</div>

        {/* Status indicator or lock icon */}
        {isCurrentMonth && isPastFirstPuzzle && !isFutureDate && status !== 'no_puzzle' && (
          <div className="relative flex items-center justify-center">
            {isLocked ? (
              // Lock icon - replaces status indicator when puzzle is locked
              <Image
                src={`/ui/shared/lock${highContrast ? '' : ''}.png`}
                alt="Locked"
                width={16}
                height={16}
                className="opacity-60 dark:hidden"
              />
            ) : statusStyle.halfCircle ? (
              // Half-circle for attempted/in-progress
              <div className={`${statusStyle.size} relative`}>
                <div
                  className={`absolute inset-0 ${statusStyle.dot} rounded-full`}
                  style={{
                    clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                  }}
                />
                <div className={`absolute inset-0 ${statusStyle.border} rounded-full`} />
              </div>
            ) : (
              // Full circle for other states
              <div
                className={`
                ${statusStyle.size}
                ${statusStyle.dot}
                ${statusStyle.border}
                rounded-full
                transition-transform duration-200
                ${isInteractive ? 'group-hover:scale-110' : ''}
              `}
              />
            )}

            {/* Dark mode lock icon */}
            {isLocked && (
              <Image
                src="/ui/shared/lock-dark.png"
                alt="Locked"
                width={16}
                height={16}
                className="opacity-60 hidden dark:block"
              />
            )}
          </div>
        )}

        {/* Grey dot for unavailable dates */}
        {(!isCurrentMonth || !isPastFirstPuzzle || isFutureDate || status === 'no_puzzle') && (
          <div className={`${statusStyle.size} ${statusStyle.dot} rounded-full`} />
        )}
      </button>
    );
  }
);

CalendarDayCell.displayName = 'CalendarDayCell';

export default CalendarDayCell;
