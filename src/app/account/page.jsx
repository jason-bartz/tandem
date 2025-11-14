'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHoroscope } from '@/hooks/useHoroscope';
import subscriptionService from '@/services/subscriptionService';
import avatarService from '@/services/avatar.service';
import { Capacitor } from '@capacitor/core';
import { useHaptics } from '@/hooks/useHaptics';
import Link from 'next/link';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import PaywallModal from '@/components/PaywallModal';
import AvatarSelectionModal from '@/components/AvatarSelectionModal';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import { validateUsername } from '@/utils/profanityFilter';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { highContrast } = useTheme();
  const { correctAnswer: successHaptic, lightTap } = useHaptics();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [appleRefreshToken, setAppleRefreshToken] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Load user avatar and username
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.id) return;

      try {
        setLoadingAvatar(true);
        const profile = await avatarService.getUserProfileWithAvatar(user.id);
        setUserAvatar(profile);

        // Also load username from the profile
        if (profile?.username) {
          setUsername(profile.username);
        }
      } catch (error) {
        // Fail silently - avatar and username loading is non-critical
        // eslint-disable-next-line no-console
        console.error('[Account] Failed to load user avatar:', error);
        // Fail silently - avatar is non-critical feature
      } finally {
        setLoadingAvatar(false);
      }
    };

    if (user) {
      loadAvatar();
    }
  }, [user]);

  const handleAvatarChange = (avatarId) => {
    setShowAvatarModal(false);
    if (avatarId) {
      // Avatar was selected, reload avatar data
      successHaptic();
      // Reload avatar
      avatarService
        .getUserProfileWithAvatar(user.id)
        .then(setUserAvatar)
        .catch((error) => console.error('[Account] Failed to reload avatar:', error));
    }
  };

  const handleEditUsername = () => {
    setUsernameInput(username || '');
    setEditingUsername(true);
    setUsernameError('');
    setUsernameSuccess('');
    lightTap();
  };

  const handleCancelEditUsername = () => {
    setEditingUsername(false);
    setUsernameInput('');
    setUsernameError('');
    setUsernameSuccess('');
    lightTap();
  };

  const handleSaveUsername = async () => {
    setUsernameError('');
    setUsernameSuccess('');

    // Validate username with comprehensive profanity filter
    const usernameValidation = validateUsername(usernameInput);
    if (!usernameValidation.valid) {
      setUsernameError(usernameValidation.error);
      return;
    }

    try {
      setLoadingUsername(true);

      // Import API config helpers for iOS compatibility
      const { capacitorFetch, getApiUrl } = await import('@/lib/api-config');
      const apiUrl = getApiUrl('/api/account/username');

      const response = await capacitorFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUsernameError(data.error || 'Failed to update username');
        return;
      }

      // Success
      setUsername(data.username);
      setUsernameSuccess('Username updated successfully!');
      setEditingUsername(false);
      successHaptic();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUsernameSuccess('');
      }, 3000);
    } catch (error) {
      console.error('[Account] Failed to update username:', error);
      setUsernameError('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingUsername(false);
    }
  };

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
    // eslint-disable-next-line no-console
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
      <div className="min-h-screen flex items-center justify-center bg-accent-yellow">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent"></div>
      </div>
    );
  }

  if (!user && isWeb) {
    return null; // Will redirect
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-accent-yellow">
        {/* Scrollable content container */}
        <div className="min-h-screen flex items-center justify-center py-6">
          <div className="w-full max-w-2xl mx-auto p-6 relative z-10 my-auto">
            <div className="relative">
              {/* Main content card */}
              <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                {/* Header with back button, title, and hamburger menu */}
                <div className="flex items-start justify-between p-6 pb-4 border-b-[3px] border-black dark:border-white">
                  <Link
                    href="/"
                    className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
                    aria-label="Back to game"
                  >
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-gray-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </Link>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Account</h1>
                  <HamburgerMenu
                    isOpen={isSidebarOpen}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Profile</h2>

          <div className="space-y-3">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-3">
              {!loadingAvatar ? (
                <>
                  <button
                    onClick={() => {
                      setShowAvatarModal(true);
                      lightTap();
                    }}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border-[2px] border-purple-500 shadow-[3px_3px_0px_rgba(147,51,234,0.5)] mb-2 hover:scale-105 transition-transform"
                    aria-label={userAvatar?.selected_avatar_id ? 'Change avatar' : 'Select avatar'}
                  >
                    <Image
                      src={
                        userAvatar?.selected_avatar_id && userAvatar?.avatar_image_path
                          ? userAvatar.avatar_image_path
                          : '/images/avatars/default-profile.png'
                      }
                      alt={userAvatar?.avatar_display_name || 'Profile'}
                      fill
                      className="object-cover"
                      sizes="64px"
                      priority
                    />
                  </button>
                  {userAvatar?.avatar_display_name && (
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {userAvatar.avatar_display_name}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setShowAvatarModal(true);
                      lightTap();
                    }}
                    className={`text-xs font-medium hover:underline ${
                      userAvatar?.selected_avatar_id ? 'text-purple-600 dark:text-purple-400' : ''
                    }`}
                  >
                    {userAvatar?.selected_avatar_id ? 'Change Avatar' : ''}
                  </button>
                  {!userAvatar?.selected_avatar_id && (
                    <button
                      onClick={() => {
                        setShowAvatarModal(true);
                        lightTap();
                      }}
                      className={`py-1.5 px-3 rounded-lg border-[2px] font-medium text-xs transition-all mt-1 ${
                        highContrast
                          ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      Select Your Avatar
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse mb-2"></div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading avatar...</p>
                </>
              )}
            </div>

            {/* Username Section */}
            <div className="pt-3 border-t-[2px] border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                {!editingUsername && (
                  <button
                    onClick={handleEditUsername}
                    className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingUsername ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      // Only allow alphanumeric and underscore
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                      setUsernameInput(sanitized);
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="your_username"
                    minLength={3}
                    maxLength={20}
                    disabled={loadingUsername}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    3-20 characters, letters, numbers, and underscores only
                  </p>

                  {usernameError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-400">{usernameError}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveUsername}
                      disabled={loadingUsername}
                      className={`flex-1 py-2 px-3 rounded-xl border-[2px] font-medium text-sm transition-all ${
                        loadingUsername
                          ? 'opacity-50 cursor-not-allowed'
                          : highContrast
                            ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      {loadingUsername ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEditUsername}
                      disabled={loadingUsername}
                      className={`flex-1 py-2 px-3 rounded-xl border-[2px] font-medium text-sm transition-all ${
                        loadingUsername
                          ? 'opacity-50 cursor-not-allowed'
                          : highContrast
                            ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {username || 'Not set'}
                  </p>
                  {usernameSuccess && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {usernameSuccess}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.email || 'Not available'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account ID</p>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
                {user?.id || 'Not available'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Timezone</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{userTimezone}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Anniversary</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {formatDate(user?.created_at)}
              </p>
            </div>

            {zodiacData && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tandem Zodiac Sign</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {zodiacData.display}
                </p>
              </div>
            )}

            {/* Daily Horoscope */}
            {zodiacData && (
              <div className="pt-4 mt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Today&apos;s Tandem Horoscope
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

                  {/* Subscription Section */}
                  <div className="pt-8 border-t-[3px] border-black dark:border-white">
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
            </div>
          ) : subscription?.isActive ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
            <div className="py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
                You don't have an active subscription
              </p>

              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 text-center">
                Become a Tandem Unlimited Member
              </h3>

              {/* Benefits List */}
              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-base font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Archive access for all past puzzles (Daily Tandem and Daily Cryptic)
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-base font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Sync and save your progress across devices
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-base font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Ad-free experience</p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-base font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Access to Hard Mode and future exclusive features
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-base font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Support a solo developer to keep building great puzzles
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-green-500 text-base font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Cancel anytime</p>
                </div>
              </div>

              <button
                onClick={() => setShowPaywall(true)}
                className={`w-full py-3 px-6 rounded-2xl border-[3px] font-semibold transition-all ${
                  highContrast
                    ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-teal-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Become a Member
              </button>
            </div>
          )}
                  </div>

        {/* Benefits Section (if subscribed) */}
        {subscription?.isActive && (
                  <div className="pt-6 border-t-[3px] border-black dark:border-white">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Your Benefits
            </h2>

            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Unlimited Archive Access
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Play all past puzzles for both Tandem emoji word puzzle and Daily Cryptic
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Access to Hard Mode and Future Exclusive Features
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Challenge yourself with time limits and more
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
                    Help keep building great puzzles
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-accent-green/10 border-2 border-accent-green/30 rounded-2xl p-4 text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                💚 Your subscription keeps the daily puzzle free for everyone to play!
              </p>
            </div>
          </div>
        )}

                  {/* Sign Out Section */}
                  <div className="pt-6 border-t-[3px] border-black dark:border-white">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Account Actions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Sign out of your account</p>

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
                  </div>

                  {/* Danger Zone Section */}
                  <div className="pt-8 border-t-[3px] border-red-500">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Irreversible account actions
          </p>

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
                  </div>
                </div>
              </div>

              {/* Neo-brutalist shadow element */}
              <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
            </div>
          </div>
        </div>

        {/* Sidebar Menu */}
        <SidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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

      {/* Avatar Selection Modal */}
      <AvatarSelectionModal
        isOpen={showAvatarModal}
        onClose={handleAvatarChange}
        userId={user?.id}
        currentAvatarId={userAvatar?.selected_avatar_id}
        isFirstTime={false}
      />
    </>
  );
}
