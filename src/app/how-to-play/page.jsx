'use client';

import { useState } from 'react';
import { generateBreadcrumbs } from '@/lib/seo-config';
import Link from 'next/link';
import Image from 'next/image';

export default function HowToPlayPage() {
  const [activeSection, setActiveSection] = useState(null);
  const [activeTab, setActiveTab] = useState('tandem');

  const breadcrumbSchema = generateBreadcrumbs([{ name: 'How to Play', path: '/how-to-play' }]);

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Play Tandem Daily Games',
    description:
      'Learn how to play Tandem Daily Games including Daily Tandem, Daily Mini crossword, and Reel Connections movie puzzle',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Choose a Game',
        text: 'Pick from Daily Tandem (emoji word puzzles), Daily Mini (crossword), or Reel Connections (movie connections).',
      },
      {
        '@type': 'HowToStep',
        name: 'Solve the Puzzle',
        text: 'Each game has unique mechanics. Follow the in-game instructions to solve the daily puzzle.',
      },
      {
        '@type': 'HowToStep',
        name: 'Build Your Streak',
        text: 'Complete puzzles daily to maintain your streak and compete on the leaderboards.',
      },
    ],
  };

  // Tab configuration
  const tabs = [
    { id: 'tandem', label: 'Tandem', icon: '/icons/ui/tandem.png', color: '#38b6ff' },
    { id: 'mini', label: 'Mini', icon: '/icons/ui/mini.png', color: '#ffce00' },
    { id: 'reel', label: 'Reel', icon: '/icons/ui/movie.png', color: '#ef4444' },
  ];

  // Tandem sections
  const tandemSections = [
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
      title: 'Smart Hints',
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
              <span className="font-semibold">Need help?</span> Select an answer field and tap the
              hint button to reveal helpful context below that specific answer. You start with 1
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
            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">🌶️🔥</span>
              <span className="font-mono font-bold">= PEPPER</span>
            </div>
            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">☕🍵</span>
              <span className="font-mono font-bold">= COFFEE</span>
            </div>
            <div className="flex items-center justify-between bg-[#ff751f]/10 dark:bg-[#ff751f]/20 rounded-xl p-3 border-[2px] border-[#ff751f]">
              <span className="text-2xl">🏜️🌡️</span>
              <span className="font-mono font-bold">= DESERT</span>
            </div>
            <div className="mt-4 p-3 bg-[#ff5757] text-white rounded-2xl text-center font-bold border-[3px] border-black dark:border-white">
              Theme Revealed: Things That Are Hot
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'streaks',
      title: 'Streaks',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Complete the daily puzzle on your first try and play consecutive days to build your
            streak! Keep coming back daily to maintain your streak and show off your consistency.
          </p>
        </div>
      ),
    },
  ];

  // Mini sections
  const miniSections = [
    {
      id: 'basics',
      title: 'The Basics',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Daily Mini is a 5x5 crossword puzzle designed to be completed in just a few minutes.
            Fill in the grid using the clues provided.
          </p>
          <p>
            Tap a clue or a cell to start typing. Use the arrow keys or tap cells to navigate. The
            puzzle is complete when all cells are correctly filled.
          </p>
        </div>
      ),
    },
    {
      id: 'controls',
      title: 'Controls',
      content: (
        <div className="space-y-3 text-sm">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#ffce00] font-bold">•</span>
              <span>Tap a cell or clue to select it</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffce00] font-bold">•</span>
              <span>Tap the selected clue again to switch direction (across/down)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffce00] font-bold">•</span>
              <span>Use backspace to delete letters</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ffce00] font-bold">•</span>
              <span>The puzzle auto-advances to the next cell as you type</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'help',
      title: 'Getting Help',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            <strong>Check:</strong> Verify if your current answers are correct. Incorrect letters
            will be highlighted.
          </p>
          <p>
            <strong>Reveal:</strong> Stuck on a clue? Reveal the answer for a single cell or the
            entire word.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Note: Using Check or Reveal will affect your &quot;perfect solve&quot; status.
          </p>
        </div>
      ),
    },
    {
      id: 'streaks',
      title: 'Streaks',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Complete the daily mini puzzle each day to build your streak. Your current streak and
            best streak are tracked in the stats.
          </p>
        </div>
      ),
    },
  ];

  // Reel sections
  const reelSections = [
    {
      id: 'basics',
      title: 'The Basics',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Find groups of four movies that share something in common. Select four movie posters and
            tap Submit to check if your guess is correct.
          </p>
          <p>
            Find all four groups without making four mistakes. Categories are color-coded by
            difficulty from yellow (easiest) to red (hardest).
          </p>
        </div>
      ),
    },
    {
      id: 'difficulty',
      title: 'Difficulty Levels',
      content: (
        <div className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-yellow-300" />
              <span>Easiest - Most obvious connections</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-blue-400" />
              <span>Easy - Clear but requires some thought</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-purple-400" />
              <span>Medium - Tricky connections</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Hardest - Obscure or wordplay-based</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tips',
      title: 'Tips',
      content: (
        <div className="space-y-3 text-sm">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#ef4444] font-bold">•</span>
              <span>Hold any poster, then tap the banner to enlarge it for a better view</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ef4444] font-bold">•</span>
              <span>Look for common themes: actors, directors, genres, years, or wordplay</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ef4444] font-bold">•</span>
              <span>Start with the group you&apos;re most confident about</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ef4444] font-bold">•</span>
              <span>If you&apos;re &quot;one away,&quot; try swapping just one movie</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'streaks',
      title: 'Streaks',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Complete the daily Reel Connections puzzle each day to build your streak. Win without
            using all your mistakes to keep your streak alive!
          </p>
        </div>
      ),
    },
  ];

  // Get sections based on active tab
  const getSections = () => {
    switch (activeTab) {
      case 'mini':
        return miniSections;
      case 'reel':
        return reelSections;
      default:
        return tandemSections;
    }
  };

  // Get theme color based on active tab
  const getThemeColor = () => {
    switch (activeTab) {
      case 'mini':
        return '#ffce00';
      case 'reel':
        return '#ef4444';
      default:
        return '#38b6ff';
    }
  };

  // Get game title
  const getTitle = () => {
    switch (activeTab) {
      case 'mini':
        return 'How to Play Daily Mini';
      case 'reel':
        return 'How to Play Reel Connections';
      default:
        return 'How to Play Tandem';
    }
  };

  // Get play link
  const getPlayLink = () => {
    switch (activeTab) {
      case 'mini':
        return '/dailymini';
      case 'reel':
        return '/reel-connections';
      default:
        return '/';
    }
  };

  // Get quick start content
  const getQuickStart = () => {
    switch (activeTab) {
      case 'mini':
        return (
          <ol className="text-sm space-y-2">
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                1.
              </span>
              Read the crossword clues for across and down
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                2.
              </span>
              Tap a cell or clue to start typing your answer
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                3.
              </span>
              Fill in all cells to complete the puzzle
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                4.
              </span>
              Race against the clock for your best time!
            </li>
          </ol>
        );
      case 'reel':
        return (
          <ol className="text-sm space-y-2">
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                1.
              </span>
              Find four movies that share something in common
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                2.
              </span>
              Tap four movie posters to select them
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                3.
              </span>
              Press Submit to check your group
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                4.
              </span>
              Find all four groups to win!
            </li>
          </ol>
        );
      default:
        return (
          <ol className="text-sm space-y-2">
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                1.
              </span>
              Look at the emoji pairs and guess the word they represent
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                2.
              </span>
              Type your answer and press Enter
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                3.
              </span>
              Correct letters lock in green - fill in the rest!
            </li>
            <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <span style={{ color: getThemeColor() }} className="font-bold">
                4.
              </span>
              Solve all 4 to reveal the hidden theme
            </li>
          </ol>
        );
    }
  };

  const sections = getSections();

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
              href={getPlayLink()}
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
                <div
                  className="border-b-[3px] border-black dark:border-white p-6"
                  style={{ backgroundColor: getThemeColor() }}
                >
                  <h1
                    className={`text-3xl font-bold ${activeTab === 'mini' ? 'text-gray-900' : 'text-white'}`}
                  >
                    {getTitle()}
                  </h1>
                  <p
                    className={`mt-2 ${activeTab === 'mini' ? 'text-gray-900/80' : 'text-white/80'}`}
                  >
                    {activeTab === 'reel'
                      ? 'Master the movie connections game'
                      : activeTab === 'mini'
                        ? 'Master the mini crossword'
                        : 'Master the emoji puzzle game'}
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b-[3px] border-black dark:border-white">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setActiveSection(null);
                      }}
                      className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
                        activeTab === tab.id
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      style={{
                        borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : 'none',
                        marginBottom: activeTab === tab.id ? '-3px' : '0',
                      }}
                    >
                      <Image src={tab.icon} alt="" width={20} height={20} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Quick Start Card */}
                <div className="mx-6 mt-6 mb-6 p-4 bg-ghost-white dark:bg-gray-900 rounded-2xl border-[3px] border-black dark:border-white">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Quick Start
                  </h3>
                  {getQuickStart()}
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
                        href={getPlayLink()}
                        className="inline-flex items-center gap-2 px-4 py-2 hover:opacity-90 font-semibold rounded-2xl border-[3px] border-black dark:border-white transition-all"
                        style={{
                          backgroundColor: getThemeColor(),
                          color: activeTab === 'mini' ? '#1f2937' : 'white',
                        }}
                      >
                        Play Today&apos;s Puzzle
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
