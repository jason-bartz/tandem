'use client';

import ReelConnectionsModal from './ReelConnectionsModal';
import Image from 'next/image';

/**
 * AboutModal - About information modal for Reel Connections game
 * Styled with cinematic theme matching the game
 */
export default function AboutModal({ isOpen, onClose }) {
  return (
    <ReelConnectionsModal isOpen={isOpen} onClose={onClose} title="About">
      <div className="space-y-5 text-white/90">
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
        <div className="flex flex-col items-center pt-5 border-t border-white/10">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#ffce00] mb-3 shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <Image
              src="/branding/jason-bartz.webp"
              alt="Jason Bartz"
              fill
              className="object-cover"
            />
          </div>
          <p className="text-center font-semibold text-white">
            <a
              href="https://www.jason-bartz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#ffce00] transition-colors"
            >
              Jason Bartz
            </a>
          </p>
          <p className="text-center text-sm text-white/60">Founder and Puzzlemaster</p>
        </div>

        {/* Call to Action */}
        <div className="pt-4 border-t border-white/10">
          <a
            href="https://www.tandemdaily.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-5 py-3 bg-[#ffce00] text-[#0f0f1e] font-bold rounded-xl border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Explore More Puzzles
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center pt-2">
          <p className="text-xs text-white/40">© 2026 Good Vibes Games</p>
        </div>
      </div>
    </ReelConnectionsModal>
  );
}
