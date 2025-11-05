'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatCard - Reusable stat card component
 * Used in unified stats modal for both games
 *
 * @param {string} value - The stat value to display
 * @param {string} label - The stat label (e.g., "Played", "Streak")
 * @param {string} color - Color theme (blue, green, yellow, pink, orange, purple)
 * @param {string} emoji - Optional emoji to display with value
 * @param {boolean} animate - Whether to animate the count-up
 */
export default function StatCard({ value, label, color = 'blue', emoji = '', animate = true }) {
  const { highContrast, reduceMotion } = useTheme();

  const colorClasses = {
    blue: {
      bg: 'bg-accent-blue dark:bg-sky-600',
      border: 'border-accent-blue dark:border-sky-600',
      text: 'text-white dark:text-white',
      shadow: 'shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
    },
    green: {
      bg: 'bg-accent-green dark:bg-green-600',
      border: 'border-accent-green dark:border-green-600',
      text: 'text-white dark:text-white',
      shadow: 'shadow-[3px_3px_0px_rgba(126,217,87,0.3)]',
    },
    yellow: {
      bg: 'bg-accent-yellow dark:bg-yellow-600',
      border: 'border-accent-yellow dark:border-yellow-600',
      text: 'text-gray-800 dark:text-white',
      shadow: 'shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
    },
    pink: {
      bg: 'bg-accent-pink dark:bg-pink-600',
      border: 'border-accent-pink dark:border-pink-600',
      text: 'text-white dark:text-white',
      shadow: 'shadow-[3px_3px_0px_rgba(255,102,196,0.3)]',
    },
    orange: {
      bg: 'bg-accent-orange dark:bg-orange-600',
      border: 'border-accent-orange dark:border-orange-600',
      text: 'text-white dark:text-white',
      shadow: 'shadow-[3px_3px_0px_rgba(255,117,31,0.3)]',
    },
    purple: {
      bg: 'bg-purple-600 dark:bg-purple-700',
      border: 'border-purple-600 dark:border-purple-700',
      text: 'text-white dark:text-white',
      shadow: 'shadow-[3px_3px_0px_rgba(147,51,234,0.3)]',
    },
  };

  const selectedColor = colorClasses[color] || colorClasses.blue;

  return (
    <div
      className={`p-4 rounded-2xl text-center border-[3px] ${
        highContrast
          ? 'bg-hc-surface border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
          : `${selectedColor.bg} ${selectedColor.border} ${selectedColor.shadow}`
      }`}
    >
      <div className="text-3xl font-extrabold">
        <span
          className={`${
            highContrast ? 'text-hc-primary' : selectedColor.text
          } ${animate && !reduceMotion ? 'animate-count-up' : ''}`}
        >
          {value}
        </span>
        {emoji && <span className="ml-1 text-3xl">{emoji}</span>}
      </div>
      <div
        className={`text-xs mt-1 uppercase tracking-wide ${
          highContrast ? 'text-hc-text' : 'text-white/90 dark:text-white/90'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
