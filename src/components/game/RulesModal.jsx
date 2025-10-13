'use client';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter gpu-accelerated"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-modal-enter gpu-accelerated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">How to Play</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-lg cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🎯 Goal</h3>
            <p>Guess 4 words based on emoji pairs. All words share a secret theme!</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🎮 How to Play</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Look at each pair of emojis</li>
              <li>Type the word they represent</li>
              <li>Click "Check Answers" when ready</li>
              <li>Green = correct, Red = incorrect</li>
              <li>You have 4 mistakes allowed</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">💡 Tips</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>All answers relate to one theme</li>
              <li>Think about what connects the emojis</li>
              <li>The theme is revealed when you win!</li>
              <li>One hint per game reveals first letter</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              🏆 Daily Challenge
            </h3>
            <p>A new puzzle every day at midnight!</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-gradient-to-r from-sky-500 to-teal-400 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
