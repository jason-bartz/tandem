'use client';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHoverAnimation, useTouchAnimation } from '@/hooks/useAnimation';
import CharacterBlockGrid from './CharacterBlockGrid';

export default function PuzzleRow({
  emoji,
  value,
  onChange,
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
  onKeyboardInput = null, // Callback for keyboard events (ENTER)
  themeColor = '#3B82F6', // Theme color for active blocks
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { hoverHandlers } = useHoverAnimation();
  const { touchHandlers } = useTouchAnimation();
  const emojiRef = useRef(null);
  const previousIsCorrect = useRef(isCorrect);
  const animationDelay = `${(index + 1) * 100}ms`;

  // Trigger celebration animation when answer becomes correct
  useEffect(() => {
    if (isCorrect && !previousIsCorrect.current && !reduceMotion) {
      // Trigger victory wiggle on emoji
      if (emojiRef.current) {
        emojiRef.current.classList.add('animate-victory-wiggle');
        setTimeout(() => {
          emojiRef.current?.classList.remove('animate-victory-wiggle');
        }, 400);
      }
    }
    previousIsCorrect.current = isCorrect;
  }, [isCorrect, reduceMotion]);

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
              : 'bg-ghost-white dark:bg-gray-700 border-gray-800 dark:border-gray-500'
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
      <div className="flex-1 min-w-0">
        {/* Character Block Grid - replaces the old input field */}
        <CharacterBlockGrid
          value={value}
          onChange={onChange}
          answerLength={answerLength}
          answerIndex={index}
          isCorrect={isCorrect}
          isWrong={isWrong}
          lockedLetters={lockedLetters}
          isFocused={isFocused}
          onFocus={onFocus}
          onKeyboardInput={onKeyboardInput}
          hasHint={hasHint}
          themeColor={themeColor}
          isSmallPhone={isSmallPhone}
          isMobilePhone={isMobilePhone}
        />
      </div>
    </div>
  );
}
