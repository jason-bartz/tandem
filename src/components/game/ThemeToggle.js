'use client';

export default function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl border-none bg-light-sand dark:bg-light-sand text-dark-text text-xl cursor-pointer transition-all flex items-center justify-center hover:scale-110 hover:bg-gray-text hover:text-white"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}