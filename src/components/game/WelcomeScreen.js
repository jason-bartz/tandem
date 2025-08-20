'use client';
import Image from 'next/image';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

export default function WelcomeScreen({ onStart, theme, toggleTheme, soundEnabled, toggleSound }) {
  const puzzleInfo = getCurrentPuzzleInfo();

  return (
    <div className="p-10 text-center relative animate-fade-in">
      <div className="absolute top-5 right-5 flex gap-2">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <button
          onClick={toggleSound}
          className="w-10 h-10 rounded-xl border-none bg-light-sand text-dark-text text-xl cursor-pointer transition-all flex items-center justify-center hover:scale-110 hover:bg-gray-text hover:text-white"
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>
      
      <div className="w-24 h-24 mx-auto mb-5 relative">
        <Image
          src="/images/main-logo.webp"
          alt="Tandem Logo"
          width={96}
          height={96}
          className="rounded-2xl"
          priority
        />
      </div>
      
      <p className="text-gray-text dark:text-gray-300 text-lg font-medium mb-8">
        4 answers. 2 emojis each. 1 theme.
      </p>
      
      <div className="bg-light-sand dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
        <h3 className="text-sm uppercase tracking-wider text-gray-text dark:text-gray-300 mb-4 font-semibold">
          How to Play
        </h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-off-white rounded-xl flex items-center justify-center mr-3 text-xl">
              👀
            </div>
            <span className="text-dark-text dark:text-gray-200 text-sm">Look at each emoji pair</span>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-off-white rounded-xl flex items-center justify-center mr-3 text-xl">
              💭
            </div>
            <span className="text-dark-text dark:text-gray-200 text-sm">Guess what they represent</span>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-off-white rounded-xl flex items-center justify-center mr-3 text-xl">
              🔗
            </div>
            <span className="text-dark-text dark:text-gray-200 text-sm">Find the theme that links them</span>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-off-white rounded-xl flex items-center justify-center mr-3 text-xl">
              ✅
            </div>
            <span className="text-dark-text dark:text-gray-200 text-sm">4 mistakes allowed</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={onStart}
        className="w-full p-4 bg-gradient-to-r from-plum to-peach text-white border-none rounded-2xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-lg"
      >
        Play Today&apos;s Puzzle
      </button>
      
      <div className="text-gray-text dark:text-gray-400 text-sm mt-4">
        Puzzle #{puzzleInfo.number} • {puzzleInfo.date}
      </div>
    </div>
  );
}