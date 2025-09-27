'use client';
import { useHaptics } from '@/hooks/useHaptics';

export default function PuzzleRow({ emoji, value, onChange, isCorrect, isWrong, index, onEnterPress, hintData }) {
  const { selectionStart } = useHaptics();
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
    if (!hintData) return "Enter answer";
    
    // Create the hint pattern: first letter + underscores for remaining characters
    const blanks = Array(hintData.length - 1).fill('_').join(' ');
    return `${hintData.firstLetter} ${blanks}`;
  };

  return (
    <div
      className="flex gap-2 sm:gap-3 items-center"
      style={{ animationDelay }}
    >
      <div className="w-[70px] sm:w-[80px] h-[60px] sm:h-[70px] px-1 sm:px-2 bg-light-sand dark:bg-gray-700 rounded-[18px] flex items-center justify-center shadow-md transition-all hover:scale-105 hover:shadow-lg flex-shrink-0">
        <span className="text-2xl sm:text-3xl flex items-center justify-center gap-0 whitespace-nowrap">
          {emoji}
        </span>
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
            w-full p-3 sm:p-4 border-2 rounded-xl text-sm sm:text-base font-medium transition-all outline-none uppercase
            ${isCorrect
              ? 'bg-gradient-to-r from-teal-500 to-green-500 text-white border-teal-500 animate-link-snap'
              : isWrong
                ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-900 dark:text-red-400 animate-shake'
                : hintData
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-dark-text dark:text-gray-200 border-yellow-400 dark:border-yellow-600 focus:border-sky-500 dark:focus:border-sky-400 focus:shadow-md focus:shadow-sky-500/20'
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
                <span className="text-sm sm:text-base font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400" style={{ letterSpacing: '0.15em' }}>
                  {hintData.firstLetter}
                  {Array(hintData.length - 1).fill(null).map((_, i) => (
                    <span key={i} className="ml-1">_</span>
                  ))}
                </span>
              </div>
            )}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl">💡</span>
          </>
        )}
      </div>
    </div>
  );
}