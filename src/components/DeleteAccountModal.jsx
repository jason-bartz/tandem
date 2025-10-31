'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Capacitor } from '@capacitor/core';

/**
 * DeleteAccountModal
 *
 * Handles account deletion with proper warnings and confirmations
 * Follows Apple HIG for account management and deletion
 *
 * Requirements per App Store Guideline 5.1.1(v):
 * - Easy to find (in account settings)
 * - Clear explanation of what will be deleted
 * - Appropriate verification steps
 * - Not unnecessarily difficult
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback when modal closes
 * @param {function} onSuccess - Callback after successful deletion
 * @param {object} accountInfo - User account information
 * @param {string} appleRefreshToken - Apple refresh token (if applicable)
 */
export default function DeleteAccountModal({
  isOpen,
  onClose,
  onSuccess,
  accountInfo,
  appleRefreshToken = null,
}) {
  const [step, setStep] = useState(1); // 1: Warning, 2: Confirmation
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { highContrast } = useTheme();
  const { mediumTap, incorrectAnswer, correctAnswer } = useHaptics();
  const platform = Capacitor.getPlatform();
  const isWeb = platform === 'web';

  console.log('[DeleteAccountModal] Platform:', platform, 'isWeb:', isWeb);

  const hasActiveSubscription = accountInfo?.hasActiveSubscription || false;

  if (!isOpen) {
    return null;
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  const handleClose = () => {
    if (!loading) {
      setStep(1);
      setConfirmationText('');
      setError(null);
      onClose();
    }
  };

  const handleProceedToConfirmation = () => {
    mediumTap();
    setStep(2);
  };

  const handleDelete = async () => {
    // Verify confirmation text for web users
    if (isWeb && confirmationText.trim().toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm');
      incorrectAnswer();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[DeleteAccount] Starting deletion process');

      // Get session token
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('[DeleteAccount] Session check:', { hasSession: !!session });

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call delete API
      console.log('[DeleteAccount] Calling API with:', {
        hasAppleToken: !!appleRefreshToken,
        isWeb,
      });

      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          appleRefreshToken,
          confirmationText: 'DELETE',
        }),
      });

      console.log('[DeleteAccount] Response status:', response.status);

      let data;
      try {
        data = await response.json();
        console.log('[DeleteAccount] Response data:', data);
      } catch (parseErr) {
        console.error('[DeleteAccount] Failed to parse response:', parseErr);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        const errorMsg = data.error || data.details || 'Failed to delete account';
        console.error('[DeleteAccount] API error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[DeleteAccount] Deletion successful');
      correctAnswer();

      // Call success callback (will sign out and redirect)
      onSuccess?.(data);
    } catch (err) {
      console.error('[DeleteAccount] Error:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        error: err,
      });
      setError(err.message || 'Failed to delete account');
      incorrectAnswer();
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className={`rounded-[32px] border-[3px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${
          highContrast
            ? 'bg-hc-surface border-hc-error shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-gray-800 border-red-500 shadow-[6px_6px_0px_rgba(220,38,38,0.5)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step 1: Warning */}
        {step === 1 && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⚠️</div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                Delete Account
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone
              </p>
            </div>

            {/* Active Subscription Warning */}
            {hasActiveSubscription && (
              <div
                className={`rounded-2xl p-4 mb-6 border-[3px] ${
                  highContrast
                    ? 'bg-hc-error/10 border-hc-error'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="font-bold text-orange-900 dark:text-orange-200 mb-2">
                      Important: Active Subscription
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                      Deleting your account will NOT cancel your subscription. You will continue to
                      be charged.
                    </p>
                    <p className="text-sm text-orange-900 dark:text-orange-200 font-semibold">
                      {isWeb ? (
                        <>Cancel via the Stripe billing portal before deleting your account</>
                      ) : (
                        <>
                          Cancel via iPhone Settings → Your Name → Subscriptions before deleting
                          your account
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* What Will Be Deleted */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">
                What will be deleted:
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Your account credentials and login access
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    All your game statistics and progress
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Your user preferences and settings
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Your subscription records (billing history retained for legal compliance)
                  </p>
                </div>
                {appleRefreshToken && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Your Sign in with Apple authorization
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-2 border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-bold">Deletion Timeline:</span> Your account will be deleted
                immediately and permanently. You will not be able to recover your data.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className={`flex-1 py-3 rounded-2xl border-[3px] font-semibold transition-all ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToConfirmation}
                className={`flex-1 py-3 rounded-2xl border-[3px] font-semibold transition-all ${
                  highContrast
                    ? 'bg-hc-error text-white border-hc-border hover:bg-red-700 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-red-600 text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 2: Final Confirmation */}
        {step === 2 && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                Final Confirmation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Are you absolutely sure?</p>
            </div>

            {/* Account Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-2 border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You are about to delete:
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {accountInfo?.email || 'Your account'}
              </p>
            </div>

            {/* Confirmation Input (Web only) */}
            {isWeb && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type <span className="text-red-600 dark:text-red-400 font-bold">DELETE</span> to
                  confirm:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className={`w-full px-4 py-3 rounded-xl border-[3px] font-mono font-bold text-lg ${
                    highContrast
                      ? 'bg-hc-surface text-hc-text border-hc-border focus:border-hc-focus'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:border-red-500'
                  } focus:outline-none`}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            )}

            {/* iOS Confirmation */}
            {!isWeb && (
              <div className="mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                  Tap "Delete Account" below to permanently delete your account.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setConfirmationText('');
                  setError(null);
                }}
                disabled={loading}
                className={`flex-1 py-3 rounded-2xl border-[3px] font-semibold transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || (isWeb && confirmationText.trim().toUpperCase() !== 'DELETE')}
                className={`flex-1 py-3 rounded-2xl border-[3px] font-semibold transition-all ${
                  loading || (isWeb && confirmationText.trim().toUpperCase() !== 'DELETE')
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                } ${
                  highContrast
                    ? 'bg-hc-error text-white border-hc-border hover:bg-red-700 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-red-600 text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Deleting...</span>
                  </div>
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Need help? Contact support@goodvibesgames.com
            </p>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
