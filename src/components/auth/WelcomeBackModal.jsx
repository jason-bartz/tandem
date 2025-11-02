'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import confetti from 'canvas-confetti';

/**
 * WelcomeBackModal - Shown after successful email confirmation
 *
 * Welcomes users back after confirming their email and prompts them
 * to subscribe to Tandem Unlimited with a special offer.
 *
 * Props:
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {function} onSubscribe - Callback to open subscription/paywall modal
 */
export default function WelcomeBackModal({ isOpen, onClose, onSubscribe }) {
  const { highContrast, reduceMotion } = useTheme();
  const { user } = useAuth();
  const { isActive } = useSubscription();
  const [celebrated, setCelebrated] = useState(false);

  // Trigger confetti on mount (once)
  if (isOpen && !celebrated && !reduceMotion) {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setCelebrated(true);
    }, 300);
  }

  const handleSubscribe = () => {
    onClose();
    if (onSubscribe) {
      onSubscribe();
    }
  };

  if (!isOpen) return null;

  // Get user's first name if available
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`rounded-[32px] border-[3px] p-8 max-w-md w-full animate-modal-enter ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Success icon/emoji */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2
            className={`text-3xl font-bold mb-2 ${
              highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
            }`}
          >
            Welcome back, {firstName}!
          </h2>
          <p
            className={`text-lg ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Your email has been confirmed.
          </p>
        </div>

        {/* Success message */}
        <div
          className={`mb-6 p-4 rounded-2xl border-[3px] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
        >
          <p
            className={`text-center font-medium ${
              highContrast ? 'text-hc-text' : 'text-green-800 dark:text-green-300'
            }`}
          >
            ✓ You're all set to start playing Tandem!
          </p>
        </div>

        {/* Tandem Unlimited upsell - only show if not already subscribed */}
        {!isActive && (
          <>
            <div className="mb-6">
              <h3
                className={`text-xl font-bold mb-3 text-center ${
                  highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                }`}
              >
                Get More with Tandem Unlimited
              </h3>
              <ul
                className={`space-y-2 mb-4 ${
                  highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <li className="flex items-start gap-2">
                  <span className="text-xl">🎯</span>
                  <span>Play unlimited puzzles from the archive</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">📊</span>
                  <span>Track your stats and streaks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🎨</span>
                  <span>Unlock exclusive themes and features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xl">🌟</span>
                  <span>Support independent game development</span>
                </li>
              </ul>
            </div>

            {/* Subscribe button */}
            <button
              onClick={handleSubscribe}
              className={`w-full p-4 rounded-[20px] text-lg font-bold cursor-pointer transition-all tracking-wider mb-3 ${
                highContrast
                  ? 'bg-hc-primary text-white border-[3px] border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  : 'bg-accent-pink text-white border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
              }`}
            >
              View Plans
            </button>
          </>
        )}

        {/* Continue button */}
        <button
          onClick={onClose}
          className={`w-full p-4 rounded-[20px] text-base font-bold cursor-pointer transition-all ${
            highContrast
              ? 'bg-hc-surface text-hc-text border-[3px] border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-[3px] border-gray-300 dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {isActive ? 'Start Playing' : 'Maybe Later'}
        </button>

        {/* Small print */}
        {!isActive && (
          <p
            className={`text-xs text-center mt-4 ${
              highContrast ? 'text-hc-text opacity-70' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            You can always subscribe later from Settings
          </p>
        )}
      </div>
    </div>
  );
}
