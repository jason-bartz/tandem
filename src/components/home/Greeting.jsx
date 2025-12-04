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
 * - Displays motivational message
 * - High contrast and dark mode support
 */
export default function Greeting() {
  const { highContrast } = useTheme();
  const [greeting, setGreeting] = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    setFormattedDate(getFormattedDate());

    // Update greeting every minute to handle time transitions
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
        Ready to solve today&apos;s puzzles?
      </p>
    </div>
  );
}
