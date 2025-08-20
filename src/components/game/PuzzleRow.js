'use client';

export default function PuzzleRow({ emoji, value, onChange, isCorrect, index }) {
  const animationDelay = `${(index + 1) * 100}ms`;

  return (
    <div 
      className="flex gap-3 items-center opacity-0 animate-fadeInUp"
      style={{ animationDelay, animationFillMode: 'forwards' }}
    >
      <div className="w-[70px] h-[70px] bg-light-sand rounded-[18px] flex items-center justify-center text-3xl shadow-md transition-all hover:scale-105 hover:shadow-lg">
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
          bg-off-white dark:bg-light-sand text-dark-text
          ${isCorrect 
            ? 'bg-gradient-to-r from-sage to-green-400 text-white border-sage animate-link-snap' 
            : value && !isCorrect 
              ? 'bg-red-50 border-coral animate-shake' 
              : 'border-border-color focus:border-plum focus:shadow-md'
          }
          disabled:cursor-not-allowed
        `}
      />
    </div>
  );
}