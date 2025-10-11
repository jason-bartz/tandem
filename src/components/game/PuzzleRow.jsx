'use client';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';

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
  hintData,
  lockedLetters,
  answerLength = 0,
  isSmallPhone = false,
  isMobilePhone = false,
}) {
  const { selectionStart } = useHaptics();
  const { highContrast } = useTheme();
  const animationDelay = `${(index + 1) * 100}ms`;

  const handleClick = () => {
    if (!isCorrect && onFocus) {
      selectionStart();
      onFocus();
    }
  };

  // Generate visual representation with spaced underscores
  const getVisualDisplay = () => {
    if (answerLength === 0) return '';

    const currentValue = hintData && !value ? hintData.firstLetter : value;
    const chars = [];

    for (let i = 0; i < answerLength; i++) {
      if (currentValue && i < currentValue.length) {
        const char = currentValue[i].toUpperCase();
        // Check if this position is locked (correct letter in correct position)
        const isLocked = lockedLetters && lockedLetters[i];

        if (isLocked) {
          // Render locked letter in green with special styling
          chars.push(
            <span key={i} className="font-bold text-green-600 dark:text-green-400">
              {char}
            </span>
          );
        } else if (hintData && i === 0) {
          // First letter hint - yellow
          chars.push(
            <span key={i} className="font-semibold text-amber-600 dark:text-amber-400">
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
          className={`${
            isSmallPhone
              ? 'w-[60px] h-[50px] px-1'
              : isMobilePhone
                ? 'w-[65px] h-[55px] px-1'
                : 'w-[70px] sm:w-[80px] h-[60px] sm:h-[70px] px-1 sm:px-2'
          } rounded-[18px] flex items-center justify-center shadow-md transition-all hover:scale-105 hover:shadow-lg flex-shrink-0 ${
            highContrast
              ? 'bg-hc-surface border-2 border-hc-border'
              : 'bg-light-sand dark:bg-gray-700'
          }`}
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
            }`}
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
          value={hintData && !value ? hintData.firstLetter : value}
          onChange={() => {}}
          onClick={handleClick}
          onFocus={handleClick}
          maxLength={answerLength || 15}
          disabled={isCorrect}
          readOnly={true}
          aria-label={`Answer ${index + 1}`}
          className={`
            w-full ${isSmallPhone ? 'p-2' : isMobilePhone ? 'p-2.5' : 'p-3 sm:p-4'} rounded-xl ${
              isSmallPhone ? 'text-xs' : isMobilePhone ? 'text-sm' : 'text-sm sm:text-base'
            } font-medium transition-all outline-none uppercase tracking-[0.15em]
            ${highContrast ? 'border-4' : 'border-2'}
            ${
              isCorrect
                ? highContrast
                  ? 'bg-hc-success text-white border-hc-success pattern-correct text-opacity-100'
                  : 'bg-gradient-to-r from-teal-500 to-green-500 text-white border-teal-500 animate-link-snap text-opacity-100'
                : isWrong
                  ? highContrast
                    ? 'bg-hc-surface border-hc-error text-hc-error pattern-wrong border-double'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-900 dark:text-red-400 animate-shake'
                  : hintData
                    ? highContrast
                      ? 'bg-hc-background border-hc-warning text-hc-text'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-dark-text dark:text-gray-200 border-yellow-400 dark:border-yellow-600 focus:border-sky-500 dark:focus:border-sky-400 focus:shadow-md focus:shadow-sky-500/20'
                    : highContrast
                      ? 'bg-hc-background text-hc-text border-hc-border focus:border-hc-focus'
                      : 'bg-off-white dark:bg-gray-800 text-dark-text dark:text-gray-200 border-border-color dark:border-gray-600 focus:border-sky-500 dark:focus:border-sky-400 focus:shadow-md focus:shadow-sky-500/20'
            }
            disabled:cursor-not-allowed
            ${isCorrect ? '' : 'caret-transparent'}
            ${isFocused && !isCorrect ? 'ring-2 ring-sky-500 dark:ring-sky-400' : ''}
            cursor-pointer
          `}
          style={{
            color: isCorrect ? undefined : 'transparent',
            textShadow: isCorrect ? undefined : 'none',
            WebkitTextFillColor: isCorrect ? undefined : 'transparent',
          }}
        />
        {hintData && !isCorrect && (
          <span
            className={`absolute ${
              isSmallPhone ? 'right-2 text-base' : 'right-3 text-xl'
            } top-1/2 -translate-y-1/2 z-10`}
            aria-label="Hint active"
          >
            💡
          </span>
        )}
      </div>
    </div>
  );
}
