'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatCard - Reusable stat card component
 * Used in unified stats modal for both games
 * Simple text display without colored boxes
 *
 * @param {string} value - The stat value to display
 * @param {string} label - The stat label (e.g., "Played", "Streak")
 * @param {string} emoji - Optional emoji to display with value
 * @param {boolean} animate - Whether to animate the count-up
 */
export default function StatCard({ value, label, emoji = '', animate = true }) {
  const { highContrast, reduceMotion } = useTheme();

  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold mb-1">
        <span
          className={`${
            highContrast ? 'text-hc-primary' : 'text-white'
          } ${animate && !reduceMotion ? 'animate-count-up' : ''}`}
        >
          {value}
        </span>
        {emoji && <span className="ml-1 text-2xl">{emoji}</span>}
      </div>
      <div
        className={`text-xs uppercase tracking-wide font-medium ${
          highContrast ? 'text-hc-text' : 'text-white/90'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
