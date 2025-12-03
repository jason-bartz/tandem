'use client';

import ReelConnectionsModal from './ReelConnectionsModal';

/**
 * HowToPlayModal - Instructions modal for Reel Connections game
 * Styled with cinematic theme matching the game
 */
export default function HowToPlayModal({ isOpen, onClose }) {
  return (
    <ReelConnectionsModal isOpen={isOpen} onClose={onClose} title="How to Play">
      <div className="space-y-5 text-white/90">
        {/* Main Description */}
        <div className="text-center">
          <p className="text-lg font-semibold text-[#ffce00]">
            Find groups of four movies that share something in common.
          </p>
        </div>

        {/* Rules Section */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-[#ffce00] text-[#0f0f1e] rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Select four movies and tap Submit to check if your guess is correct.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-[#ffce00] text-[#0f0f1e] rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Find all four groups without making four mistakes.</span>
            </li>
          </ul>
        </div>

        {/* Tips Section */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-sm text-white/70 mb-2 font-medium">Tip:</p>
          <p className="text-sm">Long press any poster to enlarge it for a better view.</p>
        </div>

        {/* Difficulty Colors */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-sm text-white/70 mb-3">Categories are color-coded by difficulty:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-yellow-300" />
              <span className="text-sm">Easiest</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-blue-400" />
              <span className="text-sm">Easy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-purple-400" />
              <span className="text-sm">Medium</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm">Hardest</span>
            </div>
          </div>
        </div>

        {/* Daily Reset */}
        <div className="text-center pt-2">
          <p className="text-sm text-white/60">A new puzzle is available every day at midnight.</p>
        </div>
      </div>
    </ReelConnectionsModal>
  );
}
