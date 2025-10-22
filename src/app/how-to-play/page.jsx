import { siteConfig, generateBreadcrumbs } from '@/lib/seo-config';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export const metadata = {
  title: 'How to Play Tandem - Wordle-Style Emoji Puzzle Guide',
  description:
    'Learn how to play Tandem, the Wordle alternative with emoji pairs. Complete guide with examples, tips, and strategies for solving daily emoji word puzzles.',
  openGraph: {
    title: 'How to Play Tandem - Complete Guide',
    description: 'Master this Wordle-style emoji puzzle game with our complete how-to guide.',
    url: `${siteConfig.url}/how-to-play`,
  },
};

export default function HowToPlayPage() {
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

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Breadcrumbs />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How to Play Tandem
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Master the Wordle-Style Emoji Puzzle Game
            </p>
          </header>

          {/* Main Content */}
          <div className="space-y-8">
            {/* The Basics */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">The Basics</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Each puzzle shows two emojis that represent a single word. Type your guess and press
                Enter to submit.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                You have 4 mistakes across all puzzles. The theme is revealed only when you solve
                all four emoji pairs.
              </p>
            </section>

            {/* Smart Hints */}
            <section className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-8 shadow-lg border-2 border-green-300 dark:border-green-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span> Smart Hints
              </h2>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  <strong className="text-green-600 dark:text-green-400">
                    Green letters = locked in!
                  </strong>{' '}
                  When you guess incorrectly, any letters in the correct position turn green and
                  stay locked. Just fill in the remaining blanks.
                </p>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white mb-3">
                    Example: Answer is PLAN
                  </p>
                  <div className="space-y-2 font-mono">
                    <p className="text-gray-700 dark:text-gray-300">
                      Guess: <span className="text-red-600 dark:text-red-400 font-bold">PILL</span>{' '}
                      → Result:{' '}
                      <span className="text-green-600 dark:text-green-400 font-bold">P</span>_ _ _
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Next guess: Only type 3 letters for the blanks
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">💡 Need help?</span> Select an answer field and
                  tap the hint button to reveal helpful context below that specific answer. You
                  start with 1 hint and unlock a 2nd hint after solving 2 puzzles.
                </p>
              </div>
            </section>

            {/* Example Round */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Example Round
              </h2>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">☀️🔥</span>
                    <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                      = SUN
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Star → hot in the sky
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">🌶️🔥</span>
                    <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                      = PEPPER
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Spice → burns your mouth
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">☕🍵</span>
                    <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                      = COFFEE
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Drink → served hot
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">🏜️🌡️</span>
                    <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                      = DESERT
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Climate → scorching heat
                  </p>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl p-6 shadow-lg">
                  <p className="text-xl font-bold text-center">
                    🎉 Theme Revealed: Things That Are Hot 🔥
                  </p>
                </div>
              </div>
            </section>

            {/* Difficulty Ratings */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Difficulty Ratings ⭐
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                Each puzzle has a difficulty rating that appears after you complete it. These
                ratings help you reflect on the challenge and track your progress.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
                  <span className="text-2xl flex-shrink-0">⭐</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Easy</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Straightforward connections, common vocabulary, clear emojis
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
                  <span className="text-2xl flex-shrink-0">⭐⭐</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Medium-Easy</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Some thinking required, mostly familiar words
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800">
                  <span className="text-2xl flex-shrink-0">⭐⭐⭐</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Medium</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Balanced challenge, requires creative thinking
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border-2 border-orange-200 dark:border-orange-800">
                  <span className="text-2xl flex-shrink-0">⭐⭐⭐⭐</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Medium-Hard</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Clever connections, wordplay involved
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border-2 border-red-200 dark:border-red-800">
                  <span className="text-2xl flex-shrink-0">⭐⭐⭐⭐⭐</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Hard</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Abstract themes, challenging vocabulary, obscure connections
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Streaks */}
            <section className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-3xl p-8 shadow-lg border-2 border-orange-300 dark:border-orange-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Streaks 🔥</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Complete the daily puzzle on your first try and play consecutive days to build your
                streak! Keep coming back daily to maintain your streak and show off your
                consistency.
              </p>
            </section>

            {/* Hard Mode */}
            <section className="bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-3xl p-8 shadow-lg border-2 border-red-300 dark:border-red-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="text-2xl">🔥</span> Hard Mode
                <span className="text-sm px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-normal">
                  Tandem Unlimited
                </span>
              </h2>

              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                For the ultimate challenge, Tandem Unlimited subscribers can enable Hard Mode:
              </p>

              <ul className="space-y-3 mb-4">
                <li className="flex items-start gap-3 text-lg text-gray-700 dark:text-gray-300">
                  <span className="text-2xl flex-shrink-0">⏱️</span>
                  <span>
                    <strong>3-minute time limit</strong> - Complete the puzzle before time runs out
                  </span>
                </li>
                <li className="flex items-start gap-3 text-lg text-gray-700 dark:text-gray-300">
                  <span className="text-2xl flex-shrink-0">🚫</span>
                  <span>
                    <strong>No hints available</strong> - Rely only on your word skills
                  </span>
                </li>
              </ul>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enable Hard Mode in Settings when you have an active subscription. Only available on
                iOS.
              </p>
            </section>

            {/* Daily Puzzle */}
            <section className="bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/20 dark:to-teal-900/20 rounded-3xl p-8 shadow-lg border-2 border-sky-300 dark:border-sky-700 text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Play?
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                A new puzzle is released daily at midnight. Come back tomorrow for a fresh
                challenge!
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg transition-all border-2 border-sky-700 hover:translate-y-[-2px]"
              >
                <span className="text-xl">🎮</span> Play Today's Puzzle
              </a>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-16 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Questions?{' '}
              <a href="/about" className="text-sky-500 hover:text-sky-600 underline">
                Learn more about Tandem
              </a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
