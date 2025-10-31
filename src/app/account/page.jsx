'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHoroscope } from '@/hooks/useHoroscope';
import subscriptionService from '@/services/subscriptionService';
import { Capacitor } from '@capacitor/core';
import Link from 'next/link';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import PaywallModal from '@/components/PaywallModal';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { highContrast } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [appleRefreshToken, setAppleRefreshToken] = useState(null);
  const platform = Capacitor.getPlatform();
  const isWeb = platform === 'web';

  // Redirect to home if not authenticated (web only)
  // iOS users access this page from within the app after signing in via Settings
  useEffect(() => {
    if (!authLoading && !user && isWeb) {
      router.push('/?auth=required');
    }
  }, [user, authLoading, router, isWeb]);

  // Load subscription status
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        setLoading(true);
        await subscriptionService.initialize();
        const status = await subscriptionService.getSubscriptionStatus();
        setSubscription(status);
      } catch (error) {
        console.error('Failed to load subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadSubscription();
    }
  }, [user]);

  const handleManageAccount = () => {
    // Open Stripe billing portal directly
    window.open('https://billing.stripe.com/p/login/14A14ncFW5L43do7ij8ww00', '_blank');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    // Load account deletion info and Apple authorization code if applicable
    try {
      // Get Apple authorization code from Preferences if iOS
      if (!isWeb) {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          const result = await Preferences.get({ key: 'apple_authorization_code' });
          if (result.value) {
            setAppleRefreshToken(result.value); // Using same state for authorization code
          }
        } catch (error) {
          console.error('[Account] Failed to get Apple authorization code:', error);
        }
      }

      // Prepare account info for modal
      setAccountInfo({
        email: user?.email,
        hasActiveSubscription: subscription?.isActive || false,
      });

      setShowDeleteModal(true);
    } catch (error) {
      console.error('[Account] Failed to prepare deletion:', error);
      alert('Failed to open account deletion. Please try again.');
    }
  };

  const handleDeleteSuccess = async (response) => {
    // Account deleted successfully
    console.log('[Account] Deletion successful:', response);

    // Show success message if needed
    if (response.subscription?.warning) {
      alert(
        `Account deleted successfully.\n\n${response.subscription.warning}\n\n${response.subscription.action}`
      );
    }

    // Sign out and redirect to home
    await signOut();
    router.push('/');
  };

  const handlePurchaseComplete = async () => {
    // Reload subscription status after purchase
    try {
      await subscriptionService.initialize();
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscription(status);
      setShowPaywall(false);
    } catch (error) {
      console.error('Failed to reload subscription:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Unknown';
    }
  };

  const getZodiacSign = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11

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

  // Get zodiac sign data for horoscope
  const zodiacData = user?.created_at ? getZodiacSign(user.created_at) : null;
  const userTimezone = getUserTimezone();

  // Fetch daily horoscope
  const { horoscope, loading: horoscopeLoading } = useHoroscope(zodiacData?.name, userTimezone);

  const getTierName = (tier) => {
    if (!tier) return 'Tandem Unlimited';

    // Handle both short names and full iOS bundle IDs
    const tierLower = tier.toLowerCase();

    const tiers = {
      buddypass: '🤝 Buddy Pass',
      'com.tandemdaily.app.buddypass': '🤝 Buddy Pass',
      bestfriends: '👯 Best Friends',
      'com.tandemdaily.app.bestfriends': '👯 Best Friends',
      soulmates: '💕 Soulmates',
      'com.tandemdaily.app.soulmates': '💕 Soulmates',
    };

    return tiers[tierLower] || tiers[tier] || 'Tandem Unlimited';
  };

  const getTierDescription = (tier) => {
    if (!tier) return '';

    // Handle both short names and full iOS bundle IDs
    const tierLower = tier.toLowerCase();

    const descriptions = {
      buddypass: 'Monthly subscription',
      'com.tandemdaily.app.buddypass': 'Monthly subscription',
      bestfriends: 'Yearly subscription',
      'com.tandemdaily.app.bestfriends': 'Yearly subscription',
      soulmates: 'Lifetime access',
      'com.tandemdaily.app.soulmates': 'Lifetime access',
    };

    return descriptions[tierLower] || descriptions[tier] || '';
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-purple-400 to-pink-400 dark:from-sky-900 dark:via-purple-900 dark:to-pink-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (!user && isWeb) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-purple-400 to-pink-400 dark:from-sky-900 dark:via-purple-900 dark:to-pink-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* Back button */}
          <Link
            href="/"
            className={`inline-block px-4 py-2 rounded-xl border-[3px] font-semibold transition-all mb-4 ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
            }`}
          >
            ← Back to Game
          </Link>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,0.5)] text-center">
            Account
          </h1>
        </div>

        {/* Account Info Card */}
        <div
          className={`rounded-[32px] border-[3px] p-6 mb-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600'
          }`}
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Profile</h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {user?.email || 'Not available'}
              </p>
            </div>

            {user?.user_metadata?.full_name && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {user.user_metadata.full_name}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Anniversary</p>
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {formatDate(user?.created_at)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Timezone</p>
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{userTimezone}</p>
            </div>

            {zodiacData && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tandem Zodiac Sign</p>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {zodiacData.display}
                </p>
              </div>
            )}

            {/* Daily Horoscope */}
            {zodiacData && (
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Today&apos;s Horoscope
                </p>
                {horoscopeLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-sky-500 border-t-transparent"></div>
                  </div>
                ) : horoscope ? (
                  <div
                    className={`p-4 rounded-2xl border-2 ${
                      highContrast
                        ? 'bg-hc-focus/10 border-hc-border'
                        : 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 italic">
                      {horoscope.text}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Horoscope unavailable
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Subscription Card */}
        <div
          className={`rounded-[32px] border-[3px] p-6 mb-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] ${
            subscription?.isActive
              ? highContrast
                ? 'bg-hc-surface border-hc-success'
                : 'bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-900/30 dark:to-sky-900/30 border-teal-500'
              : highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Subscription</h2>
            {subscription?.isActive && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                ACTIVE
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
            </div>
          ) : subscription?.isActive ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {getTierName(subscription.tier || subscription.productId)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getTierDescription(subscription.tier || subscription.productId)}
                </p>
              </div>

              {subscription.expiryDate &&
                subscription.expiryDate !== '2099-12-31T00:00:00.000Z' && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {subscription.cancelAtPeriodEnd ? 'Expires on' : 'Renews on'}
                    </p>
                    <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                      {formatDate(subscription.expiryDate)}
                    </p>
                    {subscription.cancelAtPeriodEnd && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        Your subscription will not renew
                      </p>
                    )}
                  </div>
                )}

              {/* Manage Account Button */}
              {isWeb && (
                <div className="space-y-3">
                  <button
                    onClick={handleManageAccount}
                    className={`w-full py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
                      highContrast
                        ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                        : 'bg-sky-500 text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    Manage Subscription
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Access the full Stripe portal to manage your subscription, payment method,
                    billing history, and cancel if needed
                  </p>
                </div>
              )}

              {!isWeb && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Manage your subscription through the App Store
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You don't have an active subscription
              </p>
              <button
                onClick={() => setShowPaywall(true)}
                className={`py-3 px-6 rounded-2xl border-[3px] font-semibold transition-all ${
                  highContrast
                    ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-gradient-to-r from-teal-500 to-sky-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Get Tandem Unlimited
              </button>
            </div>
          )}
        </div>

        {/* Benefits Card (if subscribed) */}
        {subscription?.isActive && (
          <div
            className={`rounded-[32px] border-[3px] p-6 mb-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600'
            }`}
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Your Benefits
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Unlimited Archive Access
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Play any puzzle from day one
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Access to Hard Mode and Future Exclusive Modes and Features
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Challenge yourself with time limits
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">Ad-Free</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Uninterrupted puzzle experience
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Support a Solo Developer
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help keep Tandem running
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone - Account Actions */}
        <div
          className={`rounded-[32px] border-[3px] p-6 mb-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] ${
            highContrast
              ? 'bg-hc-surface border-hc-error'
              : 'bg-white dark:bg-gray-800 border-red-500'
          }`}
        >
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Irreversible account actions
          </p>

          <div className="space-y-3">
            {/* Delete Account Button */}
            <button
              onClick={handleDeleteAccount}
              className={`w-full py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
                highContrast
                  ? 'bg-hc-error text-white border-hc-border hover:bg-red-700 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-red-600 text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Delete Account
            </button>

            {/* Sign Out Button */}
            {isWeb && (
              <button
                onClick={handleSignOut}
                className={`w-full py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-white/80 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
            Questions? Contact{' '}
            <a href="mailto:support@tandemdaily.com" className="underline hover:text-white">
              support@tandemdaily.com
            </a>
          </p>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteSuccess}
        accountInfo={accountInfo}
        appleRefreshToken={appleRefreshToken}
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}
