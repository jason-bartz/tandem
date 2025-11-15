import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, THEME_CONFIG, THEME_MODE } from '@/lib/constants';

export function useTheme() {
  const [theme, setTheme] = useState(THEME_CONFIG.DEFAULT);
  const [themeMode, setThemeMode] = useState(THEME_MODE.DEFAULT);
  const [systemTheme, setSystemTheme] = useState(THEME_CONFIG.LIGHT);
  const [highContrast, setHighContrast] = useState(false);

  const applyTheme = useCallback((themeToApply, isHighContrast = false) => {
    setTheme(themeToApply);
    setHighContrast(isHighContrast);

    // Apply to DOM
    document.documentElement.setAttribute('data-theme', themeToApply);

    if (themeToApply === THEME_CONFIG.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply or remove high contrast class
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, isHighContrast.toString());
  }, []);

  const detectSystemTheme = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const detectedTheme = darkModeQuery.matches ? THEME_CONFIG.DARK : THEME_CONFIG.LIGHT;
      setSystemTheme(detectedTheme);
      return detectedTheme;
    }
    return THEME_CONFIG.LIGHT;
  }, []);

  const updateThemeBasedOnMode = useCallback(
    (mode, manualTheme = null) => {
      const currentHighContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true';
      if (mode === THEME_MODE.AUTO) {
        const sysTheme = detectSystemTheme();
        applyTheme(sysTheme, currentHighContrast);
      } else {
        const savedTheme =
          manualTheme || localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.LIGHT;
        applyTheme(savedTheme, currentHighContrast);
      }
    },
    [applyTheme, detectSystemTheme]
  );

  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_MODE.DEFAULT;
    const savedHighContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true';

    setThemeMode(savedMode);

    if (savedMode === THEME_MODE.AUTO) {
      const sysTheme = detectSystemTheme();
      applyTheme(sysTheme, savedHighContrast);
    } else {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.DEFAULT;
      applyTheme(savedTheme, savedHighContrast);
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleSystemThemeChange = (e) => {
        const newSystemTheme = e.matches ? THEME_CONFIG.DARK : THEME_CONFIG.LIGHT;
        setSystemTheme(newSystemTheme);

        const currentMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_MODE.DEFAULT;
        const currentHighContrast = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true';
        if (currentMode === THEME_MODE.AUTO) {
          applyTheme(newSystemTheme, currentHighContrast);
        }
      };

      darkModeQuery.addEventListener('change', handleSystemThemeChange);

      return () => {
        darkModeQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [applyTheme, detectSystemTheme]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: theme === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT',
      });
    }
  }, [theme]);

  // Reapply theme when app returns from background (iOS)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const handleAppStateChange = (state) => {
        if (state.isActive) {
          // App became active, recheck system theme if in auto mode
          if (themeMode === THEME_MODE.AUTO) {
            const sysTheme = detectSystemTheme();
            applyTheme(sysTheme, highContrast);
          }
        }
      };

      window.Capacitor.Plugins.App.addListener('appStateChange', handleAppStateChange);

      return () => {
        window.Capacitor.Plugins.App.removeAllListeners();
      };
    }
  }, [themeMode, highContrast, applyTheme, detectSystemTheme]);

  const toggleTheme = useCallback(() => {
    // Simple toggle between light and dark (manual override of system preference)
    const newTheme = theme === THEME_CONFIG.DARK ? THEME_CONFIG.LIGHT : THEME_CONFIG.DARK;

    // Save manual preference
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, THEME_MODE.MANUAL);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);

    setThemeMode(THEME_MODE.MANUAL);
    applyTheme(newTheme, highContrast);

    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: newTheme === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT',
      });
    }
  }, [theme, highContrast, applyTheme]);

  const setThemeDirectly = (mode, specificTheme = null) => {
    setThemeMode(mode);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);

    if (mode === THEME_MODE.MANUAL && specificTheme) {
      localStorage.setItem(STORAGE_KEYS.THEME, specificTheme);
      applyTheme(specificTheme, highContrast);
    } else if (mode === THEME_MODE.AUTO) {
      updateThemeBasedOnMode(mode);
    }

    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      const currentTheme = mode === THEME_MODE.AUTO ? systemTheme : specificTheme || theme;
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: currentTheme === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT',
      });
    }
  };

  const toggleHighContrast = useCallback(() => {
    const newHighContrast = !highContrast;

    // Apply the current theme with the new high contrast setting
    applyTheme(theme, newHighContrast);
  }, [highContrast, theme, applyTheme]);

  return {
    theme,
    themeMode,
    systemTheme,
    highContrast,
    toggleTheme,
    toggleHighContrast,
    setThemeDirectly,
    isDark: theme === THEME_CONFIG.DARK,
    isAuto: themeMode === THEME_MODE.AUTO,
    currentState: themeMode === THEME_MODE.AUTO ? `auto-${systemTheme}` : theme,
  };
}
