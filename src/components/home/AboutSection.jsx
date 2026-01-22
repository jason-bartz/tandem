'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * AboutSection - Brief about blurb with subscribe CTA
 *
 * Displayed on the home screen below the game cards.
 * Provides context about Tandem Daily Games and a link to subscribe.
 */
export default function AboutSection({ onSubscribe }) {
  const { highContrast } = useTheme();
  const { isActive } = useSubscription();
  const { lightTap } = useHaptics();

  const handleSubscribeClick = () => {
    lightTap();
    onSubscribe();
  };

  return (
    <section className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h2
        className={`text-sm font-bold mb-2 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}
      >
        About Tandem Daily Games
      </h2>
      <p
        className={`text-sm leading-relaxed ${
          highContrast ? 'text-hc-text opacity-80' : 'text-text-secondary'
        }`}
      >
        In a world of infinite scrolling and attention-stealing algorithms, we built something
        different. Three daily puzzles you solve, share with friends, and move on with your day.
        Fresh challenges that respect your time. Ad-free forever.
      </p>

      {!isActive && (
        <button
          onClick={handleSubscribeClick}
          className={`mt-3 text-sm font-medium transition-colors ${
            highContrast
              ? 'text-hc-primary hover:text-hc-primary/80'
              : 'text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
          }`}
        >
          Subscribe to Tandem Unlimited &rarr;
        </button>
      )}
    </section>
  );
}
