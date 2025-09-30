'use client';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';

export default function PuzzleRow({
  emoji,
  value,
  onChange,
  isCorrect,
  isWrong,
  index,
  onEnterPress,
  hintData,
  answerLength = 0,
}) {
  const { selectionStart } = useHaptics();
  const { highContrast } = useTheme();
  const animationDelay = `${(index + 1) * 100}ms`;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onEnterPress) {
      e.preventDefault();
      onEnterPress();
    }

    // Prevent deleting the hint letter with backspace
    if (hintData && e.key === 'Backspace') {
      const currentValue = e.target.value;
      const hintLetter = hintData.firstLetter;

      // If only the hint letter remains or trying to delete it, prevent default
      if (currentValue.toUpperCase() === hintLetter || currentValue.length <= 1) {
        e.preventDefault();
        // Set the value to just the hint letter
        onChange(hintLetter);
      }
    }
  };

  // Generate hint placeholder text
  const getHintPlaceholder = () => {
    if (!hintData) {
      return 'Enter answer';
    }

    // Create the hint pattern with two revealed letters
    const pattern = [];
    for (let i = 0; i < hintData.length; i++) {
      if (i === 0) {
        pattern.push(hintData.firstLetter);
      } else if (i === hintData.secondLetterPosition) {
        pattern.push(hintData.secondLetter);
      } else {
        pattern.push('_');
      }
    }
    return pattern.join(' ');
  };

  return (
    <div className="flex gap-2 sm:gap-3 items-center" style={{ animationDelay }}>
      <div className="flex items-center gap-2">
        <div
          className={`w-[70px] sm:w-[80px] h-[60px] sm:h-[70px] px-1 sm:px-2 rounded-[18px] flex items-center justify-center shadow-md transition-all hover:scale-105 hover:shadow-lg flex-shrink-0 ${
            highContrast
              ? 'bg-hc-surface border-2 border-hc-border'
              : 'bg-light-sand dark:bg-gray-700'
          }`}
        >
          <span className="text-2xl sm:text-3xl flex items-center justify-center gap-0 whitespace-nowrap">
            {emoji}
          </span>
        </div>
        {answerLength > 0 && (
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
            [{answerLength} letters]
          </div>
        )}
      </div>
      <div className="relative flex-1">
        <input
          type="text"
          value={hintData && !value ? hintData.firstLetter : value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => selectionStart()}
          placeholder={getHintPlaceholder()}
          maxLength={15}
          disabled={isCorrect}
          className={`
            w-full p-3 sm:p-4 rounded-xl text-sm sm:text-base font-medium transition-all outline-none uppercase
            ${highContrast ? 'border-4' : 'border-2'}
            ${
              isCorrect
                ? highContrast
                  ? 'bg-hc-success text-white border-hc-success pattern-correct'
                  : 'bg-gradient-to-r from-teal-500 to-green-500 text-white border-teal-500 animate-link-snap'
                : isWrong
                  ? highContrast
                    ? 'bg-hc-surface border-hc-error text-hc-error pattern-wrong border-double'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-900 dark:text-red-400 animate-shake'
                  : hintData
                    ? highContrast
                      ? 'bg-hc-surface border-hc-warning text-hc-text pattern-hint'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-dark-text dark:text-gray-200 border-yellow-400 dark:border-yellow-600 focus:border-sky-500 dark:focus:border-sky-400 focus:shadow-md focus:shadow-sky-500/20'
                    : highContrast
                      ? 'bg-hc-background text-hc-text border-hc-border focus:border-hc-focus'
                      : 'bg-off-white dark:bg-gray-800 text-dark-text dark:text-gray-200 border-border-color dark:border-gray-600 focus:border-sky-500 dark:focus:border-sky-400 focus:shadow-md focus:shadow-sky-500/20'
            }
            disabled:cursor-not-allowed
            ${hintData && (!value || value.toUpperCase() === hintData.firstLetter) ? 'text-transparent' : ''}
            ${hintData ? 'placeholder:text-gray-700 dark:placeholder:text-gray-300 placeholder:font-semibold placeholder:tracking-wider' : ''}
          `}
        />
        {hintData && !isCorrect && (
          <>
            {/* Show hint pattern only when input shows just the first letter or less */}
            {(!value || value.toUpperCase() === hintData.firstLetter) && (
              <div className="absolute inset-0 pointer-events-none flex items-center px-3 sm:px-4">
                <span
                  className={`text-sm sm:text-base font-medium uppercase tracking-wider ${highContrast ? 'text-hc-text font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                  style={{ letterSpacing: '0.15em' }}
                >
                  {(() => {
                    const pattern = [];
                    for (let i = 0; i < hintData.length; i++) {
                      if (i === 0) {
                        pattern.push(<span key={i}>{hintData.firstLetter}</span>);
                      } else if (i === hintData.secondLetterPosition) {
                        pattern.push(
                          <span key={i} className="ml-1">
                            {hintData.secondLetter}
                          </span>
                        );
                      } else {
                        pattern.push(
                          <span key={i} className="ml-1">
                            _
                          </span>
                        );
                      }
                    }
                    return pattern;
                  })()}
                </span>
              </div>
            )}
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xl"
              aria-label="Hint active"
            >
              💡
            </span>
          </>
        )}
      </div>
    </div>
  );
}
