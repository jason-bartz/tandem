'use client';

export default function StatsBar({ time, mistakes, solved }) {
  return (
    <div className="flex justify-around mb-6 p-4 bg-light-sand rounded-2xl">
      <div className="text-center">
        <div className="text-xl font-bold text-dark-text">{time}</div>
        <div className="text-xs text-gray-text mt-1">Time</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-dark-text">{mistakes}/4</div>
        <div className="text-xs text-gray-text mt-1">Mistakes</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-dark-text">{solved}/4</div>
        <div className="text-xs text-gray-text mt-1">Solved</div>
      </div>
    </div>
  );
}