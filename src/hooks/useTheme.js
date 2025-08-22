import { useState, useEffect } from 'react';
import { STORAGE_KEYS, THEME_CONFIG } from '@/lib/constants';

export function useTheme() {
  const [theme, setTheme] = useState(THEME_CONFIG.DEFAULT);

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.DEFAULT;
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    // Add or remove dark class for Tailwind CSS
    if (savedTheme === THEME_CONFIG.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === THEME_CONFIG.DARK ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK;
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    // Add or remove dark class for Tailwind CSS
    if (newTheme === THEME_CONFIG.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setThemeMode = (mode) => {
    if (mode === THEME_CONFIG.LIGHT || mode === THEME_CONFIG.DARK) {
      setTheme(mode);
      document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem(STORAGE_KEYS.THEME, mode);
      // Add or remove dark class for Tailwind CSS
      if (mode === THEME_CONFIG.DARK) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return {
    theme,
    toggleTheme,
    setThemeMode,
    isDark: theme === THEME_CONFIG.DARK
  };
}