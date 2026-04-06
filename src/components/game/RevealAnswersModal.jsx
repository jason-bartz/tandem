'use client';
import { useTheme } from '@/contexts/ThemeContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

/**
 * RevealAnswersModal - Shows correct answers for a Tandem puzzle
 * NOW USES: LeftSidePanel for consistent slide-in behavior
 */
export default function RevealAnswersModal({ isOpen, onClose, puzzle }) {
  const { highContrast } = useTheme();

  if (!puzzle || !puzzle.puzzles) {
    return null;
  }

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Correct Answers"
      maxWidth="450px"
      footer={
        <button
          onClick={onClose}
          className={`w-full py-4 rounded-[18px] border-2 font-black text-lg transition-all ${
            highContrast
              ? 'bg-hc-primary text-hc-primary-text border-hc-border hover:bg-hc-focus'
              : 'bg-accent-blue text-white border-gray-800 dark:border-gray-600 dark: hover:'
          }`}
        >
          Close
        </button>
      }
    >
      {/* Answer list */}
      <div className="space-y-3">
        {puzzle.puzzles.map((item, index) => {
          // Get first answer if multiple are comma-separated
          const firstAnswer = item.answer.split(',')[0].trim();
          return (
            <div
              key={index}
              className={`flex items-center px-2 py-3 animate-fade-in-up stagger-${index + 1}`}
            >
              {/* Emoji container */}
              <div
                className={`${
                  highContrast
                    ? 'bg-hc-background border-hc-border'
                    : 'bg-ghost-white dark:bg-gray-800 border-gray-800 dark:border-gray-500'
                } min-w-[64px] h-14 px-2 rounded-[14px] border-2 flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-2xl flex items-center justify-center gap-0 whitespace-nowrap">
                  {item.emoji}
                </span>
              </div>

              {/* Answer text - centered in remaining space */}
              <span
                className={`flex-1 text-center font-black text-xl ${
                  highContrast ? 'text-hc-text' : 'text-text-primary dark:text-gray-100'
                } uppercase tracking-wide`}
              >
                {firstAnswer}
              </span>
            </div>
          );
        })}
      </div>
    </LeftSidePanel>
  );
}
