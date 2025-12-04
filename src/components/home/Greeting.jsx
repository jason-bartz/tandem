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
 * Get formatted date string
 * @returns {string} Formatted date like "It's Wednesday, December 3, 2025"
 */
function getFormattedDate() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return `It's ${now.toLocaleDateString('en-US', options)}`;
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
          highContrast
            ? 'text-hc-text'
            : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {greeting}
      </h2>
      <p
        className={`text-base mb-1 ${
          highContrast
            ? 'text-hc-text opacity-80'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {formattedDate}
      </p>
      <p
        className={`text-base ${
          highContrast
            ? 'text-hc-text opacity-80'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        Ready to solve today&apos;s puzzles?
      </p>
    </div>
  );
}
