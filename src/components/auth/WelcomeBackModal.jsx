'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import confetti from 'canvas-confetti';

/**
 * WelcomeBackModal - Shown after successful email confirmation
 *
 * Welcomes users back after confirming their email.
 *
 * Props:
 * @param {boolean} isOpen - Whether the panel is open
 * @param {function} onClose - Callback when panel closes
 */
export default function WelcomeBackModal({ isOpen, onClose }) {
  const { highContrast, reduceMotion } = useTheme();
  const { userProfile } = useAuth();
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

  // Get user's first name from username
  const firstName = userProfile?.username?.split(' ')[0] || 'there';

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Welcome back, ${firstName}!`}
      maxWidth="440px"
      contentClassName="px-6 py-4"
      footer={
        <div className="space-y-3">
          {/* Continue button */}
          <button
            onClick={onClose}
            className={`w-full p-4 rounded-md text-base font-bold cursor-pointer transition-all ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-[3px] border-hc-border hover:'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-[3px] border-gray-300 dark:border-gray-600 dark: hover:dark:hover:'
            }`}
          >
            Start Playing
          </button>
        </div>
      }
    >
      {/* Success icon/emoji */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🎉</div>
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
    </LeftSidePanel>
  );
}
