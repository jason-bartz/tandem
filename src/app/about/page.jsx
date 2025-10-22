import { siteConfig, generateBreadcrumbs } from '@/lib/seo-config';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export const metadata = {
  title: 'About Tandem - The Wordle Alternative with an Emoji Twist',
  description:
    'Discover Tandem, a unique Wordle alternative that combines emoji puzzles with word guessing. Learn how this daily word game puts a creative spin on the classic Wordle format.',
  openGraph: {
    title: 'About Tandem - Wordle Alternative with Emoji Puzzles',
    description:
      'A daily word puzzle game inspired by Wordle, but with emoji pairs. Free to play, new puzzles daily.',
    url: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  const breadcrumbSchema = generateBreadcrumbs([{ name: 'About', path: '/about' }]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Breadcrumbs />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              About Tandem
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              A Daily Word Puzzle Game with an Emoji Twist
            </p>
          </header>

          {/* Main Content */}
          <div className="space-y-12">
            {/* What is Tandem */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                What is Tandem?
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Tandem is a free daily word puzzle game that challenges you to decode emoji pairs.
                Each puzzle presents four emoji combinations that all connect to a hidden theme.
                Your job? Figure out what word each emoji pair represents!
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Like Wordle, we release a fresh puzzle every day at midnight in your local timezone.
                Play, share your results, and come back tomorrow for a new challenge!
              </p>
            </section>

            {/* Wordle Comparison */}
            <section className="bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/20 dark:to-teal-900/20 rounded-3xl p-8 shadow-lg border-2 border-sky-300 dark:border-sky-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                How is Tandem Different from Wordle?
              </h2>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">🎯</span> Visual Word Puzzles
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    While Wordle focuses on guessing a 5-letter word through letter elimination,
                    Tandem presents emoji pairs that visually represent words. You decode the emoji
                    clues rather than guessing individual letters.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">🧩</span> Connected Themes
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Each Tandem puzzle has four emoji pairs that all relate to a hidden theme. The
                    theme is revealed when you solve all four puzzles, adding an extra layer of
                    satisfaction to the challenge.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">💡</span> Smart Hints System
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    When you guess incorrectly, Tandem locks in any correct letters (shown in
                    green), so you only need to fill in the remaining blanks. Plus, you get hints
                    that provide context clues to help you solve tricky puzzles.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">🎮</span> Same Daily Format
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Just like Wordle, everyone gets the same puzzle each day. You can share your
                    results, compare with friends, and build your streak by playing daily.
                  </p>
                </div>
              </div>
            </section>

            {/* Why We Built Tandem */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Why We Built Tandem
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                We love Wordle and the daily puzzle game format it popularized. But we wanted to
                create something that exercised a different part of your brain - visual association
                and creative thinking.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                Emojis are a universal language that everyone understands, yet they can represent
                words in surprisingly clever ways. Combining two emojis to represent a single word
                creates endless possibilities for wordplay and creative connections.
              </p>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Tandem is perfect for Wordle fans who want a fresh daily challenge that feels
                familiar yet different. It is quick to play, satisfying to solve, and gives your
                brain a fun workout every day.
              </p>
            </section>

            {/* Features */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Features</h2>
              <ul className="space-y-4 text-lg text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">✅</span>
                  <span>
                    <strong>Free to Play:</strong> Enjoy unlimited daily puzzles at no cost
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">📅</span>
                  <span>
                    <strong>New Puzzles Daily:</strong> Fresh challenge every day at midnight
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">📱</span>
                  <span>
                    <strong>Play Anywhere:</strong> Works on mobile, tablet, and desktop
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎨</span>
                  <span>
                    <strong>Dark Mode:</strong> Easy on the eyes, day or night
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">📊</span>
                  <span>
                    <strong>Track Your Progress:</strong> View stats, streaks, and achievements
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🔥</span>
                  <span>
                    <strong>Build Streaks:</strong> Play daily to keep your streak alive
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">📤</span>
                  <span>
                    <strong>Share Results:</strong> Show off your solving skills on social media
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎯</span>
                  <span>
                    <strong>Difficulty Ratings:</strong> See how challenging each puzzle was after
                    solving
                  </span>
                </li>
              </ul>
            </section>

            {/* Getting Started */}
            <section className="bg-gradient-to-br from-teal-100 to-sky-100 dark:from-teal-900/20 dark:to-sky-900/20 rounded-3xl p-8 shadow-lg border-2 border-teal-300 dark:border-teal-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to Play?
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                Jump right in and try today's puzzle! No signup required. If you enjoy Wordle,
                you'll love Tandem's unique twist on daily word puzzles.
              </p>
              <div className="flex gap-4 flex-wrap">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg transition-all border-2 border-sky-700 hover:translate-y-[-2px]"
                >
                  <span className="text-xl">🎮</span> Play Today's Puzzle
                </a>
                <a
                  href="/how-to-play"
                  className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold px-8 py-4 rounded-2xl shadow-lg transition-all border-2 border-gray-300 dark:border-gray-600 hover:translate-y-[-2px]"
                >
                  <span className="text-xl">📖</span> How to Play
                </a>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-16 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Questions or feedback?{' '}
              <a href="/support" className="text-sky-500 hover:text-sky-600 underline">
                Contact us
              </a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
