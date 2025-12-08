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

  // Determine font size based on value length to prevent overflow
  // More aggressive scaling to fit in narrow 4-column grid
  const valueStr = String(value);
  const valueLength = valueStr.length;
  const fontSizeClass =
    valueLength >= 6
      ? 'text-base'
      : valueLength >= 5
        ? 'text-lg'
        : valueLength >= 4
          ? 'text-xl'
          : valueLength >= 3
            ? 'text-2xl'
            : 'text-3xl';

  return (
    <div className="text-center overflow-hidden min-w-0">
      <div className={`${fontSizeClass} font-extrabold mb-1 whitespace-nowrap`}>
        <span
          className={`${
            highContrast ? 'text-hc-primary' : 'text-white'
          } ${animate && !reduceMotion ? 'animate-count-up' : ''}`}
        >
          {value}
        </span>
        {emoji && <span className="ml-1 text-lg">{emoji}</span>}
      </div>
      <div
        className={`text-xs tracking-wide font-medium ${
          highContrast ? 'text-hc-text' : 'text-white/90'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
