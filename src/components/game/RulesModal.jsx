'use client';
import { useTheme } from '@/contexts/ThemeContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

export default function RulesModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="How to Play"
      maxWidth="420px"
      contentClassName="px-6 py-4"
      footer={
        <button
          onClick={onClose}
          className={`w-full py-3 font-semibold rounded-xl transition-all border-[3px] ${
            highContrast
              ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-gradient-to-r from-sky-500 to-teal-400 text-white border-transparent hover:shadow-lg'
          }`}
        >
          Got it!
        </button>
      }
    >
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
    </LeftSidePanel>
  );
}
