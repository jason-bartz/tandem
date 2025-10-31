'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import subscriptionService from '@/services/subscriptionService';

/**
 * PostPurchaseAccountPrompt
 *
 * Shows after successful iOS IAP purchase (anonymous) to encourage account creation.
 * Follows Apple HIG by being optional and clearly stating benefits.
 *
 * Props:
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Callback when dismissed
 * @param {function} onSuccess - Callback after successful account linking
 */
export default function PostPurchaseAccountPrompt({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, signInWithApple } = useAuth();
  const { highContrast } = useTheme();
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic } = useHaptics();

  const platform = Capacitor.getPlatform();
  const isIOS = platform === 'ios';

  // Don't show if user is already authenticated or not on iOS
  if (!isOpen || user || !isIOS) {
    return null;
  }

  const handleSignInWithApple = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithApple();

      if (result.error) {
        setError(result.error.message || 'Failed to sign in');
        errorHaptic();
      } else {
        // Success! Now link the purchase
        await linkExistingPurchase();
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  const linkExistingPurchase = async () => {
    try {
      // Get stored transaction ID from iOS subscription service
      const { Preferences } = await import('@capacitor/preferences');

      const originalTxnResult = await Preferences.get({
        key: 'tandem_original_transaction_id',
      });
      const productIdResult = await Preferences.get({ key: 'tandem_product_id' });
      const expiryResult = await Preferences.get({ key: 'tandem_expiry_date' });

      const originalTransactionId = originalTxnResult.value;
      const productId = productIdResult.value;
      const expiryDate = expiryResult.value;

      if (!originalTransactionId || !productId) {
        console.warn('[PostPurchasePrompt] No transaction data to link');
        successHaptic();
        onSuccess?.();
        onClose();
        return;
      }

      // Call the link API
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/iap/link-to-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          originalTransactionId,
          productId,
          expiryDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link purchase');
      }

      // Success!
      successHaptic();

      // Refresh subscription status
      await subscriptionService.refreshSubscriptionStatus();

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('[PostPurchasePrompt] Failed to link purchase', err);
      setError('Failed to link your purchase. Contact support if this persists.');
      errorHaptic();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter gpu-accelerated"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleSkip();
        }
      }}
    >
      <div
        className={`rounded-[32px] border-[3px] p-6 max-w-md w-full animate-modal-enter gpu-accelerated ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Thanks for subscribing!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create an account to access your subscription on all your devices
          </p>
        </div>

        {/* Benefits */}
        <div
          className={`rounded-2xl p-5 mb-6 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-300 dark:border-blue-700'
          }`}
        >
          <h3
            className={`text-base font-bold mb-3 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
          >
            With an account you can:
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span
                className={`text-lg mt-0.5 ${highContrast ? 'text-hc-success' : 'text-blue-600 dark:text-blue-400'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Access your subscription on iPhone, iPad, and web
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span
                className={`text-lg mt-0.5 ${highContrast ? 'text-hc-success' : 'text-blue-600 dark:text-blue-400'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Sync your progress and stats across devices
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span
                className={`text-lg mt-0.5 ${highContrast ? 'text-hc-success' : 'text-blue-600 dark:text-blue-400'}`}
              >
                ✓
              </span>
              <span
                className={`text-sm ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
              >
                Recover your subscription if you switch devices
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Sign in with Apple button */}
        <button
          onClick={handleSignInWithApple}
          disabled={loading}
          className={`w-full p-4 rounded-2xl border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transition-all flex items-center justify-center gap-3 mb-4 ${
            loading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          } ${
            highContrast
              ? 'bg-black text-white border-hc-border'
              : 'bg-black text-white border-black dark:border-gray-600'
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

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={loading}
          className="w-full py-3 text-gray-600 dark:text-gray-400 font-medium text-sm hover:underline disabled:opacity-50"
        >
          Maybe later
        </button>

        {/* Small disclaimer */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          You can always create an account later in Settings
        </p>
      </div>
    </div>
  );
}
