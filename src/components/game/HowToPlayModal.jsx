'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

export default function HowToPlayModal({ isOpen, onClose, defaultTab = 'tandem' }) {
  const { highContrast } = useTheme();
  const [activeGame, setActiveGame] = useState(defaultTab); // 'tandem', 'mini', or 'reel'
  const [, setExpandedSection] = useState(null);

  // Reset to default tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveGame(defaultTab);
      setExpandedSection(null);
    }
  }, [isOpen, defaultTab]);

  const tandemIcon = '/icons/ui/tandem.png';
  const miniIcon = '/icons/ui/mini.png';
  const reelIcon = '/icons/ui/movie.png';

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="How To Play"
      maxWidth="650px"
      contentClassName="px-6 py-4"
    >
      {/* Game Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveGame('tandem');
            setExpandedSection(null);
          }}
          className={`flex-1 px-2 py-3 rounded-2xl border-[3px] font-bold text-xs transition-all ${
            activeGame === 'tandem'
              ? 'bg-[#38b6ff] text-white border-black shadow-[3px_3px_0px_#000]'
              : 'bg-ghost-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black shadow-[3px_3px_0px_#000] hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Image src={tandemIcon} alt="Daily Tandem" width={20} height={20} className="w-5 h-5" />
            <span>Tandem</span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveGame('mini');
            setExpandedSection(null);
          }}
          className={`flex-1 px-2 py-3 rounded-2xl border-[3px] font-bold text-xs transition-all ${
            activeGame === 'mini'
              ? 'bg-[#FFEB3B] text-gray-900 border-black shadow-[3px_3px_0px_#000]'
              : 'bg-ghost-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black shadow-[3px_3px_0px_#000] hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Image src={miniIcon} alt="Daily Mini" width={20} height={20} className="w-5 h-5" />
            <span>Mini</span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveGame('reel');
            setExpandedSection(null);
          }}
          className={`flex-1 px-2 py-3 rounded-2xl border-[3px] font-bold text-xs transition-all ${
            activeGame === 'reel'
              ? 'bg-red-500 text-white border-black shadow-[3px_3px_0px_#000]'
              : 'bg-ghost-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black shadow-[3px_3px_0px_#000] hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Image
              src={reelIcon}
              alt="Reel Connections"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span>Reel</span>
          </div>
        </button>
      </div>

      {/* Daily Tandem Content */}
      {activeGame === 'tandem' && (
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">How to Play</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#38b6ff] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Look at the 4 emoji pairs — each represents a single word connected by a hidden
                  theme.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#38b6ff] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Type your guess and tap Check to submit.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#38b6ff] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Solve all 4 puzzles within 4 mistakes to win!</span>
              </li>
            </ul>
          </div>

          {/* Demo GIF */}
          <div className="rounded-2xl overflow-hidden border-[3px] border-gray-300 dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.2)]">
            <img
              src="/screenshots/tandem-howto.gif"
              alt="Tandem gameplay demo"
              className="w-full h-auto"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Example Round</h3>
            <div
              className={`rounded-xl p-4 space-y-3 ${
                highContrast
                  ? 'bg-hc-surface border-2 border-hc-border'
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌅☀️</span>
                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                  SUN
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍞🔥</span>
                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                  DOUGH
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📈💹</span>
                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                  STOCKS
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎈🎉</span>
                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                  BALLOONS
                </span>
              </div>

              <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Theme: Things That Rise
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-success text-white border-hc-border'
                : 'bg-accent-green/20 dark:bg-green-900/20 border-accent-green'
            }`}
          >
            <h4
              className={`font-semibold mb-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              Letter Reveals
            </h4>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              <strong
                className={highContrast ? 'text-yellow-300' : 'text-green-600 dark:text-green-400'}
              >
                Green letters = locked in!
              </strong>{' '}
              When you guess incorrectly, any letters in the correct position turn green and stay
              locked. Just fill in the remaining blanks.
            </p>
            <div
              className={`text-sm space-y-1 mt-2 font-mono rounded p-2 ${
                highContrast
                  ? 'bg-black text-white border-2 border-yellow-300'
                  : 'bg-ghost-white dark:bg-gray-800'
              }`}
            >
              <p className={highContrast ? 'text-white' : ''}>
                <strong>Example:</strong> Answer is PLAN
              </p>
              <p className={`mt-1 ${highContrast ? 'text-white' : ''}`}>
                Guess:{' '}
                <span
                  className={
                    highContrast ? 'text-red-300 font-bold' : 'text-red-600 dark:text-red-400'
                  }
                >
                  PILL
                </span>{' '}
                → Result:{' '}
                <span
                  className={
                    highContrast
                      ? 'text-yellow-300 font-bold'
                      : 'text-green-600 dark:text-green-400 font-bold'
                  }
                >
                  P
                </span>
                _ _ _
              </p>
              <p className={highContrast ? 'text-white' : ''}>
                Next guess: Only type 3 letters for the blanks
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Difficulty Ratings
            </h3>
            <p className="text-sm mb-3">
              Each puzzle has a difficulty rating that appears after you complete a puzzle. These
              ratings help you reflect on the challenge and track your progress.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Easy:</span>
                <span>Straightforward connections, common vocabulary, clear emojis</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium-Easy:</span>
                <span>Some thinking required, mostly familiar words</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium:</span>
                <span>Balanced challenge, requires creative thinking</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium-Hard:</span>
                <span>Clever connections, wordplay involved</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Hard:</span>
                <span>Abstract themes, challenging vocabulary, obscure connections</span>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 ${
              highContrast
                ? 'bg-hc-error text-white border-2 border-hc-border'
                : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
            }`}
          >
            <h3
              className={`font-semibold mb-2 flex items-center gap-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              <span className="text-lg">🔥</span> Hard Mode
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  highContrast
                    ? 'bg-black text-yellow-300 border border-yellow-300'
                    : 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300'
                }`}
              >
                Tandem Unlimited
              </span>
            </h3>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              For the ultimate challenge, Tandem Unlimited subscribers can enable Hard Mode:
            </p>
            <ul className={`text-sm space-y-1 ml-4 ${highContrast ? 'text-white' : ''}`}>
              <li>
                • <strong>3-minute time limit</strong> - Complete the puzzle before time runs out
              </li>
              <li>
                • <strong>No hints available</strong> - Rely only on your word skills
              </li>
            </ul>
            <p
              className={`text-xs mt-2 ${highContrast ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Enable Hard Mode in Settings when you have an active Tandem Unlimited subscription.
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A new puzzle is available every day at midnight. Come back tomorrow!
            </p>
          </div>
        </div>
      )}

      {/* Daily Mini Content */}
      {activeGame === 'mini' && (
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">How to Play</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#FFEB3B] text-gray-900 rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Tap a cell and type to fill in letters. Tap again to switch direction.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#FFEB3B] text-gray-900 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Read the clue above the keyboard and fill in your answer.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#FFEB3B] text-gray-900 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Complete all squares correctly to finish the puzzle!</span>
              </li>
            </ul>
          </div>

          {/* Demo GIF */}
          <div className="rounded-2xl overflow-hidden border-[3px] border-gray-300 dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.2)]">
            <img
              src="/screenshots/dailymini-howto.gif"
              alt="Daily Mini gameplay demo"
              className="w-full h-auto"
            />
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-warning text-black border-hc-border'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
            }`}
          >
            <h4
              className={`font-semibold mb-2 ${highContrast ? 'text-black' : 'text-gray-800 dark:text-gray-200'}`}
            >
              Check & Reveal
            </h4>
            <p className={`text-sm mb-2 ${highContrast ? 'text-black' : ''}`}>
              Need help? Use the menu button to access check and reveal options:
            </p>
            <ul className={`text-sm space-y-1 ml-4 ${highContrast ? 'text-black' : ''}`}>
              <li>
                • <strong>Check Square/Word/Puzzle:</strong> Verify your answers
              </li>
              <li>
                • <strong>Reveal Square/Word/Puzzle:</strong> Show the correct solution
              </li>
              <li>
                • <strong>Auto-Check:</strong> Highlight incorrect letters as you type
              </li>
            </ul>
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A new puzzle is available every day at midnight. Come back tomorrow!
            </p>
          </div>
        </div>
      )}

      {/* Reel Connections Content */}
      {activeGame === 'reel' && (
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">How to Play</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Select four movies you think belong together.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Tap Submit to check your guess.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Find all four groups to win!</span>
              </li>
            </ul>
          </div>

          {/* Demo GIF */}
          <div className="rounded-2xl overflow-hidden border-[3px] border-gray-300 dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.2)]">
            <img
              src="/screenshots/reel-connections-howto.gif"
              alt="Reel Connections gameplay demo"
              className="w-full h-auto"
            />
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-success text-white border-hc-border'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600'
            }`}
          >
            <h4
              className={`font-semibold mb-2 flex items-center gap-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              <Image
                src="/icons/ui/hint.png"
                alt="Hint"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              Hint System
            </h4>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              Stuck? You get <strong>one hint per game</strong>. Tap the Hint button to reveal the
              theme for a category.
            </p>
            <p className={`text-sm ${highContrast ? 'text-white' : ''}`}>
              The hint always reveals the <strong>easiest unsolved category</strong> first (Matinee
              → Feature → Premiere → Gala).
            </p>
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border'
                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Example Connections
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>80&apos;s Fantasy Movies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>Movies Directed by Christopher Nolan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>Movies Starring a Furry Friend</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>Soundtracks That Produced a Billboard #1 Hit</span>
              </li>
            </ul>
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Difficulty Levels
            </h4>
            <p className="text-sm mb-3">Categories are color-coded by difficulty:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-yellow-300" />
                <span className="text-sm font-medium">MATINEE</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">— Easiest</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-blue-400" />
                <span className="text-sm font-medium">FEATURE</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">— Easy</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-purple-400" />
                <span className="text-sm font-medium">PREMIERE</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">— Medium</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm font-medium">GALA</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">— Hardest</span>
              </div>
            </div>
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }`}
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Tip</h4>
            <p className="text-sm">
              Hold any poster, then tap the banner to enlarge it for a better view.
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A new puzzle is available every day at midnight. Come back tomorrow!
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </LeftSidePanel>
  );
}
