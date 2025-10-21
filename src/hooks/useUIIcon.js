import { useTheme } from '@/contexts/ThemeContext';

/**
 * Hook to get theme-aware UI icon paths
 * @returns {Function} getIconPath - Function that returns the appropriate icon path based on current theme
 */
export function useUIIcon() {
  const { isDark } = useTheme();

  /**
   * Get the appropriate icon path based on the current theme
   * @param {string} iconName - The base name of the icon (without extension or -dark suffix)
   * @returns {string} The path to the icon
   *
   * @example
   * const getIconPath = useUIIcon();
   * const statsIcon = getIconPath('stats'); // Returns '/icons/ui/stats.png' or '/icons/ui/stats-dark.png'
   */
  const getIconPath = (iconName) => {
    const suffix = isDark ? '-dark' : '';
    return `/icons/ui/${iconName}${suffix}.png`;
  };

  return getIconPath;
}
