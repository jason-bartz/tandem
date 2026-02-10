'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import PuzzleSubmissionEditor from '@/components/PuzzleSubmissionEditor';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';
import logger from '@/lib/logger';

export default function CreatePuzzlePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isActive: hasSubscription, loading: subLoading } = useSubscription();
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/?auth=required');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (puzzleData) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await capacitorFetch(getApiUrl('/api/puzzles/submit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(puzzleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit puzzle');
      }

      setSubmitted(true);
    } catch (err) {
      logger.error('Submission error', err);
      setError(err.message || 'Failed to submit puzzle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  // No subscription
  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <header className="flex items-center justify-between px-4 py-3 bg-bg-surface border-b-[3px] border-black dark:border-white">
          <Link href="/" className="flex items-center gap-2">
            <img src="/ui/games/tandem.png" alt="Tandem" className="w-8 h-8" />
            <span className="font-bold text-lg text-text-primary">Tandem</span>
          </Link>
        </header>

        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="bg-bg-surface rounded-xl border-[3px] border-black dark:border-white p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Membership Required</h1>
            <p className="text-text-secondary mb-6">
              Creating and submitting puzzles is a Tandem Puzzle Club feature. Upgrade your
              membership to create your own Reel Connections puzzles!
            </p>
            <Link
              href="/account"
              className="inline-block px-6 py-3 bg-accent-red text-white border-[3px] border-black font-bold rounded-xl hover:translate-y-[-2px] transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)]"
            >
              View Membership Options
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Successfully submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <header className="flex items-center justify-between px-4 py-3 bg-bg-surface border-b-[3px] border-black dark:border-white">
          <Link href="/" className="flex items-center gap-2">
            <img src="/ui/games/tandem.png" alt="Tandem" className="w-8 h-8" />
            <span className="font-bold text-lg text-text-primary">Tandem</span>
          </Link>
        </header>

        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="bg-bg-surface rounded-xl border-[3px] border-black dark:border-white p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Puzzle Submitted!</h1>
            <p className="text-text-secondary mb-6">
              Thanks for your submission! Our team will review your puzzle and you might see it
              featured in a future Reel Connections game.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setError(null);
                }}
                className="w-full px-6 py-3 bg-accent-green text-white border-[3px] border-black font-bold rounded-xl hover:translate-y-[-2px] transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              >
                Create Another Puzzle
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-bg-card text-text-primary border-[3px] border-black font-bold rounded-xl hover:translate-y-[-2px] transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] text-center"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main editor view
  return (
    <div
      className={`!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden ${
        highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-red-600 via-red-500 to-red-600'
      }`}
    >
      <div className="min-h-full flex items-start justify-center p-2 sm:p-4 pt-4">
        <div className="w-full max-w-2xl pb-8">
          {/* Main container with nav inside */}
          <div className="bg-bg-surface rounded-2xl border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
            {/* Header with Back Button and Hamburger Menu */}
            <div className="flex items-center justify-between p-2">
              <button
                onClick={() => {
                  lightTap();
                  router.push('/');
                }}
                className="p-2 rounded-xl transition-transform hover:scale-110 text-text-primary"
                aria-label="Go back"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={() => {
                  lightTap();
                  setIsSidebarOpen(true);
                }}
                className="p-2 rounded-xl transition-transform hover:scale-110 text-text-primary"
                aria-label="Open menu"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                <Menu className="w-7 h-7" />
              </button>
            </div>

            {error && (
              <div className="mx-4 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
              </div>
            )}

            <PuzzleSubmissionEditor onSubmit={handleSubmit} loading={submitting} />
          </div>
        </div>
      </div>

      {/* Sidebar */}
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
      {showStats && <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />}
      {showArchive && (
        <UnifiedArchiveCalendar isOpen={showArchive} onClose={() => setShowArchive(false)} />
      )}
      {showHowToPlay && (
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      )}
      {showSettings && <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />}
      {showFeedback && (
        <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
