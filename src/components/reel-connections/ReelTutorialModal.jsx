'use client';

import { useState, useCallback } from 'react';
import GameTutorialModal from '@/components/demos/GameTutorialModal';
import ReelConnectionsDemo from '@/components/demos/ReelConnectionsDemo';

/**
 * Tutorial timeline for Reel Connections — same actions as the default demo,
 * but with caption annotations that explain each phase to new players.
 */
const TUTORIAL_TIMELINE = [
  // Horror: indices 0, 4, 8, 12 (scattered across grid)
  {
    at: 0.5,
    action: 'select',
    data: { index: 0 },
    caption:
      'Find four groups of four movies. Select four at a time that you think belong together.',
  },
  { at: 0.9, action: 'select', data: { index: 4 } },
  { at: 1.3, action: 'select', data: { index: 8 } },
  { at: 1.7, action: 'select', data: { index: 12 } },
  { at: 2.3, action: 'submit', caption: 'Tap Submit to check your group.' },
  {
    at: 2.8,
    action: 'reveal',
    data: { categoryIdx: 0 },
    caption: 'Correct! The connection is revealed and those movies are locked in.',
  },
  // Mind-Bending: indices 1, 6, 10, 13
  {
    at: 4.0,
    action: 'select',
    data: { index: 1 },
    caption: 'Keep going — find the next group of four.',
  },
  { at: 4.3, action: 'select', data: { index: 6 } },
  { at: 4.6, action: 'select', data: { index: 10 } },
  { at: 4.9, action: 'select', data: { index: 13 } },
  { at: 5.5, action: 'submit' },
  { at: 6.0, action: 'reveal', data: { categoryIdx: 1 } },
  // Animated: indices 2, 5, 11, 14
  {
    at: 7.2,
    action: 'select',
    data: { index: 2 },
    caption: 'Stuck? Use your hint to reveal the next easiest connection.',
  },
  { at: 7.5, action: 'select', data: { index: 5 } },
  { at: 7.8, action: 'select', data: { index: 11 } },
  { at: 8.1, action: 'select', data: { index: 14 } },
  { at: 8.7, action: 'submit' },
  { at: 9.2, action: 'reveal', data: { categoryIdx: 2 } },
  // Action auto-reveals (last group)
  {
    at: 10.4,
    action: 'reveal',
    data: { categoryIdx: 3 },
    caption: 'Solve all four groups to win. You get four mistakes — use them wisely!',
  },
  // Pause before loop
  { at: 12.5, action: 'reset' },
];

export default function ReelTutorialModal({ onClose }) {
  const [caption, setCaption] = useState(null);

  const handleCaptionChange = useCallback((newCaption) => {
    setCaption(newCaption);
  }, []);

  return (
    <GameTutorialModal
      demo={
        <ReelConnectionsDemo timeline={TUTORIAL_TIMELINE} onCaptionChange={handleCaptionChange} />
      }
      caption={caption}
      storageKey="reelLearnToPlayDismissed"
      gameType="reel"
      accentColorClass="bg-accent-yellow"
      accentHoverClass="bg-yellow-500"
      ctaTextColor="text-gray-900"
      onClose={onClose}
    />
  );
}
