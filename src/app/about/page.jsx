'use client';

import { useState } from 'react';
import { generateBreadcrumbs } from '@/lib/seo-config';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function AboutPage() {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState(null);

  const breadcrumbSchema = generateBreadcrumbs([{ name: 'About', path: '/about' }]);

  const sections = [
    {
      id: 'what-is-tandem',
      title: 'What is Tandem?',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Tandem is a free daily word puzzle game that challenges you to decode emoji pairs. Each
            puzzle presents four emoji combinations that all connect to a hidden theme. Your job?
            Figure out what word each emoji pair represents!
          </p>
          <p>
            Like Wordle, we release a fresh puzzle every day at midnight in your local timezone.
            Play, share your results, and come back tomorrow for a new challenge!
          </p>
        </div>
      ),
    },
    {
      id: 'wordle-comparison',
      title: 'How is Tandem Different from Wordle?',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">🎯 Visual Word Puzzles</h4>
            <p>
              While Wordle focuses on guessing a 5-letter word through letter elimination, Tandem
              presents emoji pairs that visually represent words. You decode the emoji clues rather
              than guessing individual letters.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🧩 Connected Themes</h4>
            <p>
              Each Tandem puzzle has four emoji pairs that all relate to a hidden theme. The theme
              is revealed when you solve all four puzzles, adding an extra layer of satisfaction to
              the challenge.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">💡 Smart Hints System</h4>
            <p>
              When you guess incorrectly, Tandem locks in any correct letters (shown in green), so
              you only need to fill in the remaining blanks. Plus, you get hints that provide
              context clues to help you solve tricky puzzles.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🎮 Same Daily Format</h4>
            <p>
              Just like Wordle, everyone gets the same puzzle each day. You can share your results,
              compare with friends, and build your streak by playing daily.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'why-tandem',
      title: 'Why We Built Tandem',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            We love Wordle and the daily puzzle game format it popularized. But we wanted to create
            something that exercised a different part of your brain - visual association and
            creative thinking.
          </p>
          <p>
            Emojis are a universal language that everyone understands, yet they can represent words
            in surprisingly clever ways. Combining two emojis to represent a single word creates
            endless possibilities for wordplay and creative connections.
          </p>
          <p>
            Tandem is perfect for Wordle fans who want a fresh daily challenge that feels familiar
            yet different. It's quick to play, satisfying to solve, and gives your brain a fun
            workout every day.
          </p>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Features',
      content: (
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Free to Play:</strong> Enjoy unlimited daily puzzles at no cost
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>New Puzzles Daily:</strong> Fresh challenge every day at midnight
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Play Anywhere:</strong> Works on mobile, tablet, and desktop
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Dark Mode:</strong> Easy on the eyes, day or night
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Track Your Progress:</strong> View stats, streaks, and achievements
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Build Streaks:</strong> Play daily to keep your streak alive
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Share Results:</strong> Show off your solving skills on social media
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#7ed957]">✓</span>
            <span>
              <strong>Difficulty Ratings:</strong> See how challenging each puzzle was after solving
            </span>
          </div>
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
              <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                {/* Header */}
                <div className="bg-[#38b6ff] border-b-[3px] border-black dark:border-white p-6 text-black">
                  <h1 className="text-3xl font-bold">About Tandem</h1>
                  <p className="mt-2 text-black/80">A Wordle alternative with an emoji twist</p>
                </div>

                {/* Hero Summary Card */}
                <div className="mx-6 -mt-3 mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border-[3px] border-black dark:border-white">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    Quick Facts
                  </h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#38b6ff]">•</span>
                      Daily emoji word puzzles, just like Wordle
                    </li>
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#38b6ff]">•</span>
                      Decode emoji pairs instead of guessing letters
                    </li>
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#38b6ff]">•</span>
                      Free to play, no ads or tracking
                    </li>
                    <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-[#38b6ff]">•</span>
                      Share your results with friends
                    </li>
                  </ul>
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
                          <div className="p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-t-[3px] border-black dark:border-white">
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
                      Jump right in and try today's puzzle! No signup required. If you enjoy Wordle,
                      you'll love Tandem's unique twist on daily word puzzles.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#38b6ff] hover:bg-[#38b6ff]/90 text-black font-semibold rounded-2xl border-[3px] border-black dark:border-white transition-all"
                      >
                        🎮 Play Today's Puzzle
                      </Link>
                      <Link
                        href="/how-to-play"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-2xl border-[3px] border-black dark:border-white transition-all"
                      >
                        📖 How to Play
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              {/* Faux drop shadow */}
              <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-white/80 text-sm">
              <p>
                Questions or feedback?{' '}
                <Link href="/support" className="text-white hover:underline font-semibold">
                  Contact us
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
