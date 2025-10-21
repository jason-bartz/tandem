import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import subscriptionService, { INIT_STATE } from '@/services/subscriptionService';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import confetti from 'canvas-confetti';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';

export default function PaywallModal({ isOpen, onClose, onPurchaseComplete }) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic } = useHaptics();
  const { theme, highContrast, reduceMotion } = useTheme();

  useEffect(() => {
    if (!isOpen || !Capacitor.isNativePlatform()) {
      return;
    }

    setProductsLoading(true);
    setError(null);

    // Load products and subscription status
    const loadProductsAndStatus = () => {
      const allProducts = subscriptionService.getProducts();
      const status = subscriptionService.getSubscriptionStatus();

      setProducts(allProducts);
      setCurrentSubscription(status?.productId || null);

      // If no products loaded, show helpful error
      if (!allProducts || Object.keys(allProducts).length === 0) {
        setError(
          'Subscription options are loading. This may take a moment in TestFlight. Please close and try again.'
        );
      }
      setProductsLoading(false);
    };

    // Check if service is already ready (initialized at app bootstrap)
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
  }, [isOpen]);

  const handlePurchase = async (productId) => {
    // Check if already owned
    const product = products[productId];
    if (product?.owned) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await subscriptionService.purchase(productId);

      // Success! Show confetti and haptic feedback ONLY for actual new purchase
      successHaptic();
      if (!reduceMotion) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // Notify parent and close
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Purchase failed. Please try again.');
      errorHaptic();
    } finally {
      setLoading(false);
    }
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

      // Check if products are now available
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

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);

    try {
      const restored = await subscriptionService.restorePurchases();

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

  // Helper to check if a product is the ACTIVE subscription
  const isActive = (productId) => {
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

  if (!isOpen) {
    return null;
  }

  // Product IDs
  const BUDDY_PASS = 'com.tandemdaily.app.buddypass';
  const BEST_FRIENDS = 'com.tandemdaily.app.bestfriends';
  const SOULMATES = 'com.tandemdaily.app.soulmates';

  const buddyActive = isActive(BUDDY_PASS);
  const bestFriendsActive = isActive(BEST_FRIENDS);
  const soulmatesActive = isActive(SOULMATES);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter gpu-accelerated"
      onClick={onClose}
    >
      <div
        className={`rounded-[32px] border-[3px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-scrollbar animate-modal-enter gpu-accelerated ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <Image
            src={theme === 'dark' ? '/images/dark-mode-logo.webp' : '/images/main-logo.webp'}
            alt="Tandem Logo"
            width={80}
            height={80}
            className="rounded-2xl"
            priority
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mb-6">
          Tandem Unlimited
        </h2>

        {/* Benefits list */}
        <div
          className={`rounded-2xl p-5 mb-6 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-accent-blue/20 dark:bg-sky-900/40 border-accent-blue'
          }`}
        >
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
                Play any puzzle from the archive
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
                Ad-free experience
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
                Access to Hard Mode and future exclusive modes and features
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
                Cancel anytime
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
                Support a solo developer
              </span>
            </div>
          </div>
        </div>

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
              className={`w-full p-4 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all relative ${
                buddyActive
                  ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? highContrast
                      ? 'opacity-50 bg-hc-surface border-hc-border'
                      : 'opacity-50 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    : highContrast
                      ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-border'
                      : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
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
                            : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Buddy Pass
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      buddyActive
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-600 dark:text-gray-400'
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
                          : 'text-sky-600 dark:text-sky-400'
                    }`}
                  >
                    {getPrice(BUDDY_PASS) || '$1.99'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                </div>
              </div>
            </button>

            {/* Best Friends - Yearly */}
            <button
              onClick={() => handlePurchase(BEST_FRIENDS)}
              disabled={loading || restoring || bestFriendsActive || !canUpgrade(BEST_FRIENDS)}
              className={`w-full p-4 pt-6 rounded-2xl border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,0.3)] transition-all relative ${
                bestFriendsActive
                  ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? highContrast
                      ? 'opacity-50 bg-hc-surface border-hc-border'
                      : 'opacity-50 border-accent-teal bg-accent-teal/20 dark:bg-teal-900/40'
                    : highContrast
                      ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-primary border-[4px]'
                      : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] border-accent-teal bg-accent-teal/20 dark:bg-teal-900/40'
              }`}
            >
              {/* Best Value badge */}
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="bg-gradient-to-r from-teal-500 to-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  BEST VALUE • SAVE 37%
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
                            : 'text-gray-800 dark:text-gray-200'
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
                          : 'text-gray-600 dark:text-gray-400'
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
                          : 'text-accent-teal dark:text-accent-teal'
                    }`}
                  >
                    {getPrice(BEST_FRIENDS) || '$14.99'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">per year</p>
                </div>
              </div>
            </button>

            {/* Soulmates - Lifetime */}
            <button
              onClick={() => handlePurchase(SOULMATES)}
              disabled={loading || restoring || soulmatesActive}
              className={`w-full p-4 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] transition-all relative ${
                soulmatesActive
                  ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? highContrast
                      ? 'opacity-50 bg-hc-surface border-hc-border'
                      : 'opacity-50 border-accent-pink bg-accent-pink/20 dark:bg-pink-900/40'
                    : currentSubscription && !soulmatesActive
                      ? highContrast
                        ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-warning border-[4px]'
                        : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)] border-accent-pink bg-accent-pink/30 dark:bg-pink-900/50 border-[4px]'
                      : highContrast
                        ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-hc-surface border-hc-primary border-[3px]'
                        : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)] border-accent-pink bg-accent-pink/20 dark:bg-pink-900/40'
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
                            : 'text-gray-800 dark:text-gray-200'
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
                          : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Lifetime • Shareable with Family
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      soulmatesActive
                        ? 'text-gray-500 dark:text-gray-500'
                        : highContrast
                          ? 'text-hc-warning'
                          : 'text-accent-pink dark:text-accent-pink'
                    }`}
                  >
                    {getPrice(SOULMATES) || '$29.99'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">one time</p>
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

        {/* Restore Purchase button */}
        <button
          onClick={handleRestore}
          disabled={loading || restoring || productsLoading}
          className="w-full py-3 text-sky-600 dark:text-sky-400 font-medium text-sm hover:underline disabled:opacity-50"
        >
          {restoring ? 'Restoring...' : 'Restore Purchase'}
        </button>

        {/* Apple-required disclaimers */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Payment will be charged to your Apple ID account at confirmation of purchase.
            Subscription automatically renews unless canceled at least 24 hours before the end of
            the current period. Your account will be charged for renewal within 24 hours prior to
            the end of the current period. You can manage and cancel your subscriptions by going to
            your account settings on the App Store after purchase.
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

        {/* Done button */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className={`w-full py-3 font-semibold rounded-2xl transition-all border-[3px] ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-pink text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            Done
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 rounded-3xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
