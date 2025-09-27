'use client';
import { useCallback } from 'react';
import platformService from '@/services/platform';

export function useHaptics() {
  // Light tap for general button presses
  const lightTap = useCallback(async () => {
    await platformService.hapticImpact('light');
  }, []);

  // Medium tap for important actions
  const mediumTap = useCallback(async () => {
    await platformService.hapticImpact('medium');
  }, []);

  // Heavy tap for major actions
  const heavyTap = useCallback(async () => {
    await platformService.hapticImpact('heavy');
  }, []);

  // Correct answer feedback
  const correctAnswer = useCallback(async () => {
    await platformService.hapticNotification('success');
  }, []);

  // Incorrect answer feedback
  const incorrectAnswer = useCallback(async () => {
    await platformService.hapticNotification('warning');
  }, []);

  // Hint usage feedback
  const hintUsed = useCallback(async () => {
    await platformService.hapticSelection();
  }, []);

  // Celebration pattern for puzzle completion
  const celebration = useCallback(async () => {
    // Series of impacts synchronized with confetti
    const pattern = [
      { delay: 0, type: 'medium' },
      { delay: 250, type: 'light' },
      { delay: 500, type: 'medium' },
      { delay: 750, type: 'light' },
      { delay: 1000, type: 'heavy' },
      { delay: 1500, type: 'medium' },
      { delay: 2000, type: 'light' },
      { delay: 2500, type: 'medium' },
    ];

    for (const { delay, type } of pattern) {
      setTimeout(() => {
        platformService.hapticImpact(type);
      }, delay);
    }
  }, []);

  // Selection feedback for input focus
  const selectionStart = useCallback(async () => {
    await platformService.hapticSelectionStart();
  }, []);

  const selectionChanged = useCallback(async () => {
    await platformService.hapticSelectionChanged();
  }, []);

  const selectionEnd = useCallback(async () => {
    await platformService.hapticSelectionEnd();
  }, []);

  return {
    lightTap,
    mediumTap,
    heavyTap,
    correctAnswer,
    incorrectAnswer,
    hintUsed,
    celebration,
    selectionStart,
    selectionChanged,
    selectionEnd,
  };
}