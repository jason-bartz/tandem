'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Get time-based greeting based on user's local time
 * @returns {string} The appropriate greeting
 */
function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning.';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon.';
  } else {
    return 'Good evening.';
  }
}

/**
 * Get a random time-based call to action message
 * @returns {string} A motivational message based on time of day
 */
function getCallToAction() {
  const hour = new Date().getHours();

  const morningMessages = [
    'Start your day with a puzzle?',
    'Coffee and crosswords?',
    'Morning brain warm-up?',
    "Ready to solve the day's puzzles?",
  ];

  const afternoonMessages = [
    'Need a midday reset?',
    'Time for an afternoon break?',
    'Ready for a puzzle break?',
  ];

  const eveningMessages = [
    'Wind down with a puzzle?',
    'Evening brain teaser time?',
    'Ready to unwind?',
    "Solve today's puzzles before bed?",
  ];

  let messages;
  if (hour >= 5 && hour < 12) {
    messages = morningMessages;
  } else if (hour >= 12 && hour < 17) {
    messages = afternoonMessages;
  } else {
    messages = eveningMessages;
  }

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get ordinal suffix for a day number
 * @param {number} day - The day of the month
 * @returns {string} The ordinal suffix (st, nd, rd, or th)
 */
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Get formatted date string
 * @returns {string} Formatted date like "It's Wednesday, December 3rd"
 */
function getFormattedDate() {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate();
  return `It's ${weekday}, ${month} ${day}${getOrdinalSuffix(day)}`;
}

/**
 * Greeting - Displays time-based greeting and date
 *
 * Features:
 * - Updates greeting based on user's local time
 * - Shows current date
 * - Displays motivational message or completion status
 * - High contrast and dark mode support
 *
 * @param {Object} props
 * @param {boolean} props.tandemCompleted - Whether Tandem puzzle is won
 * @param {boolean} props.miniCompleted - Whether Mini puzzle is won
 * @param {boolean} props.soupCompleted - Whether Element Soup is won
 * @param {boolean} props.reelCompleted - Whether Reel Connections is won
 * @param {boolean} props.tandemPlayed - Whether Tandem puzzle has been played
 * @param {boolean} props.miniPlayed - Whether Mini puzzle has been played
 * @param {boolean} props.soupPlayed - Whether Element Soup has been played
 * @param {boolean} props.reelPlayed - Whether Reel Connections has been played
 * @param {boolean} props.isLoading - Whether game completion data is still loading
 */
export default function Greeting({
  tandemCompleted = false,
  miniCompleted = false,
  soupCompleted = false,
  reelCompleted = false,
  tandemPlayed = false,
  miniPlayed = false,
  soupPlayed = false,
  reelPlayed = false,
  isLoading = false,
}) {
  const { highContrast } = useTheme();
  const [greeting, setGreeting] = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    setFormattedDate(getFormattedDate());
    setCallToAction(getCallToAction());

    // Update greeting every minute to handle time transitions
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Determine the status message based on completion state
  const getStatusMessage = () => {
    // Don't show status while loading
    if (isLoading) {
      return callToAction;
    }

    const allPlayed = tandemPlayed && miniPlayed && soupPlayed && reelPlayed;
    const allSolved = tandemCompleted && miniCompleted && soupCompleted && reelCompleted;

    if (allPlayed && allSolved) {
      return "You solved today's puzzles! Nice work.";
    } else if (allPlayed && !allSolved) {
      return "You've played today's puzzles. Try the archive?";
    }

    return callToAction;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="text-center mb-6 animate-fade-in">
        <div className="h-8 mb-1" />
        <div className="h-6 mb-1" />
        <div className="h-5" />
      </div>
    );
  }

  return (
    <div className="text-center mb-6 animate-fade-in">
      <h2
        className={`text-2xl font-bold mb-1 ${
          highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {greeting}
      </h2>
      <p
        className={`text-base mb-1 ${
          highContrast ? 'text-hc-text opacity-80' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {formattedDate}
      </p>
      <p
        className={`text-base ${
          highContrast ? 'text-hc-text opacity-80' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {getStatusMessage()}
      </p>
    </div>
  );
}
