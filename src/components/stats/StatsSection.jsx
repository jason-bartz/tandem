'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * StatsSection - Wrapper for game-specific stats sections
 * Flat design: neutral card with a colored left accent border
 *
 * @param {string} title - Section title (e.g., "Daily Tandem", "Reel Connections")
 * @param {string} emoji - Emoji to display before title
 * @param {string} icon - Path to icon image
 * @param {string} themeColor - Theme color ('blue' for Tandem, 'yellow' for Mini, 'red' for Reel, 'purple' for Cryptic)
 * @param {React.ReactNode} children - Stat cards to display
 */
export default function StatsSection({ title, emoji, icon, themeColor, children }) {
  const { highContrast } = useTheme();

  // Left accent border color per game
  const getAccentBorder = () => {
    if (highContrast) return 'border-l-hc-border';
    if (themeColor === 'blue') return 'border-l-sky-500';
    if (themeColor === 'purple') return 'border-l-purple-600';
    if (themeColor === 'yellow') return 'border-l-yellow-500';
    if (themeColor === 'red') return 'border-l-red-500';
    if (themeColor === 'green') return 'border-l-soup-primary';
    return 'border-l-gray-300';
  };

  // Title text color per game
  const getTitleColor = () => {
    if (highContrast) return 'text-hc-text';
    if (themeColor === 'blue') return 'text-sky-600 dark:text-sky-400';
    if (themeColor === 'purple') return 'text-purple-600 dark:text-purple-400';
    if (themeColor === 'yellow') return 'text-yellow-600 dark:text-yellow-400';
    if (themeColor === 'red') return 'text-red-600 dark:text-red-400';
    if (themeColor === 'green') return 'text-soup-primary dark:text-green-400';
    return 'text-gray-800 dark:text-gray-200';
  };

  return (
    <div
      className={`rounded-lg overflow-hidden mb-4 border-l-4 border ${getAccentBorder()} ${
        highContrast
          ? 'bg-hc-surface border-hc-border'
          : 'bg-bg-card dark:bg-gray-800 border-border-main dark:border-gray-700'
      }`}
    >
      {/* Section Header - hidden when title is null (standalone) */}
      {title && (
        <div className="px-4 py-3">
          <h3 className={`text-lg font-bold flex items-center ${getTitleColor()}`}>
            {icon ? (
              <Image src={icon} alt="" width={24} height={24} className="mr-2" />
            ) : emoji ? (
              <span className="mr-2">{emoji}</span>
            ) : null}
            {title}
          </h3>
        </div>
      )}

      {/* Section Content */}
      <div className={`px-4 pb-4 ${!title ? 'pt-4' : ''}`}>{children}</div>
    </div>
  );
}
