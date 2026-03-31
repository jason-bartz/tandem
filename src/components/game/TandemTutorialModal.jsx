'use client';

import { useState, useCallback } from 'react';
import GameTutorialModal from '@/components/demos/GameTutorialModal';
import TandemDemo from '@/components/demos/TandemDemo';

/**
 * Tutorial timeline for Tandem — same actions as the default demo,
 * but with caption annotations that explain each phase to new players.
 */
const TUTORIAL_TIMELINE = [
  // Show the board
  {
    at: 0.5,
    action: 'focusRow',
    data: { row: 0 },
    caption:
      'Each puzzle has four emoji pairs. Study them carefully — all four answers share a hidden theme.',
  },
  { at: 3.5, action: 'type', data: { row: 0, letters: 'S' } },
  { at: 3.7, action: 'type', data: { row: 0, letters: 'SU' } },
  { at: 3.9, action: 'type', data: { row: 0, letters: 'SUN' } },
  {
    at: 4.5,
    action: 'submit',
    data: { row: 0, correct: true },
    caption: 'Type your answer and tap Check. Green means correct!',
  },
  // Second puzzle — wrong guess
  { at: 6.0, action: 'focusRow', data: { row: 1 } },
  { at: 6.4, action: 'type', data: { row: 1, letters: 'B' } },
  { at: 6.6, action: 'type', data: { row: 1, letters: 'BR' } },
  { at: 6.8, action: 'type', data: { row: 1, letters: 'BRE' } },
  { at: 7.0, action: 'type', data: { row: 1, letters: 'BREA' } },
  { at: 7.2, action: 'type', data: { row: 1, letters: 'BREAD' } },
  {
    at: 7.8,
    action: 'submit',
    data: { row: 1, correct: false },
    caption:
      "Wrong answers aren't wasted — any correct letters lock in green to guide your next guess.",
  },
  // Correct guess with revealed letters
  { at: 10.3, action: 'clearRow', data: { row: 1 } },
  {
    at: 10.7,
    action: 'type',
    data: { row: 1, letters: 'T' },
    caption: 'Fill in the remaining blanks around the locked letters.',
  },
  { at: 10.9, action: 'type', data: { row: 1, letters: 'TO' } },
  { at: 11.1, action: 'type', data: { row: 1, letters: 'TOA' } },
  { at: 11.3, action: 'type', data: { row: 1, letters: 'TOAS' } },
  { at: 11.5, action: 'type', data: { row: 1, letters: 'TOAST' } },
  { at: 12.1, action: 'submit', data: { row: 1, correct: true } },
  // Third puzzle
  {
    at: 13.0,
    action: 'focusRow',
    data: { row: 2 },
    caption: 'Keep going! You get 4 mistakes before the game is over.',
  },
  { at: 13.4, action: 'type', data: { row: 2, letters: 'S' } },
  { at: 13.6, action: 'type', data: { row: 2, letters: 'ST' } },
  { at: 13.8, action: 'type', data: { row: 2, letters: 'STO' } },
  { at: 14.0, action: 'type', data: { row: 2, letters: 'STOC' } },
  { at: 14.2, action: 'type', data: { row: 2, letters: 'STOCK' } },
  { at: 14.4, action: 'type', data: { row: 2, letters: 'STOCKS' } },
  { at: 15.0, action: 'submit', data: { row: 2, correct: true } },
  // Fourth puzzle
  { at: 15.8, action: 'focusRow', data: { row: 3 } },
  { at: 16.2, action: 'type', data: { row: 3, letters: 'P' } },
  { at: 16.4, action: 'type', data: { row: 3, letters: 'PA' } },
  { at: 16.6, action: 'type', data: { row: 3, letters: 'PAR' } },
  { at: 16.8, action: 'type', data: { row: 3, letters: 'PART' } },
  { at: 17.0, action: 'type', data: { row: 3, letters: 'PARTY' } },
  {
    at: 17.6,
    action: 'submit',
    data: { row: 3, correct: true },
    caption: 'Solve all four to reveal the hidden theme and win. Good luck!',
  },
  // Pause before loop
  { at: 20.0, action: 'reset' },
];

export default function TandemTutorialModal({ onClose }) {
  const [caption, setCaption] = useState(null);

  const handleCaptionChange = useCallback((newCaption) => {
    setCaption(newCaption);
  }, []);

  return (
    <GameTutorialModal
      demo={<TandemDemo timeline={TUTORIAL_TIMELINE} onCaptionChange={handleCaptionChange} />}
      caption={caption}
      storageKey="tandemLearnToPlayDismissed"
      gameType="tandem"
      accentColorClass="bg-primary"
      accentHoverClass="bg-primary-hover"
      onClose={onClose}
    />
  );
}
