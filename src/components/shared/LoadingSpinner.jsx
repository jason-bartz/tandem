'use client';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="mt-4 text-white text-lg">Loading puzzle...</p>
    </div>
  );
}