'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

export default function DailyCrypticAnnouncementModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();

  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative max-w-md w-full rounded-3xl border-[3px] overflow-hidden shadow-[8px_8px_0px_rgba(0,0,0,1)] animate-scale-in ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 dark:shadow-[8px_8px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-10 h-10 rounded-full border-[3px] flex items-center justify-center z-10 transition-all ${
            highContrast
              ? 'bg-hc-surface border-hc-border text-hc-text shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-hc-primary'
              : 'bg-white dark:bg-gray-700 border-black dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
          }`}
          aria-label="Close announcement"
        >
          <span className="text-xl font-bold">×</span>
        </button>

        {/* Image with rounded corners */}
        <div className="w-full aspect-square relative overflow-hidden">
          <Image
            src="/images/dail-cryptic-message.png"
            alt="Daily Cryptic announcement"
            width={500}
            height={500}
            className="w-full h-full object-cover rounded-t-[24px]"
            priority
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <h2
            className={`text-2xl font-bold mb-4 ${
              highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
            }`}
          >
            Introducing Daily Cryptic!
          </h2>
          <p
            className={`text-base leading-relaxed mb-6 ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Challenge yourself with a brand new puzzle game mode! Solve cryptic crossword-style
            clues every day and test your wordplay skills.
          </p>
          <p
            className={`text-lg font-bold mb-6 ${
              highContrast ? 'text-hc-text' : 'text-purple-600 dark:text-purple-400'
            }`}
          >
            Try it today!
          </p>

          <button
            onClick={onClose}
            className={`w-full px-6 py-4 text-white text-base font-bold rounded-[20px] border-[3px] transition-all ${
              highContrast
                ? 'bg-hc-primary border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-hc-focus'
                : 'border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
            }`}
            style={{ backgroundColor: '#cb6ce6' }}
          >
            Got it!
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
