'use client';
import { useEffect, useState } from 'react';
import { loadStats } from '@/lib/storage';

export default function StatsModal({ onClose }) {
  const [stats, setStats] = useState({
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0
  });

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
      <div className="bg-off-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full animate-modalSlide">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold text-dark-text">Statistics</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-light-sand text-gray-text text-lg cursor-pointer transition-all hover:bg-gray-text hover:text-white"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-light-sand p-4 rounded-xl text-center">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-plum to-peach bg-clip-text text-transparent">
              {stats.played}
            </div>
            <div className="text-xs text-gray-text mt-1 uppercase tracking-wide">Played</div>
          </div>
          <div className="bg-light-sand p-4 rounded-xl text-center">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-plum to-peach bg-clip-text text-transparent">
              {winRate}%
            </div>
            <div className="text-xs text-gray-text mt-1 uppercase tracking-wide">Win Rate</div>
          </div>
          <div className="bg-light-sand p-4 rounded-xl text-center">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-plum to-peach bg-clip-text text-transparent">
              {stats.currentStreak}
            </div>
            <div className="text-xs text-gray-text mt-1 uppercase tracking-wide">Current Streak</div>
          </div>
          <div className="bg-light-sand p-4 rounded-xl text-center">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-plum to-peach bg-clip-text text-transparent">
              {stats.bestStreak}
            </div>
            <div className="text-xs text-gray-text mt-1 uppercase tracking-wide">Best Streak</div>
          </div>
        </div>
        
        <div className="bg-light-sand p-4 rounded-xl text-center">
          <div className="text-3xl font-extrabold bg-gradient-to-r from-plum to-peach bg-clip-text text-transparent">
            {stats.wins}
          </div>
          <div className="text-xs text-gray-text mt-1 uppercase tracking-wide">Total Wins</div>
        </div>
      </div>
    </div>
  );
}