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
            ? 'bg-gradient-to-r from-sage to-sage-light text-white border-sage animate-link-snap' 
            : value && !isCorrect 
              ? 'bg-coral-light/20 dark:bg-coral-dark/20 border-coral dark:border-coral-dark text-dark-text dark:text-coral-light animate-shake' 
              : 'bg-off-white dark:bg-gray-800 text-dark-text dark:text-gray-200 border-border-color dark:border-gray-600 focus:border-plum dark:focus:border-plum-light focus:shadow-md focus:shadow-plum/20'
          }
          disabled:cursor-not-allowed
        `}
      />
    </div>
  );
}