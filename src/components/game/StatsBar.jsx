'use client';

export default function StatsBar({ time, mistakes, solved }) {
  return (
    <div className="flex justify-around mb-6 p-4 bg-light-sand dark:bg-gray-800 rounded-2xl score-display">
      <div className="text-center">
        <div className="text-xl font-bold text-dark-text dark:text-gray-200">{time}</div>
        <div className="text-xs text-gray-text dark:text-gray-400 mt-1">Time</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-dark-text dark:text-gray-200">{mistakes}/4</div>
        <div className="text-xs text-gray-text dark:text-gray-400 mt-1">Mistakes</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-dark-text dark:text-gray-200">{solved}/4</div>
        <div className="text-xs text-gray-text dark:text-gray-400 mt-1">Solved</div>
      </div>
    </div>
  );
}
