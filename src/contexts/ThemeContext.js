'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS, THEME_CONFIG, THEME_MODE } from '@/lib/constants';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(THEME_CONFIG.LIGHT);
  const [highContrast, setHighContrast] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.LIGHT;
    const savedHighContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true';

    setTheme(savedTheme);
    setHighContrast(savedHighContrast);

    // Apply to DOM
    applyThemeToDOM(savedTheme, savedHighContrast);
    setMounted(true);
  }, []);

  const applyThemeToDOM = (themeValue, highContrastValue) => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', themeValue);

    // Apply dark class
    if (themeValue === THEME_CONFIG.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply high contrast class
    if (highContrastValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Update iOS StatusBar
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: themeValue === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT',
      });
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === THEME_CONFIG.DARK ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK;
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, THEME_MODE.MANUAL);
    applyThemeToDOM(newTheme, highContrast);
  };

  const toggleHighContrast = () => {
    const newHighContrast = !highContrast;
    setHighContrast(newHighContrast);
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, newHighContrast.toString());
    applyThemeToDOM(theme, newHighContrast);
  };

  const value = {
    theme,
    highContrast,
    toggleTheme,
    toggleHighContrast,
    isDark: theme === THEME_CONFIG.DARK,
    mounted,
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
