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
 * @param {string} themeColor - Theme color ('blue' for Tandem, 'purple' for Cryptic)
 * @param {React.ReactNode} children - Stat cards to display
 */
export default function StatsSection({ title, emoji, icon, iconDark, themeColor, children }) {
  const { theme, highContrast } = useTheme();

  // Define theme-specific colors for header
  const getHeaderColors = () => {
    if (highContrast) {
      return 'bg-hc-primary border-hc-border';
    }

    if (themeColor === 'blue') {
      return 'bg-sky-500 dark:bg-sky-600 border-sky-600 dark:border-sky-700';
    } else if (themeColor === 'purple') {
      return 'bg-purple-600 dark:bg-purple-700 border-purple-700 dark:border-purple-800';
    }

    // Default fallback (no theme color)
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const getTextColor = () => {
    if (highContrast) {
      return 'text-white';
    }

    if (themeColor === 'blue' || themeColor === 'purple') {
      return 'text-white';
    }

    // Default fallback
    return 'text-gray-800 dark:text-gray-200';
  };

  // Define theme-specific background colors (entire section body)
  const getBackgroundColors = () => {
    if (highContrast) {
      return 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]';
    }

    if (themeColor === 'blue') {
      return 'bg-sky-100 dark:bg-sky-900 border-sky-200 dark:border-sky-800 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]';
    } else if (themeColor === 'purple') {
      return 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]';
    }

    // Default fallback
    return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]';
  };

  return (
    <div className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${getBackgroundColors()}`}>
      {/* Section Header */}
      <div className={`px-4 py-3 border-b-[3px] ${getHeaderColors()}`}>
        <h3 className={`text-lg font-bold flex items-center ${getTextColor()}`}>
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
