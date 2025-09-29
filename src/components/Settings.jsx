'use client';
import { useState, useEffect } from 'react';
import subscriptionService from '@/services/subscriptionService';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor } from '@capacitor/core';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';

export default function Settings({ isOpen, onClose }) {
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { playHaptic } = useHaptics();
  const { theme, toggleTheme, highContrast, toggleHighContrast } = useTheme();

  useEffect(() => {
    if (isOpen) {
      loadSubscriptionInfo();
    }
  }, [isOpen]);

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

  const handleRestore = async () => {
    setLoading(true);
    try {
      const restored = await subscriptionService.restorePurchases();

      if (restored) {
        playHaptic('success');
        await loadSubscriptionInfo();
        alert('Purchases restored successfully!');
      } else {
        alert('No purchases found to restore.');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      alert('Failed to restore purchases. Please try again.');
      playHaptic('error');
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
      'com.tandemdaily.app.buddypass': { name: 'Buddy Pass', emoji: '🤝' },
      'com.tandemdaily.app.bestfriends': { name: 'Best Friends', emoji: '👯' },
      'com.tandemdaily.app.soulmates': { name: 'Soulmates', emoji: '💕' },
    };

    return tierMap[subscriptionInfo.productId] || { name: 'Premium', emoji: '✨' };
  };

  if (!isOpen) {
    return null;
  }

  const tier = getSubscriptionTier();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
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
              <div className="bg-gradient-to-br from-sky-50 to-teal-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tier?.emoji}</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{tier?.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Active Subscription
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

                {subscriptionInfo.expiryDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {subscriptionInfo.productId.includes('soulmates')
                      ? 'Lifetime access'
                      : `Renews ${formatDate(subscriptionInfo.expiryDate)}`}
                  </p>
                )}

                <button
                  onClick={handleManageSubscription}
                  className="w-full py-2 text-sky-600 dark:text-sky-400 text-sm font-medium hover:underline"
                >
                  Manage Subscription
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

                <button
                  onClick={handleRestore}
                  disabled={loading}
                  className="w-full py-2 text-sky-600 dark:text-sky-400 text-sm font-medium hover:underline disabled:opacity-50"
                >
                  Restore Purchase
                </button>
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
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reduce eye strain</p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-600 transition-colors"
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <span
                  className={`${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
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
                onClick={toggleHighContrast}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-600 transition-colors"
                role="switch"
                aria-checked={highContrast}
              >
                <span
                  className={`${
                    highContrast ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">About</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 Good Vibes Games</p>
            <div className="flex gap-4 pt-2">
              <a href="/terms" className="text-sky-600 dark:text-sky-400 hover:underline">
                Terms
              </a>
              <a href="/privacypolicy" className="text-sky-600 dark:text-sky-400 hover:underline">
                Privacy
              </a>
              <a
                href="https://tandemdaily.com/support"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                Support
              </a>
            </div>
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
