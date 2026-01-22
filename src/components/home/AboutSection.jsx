'use client';

import { Capacitor } from '@capacitor/core';
import Image from 'next/image';
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

      {!Capacitor.isNativePlatform() && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h2
            className={`text-sm font-bold mb-3 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}
          >
            Download the Tandem Daily Games App
          </h2>
          <a
            href="https://apps.apple.com/us/app/tandem-daily-games/id6753114083"
            target="_blank"
            rel="noopener noreferrer"
            onClick={lightTap}
          >
            <Image
              src="/icons/buttons/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg"
              alt="Download on the App Store"
              width={120}
              height={40}
              className="hover:opacity-80 transition-opacity"
            />
          </a>
        </div>
      )}
    </section>
  );
}
