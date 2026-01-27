'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useHoroscope } from '@/hooks/useHoroscope';
import subscriptionService from '@/services/subscriptionService';
import avatarService from '@/services/avatar.service';
import { Capacitor } from '@capacitor/core';
import { useHaptics } from '@/hooks/useHaptics';
import Link from 'next/link';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import PaywallModal from '@/components/PaywallModal';
import AvatarSelectionPane from '@/components/AvatarSelectionPane';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';
import { validateUsername } from '@/utils/profanityFilter';
import logger from '@/lib/logger';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut, refreshProfile, userProfile } = useAuth();
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
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
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
        logger.error('Failed to load subscription', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadSubscription();
    }
  }, [user]);

  // Load user avatar and username from local fetch
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
        logger.error('[Account] Failed to load user avatar', error);
        // Fail silently - avatar is non-critical feature
      } finally {
        setLoadingAvatar(false);
      }
    };

    if (user) {
      loadAvatar();
    }
  }, [user]);

  // Sync with AuthContext userProfile when it changes (e.g., after first-time setup)
  // This ensures the account page shows fresh data after username/avatar selection
  useEffect(() => {
    if (userProfile) {
      // Update local avatar state from AuthContext profile
      setUserAvatar((prev) => ({
        ...prev,
        selected_avatar_id: userProfile.selected_avatar_id,
        avatar_image_path: userProfile.avatar_image_path,
        avatar_display_name: userProfile.avatar_display_name,
      }));

      // Update username from AuthContext profile
      if (userProfile.username) {
        setUsername(userProfile.username);
      }
    }
  }, [userProfile]);

  const handleAvatarChange = async (avatarId) => {
    setShowAvatarModal(false);
    if (avatarId) {
      // Avatar was selected, reload avatar data
      successHaptic();

      // Reload avatar in AuthContext (for global state like SidebarMenu)
      await refreshProfile();

      // Reload avatar for local account page display
      avatarService
        .getUserProfileWithAvatar(user.id)
        .then(setUserAvatar)
        .catch((error) => logger.error('[Account] Failed to reload avatar', error));
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

      // Refresh profile in AuthContext to update sidebar display
      await refreshProfile();

      setTimeout(() => {
        setUsernameSuccess('');
      }, 3000);
    } catch (error) {
      logger.error('[Account] Failed to update username', error);
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
      logger.error('Failed to sign out', error);
      // Force clear on iOS if normal sign out fails
      if (!isWeb) {
        await forceLogout();
      }
    }
  };

  // Force logout - clears ALL local data (for corrupted sessions)
  const forceLogout = async () => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.clear();
      logger.info('[Account] Force cleared all preferences');
      // Clear localStorage too
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      router.push('/');
      // Force reload to clear React state
      window.location.reload();
    } catch (error) {
      logger.error('[Account] Force logout failed', error);
      // Last resort - just reload
      window.location.reload();
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
          logger.error('[Account] Failed to get Apple authorization code', error);
        }
      }

      // Prepare account info for modal
      setAccountInfo({
        email: user?.email,
        hasActiveSubscription: subscription?.isActive || false,
      });

      setShowDeleteModal(true);
    } catch (error) {
      logger.error('[Account] Failed to prepare deletion', error);
      alert('Failed to open account deletion. Please try again.');
    }
  };

  const handleDeleteSuccess = async (response) => {
    // Account deleted successfully
    // eslint-disable-next-line no-console

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
      logger.error('Failed to reload subscription', error);
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

  const isSoulmatesTier = (tier) => {
    if (!tier) return false;
    const tierLower = tier.toLowerCase();
    return tierLower === 'soulmates' || tierLower === 'com.tandemdaily.app.soulmates';
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-accent-yellow">
        <div className="min-h-screen flex items-center justify-center py-6">
          <div className="w-full max-w-2xl mx-auto p-6 relative z-10 my-auto">
            <div className="relative">
              {/* Skeleton card */}
              <div className="bg-ghost-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                {/* Header skeleton */}
                <div className="flex items-center justify-between p-6 pb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Profile skeleton */}
                  <div>
                    <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4"></div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                      <div className="flex-1 space-y-3">
                        <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-40 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription skeleton */}
                  <div>
                    <div className="w-32 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4"></div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border-2 border-gray-200 dark:border-gray-700 space-y-3">
                      <div className="w-full h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse mt-4"></div>
                    </div>
                  </div>

                  {/* Actions skeleton */}
                  <div className="space-y-3">
                    <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                  </div>
                </div>
              </div>
              {/* Shadow element */}
              <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-[32px] -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user && isWeb) {
    return null; // Will redirect
  }

  // iOS: Show sign-in UI for unauthenticated users
  if (!user && !isWeb) {
    return <IOSSignInPage />;
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-accent-yellow">
        {/* Scrollable content container */}
        <div className="min-h-screen flex items-center justify-center py-6 pt-safe">
          <div className="w-full max-w-2xl mx-auto p-6 relative z-10 my-auto">
            <div className="relative">
              {/* Main content card */}
              <div className="bg-ghost-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                {/* Header with back button, title, and hamburger menu */}
                <div className="flex items-start justify-between p-6 pb-4">
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
                <div className="p-6 space-y-6">
                  {/* Profile Section */}
                  <section>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                      Profile
                    </h2>

                    {/* Profile Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,1)]">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                          {!loadingAvatar ? (
                            <button
                              onClick={() => {
                                setShowAvatarModal(true);
                                lightTap();
                              }}
                              className="relative w-20 h-20 rounded-xl overflow-hidden border-[3px] border-purple-500 shadow-[3px_3px_0px_rgba(147,51,234,0.5)] hover:scale-105 transition-transform"
                              aria-label={
                                userAvatar?.selected_avatar_id ? 'Change avatar' : 'Select avatar'
                              }
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
                                sizes="80px"
                                priority
                              />
                            </button>
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                          )}
                          {/* Avatar Name */}
                          {userAvatar?.avatar_display_name && (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                              {userAvatar.avatar_display_name}
                            </span>
                          )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0">
                          {/* Greeting */}
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">
                            👋 Hey {username || 'there'}
                          </h3>

                          {/* Username */}
                          <div className="mb-2">
                            {editingUsername ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={usernameInput}
                                  onChange={(e) => {
                                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                    setUsernameInput(sanitized);
                                  }}
                                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                                  placeholder="your_username"
                                  minLength={3}
                                  maxLength={20}
                                  disabled={loadingUsername}
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  3-20 characters, letters, numbers, and underscores only
                                </p>
                                {usernameError && (
                                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-xs text-red-600 dark:text-red-400">
                                      {usernameError}
                                    </p>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveUsername}
                                    disabled={loadingUsername}
                                    className={`flex-1 py-2 px-3 rounded-xl border-[2px] font-medium text-sm transition-all ${
                                      loadingUsername
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'bg-purple-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
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
                                        : 'bg-ghost-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  @{username || 'not_set'}
                                </span>
                                <button
                                  onClick={handleEditUsername}
                                  className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                            {usernameSuccess && !editingUsername && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  {usernameSuccess}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Change Avatar Link */}
                          {!loadingAvatar && (
                            <button
                              onClick={() => {
                                setShowAvatarModal(true);
                                lightTap();
                              }}
                              className="inline-block text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              {userAvatar?.selected_avatar_id ? 'Change Avatar' : 'Select Avatar'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Account Details */}
                      <div className="mt-4 pt-4 border-t-2 border-purple-200 dark:border-purple-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Email
                          </span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {user?.email || 'Not available'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Timezone
                          </span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {userTimezone}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Member Since
                          </span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {formatDate(user?.created_at)}
                          </span>
                        </div>
                        {zodiacData && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              Tandem Zodiac Sign
                            </span>
                            <span className="text-sm text-gray-800 dark:text-gray-200">
                              {zodiacData.display}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Daily Horoscope */}
                      {zodiacData && horoscope && (
                        <div className="mt-4 pt-4 border-t-2 border-purple-200 dark:border-purple-800">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Today&apos;s Horoscope
                          </p>
                          {horoscopeLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 italic">
                              {horoscope.text}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Subscription Section */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        Subscription
                      </h2>
                      {subscription?.isActive && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500 text-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                          ✓ ACTIVE
                        </span>
                      )}
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mx-auto"></div>
                      </div>
                    ) : subscription?.isActive ? (
                      <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl border-[3px] border-black dark:border-white p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,1)]">
                        {/* Active Subscription Info */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Current Plan
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {getTierName(subscription.tier || subscription.productId)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getTierDescription(subscription.tier || subscription.productId)}
                            </p>
                          </div>

                          {subscription.expiryDate &&
                            subscription.expiryDate !== '2099-12-31T00:00:00.000Z' &&
                            !isSoulmatesTier(subscription.tier || subscription.productId) && (
                              <div
                                className={`p-3 rounded-xl border-2 ${
                                  subscription.cancelAtPeriodEnd
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                    : 'bg-ghost-white/50 dark:bg-black/20 border-teal-200 dark:border-teal-800'
                                }`}
                              >
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  {subscription.cancelAtPeriodEnd
                                    ? '⚠️ Expires on'
                                    : '🔄 Renews on'}
                                </p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                  {formatDate(subscription.expiryDate)}
                                </p>
                                {subscription.cancelAtPeriodEnd && (
                                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                    Your subscription will not auto-renew
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Benefits */}
                          <div className="pt-4 border-t-2 border-teal-200 dark:border-teal-800 space-y-2">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                              Your Benefits
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">
                                  ✓
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Unlimited archive access
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">
                                  ✓
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Ad-free experience
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">
                                  ✓
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Daily Tandem Hard Mode
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">
                                  ✓
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Create & share Reel Connections puzzles
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">
                                  ✓
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Daily Alchemy Creative Mode
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Manage Button or Soulmates Thank You */}
                          {isSoulmatesTier(subscription.tier || subscription.productId) ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center pt-2 italic">
                              Thank you for being an early believer and lifetime supporter!
                            </p>
                          ) : isWeb ? (
                            <button
                              onClick={handleManageAccount}
                              className="w-full py-3 px-4 rounded-xl border-[3px] font-semibold transition-all bg-ghost-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                            >
                              Manage Subscription
                            </button>
                          ) : (
                            <p className="text-xs text-gray-600 dark:text-gray-400 text-center pt-2">
                              Manage via App Store
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-900/20 dark:to-sky-900/20 rounded-2xl border-[3px] border-black dark:border-white p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,1)]">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Image
                            src="/icons/ui/tandem-unlimited.png"
                            alt="Tandem Unlimited"
                            width={28}
                            height={28}
                            className="object-contain"
                          />
                          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                            Tandem Unlimited
                          </h3>
                        </div>

                        {/* Benefits Grid */}
                        <div className="grid grid-cols-1 gap-2 mb-6">
                          {[
                            'Archive access for all past puzzles',
                            'Sync progress across devices',
                            'Ad-free experience',
                            'Daily Tandem Hard Mode',
                            'Create & share Reel Connections puzzles',
                            'Daily Alchemy Creative Mode',
                            'Support solo developer',
                          ].map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                                ✓
                              </span>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{benefit}</p>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setShowPaywall(true)}
                          className="w-full py-3.5 px-6 rounded-xl border-[3px] font-bold text-lg transition-all bg-teal-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                        >
                          Become a Member
                        </button>
                      </div>
                    )}
                  </section>

                  {/* Account Actions Section */}
                  <section className="space-y-3">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                      Account Actions
                    </h2>

                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      className="w-full py-3 px-4 rounded-xl border-[3px] font-semibold transition-all bg-ghost-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      Sign Out
                    </button>

                    {/* Force Logout - shows on iOS when session appears corrupted */}
                    {!isWeb && !user?.email && (
                      <button
                        onClick={forceLogout}
                        className="w-full py-3 px-4 rounded-xl border-[3px] font-semibold transition-all bg-orange-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                      >
                        Force Logout (Clear All Data)
                      </button>
                    )}

                    {/* Delete Account Button */}
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full py-3 px-4 rounded-xl border-[3px] font-semibold transition-all bg-red-600 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      Delete Account
                    </button>
                  </section>
                </div>
              </div>

              {/* Neo-brutalist shadow element */}
              <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-[32px] -z-10"></div>
            </div>
          </div>
        </div>

        {/* Sidebar Menu */}
        <SidebarMenu
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenStats={() => setShowStats(true)}
          onOpenArchive={() => setShowArchive(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenFeedback={() => setShowFeedback(true)}
        />
      </div>

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />

      <UnifiedArchiveCalendar isOpen={showArchive} onClose={() => setShowArchive(false)} />

      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

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

      {/* Avatar Selection Pane */}
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

/**
 * IOSSignInPage - Sign-in page for iOS users who haven't authenticated yet
 * Shows Apple Sign In button and email/password form
 */
function IOSSignInPage() {
  const router = useRouter();
  const { signInWithApple, signIn, signUp } = useAuth();
  const { lightTap } = useHaptics();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);
    lightTap();

    try {
      const { error: appleError } = await signInWithApple();

      if (appleError) {
        setError('Unable to sign in with Apple. Please try again.');
        setLoading(false);
      }
      // Success will trigger auth state change and redirect
    } catch (err) {
      logger.error('[IOSSignIn] Apple sign in error', err);
      setError('Unable to sign in with Apple. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    lightTap();

    try {
      if (mode === 'signup') {
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
          setError(usernameValidation.error);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, { username });

        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('Account created! Check your email for confirmation link.');
          setMode('login');
          setPassword('');
        }
      } else {
        const { error } = await signIn(email, password);

        if (error) {
          setError(error.message);
        }
        // Success will trigger auth state change
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-accent-yellow">
      <div className="min-h-screen flex items-center justify-center py-6">
        <div className="w-full max-w-md mx-auto p-6">
          <div className="relative">
            {/* Main card */}
            <div className="bg-ghost-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10 p-6">
              {/* Back button */}
              <button
                onClick={() => {
                  lightTap();
                  router.push('/');
                }}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to game
              </button>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                Sign in to track your stats across devices and compete on leaderboards
              </p>

              {/* Success message */}
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Apple Sign In Button */}
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                className={`w-full p-4 rounded-xl border-[3px] border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 bg-black text-white ${
                  loading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <span className="font-bold">Sign in with Apple</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                <span className="text-sm text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="your_username"
                      minLength={3}
                      maxLength={20}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 bg-purple-500 text-white rounded-xl border-[3px] border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] font-bold ${
                    loading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* Toggle mode */}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                  lightTap();
                }}
                className="w-full mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
              >
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>

            {/* Shadow */}
            <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-[32px] -z-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
