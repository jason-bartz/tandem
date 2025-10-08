'use client';
import { useState, useEffect } from 'react';
import subscriptionService from '@/services/subscriptionService';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor } from '@capacitor/core';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import notificationService from '@/services/notificationService';
import { useCloudKitSync } from '@/hooks/useCloudKitSync';

export default function Settings({ isOpen, onClose }) {
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [keyboardLayout, setKeyboardLayout] = useState('QWERTY');
  const { playHaptic, lightTap } = useHaptics();
  const { theme, toggleTheme, highContrast, toggleHighContrast, setThemeMode, isAuto } = useTheme();
  const { syncStatus, toggleSync } = useCloudKitSync();

  useEffect(() => {
    if (isOpen) {
      loadSubscriptionInfo();
      loadNotificationSettings();
      loadKeyboardLayout();
    }
  }, [isOpen]);

  const loadKeyboardLayout = () => {
    const saved = localStorage.getItem('keyboardLayout');
    if (saved) {
      setKeyboardLayout(saved);
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
      const status = await subscriptionService.loadSubscriptionStatus();
      setSubscriptionInfo(status);
    } catch (error) {
      console.error('Failed to load subscription info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = () => {
    // Opens iOS subscription management in Settings app
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) {
      return null;
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSubscriptionTier = () => {
    if (!subscriptionInfo?.productId) {
      return null;
    }

    const tierMap = {
      'com.tandemdaily.app.buddypass': { name: 'Buddy Pass', emoji: '🤝', type: 'subscription' },
      'com.tandemdaily.app.bestfriends': {
        name: 'Best Friends',
        emoji: '👯',
        type: 'subscription',
      },
      'com.tandemdaily.app.soulmates': { name: 'Soulmates', emoji: '💕', type: 'lifetime' },
    };

    return (
      tierMap[subscriptionInfo.productId] || { name: 'Premium', emoji: '✨', type: 'subscription' }
    );
  };

  if (!isOpen) {
    return null;
  }

  const tier = getSubscriptionTier();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Settings</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full border-none text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-2 border-hc-border hover:bg-hc-primary hover:text-white font-bold'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Subscription Section */}
        {Capacitor.isNativePlatform() && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Subscription
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
              </div>
            ) : subscriptionInfo?.isActive ? (
              <div className="space-y-3">
                {/* Premium Badge */}
                <div className="bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-2xl">✨</span>
                    <p className="text-white font-bold text-lg">Tandem Unlimited</p>
                  </div>
                  <p className="text-white/90 text-sm">Active Player</p>
                </div>

                {/* Subscription Details */}
                <div className="bg-gradient-to-br from-sky-50 to-teal-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tier?.emoji}</span>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {tier?.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {tier?.type === 'lifetime' ? 'Lifetime access' : 'Active Subscription'}
                        </p>
                      </div>
                    </div>
                    <div className="text-green-500">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {subscriptionInfo.expiryDate && tier?.type !== 'lifetime' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Renews {formatDate(subscriptionInfo.expiryDate)}
                    </p>
                  )}

                  <button
                    onClick={handleManageSubscription}
                    className="w-full py-2 text-sky-600 dark:text-sky-400 text-sm font-medium hover:underline"
                  >
                    Manage Subscription
                  </button>
                </div>

                {/* View Plans Button */}
                <button
                  onClick={() => setShowPaywall(true)}
                  className="w-full py-2 bg-white dark:bg-gray-700 border-2 border-sky-200 dark:border-sky-700 text-sky-600 dark:text-sky-400 font-semibold rounded-lg hover:bg-sky-50 dark:hover:bg-gray-600 transition-all"
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
                    className="w-full py-2 bg-gradient-to-r from-sky-500 to-teal-400 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    View Plans
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* iCloud Sync Section */}
        {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              iCloud Sync
            </h3>

            <div className="space-y-4">
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

                  {/* Last Sync Time */}
                  {syncStatus.enabled && syncStatus.lastSync && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
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
        )}

        {/* Notifications Section */}
        {Capacitor.isNativePlatform() && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Notifications
            </h3>
            {notificationPermission === false ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-4">
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
                      await notificationService.updateSettings({ notifications_enabled: newValue });
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
        )}

        {/* Accessibility Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Accessibility
          </h3>
          <div className="space-y-4">
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

        {/* Copyright and Links */}
        <div className="mb-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">© 2025 Good Vibes Games</p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <a
              href="/privacypolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                window.open('/privacypolicy', '_blank');
              }}
            >
              Privacy Policy
            </a>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <a
              href="/support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                window.open('/support', '_blank');
              }}
            >
              Support
            </a>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
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
