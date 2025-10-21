'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function RevealAnswersModal({ isOpen, onClose, puzzle }) {
  const { highContrast } = useTheme();

  if (!isOpen || !puzzle || !puzzle.puzzles) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-5 animate-backdrop-enter gpu-accelerated"
      onClick={onClose}
    >
      <div
        className={`${
          highContrast
            ? 'bg-hc-background border-hc-border'
            : 'bg-white dark:bg-gray-800 border-gray-800 dark:border-gray-600'
        } rounded-[24px] border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] p-6 sm:p-8 max-w-md w-full animate-modal-enter max-h-[80vh] overflow-y-auto modal-scrollbar gpu-accelerated`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-2xl font-black ${
              highContrast ? 'text-hc-text' : 'text-dark-text dark:text-gray-100'
            }`}
          >
            Correct Answers
          </h2>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-xl border-[3px] ${
              highContrast
                ? 'bg-hc-surface border-hc-border text-hc-text shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white dark:bg-gray-700 border-gray-800 dark:border-gray-500 text-dark-text dark:text-gray-300 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_rgba(0,0,0,1)]'
            } text-xl font-bold cursor-pointer transition-all flex items-center justify-center`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Answer list */}
        <div className="space-y-3">
          {puzzle.puzzles.map((item, index) => {
            // Get first answer if multiple are comma-separated
            const firstAnswer = item.answer.split(',')[0].trim();
            return (
              <div
                key={index}
                className={`flex items-center justify-between ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-white dark:bg-gray-700 border-gray-800 dark:border-gray-600'
                } rounded-[18px] border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] px-4 py-4 animate-fade-in-up stagger-${
                  index + 1
                }`}
              >
                {/* Emoji container */}
                <div
                  className={`${
                    highContrast
                      ? 'bg-hc-background border-hc-border'
                      : 'bg-white dark:bg-gray-800 border-gray-800 dark:border-gray-500'
                  } min-w-[64px] h-14 px-2 rounded-[14px] border-[3px] shadow-[2px_2px_0px_rgba(0,0,0,0.3)] flex items-center justify-center`}
                >
                  <span className="text-2xl flex items-center justify-center gap-0 whitespace-nowrap">
                    {item.emoji}
                  </span>
                </div>

                {/* Answer text */}
                <span
                  className={`font-black text-xl ${
                    highContrast ? 'text-hc-text' : 'text-dark-text dark:text-gray-100'
                  } uppercase tracking-wide`}
                >
                  {firstAnswer}
                </span>
              </div>
            );
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`w-full mt-6 py-4 rounded-[18px] border-[3px] font-black text-lg transition-all ${
            highContrast
              ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-accent-blue text-white border-gray-800 dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
