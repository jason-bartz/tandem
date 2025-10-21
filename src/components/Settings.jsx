'use client';
import { useState, useEffect } from 'react';
import subscriptionService from '@/services/subscriptionService';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import notificationService from '@/services/notificationService';
import { useUnifiedSync } from '@/hooks/useUnifiedSync';
import GameCenterButton from '@/components/GameCenterButton';
import { STORAGE_KEYS } from '@/lib/constants';

export default function Settings({ isOpen, onClose }) {
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [keyboardLayout, setKeyboardLayout] = useState('QWERTY');
  const [showAppBanner, setShowAppBanner] = useState(false);
  const [hardModeEnabled, setHardModeEnabled] = useState(false);
  const [leaderboardsEnabled, setLeaderboardsEnabled] = useState(true);
  const { playHaptic, lightTap } = useHaptics();
  const {
    theme,
    toggleTheme,
    highContrast,
    toggleHighContrast,
    reduceMotion,
    toggleReduceMotion,
    setThemeMode,
    isAuto,
  } = useTheme();
  const { syncStatus, toggleSync } = useUnifiedSync();

  useEffect(() => {
    if (isOpen) {
      loadSubscriptionInfo();
      loadNotificationSettings();
      loadKeyboardLayout();
      loadHardModePreference();
      loadLeaderboardPreference();
      checkAppBannerVisibility();
    }
  }, [isOpen]);

  const checkAppBannerVisibility = () => {
    // Only show banner on web version
    if (Capacitor.isNativePlatform()) {
      setShowAppBanner(false);
      return;
    }

    const dismissedUntil = localStorage.getItem('appBannerDismissedUntil');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      const now = new Date();
      if (now < dismissedDate) {
        setShowAppBanner(false);
        return;
      }
    }
    setShowAppBanner(true);
  };

  const handleAppBannerDismiss = () => {
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7); // Dismiss for 7 days
    localStorage.setItem('appBannerDismissedUntil', dismissUntil.toISOString());
    setShowAppBanner(false);
    lightTap();
  };

  const loadKeyboardLayout = () => {
    const saved = localStorage.getItem('keyboardLayout');
    if (saved) {
      setKeyboardLayout(saved);
    }
  };

  const loadHardModePreference = () => {
    const saved = localStorage.getItem('tandemHardMode');
    if (saved === 'true') {
      setHardModeEnabled(true);
    }
  };

  const loadLeaderboardPreference = async () => {
    try {
      let enabled;
      if (Capacitor.isNativePlatform()) {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: STORAGE_KEYS.LEADERBOARDS_ENABLED });
        enabled = result.value !== 'false'; // Default to true if not set
      } else {
        const saved = localStorage.getItem(STORAGE_KEYS.LEADERBOARDS_ENABLED);
        enabled = saved !== 'false'; // Default to true if not set
      }
      setLeaderboardsEnabled(enabled);
    } catch (error) {
      console.error('Failed to load leaderboard preference:', error);
      setLeaderboardsEnabled(true); // Default to true on error
    }
  };

  const handleKeyboardLayoutChange = (layout) => {
    setKeyboardLayout(layout);
    localStorage.setItem('keyboardLayout', layout);
    lightTap();
    // Notify parent component if needed
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('keyboardLayoutChanged', { detail: layout }));
    }
  };

  const handleLeaderboardToggle = async () => {
    const newValue = !leaderboardsEnabled;
    setLeaderboardsEnabled(newValue);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({
          key: STORAGE_KEYS.LEADERBOARDS_ENABLED,
          value: newValue.toString(),
        });
      } else {
        localStorage.setItem(STORAGE_KEYS.LEADERBOARDS_ENABLED, newValue.toString());
      }
    } catch (error) {
      console.error('Failed to save leaderboard preference:', error);
    }
    lightTap();
  };

  const handleHardModeToggle = () => {
    const newValue = !hardModeEnabled;
    setHardModeEnabled(newValue);
    localStorage.setItem('tandemHardMode', newValue.toString());
    lightTap();
    // Notify parent component if needed
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('hardModeChanged', { detail: newValue }));
    }
  };

  const loadNotificationSettings = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const settings = await notificationService.getSettings();
      setNotificationSettings(settings);
      const hasPermission = await notificationService.checkPermission();
      setNotificationPermission(hasPermission);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const loadSubscriptionInfo = async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    setLoading(true);
    try {
      await subscriptionService.initialize();
      const status = await subscriptionService.refreshSubscriptionStatus();
      setSubscriptionInfo(status);
    } catch (error) {
      console.error('Failed to load subscription info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-bg-card rounded-[32px] border-[3px] border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Settings</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* iOS App Promotion Banner - Web Only */}
        {showAppBanner && !Capacitor.isNativePlatform() && (
          <div className="mb-6">
            <div
              className={`rounded-2xl border-[3px] p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.3)] ${
                highContrast
                  ? 'bg-hc-primary border-hc-border'
                  : 'bg-accent-blue/20 dark:bg-sky-900/40 border-accent-blue'
              }`}
            >
              {/* Content */}
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <h3
                    className={`text-lg font-bold ${
                      highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Get the iOS App
                  </h3>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 font-bold ${
                        highContrast ? 'text-white' : 'text-accent-blue dark:text-accent-blue'
                      }`}
                    >
                      ✓
                    </span>
                    <p
                      className={`text-sm ${
                        highContrast ? 'text-white/95' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Never lose your streaks & progress
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 font-bold ${
                        highContrast ? 'text-white' : 'text-accent-blue dark:text-accent-blue'
                      }`}
                    >
                      ✓
                    </span>
                    <p
                      className={`text-sm ${
                        highContrast ? 'text-white/95' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Access Hard Mode and other exclusive modes and features
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 font-bold ${
                        highContrast ? 'text-white' : 'text-accent-blue dark:text-accent-blue'
                      }`}
                    >
                      ✓
                    </span>
                    <p
                      className={`text-sm ${
                        highContrast ? 'text-white/95' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Automatic cloud sync across devices
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href="https://apps.apple.com/us/app/tandem-daily-word-puzzle/id6753114083"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block hover:opacity-90 transition-opacity"
                    onClick={() => lightTap()}
                  >
                    <img
                      src={
                        theme === 'dark'
                          ? '/icons/App_Store_Badge_US-UK_RGB_blk_092917.svg'
                          : '/icons/App_Store_Badge_US-UK_RGB_wht_092917.svg'
                      }
                      alt="Download on the App Store"
                      className="h-10"
                    />
                  </a>
                  <button
                    onClick={handleAppBannerDismiss}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border-[2px] ${
                      highContrast
                        ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus hover:text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Section */}
        {Capacitor.isNativePlatform() && (
          <div className="mb-8">
            {/* Section Card */}
            <div
              className={`rounded-2xl border-[2px] overflow-hidden ${
                highContrast
                  ? 'border-hc-border bg-hc-surface'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {/* Section Header */}
              <div className="px-5 py-3 border-b-[2px] border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  Subscription
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                  </div>
                ) : subscriptionInfo?.isActive ? (
                  <div className="space-y-3">
                    {/* Premium Badge */}
                    <div className="bg-accent-blue dark:bg-accent-blue rounded-2xl border-[3px] border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <img
                          src={
                            theme === 'dark'
                              ? '/icons/ui/tandem-unlimited-dark.png'
                              : '/icons/ui/tandem-unlimited.png'
                          }
                          alt="Unlimited"
                          className="w-6 h-6"
                        />
                        <p className="text-white font-bold text-lg">Tandem Unlimited</p>
                      </div>
                      <p className="text-white/90 text-sm">Active Player</p>
                    </div>

                    {/* Hard Mode Toggle - Only for Premium Users */}
                    <div className="bg-accent-orange/20 dark:bg-gray-700 rounded-2xl border-[3px] border-accent-orange dark:border-accent-orange p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                theme === 'dark'
                                  ? '/icons/ui/hardmode-dark.png'
                                  : '/icons/ui/hardmode.png'
                              }
                              alt="Hard Mode"
                              className="w-5 h-5"
                            />
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Hard Mode
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            3-minute time limit • No hints available
                          </p>
                        </div>
                        <button
                          onClick={handleHardModeToggle}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            highContrast
                              ? hardModeEnabled
                                ? 'bg-hc-primary border-2 border-hc-border'
                                : 'bg-hc-surface border-2 border-hc-border'
                              : hardModeEnabled
                                ? 'bg-red-500'
                                : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                          role="switch"
                          aria-checked={hardModeEnabled}
                        >
                          <span
                            className={`${
                              hardModeEnabled ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full ${
                              highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                            } transition-transform`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* View Plans Button */}
                    <button
                      onClick={() => setShowPaywall(true)}
                      className={`w-full py-2 font-semibold rounded-2xl transition-all ${
                        highContrast
                          ? 'bg-hc-surface text-hc-text border-[3px] border-hc-border hover:bg-hc-focus hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                          : 'bg-white dark:bg-gray-700 border-[3px] border-accent-blue dark:border-gray-600 text-accent-blue dark:text-accent-blue shadow-[3px_3px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                      }`}
                    >
                      View Plans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        Get unlimited access to all puzzles with Tandem Unlimited!
                      </p>
                      <button
                        onClick={() => setShowPaywall(true)}
                        className={`w-full py-2 font-semibold rounded-2xl transition-all ${
                          highContrast
                            ? 'bg-hc-primary text-white border-[3px] border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-accent-blue text-white border-[3px] border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_rgba(0,0,0,0.5)]'
                        }`}
                      >
                        View Plans
                      </button>
                    </div>

                    {/* Hard Mode - Disabled for non-subscribers */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border-[3px] border-gray-300 dark:border-gray-700 p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                theme === 'dark'
                                  ? '/icons/ui/hardmode-dark.png'
                                  : '/icons/ui/hardmode.png'
                              }
                              alt="Hard Mode"
                              className="w-5 h-5 opacity-50"
                            />
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-500">
                              Hard Mode
                            </p>
                            <span className="text-xs bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">
                              Tandem Unlimited
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            3-minute time limit • No hints available
                          </p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 cursor-not-allowed">
                          <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-gray-300 dark:bg-gray-600 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* iCloud Sync Section */}
        {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && (
          <div className="mb-8">
            {/* Section Card */}
            <div
              className={`rounded-2xl border-[2px] overflow-hidden ${
                highContrast
                  ? 'border-hc-border bg-hc-surface'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {/* Section Header */}
              <div className="px-5 py-3 border-b-[2px] border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  iCloud Sync
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-5 space-y-4">
                {/* Sync Status */}
                {!syncStatus.available ? (
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      iCloud sync is not available. Make sure you're signed in to iCloud on your
                      device.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Sync Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Sync with iCloud
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Keep your stats and progress synced across devices
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await toggleSync(!syncStatus.enabled);
                          lightTap();
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          highContrast
                            ? syncStatus.enabled
                              ? 'bg-hc-primary border-2 border-hc-border'
                              : 'bg-hc-surface border-2 border-hc-border'
                            : syncStatus.enabled
                              ? 'bg-sky-500'
                              : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={syncStatus.enabled}
                      >
                        <span
                          className={`${
                            syncStatus.enabled ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full ${
                            highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                          } transition-transform`}
                        />
                      </button>
                    </div>

                    {/* Last Sync Time & Provider */}
                    {syncStatus.enabled && syncStatus.lastSync && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1 mb-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
                        </div>
                        {syncStatus.provider && (
                          <div className="ml-4 opacity-75">
                            Using:{' '}
                            {syncStatus.provider === 'gameCenter'
                              ? '🎮 Game Center'
                              : syncStatus.provider === 'cloudKit'
                                ? '☁️ iCloud'
                                : '📱 Local Storage'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sync Error */}
                    {syncStatus.error && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                        <p className="text-sm text-red-800 dark:text-red-200">{syncStatus.error}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Section */}
        {Capacitor.isNativePlatform() && (
          <div className="mb-8">
            {/* Section Card */}
            <div
              className={`rounded-2xl border-[2px] overflow-hidden ${
                highContrast
                  ? 'border-hc-border bg-hc-surface'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {/* Section Header */}
              <div className="px-5 py-3 border-b-[2px] border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  Notifications
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-5">
                {notificationPermission === false ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                      Enable notifications to never miss your daily puzzle and protect your streak
                    </p>
                    <button
                      onClick={async () => {
                        const granted = await notificationService.requestPermission();
                        if (granted) {
                          await loadNotificationSettings();
                          await notificationService.rescheduleAllNotifications();
                          playHaptic('success');
                        } else {
                          alert('Please enable notifications in your device settings');
                        }
                      }}
                      className="w-full py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700"
                    >
                      Enable Notifications
                    </button>
                  </div>
                ) : notificationSettings ? (
                  <div className="space-y-4">
                    {/* Single Master Toggle - Following Apple HIG */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Daily Notifications
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Daily reminder to maintain your streak
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !notificationSettings.notificationsEnabled;
                          setNotificationSettings((prev) => ({
                            ...prev,
                            notificationsEnabled: newValue,
                          }));
                          await notificationService.updateSettings({
                            notifications_enabled: newValue,
                          });
                          playHaptic('light');
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          highContrast
                            ? notificationSettings.notificationsEnabled
                              ? 'bg-hc-primary border-2 border-hc-border'
                              : 'bg-hc-surface border-2 border-hc-border'
                            : notificationSettings.notificationsEnabled
                              ? 'bg-sky-500'
                              : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                        role="switch"
                        aria-checked={notificationSettings.notificationsEnabled}
                      >
                        <span
                          className={`${
                            notificationSettings.notificationsEnabled
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full ${
                            highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                          } transition-transform`}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Game Center & Leaderboards Section (iOS only) */}
        {Capacitor.isNativePlatform() && (
          <div className="mb-8">
            {/* Section Card */}
            <div
              className={`rounded-2xl border-[2px] overflow-hidden ${
                highContrast
                  ? 'border-hc-border bg-hc-surface'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {/* Section Header */}
              <div className="px-5 py-3 border-b-[2px] border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  Game Center
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-5 space-y-4">
                {/* Game Center Button */}
                <GameCenterButton />

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Leaderboards Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Upload Scores to Leaderboards
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Share your scores with the global community
                    </p>
                  </div>
                  <button
                    onClick={handleLeaderboardToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      highContrast
                        ? leaderboardsEnabled
                          ? 'bg-hc-primary border-2 border-hc-border'
                          : 'bg-hc-surface border-2 border-hc-border'
                        : leaderboardsEnabled
                          ? 'bg-sky-500'
                          : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={leaderboardsEnabled}
                  >
                    <span
                      className={`${
                        leaderboardsEnabled ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full ${
                        highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                      } transition-transform`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Section */}
        <div className="mb-8">
          {/* Section Card */}
          <div
            className={`rounded-2xl border-[2px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }`}
          >
            {/* Section Header */}
            <div className="px-5 py-3 border-b-[2px] border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                Accessibility
              </h3>
            </div>

            {/* Section Content */}
            <div className="p-5 space-y-4">
              {/* Theme Mode Selection */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Theme Mode</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isAuto ? 'Following system' : 'Manual override'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setThemeMode('auto');
                      lightTap();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      highContrast
                        ? isAuto
                          ? 'bg-hc-primary text-white border-2 border-hc-border'
                          : 'bg-hc-surface text-hc-text border-2 border-hc-border'
                        : isAuto
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('manual');
                      lightTap();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      highContrast
                        ? !isAuto
                          ? 'bg-hc-primary text-white border-2 border-hc-border'
                          : 'bg-hc-surface text-hc-text border-2 border-hc-border'
                        : !isAuto
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {isAuto ? 'Current Appearance' : 'Appearance'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                    {isAuto && ' (auto)'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    toggleTheme();
                    lightTap();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    highContrast
                      ? theme === 'dark'
                        ? 'bg-hc-primary border-2 border-hc-border'
                        : 'bg-hc-surface border-2 border-hc-border'
                      : isAuto
                        ? 'bg-gray-300 dark:bg-gray-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={theme === 'dark'}
                  disabled={isAuto}
                >
                  <span
                    className={`${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full ${
                      highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                    } transition-transform`}
                  />
                </button>
              </div>

              {/* High Contrast Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Color Blind Friendly Mode
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    High contrast with patterns for accessibility
                  </p>
                </div>
                <button
                  onClick={() => {
                    toggleHighContrast();
                    lightTap();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    highContrast
                      ? highContrast
                        ? 'bg-hc-primary border-2 border-hc-border'
                        : 'bg-hc-surface border-2 border-hc-border'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={highContrast}
                >
                  <span
                    className={`${
                      highContrast ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full ${
                      highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                    } transition-transform`}
                  />
                </button>
              </div>

              {/* Reduce Motion Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Reduce Motion
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Minimizes animations and motion effects
                  </p>
                </div>
                <button
                  onClick={() => {
                    toggleReduceMotion();
                    lightTap();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    highContrast
                      ? reduceMotion
                        ? 'bg-hc-primary border-2 border-hc-border'
                        : 'bg-hc-surface border-2 border-hc-border'
                      : reduceMotion
                        ? 'bg-sky-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={reduceMotion}
                >
                  <span
                    className={`${
                      reduceMotion ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full ${
                      highContrast ? 'bg-hc-background border border-hc-border' : 'bg-white'
                    } transition-transform`}
                  />
                </button>
              </div>

              {/* Keyboard Layout Selection */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Keyboard Layout
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose your preferred keyboard layout
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleKeyboardLayoutChange('QWERTY')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      highContrast
                        ? keyboardLayout === 'QWERTY'
                          ? 'bg-hc-primary text-white border-2 border-hc-border'
                          : 'bg-hc-surface text-hc-text border-2 border-hc-border'
                        : keyboardLayout === 'QWERTY'
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    QWERTY
                  </button>
                  <button
                    onClick={() => handleKeyboardLayoutChange('QWERTZ')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      highContrast
                        ? keyboardLayout === 'QWERTZ'
                          ? 'bg-hc-primary text-white border-2 border-hc-border'
                          : 'bg-hc-surface text-hc-text border-2 border-hc-border'
                        : keyboardLayout === 'QWERTZ'
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    QWERTZ
                  </button>
                  <button
                    onClick={() => handleKeyboardLayoutChange('AZERTY')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      highContrast
                        ? keyboardLayout === 'AZERTY'
                          ? 'bg-hc-primary text-white border-2 border-hc-border'
                          : 'bg-hc-surface text-hc-text border-2 border-hc-border'
                        : keyboardLayout === 'AZERTY'
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    AZERTY
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright and Links */}
        <div className="mb-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">© 2025 Good Vibes Games</p>

          {/* Text Links */}
          <div className="flex items-center justify-center gap-3 text-xs mb-3">
            <button
              className="text-sky-600 dark:text-sky-400 hover:underline"
              onClick={async () => {
                lightTap();
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url: 'https://tandemdaily.com/privacypolicy' });
                } else {
                  window.open('/privacypolicy', '_blank');
                }
              }}
            >
              Privacy Policy
            </button>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <button
              className="text-sky-600 dark:text-sky-400 hover:underline"
              onClick={async () => {
                lightTap();
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url: 'https://tandemdaily.com/support' });
                } else {
                  window.open('/support', '_blank');
                }
              }}
            >
              Support
            </button>
          </div>

          {/* Social Media Icons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={async () => {
                lightTap();
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url: 'https://www.tiktok.com/@tandem.daily' });
                } else {
                  window.open('https://www.tiktok.com/@tandem.daily', '_blank');
                }
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Follow us on TikTok"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </button>
            <button
              onClick={async () => {
                lightTap();
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url: 'https://instagram.com/tandem.daily' });
                } else {
                  window.open('https://instagram.com/tandem.daily', '_blank');
                }
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
              aria-label="Follow us on Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </button>
            <button
              onClick={async () => {
                lightTap();
                if (Capacitor.isNativePlatform()) {
                  await Browser.open({ url: 'https://twitter.com/tandem_daily' });
                } else {
                  window.open('https://twitter.com/tandem_daily', '_blank');
                }
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
              aria-label="Follow us on X (Twitter)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`w-full py-3 font-semibold rounded-2xl transition-all ${
            highContrast
              ? 'bg-hc-primary text-white border-[3px] border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-accent-pink text-white border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          Done
        </button>
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          loadSubscriptionInfo();
        }}
      />
    </div>
  );
}
