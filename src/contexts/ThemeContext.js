'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, THEME_CONFIG, THEME_MODE } from '@/lib/constants';
import cloudKitService from '@/services/cloudkit.service';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(THEME_CONFIG.LIGHT);
  const [themeMode, setThemeMode] = useState(THEME_MODE.AUTO);
  const [systemTheme, setSystemTheme] = useState(THEME_CONFIG.LIGHT);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detect system theme preference
  const detectSystemTheme = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const detectedTheme = darkModeQuery.matches ? THEME_CONFIG.DARK : THEME_CONFIG.LIGHT;
      setSystemTheme(detectedTheme);
      return detectedTheme;
    }
    return THEME_CONFIG.LIGHT;
  }, []);

  // Determine effective theme based on mode
  const getEffectiveTheme = useCallback(() => {
    if (themeMode === THEME_MODE.AUTO) {
      return systemTheme;
    }
    return theme;
  }, [themeMode, systemTheme, theme]);

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

    // Update iOS StatusBar
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: themeValue === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT',
      });
    }
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_MODE.AUTO;
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

    setThemeMode(savedMode);
    setTheme(savedTheme);
    setHighContrast(savedHighContrast);
    setReduceMotion(savedReduceMotion);

    // Detect system theme
    const sysTheme = detectSystemTheme();

    // Apply appropriate theme based on mode
    const themeToApply = savedMode === THEME_MODE.AUTO ? sysTheme : savedTheme;
    applyThemeToDOM(themeToApply, savedHighContrast, savedReduceMotion);
    setMounted(true);
  }, [detectSystemTheme, applyThemeToDOM]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleSystemThemeChange = (e) => {
        const newSystemTheme = e.matches ? THEME_CONFIG.DARK : THEME_CONFIG.LIGHT;
        setSystemTheme(newSystemTheme);

        // Only apply if in auto mode
        if (themeMode === THEME_MODE.AUTO) {
          applyThemeToDOM(newSystemTheme, highContrast, reduceMotion);
        }
      };

      darkModeQuery.addEventListener('change', handleSystemThemeChange);

      return () => {
        darkModeQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [themeMode, highContrast, reduceMotion, applyThemeToDOM]);

  // Listen for app state changes (iOS foreground/background)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const handleAppStateChange = (state) => {
        if (state.isActive) {
          // App became active, recheck system theme if in auto mode
          if (themeMode === THEME_MODE.AUTO) {
            const sysTheme = detectSystemTheme();
            applyThemeToDOM(sysTheme, highContrast, reduceMotion);
          } else {
            // Reapply current theme to ensure classes are set
            applyThemeToDOM(theme, highContrast, reduceMotion);
          }
        }
      };

      window.Capacitor.Plugins.App.addListener('appStateChange', handleAppStateChange);

      return () => {
        window.Capacitor.Plugins.App.removeAllListeners();
      };
    }
  }, [themeMode, theme, highContrast, reduceMotion, applyThemeToDOM, detectSystemTheme]);

  // Listen for browser tab visibility changes to reapply theme
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, reapply theme settings
        const effectiveTheme = getEffectiveTheme();
        applyThemeToDOM(effectiveTheme, highContrast, reduceMotion);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [highContrast, reduceMotion, applyThemeToDOM, getEffectiveTheme]);

  const toggleTheme = useCallback(() => {
    const effectiveTheme = getEffectiveTheme();
    const newTheme = effectiveTheme === THEME_CONFIG.DARK ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK;

    // When user manually toggles, switch to manual mode
    setTheme(newTheme);
    setThemeMode(THEME_MODE.MANUAL);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, THEME_MODE.MANUAL);
    applyThemeToDOM(newTheme, highContrast, reduceMotion);

    // Sync preferences to iCloud
    cloudKitService
      .syncPreferences({
        theme: newTheme,
        themeMode: THEME_MODE.MANUAL,
        highContrast,
        reduceMotion,
        sound: localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false',
      })
      .catch(() => {
        // Failed to sync theme preference to iCloud (non-critical)
      });
  }, [getEffectiveTheme, highContrast, reduceMotion, applyThemeToDOM]);

  const setThemeMode_ = useCallback(
    (mode) => {
      setThemeMode(mode);
      localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);

      if (mode === THEME_MODE.AUTO) {
        // Switch to auto mode - use system theme
        const sysTheme = detectSystemTheme();
        applyThemeToDOM(sysTheme, highContrast, reduceMotion);
      } else {
        // Manual mode - use saved theme
        applyThemeToDOM(theme, highContrast, reduceMotion);
      }
    },
    [theme, highContrast, reduceMotion, applyThemeToDOM, detectSystemTheme]
  );

  const toggleHighContrast = useCallback(() => {
    const newHighContrast = !highContrast;
    setHighContrast(newHighContrast);
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, newHighContrast.toString());
    const effectiveTheme = getEffectiveTheme();
    applyThemeToDOM(effectiveTheme, newHighContrast, reduceMotion);

    // Sync preferences to iCloud
    cloudKitService
      .syncPreferences({
        theme,
        themeMode,
        highContrast: newHighContrast,
        reduceMotion,
        sound: localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false',
      })
      .catch(() => {
        // Failed to sync high contrast preference to iCloud (non-critical)
      });
  }, [highContrast, reduceMotion, getEffectiveTheme, applyThemeToDOM, theme, themeMode]);

  const toggleReduceMotion = useCallback(() => {
    const newReduceMotion = !reduceMotion;
    setReduceMotion(newReduceMotion);
    localStorage.setItem(STORAGE_KEYS.REDUCE_MOTION, newReduceMotion.toString());
    const effectiveTheme = getEffectiveTheme();
    applyThemeToDOM(effectiveTheme, highContrast, newReduceMotion);

    // Sync preferences to iCloud
    cloudKitService
      .syncPreferences({
        theme,
        themeMode,
        highContrast,
        reduceMotion: newReduceMotion,
        sound: localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false',
      })
      .catch(() => {
        // Failed to sync reduce motion preference to iCloud (non-critical)
      });
  }, [reduceMotion, highContrast, getEffectiveTheme, applyThemeToDOM, theme, themeMode]);

  const effectiveTheme = getEffectiveTheme();

  const value = {
    theme: effectiveTheme,
    themeMode,
    systemTheme,
    highContrast,
    reduceMotion,
    toggleTheme,
    toggleHighContrast,
    toggleReduceMotion,
    setThemeMode: setThemeMode_,
    isDark: effectiveTheme === THEME_CONFIG.DARK,
    isAuto: themeMode === THEME_MODE.AUTO,
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
