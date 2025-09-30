'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function HowToPlayModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto ${
          highContrast ? 'bg-hc-background border-4 border-hc-border' : 'bg-white dark:bg-gray-800'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">How To Play</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <p className="text-base">Solve 4 emoji puzzles to discover their hidden theme!</p>

          <div className="space-y-2">
            <p className="text-sm">• Each emoji pair represents one word or tandem</p>
            <p className="text-sm">• Character count is shown for each answer [e.g., 5 letters]</p>
            <p className="text-sm">• The connecting theme is revealed only after completion</p>
            <p className="text-sm">• You have 4 mistakes to find all the words</p>
            <p className="text-sm">• Press Enter or tap Check Answers to submit</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Examples</h3>
            <div
              className={`rounded-xl p-4 space-y-2 ${
                highContrast
                  ? 'bg-hc-surface border-2 border-hc-border'
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🗺️📍</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= MAP</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Navigation emojis → something you unfold
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">👔🧺</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                  = LAUNDRY
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Shirt + basket → clothes you fold
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">♠️❤️</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= POKER</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Card suits → a folding card game
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">✉️💌</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= LETTER</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Envelopes → paper you fold</p>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Theme revealed after solving: Things That Fold ✨
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 ${
              highContrast
                ? 'bg-hc-warning text-white border-2 border-hc-border'
                : 'bg-amber-50 dark:bg-amber-900/20'
            }`}
          >
            <p className="text-sm">
              <span className="font-semibold">💡 Hint:</span> Stuck? Use a hint to reveal two
              letters from a random unanswered word.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Streaks 🔥</h3>
            <p className="text-sm">
              Complete the daily puzzle on your first try and play consecutive days to build your
              streak!
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A new puzzle is released daily at midnight. Come back tomorrow!
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`mt-6 w-full py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all ${
            highContrast
              ? 'bg-hc-primary border-4 border-hc-border hover:bg-hc-focus'
              : 'bg-gradient-to-r from-sky-500 to-teal-400'
          }`}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
