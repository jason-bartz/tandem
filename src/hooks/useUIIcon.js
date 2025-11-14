/**
 * Hook to get UI icon paths
 * @returns {Function} getIconPath - Function that returns the icon path
 */
export function useUIIcon() {
  /**
   * Get the icon path
   * @param {string} iconName - The base name of the icon (without extension)
   * @returns {string} The path to the icon
   *
   * @example
   * const getIconPath = useUIIcon();
   * const statsIcon = getIconPath('stats'); // Returns '/icons/ui/stats.png'
   */
  const getIconPath = (iconName) => {
    return `/icons/ui/${iconName}.png`;
  };

  return getIconPath;
}
