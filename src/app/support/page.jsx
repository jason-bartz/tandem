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
                <strong>Look at 4 emoji pairs</strong> - Each pair represents a single word
              </li>
              <li>
                <strong>Guess what they represent</strong> - Type your answer for each pair
                (character count is shown)
              </li>
              <li>
                <strong>Progressive hints on mistakes</strong> - Letters in correct positions turn
                green and stay locked, helping you narrow down the answer
              </li>
              <li>
                <strong>Solve all 4 puzzles</strong> - Complete all answers to discover the hidden
                theme
              </li>
              <li>
                <strong>Theme revealed upon completion</strong> - The connecting theme is shown only
                after solving
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
                <strong>Hint System</strong>: One hint per game reveals the first letter or next
                available character of a random unsolved answer
              </li>
              <li>
                <strong>Dark Mode</strong>: Easy on the eyes for night play
              </li>
              <li>
                <strong>Colorblind/High Contrast Mode</strong>: Accessible colors and patterns for
                better visibility
              </li>
              <li>
                <strong>Reduced Motion Mode</strong>: Minimizes animations for improved
                accessibility
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
                  A: You get one hint per game. It reveals the first letter or next available
                  character of a random unsolved answer. Character counts are always visible for
                  each puzzle.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: What are "locked letters"?</p>
                <p>
                  A: When you submit an incorrect answer, any letters that are correct AND in the
                  correct position will turn green and stay locked in place. You only need to fill
                  in the remaining letters. Example: If the answer is PAIN and you guess PILL, the P
                  stays green and locked.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: What counts as a correct answer?</p>
                <p>
                  A: Answers must match exactly (spelling matters). Answers are not case-sensitive.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Can I see the theme before solving?</p>
                <p>
                  A: No! The theme is hidden during gameplay and only revealed after you complete
                  the puzzle or use all your mistakes. This adds an element of discovery to the
                  game.
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
      id: 'hard-mode',
      title: 'Hard Mode (Tandem Unlimited)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">🔥 About Hard Mode</h4>
            <p className="text-sm mb-3">
              Hard Mode is an exclusive feature for Tandem Unlimited subscribers (iOS only) that
              adds a challenging twist to the classic Tandem gameplay.
            </p>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4">
              <h5 className="font-semibold mb-2">Hard Mode Rules:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>
                  <strong>3-minute time limit</strong> - You must complete the puzzle within 180
                  seconds
                </li>
                <li>
                  <strong>No hints available</strong> - The hint button is completely removed
                </li>
                <li>
                  <strong>Same mistake limit</strong> - You still have 4 mistakes maximum
                </li>
                <li>
                  <strong>Timer shows remaining time</strong> - Watch the countdown in red
                </li>
                <li>
                  <strong>Auto-fail on timeout</strong> - Game ends when time runs out
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">How to Enable Hard Mode</h4>
            <ol className="list-decimal list-inside text-sm space-y-2">
              <li>
                Subscribe to <strong>Tandem Unlimited</strong> (any tier: Buddy Pass, Best Friends,
                or Soulmates)
              </li>
              <li>
                Open the <strong>Settings</strong> menu (gear icon)
              </li>
              <li>
                Find the <strong>Hard Mode</strong> toggle in the Subscription section
              </li>
              <li>Toggle it ON to enable Hard Mode for your next game</li>
              <li>The setting persists across sessions until you toggle it off</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Hard Mode Features</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Visual Indicators:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>🔥 HARD MODE badge below puzzle date</li>
                  <li>Red countdown timer showing time remaining</li>
                  <li>
                    Red-tinted stats bar with pulsing animation when time is critical (30s left)
                  </li>
                  <li>Special completion messages for Hard Mode victories</li>
                </ul>
              </div>

              <div>
                <p className="font-medium">Statistics:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>Hard Mode games count toward regular statistics</li>
                  <li>No separate hard mode stats tracking</li>
                  <li>Streaks include both regular and hard mode completions</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Strategy Tips</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Scan all puzzles first</strong> - Quickly identify the easiest ones
              </li>
              <li>
                <strong>Start with obvious answers</strong> - Build momentum with quick solves
              </li>
              <li>
                <strong>Watch for patterns</strong> - The theme can help guess remaining answers
              </li>
              <li>
                <strong>Type quickly but accurately</strong> - Mistakes cost precious time
              </li>
              <li>
                <strong>Practice in regular mode first</strong> - Master the puzzle before
                attempting hard mode
              </li>
            </ul>
          </div>

          <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-4">
            <p className="text-sm">
              <strong>Note:</strong> Hard Mode is only available for subscribers with an active
              Tandem Unlimited subscription. Non-subscribers will see the Hard Mode toggle greyed
              out in Settings.
            </p>
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
                <strong>Email</strong>: support@goodvibesgames.com
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
            <p className="text-sm mb-3">
              We love hearing from our players! Share your feedback, feature requests, bug reports,
              and puzzle suggestions at support@goodvibesgames.com
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Join Our Community</h4>
            <p className="text-sm mb-3">
              Connect with other Tandem players, share strategies, and stay updated:
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Discord</strong>:{' '}
                <a
                  href="https://discord.gg/uSxtYQXtHN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  discord.gg/uSxtYQXtHN
                </a>
              </p>
              <p>
                <strong>Reddit</strong>:{' '}
                <a
                  href="https://www.reddit.com/r/Tandem_Daily/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  r/Tandem_Daily
                </a>
              </p>
            </div>
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
