import React, { useState, useEffect } from 'react';
import subscriptionService, { INIT_STATE } from '@/services/subscriptionService';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import confetti from 'canvas-confetti';
import { useHaptics } from '@/hooks/useHaptics';

export default function PaywallModal({ isOpen, onClose, onPurchaseComplete }) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic } = useHaptics();

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
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              ✨ Tandem Unlimited
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-lg cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Benefits list */}
        <div className="bg-gradient-to-br from-sky-50 to-teal-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700 dark:text-gray-300">
                Play any puzzle from the archive
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Support a solo developer</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Cancel anytime</span>
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
              className={`w-full p-4 rounded-2xl border-2 transition-all relative ${
                buddyActive
                  ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? 'opacity-50 border-sky-200 dark:border-sky-700 bg-white dark:bg-gray-700'
                    : 'hover:scale-[1.02] hover:shadow-lg border-sky-200 dark:border-sky-700 bg-white dark:bg-gray-700'
              }`}
            >
              {buddyActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
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
              className={`w-full p-4 pt-6 rounded-2xl border-2 transition-all relative ${
                bestFriendsActive
                  ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? 'opacity-50 border-teal-400 dark:border-teal-600 bg-gradient-to-br from-teal-50 to-sky-50 dark:from-gray-700 dark:to-gray-700'
                    : 'hover:scale-[1.02] hover:shadow-lg border-teal-400 dark:border-teal-600 bg-gradient-to-br from-teal-50 to-sky-50 dark:from-gray-700 dark:to-gray-700'
              }`}
            >
              {/* Best Value badge */}
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="bg-gradient-to-r from-teal-500 to-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE • SAVE 37%
                </span>
              </div>

              {bestFriendsActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
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
                        : 'text-teal-600 dark:text-teal-400'
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
              className={`w-full p-4 rounded-2xl border-2 transition-all relative ${
                soulmatesActive
                  ? 'opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                  : loading || restoring
                    ? 'opacity-50 border-purple-400 dark:border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700'
                    : currentSubscription && !soulmatesActive
                      ? 'hover:scale-[1.02] hover:shadow-lg border-purple-500 dark:border-purple-500 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 ring-2 ring-purple-400'
                      : 'hover:scale-[1.02] hover:shadow-lg border-purple-400 dark:border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700'
              }`}
            >
              {soulmatesActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  ✓ ACTIVE
                </div>
              )}
              {currentSubscription && !soulmatesActive && (
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
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
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Lifetime access • One-time purchase
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      soulmatesActive
                        ? 'text-gray-500 dark:text-gray-500'
                        : 'text-purple-600 dark:text-purple-400'
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
