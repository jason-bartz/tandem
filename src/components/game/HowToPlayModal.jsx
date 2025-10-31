'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function HowToPlayModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter gpu-accelerated"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-[32px] border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto modal-scrollbar animate-modal-enter gpu-accelerated ${
          highContrast
            ? 'bg-hc-background border-hc-border'
            : 'bg-white dark:bg-bg-card border-border-main'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">How To Play</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">The Basics</h3>
            <p className="text-sm mb-2">
              Each puzzle shows two emojis that represent a single word. Type your guess and press
              Enter to submit.
            </p>
            <p className="text-sm">
              You have 4 mistakes across all puzzles. The theme is revealed only when you solve all
              four.
            </p>
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-success text-white border-hc-border'
                : 'bg-accent-green/20 dark:bg-green-900/20 border-accent-green'
            }`}
          >
            <h4
              className={`font-semibold mb-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              Smart Hints
            </h4>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              <strong
                className={highContrast ? 'text-yellow-300' : 'text-green-600 dark:text-green-400'}
              >
                Green letters = locked in!
              </strong>{' '}
              When you guess incorrectly, any letters in the correct position turn green and stay
              locked. Just fill in the remaining blanks.
            </p>
            <div
              className={`text-sm space-y-1 mt-2 font-mono rounded p-2 ${
                highContrast
                  ? 'bg-black text-white border-2 border-yellow-300'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <p className={highContrast ? 'text-white' : ''}>
                <strong>Example:</strong> Answer is PLAN
              </p>
              <p className={`mt-1 ${highContrast ? 'text-white' : ''}`}>
                Guess:{' '}
                <span
                  className={
                    highContrast ? 'text-red-300 font-bold' : 'text-red-600 dark:text-red-400'
                  }
                >
                  PILL
                </span>{' '}
                → Result:{' '}
                <span
                  className={
                    highContrast
                      ? 'text-yellow-300 font-bold'
                      : 'text-green-600 dark:text-green-400 font-bold'
                  }
                >
                  P
                </span>
                _ _ _
              </p>
              <p className={highContrast ? 'text-white' : ''}>
                Next guess: Only type 3 letters for the blanks
              </p>
            </div>
            <p className={`text-sm mt-3 ${highContrast ? 'text-white' : ''}`}>
              <span className="font-semibold">💡 Need help?</span> Select an answer field and tap
              the hint button to reveal helpful context below that specific answer. You start with 1
              hint and unlock a 2nd hint after solving 2 puzzles.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Example Round</h3>
            <div
              className={`rounded-xl p-4 space-y-2 ${
                highContrast
                  ? 'bg-hc-surface border-2 border-hc-border'
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">☀️🔥</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= SUN</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Star → hot in the sky</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">🌶️🔥</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= PEPPER</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Spice → burns your mouth</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">☕🍵</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= COFFEE</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drink → served hot</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">🏜️🌡️</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= DESERT</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Climate → scorching heat</p>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Theme revealed: Things That Are Hot 🔥
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Difficulty Ratings ⭐
            </h3>
            <p className="text-sm mb-3">
              Each puzzle has a difficulty rating that appears after you complete a puzzle. These
              ratings help you reflect on the challenge and track your progress.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Easy:</span>
                <span>Straightforward connections, common vocabulary, clear emojis</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium-Easy:</span>
                <span>Some thinking required, mostly familiar words</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium:</span>
                <span>Balanced challenge, requires creative thinking</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium-Hard:</span>
                <span>Clever connections, wordplay involved</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Hard:</span>
                <span>Abstract themes, challenging vocabulary, obscure connections</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Streaks 🔥</h3>
            <p className="text-sm">
              Complete the daily puzzle on your first try and play consecutive days to build your
              streak!
            </p>
          </div>

          <div
            className={`rounded-xl p-4 ${
              highContrast
                ? 'bg-hc-error text-white border-2 border-hc-border'
                : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
            }`}
          >
            <h3
              className={`font-semibold mb-2 flex items-center gap-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              <span className="text-lg">🔥</span> Hard Mode
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  highContrast
                    ? 'bg-black text-yellow-300 border border-yellow-300'
                    : 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300'
                }`}
              >
                Tandem Unlimited
              </span>
            </h3>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              For the ultimate challenge, Tandem Unlimited subscribers can enable Hard Mode:
            </p>
            <ul className={`text-sm space-y-1 ml-4 ${highContrast ? 'text-white' : ''}`}>
              <li>
                • <strong>3-minute time limit</strong> - Complete the puzzle before time runs out
              </li>
              <li>
                • <strong>No hints available</strong> - Rely only on your word skills
              </li>
            </ul>
            <p
              className={`text-xs mt-2 ${highContrast ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Enable Hard Mode in Settings when you have an active Tandem Unlimited subscription.
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
          className={`mt-6 w-full py-3 text-white font-semibold rounded-2xl transition-all border-[3px] ${
            highContrast
              ? 'bg-hc-primary border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-accent-blue border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
