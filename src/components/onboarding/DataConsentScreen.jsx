'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS } from '@/lib/constants';
import Image from 'next/image';

export default function DataConsentScreen({ onContinue, onSkip }) {
  const { theme, highContrast } = useTheme();
  const { lightTap } = useHaptics();

  const handlePrivacyPolicyClick = async () => {
    lightTap();
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: 'https://tandemdaily.com/privacypolicy' });
    } else {
      window.open('/privacypolicy', '_blank');
    }
  };

  const handleContinue = async () => {
    lightTap();
    // Enable leaderboards
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({
          key: STORAGE_KEYS.LEADERBOARDS_ENABLED,
          value: 'true',
        });
      } else {
        localStorage.setItem(STORAGE_KEYS.LEADERBOARDS_ENABLED, 'true');
      }
    } catch (error) {
      console.error('Failed to save leaderboard preference:', error);
    }
    onContinue();
  };

  const handleMaybeLater = async () => {
    lightTap();
    // Disable leaderboards
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({
          key: STORAGE_KEYS.LEADERBOARDS_ENABLED,
          value: 'false',
        });
      } else {
        localStorage.setItem(STORAGE_KEYS.LEADERBOARDS_ENABLED, 'false');
      }
    } catch (error) {
      console.error('Failed to save leaderboard preference:', error);
    }
    onSkip();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      {/* White Card Container */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 relative">
            <Image
              src={theme === 'dark' ? '/images/dark-mode-logo.webp' : '/images/main-logo.webp'}
              alt="Tandem Logo"
              width={96}
              height={96}
              className="rounded-2xl"
              priority
            />
          </div>
        </div>

        {/* Headline */}
        <h1
          className={`text-3xl font-bold text-center mb-4 ${
            highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
          }`}
        >
          Unlock Leaderboards
        </h1>

        {/* Subheadline */}
        <p
          className={`text-base text-center mb-10 ${
            highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Connect with Game Center to track your progress and compete with others
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
                Track your streaks and compete on global leaderboards
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
                Your gameplay scores are saved to our servers to track your progress
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="w-full mb-6">
          <p
            className={`text-xs text-center ${
              highContrast ? 'text-hc-text/70' : 'text-gray-500 dark:text-gray-500'
            }`}
          >
            We never collect personal information like names or email addresses.{' '}
            <button
              onClick={handlePrivacyPolicyClick}
              className={`underline font-medium ${
                highContrast ? 'text-hc-primary' : 'text-sky-600 dark:text-sky-400'
              }`}
            >
              View Privacy Policy
            </button>
          </p>
        </div>

        {/* Continue Button */}
        <div className="w-full mb-3">
          <button
            onClick={handleContinue}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-98 ${
              highContrast
                ? 'bg-hc-primary text-white border-4 border-hc-border hover:bg-hc-focus'
                : 'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 shadow-lg hover:shadow-xl'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Continue
          </button>
        </div>

        {/* Maybe Later Link */}
        <div className="w-full text-center">
          <button
            onClick={handleMaybeLater}
            className={`text-sm font-medium transition-colors ${
              highContrast
                ? 'text-hc-text/70 hover:text-hc-text'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
