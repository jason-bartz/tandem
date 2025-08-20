'use client';

export default function PuzzleRow({ emoji, value, onChange, isCorrect, index }) {
  const animationDelay = `${(index + 1) * 100}ms`;

  return (
    <div 
      className="flex gap-3 items-center opacity-0 animate-fadeInUp"
      style={{ animationDelay, animationFillMode: 'forwards' }}
    >
      <div className="w-[70px] h-[70px] bg-light-sand dark:bg-gray-700 rounded-[18px] flex items-center justify-center text-3xl shadow-md transition-all hover:scale-105 hover:shadow-lg">
        {emoji}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter answer"
        maxLength={10}
        disabled={isCorrect}
        className={`
          flex-1 p-4 border-2 rounded-xl text-base font-medium transition-all outline-none uppercase
          ${isCorrect 
            ? 'bg-gradient-to-r from-sage to-green-400 text-white border-sage animate-link-snap' 
            : value && !isCorrect 
              ? 'bg-red-50 dark:bg-red-900/20 border-coral dark:border-red-400 text-dark-text dark:text-red-200 animate-shake' 
              : 'bg-off-white dark:bg-gray-800 text-dark-text dark:text-gray-200 border-border-color dark:border-gray-600 focus:border-plum dark:focus:border-plum focus:shadow-md'
          }
          disabled:cursor-not-allowed
        `}
      />
    </div>
  );
}