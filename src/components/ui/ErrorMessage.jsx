'use client';

export default function ErrorMessage({ title, message, onRetry }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title || 'Something Went Wrong'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message || 'An unexpected error occurred. Please try again.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
