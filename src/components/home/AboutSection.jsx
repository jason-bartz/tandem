'use client';

import { Capacitor } from '@capacitor/core';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import TipJarButton from '@/components/shared/TipJarButton';

/**
 * AboutSection - Brief about blurb with support CTA
 *
 * Displayed on the home screen below the game cards.
 */
export default function AboutSection() {
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

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
        different. Four daily puzzles you solve, share with friends, and move on with your day.
        Fresh challenges that respect your time. 100% free to play, ad-free, no subscriptions.
      </p>

      <div className="mt-4">
        <TipJarButton />
      </div>

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
              src="/branding/app-store-badge-black.svg"
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
