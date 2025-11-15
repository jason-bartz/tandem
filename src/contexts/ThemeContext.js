'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, THEME_CONFIG } from '@/lib/constants';
import cloudKitService from '@/services/cloudkit.service';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(THEME_CONFIG.LIGHT);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  const applyThemeToDOM = useCallback((themeValue, highContrastValue, reduceMotionValue) => {
    if (typeof document === 'undefined') return;

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

    // Apply reduce motion class
    if (reduceMotionValue) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: themeValue === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT',
      });
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.LIGHT;
    const savedHighContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true';

    // Check for saved reduce motion preference, fallback to system preference
    let savedReduceMotion = localStorage.getItem(STORAGE_KEYS.REDUCE_MOTION);
    if (savedReduceMotion === null) {
      // No saved preference, check system preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        savedReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } else {
        savedReduceMotion = false;
      }
    } else {
      savedReduceMotion = savedReduceMotion === 'true';
    }

    setTheme(savedTheme);
    setHighContrast(savedHighContrast);
    setReduceMotion(savedReduceMotion);

    // Apply the saved theme
    applyThemeToDOM(savedTheme, savedHighContrast, savedReduceMotion);
    setMounted(true);
  }, [applyThemeToDOM]);

  // Listen for app state changes (iOS foreground/background)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const handleAppStateChange = (state) => {
        if (state.isActive) {
          // App became active, reapply current theme to ensure classes are set
          applyThemeToDOM(theme, highContrast, reduceMotion);
        }
      };

      window.Capacitor.Plugins.App.addListener('appStateChange', handleAppStateChange);

      return () => {
        window.Capacitor.Plugins.App.removeAllListeners();
      };
    }
  }, [theme, highContrast, reduceMotion, applyThemeToDOM]);

  // Listen for browser tab visibility changes to reapply theme
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, reapply theme settings
        applyThemeToDOM(theme, highContrast, reduceMotion);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme, highContrast, reduceMotion, applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === THEME_CONFIG.DARK ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK;

    // Toggle the theme
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    applyThemeToDOM(newTheme, highContrast, reduceMotion);

    // Sync preferences to iCloud
    cloudKitService
      .syncPreferences({
        theme: newTheme,
        highContrast,
        reduceMotion,
        sound: localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false',
      })
      .catch(() => {
        // Failed to sync theme preference to iCloud (non-critical)
      });
  }, [theme, highContrast, reduceMotion, applyThemeToDOM]);

  const toggleHighContrast = useCallback(() => {
    const newHighContrast = !highContrast;
    setHighContrast(newHighContrast);
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, newHighContrast.toString());
    applyThemeToDOM(theme, newHighContrast, reduceMotion);

    // Sync preferences to iCloud
    cloudKitService
      .syncPreferences({
        theme,
        highContrast: newHighContrast,
        reduceMotion,
        sound: localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false',
      })
      .catch(() => {
        // Failed to sync high contrast preference to iCloud (non-critical)
      });
  }, [highContrast, reduceMotion, theme, applyThemeToDOM]);

  const toggleReduceMotion = useCallback(() => {
    const newReduceMotion = !reduceMotion;
    setReduceMotion(newReduceMotion);
    localStorage.setItem(STORAGE_KEYS.REDUCE_MOTION, newReduceMotion.toString());
    applyThemeToDOM(theme, highContrast, newReduceMotion);

    // Sync preferences to iCloud
    cloudKitService
      .syncPreferences({
        theme,
        highContrast,
        reduceMotion: newReduceMotion,
        sound: localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false',
      })
      .catch(() => {
        // Failed to sync reduce motion preference to iCloud (non-critical)
      });
  }, [reduceMotion, highContrast, theme, applyThemeToDOM]);

  const value = {
    theme,
    highContrast,
    reduceMotion,
    toggleTheme,
    toggleHighContrast,
    toggleReduceMotion,
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
