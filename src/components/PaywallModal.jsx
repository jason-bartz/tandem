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
  const { playHaptic } = useHaptics();

  useEffect(() => {
    console.log(
      '[PaywallModal] useEffect triggered - isOpen:',
      isOpen,
      'isNative:',
      Capacitor.isNativePlatform()
    );
    if (!isOpen || !Capacitor.isNativePlatform()) {
      return;
    }

    setProductsLoading(true);
    setError(null);

    // Check if service is already ready (initialized at app bootstrap)
    const serviceReady = subscriptionService.isReady();
    const initState = subscriptionService.getInitState();
    console.log('[PaywallModal] Subscription service ready:', serviceReady, 'state:', initState);

    if (serviceReady) {
      const allProducts = subscriptionService.getProducts();
      console.log('[PaywallModal] Products available:', allProducts);

      // If no products loaded, show helpful error
      if (!allProducts || Object.keys(allProducts).length === 0) {
        console.warn('[PaywallModal] No products available');
        setError(
          'Subscription options are loading. This may take a moment in TestFlight. Please close and try again.'
        );
      }
      setProductsLoading(false);
      return;
    }

    // Subscribe to state changes if not ready
    console.log('[PaywallModal] Service not ready - subscribing to state changes');
    const unsubscribe = subscriptionService.onStateChange((state) => {
      console.log('[PaywallModal] onStateChange callback - new state:', state);
      if (state === INIT_STATE.READY) {
        const allProducts = subscriptionService.getProducts();
        console.log('[PaywallModal] Service became READY - products:', allProducts);

        if (!allProducts || Object.keys(allProducts).length === 0) {
          console.warn('[PaywallModal] Service READY but no products');
          setError(
            'Subscription options are loading. This may take a moment in TestFlight. Please close and try again.'
          );
        }
        setProductsLoading(false);
      } else if (state === INIT_STATE.FAILED) {
        console.error('[PaywallModal] Service initialization FAILED');
        setError('Unable to load subscription options. Please try again later.');
        setProductsLoading(false);
      }
    });

    // Cleanup subscription on unmount or when modal closes
    return () => {
      console.log('[PaywallModal] Cleanup - unsubscribing from state changes');
      unsubscribe();
    };
  }, [isOpen]);

  const handlePurchase = async (productId) => {
    setLoading(true);
    setError(null);

    try {
      await subscriptionService.purchase(productId);

      // Success! Show confetti and haptic feedback
      playHaptic('success');
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
      playHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (url) => {
    // On native platforms, use the Capacitor Browser plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url });
      } catch (error) {
        console.error('Error opening link:', error);
        // Fallback to window.open
        window.open(url, '_blank');
      }
    } else {
      // On web, use regular link opening
      window.open(url, '_blank');
    }
  };

  const retryInitialization = async () => {
    console.log('[PaywallModal] Retrying initialization...');
    setError(null);
    setProductsLoading(true);

    try {
      // Force re-initialize the subscription service
      await subscriptionService.forceReinitialize();

      // Check if products are now available
      const products = subscriptionService.getProducts();
      console.log('[PaywallModal] Products after retry:', products);

      if (Object.keys(products).length > 0) {
        setProductsLoading(false);
        setError(null);
      } else {
        setError('No products available. Please check your internet connection and try again.');
        setProductsLoading(false);
      }
    } catch (err) {
      console.error('[PaywallModal] Retry failed:', err);
      setError('Failed to initialize. Please close and try again.');
      setProductsLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);

    try {
      const restored = await subscriptionService.restorePurchases();

      if (restored) {
        playHaptic('success');
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
      playHaptic('error');
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) {
    return null;
  }

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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl transition-colors"
            aria-label="Close"
          >
            ✕
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
              onClick={() => handlePurchase('com.tandemdaily.app.buddypass')}
              disabled={loading || restoring}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                loading ? 'opacity-50' : 'hover:scale-[1.02] hover:shadow-lg'
              } border-sky-200 dark:border-sky-700 bg-white dark:bg-gray-700`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤝</span>
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                      Buddy Pass
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Monthly subscription • Auto-renews
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-sky-600 dark:text-sky-400">$1.99</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">per month</p>
                </div>
              </div>
            </button>

            {/* Best Friends - Yearly */}
            <button
              onClick={() => handlePurchase('com.tandemdaily.app.bestfriends')}
              disabled={loading || restoring}
              className={`w-full p-4 rounded-2xl border-2 transition-all relative ${
                loading ? 'opacity-50' : 'hover:scale-[1.02] hover:shadow-lg'
              } border-teal-400 dark:border-teal-600 bg-gradient-to-br from-teal-50 to-sky-50 dark:from-gray-700 dark:to-gray-700`}
            >
              {/* Most Popular badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-teal-500 to-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👯</span>
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                      Best Friends
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Annual subscription • Auto-renews • Save 37%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-teal-600 dark:text-teal-400">$14.99</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">per year</p>
                </div>
              </div>
            </button>

            {/* Soulmate - Lifetime */}
            <button
              onClick={() => handlePurchase('com.tandemdaily.app.soulmates')}
              disabled={loading || restoring}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                loading ? 'opacity-50' : 'hover:scale-[1.02] hover:shadow-lg'
              } border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-700`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💕</span>
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                      Soulmates
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">One-time purchase</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">$29.99</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">lifetime</p>
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
            the current period. Manage subscriptions in your Account Settings.
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
