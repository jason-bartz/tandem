'use client';
import { useHaptics } from '@/hooks/useHaptics';

export default function ThemeToggle({ theme, toggleTheme }) {
  const { lightTap } = useHaptics();

  const getIcon = () => {
    return theme === 'dark' ? '☀️' : '🌙';
  };

  const getTitle = () => {
    return theme === 'dark' ? 'Click to switch to Light Mode' : 'Click to switch to Dark Mode';
  };

  return (
    <button
      onClick={() => {
        lightTap();
        toggleTheme();
      }}
      className="w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center text-xl hover:scale-110 transition-all bg-ghost-white/80 dark:bg-gray-800/80"
      title={getTitle()}
    >
      <span>{getIcon()}</span>
    </button>
  );
}
