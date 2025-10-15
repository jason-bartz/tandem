'use client';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Capacitor } from '@capacitor/core';
import notificationService from '@/services/notificationService';

export default function NotificationPermissionScreen({ onContinue, onSkip }) {
  const { highContrast } = useTheme();
  const { lightTap, playHaptic } = useHaptics();
  const [requesting, setRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    lightTap();
    setRequesting(true);

    try {
      // Only request permission on native platform
      if (Capacitor.isNativePlatform()) {
        const granted = await notificationService.requestPermission();
        if (granted) {
          // Schedule default notifications
          await notificationService.rescheduleAllNotifications();
          playHaptic('success');
        }
      }
      // Continue regardless of permission result
      onContinue();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      // Continue anyway - user can enable later in settings
      onContinue();
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = () => {
    lightTap();
    onSkip();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      {/* White Card Container */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
        {/* Hero Icon */}
        <div className="flex justify-center mb-8">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl ${
              highContrast
                ? 'bg-hc-primary/20 border-4 border-hc-border'
                : 'bg-sky-100 dark:bg-sky-900/30'
            }`}
          >
            🔔
          </div>
        </div>

        {/* Headline */}
        <h1
          className={`text-3xl font-bold text-center mb-4 ${
            highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
          }`}
        >
          Never Miss a Day
        </h1>

        {/* Subheadline */}
        <p
          className={`text-base text-center mb-10 ${
            highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Stay on top of your game with daily reminders
        </p>

        {/* Benefits List */}
        <div className="w-full space-y-4 mb-10">
          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                highContrast
                  ? 'bg-hc-primary text-white border-2 border-hc-border'
                  : 'bg-sky-500 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p
                className={`text-base font-medium ${
                  highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                }`}
              >
                Get reminded to play your daily puzzle
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                highContrast
                  ? 'bg-hc-primary text-white border-2 border-hc-border'
                  : 'bg-sky-500 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p
                className={`text-base font-medium ${
                  highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                }`}
              >
                Protect your winning streak
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                highContrast
                  ? 'bg-hc-primary text-white border-2 border-hc-border'
                  : 'bg-sky-500 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p
                className={`text-base font-medium ${
                  highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                }`}
              >
                Choose your notification time in Settings
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 mb-6">
          {/* Primary: Enable Notifications */}
          <button
            onClick={handleEnableNotifications}
            disabled={requesting}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-98 ${
              highContrast
                ? 'bg-hc-primary text-white border-4 border-hc-border hover:bg-hc-focus disabled:opacity-50'
                : 'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 shadow-lg hover:shadow-xl disabled:opacity-50'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {requesting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Enabling...
              </span>
            ) : (
              'Enable Notifications'
            )}
          </button>

          {/* Secondary: Not Now */}
          <button
            onClick={handleSkip}
            disabled={requesting}
            className={`w-full py-4 rounded-2xl font-medium text-base transition-all active:scale-98 ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-2 border-hc-border hover:bg-hc-focus/10 disabled:opacity-50'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Not Now
          </button>
        </div>

        {/* Helper Text */}
        <p
          className={`text-xs text-center ${
            highContrast ? 'text-hc-text/70' : 'text-gray-500 dark:text-gray-500'
          }`}
        >
          You can change this anytime in Settings
        </p>
      </div>
    </div>
  );
}
