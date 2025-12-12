/**
 * PaywallModal - Subscription Paywall
 * NOW USES: LeftSidePanel for consistent slide-in behavior
 *
 * Complex modal with nested panels:
 * - AuthModal at z-60 (web authentication)
 * - PostPurchaseAccountPrompt at z-60 (iOS post-purchase linking)
 *
 * Features:
 * - 3 subscription tiers (Buddy Pass, Best Friends, Soulmates)
 * - Platform-specific handling (iOS IAP vs Web Stripe)
 * - Apple Sign In for iOS
 * - Product loading with retry
 * - Restore purchases functionality
 *
 * @component
 */
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import subscriptionService, { INIT_STATE } from '@/services/subscriptionService';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import confetti from 'canvas-confetti';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import AuthModal from '@/components/auth/AuthModal';
import PostPurchaseAccountPrompt from '@/components/PostPurchaseAccountPrompt';
import { ASSET_VERSION } from '@/lib/constants';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import logger from '@/lib/logger';

export default function PaywallModal({ isOpen, onClose, onPurchaseComplete }) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostPurchasePrompt, setShowPostPurchasePrompt] = useState(false);
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic } = useHaptics();
  const { theme, highContrast, reduceMotion } = useTheme();
  const { user, signInWithApple } = useAuth();
  const { refreshStatus } = useSubscription();

  // Detect platform
  const platform = Capacitor.getPlatform();
  const isIOS = platform === 'ios';
  const isWeb = platform === 'web';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setProductsLoading(true);
    setError(null);

    // Load products and subscription status
    const loadProductsAndStatus = async () => {
      const allProducts = await subscriptionService.getProducts();
      const status = await subscriptionService.getSubscriptionStatus();

      setProducts(allProducts);
      setCurrentSubscription(status?.productId || status?.tier || null);

      // If no products loaded, show helpful error
      if (!allProducts || Object.keys(allProducts).length === 0) {
        if (isIOS) {
          setError(
            'Subscription options are loading. This may take a moment in TestFlight. Please close and try again.'
          );
        } else {
          setError('Unable to load subscription options. Please try again later.');
        }
      }
      setProductsLoading(false);
    };

    // For iOS: Check if service is already ready (initialized at app bootstrap)
    if (isIOS) {
      const serviceReady = subscriptionService.isReady();

      if (serviceReady) {
        loadProductsAndStatus();
        return;
      }

      // Subscribe to state changes if not ready
      const unsubscribe = subscriptionService.onStateChange((state) => {
        if (state === INIT_STATE.READY) {
          loadProductsAndStatus();
        } else if (state === INIT_STATE.FAILED) {
          setError('Unable to load subscription options. Please try again later.');
          setProductsLoading(false);
        }
      });

      // Cleanup subscription on unmount or when modal closes
      return () => {
        unsubscribe();
      };
    } else {
      // For Web: Initialize and load products
      subscriptionService.initialize().then(() => {
        loadProductsAndStatus();
      });
    }
  }, [isOpen, isIOS]);

  const handlePurchase = async (productId) => {
    const product = products[productId];
    if (product?.owned) {
      return;
    }

    // For Web: Check authentication first
    if (isWeb && !user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isIOS) {
        // iOS: Use IAP
        await subscriptionService.purchase(productId);

        // Refresh subscription status via context
        await refreshStatus();

        // Success! Show confetti and haptic feedback
        successHaptic();
        if (!reduceMotion) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }

        // Notify parent
        if (onPurchaseComplete) {
          onPurchaseComplete();
        }

        // If user is not authenticated, show post-purchase prompt
        // Otherwise just close the modal
        if (!user) {
          setTimeout(() => {
            onClose();
            setShowPostPurchasePrompt(true);
          }, 1500);
        } else {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        // Web: Use Stripe - Convert iOS product ID to tier
        const tier = productIdToTier(productId);
        await subscriptionService.createCheckoutSession(tier);
        // User will be redirected to Stripe, no need to close modal
      }
    } catch (err) {
      setError(err.message || 'Purchase failed. Please try again.');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert iOS product IDs to web tier names
  const productIdToTier = (productId) => {
    if (productId === 'com.tandemdaily.app.buddypass' || productId === 'buddypass') {
      return 'buddypass';
    }
    if (productId === 'com.tandemdaily.app.bestfriends' || productId === 'bestfriends') {
      return 'bestfriends';
    }
    if (productId === 'com.tandemdaily.app.soulmates' || productId === 'soulmates') {
      return 'soulmates';
    }
    return productId;
  };

  const handleOpenLink = async (url) => {
    // On native platforms, use the Capacitor Browser plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url });
      } catch {
        // Fallback to window.open
        window.open(url, '_blank');
      }
    } else {
      // On web, use regular link opening
      window.open(url, '_blank');
    }
  };

  const retryInitialization = async () => {
    setError(null);
    setProductsLoading(true);

    try {
      // Force re-initialize the subscription service
      await subscriptionService.forceReinitialize();

      const allProducts = subscriptionService.getProducts();
      const status = subscriptionService.getSubscriptionStatus();

      if (Object.keys(allProducts).length > 0) {
        setProducts(allProducts);
        setCurrentSubscription(status?.productId || null);
        setProductsLoading(false);
        setError(null);
      } else {
        setError('No products available. Please check your internet connection and try again.');
        setProductsLoading(false);
      }
    } catch {
      setError('Failed to initialize. Please close and try again.');
      setProductsLoading(false);
    }
  };

  const handleRestoreOrLogin = async () => {
    // For Web: Open login modal
    if (isWeb) {
      setShowAuthModal(true);
      return;
    }

    // For iOS: Restore purchases
    setRestoring(true);
    setError(null);

    try {
      const restored = await subscriptionService.restorePurchases();

      // Refresh subscription status via context
      await refreshStatus();

      if (restored && restored.isActive) {
        successHaptic();
        setError('Purchases restored successfully!');

        if (onPurchaseComplete) {
          onPurchaseComplete();
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('No purchases found to restore.');
      }
    } catch (err) {
      setError(err.message || 'Restore failed. Please try again.');
      errorHaptic();
    } finally {
      setRestoring(false);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    // Refresh subscription status via context after auth
    await refreshStatus();
    const status = await subscriptionService.getSubscriptionStatus();
    setCurrentSubscription(status?.tier || null);
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithApple();

      if (result.error && result.error.message) {
        setError(result.error.message);
        errorHaptic();
        setLoading(false);
        return;
      }

      // Check for successful sign-in
      if (!result.user) {
        // No error message but also no user - silent failure, just log
        if (result.error) {
          logger.error('[PaywallModal] Sign in error (no message)', result.error);
        }
        setLoading(false);
        return;
      }

      // Successfully signed in - play success haptic immediately
      successHaptic();

      // Refresh subscription status (handle errors separately to not block success)
      try {
        await refreshStatus();
      } catch (refreshError) {
        // Log but don't show error - sign-in was successful
        logger.error('[PaywallModal] Failed to refresh subscription after sign-in', refreshError);
        // Subscription will be refreshed on next app interaction
      }
    } catch (err) {
      logger.error('[PaywallModal] Sign in error', err);
      if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to sign in with Apple');
      }
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a product is the ACTIVE subscription
  const isActive = (productId) => {
    // For web, also check tier names
    if (isWeb && currentSubscription) {
      const tierMap = {
        buddypass: 'com.tandemdaily.app.buddypass',
        bestfriends: 'com.tandemdaily.app.bestfriends',
        soulmates: 'com.tandemdaily.app.soulmates',
      };
      return (
        currentSubscription === productId ||
        tierMap[currentSubscription] === productId ||
        productId === tierMap[currentSubscription]
      );
    }
    return currentSubscription === productId;
  };

  // Helper to get the displayed price
  const getPrice = (productId) => {
    return products[productId]?.pricing?.price || products[productId]?.price;
  };

  // Helper to determine if upgrade is possible
  const canUpgrade = (productId) => {
    // If product is already active, can't purchase it again
    if (isActive(productId)) return false;

    // If no current subscription, all are available
    if (!currentSubscription) return true;

    // Soulmates is always available (lifetime > any subscription)
    if (productId === 'com.tandemdaily.app.soulmates') return true;

    // If on Buddy Pass, can upgrade to Best Friends
    if (
      currentSubscription === 'com.tandemdaily.app.buddypass' &&
      productId === 'com.tandemdaily.app.bestfriends'
    ) {
      return true;
    }

    // Already have this or higher tier
    return false;
  };

  // Product IDs
  const BUDDY_PASS = 'com.tandemdaily.app.buddypass';
  const BEST_FRIENDS = 'com.tandemdaily.app.bestfriends';
  const SOULMATES = 'com.tandemdaily.app.soulmates';

  const buddyActive = isActive(BUDDY_PASS);
  const bestFriendsActive = isActive(BEST_FRIENDS);
  const soulmatesActive = isActive(SOULMATES);

  return (
    <>
      <LeftSidePanel
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <Image
              src={`${theme === 'dark' ? '/images/dark-mode-logo.webp' : '/images/main-logo.webp'}?v=${ASSET_VERSION}`}
              alt="Tandem Logo"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span>Join Tandem Unlimited</span>
          </div>
        }
        maxWidth="520px"
        contentClassName="px-6 py-6"
      >
        {/* Benefits list */}
        <div
          className={`rounded-2xl p-5 mb-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-accent-blue/20 dark:bg-sky-900/40 border-black dark:border-gray-600'
          }`}
        >
          <h3
            className={`text-base font-bold mb-4 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
          >
            As a member, you&apos;ll get:
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span
                className={`text-lg font-bold mt-0.5 ${highContrast ? 'text-hc-success' : 'text-accent-blue dark:text-accent-blue'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Archive access for all past puzzles (Daily Tandem, Daily Mini, and Reel Connections)
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`text-lg font-bold mt-0.5 ${highContrast ? 'text-hc-success' : 'text-accent-blue dark:text-accent-blue'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Sync and save your progress across devices
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`text-lg font-bold mt-0.5 ${highContrast ? 'text-hc-success' : 'text-accent-blue dark:text-accent-blue'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Challenge yourself with access to Daily Tandem&apos;s Hard Mode
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`text-lg font-bold mt-0.5 ${highContrast ? 'text-hc-success' : 'text-accent-blue dark:text-accent-blue'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Create your own Reel Connections puzzles and share with the world
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`text-lg font-bold mt-0.5 ${highContrast ? 'text-hc-success' : 'text-accent-blue dark:text-accent-blue'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Support a solo developer to keep building great puzzles
              </span>
            </div>
          </div>
        </div>

        {/* Keep Daily Puzzle Free Message */}
        <div
          className={`rounded-2xl p-4 mb-6 text-center border-2 ${
            highContrast
              ? 'bg-hc-surface border-hc-success'
              : 'bg-accent-green/10 border-accent-green/30'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Tandem Unlimited members make the daily puzzle available for everyone and the game 100%
            ad-free
          </p>
        </div>

        {/* iOS: Sign in with Apple prompt - show if not authenticated */}
        {isIOS && !user && (
          <div
            className={`rounded-2xl p-5 mb-6 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-300 dark:border-blue-700'
            }`}
          >
            <div className="text-center mb-4">
              <h3
                className={`text-base font-bold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
              >
                Sign in to sync across devices
              </h3>
              <p
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Sign in to access your subscription on all devices
              </p>
            </div>

            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              className={`w-full p-4 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-3 ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
              } ${
                highContrast
                  ? 'bg-black text-white border-hc-border'
                  : 'bg-black text-white border-black dark:border-gray-600'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="font-bold">Sign in with Apple</span>
            </button>

            <div className="text-center mt-4">
              <p
                className={`text-xs ${highContrast ? 'text-hc-text' : 'text-gray-500 dark:text-gray-400'}`}
              >
                or continue below without an account
              </p>
            </div>
          </div>
        )}

        {/* Subscription options */}
        {productsLoading ? (
          <div className="space-y-3 mb-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-sky-500 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Loading subscription options...
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                This may take a moment in TestFlight
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {/* Buddy Pass - Monthly */}
            <button
              onClick={() => handlePurchase(BUDDY_PASS)}
              disabled={loading || restoring || buddyActive || !canUpgrade(BUDDY_PASS)}
              className={`w-full p-4 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all relative ${
                buddyActive
                  ? 'opacity-60 cursor-not-allowed border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? highContrast
                      ? 'opacity-50 bg-hc-surface border-hc-border'
                      : 'opacity-50 border-black bg-[#ffce00]'
                    : highContrast
                      ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-border'
                      : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] border-black bg-[#ffce00]'
              }`}
            >
              {buddyActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  ✓ ACTIVE
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤝</span>
                    <span
                      className={`font-bold text-lg ${
                        buddyActive
                          ? 'text-gray-500 dark:text-gray-500'
                          : highContrast
                            ? 'text-hc-text'
                            : 'text-gray-800'
                      }`}
                    >
                      Buddy Pass
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      buddyActive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700'
                    }`}
                  >
                    Monthly subscription • Auto-renews
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      buddyActive
                        ? 'text-gray-500 dark:text-gray-500'
                        : highContrast
                          ? 'text-hc-primary'
                          : 'text-gray-800'
                    }`}
                  >
                    {getPrice(BUDDY_PASS) || '$1.99'}
                  </p>
                  <p
                    className={`text-xs ${buddyActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600'}`}
                  >
                    per month
                  </p>
                </div>
              </div>
            </button>

            {/* Best Friends - Yearly */}
            <button
              onClick={() => handlePurchase(BEST_FRIENDS)}
              disabled={loading || restoring || bestFriendsActive || !canUpgrade(BEST_FRIENDS)}
              className={`w-full p-4 pt-6 rounded-2xl border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all relative ${
                bestFriendsActive
                  ? 'opacity-60 cursor-not-allowed border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? highContrast
                      ? 'opacity-50 bg-hc-surface border-hc-border'
                      : 'opacity-50 border-black bg-[#7ed957]'
                    : highContrast
                      ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-border'
                      : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] border-black bg-[#7ed957]'
              }`}
            >
              {/* Best Value badge */}
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="bg-[#a855f7] text-white text-xs font-bold px-3 py-1 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  Best value • Save 37%
                </span>
              </div>

              {bestFriendsActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)] z-10">
                  ✓ ACTIVE
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👯</span>
                    <span
                      className={`font-bold text-lg ${
                        bestFriendsActive
                          ? 'text-gray-500 dark:text-gray-500'
                          : highContrast
                            ? 'text-hc-text'
                            : 'text-gray-800'
                      }`}
                    >
                      Best Friends
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      bestFriendsActive
                        ? 'text-gray-400 dark:text-gray-500'
                        : highContrast
                          ? 'text-hc-text'
                          : 'text-gray-700'
                    }`}
                  >
                    Yearly subscription • Auto-renews
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      bestFriendsActive
                        ? 'text-gray-500 dark:text-gray-500'
                        : highContrast
                          ? 'text-hc-primary'
                          : 'text-gray-800'
                    }`}
                  >
                    {getPrice(BEST_FRIENDS) || '$14.99'}
                  </p>
                  <p
                    className={`text-xs ${bestFriendsActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600'}`}
                  >
                    per year
                  </p>
                </div>
              </div>
            </button>

            {/* Soulmates - Lifetime */}
            <button
              onClick={() => handlePurchase(SOULMATES)}
              disabled={loading || restoring || soulmatesActive}
              className={`w-full p-4 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all relative ${
                soulmatesActive
                  ? 'opacity-60 cursor-not-allowed border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? highContrast
                      ? 'opacity-50 bg-hc-surface border-hc-border'
                      : 'opacity-50 border-black bg-[#ff66c4]'
                    : currentSubscription && !soulmatesActive
                      ? highContrast
                        ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-border'
                        : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] border-black bg-[#ff66c4]'
                      : highContrast
                        ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-border'
                        : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] border-black bg-[#ff66c4]'
              }`}
            >
              {soulmatesActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  ✓ ACTIVE
                </div>
              )}
              {currentSubscription && !soulmatesActive && (
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                    ⭐ UPGRADE TO LIFETIME
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💕</span>
                    <span
                      className={`font-bold text-lg ${
                        soulmatesActive
                          ? 'text-gray-500 dark:text-gray-500'
                          : highContrast
                            ? 'text-hc-text'
                            : 'text-gray-800'
                      }`}
                    >
                      Soulmates
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      soulmatesActive
                        ? 'text-gray-400 dark:text-gray-500'
                        : highContrast
                          ? 'text-hc-text'
                          : 'text-gray-700'
                    }`}
                  >
                    {isIOS ? 'Lifetime • Shareable with Family' : 'Lifetime'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      soulmatesActive
                        ? 'text-gray-500 dark:text-gray-500'
                        : highContrast
                          ? 'text-hc-warning'
                          : 'text-gray-800'
                    }`}
                  >
                    {getPrice(SOULMATES) || '$29.99'}
                  </p>
                  <p
                    className={`text-xs ${soulmatesActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600'}`}
                  >
                    one time
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className={`text-sm text-center mb-4 p-3 rounded-lg ${
              error.includes('restored')
                ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                : 'text-red-600 bg-red-50 dark:bg-red-900/20'
            }`}
          >
            {error}
            {(error.includes('loading') ||
              error.includes('No products') ||
              error.includes('Failed')) && (
              <button
                onClick={retryInitialization}
                className="block mx-auto mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Restore Purchase (iOS) or Login (Web) button - Only show if not logged in */}
        {(!isWeb || !user) && (
          <button
            onClick={handleRestoreOrLogin}
            disabled={loading || restoring || productsLoading}
            className="w-full py-3 text-sky-600 dark:text-sky-400 font-medium text-sm hover:underline disabled:opacity-50"
          >
            {restoring ? 'Restoring...' : isWeb ? 'Login' : 'Restore Purchase'}
          </button>
        )}

        {/* Payment disclaimers */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {isWeb
              ? 'Payment will be charged to your account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions in your account settings after purchase.'
              : 'Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.'}
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <button
              onClick={() =>
                handleOpenLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')
              }
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              Terms of Use
            </button>
            <button
              onClick={() => handleOpenLink('https://tandemdaily.com/privacypolicy')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-ghost-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 rounded-3xl flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Processing...</p>
            </div>
          </div>
        )}
      </LeftSidePanel>

      {/* Auth Modal for Web Users - Nested at z-60 */}
      {isWeb && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Post-Purchase Account Prompt for iOS Anonymous Purchases - Nested at z-60 */}
      {isIOS && (
        <PostPurchaseAccountPrompt
          isOpen={showPostPurchasePrompt}
          onClose={() => setShowPostPurchasePrompt(false)}
          onSuccess={() => {
            // Refresh subscription status after linking
            refreshStatus();
          }}
        />
      )}
    </>
  );
}
