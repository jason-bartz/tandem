import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, THEME_CONFIG, THEME_MODE } from '@/lib/constants';

export function useTheme() {
  const [theme, setTheme] = useState(THEME_CONFIG.DEFAULT);
  const [themeMode, setThemeMode] = useState(THEME_MODE.DEFAULT);
  const [systemTheme, setSystemTheme] = useState(THEME_CONFIG.LIGHT);

  const applyTheme = useCallback((themeToApply) => {
    setTheme(themeToApply);
    document.documentElement.setAttribute('data-theme', themeToApply);
    if (themeToApply === THEME_CONFIG.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  const updateThemeBasedOnMode = useCallback((mode, manualTheme = null) => {
    if (mode === THEME_MODE.AUTO) {
      const sysTheme = detectSystemTheme();
      applyTheme(sysTheme);
    } else {
      const savedTheme = manualTheme || localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.LIGHT;
      applyTheme(savedTheme);
    }
  }, [applyTheme, detectSystemTheme]);

  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_MODE.DEFAULT;
    setThemeMode(savedMode);

    if (savedMode === THEME_MODE.AUTO) {
      const sysTheme = detectSystemTheme();
      applyTheme(sysTheme);
    } else {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEME_CONFIG.DEFAULT;
      applyTheme(savedTheme);
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleSystemThemeChange = (e) => {
        const newSystemTheme = e.matches ? THEME_CONFIG.DARK : THEME_CONFIG.LIGHT;
        setSystemTheme(newSystemTheme);

        const currentMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_MODE.DEFAULT;
        if (currentMode === THEME_MODE.AUTO) {
          applyTheme(newSystemTheme);
        }
      };

      darkModeQuery.addEventListener('change', handleSystemThemeChange);

      return () => {
        darkModeQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [applyTheme, detectSystemTheme]);

  // Update iOS StatusBar when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: theme === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT'
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
            applyTheme(sysTheme);
          }
        }
      };

      window.Capacitor.Plugins.App.addListener('appStateChange', handleAppStateChange);

      return () => {
        window.Capacitor.Plugins.App.removeAllListeners();
      };
    }
  }, [themeMode, applyTheme, detectSystemTheme]);

  const toggleTheme = () => {
    const currentMode = themeMode;
    let newMode;
    let newTheme;

    if (currentMode === THEME_MODE.AUTO) {
      newMode = THEME_MODE.MANUAL;
      newTheme = THEME_CONFIG.LIGHT;
    } else if (theme === THEME_CONFIG.LIGHT) {
      newMode = THEME_MODE.MANUAL;
      newTheme = THEME_CONFIG.DARK;
    } else {
      newMode = THEME_MODE.AUTO;
      newTheme = systemTheme;
    }

    setThemeMode(newMode);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode);

    if (newMode === THEME_MODE.MANUAL) {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      applyTheme(newTheme);
    } else {
      applyTheme(newTheme);
    }

    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: newTheme === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT'
      });
    }
  };

  const setThemeDirectly = (mode, specificTheme = null) => {
    setThemeMode(mode);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);

    if (mode === THEME_MODE.MANUAL && specificTheme) {
      localStorage.setItem(STORAGE_KEYS.THEME, specificTheme);
      applyTheme(specificTheme);
    } else if (mode === THEME_MODE.AUTO) {
      updateThemeBasedOnMode(mode);
    }

    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.StatusBar) {
      const currentTheme = mode === THEME_MODE.AUTO ? systemTheme : (specificTheme || theme);
      window.Capacitor.Plugins.StatusBar.setStyle({
        style: currentTheme === THEME_CONFIG.DARK ? 'DARK' : 'LIGHT'
      });
    }
  };

  return {
    theme,
    themeMode,
    systemTheme,
    toggleTheme,
    setThemeDirectly,
    isDark: theme === THEME_CONFIG.DARK,
    isAuto: themeMode === THEME_MODE.AUTO,
    currentState: themeMode === THEME_MODE.AUTO
      ? `auto-${systemTheme}`
      : theme
  };
}