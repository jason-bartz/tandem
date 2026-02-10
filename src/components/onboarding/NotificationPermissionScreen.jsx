'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Capacitor } from '@capacitor/core';
import notificationService from '@/services/notificationService';
import logger from '@/lib/logger';

export default function NotificationPermissionScreen({ onContinue, onSkip }) {
  const { highContrast } = useTheme();
  const { lightTap, playHaptic } = useHaptics();
  const [requesting, setRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    lightTap();
    setRequesting(true);

    try {
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
      logger.error('Failed to request notification permission:', error);
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
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn bg-accent-yellow">
      {/* White Card Container - Neo Brutalist Style */}
      <div
        className={`w-full max-w-md rounded-[24px] p-8 ${
          highContrast
            ? 'bg-hc-surface border-[4px] border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-ghost-white dark:bg-gray-900 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Hero Icon */}
        <div className="flex justify-center mb-8">
          <div
            className={`w-24 h-24 rounded-2xl flex items-center justify-center ${
              highContrast
                ? 'bg-hc-primary/20 border-[4px] border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-sky-100 dark:bg-sky-900/30 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            <Image src="/ui/shared/bell.png" alt="Notifications" width={56} height={56} />
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                highContrast
                  ? 'bg-hc-primary text-white border-[3px] border-hc-border'
                  : 'bg-sky-500 text-white border-[2px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
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
                Get a friendly daily reminder each morning
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                highContrast
                  ? 'bg-hc-primary text-white border-[3px] border-hc-border'
                  : 'bg-sky-500 text-white border-[2px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
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
                Four fresh puzzles waiting each day
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                highContrast
                  ? 'bg-hc-primary text-white border-[3px] border-hc-border'
                  : 'bg-sky-500 text-white border-[2px] border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
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
                Keep your streak going strong
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
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              highContrast
                ? 'bg-hc-primary text-white border-[4px] border-hc-border hover:bg-hc-focus disabled:opacity-50 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-sky-500 text-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none disabled:opacity-50'
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
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-[4px] border-hc-border hover:bg-hc-focus/10 disabled:opacity-50 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none disabled:opacity-50'
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
