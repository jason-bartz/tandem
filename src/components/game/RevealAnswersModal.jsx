'use client';

export default function RevealAnswersModal({ isOpen, onClose, puzzle }) {
  if (!isOpen || !puzzle || !puzzle.puzzles) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full animate-modalSlide shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">
            Correct Answers
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-lg cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {puzzle.puzzles.map((item, index) => {
            // Get first answer if multiple are comma-separated
            const firstAnswer = item.answer.split(',')[0].trim();
            return (
              <div
                key={index}
                className="flex items-center justify-between bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-900/20 dark:to-teal-900/20 rounded-xl px-4 py-4 border border-sky-200 dark:border-sky-800"
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="font-bold text-lg text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  {firstAnswer}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}
