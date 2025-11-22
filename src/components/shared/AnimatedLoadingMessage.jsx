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
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Shuffle messages on mount for random order
    const shuffled = [...LOADING_MESSAGES].sort(() => Math.random() - 0.5);
    setMessages(shuffled);
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    if (messages.length === 0 || reduceMotion) return;

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      setTimeout(() => {
        // Change to next message in shuffled order
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % messages.length;
          // If we've cycled through all messages, reshuffle
          if (nextIndex === 0) {
            const reshuffled = [...messages].sort(() => Math.random() - 0.5);
            setMessages(reshuffled);
          }
          return nextIndex;
        });
        // Fade back in
        setIsVisible(true);
      }, 300); // Wait 300ms for fade out
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [messages, reduceMotion]);

  return (
    <div className="text-center">
      <p
        className={`text-lg text-gray-700 dark:text-gray-300 font-medium transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {messages[currentIndex] || ''}
      </p>
    </div>
  );
}
