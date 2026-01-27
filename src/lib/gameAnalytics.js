/**
 * Game Analytics Service
 *
 * Provides a clean API for tracking game events via PostHog.
 * Tracks anonymous user engagement: game clicks, starts, completions.
 */

import { posthog } from '@/components/providers/PostHogProvider';

// Game types for consistent naming
export const GAME_TYPES = {
  TANDEM: 'tandem',
  MINI: 'daily_mini',
  REEL: 'reel_connections',
  ALCHEMY: 'daily_alchemy',
};

// Event names for PostHog
export const GAME_EVENTS = {
  GAME_CARD_CLICKED: 'game_card_clicked',
  GAME_STARTED: 'game_started',
  GAME_COMPLETED: 'game_completed',
  GAME_ABANDONED: 'game_abandoned',
  HINT_USED: 'hint_used',
  SHARE_CLICKED: 'share_clicked',
};

/**
 * Check if PostHog is available
 */
function isPostHogAvailable() {
  return typeof window !== 'undefined' && posthog && posthog.capture;
}

/**
 * Track when a user clicks on a game card from the home page
 */
export function trackGameCardClick(gameType, puzzleNumber, puzzleDate) {
  if (!isPostHogAvailable()) return;

  posthog.capture(GAME_EVENTS.GAME_CARD_CLICKED, {
    game_type: gameType,
    puzzle_number: puzzleNumber,
    puzzle_date: puzzleDate,
  });
}

/**
 * Track when a user starts playing a game (first interaction)
 */
export function trackGameStart(gameType, puzzleNumber, puzzleDate) {
  if (!isPostHogAvailable()) return;

  posthog.capture(GAME_EVENTS.GAME_STARTED, {
    game_type: gameType,
    puzzle_number: puzzleNumber,
    puzzle_date: puzzleDate,
  });
}

/**
 * Track when a user completes a game (win or lose)
 */
export function trackGameComplete({
  gameType,
  puzzleNumber,
  puzzleDate,
  won,
  timeSeconds,
  mistakes,
  hintsUsed,
  score,
}) {
  if (!isPostHogAvailable()) return;

  posthog.capture(GAME_EVENTS.GAME_COMPLETED, {
    game_type: gameType,
    puzzle_number: puzzleNumber,
    puzzle_date: puzzleDate,
    won,
    time_seconds: timeSeconds,
    mistakes: mistakes || 0,
    hints_used: hintsUsed || 0,
    score: score || null,
  });
}

/**
 * Track when a user abandons a game (leaves without completing)
 */
export function trackGameAbandon(gameType, puzzleNumber, puzzleDate, progress) {
  if (!isPostHogAvailable()) return;

  posthog.capture(GAME_EVENTS.GAME_ABANDONED, {
    game_type: gameType,
    puzzle_number: puzzleNumber,
    puzzle_date: puzzleDate,
    progress_percent: progress,
  });
}

/**
 * Track when a user uses a hint
 */
export function trackHintUsed(gameType, puzzleNumber, hintNumber) {
  if (!isPostHogAvailable()) return;

  posthog.capture(GAME_EVENTS.HINT_USED, {
    game_type: gameType,
    puzzle_number: puzzleNumber,
    hint_number: hintNumber,
  });
}

/**
 * Track when a user clicks share
 */
export function trackShareClicked(gameType, puzzleNumber, shareMethod) {
  if (!isPostHogAvailable()) return;

  posthog.capture(GAME_EVENTS.SHARE_CLICKED, {
    game_type: gameType,
    puzzle_number: puzzleNumber,
    share_method: shareMethod, // 'clipboard', 'native', etc.
  });
}

/**
 * Identify a user when they log in (links anonymous events to user)
 */
export function identifyUser(userId, properties = {}) {
  if (!isPostHogAvailable()) return;

  posthog.identify(userId, properties);
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (!isPostHogAvailable()) return;

  posthog.reset();
}

/**
 * Set user properties without identifying
 */
export function setUserProperties(properties) {
  if (!isPostHogAvailable()) return;

  posthog.people.set(properties);
}

export default {
  trackGameCardClick,
  trackGameStart,
  trackGameComplete,
  trackGameAbandon,
  trackHintUsed,
  trackShareClicked,
  identifyUser,
  resetUser,
  setUserProperties,
  GAME_TYPES,
  GAME_EVENTS,
};
