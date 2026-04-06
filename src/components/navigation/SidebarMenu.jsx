'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useHoroscope } from '@/hooks/useHoroscope';
import { useSound } from '@/hooks/useSound';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import Image from 'next/image';
import { ASSET_VERSION } from '@/lib/constants';
import { isStandaloneAlchemy, homePath } from '@/lib/standalone';
import TipJarButton from '@/components/shared/TipJarButton';
import { Sun, Moon, Volume2, VolumeOff } from 'lucide-react';

/**
 * SidebarMenu - Sliding sidebar navigation menu
 *
 * Features:
 * - Slides in from the right with smooth animation
 * - Neo-brutalist styling with brand colors
 * - Three sections: Player, Navigation, Games, Footer links
 * - Click outside to close
 * - Dark mode support
 * - Profile picture and username display
 * - Guest mode with sign-in CTA
 */
export default function SidebarMenu({
  isOpen,
  onClose,
  onOpenStats,
  onOpenArchive,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenFeedback,
  onOpenLeaderboard,
}) {
  const { highContrast, reduceMotion, isDark, toggleTheme } = useTheme();
  const { user, userProfile, profileLoading, isAnonymous } = useAuth();
  const { lightTap } = useHaptics();
  const { soundEnabled, toggleSound } = useSound();
  const router = useRouter();
  const pathname = usePathname();

  const sidebarRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus trap and escape key
  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus close button when sidebar opens
    setTimeout(() => closeButtonRef.current?.focus(), 100);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Trap focus within sidebar
      if (e.key === 'Tab' && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigation = (path) => {
    lightTap();
    onClose();
    router.push(path);
  };

  const handleModalOpen = (openFn) => {
    lightTap();
    onClose();
    // Small delay to allow sidebar to close before modal opens
    setTimeout(openFn, 200);
  };

  // Get username with optimistic fallbacks
  const getUsername = () => {
    if (!user) return null;

    // Try database profile first
    if (userProfile?.username) {
      return userProfile.username;
    }

    // Fallback to auth metadata
    if (user.user_metadata?.username) {
      return user.user_metadata.username;
    }

    // Fallback to email username (before @ sign)
    if (user.email) {
      return user.email.split('@')[0];
    }

    return null;
  };

  // Get user's avatar URL with optimistic fallbacks
  const getUserAvatar = () => {
    if (!user) return null;

    // Try database profile first (preferred)
    if (userProfile?.avatar_image_path) {
      return userProfile.avatar_image_path.replace('/images/avatars/', '/avatars/');
    }

    // Fallback to legacy avatar_url
    if (userProfile?.avatar_url) {
      return userProfile.avatar_url;
    }

    // Fallback to auth metadata
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }

    return null;
  };

  const username = getUsername();
  const userAvatar = getUserAvatar();
  const isGuest = !user || isAnonymous;

  // Get zodiac sign and horoscope for logged-in users
  const getZodiacSign = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const zodiacSigns = [
      { sign: 'Capricorn ♑', name: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19] },
      { sign: 'Aquarius ♒', name: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
      { sign: 'Pisces ♓', name: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
      { sign: 'Aries ♈', name: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
      { sign: 'Taurus ♉', name: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
      { sign: 'Gemini ♊', name: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
      { sign: 'Cancer ♋', name: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
      { sign: 'Leo ♌', name: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
      { sign: 'Virgo ♍', name: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
      { sign: 'Libra ♎', name: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
      { sign: 'Scorpio ♏', name: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
      { sign: 'Sagittarius ♐', name: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
    ];

    for (const zodiac of zodiacSigns) {
      const [startMonth, startDay] = zodiac.start;
      const [endMonth, endDay] = zodiac.end;

      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return { display: zodiac.sign, name: zodiac.name };
      }
    }

    return null;
  };

  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const zodiacData = user?.created_at ? getZodiacSign(user.created_at) : null;
  const userTimezone = getUserTimezone();
  const { horoscope, loading: horoscopeLoading } = useHoroscope(zodiacData?.name, userTimezone);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: reduceMotion ? 'tween' : 'spring',
              damping: 20,
              stiffness: 300,
              duration: reduceMotion ? 0.2 : undefined,
            }}
            ref={sidebarRef}
            className={`fixed top-0 right-0 bottom-0 w-[22rem] max-w-[85vw] z-50 overflow-y-auto font-sans ${
              highContrast
                ? 'bg-hc-surface border-l-2 border-hc-border'
                : 'bg-bg-surface dark:bg-bg-card'
            }`}
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true"
          >
            {/* Header with Close button and Theme/Sound toggles */}
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 pt-safe bg-inherit">
              {/* Left side toggles */}
              <div className="flex items-center gap-1">
                {/* Theme toggle button */}
                <motion.button
                  onClick={() => {
                    toggleTheme();
                    lightTap();
                  }}
                  className={`w-10 h-10 flex items-center justify-center transition-all ${
                    highContrast
                      ? 'hover:bg-hc-border/20 active:bg-hc-border/40 rounded-lg'
                      : 'hover:opacity-70 active:opacity-50'
                  }`}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  whileHover={{ scale: reduceMotion ? 1 : 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDark ? (
                    <Sun className={`w-5 h-5 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`} />
                  ) : (
                    <Moon className={`w-5 h-5 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`} />
                  )}
                </motion.button>

                {/* Sound toggle button */}
                <motion.button
                  onClick={() => {
                    toggleSound();
                    lightTap();
                  }}
                  className={`w-10 h-10 flex items-center justify-center transition-all ${
                    highContrast
                      ? 'hover:bg-hc-border/20 active:bg-hc-border/40 rounded-lg'
                      : 'hover:opacity-70 active:opacity-50'
                  }`}
                  aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
                  whileHover={{ scale: reduceMotion ? 1 : 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  {soundEnabled ? (
                    <Volume2 className={`w-5 h-5 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`} />
                  ) : (
                    <VolumeOff className={`w-5 h-5 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`} />
                  )}
                </motion.button>
              </div>

              {/* Close button */}
              <motion.button
                ref={closeButtonRef}
                onClick={onClose}
                className={`w-10 h-10 flex items-center justify-center transition-all ${
                  highContrast
                    ? 'hover:bg-hc-border/20 active:bg-hc-border/40 rounded-lg'
                    : 'hover:opacity-70 active:opacity-50'
                }`}
                aria-label="Close menu"
                whileHover={{ rotate: reduceMotion ? 0 : 90 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className={`w-6 h-6 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-6">
              {/* Player Section */}
              <section>
                <h3 className={`text-xs font-bold tracking-wider mb-3 px-1 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                  Player
                </h3>
                {isGuest ? (
                  /* Guest Message with Sign-In CTA */
                  <div
                    className={`w-full p-4 rounded-lg ${
                      highContrast
                        ? 'bg-hc-surface border-2 border-hc-border'
                        : 'bg-ghost-white dark:bg-bg-surface'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Guest Avatar */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                          highContrast
                            ? 'bg-hc-primary border-2 border-hc-border'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <img
                          src="/avatars/default.png"
                          alt="Guest"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Greeting */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}>Hey Guest!</p>
                        <p className={`text-xs mt-1 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                          Sign in or create a free account to access all games and join the
                          leaderboard.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigation('/account')}
                      className={`w-full p-3 rounded-xl text-sm font-bold transition-all ${
                        highContrast
                          ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border hover:bg-hc-focus'
                          : 'bg-accent-blue text-gray-900 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      Sign In / Create Account
                    </button>
                  </div>
                ) : (
                  /* Logged-In User Profile */
                  <button
                    onClick={() => handleNavigation('/account')}
                    className={`w-full p-4 rounded-lg transition-all duration-200 text-left ${
                      highContrast
                        ? 'bg-hc-surface border-2 border-hc-border hover:bg-hc-primary hover:text-hc-primary-text'
                        : 'bg-ghost-white dark:bg-bg-surface hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {/* Profile Header */}
                    <div className="flex items-center gap-3">
                      {/* Profile Picture */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                          highContrast
                            ? 'bg-hc-primary border-2 border-hc-border'
                            : 'bg-accent-blue dark:bg-accent-pink'
                        }`}
                      >
                        {profileLoading && !userAvatar && !username ? (
                          /* Loading skeleton */
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 skeleton-shimmer" />
                        ) : userAvatar ? (
                          /* User's selected avatar */
                          <img
                            src={userAvatar}
                            alt={username || 'User'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to default profile image on error
                              e.target.onerror = null;
                              e.target.src = '/avatars/default.png';
                            }}
                          />
                        ) : username ? (
                          /* Username initial as fallback */
                          <span className="text-xl font-bold text-white">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          /* Default profile image as final fallback */
                          <img
                            src="/avatars/default.png"
                            alt="Default profile"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Greeting */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>Hey</p>
                        <p className={`text-base font-bold truncate ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}>
                          {profileLoading && !username ? (
                            /* Loading skeleton for username */
                            <span className="inline-block h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer" />
                          ) : (
                            <>{username || 'Player'}!</>
                          )}
                        </p>
                      </div>

                      {/* Arrow */}
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>

                    {/* Daily Horoscope - Integrated in same box (hidden on standalone) */}
                    {!isStandaloneAlchemy && zodiacData && horoscope && !horoscopeLoading && (
                      <div
                        className={`mt-3 pt-3 border-t-2 ${
                          highContrast
                            ? 'border-hc-border'
                            : 'border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold mb-2 ${
                            highContrast ? 'text-hc-text' : 'text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          Today's Tandem Horoscope:
                        </p>
                        <p
                          className={`text-xs leading-relaxed ${
                            highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {horoscope.text}
                        </p>
                      </div>
                    )}
                  </button>
                )}
              </section>

              {/* Navigation Section */}
              <section>
                <div className="space-y-2">
                  <MenuButton
                    icon="/ui/sidebar/howtoplay.png"
                    label="How to Play"
                    onClick={() => handleModalOpen(onOpenHowToPlay)}
                    highContrast={highContrast}
                  />
                  <MenuButton
                    icon="/ui/sidebar/stats.png"
                    label="Player Stats"
                    onClick={() => handleModalOpen(onOpenStats)}
                    highContrast={highContrast}
                  />
                  <MenuButton
                    icon="/ui/sidebar/leaderboards.png"
                    label={isStandaloneAlchemy ? 'Leaderboard' : 'Leaderboards'}
                    onClick={() => handleModalOpen(onOpenLeaderboard)}
                    highContrast={highContrast}
                  />
                  <MenuButton
                    icon="/ui/sidebar/archive.png"
                    label={isStandaloneAlchemy ? 'Puzzle Archive' : 'Puzzle Archives'}
                    onClick={() => handleModalOpen(onOpenArchive)}
                    highContrast={highContrast}
                  />
                </div>
              </section>

              {/* Games Section */}
              {isStandaloneAlchemy ? null : (
                <section>
                  <h3 className={`text-xs font-bold tracking-wider mb-3 px-1 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                    Games
                  </h3>
                  <div className="space-y-2">
                    <GameButton
                      icon="/ui/games/tandem.png"
                      label="Daily Tandem"
                      onClick={() => handleNavigation(homePath)}
                      isActive={pathname === homePath}
                      gameColor="blue"
                      highContrast={highContrast}
                      subtitle="Decipher four groups of emoji clues"
                    />
                    <GameButton
                      icon="/ui/games/mini.png"
                      label="Daily Mini"
                      onClick={() => handleNavigation('/dailymini')}
                      isActive={pathname === '/dailymini'}
                      gameColor="yellow"
                      highContrast={highContrast}
                      subtitle="Classic 5x5 mini crossword"
                    />
                    <GameButton
                      icon={`/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`}
                      label="Daily Alchemy"
                      onClick={() => handleNavigation('/daily-alchemy')}
                      isActive={pathname === '/daily-alchemy'}
                      gameColor="green"
                      highContrast={highContrast}
                      subtitle="Combine elements to make discoveries"
                    />
                    <GameButton
                      icon="/ui/games/movie.png"
                      label="Reel Connections"
                      onClick={() => handleNavigation('/reel-connections')}
                      isActive={pathname === '/reel-connections'}
                      gameColor="red"
                      highContrast={highContrast}
                      subtitle="Create four groups of four movies"
                    />
                  </div>
                </section>
              )}

              {/* Support Section - Main Tandem site */}
              {!isStandaloneAlchemy && (
                <section className={`pt-4 border-t space-y-4 ${highContrast ? 'border-hc-border' : 'border-border-main'}`}>
                  <div className={`p-4 rounded-lg border-2 ${highContrast ? 'bg-hc-surface border-hc-border' : 'bg-bg-surface dark:bg-bg-card border-border-main'}`}>
                    <p className={`text-xs leading-relaxed mb-3 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                      Generous supporters help keep every game free to play and ad-free for
                      everyone. Your support helps cover our servers and keep the games running.
                    </p>
                    <TipJarButton />
                  </div>
                </section>
              )}

              {/* Tandem Daily CTA & Support - Standalone Only */}
              {isStandaloneAlchemy && (
                <section className={`pt-4 border-t space-y-4 ${highContrast ? 'border-hc-border' : 'border-border-main'}`}>
                  {/* More Games CTA */}
                  <a
                    href="https://tandemdaily.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block p-4 rounded-lg border-2 transition-all ${highContrast ? 'bg-hc-surface border-hc-border hover:bg-hc-primary hover:text-hc-primary-text' : 'bg-bg-surface dark:bg-bg-card border-border-main hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    <p className={`text-sm font-bold mb-1 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}>More Daily Games</p>
                    <p className={`text-xs leading-relaxed ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                      Find more daily word games, mini crosswords, and movie puzzles at{' '}
                      <span className={`font-semibold underline ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}>
                        Tandem Daily games
                      </span>
                    </p>
                  </a>

                  {/* Support Section */}
                  <div className={`p-4 rounded-lg border-2 ${highContrast ? 'bg-hc-surface border-hc-border' : 'bg-bg-surface dark:bg-bg-card border-border-main'}`}>
                    <p className={`text-xs leading-relaxed mb-3 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                      Generous supporters help keep this game ad-free and the daily puzzle free for
                      everyone. Your support helps cover our servers and keep the games running.
                    </p>
                    <a
                      href="https://buymeacoffee.com/jasonbartz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 font-semibold rounded-xl transition-all ${highContrast ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border' : 'bg-flat-accent hover:bg-flat-accent-hover text-gray-900'}`}
                    >
                      <Image
                        src="/ui/shared/coffee.png"
                        alt="Coffee cup"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                      Buy me a coffee
                    </a>
                  </div>
                </section>
              )}

              {/* Footer Links */}
              <section className={`pt-4 border-t space-y-1 ${highContrast ? 'border-hc-border' : 'border-border-main'}`}>
                {!isStandaloneAlchemy && (
                  <FooterLink label="Settings" onClick={() => handleModalOpen(onOpenSettings)} highContrast={highContrast} />
                )}
                <FooterLink label="Feedback" onClick={() => handleModalOpen(onOpenFeedback)} highContrast={highContrast} />
                <FooterLink label="Support" onClick={() => handleNavigation('/support')} highContrast={highContrast} />
                <FooterLink label="About" onClick={() => handleNavigation('/about')} highContrast={highContrast} />
                <FooterLink
                  label="Privacy Policy"
                  onClick={() => handleNavigation('/privacypolicy')}
                  highContrast={highContrast}
                />
                <FooterLink label="Terms of Service" onClick={() => handleNavigation('/terms')} highContrast={highContrast} />
              </section>

              {/* Copyright and Social Section */}
              <section className="pt-4">
                <div className="text-center">
                  <p className={`text-xs mb-2 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>© 2026 Good Vibes Games</p>

                  {/* Social Media Section */}
                  <div>
                    <p className={`text-xs text-center mb-2 ${highContrast ? 'text-hc-text' : 'text-text-secondary'}`}>
                      Connect with us and watch daily puzzle breakdown videos
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={async () => {
                          lightTap();
                          if (Capacitor.isNativePlatform()) {
                            await Browser.open({ url: 'https://www.tiktok.com/@tandem.daily' });
                          } else {
                            window.open('https://www.tiktok.com/@tandem.daily', '_blank');
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${highContrast ? 'border-hc-border bg-hc-surface text-hc-text hover:bg-hc-primary hover:text-hc-primary-text' : 'border-border-main bg-bg-surface text-text-secondary hover:text-text-primary dark:bg-bg-card'}`}
                        aria-label="Follow us on TikTok"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          lightTap();
                          if (Capacitor.isNativePlatform()) {
                            await Browser.open({ url: 'https://instagram.com/tandem.daily' });
                          } else {
                            window.open('https://instagram.com/tandem.daily', '_blank');
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${highContrast ? 'border-hc-border bg-hc-surface text-hc-text hover:bg-hc-primary hover:text-hc-primary-text' : 'border-border-main bg-bg-surface text-text-secondary hover:text-pink-500 dark:hover:text-pink-400 dark:bg-bg-card'}`}
                        aria-label="Follow us on Instagram"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          lightTap();
                          if (Capacitor.isNativePlatform()) {
                            await Browser.open({ url: 'https://discord.gg/uSxtYQXtHN' });
                          } else {
                            window.open('https://discord.gg/uSxtYQXtHN', '_blank');
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${highContrast ? 'border-hc-border bg-hc-surface text-hc-text hover:bg-hc-primary hover:text-hc-primary-text' : 'border-border-main bg-bg-surface text-text-secondary hover:text-[#5865F2] dark:bg-bg-card'}`}
                        aria-label="Join us on Discord"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * MenuButton - Standard menu item button
 */
function MenuButton({ icon, label, onClick, highContrast }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${
        highContrast
          ? 'bg-hc-surface border-2 border-hc-border hover:bg-hc-primary hover:text-hc-primary-text text-hc-text'
          : 'bg-ghost-white dark:bg-bg-surface hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <img src={icon} alt="" className="w-6 h-6" />
      <span className={`text-base font-medium ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}>{label}</span>
    </button>
  );
}

/**
 * FooterLink - Text-only footer link
 */
function FooterLink({ label, onClick, highContrast }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2 text-left text-sm transition-colors ${highContrast ? 'text-hc-text hover:bg-hc-border/20 rounded-md' : 'text-text-secondary hover:text-text-primary'}`}
    >
      {label}
    </button>
  );
}

/**
 * GameButton - Game selection button with active state and custom colors
 */
function GameButton({ icon, label, onClick, isActive, gameColor, highContrast, badge, subtitle }) {
  const iconSrc = icon;

  // Flat design: subtle tinted backgrounds with colored left accent
  const getGameColors = () => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-l-accent-blue',
        activeBg: 'bg-blue-100 dark:bg-blue-900/40',
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        border: 'border-l-accent-yellow',
        activeBg: 'bg-yellow-100 dark:bg-yellow-900/40',
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-l-accent-green',
        activeBg: 'bg-green-100 dark:bg-green-900/40',
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-l-accent-red',
        activeBg: 'bg-red-100 dark:bg-red-900/40',
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-l-accent-purple',
        activeBg: 'bg-purple-100 dark:bg-purple-900/40',
      },
    };
    return colorMap[gameColor] || colorMap.yellow;
  };

  const colors = getGameColors();

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200 border-l-4 hover:scale-[1.02] ${
        isActive
          ? highContrast
            ? 'bg-hc-primary border-l-hc-border'
            : `${colors.activeBg} ${colors.border}`
          : highContrast
            ? 'bg-hc-surface border-l-hc-border hover:bg-hc-primary hover:text-hc-primary-text'
            : `${colors.bg} ${colors.border}`
      }`}
    >
      <img src={iconSrc} alt="" className="w-8 h-8" />
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold whitespace-nowrap ${highContrast ? (isActive ? 'text-hc-primary-text' : 'text-hc-text') : 'text-text-primary'}`}>{label}</span>
          {badge && (
            <span className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded ${highContrast ? 'bg-hc-primary text-hc-primary-text border border-hc-border' : 'bg-accent-yellow text-gray-900'}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && <span className={`text-[10px] ${highContrast ? (isActive ? 'text-hc-primary-text' : 'text-hc-text') : 'text-text-secondary'}`}>{subtitle}</span>}
      </div>
    </button>
  );
}
