'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import LegalPageSkeleton from '@/components/shared/LegalPageSkeleton';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';

export default function TermsOfUse() {
  const [activeSection, setActiveSection] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            By accessing or playing Tandem Daily Games ("the Games") at tandemdaily.com or through
            our iOS app, you agree to be bound by these Terms of Use ("Terms"). If you do not agree
            to these Terms, please do not use the Games.
          </p>
          <p>
            These Terms apply to all users of the Games, including those who access them through our
            website, progressive web app (PWA), or iOS application.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Effective Date</strong>: August 15, 2025
            <br />
            <strong>Last Updated</strong>: January 27, 2026
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
            We offer daily word puzzle games provided by Good Vibes Games ("we," "us," or "our") for
            entertainment purposes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-3">
            <li>
              <strong>Daily Tandem</strong>: Decode emoji pairs to guess words related to a daily
              theme
            </li>
            <li>
              <strong>Daily Mini</strong>: A quick 5x5 mini crossword puzzle
            </li>
            <li>
              <strong>Reel Connections</strong>: Group movies that share a common theme into four
              categories
            </li>
            <li>
              <strong>Daily Alchemy</strong>: Combine elements to discover new compounds and reach
              target elements
            </li>
          </ul>
          <p>Features include:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>One free daily puzzle for all users</li>
            <li>Archive of past puzzles (subscription required for full access)</li>
            <li>Statistics tracking and streak counting</li>
            <li>Global leaderboards for competition (requires free account)</li>
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
            <h4 className="font-semibold mb-2">Tandem Puzzle Club Subscriptions</h4>
            <p className="mb-2">We offer optional subscriptions for premium features:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Monthly Membership</strong>: Monthly subscription ($1.99/month)
              </li>
              <li>
                <strong>Annual Membership</strong>: Annual subscription ($14.99/year)
              </li>
              <li>
                <strong>Lifetime Membership</strong>: Lifetime access ($29.99 one-time)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Billing and Renewal</h4>
            <p className="mb-2">Subscriptions are managed through Stripe (web) and Apple (iOS):</p>
            <p className="mb-2 text-sm">
              <strong>iOS App Store:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mb-3">
              <li>Payment processed through Apple App Store</li>
              <li>Subscriptions auto-renew unless canceled 24 hours before renewal</li>
              <li>Manage subscriptions in your Apple ID Account Settings</li>
              <li>No refunds for partial subscription periods</li>
            </ul>
            <p className="mb-2 text-sm">
              <strong>Web (via Stripe):</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Payment processed securely through Stripe</li>
              <li>Requires account creation with email and password or Google OAuth</li>
              <li>Subscriptions auto-renew unless canceled before renewal</li>
              <li>Manage subscriptions through your account page or Stripe customer portal</li>
              <li>Refund policy follows Stripe's standard terms</li>
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
      id: 'leaderboards',
      title: 'Leaderboards and Competitive Features',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Automatic Enrollment</h4>
            <p>
              When you create a free account on our web platform, you are automatically enrolled in
              our global leaderboards to compete with players worldwide. Your username, avatar (if
              provided), and gameplay performance will be publicly visible on leaderboards.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Opting Out</h4>
            <p>
              Leaderboard participation is automatic for all logged-in users. If you wish to opt out
              of leaderboards, you may log out of your account or delete your account entirely.
              While logged out, your gameplay will not appear on public leaderboards. Your local
              gameplay statistics will still be tracked on your device for your personal use.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Fair Play</h4>
            <p>By participating in leaderboards, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Play fairly without using automated tools, bots, or cheating methods</li>
              <li>Not manipulate scores or game times through technical exploits</li>
              <li>Use appropriate usernames free of offensive or inappropriate content</li>
              <li>
                Not impersonate other players or create multiple accounts to manipulate rankings
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Enforcement</h4>
            <p>
              We reserve the right to remove leaderboard entries, suspend accounts, or take other
              actions against users who violate fair play rules or engage in inappropriate behavior.
              Decisions regarding leaderboard moderation are at our sole discretion.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">No Guarantees</h4>
            <p>
              Leaderboard rankings are provided "as is" without warranty. We do not guarantee the
              accuracy, completeness, or availability of leaderboard data. Rankings may be reset or
              modified at our discretion.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'daily-alchemy-discoveries',
      title: 'Daily Alchemy First Discoveries',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">First Discovery Credits</h4>
            <p>
              In Daily Alchemy, signed-in players who are the first to discover a new element
              combination receive permanent credit as the discoverer. Your username will be publicly
              displayed alongside your discovery for all players to see.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Requirements</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>You must be signed in to receive first discovery credit</li>
              <li>Discoveries made while not signed in cannot be credited retroactively</li>
              <li>First discovery credits are permanent and cannot be transferred or removed</li>
              <li>Your username (not email or other personal information) is displayed publicly</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">No Guarantees</h4>
            <p>
              We do not guarantee the accuracy or availability of first discovery data. Discovery
              credits are provided "as is" and may be affected by technical issues or data
              corrections. This feature is available on both web and iOS.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai-generated-content',
      title: 'AI-Generated Content',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Use of Artificial Intelligence</h4>
            <p>
              Daily Alchemy uses artificial intelligence (AI) to generate element combinations. When
              you combine two elements, an AI system determines the resulting element based on
              creative interpretation of the inputs. This AI-generated content is provided for
              entertainment purposes only.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">No Warranties on AI Content</h4>
            <p className="mb-2">
              AI-generated content is provided "as is" without warranties of any kind. We do not
              guarantee that AI-generated content will be:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Accurate, complete, or factually correct</li>
              <li>Free from errors, inconsistencies, or unexpected outputs</li>
              <li>Suitable for any purpose beyond entertainment</li>
              <li>Representative of our views or opinions</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Limitation of Liability</h4>
            <p>
              Good Vibes Games shall not be liable for any claims, damages, or losses arising from
              AI-generated content, including but not limited to inaccurate information, unexpected
              combinations, or any reliance on such content. AI-generated element combinations in
              Daily Alchemy are fictional and should not be interpreted as scientific, educational,
              or factual information.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Content Moderation</h4>
            <p>
              While we make reasonable efforts to review and moderate AI-generated content, we
              cannot guarantee that all content will meet every user's expectations. If you
              encounter AI-generated content that appears inappropriate or incorrect, please report
              it through our feedback form.
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
      id: 'user-accounts',
      title: 'User Accounts (Web Only)',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Web users may create an account to access Tandem Puzzle Club features. By creating an
            account, you agree to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms or for
            any other reason.
          </p>
        </div>
      ),
    },
    {
      id: 'account-deletion-rights',
      title: 'Account Deletion Rights',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Your Right to Delete Your Account</h4>
            <p className="mb-2">
              In compliance with applicable laws and regulations, you have the right to delete your
              account at any time. Account deletion is available directly within the app:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Web Users</strong>: Navigate to Account page → Danger Zone → Delete Account
              </li>
              <li>
                <strong>iOS Users</strong>: Settings → Account → Manage Account → Danger Zone →
                Delete Account
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What Happens When You Delete Your Account</h4>
            <p className="mb-2">When you delete your account:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Your account credentials and personal data will be permanently deleted</li>
              <li>Your game progress and statistics will be erased</li>
              <li>
                Your subscription records will be deleted (subject to legal retention requirements)
              </li>
              <li>If you used Sign in with Apple, your authorization will be revoked</li>
              <li>This action is immediate and irreversible</li>
            </ul>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <p className="font-semibold mb-2 text-orange-900 dark:text-orange-200">
              Important: Active Subscriptions
            </p>
            <p className="text-orange-800 dark:text-orange-300 mb-2">
              Deleting your account does NOT cancel active subscriptions. You must cancel your
              subscription separately:
            </p>
            <ul className="list-disc list-inside space-y-1 text-orange-800 dark:text-orange-300">
              <li>
                <strong>iOS</strong>: Cancel via App Store → Subscriptions before deleting your
                account
              </li>
              <li>
                <strong>Web</strong>: Cancel via Stripe billing portal before deleting your account
              </li>
            </ul>
            <p className="text-orange-800 dark:text-orange-300 mt-2">
              Failure to cancel your subscription before deleting your account will result in
              continued billing.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Retention After Deletion</h4>
            <p className="mb-2">
              While we delete most data immediately upon account deletion, we may retain certain
              information for legal and regulatory compliance:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                Transaction records and billing history: Retained for 7 years (tax and financial
                regulations)
              </li>
              <li>Security logs: Retained for 30 days</li>
              <li>
                Anonymized analytics data: May be retained indefinitely for product improvement
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Questions About Account Deletion?</h4>
            <p>
              For assistance with account deletion or questions about data removal, contact us at
              support@goodvibesgames.com. We typically respond within 24-48 hours.
            </p>
          </div>
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
      id: 'stripe-terms',
      title: 'Stripe Payment Processing',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Web Subscriptions</h4>
            <p className="mb-2">
              For web users, payments are processed by Stripe, Inc. ("Stripe"):
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Your payment information is collected and processed by Stripe</li>
              <li>You must comply with Stripe's Terms of Service</li>
              <li>Stripe's privacy policy applies to your payment data</li>
              <li>We do not store your credit card information on our servers</li>
              <li>Billing disputes should be addressed through Stripe's customer service</li>
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
          <p>For questions about these Terms, please contact us using our feedback form:</p>
          <div className="mt-3">
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-block px-4 py-2 bg-[#38b6ff] hover:bg-[#2a9ee0] text-white font-semibold rounded-xl transition-colors"
            >
              Contact Support
            </button>
          </div>
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
              <LegalPageSkeleton />
            ) : (
              <div className="relative">
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
                      Terms of Use
                    </h1>
                    <HamburgerMenu
                      isOpen={isSidebarOpen}
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                  </div>

                  {/* Summary Card */}
                  <div className="mx-6 mt-6 mb-6 p-4 bg-ghost-white dark:bg-gray-900 rounded-2xl border-[3px] border-black dark:border-white">
                    <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
                      Key Points
                    </h3>
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
                        Subscriptions managed through Apple or Stripe
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
                            <div className="p-4 bg-ghost-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-t-[3px] border-black dark:border-white">
                              {section.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Agreement statement */}
                    <div className="mt-6 p-4 bg-[#ff66c4]/20 border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                      <p className="text-sm text-center text-gray-700 dark:text-gray-300">
                        By playing <strong>Tandem Daily Games</strong>, you agree to these terms
                      </p>
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
