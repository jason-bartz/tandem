'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function Support() {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState(null);

  const backgroundImage =
    theme === 'dark' ? "url('/images/dark-mode-bg.webp')" : "url('/images/light-mode-bg.webp')";

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">How to Play Tandem</h4>
            <p className="text-sm">Tandem is a daily word puzzle game where you:</p>
            <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
              <li>
                <strong>Look at 4 emoji pairs</strong> - Each pair represents a word or phrase
              </li>
              <li>
                <strong>Guess what they represent</strong> - Type your answer for each pair
              </li>
              <li>
                <strong>Find the connecting theme</strong> - All 4 answers share a common theme
              </li>
              <li>
                <strong>Complete within 4 mistakes</strong> - You can make up to 4 incorrect guesses
              </li>
              <li>
                <strong>Maintain your streak</strong> - Come back daily for new puzzles!
              </li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Game Features</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Daily Puzzles</strong>: One new puzzle every day at midnight (your local
                time)
              </li>
              <li>
                <strong>Puzzle Archive</strong>: Access and play previous puzzles
              </li>
              <li>
                <strong>Streak Tracking</strong>: Build consecutive days of completed puzzles
              </li>
              <li>
                <strong>Statistics</strong>: Track your performance over time
              </li>
              <li>
                <strong>Hint System</strong>: One hint per game reveals character count and first
                letter
              </li>
              <li>
                <strong>Dark Mode</strong>: Easy on the eyes for night play
              </li>
              <li>
                <strong>Sound Effects</strong>: Optional audio feedback
              </li>
              <li>
                <strong>Offline Play</strong>: Available in iOS native app only
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'platforms',
      title: 'Available Platforms',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">iOS App (iPhone & iPad)</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Native iOS app</strong> available on the Apple App Store
              </li>
              <li>Full offline support - play without internet connection</li>
              <li>Optimized for iPhone and iPad</li>
              <li>Download from the App Store</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Progressive Web App (PWA)</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Web-based version</strong> accessible from any browser
              </li>
              <li>Install to home screen for app-like experience</li>
              <li>Works on all devices with modern browsers</li>
              <li>Requires internet connection to play</li>
              <li>Visit tandemdaily.com to play</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Android App</h4>
            <p className="text-sm">
              <strong>Coming Soon</strong> to Google Play Store. Currently, Android users can enjoy
              the PWA version. Visit tandemdaily.com on your Android device.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">General Questions</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Q: Is Tandem free to play?</p>
                <p>A: Yes! Tandem is completely free with no advertisements.</p>
              </div>
              <div>
                <p className="font-medium">Q: When do new puzzles become available?</p>
                <p>A: A new puzzle is released daily at midnight in your local timezone.</p>
              </div>
              <div>
                <p className="font-medium">Q: Can I play previous puzzles?</p>
                <p>A: Yes! You can access and play previous puzzles through the archive feature.</p>
              </div>
              <div>
                <p className="font-medium">Q: Is there a time limit?</p>
                <p>A: No time limit! Take as long as you need to solve the puzzle.</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Gameplay</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Q: How many guesses do I get?</p>
                <p>A: You can make up to 4 mistakes. The game ends if you exceed this limit.</p>
              </div>
              <div>
                <p className="font-medium">Q: How does the hint system work?</p>
                <p>
                  A: You get one hint per game. It reveals the character count and first letter of a
                  random unsolved answer.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: What counts as a correct answer?</p>
                <p>
                  A: Answers must match exactly (spelling matters). Answers are not case-sensitive.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Common Issues and Solutions</h4>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Problem: Game shows yesterday's puzzle</p>
                <p className="italic">
                  Solution: Hard refresh the page (Ctrl+F5 on desktop, pull down to refresh on
                  mobile) or force quit and reopen the iOS app.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Keyboard doesn't appear on mobile</p>
                <p className="italic">Solution: Tap directly on the answer input field.</p>
              </div>
              <div>
                <p className="font-medium">Problem: Dark mode isn't working</p>
                <p className="italic">
                  Solution: Toggle the moon/sun icon in the top corner. The preference saves
                  automatically.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Can't share results</p>
                <p className="italic">
                  Solution: Ensure your device supports sharing. Try taking a screenshot if the
                  share button isn't working.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Streak reset unexpectedly</p>
                <p className="italic">
                  Solution: Streaks reset if you miss a day. For PWA users, clearing browser data
                  will also reset streaks.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      title: 'Contact Support',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Get in Touch</h4>
            <p className="text-sm mb-4">
              We're here to help! If you couldn't find an answer to your question, please reach out:
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Email</strong>: jason@goodvibesgames.com
              </p>
              <p>
                <strong>Response Time</strong>: Within 24-48 hours
              </p>
              <p>
                <strong>Developer</strong>: Good Vibes Games
              </p>
              <p>
                <strong>Website</strong>: tandemdaily.com
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">When Contacting Support</h4>
            <p className="text-sm mb-2">Please include:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Platform (iOS app or PWA)</li>
              <li>Device type and operating system</li>
              <li>App version (iOS) or browser name and version (PWA)</li>
              <li>Description of the issue</li>
              <li>Screenshots if applicable</li>
              <li>Steps you've already tried</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Feedback & Suggestions</h4>
            <p className="text-sm">
              We love hearing from our players! Share your feedback, feature requests, bug reports,
              and puzzle suggestions at jason@goodvibesgames.com
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden"
      style={{
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
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
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 p-6 text-white">
              <h1 className="text-3xl font-bold">Tandem Support</h1>
              <p className="mt-2 text-sky-100">
                Welcome! We're here to help you enjoy your daily puzzle experience.
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-2">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setActiveSection(activeSection === section.id ? null : section.id)
                      }
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors"
                    >
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {section.title}
                      </span>
                      <svg
                        className={`h-5 w-5 text-gray-500 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`}
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
                      <div className="p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {section.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* System Requirements */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  System Requirements
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-1 text-gray-700 dark:text-gray-300">iOS App</h4>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• iPhone or iPad</li>
                      <li>• iOS 14.0 or later</li>
                      <li>• 50MB free storage</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-gray-700 dark:text-gray-300">Web (PWA)</h4>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Chrome 90+, Safari 14+</li>
                      <li>• Active internet connection</li>
                      <li>• JavaScript enabled</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional info */}
          <div className="mt-6 text-center text-white/80 text-sm">
            <p>Thank you for playing Tandem! We hope you enjoy your daily puzzle adventure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
