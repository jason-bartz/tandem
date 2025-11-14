'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const LOADING_MESSAGES = [
  'Calibrating cryptic coefficients...',
  'Syncing synonyms...',
  'Balancing tandem handlebars...',
  'Herding metaphorical cats...',
  'Brewing fresh vocabulary...',
  'Untangling thematic threads...',
  'Optimizing wordplay algorithms...',
  'Reticulating syllables...',
  'Consulting the emoji oracle...',
];

export default function AnimatedLoadingMessage() {
  const { reduceMotion } = useTheme();
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Shuffle messages on mount for random order
    const shuffled = [...LOADING_MESSAGES].sort(() => Math.random() - 0.5);
    setMessages(shuffled);
    setCurrentMessage(shuffled[0]);
  }, []);

  useEffect(() => {
    if (messages.length === 0 || reduceMotion) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setCurrentMessage(messages[currentIndex]);
    }, 1000); // Change message every 1 second

    return () => clearInterval(interval);
  }, [messages, reduceMotion]);

  return (
    <div className="text-center">
      <p
        className={`text-lg text-gray-700 dark:text-gray-300 font-medium ${
          !reduceMotion ? 'animate-loading-slide' : ''
        }`}
        key={currentMessage}
      >
        {currentMessage}
      </p>
    </div>
  );
}
