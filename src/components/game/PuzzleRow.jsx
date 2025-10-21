'use client';
import { useRef, useEffect, useState } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useHoverAnimation, useTouchAnimation } from '@/hooks/useAnimation';

export default function PuzzleRow({
  emoji,
  value,
  onChange: _onChange,
  isCorrect,
  isWrong,
  index,
  onFocus,
  isFocused,
  readonly: _readonly = false,
  hasHint = false, // Whether this answer has a hint shown
  lockedLetters = null, // Object mapping position -> letter for locked (correct-position) letters
  answerLength = 0,
  isSmallPhone = false,
  isMobilePhone = false,
}) {
  const { selectionStart } = useHaptics();
  const { highContrast, reduceMotion } = useTheme();
  const getIconPath = useUIIcon();
  const { hoverHandlers } = useHoverAnimation();
  const { touchHandlers } = useTouchAnimation();
  const emojiRef = useRef(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const previousIsCorrect = useRef(isCorrect);
  const animationDelay = `${(index + 1) * 100}ms`;

  // Trigger celebration animation when answer becomes correct
  useEffect(() => {
    if (isCorrect && !previousIsCorrect.current && !reduceMotion) {
      setShowCelebration(true);
      // Trigger victory wiggle on emoji
      if (emojiRef.current) {
        emojiRef.current.classList.add('animate-victory-wiggle');
        setTimeout(() => {
          emojiRef.current?.classList.remove('animate-victory-wiggle');
        }, 400);
      }
      // Reset celebration after animation
      setTimeout(() => setShowCelebration(false), 600);
    }
    previousIsCorrect.current = isCorrect;
  }, [isCorrect, reduceMotion]);

  const handleClick = () => {
    if (!isCorrect && onFocus) {
      selectionStart();
      onFocus();
    }
  };

  // Generate visual representation with spaced underscores and green locked letters
  const getVisualDisplay = () => {
    if (answerLength === 0) return '';

    const currentValue = value;
    const chars = [];

    for (let i = 0; i < answerLength; i++) {
      const isLocked = lockedLetters && lockedLetters[i];

      if (currentValue && i < currentValue.length && currentValue[i] !== ' ') {
        const char = currentValue[i].toUpperCase();
        // Style locked letters in green
        if (isLocked) {
          chars.push(
            <span key={i} className="text-green-500 font-bold">
              {char}
            </span>
          );
        } else {
          chars.push(<span key={i}>{char}</span>);
        }
      } else {
        chars.push(<span key={i}>_</span>);
      }
    }

    // Add spacing between characters using React fragments
    const spacedChars = [];
    chars.forEach((char, idx) => {
      spacedChars.push(char);
      if (idx < chars.length - 1) {
        spacedChars.push(<span key={`space-${idx}`}> </span>);
      }
    });

    return spacedChars;
  };

  return (
    <div
      className={`flex ${
        isSmallPhone ? 'gap-1.5' : isMobilePhone ? 'gap-2' : 'gap-2 sm:gap-3'
      } items-center`}
      style={{ animationDelay }}
    >
      <div className="flex items-center gap-2">
        <div
          ref={emojiRef}
          {...hoverHandlers}
          {...touchHandlers}
          className={`${
            isSmallPhone
              ? 'w-[60px] h-[50px] px-1'
              : isMobilePhone
                ? 'w-[65px] h-[55px] px-1'
                : 'w-[70px] sm:w-[80px] h-[60px] sm:h-[70px] px-1 sm:px-2'
          } rounded-[18px] flex items-center justify-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all flex-shrink-0 cursor-pointer select-none ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-white dark:bg-gray-700 border-gray-800 dark:border-gray-500'
          } ${!reduceMotion ? 'hover:animate-hover-tilt active:animate-touch-squish' : ''} ${
            isCorrect && !reduceMotion ? 'animate-victory-wiggle' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            willChange: !reduceMotion && !isCorrect ? 'transform' : 'auto',
          }}
        >
          <span
            className={`${
              isSmallPhone ? 'text-xl' : isMobilePhone ? 'text-2xl' : 'text-2xl sm:text-3xl'
            } flex items-center justify-center gap-0 whitespace-nowrap`}
          >
            {emoji}
          </span>
        </div>
      </div>
      <div className="relative flex-1">
        {/* Visual display overlay - hide when answer is correct */}
        {!isCorrect && (
          <div
            className={`absolute inset-0 pointer-events-none flex items-center ${
              isSmallPhone ? 'px-2' : isMobilePhone ? 'px-2.5' : 'px-3 sm:px-4'
            } z-10`}
          >
            <span
              className={`
              ${isSmallPhone ? 'text-xs' : isMobilePhone ? 'text-sm' : 'text-sm sm:text-base'} font-medium uppercase tracking-[0.2em]
              ${
                isWrong
                  ? highContrast
                    ? 'text-hc-error'
                    : 'text-red-900 dark:text-red-400'
                  : highContrast
                    ? 'text-hc-text'
                    : 'text-dark-text dark:text-gray-200'
              }
            `}
            >
              {getVisualDisplay()}
            </span>
          </div>
        )}
        {/* Hidden input for focus management */}
        <input
          type="text"
          value={value}
          onChange={() => {}}
          onClick={handleClick}
          onFocus={handleClick}
          maxLength={answerLength || 15}
          disabled={isCorrect}
          readOnly={true}
          aria-label={`Answer ${index + 1}${hasHint ? ' (hint available)' : ''}`}
          className={`
            w-full ${isSmallPhone ? 'p-2' : isMobilePhone ? 'p-2.5' : 'p-3 sm:p-4'} rounded-2xl ${
              isSmallPhone ? 'text-xs' : isMobilePhone ? 'text-sm' : 'text-sm sm:text-base'
            } font-medium transition-all outline-none uppercase tracking-[0.15em] border-[3px]
            ${
              isCorrect
                ? highContrast
                  ? 'bg-hc-success text-white border-hc-success pattern-correct text-opacity-100'
                  : `bg-accent-green text-white border-black dark:border-accent-green shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(126,217,87,0.5)] text-opacity-100 ${
                      !reduceMotion && showCelebration ? 'animate-correct-celebration' : ''
                    }`
                : isWrong
                  ? highContrast
                    ? 'bg-hc-surface border-hc-error text-hc-error pattern-wrong border-double'
                    : `bg-accent-red/20 dark:bg-red-900/20 border-accent-red dark:border-accent-red text-red-900 dark:text-red-400 shadow-[3px_3px_0px_rgba(255,87,87,0.3)] ${
                        !reduceMotion ? 'animate-enhanced-shake' : ''
                      }`
                  : hasHint
                    ? highContrast
                      ? 'bg-hc-background border-hc-warning text-hc-text'
                      : 'bg-accent-yellow/20 dark:bg-yellow-900/20 text-dark-text dark:text-gray-200 border-accent-yellow dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] focus:border-accent-blue dark:focus:border-accent-blue'
                    : highContrast
                      ? 'bg-hc-background text-hc-text border-hc-border focus:border-hc-focus'
                      : 'bg-white dark:bg-gray-800 text-dark-text dark:text-gray-200 border-gray-800 dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.2)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.2)] focus:border-accent-blue dark:focus:border-accent-blue'
            }
            disabled:cursor-not-allowed
            ${isCorrect ? '' : 'caret-transparent'}
            ${isFocused && !isCorrect && !reduceMotion ? 'animate-focus-pulse' : isFocused && !isCorrect ? 'ring-2 ring-sky-500 dark:ring-sky-400' : ''}
            cursor-pointer
          `}
          style={{
            color: isCorrect ? undefined : 'transparent',
            textShadow: isCorrect ? undefined : 'none',
            WebkitTextFillColor: isCorrect ? undefined : 'transparent',
          }}
        />
        {hasHint && !isCorrect && (
          <span
            className={`absolute ${
              isSmallPhone ? 'right-2' : 'right-3'
            } top-1/2 -translate-y-1/2 z-10 pointer-events-none`}
            aria-label="Hint shown for this answer"
          >
            <img
              src={getIconPath('hint')}
              alt="Hint"
              className={`${isSmallPhone ? 'w-4 h-4' : 'w-5 h-5'}`}
            />
          </span>
        )}
      </div>
    </div>
  );
}
