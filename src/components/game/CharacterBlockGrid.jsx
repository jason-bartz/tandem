'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import CharacterBlock from './CharacterBlock';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    if (isFocused && !isCorrect && !wasFocused.current) {
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

      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }

    wasFocused.current = isFocused;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, answerLength, lockedLetters, isCorrect]);

  useEffect(() => {
    if (!isFocused || isCorrect) return;

    const paddedValue = (value || '').padEnd(answerLength, ' ');
    let lastFilledIndex = -1;

    for (let i = 0; i < answerLength; i++) {
      const isLocked = lockedLetters && lockedLetters[i];
      const hasValue = paddedValue[i] && paddedValue[i] !== ' ';
      if (!isLocked && hasValue) {
        lastFilledIndex = i;
      }
    }

    let newActiveIndex = lastFilledIndex + 1;

    if (newActiveIndex >= answerLength) {
      newActiveIndex = answerLength - 1;
    }

    while (newActiveIndex < answerLength && lockedLetters && lockedLetters[newActiveIndex]) {
      newActiveIndex++;
    }

    if (newActiveIndex < answerLength && newActiveIndex !== activeBlockIndex) {
      setActiveBlockIndex(newActiveIndex);
    }
  }, [value, isFocused, isCorrect, answerLength, lockedLetters, activeBlockIndex]);

  useEffect(() => {
    if (
      isFocused &&
      !isCorrect &&
      answerLength > 8 &&
      activeBlockRef.current &&
      scrollContainerRef.current
    ) {
      activeBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeBlockIndex, isFocused, isCorrect, answerLength]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || answerLength <= 8) return;

    const handleScroll = () => {
      setShowScrollIndicator(false);
    };

    container.addEventListener('scroll', handleScroll, { once: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [answerLength]);

  const findNextAvailableBlock = useCallback(
    (currentIndex, direction = 1) => {
      let nextIndex = currentIndex + direction;

      if (nextIndex < 0) return 0;
      if (nextIndex >= answerLength) return answerLength - 1;

      while (
        nextIndex >= 0 &&
        nextIndex < answerLength &&
        lockedLetters &&
        lockedLetters[nextIndex]
      ) {
        nextIndex += direction;
      }

      if (nextIndex < 0) return currentIndex;
      if (nextIndex >= answerLength) return currentIndex;

      return nextIndex;
    },
    [answerLength, lockedLetters]
  );

  const handleBlockFocus = useCallback(
    (blockIndex) => {
      if (isCorrect) return;

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

  const handleKeyDown = useCallback(
    (e) => {
      if (isCorrect) return;

      const key = e.key;

      if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();

        if (lockedLetters && lockedLetters[activeBlockIndex]) {
          return;
        }

        const currentValue = value || '';
        // Pad value to answer length if needed
        const paddedValue = currentValue.padEnd(answerLength, ' ');
        // Replace character at position
        const chars = paddedValue.split('');
        chars[activeBlockIndex] = key.toUpperCase();
        const newValue = chars.join('');

        onChange(answerIndex, newValue);

        if (activeBlockIndex < answerLength - 1) {
          const nextIndex = findNextAvailableBlock(activeBlockIndex, 1);
          if (nextIndex > activeBlockIndex) {
            setActiveBlockIndex(nextIndex);
          }
        }
      } else if (key === 'Backspace') {
        e.preventDefault();

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

          const isPrevLocked = lockedLetters && lockedLetters[prevIndex];
          if (!isPrevLocked && paddedValue[prevIndex] && paddedValue[prevIndex] !== ' ') {
            const chars = paddedValue.split('');
            chars[prevIndex] = ' ';
            const newValue = chars.join('');
            onChange(answerIndex, newValue);
          }
        }
      } else if (key === 'ArrowLeft') {
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
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        if (onKeyboardInput) {
          onKeyboardInput('ARROW_UP');
        }
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        if (onKeyboardInput) {
          onKeyboardInput('ARROW_DOWN');
        }
      } else if (key === 'Enter') {
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

  const handleInputChange = (e) => {
    // Mobile keyboards might use this
    const inputValue = e.target.value;
    if (inputValue && inputValue.length > 0) {
      const lastChar = inputValue[inputValue.length - 1];
      if (/^[a-zA-Z]$/.test(lastChar)) {
        if (lockedLetters && lockedLetters[activeBlockIndex]) {
          return;
        }

        const currentValue = value || '';
        // Pad value to answer length if needed
        const paddedValue = currentValue.padEnd(answerLength, ' ');
        // Replace character at position
        const chars = paddedValue.split('');
        chars[activeBlockIndex] = lastChar.toUpperCase();
        const newValue = chars.join('');

        onChange(answerIndex, newValue);

        if (activeBlockIndex < answerLength - 1) {
          const nextIndex = findNextAvailableBlock(activeBlockIndex, 1);
          if (nextIndex > activeBlockIndex) {
            setActiveBlockIndex(nextIndex);
          }
        }
      }

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
  const needsScroll = answerLength > 8;

  // Debug logging
  useEffect(() => {
    if (answerLength > 8) {
    }
  }, [answerLength, isMobilePhone, isSmallPhone, needsScroll, answerIndex]);

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
        <div className="relative max-w-full">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scroll-smooth snap-x snap-proximity hide-scrollbar max-w-full"
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
        // Normal non-scrollable grid for short words (8 characters or less)
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
