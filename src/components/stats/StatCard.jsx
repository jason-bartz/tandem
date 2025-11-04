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
      bg: 'bg-accent-blue/20 dark:bg-sky-900/40',
      border: 'border-accent-blue',
      text: 'text-accent-blue dark:text-accent-blue',
      shadow: 'shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
    },
    green: {
      bg: 'bg-accent-green/20 dark:bg-green-900/40',
      border: 'border-accent-green',
      text: 'text-accent-green dark:text-accent-green',
      shadow: 'shadow-[3px_3px_0px_rgba(126,217,87,0.3)]',
    },
    yellow: {
      bg: 'bg-accent-yellow/20 dark:bg-yellow-900/40',
      border: 'border-accent-yellow',
      text: 'text-accent-yellow dark:text-accent-yellow',
      shadow: 'shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
    },
    pink: {
      bg: 'bg-accent-pink/20 dark:bg-pink-900/40',
      border: 'border-accent-pink',
      text: 'text-accent-pink dark:text-accent-pink',
      shadow: 'shadow-[3px_3px_0px_rgba(255,102,196,0.3)]',
    },
    orange: {
      bg: 'bg-accent-orange/20 dark:bg-orange-900/40',
      border: 'border-accent-orange',
      text: 'text-accent-orange dark:text-accent-orange',
      shadow: 'shadow-[3px_3px_0px_rgba(255,117,31,0.3)]',
    },
    purple: {
      bg: 'bg-purple-100/50 dark:bg-purple-900/40',
      border: 'border-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
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
          highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
