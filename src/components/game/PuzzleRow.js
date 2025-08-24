'use client';

export default function PuzzleRow({ emoji, value, onChange, isCorrect, isWrong, index, onEnterPress }) {
  const animationDelay = `${(index + 1) * 100}ms`;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onEnterPress) {
      e.preventDefault();
      onEnterPress();
    }
  };

  return (
    <div 
      className="flex gap-3 items-center"
      style={{ animationDelay }}
    >
      <div className="min-w-[80px] h-[70px] px-2 bg-light-sand dark:bg-gray-700 rounded-[18px] flex items-center justify-center shadow-md transition-all hover:scale-105 hover:shadow-lg">
        <span className="text-2xl sm:text-3xl flex items-center justify-center gap-0 whitespace-nowrap shrink-0">
          {emoji}
        </span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter answer"
        maxLength={15}
        disabled={isCorrect}
        className={`
          flex-1 p-4 border-2 rounded-xl text-base font-medium transition-all outline-none uppercase
          ${isCorrect 
            ? 'bg-gradient-to-r from-teal-500 to-green-500 text-white border-teal-500 animate-link-snap' 
            : isWrong 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-900 dark:text-red-400 animate-shake' 
              : 'bg-off-white dark:bg-gray-800 text-dark-text dark:text-gray-200 border-border-color dark:border-gray-600 focus:border-sky-500 dark:focus:border-sky-400 focus:shadow-md focus:shadow-sky-500/20'
          }
          disabled:cursor-not-allowed
        `}
      />
    </div>
  );
}