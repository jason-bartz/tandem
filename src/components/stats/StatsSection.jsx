'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatsSection - Wrapper for game-specific stats sections
 * Provides consistent styling and layout
 *
 * @param {string} title - Section title (e.g., "Tandem Daily", "Daily Cryptic")
 * @param {string} emoji - Emoji to display before title
 * @param {string} icon - Path to icon image
 * @param {string} iconDark - Path to dark mode icon image
 * @param {React.ReactNode} children - Stat cards to display
 */
export default function StatsSection({ title, emoji, icon, iconDark, children }) {
  const { theme, highContrast } = useTheme();

  return (
    <div
      className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${
        highContrast
          ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]'
      }`}
    >
      {/* Section Header */}
      <div
        className={`px-4 py-3 border-b-[3px] ${
          highContrast
            ? 'bg-hc-primary border-hc-border'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
      >
        <h3
          className={`text-lg font-bold flex items-center ${
            highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {icon && iconDark ? (
            <Image
              src={theme === 'dark' ? iconDark : icon}
              alt=""
              width={24}
              height={24}
              className="mr-2"
            />
          ) : emoji ? (
            <span className="mr-2">{emoji}</span>
          ) : null}
          {title}
        </h3>
      </div>

      {/* Section Content */}
      <div className="p-4">{children}</div>
    </div>
  );
}
