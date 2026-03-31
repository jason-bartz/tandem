'use client';

import { useState, useCallback } from 'react';
import GameTutorialModal from '@/components/demos/GameTutorialModal';
import AlchemyDemo from '@/components/demos/AlchemyDemo';

/**
 * Tutorial timeline for Creative Mode — uses the same Alchemy demo visuals
 * but with captions tailored to the creative mode experience (no target,
 * first discoveries, favorites, save slots).
 */
const CREATIVE_TUTORIAL_TIMELINE = [
  // First combination: Water + Fire = Steam
  {
    at: 0.8,
    action: 'selectSlot0',
    data: { element: 0 },
    caption: 'In Creative Mode, combine any elements freely — there is no target to reach.',
  },
  { at: 1.5, action: 'selectSlot1', data: { element: 1 } },
  { at: 2.3, action: 'combine' },
  {
    at: 2.8,
    action: 'result',
    data: { element: 4 },
    caption: 'Discover new elements! Be the first player to find one and claim a First Discovery.',
  },
  { at: 4.0, action: 'dismissResult' },
  // Second combination: Earth + Fire = Lava
  {
    at: 4.8,
    action: 'selectSlot0',
    data: { element: 2 },
    caption: 'Save your favorite elements to reuse them quickly in future combos.',
  },
  { at: 5.5, action: 'selectSlot1', data: { element: 1 } },
  { at: 6.3, action: 'combine' },
  { at: 6.8, action: 'result', data: { element: 5 } },
  { at: 8.0, action: 'dismissResult' },
  // Subtract mode: Lava - Fire = Cloud
  {
    at: 8.6,
    action: 'toggleSubtract',
    caption: 'Flip the switch to subtract one element from another for even more possibilities.',
  },
  { at: 9.2, action: 'selectSlot0', data: { element: 5 } },
  { at: 9.8, action: 'selectSlot1', data: { element: 1 } },
  { at: 10.5, action: 'combine' },
  {
    at: 11.0,
    action: 'result',
    data: { element: 7 },
    caption: 'Use three save slots to experiment with different strategies.',
  },
  { at: 12.2, action: 'dismissResult' },
  {
    at: 12.6,
    action: 'toggleSubtract',
    caption: 'Get creative — there are infinite possibilities to explore!',
  },
  // Pause before loop
  { at: 14.0, action: 'reset' },
];

export default function AlchemyCreativeTutorialModal({ onClose }) {
  const [caption, setCaption] = useState(null);

  const handleCaptionChange = useCallback((newCaption) => {
    setCaption(newCaption);
  }, []);

  return (
    <GameTutorialModal
      demo={
        <AlchemyDemo timeline={CREATIVE_TUTORIAL_TIMELINE} onCaptionChange={handleCaptionChange} />
      }
      caption={caption}
      storageKey="soupCreativeTutorialDismissed"
      gameType={null}
      accentColorClass="bg-accent-green"
      accentHoverClass="bg-green-600"
      onClose={onClose}
    />
  );
}
