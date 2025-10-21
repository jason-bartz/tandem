'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function RulesModal({ isOpen, onClose }) {
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
        className={`rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto modal-scrollbar animate-modal-enter gpu-accelerated ${
          highContrast
            ? 'bg-hc-background border-[3px] border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-gray-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-2xl font-bold ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
          >
            How to Play
          </h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full border-none text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text hover:bg-hc-primary hover:text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          className={`space-y-4 ${highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'}`}
        >
          <div>
            <h3
              className={`font-semibold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              🎯 Goal
            </h3>
            <p>Guess 4 words based on emoji pairs. All words share a secret theme!</p>
          </div>

          <div>
            <h3
              className={`font-semibold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              🎮 How to Play
            </h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Look at each pair of emojis</li>
              <li>Type the word they represent</li>
              <li>Click "Check Answers" when ready</li>
              <li>Green = correct, Red = incorrect</li>
              <li>You have 4 mistakes allowed</li>
            </ol>
          </div>

          <div>
            <h3
              className={`font-semibold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              💡 Tips
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>All answers relate to one theme</li>
              <li>Think about what connects the emojis</li>
              <li>The theme is revealed when you win!</li>
              <li>One hint per game reveals first letter</li>
            </ul>
          </div>

          <div>
            <h3
              className={`font-semibold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              🏆 Daily Challenge
            </h3>
            <p>A new puzzle every day at midnight!</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`mt-6 w-full py-3 font-semibold rounded-xl transition-all border-[3px] ${
            highContrast
              ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-gradient-to-r from-sky-500 to-teal-400 text-white border-transparent hover:shadow-lg'
          }`}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
