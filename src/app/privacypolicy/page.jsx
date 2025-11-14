'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import LegalPageSkeleton from '@/components/shared/LegalPageSkeleton';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import ArchiveModalPaginated from '@/components/game/ArchiveModalPaginated';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';

export default function PrivacyPolicy() {
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
      id: 'introduction',
      title: 'Introduction',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Welcome to Daily Tandem and Daily Cryptic ("we," "our," or "us"), daily word puzzle
            games developed by Good Vibes Games. We respect your privacy and are committed to
            protecting your personal data. This privacy policy explains how we collect, use, and
            safeguard information when you play our games at tandemdaily.com (the "Service").
          </p>
          <p>
            By using Daily Tandem or Daily Cryptic, you agree to the collection and use of
            information in accordance with this policy.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Effective Date</strong>: August 15, 2025
            <br />
            <strong>Last Updated</strong>: November 5, 2025
          </p>
        </div>
      ),
    },
    {
      id: 'information-collected',
      title: 'Information We Collect',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Game Statistics</h4>
            <p className="mb-2">
              We collect and store the following gameplay information locally on your device:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Number of games played</li>
              <li>Number of games won</li>
              <li>Current winning streak</li>
              <li>Best winning streak</li>
              <li>Daily puzzle completion status</li>
              <li>Time taken to complete puzzles</li>
              <li>Number of mistakes made per puzzle</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Storage Method: This data is stored in your browser's localStorage and remains on your
              device.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. User Preferences</h4>
            <p className="mb-2">We store your preferences locally to enhance your experience:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Theme preference (light/dark/auto mode)</li>
              <li>High contrast mode preference</li>
              <li>Reduced motion preference</li>
              <li>Keyboard layout preference</li>
              <li>Hard mode preference (Tandem Unlimited subscribers only)</li>
              <li>Game state for the current puzzle</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. Server-Side Statistics</h4>
            <p className="mb-2">
              When you play Tandem, we collect and store gameplay data on our servers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Gameplay scores and completion data</li>
              <li>Time taken to complete puzzles</li>
              <li>Number of mistakes and attempts</li>
              <li>Aggregated statistics for global leaderboards</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Note: While we collect gameplay data, we do not collect personally identifiable
              information such as names, email addresses, or contact information.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">4. Technical Information</h4>
            <p className="mb-2">When you access our Service, we may automatically collect:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Browser type and version</li>
              <li>Device type (desktop/mobile)</li>
              <li>General geographic location (country/region level only)</li>
              <li>Access times and dates</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5. Apple Game Center (iOS Only)</h4>
            <p className="mb-2">
              If you use our iOS app and sign in to Game Center, Apple may collect:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Game Center player ID (managed by Apple)</li>
              <li>Achievement unlock data</li>
              <li>Leaderboard scores (streak information only)</li>
              <li>
                Display name and profile information (controlled by your Game Center settings)
              </li>
            </ul>
            <p className="mt-2 text-xs italic">
              Note: Game Center data is managed by Apple. We do not store or have access to your
              Apple ID or personal Game Center information. All Game Center data is governed by
              Apple's privacy policy. Game Center authentication is optional and can be managed in
              your iOS Settings.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">6. iCloud Sync (iOS Only)</h4>
            <p className="mb-2">If you enable iCloud sync on iOS, Apple may store:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Your game statistics and progress</li>
              <li>Puzzle completion history</li>
              <li>User preferences and settings</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Note: iCloud data is encrypted and managed by Apple. We do not have access to your
              iCloud account or data. iCloud sync is optional and can be toggled in Settings.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7. User Accounts (Web Only)</h4>
            <p className="mb-2">If you create an account on our web platform, we collect:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Username (required, for leaderboard display and account identification)</li>
              <li>Email address (for account identification and communication)</li>
              <li>Display name (optional, for personalization)</li>
              <li>Avatar/profile photo (optional)</li>
              <li>Password (encrypted and securely stored via Supabase)</li>
              <li>OAuth provider information (if signing in with Google or Apple)</li>
              <li>Account creation date and last login time</li>
              <li>Subscription status and tier</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Note: Account data is stored securely using Supabase (PostgreSQL database). Passwords
              are hashed and never stored in plain text. OAuth authentication is handled by
              third-party providers (Google, Apple) and Supabase.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">8. Leaderboards (Web Only)</h4>
            <p className="mb-2">
              When you create a free account, you are automatically enrolled in our global
              leaderboards to compete with players worldwide. We collect and publicly display:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Username (publicly visible)</li>
              <li>Avatar/profile photo (if provided, publicly visible)</li>
              <li>Puzzle completion times (for daily speed leaderboards)</li>
              <li>Best streak count (for all-time streak leaderboards)</li>
              <li>Leaderboard rankings</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Privacy Control: Leaderboards are enabled by default but can be disabled at any time
              in Settings. When disabled, your scores will not appear on public leaderboards. Your
              email address and other personal information remain private and are never displayed on
              leaderboards. Only your chosen username, avatar (if provided), and game performance
              data are visible to other players.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">9. Payment Information (Web Only)</h4>
            <p className="mb-2">For web subscriptions processed through Stripe, we collect:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Stripe customer ID (for managing subscriptions)</li>
              <li>Subscription status and billing cycle</li>
              <li>Payment method type (card brand, last 4 digits)</li>
              <li>Transaction history and invoices</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Important: We do NOT store credit card numbers, CVV codes, or full payment details.
              All payment information is securely handled and stored by Stripe, Inc. Payment data is
              governed by Stripe's privacy policy and PCI-DSS compliance standards.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'how-we-use',
      title: 'How We Use Your Information',
      content: (
        <div className="space-y-3 text-sm">
          <p>We use the collected information to:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Save your game progress and statistics</li>
            <li>Maintain your preferences across sessions</li>
            <li>Provide gameplay features like streak tracking and achievements</li>
            <li>Sync your progress across devices (iOS with iCloud only)</li>
            <li>Enable Game Center features like leaderboards (iOS only)</li>
            <li>Manage user accounts and authentication (web only)</li>
            <li>
              Process subscription payments and manage billing (web via Stripe, iOS via Apple)
            </li>
            <li>Send important account and subscription notifications (web only)</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Generate anonymous aggregated statistics</li>
            <li>Improve game difficulty and puzzle quality</li>
            <li>Ensure the Service operates correctly</li>
            <li>Prevent fraud and abuse</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'data-storage',
      title: 'Data Storage and Security',
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Local Storage</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Most data is stored locally in your browser using localStorage</li>
              <li>This data never leaves your device unless you actively share it</li>
              <li>You can clear this data at any time through your browser settings</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Server Storage</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Gameplay statistics and scores are stored on Vercel KV (Redis)</li>
              <li>Data is used for leaderboards and global statistics</li>
              <li>
                User accounts and subscription data stored in Supabase (PostgreSQL) - web only
              </li>
              <li>Payment information stored by Stripe (not on our servers) - web only</li>
              <li>All server data is encrypted in transit (HTTPS/TLS) and at rest</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Security Measures</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>We use HTTPS encryption for all data transmission</li>
              <li>Admin access requires secure authentication</li>
              <li>We regularly review and update our security practices</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'cookies-tracking',
      title: 'Cookies and Tracking',
      content: (
        <div className="space-y-3 text-sm">
          <p>Tandem uses minimal tracking:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>
              <strong>localStorage</strong>: For game state and preferences (not cookies)
            </li>
            <li>
              <strong>No Third-Party Trackers</strong>: We do not use Google Analytics or similar
              services
            </li>
            <li>
              <strong>No Advertising</strong>: We do not serve ads or use advertising networks
            </li>
            <li>
              <strong>No Social Media Tracking</strong>: Social sharing features do not track your
              activity
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            We do not sell, trade, or rent your information to third parties. We may share data only
            in these circumstances:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>
              <strong>With Your Consent</strong>: When you explicitly choose to share (e.g., sharing
              game results)
            </li>
            <li>
              <strong>Apple Services</strong>: If you use iOS features like Game Center or iCloud
              sync, data is shared with Apple according to their privacy policy
            </li>
            <li>
              <strong>Stripe (Payment Processor)</strong>: For web subscriptions, payment data is
              shared with Stripe to process transactions. Stripe's privacy policy governs this data.
            </li>
            <li>
              <strong>Supabase (Database Provider)</strong>: For web accounts, account data is
              stored in Supabase's secure PostgreSQL database
            </li>
            <li>
              <strong>Google OAuth</strong>: If you sign in with Google, authentication data is
              shared with Google according to their privacy policy
            </li>
            <li>
              <strong>Anonymous Statistics</strong>: Aggregated, anonymous data for game
              improvements
            </li>
            <li>
              <strong>Legal Requirements</strong>: If required by law or to protect rights and
              safety
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'pwa-features',
      title: 'Progressive Web App (PWA) Features',
      content: (
        <div className="space-y-3 text-sm">
          <p>When you install Tandem as a PWA:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>The app works offline using cached resources</li>
            <li>No additional permissions are required</li>
            <li>No access to device contacts, camera, or location</li>
            <li>Uninstalling removes all locally stored data</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'childrens-privacy',
      title: "Children's Privacy",
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Daily Tandem and Daily Cryptic are suitable for all ages. We do not knowingly collect
            personal information from children under 13. Both games:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Do not require account creation to play (iOS and free web access)</li>
            <li>Web accounts require parental consent for users under 18</li>
            <li>
              Do not collect personal information beyond what's necessary for account management
              (web accounts only)
            </li>
            <li>Do not include chat or communication features</li>
            <li>Contain no inappropriate content</li>
          </ul>
          <p className="mt-2">
            If a parent or guardian becomes aware that their child under 13 has created a web
            account without consent, please contact us at support@goodvibesgames.com to have the
            account deleted.
          </p>
        </div>
      ),
    },
    {
      id: 'your-rights',
      title: 'Your Rights and Choices',
      content: (
        <div className="space-y-4 text-sm">
          <p>You have control over your data:</p>

          <div>
            <h4 className="font-semibold mb-2">Clear Local Data</h4>
            <p className="mb-2">You can delete all locally stored data by:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Clearing your browser's site data for our domain</li>
              <li>Using your browser's privacy/incognito mode</li>
              <li>Uninstalling the PWA</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Managing Your Data</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Local data can be cleared through browser settings</li>
              <li>Web account holders can request account deletion through the account page</li>
              <li>Contact us to request deletion of server-side gameplay data</li>
              <li>Web users can manage subscription billing through the Stripe customer portal</li>
              <li>iOS users can manage subscriptions through Apple ID settings</li>
              <li>Use privacy-focused browsers that limit storage</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'account-deletion',
      title: 'Account Deletion',
      content: (
        <div className="space-y-4 text-sm">
          <p>
            In compliance with App Store requirements, we provide an easy way for you to delete your
            account and associated data directly within the app.
          </p>

          <div>
            <h4 className="font-semibold mb-2">How to Delete Your Account</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Web Users</strong>: Navigate to Account page → Danger Zone → Delete Account
              </li>
              <li>
                <strong>iOS Users</strong>: Go to Settings → Account → Manage Account → Danger Zone
                → Delete Account
              </li>
              <li>You will be asked to confirm your decision before deletion proceeds</li>
              <li>Account deletion is immediate and permanent</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What Gets Deleted</h4>
            <p className="mb-2">When you delete your account, we will immediately delete:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Your account credentials and authentication data</li>
              <li>Your game statistics and progress data</li>
              <li>Your user preferences and settings</li>
              <li>Your subscription records (subject to legal retention requirements)</li>
              <li>
                If you used Sign in with Apple, we will revoke your Apple authorization tokens
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What Is NOT Deleted</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Active Subscriptions</strong>: Account deletion does NOT cancel your
                subscription. You must cancel separately through the App Store (iOS) or Stripe
                billing portal (web)
              </li>
              <li>
                <strong>Billing History</strong>: We retain billing and transaction records for 7
                years to comply with financial and tax regulations
              </li>
              <li>
                <strong>Anonymized Analytics</strong>: Aggregated, anonymized data used for game
                improvement may be retained
              </li>
              <li>
                <strong>Local Device Data</strong>: Data stored locally on your device (browser or
                app) must be cleared separately
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Retention After Deletion</h4>
            <p className="mb-2">
              After account deletion, we retain certain information for legal compliance:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Transaction and billing records: Retained for 7 years (legal requirement)</li>
              <li>Security logs: Retained for 30 days</li>
              <li>All other personal data: Deleted immediately</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-200">
              Important: Subscription Cancellation
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              Deleting your account does NOT cancel your subscription. You will continue to be
              charged until you cancel separately.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>iOS</strong>: Cancel via iPhone Settings → Your Name → Subscriptions
              <br />
              <strong>Web</strong>: Cancel via Account page → Manage Account (Stripe billing portal)
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Need Help?</h4>
            <p>
              If you encounter any issues deleting your account or have questions about data
              deletion, please contact us at support@goodvibesgames.com. We will assist you within
              24-48 hours.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'international',
      title: 'International Data Transfers',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            Our Service is hosted on Vercel's global infrastructure. By using Tandem, you consent to
            your information being processed in the United States and other countries where Vercel
            operates data centers.
          </p>
        </div>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to This Policy',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes
            by:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Posting the new policy on this page</li>
            <li>Updating the "Last Updated" date</li>
            <li>Displaying an in-game notice for significant changes</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'retention',
      title: 'Data Retention',
      content: (
        <div className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>
              <strong>Local Data</strong>: Retained indefinitely until you clear it
            </li>
            <li>
              <strong>Account Data</strong>: Retained while account is active; deleted within 30
              days of account deletion request (web only)
            </li>
            <li>
              <strong>Subscription Data</strong>: Retained for duration of subscription plus 7 years
              for tax/legal compliance
            </li>
            <li>
              <strong>Server Data</strong>: Anonymous statistics retained for up to 1 year
            </li>
            <li>
              <strong>Admin Logs</strong>: Security logs retained for 30 days
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'california',
      title: 'California Privacy Rights',
      content: (
        <div className="space-y-3 text-sm">
          <p>California residents have additional rights under CCPA:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Right to know what personal information is collected</li>
            <li>Right to delete personal information</li>
            <li>Right to opt-out of sale (we do not sell personal information)</li>
            <li>Right to non-discrimination</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'contact',
      title: 'Contact Us',
      content: (
        <div className="space-y-3 text-sm">
          <p>
            If you have questions or concerns about this privacy policy, please contact us using our
            feedback form:
          </p>
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
      id: 'compliance',
      title: 'Compliance',
      content: (
        <div className="space-y-3 text-sm">
          <p>This privacy policy complies with:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>General Data Protection Regulation (GDPR)</li>
            <li>California Consumer Privacy Act (CCPA)</li>
            <li>Children's Online Privacy Protection Act (COPPA)</li>
            <li>Other applicable privacy laws and regulations</li>
          </ul>
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
        <div className="min-h-screen flex items-center justify-center py-6">
          <div className="w-full max-w-xl mx-auto p-6 relative z-10 my-auto">
            {/* Show skeleton while loading */}
            {isLoading ? (
              <LegalPageSkeleton />
            ) : (
              <div className="relative">
                <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
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
                      Privacy Policy
                    </h1>
                    <HamburgerMenu
                      isOpen={isSidebarOpen}
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                  </div>

                  {/* Summary Card */}
                  <div className="mx-6 mt-6 mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border-[3px] border-black dark:border-white">
                    <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Summary</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Tandem Daily Games (Daily Tandem and Daily Cryptic) are designed with privacy
                      in mind:
                    </p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2 text-green-600 dark:text-green-400">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>No account required for free play</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-600 dark:text-green-400">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>No ads or third-party trackers</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-600 dark:text-green-400">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>No data sales to third parties</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-600 dark:text-green-400">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Family-friendly and safe for all ages</span>
                      </li>
                      <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          Optional web accounts for subscriptions (email + password or Google OAuth)
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Gameplay scores stored on our servers for leaderboards</span>
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

                    {/* Thank you message */}
                    <div className="mt-6 p-4 bg-[#7ed957]/10 border-[3px] border-[#7ed957] rounded-2xl">
                      <p className="text-sm text-center text-gray-700 dark:text-gray-300">
                        Thank you for playing <strong>Daily Tandem</strong> and{' '}
                        <strong>Daily Cryptic</strong>!
                      </p>
                    </div>
                  </div>
                </div>
                {/* Faux drop shadow */}
                <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
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
      />

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModalPaginated isOpen={showArchive} onClose={() => setShowArchive(false)} />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}
