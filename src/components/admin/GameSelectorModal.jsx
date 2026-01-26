'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getHoliday } from '@/lib/holidays';
import { ASSET_VERSION } from '@/lib/constants';

// Game configuration
const GAMES = [
  {
    id: 'tandem',
    name: 'Daily Tandem',
    description: 'Emoji-to-word puzzle game',
    icon: '/icons/ui/tandem.png',
    color: 'accent-yellow',
    bgColor: 'bg-accent-yellow/20',
    borderColor: 'border-accent-yellow',
  },
  {
    id: 'mini',
    name: 'Daily Mini',
    description: '5x5 crossword puzzle',
    icon: '/icons/ui/mini.png',
    color: 'accent-blue',
    bgColor: 'bg-accent-blue/20',
    borderColor: 'border-accent-blue',
  },
  {
    id: 'soup',
    name: 'Daily Alchemy',
    description: 'Element combination puzzle',
    icon: `/icons/ui/daily-alchemy.png?v=${ASSET_VERSION}`,
    color: 'accent-green',
    bgColor: 'bg-accent-green/20',
    borderColor: 'border-accent-green',
  },
  {
    id: 'reel',
    name: 'Reel Connections',
    description: 'Movie connection puzzle',
    icon: '/icons/ui/movie.png',
    color: 'accent-red',
    bgColor: 'bg-accent-red/20',
    borderColor: 'border-accent-red',
  },
];

// Holiday emoji mapping
const getHolidayEmoji = (holidayName) => {
  const emojiMap = {
    Christmas: '🎄',
    'Christmas Eve': '🎄',
    Halloween: '🎃',
    "Valentine's Day": '❤️',
    Easter: '🐰',
    Thanksgiving: '🦃',
    'Independence Day': '🎆',
    "New Year's Day": '🎊',
    "New Year's Eve": '🎊',
    "St. Patrick's Day": '☘️',
    "Mother's Day": '💐',
    "Father's Day": '👔',
    'Memorial Day': '🇺🇸',
    'Labor Day': '👷',
    'Veterans Day': '🎖️',
    "Presidents' Day": '🏛️',
    'MLK Jr. Day': '✊',
    "April Fool's Day": '🃏',
    'Earth Day': '🌍',
    'Cinco de Mayo': '🇲🇽',
    Juneteenth: '✊',
    'Groundhog Day': '🦫',
    'Black Friday': '🛍️',
    'Cyber Monday': '💻',
    'Daylight Saving': '⏰',
    'Fall Back': '⏰',
    'Patriot Day': '🇺🇸',
    "Women's Equality Day": '♀️',
    'Columbus Day': '🧭',
  };
  return emojiMap[holidayName] || '🎉';
};

export default function GameSelectorModal({ date, puzzles, onSelectGame, onClose }) {
  // Format date for display
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Get holiday for the date
  const holiday = getHoliday(date);
  const holidayEmoji = holiday ? getHolidayEmoji(holiday) : null;

  // Handle escape key to close modal
  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [handleEscape]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-bg-surface border-[3px] border-black dark:border-white rounded-xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '6px 6px 0px rgba(0, 0, 0, 1)' }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-[3px] border-black dark:border-white bg-bg-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                {formatDateDisplay(date)}
              </h2>
              {holiday && (
                <p className="text-sm text-text-secondary mt-1 flex items-center gap-1.5">
                  <span className="text-lg">{holidayEmoji}</span>
                  <span>{holiday}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Game options */}
        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-sm font-medium text-text-secondary mb-4">
            Select a game to edit or create:
          </p>

          {GAMES.map((game) => {
            const hasPuzzle = puzzles && puzzles[game.id];
            const actionLabel = hasPuzzle ? 'Edit' : 'Create';

            return (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id, hasPuzzle ? puzzles[game.id] : null)}
                className={`
                  w-full p-4 rounded-xl border-[3px] border-black dark:border-white
                  flex items-center gap-4 transition-all
                  hover:translate-y-[-2px] active:translate-y-0
                  ${hasPuzzle ? game.bgColor : 'bg-bg-card hover:bg-gray-50 dark:hover:bg-gray-800'}
                `}
                style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
              >
                {/* Game icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 relative flex-shrink-0">
                  <Image src={game.icon} alt={game.name} fill className="object-contain" />
                </div>

                {/* Game info */}
                <div className="flex-1 text-left">
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">{game.name}</h3>
                  <p className="text-xs sm:text-sm text-text-secondary">{game.description}</p>
                  {hasPuzzle && (
                    <p className="text-xs font-bold text-accent-green mt-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Has puzzle
                    </p>
                  )}
                </div>

                {/* Action indicator */}
                <div
                  className={`
                    px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex-shrink-0
                    border-[2px] border-black dark:border-white
                    ${hasPuzzle ? 'bg-accent-green text-white' : 'bg-accent-yellow text-gray-900'}
                  `}
                  style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
                >
                  {actionLabel}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t-[3px] border-black dark:border-white bg-bg-card">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-sm font-bold text-text-primary bg-bg-surface border-[2px] border-black dark:border-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:translate-y-[-1px] active:translate-y-0 transition-all"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
