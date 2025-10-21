'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function TermsOfUse() {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState(null);

  const backgroundImage =
    theme === 'dark' ? "url('/images/dark-mode-bg.webp')" : "url('/images/light-mode-bg.webp')";

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            By accessing or playing Tandem ("the Game") at tandemdaily.com or through our iOS app,
            you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these
            Terms, please do not use the Game.
          </p>
          <p>
            These Terms apply to all users of the Game, including those who access it through our
            website, progressive web app (PWA), or iOS application.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Effective Date</strong>: August 15, 2025
            <br />
            <strong>Last Updated</strong>: October 13, 2025
          </p>
        </div>
      ),
    },
    {
      id: 'game-description',
      title: 'Game Description',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Tandem is a daily word puzzle game where players decode emoji pairs to guess words
            related to a daily theme. The Game is provided by Good Vibes Games ("we," "us," or
            "our") for entertainment purposes.
          </p>
          <p>Features include:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>One free daily puzzle for all users</li>
            <li>Archive of past puzzles (subscription required for full access)</li>
            <li>Statistics tracking and streak counting</li>
            <li>Game Center achievements and leaderboards (iOS only)</li>
            <li>iCloud sync across devices (iOS only)</li>
            <li>Optional in-app purchases for premium features</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'use-license',
      title: 'License to Use',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            We grant you a limited, non-exclusive, non-transferable, revocable license to access and
            play the Game for personal, non-commercial use only, subject to these Terms.
          </p>
          <p>You may not:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Copy, modify, or distribute the Game</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the Game for commercial purposes</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Use automated systems or bots to play</li>
            <li>Interfere with or disrupt the Game's operation</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions and Purchases',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Tandem Unlimited Subscriptions</h4>
            <p className="mb-2">We offer optional subscriptions for premium features:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Buddy Pass</strong>: Monthly subscription ($1.99/month)
              </li>
              <li>
                <strong>Best Friends</strong>: Annual subscription ($14.99/year)
              </li>
              <li>
                <strong>Soulmates</strong>: Lifetime access ($29.99 one-time)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Billing and Renewal</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Payment processed through Apple App Store</li>
              <li>Subscriptions auto-renew unless canceled 24 hours before renewal</li>
              <li>Manage subscriptions in your Apple ID Account Settings</li>
              <li>No refunds for partial subscription periods</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Free Content</h4>
            <p>
              The daily puzzle will always remain free. Premium subscriptions provide access to
              archived puzzles and future premium features.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            All content in the Game, including puzzles, graphics, logos, and software, is owned by
            Good Vibes Games or licensed to us. This content is protected by copyright, trademark,
            and other intellectual property laws.
          </p>
          <p>You may not:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Reproduce or redistribute Game content</li>
            <li>Create derivative works based on the Game</li>
            <li>Use our trademarks without permission</li>
            <li>Remove copyright or proprietary notices</li>
          </ul>
          <p className="mt-2">
            Sharing game results on social media as intended by the share feature is permitted and
            encouraged.
          </p>
        </div>
      ),
    },
    {
      id: 'user-content',
      title: 'User Generated Content',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            While the Game doesn't currently support user-generated content, if you provide
            feedback, suggestions, or ideas, you grant us the right to use them without compensation
            or attribution.
          </p>
        </div>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Your use of the Game is also governed by our Privacy Policy, which describes how we
            collect, use, and protect your information. By using the Game, you consent to our
            privacy practices.
          </p>
          <p>
            <Link
              href="/privacypolicy"
              className="text-[#38b6ff] dark:text-[#38b6ff] hover:underline font-semibold"
            >
              View our Privacy Policy
            </Link>
          </p>
        </div>
      ),
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers and Limitations',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">No Warranties</h4>
            <p>
              The Game is provided "as is" without warranties of any kind. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-2">
              <li>The Game will be error-free or uninterrupted</li>
              <li>Defects will be corrected</li>
              <li>The Game will be available at all times</li>
              <li>Results or scores will be accurately preserved</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Limitation of Liability</h4>
            <p>
              To the fullest extent permitted by law, Good Vibes Games shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages resulting from your
              use or inability to use the Game.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Indemnification</h4>
            <p>
              You agree to indemnify and hold harmless Good Vibes Games from any claims arising from
              your violation of these Terms or use of the Game.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'modifications',
      title: 'Modifications to Game or Terms',
      content: (
        <div className="space-y-3 text-sm">
          <p>We reserve the right to:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Modify or discontinue the Game at any time</li>
            <li>Change subscription prices with notice</li>
            <li>Update these Terms as needed</li>
            <li>Add or remove features</li>
          </ul>
          <p className="mt-2">
            Continued use of the Game after changes constitutes acceptance of modified Terms.
          </p>
        </div>
      ),
    },
    {
      id: 'termination',
      title: 'Termination',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            We may terminate or suspend your access to the Game at any time for violation of these
            Terms or for any other reason. Upon termination:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Your license to use the Game ends immediately</li>
            <li>Active subscriptions continue until the end of the billing period</li>
            <li>No refunds will be provided</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'age-requirements',
      title: 'Age Requirements',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            The Game is suitable for all ages. However, users under 13 years old should have
            parental permission before playing. In-app purchases require:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Users must be 18+ to make purchases</li>
            <li>Minors need parental consent for subscriptions</li>
            <li>Parents are responsible for their children's use</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'apple-terms',
      title: 'Apple App Store Terms',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">General iOS Terms</h4>
            <p className="mb-2">For iOS users, additional terms apply:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>These Terms are between you and Good Vibes Games, not Apple</li>
              <li>Apple has no obligation to provide maintenance or support</li>
              <li>Apple is not responsible for product claims or liabilities</li>
              <li>Third-party beneficiary rights apply to Apple</li>
              <li>You must comply with Apple's Terms of Service</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Game Center</h4>
            <p className="mb-2">If you use Game Center features:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>You must comply with Apple's Game Center Terms and Conditions</li>
              <li>Game Center data is managed by Apple according to their privacy policy</li>
              <li>You are responsible for your Game Center profile and conduct</li>
              <li>We may display your Game Center nickname and achievements to other players</li>
              <li>Game Center authentication is optional and can be disabled in iOS Settings</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">iCloud Sync</h4>
            <p className="mb-2">If you enable iCloud sync:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>You must have an active iCloud account</li>
              <li>Data is stored in your personal iCloud storage</li>
              <li>iCloud data is governed by Apple's iCloud Terms and Conditions</li>
              <li>We are not responsible for iCloud sync failures or data loss</li>
              <li>You can disable iCloud sync at any time in Settings</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            These Terms are governed by the laws of the United States and the State of New York,
            without regard to conflict of law principles. Any disputes shall be resolved in the
            courts of New York.
          </p>
        </div>
      ),
    },
    {
      id: 'contact',
      title: 'Contact Information',
      content: (
        <div className="space-y-3 text-sm">
          <p>For questions about these Terms, contact us at:</p>
          <div className="mt-3 space-y-1">
            <p>
              <strong>Good Vibes Games</strong>
            </p>
            <p>Email: support@goodvibesgames.com</p>
            <p>Website: tandemdaily.com</p>
          </div>
        </div>
      ),
    },
    {
      id: 'entire-agreement',
      title: 'Entire Agreement',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between
            you and Good Vibes Games regarding the Game and supersede any prior agreements.
          </p>
          <p>
            If any provision of these Terms is found invalid, the remaining provisions continue in
            full force and effect.
          </p>
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
          <div className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden translate-x-[4px] translate-y-[4px] relative z-10">
              {/* Header */}
              <div className="bg-[#ff66c4] border-b-[3px] border-black dark:border-white p-6 text-black">
                <h1 className="text-3xl font-bold">Terms of Use</h1>
                <p className="mt-2 text-black/80">Please read these terms carefully</p>
              </div>

              {/* Summary Card */}
              <div className="mx-6 -mt-3 mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border-[3px] border-black dark:border-white">
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Key Points</h3>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-[#ff66c4]">•</span>
                    Free to play daily puzzle
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-[#ff66c4]">•</span>
                    Optional subscriptions for archive access
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-[#ff66c4]">•</span>
                    Suitable for all ages
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-[#ff66c4]">•</span>
                    Personal, non-commercial use only
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-[#ff66c4]">•</span>
                    Subscriptions managed through Apple
                  </li>
                </ul>
              </div>

              {/* Content */}
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
              </div>
            </div>
            {/* Faux drop shadow */}
            <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
          </div>

          {/* Additional info */}
          <div className="mt-6 text-center text-white/80 text-sm">
            <p>By playing Tandem, you agree to these terms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
