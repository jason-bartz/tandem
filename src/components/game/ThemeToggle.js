'use client';
import { useHaptics } from '@/hooks/useHaptics';

export default function ThemeToggle({ theme, toggleTheme, isAuto, currentState }) {
  const { lightTap } = useHaptics();
  const getIcon = () => {
    if (isAuto) {
      return '🔄';
    }
    return theme === 'dark' ? '☀️' : '🌙';
  };

  const getTitle = () => {
    if (isAuto) {
      const currentTheme = currentState.includes('dark') ? 'Dark' : 'Light';
      return `Auto Mode (${currentTheme}) - Click to switch to Light Mode`;
    }
    return theme === 'dark'
      ? 'Dark Mode - Click to switch to Auto Mode'
      : 'Light Mode - Click to switch to Dark Mode';
  };

  const getButtonStyle = () => {
    const baseStyle = "w-12 h-12 rounded-full backdrop-blur-sm shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-all relative";

    if (isAuto) {
      return `${baseStyle} bg-gradient-to-br from-blue-400/80 to-purple-500/80 dark:from-blue-600/80 dark:to-purple-700/80`;
    }

    return `${baseStyle} bg-white/80 dark:bg-gray-800/80`;
  };

  return (
    <button
      onClick={() => {
        lightTap();
        toggleTheme();
      }}
      className={getButtonStyle()}
      title={getTitle()}
    >
      <span className={isAuto ? "animate-pulse" : ""}>
        {getIcon()}
      </span>
      {isAuto && (
        <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" />
      )}
    </button>
  );
}