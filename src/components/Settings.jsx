'use client';

/**
 * Settings Modal
 * NOW USES: LeftSidePanel for consistent slide-in behavior
 *
 * Main settings interface with sections for:
 * - Account management and avatar
 * - Subscription and Hard Mode
 * - iCloud Sync (iOS)
 * - Notifications (iOS)
 * - Game Center and Leaderboards (iOS)
 * - Accessibility preferences
 *
 * Nested modals:
 * - PaywallModal at z-60
 * - AvatarSelectionModal at z-60
 *
 * @component
 */
import { useState, useEffect } from 'react';
import PaywallModal from '@/components/PaywallModal';
import AvatarSelectionPane from '@/components/AvatarSelectionPane';
import { Capacitor } from '@capacitor/core';
// import { Browser } from '@capacitor/browser';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useHoroscope } from '@/hooks/useHoroscope';
import notificationService from '@/services/notificationService';
import avatarService from '@/services/avatar.service';
import { useUnifiedSync } from '@/hooks/useUnifiedSync';
import GameCenterButton from '@/components/GameCenterButton';
import { STORAGE_KEYS } from '@/lib/constants';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

export default function Settings({ isOpen, onClose, openPaywall = false }) {
  const [showPaywall, setShowPaywall] = useState(openPaywall);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [keyboardLayout, setKeyboardLayout] = useState('QWERTY');
  const [showAppBanner, setShowAppBanner] = useState(false);
  const [hardModeEnabled, setHardModeEnabled] = useState(false);
  const [leaderboardsEnabled, setLeaderboardsEnabled] = useState(true);
  const [userAvatar, setUserAvatar] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { correctAnswer: successHaptic, lightTap } = useHaptics();
  const { theme, toggleTheme, highContrast, toggleHighContrast, reduceMotion, toggleReduceMotion } =
    useTheme();
  const { syncStatus, toggleSync } = useUnifiedSync();
  const { user, refreshProfile } = useAuth();
  const { isActive: isSubscriptionActive, loading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    if (isOpen) {
      loadNotificationSettings();
      loadKeyboardLayout();
      loadHardModePreference();
      loadLeaderboardPreference();
      checkAppBannerVisibility();

      // Load user avatar if signed in
      if (user) {
        loadUserAvatar();
      }

      if (openPaywall) {
        setShowPaywall(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openPaywall, user]);

  const checkAppBannerVisibility = () => {
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

  const loadUserAvatar = async () => {
    if (!user?.id) return;

    try {
      // Mobile game dev best practice: Load from cache immediately to prevent flash
      const cacheKey = `user_avatar_${user.id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const cached = JSON.parse(cachedData);

          if (cached.timestamp && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            setUserAvatar(cached.data);
          }
        } catch (e) {
          // Invalid cache, continue with network fetch
          console.warn('[Settings] Invalid avatar cache:', e);
        }
      }

      // Fetch fresh data in background
      const profile = await avatarService.getUserProfileWithAvatar(user.id);
      setUserAvatar(profile);

      // Cache the result for future loads
      if (profile) {
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: profile,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          // Storage quota exceeded - non-critical, just log
          console.warn('[Settings] Failed to cache avatar data:', e);
        }
      }
    } catch (error) {
      console.error('[Settings] Failed to load user avatar:', error);
      // Fail silently - avatar is non-critical feature
    }
  };

  // Helper functions for horoscope
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const getZodiacSign = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const zodiacSigns = [
      { sign: 'Capricorn ♑', name: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19] },
      { sign: 'Aquarius ♒', name: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
      { sign: 'Pisces ♓', name: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
      { sign: 'Aries ♈', name: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
      { sign: 'Taurus ♉', name: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
      { sign: 'Gemini ♊', name: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
      { sign: 'Cancer ♋', name: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
      { sign: 'Leo ♌', name: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
      { sign: 'Virgo ♍', name: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
      { sign: 'Libra ♎', name: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
      { sign: 'Scorpio ♏', name: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
      { sign: 'Sagittarius ♐', name: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
    ];

    for (const zodiac of zodiacSigns) {
      const [startMonth, startDay] = zodiac.start;
      const [endMonth, endDay] = zodiac.end;

      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return { display: zodiac.sign, name: zodiac.name };
      }
    }

    return null;
  };

  // Get zodiac sign and horoscope
  const zodiacData = user?.created_at ? getZodiacSign(user.created_at) : null;
  const userTimezone = getUserTimezone();
  useHoroscope(zodiacData?.name, userTimezone);

  const handleAvatarChange = async (avatarId) => {
    setShowAvatarModal(false);
    if (avatarId) {
      // Invalidate cache when avatar changes
      const cacheKey = `user_avatar_${user.id}`;
      localStorage.removeItem(cacheKey);

      // Reload avatar in AuthContext (for global state like SidebarMenu)
      await refreshProfile();

      // Avatar was selected, reload avatar data for settings modal
      loadUserAvatar();
      successHaptic();
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

  return (
    <>
      <LeftSidePanel isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="550px">
        {/* Content wrapper with padding */}
        <div className="px-6 py-6">
          {/* iOS App Promotion Banner - Web Only */}
          {showAppBanner && !Capacitor.isNativePlatform() && (
            <div className="mb-6">
              <div
                className={`rounded-2xl border-[3px] p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] ${
                  highContrast
                    ? 'bg-hc-primary border-hc-border'
                    : 'bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 border-black dark:border-gray-600'
                }`}
              >
                {/* Content */}
                <div className="space-y-4">
                  {/* Header */}
                  <h3
                    className={`text-lg font-bold ${
                      highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Get the iOS App
                  </h3>

                  {/* Message */}
                  <p
                    className={`text-sm ${
                      highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Download Tandem Daily Games for iOS today to enjoy Ad-Free on iPhone and iPad.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3 pt-1">
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
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all border-[3px] whitespace-nowrap ${
                        highContrast
                          ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus hover:text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Section - Both iOS and Web */}
          <div className="mb-8">
            {/* Section Card */}
            <div
              className={`rounded-2xl border-[3px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] ${
                highContrast
                  ? 'border-hc-border bg-hc-surface'
                  : 'border-black dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Section Header */}
              <div
                className={`px-5 py-3 border-b-[3px] ${
                  highContrast ? 'border-hc-border' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  Subscription
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-5">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                  </div>
                ) : isSubscriptionActive ? (
                  <div className="space-y-3">
                    {/* Hard Mode Toggle - Only for Premium Users */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={handleHardModeToggle}
                        className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-black dark:border-gray-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                          highContrast
                            ? hardModeEnabled
                              ? 'bg-hc-primary'
                              : 'bg-hc-surface'
                            : hardModeEnabled
                              ? 'bg-gradient-to-r from-red-500 to-orange-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        role="switch"
                        aria-checked={hardModeEnabled}
                      >
                        <span
                          className={`${
                            hardModeEnabled ? 'translate-x-14' : 'translate-x-1'
                          } inline-block h-11 w-11 transform rounded-full border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                            highContrast
                              ? 'bg-hc-background'
                              : hardModeEnabled
                                ? 'bg-orange-600'
                                : 'bg-white dark:bg-gray-600'
                          }`}
                        >
                          <img
                            src={
                              theme === 'dark'
                                ? '/icons/ui/hardmode-dark.png'
                                : '/icons/ui/hardmode.png'
                            }
                            alt="Hard Mode"
                            className="w-6 h-6"
                          />
                        </span>
                      </button>
                      <p className={`text-sm font-medium mt-2 text-center ${
                        highContrast
                          ? 'text-hc-text'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}>
                        Hard Mode
                      </p>
                      <p className={`text-xs mt-1 text-center ${
                        highContrast
                          ? 'text-hc-text'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        3-min limit • No hints
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Only show promotional message when user is NOT logged in */}
                    {!user && (
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
                    )}

                    {/* Hard Mode - Disabled for non-subscribers */}
                    <div className="flex flex-col items-center opacity-60 cursor-not-allowed">
                      <div className="relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]">
                        <span className="translate-x-1 inline-block h-11 w-11 transform rounded-full border-[3px] border-gray-400 dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.3)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] bg-white dark:bg-gray-600 flex items-center justify-center">
                          <img
                            src={
                              theme === 'dark'
                                ? '/icons/ui/hardmode-dark.png'
                                : '/icons/ui/hardmode.png'
                            }
                            alt="Hard Mode"
                            className="w-6 h-6 opacity-50"
                          />
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-2 text-center text-gray-500 dark:text-gray-500">
                        Hard Mode
                      </p>
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full mt-1">
                        Tandem Unlimited
                      </span>
                      <p className="text-xs mt-1 text-center text-gray-400 dark:text-gray-500">
                        3-min limit • No hints
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* iCloud Sync Section */}
          {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && (
            <div className="mb-8">
              {/* Section Card */}
              <div
                className={`rounded-2xl border-[3px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,1)] ${
                  highContrast
                    ? 'border-hc-border bg-hc-surface'
                    : 'border-black dark:border-white bg-white dark:bg-gray-800'
                }`}
              >
                {/* Section Header */}
                <div
                  className={`px-5 py-3 border-b-[3px] ${
                    highContrast ? 'border-hc-border' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
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
                      <div className="flex flex-col items-center">
                        <button
                          onClick={async () => {
                            await toggleSync(!syncStatus.enabled);
                            lightTap();
                          }}
                          className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-black dark:border-gray-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                            highContrast
                              ? syncStatus.enabled
                                ? 'bg-hc-primary'
                                : 'bg-hc-surface'
                              : syncStatus.enabled
                                ? 'bg-gradient-to-r from-sky-400 to-blue-500'
                                : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          role="switch"
                          aria-checked={syncStatus.enabled}
                        >
                          <span
                            className={`${
                              syncStatus.enabled ? 'translate-x-14' : 'translate-x-1'
                            } inline-block h-11 w-11 transform rounded-full border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                              highContrast
                                ? 'bg-hc-background'
                                : syncStatus.enabled
                                  ? 'bg-blue-600'
                                  : 'bg-white dark:bg-gray-600'
                            }`}
                          >
                            <svg className="w-6 h-6 text-current" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                            </svg>
                          </span>
                        </button>
                        <p className={`text-sm font-medium mt-2 text-center ${
                          highContrast
                            ? 'text-hc-text'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          iCloud Sync
                        </p>
                        <p className={`text-xs mt-1 text-center px-4 ${
                          highContrast
                            ? 'text-hc-text'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Syncs stats across devices
                        </p>
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
                                ? 'Game Center'
                                : syncStatus.provider === 'cloudKit'
                                  ? 'iCloud'
                                  : 'Local Storage'}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sync Error */}
                      {syncStatus.error && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {syncStatus.error}
                          </p>
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
                className={`rounded-2xl border-[3px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,1)] ${
                  highContrast
                    ? 'border-hc-border bg-hc-surface'
                    : 'border-black dark:border-white bg-white dark:bg-gray-800'
                }`}
              >
                {/* Section Header */}
                <div
                  className={`px-5 py-3 border-b-[3px] ${
                    highContrast ? 'border-hc-border' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
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
                    <div className="flex flex-col items-center">
                      {/* Single Master Toggle - Following Apple HIG */}
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
                        className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-black dark:border-gray-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                          highContrast
                            ? notificationSettings.notificationsEnabled
                              ? 'bg-hc-primary'
                              : 'bg-hc-surface'
                            : notificationSettings.notificationsEnabled
                              ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        role="switch"
                        aria-checked={notificationSettings.notificationsEnabled}
                      >
                        <span
                          className={`${
                            notificationSettings.notificationsEnabled ? 'translate-x-14' : 'translate-x-1'
                          } inline-block h-11 w-11 transform rounded-full border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                            highContrast
                              ? 'bg-hc-background'
                              : notificationSettings.notificationsEnabled
                                ? 'bg-orange-600'
                                : 'bg-white dark:bg-gray-600'
                          }`}
                        >
                          <svg className="w-6 h-6 text-current" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                        </span>
                      </button>
                      <p className={`text-sm font-medium mt-2 text-center ${
                        highContrast
                          ? 'text-hc-text'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}>
                        Notifications
                      </p>
                      <p className={`text-xs mt-1 text-center px-4 ${
                        highContrast
                          ? 'text-hc-text'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        Daily streak reminders
                      </p>
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
                className={`rounded-2xl border-[3px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,1)] ${
                  highContrast
                    ? 'border-hc-border bg-hc-surface'
                    : 'border-black dark:border-white bg-white dark:bg-gray-800'
                }`}
              >
                {/* Section Header */}
                <div
                  className={`px-5 py-3 border-b-[3px] ${
                    highContrast ? 'border-hc-border' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
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
                  <div className="flex flex-col items-center">
                    <button
                      onClick={handleLeaderboardToggle}
                      className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-black dark:border-gray-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                        highContrast
                          ? leaderboardsEnabled
                            ? 'bg-hc-primary'
                            : 'bg-hc-surface'
                          : leaderboardsEnabled
                            ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      role="switch"
                      aria-checked={leaderboardsEnabled}
                    >
                      <span
                        className={`${
                          leaderboardsEnabled ? 'translate-x-14' : 'translate-x-1'
                        } inline-block h-11 w-11 transform rounded-full border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                          highContrast
                            ? 'bg-hc-background'
                            : leaderboardsEnabled
                              ? 'bg-green-600'
                              : 'bg-white dark:bg-gray-600'
                        }`}
                      >
                        <svg className="w-6 h-6 text-current" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                      </span>
                    </button>
                    <p className={`text-sm font-medium mt-2 text-center ${
                      highContrast
                        ? 'text-hc-text'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      Leaderboards
                    </p>
                    <p className={`text-xs mt-1 text-center px-4 ${
                      highContrast
                        ? 'text-hc-text'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Share scores globally
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Accessibility Section */}
          <div className="mb-8">
            {/* Section Card */}
            <div
              className={`rounded-2xl border-[3px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] ${
                highContrast
                  ? 'border-hc-border bg-hc-surface'
                  : 'border-black dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Section Header */}
              <div
                className={`px-5 py-3 border-b-[3px] ${
                  highContrast ? 'border-hc-border' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  Accessibility
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                {/* Theme Toggle */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      toggleTheme();
                      lightTap();
                    }}
                    className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-black dark:border-gray-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                      highContrast
                        ? theme === 'dark'
                          ? 'bg-hc-primary'
                          : 'bg-hc-surface'
                        : theme === 'dark'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                          : 'bg-gradient-to-r from-amber-400 to-yellow-500'
                    }`}
                    role="switch"
                    aria-checked={theme === 'dark'}
                  >
                    <span
                      className={`${
                        theme === 'dark' ? 'translate-x-14' : 'translate-x-1'
                      } inline-block h-11 w-11 transform rounded-full border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                        highContrast
                          ? 'bg-hc-background'
                          : theme === 'dark'
                            ? 'bg-purple-700'
                            : 'bg-yellow-600'
                      }`}
                    >
                      <img
                        src={theme === 'dark' ? '/icons/ui/dark-mode.png' : '/icons/ui/light-mode.png'}
                        alt={theme === 'dark' ? 'Dark mode' : 'Light mode'}
                        className="w-6 h-6"
                      />
                    </span>
                  </button>
                  <p className={`text-sm font-medium mt-2 text-center ${
                    highContrast
                      ? 'text-hc-text'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    Appearance
                  </p>
                </div>

                {/* High Contrast Toggle */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      toggleHighContrast();
                      lightTap();
                    }}
                    className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                      highContrast
                        ? 'bg-hc-primary border-hc-border'
                        : 'bg-gradient-to-r from-green-400 to-teal-500 border-black dark:border-gray-600'
                    }`}
                    role="switch"
                    aria-checked={highContrast}
                  >
                    <span
                      className={`${
                        highContrast ? 'translate-x-14' : 'translate-x-1'
                      } inline-block h-11 w-11 transform rounded-full border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                        highContrast
                          ? 'bg-hc-background border-hc-border'
                          : 'bg-teal-600 border-black dark:border-gray-600'
                      }`}
                    >
                      <img
                        src="/icons/ui/eye.png"
                        alt="High Contrast"
                        className="w-6 h-6"
                      />
                    </span>
                  </button>
                  <p className={`text-sm font-medium mt-2 text-center ${
                    highContrast
                      ? 'text-hc-text'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    High Contrast
                  </p>
                </div>

                {/* Reduce Motion Toggle */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      toggleReduceMotion();
                      lightTap();
                    }}
                    className={`relative inline-flex h-14 w-28 items-center rounded-full border-[3px] border-black dark:border-gray-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] ${
                      highContrast
                        ? reduceMotion
                          ? 'bg-hc-primary'
                          : 'bg-hc-surface'
                        : reduceMotion
                          ? 'bg-gradient-to-r from-purple-400 to-pink-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    role="switch"
                    aria-checked={reduceMotion}
                  >
                    <span
                      className={`${
                        reduceMotion ? 'translate-x-14' : 'translate-x-1'
                      } inline-block h-11 w-11 transform rounded-full border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-transform flex items-center justify-center ${
                        highContrast
                          ? 'bg-hc-background'
                          : reduceMotion
                            ? 'bg-pink-600'
                            : 'bg-white dark:bg-gray-600'
                      }`}
                    >
                      <img
                        src="/icons/ui/motion.png"
                        alt="Motion"
                        className="w-6 h-6"
                      />
                    </span>
                  </button>
                  <p className={`text-sm font-medium mt-2 text-center ${
                    highContrast
                      ? 'text-hc-text'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    Motion
                  </p>
                </div>
                </div>

                {/* Keyboard Layout Selection */}
                <div className="flex flex-col mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Keyboard Layout
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleKeyboardLayoutChange('QWERTY')}
                      className={`px-3 py-2 rounded-xl text-sm font-bold text-center transition-all border-[3px] flex items-center justify-center ${
                        highContrast
                          ? keyboardLayout === 'QWERTY'
                            ? 'bg-hc-primary text-white border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-hc-surface text-hc-text border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                          : keyboardLayout === 'QWERTY'
                            ? 'bg-sky-500 text-white border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      QWERTY
                    </button>
                    <button
                      onClick={() => handleKeyboardLayoutChange('QWERTZ')}
                      className={`px-3 py-2 rounded-xl text-sm font-bold text-center transition-all border-[3px] flex items-center justify-center ${
                        highContrast
                          ? keyboardLayout === 'QWERTZ'
                            ? 'bg-hc-primary text-white border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-hc-surface text-hc-text border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                          : keyboardLayout === 'QWERTZ'
                            ? 'bg-sky-500 text-white border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      QWERTZ
                    </button>
                    <button
                      onClick={() => handleKeyboardLayoutChange('AZERTY')}
                      className={`px-3 py-2 rounded-xl text-sm font-bold text-center transition-all border-[3px] flex items-center justify-center ${
                        highContrast
                          ? keyboardLayout === 'AZERTY'
                            ? 'bg-hc-primary text-white border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-hc-surface text-hc-text border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                          : keyboardLayout === 'AZERTY'
                            ? 'bg-sky-500 text-white border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      AZERTY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </LeftSidePanel>

      {/* Nested Panel - Paywall Modal at z-60 */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          loadSubscriptionInfo();
        }}
      />

      {/* Nested Panel - Avatar Selection Pane at z-60 */}
      <AvatarSelectionPane
        isOpen={showAvatarModal}
        onClose={handleAvatarChange}
        userId={user?.id}
        currentAvatarId={userAvatar?.selected_avatar_id}
        isFirstTime={false}
      />
    </>
  );
}
