'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * CharacterBlock Component
 *
 * Individual character cell in a crossword-style answer grid.
 * Uses single dividing lines between cells instead of individual boxes.
 * Following Apple HIG with:
 * - 44pt minimum touch target (iOS standard)
 * - Spring animations with iOS curves
 * - Haptic feedback on interactions
 * - Support for reduce motion
 * - High contrast mode support
 * - Semantic accessibility
 *
 * @param {Object} props
 * @param {string|null} props.value - Current character (single letter or null)
 * @param {boolean} props.isActive - Whether this block has focus
 * @param {boolean} props.isLocked - Whether this is a locked (correct hint) letter
 * @param {boolean} props.isWrong - Whether the entire answer is marked wrong
 * @param {boolean} props.isCorrect - Whether the entire answer is correct
 * @param {number} props.position - Position index in the answer (0-based)
 * @param {number} props.totalLength - Total number of blocks in answer
 * @param {Function} props.onFocus - Callback when block is clicked/focused
 * @param {string} props.themeColor - Theme color for active state
 * @param {boolean} props.isSmallPhone - Small phone responsive flag
 * @param {boolean} props.isMobilePhone - Mobile phone responsive flag
 * @param {number} props.entryDelay - Stagger delay for entry animation (ms)
 */
export default function CharacterBlock({
  value,
  isActive,
  isLocked,
  isWrong,
  isCorrect,
  position,
  totalLength,
  onFocus,
  themeColor: _themeColor = '#3B82F6', // Default blue - unused but kept for API compatibility
  isSmallPhone = false,
  isMobilePhone = false,
  entryDelay = 0,
}) {
  const { selectionStart, lightTap } = useHaptics();
  const { highContrast, reduceMotion } = useTheme();
  const previousIsCorrect = useRef(isCorrect);
  const blockRef = useRef(null);

  // Trigger celebration when answer becomes correct
  useEffect(() => {
    if (isCorrect && !previousIsCorrect.current && !reduceMotion) {
      // Individual block celebration with stagger
      if (blockRef.current) {
        blockRef.current.style.animationDelay = `${position * 50}ms`;
      }
    }
    previousIsCorrect.current = isCorrect;
  }, [isCorrect, position, reduceMotion]);

  const handleClick = () => {
    if (!isLocked && !isCorrect && onFocus) {
      selectionStart(); // Haptic feedback on focus
      onFocus();
    }
  };

  // Determine cell size based on device - crossword cells are more compact
  const getCellSize = () => {
    if (isSmallPhone) return 'w-6 h-8'; // 24x32pt - compact for mobile
    if (isMobilePhone) return 'w-7 h-9'; // 28x36pt - compact for mobile
    return 'w-8 h-10 sm:w-9 sm:h-11'; // 32x40pt / 36x44pt - compact desktop
  };

  // Determine text size
  const getTextSize = () => {
    if (isSmallPhone) return 'text-base'; // 16pt
    if (isMobilePhone) return 'text-lg'; // 18pt
    return 'text-lg sm:text-xl'; // 18pt / 20pt
  };

  // Animation variants
  const variants = {
    initial: {
      scale: 0.8,
      opacity: 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        delay: reduceMotion ? 0 : entryDelay / 1000,
        duration: reduceMotion ? 0 : 0.3,
        ease: [0.34, 1.56, 0.64, 1], // iOS spring curve
      },
    },
    correct: {
      scale: [1, 1.1, 1],
      transition: {
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : position * 0.05,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
    wrong: {
      x: reduceMotion ? 0 : [-2, 2, -2, 2, 0],
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  };

  // Determine background color - active state fills interior blue
  const getBgColor = () => {
    if (isCorrect || isLocked) {
      return highContrast ? 'bg-hc-success' : 'bg-accent-green';
    }
    if (isActive && !isCorrect && !isLocked) {
      // Fill interior with blue when active
      return 'bg-accent-blue';
    }
    if (isWrong) {
      return highContrast
        ? 'bg-hc-surface'
        : 'bg-accent-red/20 dark:bg-red-900/20';
    }
    return highContrast
      ? 'bg-hc-background'
      : 'bg-white dark:bg-gray-800';
  };

  // Determine text color
  const getTextColor = () => {
    if (isCorrect || isLocked) {
      return 'text-white';
    }
    if (isActive && !isCorrect && !isLocked) {
      // White text on blue background when active
      return 'text-white';
    }
    if (isWrong) {
      return highContrast ? 'text-hc-error' : 'text-red-900 dark:text-red-400';
    }
    return highContrast ? 'text-hc-text' : 'text-dark-text dark:text-gray-200';
  };

  // Determine border styling - only right border for divider (except last cell)
  // Always use black dividing lines for all states
  const getBorderStyle = () => {
    const isLastCell = position === totalLength - 1;

    // Use black dividers for all states (correct, wrong, neutral)
    return isLastCell
      ? 'border-r-0'
      : highContrast
        ? 'border-r-[2px] border-hc-border'
        : 'border-r-[2px] border-gray-800 dark:border-gray-600';
  };

  return (
    <motion.div
      ref={blockRef}
      variants={variants}
      initial={false} // Don't use initial animation on mount if already correct/wrong
      animate={
        isCorrect && !reduceMotion
          ? 'correct'
          : isWrong && !reduceMotion
            ? 'wrong'
            : 'animate'
      }
      onClick={handleClick}
      onMouseEnter={() => !isLocked && !isCorrect && lightTap()}
      className={`
        ${getCellSize()}
        ${getBgColor()}
        ${getTextColor()}
        ${getBorderStyle()}
        flex
        items-center
        justify-center
        font-bold
        uppercase
        transition-all
        duration-200
        select-none
        ${isLocked || isCorrect ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${isActive && !isCorrect && !isLocked && !reduceMotion ? 'scale-105' : ''}
        relative
      `}
      role="button"
      tabIndex={isLocked || isCorrect ? -1 : 0}
      aria-label={
        isLocked
          ? `Character cell, position ${position + 1} of ${totalLength}, locked, letter ${value}`
          : value
            ? `Character cell, position ${position + 1} of ${totalLength}, letter ${value}`
            : `Character cell, position ${position + 1} of ${totalLength}, empty`
      }
      aria-disabled={isLocked || isCorrect}
      aria-pressed={isActive}
    >
      {value ? (
        <motion.span
          key={`char-${position}-${value}`}
          className={getTextSize()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          {value.toUpperCase()}
        </motion.span>
      ) : null}

    </motion.div>
  );
}
