'use client';

import ReelConnectionsModal from './ReelConnectionsModal';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * AboutModal - About information modal for Reel Connections game
 * Styled with cinematic theme matching the game
 */
export default function AboutModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();

  return (
    <ReelConnectionsModal isOpen={isOpen} onClose={onClose} title="About">
      <div className={`space-y-5 ${highContrast ? 'text-hc-text' : 'text-white/90'}`}>
        {/* Founder Message */}
        <div className="space-y-4 leading-relaxed">
          <p>I&apos;m Jason, creator of Reel Connections and Tandem Daily Games.</p>
          <p>
            I&apos;m a movie lover and word puzzle enthusiast. I wanted a break from doomscrolling,
            so I created quick puzzles that you solve, share with friends, and then move on with
            your day.
          </p>
          <p>
            I&apos;ll never feature ads—just movies, puzzles, and that satisfying &apos;aha&apos;
            moment when the connection clicks. Hope you enjoy!
          </p>
        </div>

        {/* Founder Image and Info */}
        <div className={`flex flex-col items-center pt-5 border-t ${highContrast ? 'border-hc-border' : 'border-white/10'}`}>
          <div className={`relative w-24 h-24 rounded-full overflow-hidden border-2 mb-3 ${highContrast ? 'border-hc-border' : 'border-accent-yellow'}`}>
            <Image
              src="/branding/jason-bartz.webp"
              alt="Jason Bartz"
              fill
              className="object-cover"
            />
          </div>
          <p className={`text-center font-semibold ${highContrast ? 'text-hc-text' : 'text-white'}`}>
            <a
              href="https://www.jason-bartz.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors ${highContrast ? 'hover:text-hc-primary' : 'hover:text-accent-yellow'}`}
            >
              Jason Bartz
            </a>
          </p>
          <p className={`text-center text-sm ${highContrast ? 'text-hc-text' : 'text-white/60'}`}>Founder and Puzzlemaster</p>
        </div>

        {/* Call to Action */}
        <div className={`pt-4 border-t ${highContrast ? 'border-hc-border' : 'border-white/10'}`}>
          <a
            href="https://www.tandemdaily.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`block w-full text-center px-5 py-3 font-bold rounded-xl hover:scale-105 transition-all ${
              highContrast
                ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border'
                : 'bg-accent-yellow text-gray-900'
            }`}
          >
            Explore More Puzzles
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center pt-2">
          <p className={`text-xs ${highContrast ? 'text-hc-text' : 'text-white/40'}`}>© 2026 Good Vibes Games</p>
        </div>
      </div>
    </ReelConnectionsModal>
  );
}
