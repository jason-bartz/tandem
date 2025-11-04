'use client';

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-12 h-12 border-4',
    large: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} border-purple-600 border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className="text-gray-600 dark:text-gray-400 font-medium">{text}</p>
      )}
    </div>
  );
}
