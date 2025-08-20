'use client';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            How to Play
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              🎯 Goal
            </h3>
            <p>
              Guess 4 words based on emoji pairs. All words share a secret theme!
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
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
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              💡 Tips
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>All answers relate to one theme</li>
              <li>Think about what connects the emojis</li>
              <li>The theme is revealed when you win!</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              🏆 Daily Challenge
            </h3>
            <p>
              A new puzzle every day at midnight!
            </p>
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