'use client';

import { useState } from 'react';
import { generateBreadcrumbs } from '@/lib/seo-config';
import Link from 'next/link';

export default function HowToPlayPage() {
  const [activeSection, setActiveSection] = useState(null);

  const breadcrumbSchema = generateBreadcrumbs([{ name: 'How to Play', path: '/how-to-play' }]);

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Play Tandem - Emoji Word Puzzle Game',
    description: 'Learn how to play Tandem, a daily emoji word puzzle game similar to Wordle',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Understand the Basics',
        text: 'Each puzzle shows two emojis that represent a single word. Type your guess and press Enter to submit. You have 4 mistakes total across all puzzles.',
      },
      {
        '@type': 'HowToStep',
        name: 'Use Smart Hints',
        text: 'When you guess incorrectly, any letters in the correct position turn green and stay locked. Just fill in the remaining blanks for your next guess.',
      },
      {
        '@type': 'HowToStep',
        name: 'Solve All Four Puzzles',
        text: 'Complete all four emoji pairs to reveal the connecting theme. The theme ties all the words together.',
      },
      {
        '@type': 'HowToStep',
        name: 'Get Help When Needed',
        text: 'Select an answer field and tap the hint button to reveal helpful context. You start with 1 hint and unlock a 2nd after solving 2 puzzles.',
      },
    ],
  };

  const sections = [
    {
      id: 'basics',
      title: 'The Basics',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Each puzzle shows two emojis that represent a single word. Type your guess and press
            Enter to submit.
          </p>
          <p>
            You have 4 mistakes across all puzzles. The theme is revealed only when you solve all
            four emoji pairs.
          </p>
        </div>
      ),
    },
    {
      id: 'smart-hints',
      title: '💡 Smart Hints',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-3">
              <strong className="text-[#7ed957]">Green letters = locked in!</strong> When you guess
              incorrectly, any letters in the correct position turn green and stay locked. Just fill
              in the remaining blanks.
            </p>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 border-[3px] border-black dark:border-white">
              <p className="font-semibold mb-2">Example: Answer is PLAN</p>
              <div className="space-y-2 font-mono text-sm">
                <p>
                  Guess: <span className="text-[#ff5757] font-bold">PILL</span> → Result:{' '}
                  <span className="text-[#7ed957] font-bold">P</span>_ _ _
                </p>
                <p>Next guess: Only type 3 letters for the blanks</p>
              </div>
            </div>
          </div>
          <div>
            <p>
              <span className="font-semibold">💡 Need help?</span> Select an answer field and tap
              the hint button to reveal helpful context below that specific answer. You start with 1
              hint and unlock a 2nd hint after solving 2 puzzles.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'example',
      title: 'Example Round',
      content: (
        <div className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">☀️🔥</span>
              <span className="font-mono font-bold">= SUN</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic ml-2">
              Star → hot in the sky
            </p>

            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">🌶️🔥</span>
              <span className="font-mono font-bold">= PEPPER</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic ml-2">
              Spice → burns your mouth
            </p>

            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">☕🍵</span>
              <span className="font-mono font-bold">= COFFEE</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic ml-2">
              Drink → served hot
            </p>

            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">🏜️🌡️</span>
              <span className="font-mono font-bold">= DESERT</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic ml-2">
              Climate → scorching heat
            </p>

            <div className="mt-4 p-3 bg-[#ff5757] text-white rounded-2xl text-center font-bold border-[3px] border-black dark:border-white">
              🎉 Theme Revealed: Things That Are Hot 🔥
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'difficulty',
      title: 'Difficulty Ratings ⭐',
      content: (
        <div className="space-y-4 text-sm">
          <p>
            Each puzzle has a difficulty rating that appears after you complete it. These ratings
            help you reflect on the challenge and track your progress.
          </p>
          <div className="space-y-3">
            <div className="p-3 bg-[#7ed957]/20 border-[3px] border-[#7ed957] rounded-2xl">
              <p className="font-semibold mb-1">⭐ Easy</p>
              <p>Straightforward connections, common vocabulary, clear emojis</p>
            </div>
            <div className="p-3 bg-[#7ed957]/10 border-[3px] border-[#7ed957]/60 rounded-2xl">
              <p className="font-semibold mb-1">⭐⭐ Medium-Easy</p>
              <p>Some thinking required, mostly familiar words</p>
            </div>
            <div className="p-3 bg-[#ffce00]/20 border-[3px] border-[#ffce00] rounded-2xl">
              <p className="font-semibold mb-1">⭐⭐⭐ Medium</p>
              <p>Balanced challenge, requires creative thinking</p>
            </div>
            <div className="p-3 bg-[#ff751f]/20 border-[3px] border-[#ff751f] rounded-2xl">
              <p className="font-semibold mb-1">⭐⭐⭐⭐ Medium-Hard</p>
              <p>Clever connections, wordplay involved</p>
            </div>
            <div className="p-3 bg-[#ff5757]/20 border-[3px] border-[#ff5757] rounded-2xl">
              <p className="font-semibold mb-1">⭐⭐⭐⭐⭐ Hard</p>
              <p>Abstract themes, challenging vocabulary, obscure connections</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'streaks',
      title: 'Streaks 🔥',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Complete the daily puzzle on your first try and play consecutive days to build your
            streak! Keep coming back daily to maintain your streak and show off your consistency.
          </p>
        </div>
      ),
    },
    {
      id: 'hard-mode',
      title: '🔥 Hard Mode (Tandem Unlimited)',
      content: (
        <div className="space-y-4 text-sm">
          <p>For the ultimate challenge, Tandem Unlimited subscribers can enable Hard Mode:</p>
          <div className="bg-[#ff5757]/20 border-[3px] border-[#ff5757] rounded-2xl p-4">
            <h4 className="font-semibold mb-2">Hard Mode Rules:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>3-minute time limit</strong> - Complete the puzzle before time runs out
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>No hints available</strong> - Rely only on your word skills
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>Same mistake limit</strong> - You still have 4 mistakes maximum
                </span>
              </li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enable Hard Mode in Settings when you have an active Tandem Unlimited subscription.
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-bg-primary">
        {/* Scrollable content container */}
        <div className="min-h-screen flex items-center justify-center py-6">
          <div className="w-full max-w-xl mx-auto p-6 relative z-10 my-auto">
            {/* Back to game link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-6 text-white/80 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="text-sm font-medium">Back to Game</span>
            </Link>

            {/* Main content card */}
            <div className="relative">
              <div className="bg-ghost-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                {/* Header */}
                <div className="bg-[#ff66c4] border-b-[3px] border-black dark:border-white p-6 text-black">
                  <h1 className="text-3xl font-bold">How to Play Tandem</h1>
                  <p className="mt-2 text-black/80">Master the emoji puzzle game</p>
                </div>

                {/* Quick Start Card */}
                <div className="mx-6 -mt-3 mb-6 p-4 bg-ghost-white dark:bg-gray-900 rounded-2xl border-[3px] border-black dark:border-white">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Quick Start
                  </h3>
                  <ol className="text-sm space-y-2">
                    <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#ff66c4] font-bold">1.</span>
                      Look at the emoji pairs and guess the word they represent
                    </li>
                    <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#ff66c4] font-bold">2.</span>
                      Type your answer and press Enter
                    </li>
                    <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#ff66c4] font-bold">3.</span>
                      Correct letters lock in green - fill in the rest!
                    </li>
                    <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#ff66c4] font-bold">4.</span>
                      Solve all 4 to reveal the hidden theme
                    </li>
                  </ol>
                </div>

                {/* Content Accordion */}
                <div className="p-6 pt-0">
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <div
                        key={section.id}
                        className="border-[3px] border-black dark:border-white rounded-2xl overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setActiveSection(activeSection === section.id ? null : section.id)
                          }
                          className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {section.title}
                          </span>
                          <svg
                            className={`h-5 w-5 text-gray-800 dark:text-gray-200 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {activeSection === section.id && (
                          <div className="p-4 bg-ghost-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-t-[3px] border-black dark:border-white">
                            {section.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Call to Action */}
                  <div className="mt-6 pt-6 border-t-[3px] border-black dark:border-white">
                    <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                      Ready to Play?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      A new puzzle is released daily at midnight. Come back tomorrow for a fresh
                      challenge!
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff66c4] hover:bg-[#ff66c4]/90 text-black font-semibold rounded-2xl border-[3px] border-black dark:border-white transition-all"
                      >
                        🎮 Play Today's Puzzle
                      </Link>
                      <Link
                        href="/about"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-ghost-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-2xl border-[3px] border-black dark:border-white transition-all"
                      >
                        ℹ️ About Tandem
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              {/* Faux drop shadow */}
              <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-[32px] -z-10"></div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-white/80 text-sm">
              <p>
                Questions?{' '}
                <Link href="/support" className="text-white hover:underline font-semibold">
                  Visit our support page
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
