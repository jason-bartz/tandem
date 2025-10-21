'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import CharacterBlock from './CharacterBlock';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CharacterBlockGrid Component
 *
 * Manages a crossword-style grid of character cells for answer input.
 * Cells are contained in a bordered box with single dividing lines between them.
 * Handles keyboard navigation, auto-advance, and cell-level state.
 *
 * Following Apple HIG with:
 * - Smart auto-advance (like iOS verification codes)
 * - Keyboard navigation with arrow keys
 * - Automatic focus management
 * - Proper spacing (8pt grid)
 * - Accessibility support
 *
 * @param {Object} props
 * @param {string} props.value - Current answer value (full string)
 * @param {Function} props.onChange - Callback when value changes (answerIndex, newValue)
 * @param {number} props.answerLength - Total number of characters in answer
 * @param {number} props.answerIndex - Index of this answer in the puzzle
 * @param {boolean} props.isCorrect - Whether entire answer is correct
 * @param {boolean} props.isWrong - Whether entire answer is marked wrong
 * @param {Object|null} props.lockedLetters - Map of position -> letter for locked characters
 * @param {boolean} props.isFocused - Whether this answer row has focus
 * @param {Function} props.onFocus - Callback when grid receives focus
 * @param {Function} props.onKeyboardInput - Callback for keyboard input (key)
 * @param {boolean} props.hasHint - Whether this answer has a hint shown
 * @param {string} props.themeColor - Theme color for active blocks
 * @param {boolean} props.isSmallPhone - Small phone responsive flag
 * @param {boolean} props.isMobilePhone - Mobile phone responsive flag
 */
export default function CharacterBlockGrid({
  value = '',
  onChange,
  answerLength = 0,
  answerIndex = 0,
  isCorrect = false,
  isWrong = false,
  lockedLetters = null,
  isFocused = false,
  onFocus,
  onKeyboardInput,
  hasHint = false,
  themeColor = '#3B82F6',
  isSmallPhone = false,
  isMobilePhone = false,
}) {
  const { highContrast } = useTheme();
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const gridRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const wasFocused = useRef(false);
  const activeBlockRef = useRef(null);

  // Initialize activeBlockIndex to first non-locked, empty position when focused
  // Only run when focus changes, not when value changes
  useEffect(() => {
    if (isFocused && !isCorrect && !wasFocused.current) {
      // Find first empty non-locked position
      let targetIndex = 0;
      for (let i = 0; i < answerLength; i++) {
        const isLocked = lockedLetters && lockedLetters[i];
        const hasValue = value[i] && value[i] !== ' ';
        if (!isLocked && !hasValue) {
          targetIndex = i;
          break;
        }
      }
      setActiveBlockIndex(targetIndex);

      // Focus hidden input for keyboard
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }

    // Track focus state
    wasFocused.current = isFocused;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, answerLength, lockedLetters, isCorrect]); // Removed 'value' from dependencies to prevent cursor reset

  // Auto-scroll active block into view when it changes
  useEffect(() => {
    if (
      isFocused &&
      !isCorrect &&
      answerLength > 8 &&
      isMobilePhone &&
      activeBlockRef.current &&
      scrollContainerRef.current
    ) {
      // Smooth scroll the active block into view, centered
      activeBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeBlockIndex, isFocused, isCorrect, answerLength, isMobilePhone]);

  // Hide scroll indicator on first scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || answerLength <= 8 || !isMobilePhone) return;

    const handleScroll = () => {
      setShowScrollIndicator(false);
    };

    container.addEventListener('scroll', handleScroll, { once: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [answerLength, isMobilePhone]);

  // Find next available block (skipping locked ones)
  const findNextAvailableBlock = useCallback(
    (currentIndex, direction = 1) => {
      let nextIndex = currentIndex + direction;

      // Boundary check
      if (nextIndex < 0) return 0;
      if (nextIndex >= answerLength) return answerLength - 1;

      // Skip locked blocks
      while (
        nextIndex >= 0 &&
        nextIndex < answerLength &&
        lockedLetters &&
        lockedLetters[nextIndex]
      ) {
        nextIndex += direction;
      }

      // Ensure we stay in bounds
      if (nextIndex < 0) return currentIndex;
      if (nextIndex >= answerLength) return currentIndex;

      return nextIndex;
    },
    [answerLength, lockedLetters]
  );

  // Handle block focus
  const handleBlockFocus = useCallback(
    (blockIndex) => {
      if (isCorrect) return;

      // Skip locked blocks
      const isLocked = lockedLetters && lockedLetters[blockIndex];
      if (isLocked) return;

      setActiveBlockIndex(blockIndex);

      // Notify parent that this answer row is focused
      if (onFocus) {
        onFocus();
      }

      // Focus hidden input
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    },
    [isCorrect, lockedLetters, onFocus]
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e) => {
      if (isCorrect) return;

      const key = e.key;

      // Handle letter input
      if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();

        // Skip locked blocks
        if (lockedLetters && lockedLetters[activeBlockIndex]) {
          return;
        }

        // Update value at current position
        const currentValue = value || '';
        // Pad value to answer length if needed
        const paddedValue = currentValue.padEnd(answerLength, ' ');
        // Replace character at position
        const chars = paddedValue.split('');
        chars[activeBlockIndex] = key.toUpperCase();
        const newValue = chars.join('');

        onChange(answerIndex, newValue);

        // Auto-advance to next block only if not at the last position
        if (activeBlockIndex < answerLength - 1) {
          const nextIndex = findNextAvailableBlock(activeBlockIndex, 1);
          if (nextIndex > activeBlockIndex) {
            setActiveBlockIndex(nextIndex);
          }
        }
      }
      // Handle backspace
      else if (key === 'Backspace') {
        e.preventDefault();

        // Skip locked blocks
        if (lockedLetters && lockedLetters[activeBlockIndex]) {
          // If on locked block, move back
          const prevIndex = findNextAvailableBlock(activeBlockIndex, -1);
          setActiveBlockIndex(prevIndex);
          return;
        }

        const currentValue = value || '';
        // Pad value to answer length if needed
        const paddedValue = currentValue.padEnd(answerLength, ' ');

        // If current block has a value, clear it
        if (paddedValue[activeBlockIndex] && paddedValue[activeBlockIndex] !== ' ') {
          const chars = paddedValue.split('');
          chars[activeBlockIndex] = ' ';
          const newValue = chars.join('');
          onChange(answerIndex, newValue);
        }
        // Otherwise, move back and clear previous
        else if (activeBlockIndex > 0) {
          const prevIndex = findNextAvailableBlock(activeBlockIndex, -1);
          setActiveBlockIndex(prevIndex);

          if (paddedValue[prevIndex] && paddedValue[prevIndex] !== ' ') {
            const chars = paddedValue.split('');
            chars[prevIndex] = ' ';
            const newValue = chars.join('');
            onChange(answerIndex, newValue);
          }
        }
      }
      // Handle arrow keys for navigation
      else if (key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = findNextAvailableBlock(activeBlockIndex, -1);
        if (prevIndex < activeBlockIndex) {
          setActiveBlockIndex(prevIndex);
        }
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = findNextAvailableBlock(activeBlockIndex, 1);
        if (nextIndex > activeBlockIndex) {
          setActiveBlockIndex(nextIndex);
        }
      }
      // Handle up/down arrow keys - pass to parent to navigate between answers
      else if (key === 'ArrowUp') {
        e.preventDefault();
        if (onKeyboardInput) {
          onKeyboardInput('ARROW_UP');
        }
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        if (onKeyboardInput) {
          onKeyboardInput('ARROW_DOWN');
        }
      }
      // Handle Enter key - submit answer
      else if (key === 'Enter') {
        e.preventDefault();
        if (onKeyboardInput) {
          onKeyboardInput('ENTER');
        }
      }
    },
    [
      isCorrect,
      activeBlockIndex,
      value,
      answerIndex,
      answerLength,
      lockedLetters,
      onChange,
      onKeyboardInput,
      findNextAvailableBlock,
    ]
  );

  // Handle hidden input changes (for mobile keyboards)
  const handleInputChange = (e) => {
    // Mobile keyboards might use this
    const inputValue = e.target.value;
    if (inputValue && inputValue.length > 0) {
      const lastChar = inputValue[inputValue.length - 1];
      if (/^[a-zA-Z]$/.test(lastChar)) {
        // Skip locked blocks
        if (lockedLetters && lockedLetters[activeBlockIndex]) {
          return;
        }

        // Update value at current position
        const currentValue = value || '';
        // Pad value to answer length if needed
        const paddedValue = currentValue.padEnd(answerLength, ' ');
        // Replace character at position
        const chars = paddedValue.split('');
        chars[activeBlockIndex] = lastChar.toUpperCase();
        const newValue = chars.join('');

        onChange(answerIndex, newValue);

        // Auto-advance to next block only if not at the last position
        if (activeBlockIndex < answerLength - 1) {
          const nextIndex = findNextAvailableBlock(activeBlockIndex, 1);
          if (nextIndex > activeBlockIndex) {
            setActiveBlockIndex(nextIndex);
          }
        }
      }
      // Clear input after processing
      e.target.value = '';
    }
  };

  // Generate blocks array
  const blocks = [];
  // Pad value to ensure we always have enough characters for all blocks
  const paddedValue = (value || '').padEnd(answerLength, ' ');

  for (let i = 0; i < answerLength; i++) {
    const isLocked = lockedLetters && lockedLetters[i];
    const char = paddedValue[i];
    // Always show the character value (including spaces) - the CharacterBlock will handle display
    // This ensures letters don't disappear when answer is marked correct/wrong
    const displayChar = char && char !== ' ' ? char : null;
    const isActiveBlock = isFocused && activeBlockIndex === i && !isCorrect;

    blocks.push(
      <div
        key={`block-wrapper-${answerIndex}-${i}`}
        ref={isActiveBlock ? activeBlockRef : null}
        className="flex-shrink-0"
      >
        <CharacterBlock
          value={displayChar}
          isActive={isActiveBlock}
          isLocked={isLocked}
          isWrong={isWrong && !isLocked}
          isCorrect={isCorrect}
          position={i}
          totalLength={answerLength}
          onFocus={() => handleBlockFocus(i)}
          themeColor={themeColor}
          isSmallPhone={isSmallPhone}
          isMobilePhone={isMobilePhone}
          entryDelay={i * 50} // Stagger entry animation
        />
      </div>
    );
  }

  // Determine outer border color - always keep black outline
  const getOuterBorderColor = () => {
    // Always use black outline for all states (correct, wrong, neutral)
    return highContrast ? 'border-hc-border' : 'border-gray-800 dark:border-gray-600';
  };

  // Determine shadow for outer container
  const getShadow = () => {
    if (isCorrect) {
      return 'shadow-[2px_2px_0px_rgba(126,217,87,0.5)]';
    }
    if (isWrong) {
      return 'shadow-[2px_2px_0px_rgba(255,87,87,0.3)]';
    }
    return 'shadow-[2px_2px_0px_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.3)]';
  };

  // Determine if we need horizontal scrolling
  const needsScroll = answerLength > 8 && isMobilePhone;

  return (
    <div className="relative">
      {/* Hidden input for keyboard management */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="none"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        value=""
        readOnly
      />

      {needsScroll ? (
        // Scrollable container for long words on mobile
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scroll-smooth snap-x snap-proximity hide-scrollbar"
            style={{
              scrollPaddingLeft: '0px',
              WebkitOverflowScrolling: 'touch',
            }}
            role="region"
            aria-label="Scrollable answer input"
          >
            {/* Character blocks grid - crossword style with outer border */}
            <div
              ref={gridRef}
              className={`
                inline-flex
                ${getOuterBorderColor()}
                ${getShadow()}
                border-[3px]
                rounded-xl
                overflow-hidden
                transition-all
                duration-200
              `}
              role="group"
              aria-label={`Answer ${answerIndex + 1}, ${answerLength} characters${hasHint ? ', hint available' : ''}`}
              onClick={() => {
                if (!isCorrect && onFocus) {
                  onFocus();
                }
              }}
            >
              {blocks}
            </div>
          </div>

          {/* Scroll indicator - subtle gradient on right edge */}
          <AnimatePresence>
            {showScrollIndicator && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`absolute right-0 top-0 h-full w-12 pointer-events-none ${
                  highContrast
                    ? 'bg-gradient-to-l from-hc-surface via-hc-surface/50 to-transparent'
                    : 'bg-gradient-to-l from-white/90 via-white/40 to-transparent dark:from-gray-800/90 dark:via-gray-800/40 dark:to-transparent'
                }`}
                style={{
                  maskImage: 'linear-gradient(to left, black 0%, black 30%, transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to left, black 0%, black 30%, transparent 100%)',
                }}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        // Normal non-scrollable grid for short words or desktop
        <div
          ref={gridRef}
          className={`
            inline-flex
            ${getOuterBorderColor()}
            ${getShadow()}
            border-[3px]
            rounded-xl
            overflow-hidden
            transition-all
            duration-200
          `}
          role="group"
          aria-label={`Answer ${answerIndex + 1}, ${answerLength} characters${hasHint ? ', hint available' : ''}`}
          onClick={() => {
            if (!isCorrect && onFocus) {
              onFocus();
            }
          }}
        >
          {blocks}
        </div>
      )}
    </div>
  );
}
