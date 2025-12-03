'use client';

import { useState, useEffect } from 'react';
import { generateBreadcrumbs } from '@/lib/seo-config';
import Link from 'next/link';
import Image from 'next/image';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import AnimatedLoadingMessage from '@/components/shared/AnimatedLoadingMessage';
import AboutPageSkeleton from '@/components/shared/AboutPageSkeleton';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import ArchiveModalPaginated from '@/components/game/ArchiveModalPaginated';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';

export default function AboutPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const breadcrumbSchema = generateBreadcrumbs([{ name: 'About', path: '/about' }]);

  useEffect(() => {
    // Simulate loading delay to show skeleton and messages
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
            {isLoading ? (
              <>
                {/* Loading skeleton */}
                <AboutPageSkeleton />
                {/* Animated loading messages */}
                <div className="mt-6">
                  <AnimatedLoadingMessage />
                </div>
              </>
            ) : (
              <>
                {/* Main content card */}
                <div className="relative">
                  <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
                    {/* Header with back button, title, and hamburger menu */}
                    <div className="flex items-center justify-between p-6 pb-4">
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
                      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">About</h1>
                      <HamburgerMenu
                        isOpen={isSidebarOpen}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      />
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-8">
                      {/* Founder Message */}
                      <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                        <p>I&apos;m Jason, creator of Tandem Daily Games.</p>
                        <p>
                          We&apos;re surrounded by infinite scrolling and algorithms designed to
                          keep us trapped. I wanted to build something different. Something peaceful
                          that you solve, share with friends, and then move on with your day.
                        </p>
                        <p>
                          These games are meant to be a companion to your daily puzzle routine.
                          Whether you&apos;re already solving Wordle or playing Sudoku, these games
                          offer fresh challenges that respect your time.
                        </p>
                        <p>
                          I&apos;m committed to keeping our games ad-free forever. No endless
                          content trying to steal your attention. Just simple, fun puzzles that
                          reward curiosity and let you share &quot;aha!&quot; moments with friends.
                          Hope you enjoy!
                        </p>

                        {/* Founder Image and Info */}
                        <div className="flex flex-col items-center pt-6 border-t-[3px] border-black dark:border-white">
                          <div className="relative w-32 h-32 rounded-full overflow-hidden border-[3px] border-black dark:border-white mb-4">
                            <Image
                              src="/images/jason-bartz.webp"
                              alt="Jason Bartz"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-center font-semibold text-gray-800 dark:text-gray-200">
                            <a
                              href="https://www.jason-bartz.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-[#38b6ff] transition-colors"
                            >
                              Jason Bartz
                            </a>
                          </p>
                          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                            Founder and Puzzlemaster
                          </p>
                        </div>
                      </div>

                      {/* Call to Action */}
                      <div className="mt-8 pt-6 border-t-[3px] border-black dark:border-white">
                        <Link
                          href="/"
                          className="block w-full text-center px-6 py-3 bg-[#38b6ff] hover:bg-[#38b6ff]/90 text-white font-semibold rounded-2xl border-[3px] border-black dark:border-white transition-all"
                        >
                          Back to the puzzles
                        </Link>
                      </div>
                    </div>
                  </div>
                  {/* Faux drop shadow */}
                  <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
                </div>
              </>
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
    </>
  );
}
