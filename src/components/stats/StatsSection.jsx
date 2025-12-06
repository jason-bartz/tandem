'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatsSection - Wrapper for game-specific stats sections
 * Provides consistent styling and layout with solid color background
 *
 * @param {string} title - Section title (e.g., "Daily Tandem", "Reel Connections")
 * @param {string} emoji - Emoji to display before title
 * @param {string} icon - Path to icon image
 * @param {string} themeColor - Theme color ('blue' for Tandem, 'yellow' for Mini, 'red' for Reel, 'purple' for Cryptic)
 * @param {React.ReactNode} children - Stat cards to display
 */
export default function StatsSection({ title, emoji, icon, themeColor, children }) {
  const { highContrast } = useTheme();

  // Define theme-specific colors for entire section (solid color)
  const getBackgroundColors = () => {
    if (highContrast) {
      return 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]';
    }

    if (themeColor === 'blue') {
      return 'bg-sky-500 dark:bg-sky-600 border-black shadow-[4px_4px_0px_#000]';
    } else if (themeColor === 'purple') {
      return 'bg-purple-600 dark:bg-purple-700 border-black shadow-[4px_4px_0px_#000]';
    } else if (themeColor === 'yellow') {
      return 'bg-yellow-500 dark:bg-yellow-600 border-black shadow-[4px_4px_0px_#000]';
    } else if (themeColor === 'red') {
      return 'bg-red-500 dark:bg-red-600 border-black shadow-[4px_4px_0px_#000]';
    }

    // Default fallback
    return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]';
  };

  const getTextColor = () => {
    if (highContrast) {
      return 'text-hc-text';
    }

    if (themeColor === 'blue' || themeColor === 'purple' || themeColor === 'red') {
      return 'text-white';
    } else if (themeColor === 'yellow') {
      return 'text-gray-900 dark:text-gray-900';
    }

    // Default fallback
    return 'text-gray-800 dark:text-gray-200';
  };

  return (
    <div className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${getBackgroundColors()}`}>
      {/* Section Header */}
      <div className={`px-4 py-3`}>
        <h3 className={`text-lg font-bold flex items-center ${getTextColor()}`}>
          {icon ? (
            <Image src={icon} alt="" width={24} height={24} className="mr-2" />
          ) : emoji ? (
            <span className="mr-2">{emoji}</span>
          ) : null}
          {title}
        </h3>
      </div>

      {/* Section Content */}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
