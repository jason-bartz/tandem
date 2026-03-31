'use client';

import { useState, useCallback } from 'react';
import GameTutorialModal from '@/components/demos/GameTutorialModal';
import AlchemyDemo from '@/components/demos/AlchemyDemo';

/**
 * Tutorial timeline for Daily Alchemy — same actions as the default demo,
 * but with caption annotations that explain each phase to new players.
 */
const TUTORIAL_TIMELINE = [
  // First combination: Water + Fire = Steam
  {
    at: 0.8,
    action: 'selectSlot0',
    data: { element: 0 },
    caption: 'Select two elements to combine. Tap an element to place it in a slot.',
  },
  { at: 2.5, action: 'selectSlot1', data: { element: 1 } },
  {
    at: 3.5,
    action: 'combine',
    caption: 'Tap Combine to mix your elements and discover something new!',
  },
  {
    at: 6.0,
    action: 'result',
    data: { element: 4 },
    caption: 'You discovered Steam! New elements are added to your bank for future combos.',
  },
  { at: 9.0, action: 'dismissResult' },
  // Second combination: Earth + Fire = Lava
  {
    at: 9.8,
    action: 'selectSlot0',
    data: { element: 2 },
    caption: 'Keep combining to work toward the daily target element.',
  },
  { at: 10.8, action: 'selectSlot1', data: { element: 1 } },
  { at: 11.8, action: 'combine' },
  { at: 12.3, action: 'result', data: { element: 5 } },
  { at: 14.3, action: 'dismissResult' },
  // Subtract mode: Lava - Fire = Cloud
  {
    at: 15.0,
    action: 'toggleSubtract',
    caption: 'Flip the switch to subtract one element from another for even more possibilities.',
  },
  { at: 16.5, action: 'selectSlot0', data: { element: 5 } },
  { at: 17.3, action: 'selectSlot1', data: { element: 1 } },
  { at: 18.0, action: 'combine' },
  {
    at: 18.5,
    action: 'result',
    data: { element: 7 },
    caption: 'Reach the target element to win. Try to beat the par score!',
  },
  { at: 21.0, action: 'dismissResult' },
  { at: 21.5, action: 'toggleSubtract' },
  // Pause before loop
  { at: 23.0, action: 'reset' },
];

export default function AlchemyTutorialModal({ onClose }) {
  const [caption, setCaption] = useState(null);

  const handleCaptionChange = useCallback((newCaption) => {
    setCaption(newCaption);
  }, []);

  return (
    <GameTutorialModal
      demo={<AlchemyDemo timeline={TUTORIAL_TIMELINE} onCaptionChange={handleCaptionChange} />}
      caption={caption}
      storageKey="soupLearnToPlayDismissed"
      gameType="soup"
      accentColorClass="bg-accent-green"
      accentHoverClass="bg-green-600"
      onClose={onClose}
    />
  );
}
