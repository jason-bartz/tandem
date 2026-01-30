'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import SupportPageSkeleton from '@/components/shared/SupportPageSkeleton';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';
import { ASSET_VERSION } from '@/lib/constants';

export default function Support() {
  useTheme();
  const [activeGame, setActiveGame] = useState('tandem'); // 'tandem', 'mini', 'soup', or 'reel'
  const [activeSection, setActiveSection] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const tandemIcon = `/icons/ui/tandem.png?v=${ASSET_VERSION}`;

  // Daily Tandem sections
  const tandemSections = [
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
                <strong>Look at the 4 emoji pairs</strong> - Each pair represents a single word. All
                words are connected by a hidden theme
              </li>
              <li>
                <strong>Guess what they represent</strong> - Type your answer for each pair, then
                press &quot;Check&quot;
              </li>
              <li>
                <strong>Letter reveals on mistakes</strong> - Letters in correct positions turn
                green and stay in place, helping you narrow down the answer
              </li>
              <li>
                <strong>Progressive hint unlocking</strong> - Start with 1 hint, unlock a 2nd after
                solving 2 puzzles
              </li>
              <li>
                <strong>Solve all 4 puzzles</strong> - Complete all answers to discover the hidden
                theme
              </li>
              <li>
                <strong>Complete within 4 mistakes</strong> - You can make up to 4 incorrect guesses
              </li>
              <li>
                <strong>Theme revealed upon completion</strong> - The connecting theme is shown only
                after solving
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
                <strong>Puzzle Archive</strong>: Play previous puzzles (Tandem Puzzle Club feature)
              </li>
              <li>
                <strong>Streak Tracking</strong>: Build consecutive days of completed puzzles
              </li>
              <li>
                <strong>Statistics</strong>: Track your performance over time
              </li>
              <li>
                <strong>Dark Mode</strong>: Easy on the eyes for night play
              </li>
              <li>
                <strong>High Contrast Mode</strong>: Accessible colors and patterns for better
                visibility
              </li>
              <li>
                <strong>Reduced Motion Mode</strong>: Minimizes animations for improved
                accessibility
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'difficulty-ratings',
      title: 'Understanding Difficulty Ratings',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">What are Difficulty Ratings?</h4>
            <p className="text-sm mb-3">
              Each puzzle has a difficulty rating that appears after you complete a puzzle. Ratings
              are included in your share text and help you reflect on the challenge.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Difficulty Scale</h4>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-[#7ed957]/20 border-[3px] border-[#7ed957] rounded-2xl">
                <p className="font-semibold mb-1">⭐ Easy</p>
                <p>
                  Straightforward connections with common vocabulary and clear emojis. Most players
                  solve these quickly.
                </p>
              </div>
              <div className="p-3 bg-[#7ed957]/10 border-[3px] border-[#7ed957]/60 rounded-2xl">
                <p className="font-semibold mb-1">⭐ Medium-Easy</p>
                <p>Some thinking required, but vocabulary and connections are mostly familiar.</p>
              </div>
              <div className="p-3 bg-[#ffce00]/20 border-[3px] border-[#ffce00] rounded-2xl">
                <p className="font-semibold mb-1">⭐ Medium</p>
                <p>
                  Balanced challenge requiring creative thinking. Connections may not be immediately
                  obvious.
                </p>
              </div>
              <div className="p-3 bg-[#ff751f]/20 border-[3px] border-[#ff751f] rounded-2xl">
                <p className="font-semibold mb-1">⭐ Medium-Hard</p>
                <p>Clever connections with wordplay. Requires lateral thinking and persistence.</p>
              </div>
              <div className="p-3 bg-[#ff5757]/20 border-[3px] border-[#ff5757] rounded-2xl">
                <p className="font-semibold mb-1">⭐ Hard</p>
                <p>
                  Abstract themes, challenging vocabulary, or obscure connections. These puzzles
                  test your creativity and knowledge.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How Ratings are Determined</h4>
            <p className="text-sm">
              Difficulty ratings are assessed based on multiple factors including theme complexity,
              vocabulary level, emoji clarity, and hint directness. Ratings help you track your
              progress and challenge yourself with puzzles that match your skill level.
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
                <p>
                  A: Yes! Tandem is completely free with no advertisements. Today's puzzle and the
                  last 3 days are always free. Tandem Puzzle Club subscriptions unlock access to all
                  archived puzzles and exclusive features.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: When do new puzzles become available?</p>
                <p>A: A new puzzle is released daily at midnight in your local timezone.</p>
              </div>
              <div>
                <p className="font-medium">Q: Can I play previous puzzles?</p>
                <p>
                  A: Yes! The last 4 days (today + 3 previous days) are free. Older puzzles require
                  a Tandem Puzzle Club subscription, available on both iOS (via App Store) and web
                  (via Stripe).
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Is there a time limit?</p>
                <p>
                  A: No time limit in regular mode! Take as long as you need. Hard Mode (Tandem
                  Unlimited subscribers only) adds a 3-minute time limit for extra challenge.
                </p>
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
                  A: You start with 1 hint. Select an answer field and tap the hint button to reveal
                  helpful contextual text below that specific answer. After solving 2 puzzles, you
                  unlock a 2nd hint. Character counts are always visible for each puzzle.
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
      id: 'hard-mode',
      title: 'Hard Mode (Tandem Puzzle Club)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">🔥 About Hard Mode</h4>
            <p className="text-sm mb-3">
              Hard Mode is an exclusive feature for Tandem Puzzle Club subscribers that adds a
              challenging twist to the classic Tandem gameplay.
            </p>
            <div className="bg-[#ff5757]/20 border-[3px] border-[#ff5757] rounded-2xl p-4">
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
                Subscribe to <strong>Tandem Puzzle Club</strong> (any tier: Monthly Membership,
                Annual Membership, or Lifetime Membership)
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
  ];

  // Daily Mini sections
  const miniSections = [
    {
      id: 'mini-intro',
      title: 'Introduction to Daily Mini',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">What is Daily Mini?</h4>
            <p className="text-sm mb-3">
              Daily Mini is a quick 5×5 crossword puzzle designed to be solved in just a few
              minutes. It's perfect for a quick brain teaser during your coffee break!
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How to Play</h4>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>
                <strong>Select a cell</strong> - Tap any white square to begin typing
              </li>
              <li>
                <strong>Switch directions</strong> - Tap the same cell again to toggle between
                Across and Down
              </li>
              <li>
                <strong>Read the clue</strong> - The current clue appears in the bar above the
                keyboard
              </li>
              <li>
                <strong>Type your answer</strong> - Use the on-screen keyboard or your physical
                keyboard
              </li>
              <li>
                <strong>Navigate with arrows</strong> - Use arrow keys or swipe to move between
                cells
              </li>
              <li>
                <strong>Check your work</strong> - Use the check feature to verify squares, words,
                or the whole puzzle
              </li>
              <li>
                <strong>Complete the puzzle</strong> - Fill in all squares correctly to finish!
              </li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Game Features</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Daily Puzzles</strong>: One new 5×5 crossword every day at midnight
              </li>
              <li>
                <strong>Timer</strong>: Track your solving time (starts when you begin playing)
              </li>
              <li>
                <strong>Check & Reveal</strong>: Verify your answers or get help when stuck
              </li>
              <li>
                <strong>Auto-Check</strong>: Automatically highlight incorrect letters as you type
              </li>
              <li>
                <strong>Stats Tracking</strong>: Monitor your average time, streaks, and perfect
                solves
              </li>
              <li>
                <strong>Archive Access</strong>: Play previous puzzles (4-day free window)
              </li>
              <li>
                <strong>Dark Mode</strong>: Comfortable solving in any lighting
              </li>
              <li>
                <strong>Keyboard Support</strong>: Full physical keyboard shortcuts for desktop
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'mini-features',
      title: 'Check & Reveal Features',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Check Options</h4>
            <p className="text-sm mb-3">
              Use the list icon on the keyboard to access check and reveal options:
            </p>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300">
                <p className="font-semibold mb-1">Check Square</p>
                <p>
                  Verify if the currently selected cell is correct. Incorrect letters will be
                  cleared.
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300">
                <p className="font-semibold mb-1">Check Word</p>
                <p>
                  Verify all letters in the current word (Across or Down). Incorrect letters will be
                  cleared.
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300">
                <p className="font-semibold mb-1">Check Puzzle</p>
                <p>
                  Verify the entire puzzle. All incorrect letters will be cleared, and correct ones
                  will turn green.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Reveal Options</h4>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300">
                <p className="font-semibold mb-1">Reveal Square</p>
                <p>Show the correct letter for the currently selected cell.</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300">
                <p className="font-semibold mb-1">Reveal Word</p>
                <p>Show all correct letters for the current word (Across or Down).</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300">
                <p className="font-semibold mb-1">Reveal Puzzle</p>
                <p>Show the complete solution for the entire puzzle.</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Auto-Check Mode</h4>
            <p className="text-sm">
              Enable Auto-Check in settings to automatically highlight incorrect letters as you
              type. This provides immediate feedback and helps you catch mistakes early.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'mini-faq',
      title: 'Frequently Asked Questions',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Access & Subscription</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Q: Do I need an account to play Daily Mini?</p>
                <p>
                  A: Yes! Daily Mini requires a free account to play. You can sign in with Apple or
                  create an account with email.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Is Daily Mini free?</p>
                <p>
                  A: Yes! Today's puzzle and the last 3 days are always free with a free account.
                  Tandem Puzzle Club subscriptions unlock the entire archive.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: When do new puzzles become available?</p>
                <p>A: A new puzzle is released daily at midnight in your local timezone.</p>
              </div>
              <div>
                <p className="font-medium">Q: Can I play previous puzzles?</p>
                <p>
                  A: Yes! The last 4 days (today + 3 previous days) are free. Older puzzles require
                  a Tandem Puzzle Club subscription.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Gameplay</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Q: Is there a time limit?</p>
                <p>
                  A: No! The timer tracks your solving time, but you can take as long as you need to
                  complete the puzzle.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: How do I switch between Across and Down?</p>
                <p>
                  A: Tap the same cell again to toggle direction, or use arrow keys to move in
                  different directions.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: What counts as a perfect solve?</p>
                <p>
                  A: A perfect solve means completing the puzzle without using any checks or
                  reveals. Your stats track perfect solves separately.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Can I pause the timer?</p>
                <p>
                  A: The timer pauses automatically if you navigate away from the game or switch
                  apps. It resumes when you return.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'mini-stats',
      title: 'Statistics & Streaks',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Tracked Statistics</h4>
            <p className="text-sm mb-3">Daily Mini tracks your performance with these metrics:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Total Completed</strong>: Number of puzzles you've finished
              </li>
              <li>
                <strong>Current Streak</strong>: Consecutive days with completed puzzles
              </li>
              <li>
                <strong>Longest Streak</strong>: Your best streak ever
              </li>
              <li>
                <strong>Average Time</strong>: Your mean solving time across all puzzles
              </li>
              <li>
                <strong>Best Time</strong>: Your fastest solve
              </li>
              <li>
                <strong>Perfect Solves</strong>: Puzzles completed without checks or reveals
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How Streaks Work</h4>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Building a Streak</strong>: Complete the daily puzzle each day to maintain
                your streak. You must complete the puzzle on the same calendar day it's released (in
                your local timezone).
              </p>
              <p>
                <strong>Breaking a Streak</strong>: Missing a day will reset your current streak to
                zero, but your longest streak record is preserved.
              </p>
              <p>
                <strong>Archive Puzzles</strong>: Playing older puzzles from the archive does not
                count toward your daily streak.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'mini-troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Common Issues and Solutions</h4>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Problem: Keyboard doesn't appear on mobile</p>
                <p className="italic">Solution: Tap directly on a cell in the crossword grid.</p>
              </div>
              <div>
                <p className="font-medium">Problem: Can't switch between Across and Down</p>
                <p className="italic">
                  Solution: Tap the same cell again to toggle direction, or use arrow keys.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Timer isn't starting</p>
                <p className="italic">
                  Solution: Make sure you tap the "Start" button on the start screen before the
                  timer begins.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Stats not updating</p>
                <p className="italic">
                  Solution: Ensure you're signed in. Stats are only saved for authenticated users.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Can't access older puzzles</p>
                <p className="italic">
                  Solution: Puzzles older than 4 days require a Tandem Puzzle Club subscription.
                  Check your subscription status in Settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Reel Connections sections
  const reelSections = [
    {
      id: 'reel-getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">How to Play Reel Connections</h4>
            <p className="text-sm mb-3">
              Reel Connections is a movie-themed puzzle game where you group 16 movies into 4
              categories of 4 movies each. Find all four groups without making four mistakes!
            </p>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>
                <strong>Look at the 16 movie posters</strong> - Each movie belongs to one of four
                hidden categories
              </li>
              <li>
                <strong>Select four movies</strong> - Tap movies you think share a common connection
              </li>
              <li>
                <strong>Tap Submit</strong> - Check if your guess is correct
              </li>
              <li>
                <strong>Find all four groups</strong> - Complete all categories to win
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
                <strong>Puzzle Archive</strong>: Play previous puzzles (Tandem Puzzle Club feature)
              </li>
              <li>
                <strong>Hint System</strong>: One hint per game reveals the easiest unsolved
                category
              </li>
              <li>
                <strong>Streak Tracking</strong>: Build consecutive days of completed puzzles
              </li>
              <li>
                <strong>Statistics</strong>: Track your performance over time
              </li>
              <li>
                <strong>Dark Mode</strong>: Easy on the eyes for night play
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'reel-difficulty',
      title: 'Difficulty Levels',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Category Difficulty</h4>
            <p className="text-sm mb-3">
              Categories are color-coded by difficulty. Start with the easier categories to build
              momentum!
            </p>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border-2 border-yellow-400">
                <p className="font-semibold mb-1">MATINEE — Easiest</p>
                <p>Straightforward connections, commonly known movies and themes.</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border-2 border-blue-400">
                <p className="font-semibold mb-1">FEATURE — Easy</p>
                <p>Moderate difficulty, requires some movie knowledge.</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border-2 border-purple-400">
                <p className="font-semibold mb-1">PREMIERE — Medium</p>
                <p>Tricky connections that require careful thinking.</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border-2 border-red-500">
                <p className="font-semibold mb-1">GALA — Hardest</p>
                <p>Challenging themes, obscure connections, or wordplay involved.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'reel-hints',
      title: 'Hint System',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Using Hints</h4>
            <p className="text-sm mb-3">
              Stuck on a puzzle? You get <strong>one hint per game</strong>. Use it wisely!
            </p>
            <ul className="list-disc list-inside text-sm space-y-2">
              <li>
                <strong>Tap the Hint button</strong> to reveal the theme for a category
              </li>
              <li>
                <strong>Hints reveal the easiest unsolved category first</strong> (Matinee → Feature
                → Premiere → Gala)
              </li>
              <li>
                <strong>The hint shows the category name</strong>, but you still need to identify
                which movies belong
              </li>
              <li>
                <strong>Using a hint does not count as a mistake</strong>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Strategy Tips</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Start with movies you&apos;re confident about</li>
              <li>Look for obvious patterns first (same director, same decade, etc.)</li>
              <li>
                Be careful of &quot;red herring&quot; movies that could fit multiple categories
              </li>
              <li>Save your hint for when you&apos;re truly stuck</li>
              <li>Hold any poster and tap the banner to enlarge it for a better view</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'reel-examples',
      title: 'Example Connections',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Types of Connections</h4>
            <p className="text-sm mb-3">
              Categories can be based on many different types of connections:
            </p>
            <ul className="list-disc list-inside text-sm space-y-2">
              <li>
                <strong>Director:</strong> Movies Directed by Christopher Nolan
              </li>
              <li>
                <strong>Time Period:</strong> 80&apos;s Fantasy Movies
              </li>
              <li>
                <strong>Theme:</strong> Movies Starring a Furry Friend
              </li>
              <li>
                <strong>Music:</strong> Soundtracks That Produced a Billboard #1 Hit
              </li>
              <li>
                <strong>Actor:</strong> Movies Starring Tom Hanks
              </li>
              <li>
                <strong>Genre:</strong> Romantic Comedies Set in New York
              </li>
              <li>
                <strong>Wordplay:</strong> Movies with Colors in the Title
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'reel-faq',
      title: 'Frequently Asked Questions',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">General Questions</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Q: Is Reel Connections free to play?</p>
                <p>
                  A: Yes! Today&apos;s puzzle and the last 3 days are always free. Tandem Puzzle
                  Club subscriptions unlock access to all archived puzzles.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: When do new puzzles become available?</p>
                <p>A: A new puzzle is released daily at midnight in your local timezone.</p>
              </div>
              <div>
                <p className="font-medium">Q: How many guesses do I get?</p>
                <p>
                  A: You can make up to 4 mistakes. The game ends if you exceed this limit without
                  finding all four categories.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: What if I get 3 out of 4 movies right?</p>
                <p>
                  A: The game will tell you &quot;One away!&quot; if you have exactly 3 correct
                  movies selected. This doesn&apos;t count as a mistake, but you need to figure out
                  which movie to swap.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Can I deselect a movie?</p>
                <p>
                  A: Yes! Tap a selected movie again to deselect it. You can also use the Deselect
                  All button to clear your selection.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'reel-troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Common Issues and Solutions</h4>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Problem: Movie posters not loading</p>
                <p className="italic">
                  Solution: Check your internet connection. Posters are loaded from the server and
                  require connectivity.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Can&apos;t see the full movie title</p>
                <p className="italic">
                  Solution: Hold any poster and tap the banner to enlarge it for a better view of
                  the title and poster.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Streak reset unexpectedly</p>
                <p className="italic">
                  Solution: Streaks reset if you miss a day. For PWA users, clearing browser data
                  will also reset streaks.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Game shows yesterday&apos;s puzzle</p>
                <p className="italic">
                  Solution: Hard refresh the page (Ctrl+F5 on desktop, pull down to refresh on
                  mobile) or force quit and reopen the app.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Daily Alchemy sections
  const soupSections = [
    {
      id: 'soup-getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">What is Daily Alchemy?</h4>
            <p className="text-sm mb-3">
              Daily Alchemy is a daily element combination puzzle inspired by alchemy and crafting
              games. Start with four basic elements (Earth, Water, Fire, Wind) and combine them to
              create new elements. Your goal is to discover the target element of the day!
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How to Play</h4>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>
                <strong>Start with 4 elements</strong> - Earth, Water, Fire, and Wind are always
                available
              </li>
              <li>
                <strong>Select two elements</strong> - Tap on elements in your bank to add them to
                the combination area
              </li>
              <li>
                <strong>Combine them</strong> - Press the Combine button to create something new
              </li>
              <li>
                <strong>Build your element bank</strong> - New elements are added to your collection
              </li>
              <li>
                <strong>Find the target</strong> - Keep combining until you create the daily target
                element
              </li>
              <li>
                <strong>Beat the clock</strong> - You have 10 minutes to find the target before time
                runs out!
              </li>
              <li>
                <strong>Beat the par</strong> - Try to reach the target in fewer moves than par!
              </li>
            </ol>
          </div>
          {/* Demo GIF */}
          <div className="rounded-2xl overflow-hidden border-[3px] border-gray-300 dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.2)]">
            <img
              src="/screenshots/dailyalchemy-howto.gif"
              alt="Daily Alchemy gameplay demo"
              className="w-full h-auto"
            />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Game Features</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Daily Puzzles</strong>: One new target element every day at midnight
              </li>
              <li>
                <strong>10-Minute Timer</strong>: Find the target before time runs out!
              </li>
              <li>
                <strong>Par System</strong>: Each puzzle has a par (benchmark number of moves)
              </li>
              <li>
                <strong>First Discoveries</strong>: Be the first to discover a new element
                combination!
              </li>
              <li>
                <strong>Time & Moves Tracking</strong>: Track your solving time and number of moves
              </li>
              <li>
                <strong>Search & Sort</strong>: Easily find elements in your bank
              </li>
              <li>
                <strong>Creative Mode</strong>: Unlimited time with no goal (Tandem Puzzle Club)
              </li>
              <li>
                <strong>Archive Access</strong>: Play previous puzzles (4-day free window)
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'soup-combinations',
      title: 'Combination Tips',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">How Combinations Work</h4>
            <p className="text-sm mb-3">
              Every element combination produces a result. The AI determines what two elements
              create when combined. Results are based on logic, creativity, and sometimes wordplay!
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Example Combinations</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Water + Fire</strong> = Steam
              </li>
              <li>
                <strong>Earth + Water</strong> = Mud
              </li>
              <li>
                <strong>Fire + Fire</strong> = Inferno
              </li>
              <li>
                <strong>Steam + Earth</strong> = Geyser
              </li>
              <li>
                <strong>Wind + Fire</strong> = Smoke
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Strategy Tips</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Start with basics</strong> - Combine starter elements first to build a
                foundation
              </li>
              <li>
                <strong>Think logically</strong> - What would naturally result from combining these
                elements?
              </li>
              <li>
                <strong>Try combining the same element</strong> - Fire + Fire might surprise you!
              </li>
              <li>
                <strong>Use search</strong> - When your bank gets large, search for specific
                elements
              </li>
              <li>
                <strong>Multiple paths exist</strong> - There's often more than one way to reach the
                target
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'soup-hints',
      title: 'Hint System',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Using Hints</h4>
            <p className="text-sm mb-3">
              Stuck on a puzzle? You get <strong>four hints per puzzle</strong>. Look for the hint
              icons in the stats bar at the top of the game screen.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How Hints Work</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Tap a hint icon</strong> to use one of your hints
              </li>
              <li>
                <strong>Both elements will be selected</strong> for a combination that's part of the
                solution path to the target
              </li>
              <li>
                <strong>Just tap Combine</strong> to create the element and progress toward the
                target
              </li>
              <li>
                <strong>Hints disappear</strong> as you use them — you can see how many remain
              </li>
            </ul>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border-2 border-green-400">
            <p className="font-semibold mb-1">Pro Tip</p>
            <p className="text-sm">
              Save your hints for when you're truly stuck. Try experimenting with different
              combinations first — you might discover an unexpected path to the target!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'soup-first-discoveries',
      title: 'First Discoveries',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">What are First Discoveries?</h4>
            <p className="text-sm mb-3">
              When you combine two elements that no one has ever combined before, you make a{' '}
              <strong>First Discovery</strong>! You'll be credited as the discoverer of that
              combination.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How It Works</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Global database</strong> - All element combinations are stored and shared
              </li>
              <li>
                <strong>Instant notification</strong> - You'll see a special celebration when you
                make a first discovery
              </li>
              <li>
                <strong>Your name is recorded</strong> - First discoveries are attributed to your
                account
              </li>
              <li>
                <strong>Share your discoveries</strong> - First discoveries appear in your share
                text
              </li>
            </ul>
          </div>
          <div className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border-2 border-yellow-400">
            <p className="font-semibold mb-1">Pro Tip</p>
            <p className="text-sm">
              To maximize first discoveries, try unusual or creative combinations that others might
              not think of!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'soup-faq',
      title: 'Frequently Asked Questions',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">General Questions</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Q: Is Daily Alchemy free to play?</p>
                <p>
                  A: Yes! Today's puzzle and the last 3 days are always free. Tandem Puzzle Club
                  subscriptions unlock access to all archived puzzles.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: When do new puzzles become available?</p>
                <p>A: A new puzzle is released daily at midnight in your local timezone.</p>
              </div>
              <div>
                <p className="font-medium">Q: What is "par" in Daily Alchemy?</p>
                <p>
                  A: Par is the benchmark number of moves (combinations) to reach the target
                  element. It represents a good solving pace - try to match or beat it!
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Can I combine any two elements?</p>
                <p>
                  A: Yes! Any two elements can be combined, including combining an element with
                  itself. Every combination produces a result.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: What if I can't find the target element?</p>
                <p>
                  A: Keep experimenting! There are often multiple paths to the target. Try building
                  up related elements and combining them in new ways. You can also use one of your
                  four hints to get a nudge in the right direction.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: How does the hint system work?</p>
                <p>
                  A: You get four hints per puzzle. Tap a hint icon in the stats bar to use one.
                  Each hint selects both elements of a combination that's part of the solution path
                  — just tap Combine to make progress! Hint icons disappear as you use them.
                </p>
              </div>
              <div>
                <p className="font-medium">Q: Do duplicate combinations count against my moves?</p>
                <p>
                  A: No! Only the first time you make a combination counts toward your move total.
                  If you accidentally repeat the same combination, it won't affect your par score.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'soup-creative-mode',
      title: 'Creative Mode (Tandem Puzzle Club)',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">🎨 About Creative Mode</h4>
            <p className="text-sm mb-3">
              Creative Mode is an exclusive feature for Tandem Puzzle Club subscribers that lets you
              explore element combinations without any restrictions.
            </p>
            <div className="bg-purple-50 dark:bg-purple-900/20 border-[3px] border-purple-400 rounded-2xl p-4">
              <h5 className="font-semibold mb-2">Creative Mode Features:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>
                  <strong>No time limit</strong> - Take as long as you want to explore
                </li>
                <li>
                  <strong>No target goal</strong> - Combine elements freely without pressure
                </li>
                <li>
                  <strong>Pure discovery</strong> - Focus on finding new and interesting
                  combinations
                </li>
                <li>
                  <strong>First discovery hunting</strong> - Perfect for finding combinations no one
                  else has found
                </li>
                <li>
                  <strong>Build your collection</strong> - Expand your element bank at your own pace
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">How to Access Creative Mode</h4>
            <ol className="list-decimal list-inside text-sm space-y-2">
              <li>
                Subscribe to <strong>Tandem Puzzle Club</strong> (any tier: Monthly Membership,
                Annual Membership, or Lifetime Membership)
              </li>
              <li>
                Open <strong>Daily Alchemy</strong> from the home screen
              </li>
              <li>
                On the welcome screen, tap <strong>Creative Mode</strong> below the daily puzzle
                start button
              </li>
              <li>
                After completing or failing a daily puzzle, you can also switch to Creative Mode
                from the results screen
              </li>
            </ol>
          </div>

          <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border-2 border-purple-400">
            <p className="font-semibold mb-1">Pro Tip</p>
            <p className="text-sm">
              Creative Mode is the best way to hunt for first discoveries! Without time pressure,
              you can experiment with unusual combinations that others might not try.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'soup-troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Common Issues and Solutions</h4>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Problem: Combination is taking too long</p>
                <p className="italic">
                  Solution: The AI generates new combinations on the fly. If it's slow, check your
                  internet connection. Most combinations are cached and return instantly.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Can't find an element in my bank</p>
                <p className="italic">
                  Solution: Use the search field to filter elements. You can also sort by "A-Z" for
                  alphabetical order.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Game shows yesterday's puzzle</p>
                <p className="italic">
                  Solution: Hard refresh the page (Ctrl+F5 on desktop, pull down to refresh on
                  mobile) or force quit and reopen the app.
                </p>
              </div>
              <div>
                <p className="font-medium">Problem: Progress not saving</p>
                <p className="italic">
                  Solution: Make sure you're signed in. Progress is saved automatically but requires
                  authentication.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Shared sections (platforms, account, contact)
  const sharedSections = [
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
              <li>Tandem Puzzle Club subscription with full Hard Mode support</li>
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
              <li>Tandem Puzzle Club subscription available via Stripe</li>
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
      id: 'account',
      title: 'Account Management',
      content: (
        <div className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Q: How do I delete my account?</p>
              <p>
                A: You can delete your account directly in the app. Web users: Go to Account page →
                Danger Zone → Delete Account. iOS users: Go to Settings → Account → Manage Account →
                Danger Zone → Delete Account. You will be asked to confirm before deletion proceeds.
              </p>
            </div>
            <div>
              <p className="font-medium">Q: What happens when I delete my account?</p>
              <p>
                A: Account deletion is immediate and permanent. All your account data, game
                progress, statistics, and preferences will be deleted. If you used Sign in with
                Apple, your authorization will be revoked. Note: Billing history is retained for 7
                years for legal compliance.
              </p>
            </div>
            <div>
              <p className="font-medium">Q: Will deleting my account cancel my subscription?</p>
              <p>
                A: No! Account deletion does NOT cancel your subscription. You must cancel
                separately. iOS: Cancel via iPhone Settings → Your Name → Subscriptions. Web: Cancel
                via the Stripe billing portal (accessible from Account page → Manage Account).
                Cancel your subscription BEFORE deleting your account to avoid continued billing.
              </p>
            </div>
            <div>
              <p className="font-medium">Q: Can I recover my account after deletion?</p>
              <p>
                A: No. Account deletion is permanent and irreversible. Once deleted, all your data
                is permanently removed and cannot be recovered.
              </p>
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
              We're here to help! If you couldn't find an answer to your question, please use our
              feedback form:
            </p>
            <div className="mb-4">
              <button
                onClick={() => setShowFeedback(true)}
                className="inline-block px-4 py-2 bg-[#38b6ff] hover:bg-[#2a9ee0] text-white font-semibold rounded-xl transition-colors"
              >
                Submit Feedback
              </button>
            </div>
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
            <h4 className="font-semibold mb-2">Join Our Community</h4>
            <p className="text-sm mb-3">
              Connect with other players, share strategies, and stay updated:
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Discord</strong>:{' '}
                <a
                  href="https://discord.gg/uSxtYQXtHN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#38b6ff] dark:text-[#38b6ff] hover:underline font-semibold"
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
                  className="text-[#38b6ff] dark:text-[#38b6ff] hover:underline font-semibold"
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

  const currentSections =
    activeGame === 'tandem'
      ? [...tandemSections, ...sharedSections]
      : activeGame === 'mini'
        ? [...miniSections, ...sharedSections]
        : activeGame === 'soup'
          ? [...soupSections, ...sharedSections]
          : [...reelSections, ...sharedSections];

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-bg-primary">
        {/* Scrollable content container */}
        <div className="min-h-screen flex items-center justify-center pt-safe pb-6">
          <div className="w-full max-w-xl mx-auto p-6 relative z-10 my-auto">
            {/* Show skeleton while loading */}
            {isLoading ? (
              <SupportPageSkeleton />
            ) : (
              <div className="relative">
                {/* Main content card */}
                <div className="bg-ghost-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                  {/* Header with back button, title, and hamburger menu */}
                  <div className="flex items-center justify-between p-6 pb-4 border-b-[3px] border-black dark:border-white">
                    <Link
                      href="/"
                      className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
                      aria-label="Back to game"
                    >
                      <svg
                        className="w-6 h-6 text-gray-800 dark:text-gray-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      Support & Help
                    </h1>
                    <HamburgerMenu
                      isOpen={isSidebarOpen}
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                  </div>

                  {/* Game Toggle */}
                  <div className="p-6 pb-4">
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => {
                          setActiveGame('tandem');
                          setActiveSection(null);
                        }}
                        className={`px-2 py-3 rounded-2xl border-[3px] font-bold text-sm transition-all ${
                          activeGame === 'tandem'
                            ? 'bg-ghost-white text-black border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-ghost-white/50 text-black/60 border-black/30 hover:bg-ghost-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Image
                            src={tandemIcon}
                            alt="Daily Tandem"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                          <span className="hidden sm:inline">Tandem</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setActiveGame('mini');
                          setActiveSection(null);
                        }}
                        className={`px-2 py-3 rounded-2xl border-[3px] font-bold text-sm transition-all ${
                          activeGame === 'mini'
                            ? 'bg-ghost-white text-black border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-ghost-white/50 text-black/60 border-black/30 hover:bg-ghost-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Image
                            src={`/icons/ui/mini.png?v=${ASSET_VERSION}`}
                            alt="Daily Mini"
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-lg"
                          />
                          <span className="hidden sm:inline">Mini</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setActiveGame('soup');
                          setActiveSection(null);
                        }}
                        className={`px-2 py-3 rounded-2xl border-[3px] font-bold text-sm transition-all ${
                          activeGame === 'soup'
                            ? 'bg-ghost-white text-black border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-ghost-white/50 text-black/60 border-black/30 hover:bg-ghost-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Image
                            src={`/icons/ui/daily-alchemy.png?v=${ASSET_VERSION}`}
                            alt="Daily Alchemy"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                          <span className="hidden sm:inline">Alchemy</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setActiveGame('reel');
                          setActiveSection(null);
                        }}
                        className={`px-2 py-3 rounded-2xl border-[3px] font-bold text-sm transition-all ${
                          activeGame === 'reel'
                            ? 'bg-ghost-white text-black border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : 'bg-ghost-white/50 text-black/60 border-black/30 hover:bg-ghost-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Image
                            src={`/icons/ui/movie.png?v=${ASSET_VERSION}`}
                            alt="Reel Connections"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                          <span className="hidden sm:inline">Reel</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-0">
                    <div className="space-y-2">
                      {currentSections.map((section) => (
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

                    {/* System Requirements */}
                    <div className="mt-8 pt-6 border-t-[3px] border-black dark:border-white">
                      <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                        System Requirements
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium mb-1 text-gray-700 dark:text-gray-300">
                            iOS App
                          </h4>
                          <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                            <li>• iPhone or iPad</li>
                            <li>• iOS 14.0 or later</li>
                            <li>• 50MB free storage</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Web (PWA)
                          </h4>
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
                {/* Faux drop shadow */}
                <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-[32px] -z-10"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Menu */}
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenFeedback={() => setShowFeedback(true)}
      />

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <UnifiedArchiveCalendar isOpen={showArchive} onClose={() => setShowArchive(false)} />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}
