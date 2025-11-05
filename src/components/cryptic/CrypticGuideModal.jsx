'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * CrypticGuideModal - Complete How-To Guide for Daily Cryptic
 *
 * Production-ready implementation following:
 * - Apple Human Interface Guidelines (accessibility, clear hierarchy, helpful)
 * - Mobile-first responsive design
 * - Professional cryptic crossword quality standards
 * - TWO-emoji innovation highlighted
 * - Vertical expandable sections instead of horizontal tabs
 *
 * @component
 */
export default function CrypticGuideModal({ onClose }) {
  const { highContrast, theme } = useTheme();
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedDevice, setExpandedDevice] = useState(null);

  const getHintIcon = (type) => {
    const isDark = theme === 'dark';
    const icons = {
      fodder: isDark ? '/icons/ui/fodder-dark.png' : '/icons/ui/fodder.png',
      indicator: isDark ? '/icons/ui/indicator-dark.png' : '/icons/ui/indicator.png',
      definition: isDark ? '/icons/ui/definition-dark.png' : '/icons/ui/definition.png',
      letter: isDark ? '/icons/ui/letter-dark.png' : '/icons/ui/letter.png',
    };
    return icons[type];
  };

  const getSectionIcon = (type) => {
    const isDark = theme === 'dark';
    const icons = {
      intro: isDark ? '/icons/ui/intro-dark.png' : '/icons/ui/intro.png',
      emoji: isDark ? '/icons/ui/emoji-inter-dark.png' : '/icons/ui/emoji-inter.png',
      example: isDark ? '/icons/ui/example-dark.png' : '/icons/ui/example.png',
      devices: isDark ? '/icons/ui/devices-dark.png' : '/icons/ui/devices.png',
      hints: isDark ? '/icons/ui/hint-dark.png' : '/icons/ui/hint.png',
      solving: isDark ? '/icons/ui/solving-dark.png' : '/icons/ui/solving.png',
    };
    return icons[type];
  };

  useEffect(() => {
    // Prevent body scroll when modal is open
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard navigation (Apple HIG: Support keyboard shortcuts)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const crypticDevices = [
    {
      id: 'emoji',
      name: 'Emoji Interpretation',
      icon: '🎯',
      featured: true,
      description: 'TWO emojis that can work together or independently in the clue',
      howToSpot: 'Always the first step - look at the emoji pair at the start of the clue',
      indicators: 'No specific indicators - interpret based on context',
      example: '🎭🎪 → STAGE (both represent theatrical settings)',
      tips: [
        'Emojis can work TOGETHER to suggest one concept (🐝🦂 = STING)',
        'OR each emoji can represent DIFFERENT parts (⚡ = indicator, 🏴‍☠️ = definition)',
        'The emoji pair provides fodder, indicators, or thematic hints',
        'Context from the rest of the clue helps determine their role',
        'Difficulty varies: direct associations (easy) to lateral thinking (hard)',
      ],
      examples: [
        {
          pair: '👑🦁',
          meaning: 'ROYAL, PRIDE, or KING',
          explanation: 'Both together = regal concepts',
        },
        {
          pair: '🐝🦂',
          meaning: 'STING or STINGING',
          explanation: 'Both together = stinging creatures',
        },
        {
          pair: '⚡🏴‍☠️',
          meaning: 'Different roles',
          explanation: '⚡ = anagram indicator, 🏴‍☠️ = pirate/definition',
        },
        {
          pair: '📚🦉',
          meaning: 'WISE, SCHOLAR, or SMART',
          explanation: 'Both together = wisdom/knowledge',
        },
      ],
    },
    {
      id: 'charade',
      name: 'Charade',
      icon: '➕',
      description: 'Two or more parts joined together to make the answer',
      howToSpot: 'Look for words suggesting combination or placement',
      indicators: 'with, and, before, after, following, by, next to, leading',
      example: 'CAR + PET = CARPET',
      fullExample: {
        clue: '🐟🎓 Fish head with teacher rank = principal (10)',
        breakdown: 'HEAD (fish head) + MASTER (teacher rank) = HEADMASTER (principal)',
      },
      tips: [
        'Each part should be clearly defined in the clue',
        'Parts can come from emoji interpretation, synonyms, or abbreviations',
        'Often combined with other devices for sophistication',
      ],
    },
    {
      id: 'anagram',
      name: 'Anagram',
      icon: '🔀',
      description: 'Letters rearranged to form a new word',
      howToSpot: 'Words suggesting disorder, movement, or change',
      indicators:
        'mixed, confused, disturbed, scrambled, wild, broken, dancing, crazy, messy, off, drunk, poor, bad, strange, wrong',
      example: 'LISTEN → SILENT (both 6 letters)',
      fullExample: {
        clue: "🗽🦅 I'm a race mixed = nation (7)",
        breakdown:
          'Anagram of "I\'m a race" (7 letters) = AMERICA. The emojis provide thematic hints.',
      },
      tips: [
        'Source and answer MUST have exact same letter count',
        'Count letters carefully - this is the most common error',
        'Anagram indicators must be near the fodder they affect',
      ],
    },
    {
      id: 'container',
      name: 'Container',
      icon: '📦',
      description: 'One word placed inside another word',
      howToSpot: 'Words suggesting containment or surrounding',
      indicators:
        'in, into, within, holding, containing, around, about, grabs, captures, embracing, wearing, interrupted',
      example: 'B(AN)D = BAD (AN goes inside BD)',
      tips: [
        'Can work "within" or "around" - direction matters',
        'Verify the containment actually works positionally',
        'Often combined with selection or substitution',
      ],
    },
    {
      id: 'deletion',
      name: 'Deletion',
      icon: '✂️',
      description: 'Remove specific letters from a word',
      howToSpot: 'Words suggesting removal or absence',
      indicators:
        'without, loses, drops, missing, lacking, headless (first), endless (last), heartless (middle), curtailed',
      example: 'FIENDS - S = FIEND (6 letters - 1 = 5 letters)',
      fullExample: {
        clue: '👹🧛 Demons losing direction = monster (5)',
        breakdown: 'FIENDS (demons) minus S (South, a direction) = FIEND (monster)',
      },
      tips: [
        'Headless = remove FIRST letter',
        'Endless = remove LAST letter',
        'Heartless = remove MIDDLE letter(s)',
        'Verify mathematics: original length - deleted = answer length',
      ],
    },
    {
      id: 'reversal',
      name: 'Reversal',
      icon: '↩️',
      description: 'Read a word or letters backward',
      howToSpot: 'Words suggesting backward motion or reflection',
      indicators:
        'back, returned, reversed, around, reflected, retreating, mirror, rolling, twist, up (in down clues)',
      example: 'STOP → POTS (read backward)',
      fullExample: {
        clue: 'Cease going back = cookware (4)',
        breakdown: 'STOP reversed = POTS (cookware)',
      },
      tips: [
        'Never combined with anagrams (reversing scrambled letters is pointless)',
        'Can be applied to partial words or selections',
        'Often paired with selection or container',
      ],
    },
    {
      id: 'hidden',
      name: 'Hidden Word',
      icon: '🔍',
      description: 'The answer is hiding inside consecutive letters',
      howToSpot: 'Words suggesting concealment or partial visibility',
      indicators:
        'in, within, part of, some of, held by, inside, concealed, buried, partially, sample, selection, bit of, taken from',
      example: '"grand RIVER crossing" contains RIVER',
      tips: [
        'Answer appears in consecutive letters (in order)',
        'Can span across word boundaries',
        'Hidden word is usually obvious once you see it',
      ],
    },
    {
      id: 'homophone',
      name: 'Homophone',
      icon: '🔊',
      description: 'A word that sounds like another word',
      howToSpot: 'Words related to sound, speech, or hearing',
      indicators:
        'sounds like, heard, spoken, said, audibly, aloud, vocal, listening, by ear, reported, mentioned, by phone, utterly, audition',
      example: 'CHEWS sounds like CHOOSE (both pronounced "chooz")',
      tips: [
        'Pronunciation should be very similar or identical',
        'Accent variations are acceptable (not all homophones are perfect)',
        'Usually applied to a synonym, not words already in the clue',
      ],
    },
    {
      id: 'selection',
      name: 'Selection (Initial Letters)',
      icon: '🎯',
      description: 'Pick specific letters from words (first, last, middle, or regularly spaced)',
      howToSpot: 'Words referring to position or spacing',
      indicators:
        'starts, heads, opens, begins, initially, at first, primarily, ends, tails, last, middle, heart, regularly, alternately, even, odd',
      example: 'Solar Eclipse Now Tonight → SENT (first letters)',
      tips: [
        'Heads/starts = first letters (plural form means multiple words)',
        'Tails/ends = last letters',
        'Heart = middle letter(s)',
        'Regularly/alternately = every second letter',
      ],
    },
    {
      id: 'double_def',
      name: 'Double Definition',
      icon: '📝',
      description: 'Two different definitions of the same word',
      howToSpot: 'No indicators - just two definitions with nothing between',
      indicators: 'None - the absence of wordplay indicators is the clue',
      example: 'BOW = "front of ship" / "bend forward"',
      tips: [
        'Shortest cryptic clue type (no wordplay, just two meanings)',
        'Definitions can be different parts of speech',
        'Often has a linking word like "or", "and", "for"',
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-[32px] border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header - Sticky */}
        <div
          className={`sticky top-0 z-10 border-b-[3px] p-4 sm:p-6 flex items-center justify-between ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/icons/ui/cryptic.png"
              alt="Daily Cryptic"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl"
            />
            <h2
              id="guide-title"
              className={`text-xl sm:text-2xl font-bold ${
                highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
              }`}
            >
              How to Play Daily Cryptic
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-xl border-[2px] text-xl font-bold transition-all hover:scale-110 active:scale-95 ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="Close guide"
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Introduction Section */}
          <div
            className={`rounded-2xl border-[3px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedSection(expandedSection === 'intro' ? null : 'intro')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'intro'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('intro')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Introduction
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'intro' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedSection === 'intro' && (
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Welcome to The Daily Cryptic
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    Every cryptic clue is a two-part puzzle combining a <strong>definition</strong>{' '}
                    (straightforward meaning) and <strong>wordplay</strong> (clever construction).
                    Daily Cryptic adds a unique twist:
                    <strong className="text-purple-600 dark:text-purple-400">
                      {' '}
                      two emojis at the start of each clue
                    </strong>{' '}
                    that can work together or serve different purposes.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-300 dark:border-blue-700">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">Definition</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        A straightforward synonym for the answer, usually at the start or end of the
                        clue
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-2 border-purple-300 dark:border-purple-700">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">Wordplay</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        A clever way to build the answer using word games, letter manipulation, and
                        our emoji innovation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emoji Interpretation Section */}
          <div
            className={`rounded-2xl border-[3px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedSection(expandedSection === 'emoji' ? null : 'emoji')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'emoji'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('emoji')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Emoji Interpretation
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'emoji' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedSection === 'emoji' && (
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div className="p-5 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-400">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    The Emoji Interpretation Layer
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    <strong>Every Daily Cryptic puzzle uses exactly TWO emojis</strong> at the start
                    of each clue. These emojis can work together to represent one concept, OR each
                    can represent different parts of the clue.
                  </p>

                  <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 space-y-4">
                    <div>
                      <div className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                        Pattern 1: Both Emojis Together
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0 flex gap-1">
                            <span>👑</span>
                            <span>🦁</span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              → ROYAL, PRIDE, or KING
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Both together = regal concepts
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0 flex gap-1">
                            <span>🐝</span>
                            <span>🦂</span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              → STING or STINGING
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Both together = stinging creatures
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t-2 border-purple-300/30 pt-3">
                      <div className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                        Pattern 2: Each Emoji Different Role
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0 flex gap-1">
                            <span>⚡</span>
                            <span>🏴‍☠️</span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              → Different purposes
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              ⚡ might = anagram indicator, 🏴‍☠️ might = pirate/definition
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-3xl flex-shrink-0 flex gap-1">
                            <span>🎓</span>
                            <span>🔀</span>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              → Different purposes
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              🎓 might = academic/teacher, 🔀 might = anagram indicator
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-purple-700 dark:text-purple-300">
                    <strong>Key insight:</strong> Look at the rest of the clue for context. The
                    emojis provide fodder (building blocks), indicators (operations), or thematic
                    hints. They never directly show the final answer!
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                    Emoji Difficulty Levels
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
                      <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Easy - Direct Association
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-200">
                        🔑🚪 → "DOOR", "ENTRY", "ACCESS" (straightforward combination)
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                      <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Medium - One-Step Conceptual
                      </div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        🎭🎬 → "DRAMA", "ACT", "SCENE" (theatrical theme)
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-700">
                      <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                        Hard - Lateral Thinking
                      </div>
                      <div className="text-sm text-red-800 dark:text-red-200">
                        ⚡💡 → "IDEA", "SPARK", "INSIGHT" (requires creative connection)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Complete Example Section */}
          <div
            className={`rounded-2xl border-[3px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedSection(expandedSection === 'example' ? null : 'example')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'example'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('example')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Complete Example
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'example' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedSection === 'example' && (
              <div className="p-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div className="p-5 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-blue-50 dark:bg-blue-900/20 border-blue-400">
                  <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                    Complete Example Walkthrough
                  </h3>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border-2 border-blue-300">
                    <div className="text-2xl mb-2 font-medium text-gray-900 dark:text-white flex items-start gap-2">
                      <span className="flex gap-1 flex-shrink-0">
                        <span>👶</span>
                        <span>🏫</span>
                      </span>
                      <span>Room for kids, yes? Run back to grab second-grader (7)</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400 mb-1">
                      Answer: NURSERY
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Combining emoji interpretation + reversal + container + selection
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-l-4 border-purple-500 pl-4">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        1. Emoji Interpretation
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="inline-flex gap-1">
                          <span>👶</span>
                          <span>🏫</span>
                        </span>{' '}
                        together suggest <strong>children and education</strong> or concepts related
                        to NURSERY, YOUTH, KIDS. This provides thematic support and hints at the
                        answer.
                      </p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        2. Identify the Fodder
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        "yes run" gives us letters to work with → <strong>Y-E-S-R-U-N</strong> (6
                        letters)
                        <br />
                        "second-grader" tells us to take the 2nd letter of "grader" →{' '}
                        <strong>R</strong>
                      </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        3. Spot the Indicators
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        "back" = reversal indicator (read backward)
                        <br />
                        "grab" = container indicator (one thing contains another)
                        <br />
                        "second" = selection indicator (take the 2nd letter)
                      </p>
                    </div>

                    <div className="border-l-4 border-orange-500 pl-4">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        4. Apply the Cryptic Devices
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <strong>Step 1:</strong> Reverse "yes run" → NUR SEY
                        <br />
                        <strong>Step 2:</strong> Grab R from "second-grader" and insert it
                        <br />
                        <strong>Step 3:</strong> Result = NUR(R)SERY = <strong>NURSERY</strong> (7
                        letters) ✓
                      </p>
                    </div>

                    <div className="border-l-4 border-red-500 pl-4">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        5. Find the Definition
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        "Room for kids" is our straightforward definition = NURSERY ✓
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-400">
                    <p className="text-sm text-green-900 dark:text-green-100">
                      <strong>Notice:</strong> This puzzle combines{' '}
                      <strong>emoji interpretation + reversal + selection + container</strong>.
                      Multiple devices working together create sophisticated, satisfying solves!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cryptic Devices Section */}
          <div
            className={`rounded-2xl border-[3px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedSection(expandedSection === 'devices' ? null : 'devices')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'devices'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('devices')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Cryptic Devices
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'devices' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedSection === 'devices' && (
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  These are the building blocks of cryptic clues. Most puzzles combine 2-3 devices!
                  Tap each device to learn more.
                </p>

                {crypticDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`rounded-2xl border-[3px] overflow-hidden transition-all ${
                      device.featured
                        ? 'border-purple-400 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedDevice(expandedDevice === device.id ? null : device.id)
                      }
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      aria-expanded={expandedDevice === device.id}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{device.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {device.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {device.description}
                          </div>
                        </div>
                      </div>
                      <svg
                        className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                          expandedDevice === device.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {expandedDevice === device.id && (
                      <div className="p-4 pt-0 space-y-3 border-t-2 border-gray-300 dark:border-gray-600">
                        <div>
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                            How to Spot
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {device.howToSpot}
                          </p>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                            Common Indicators
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            {device.indicators}
                          </p>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                            Simple Example
                          </div>
                          <p className="text-sm font-mono text-purple-700 dark:text-purple-300">
                            {device.example}
                          </p>
                        </div>

                        {device.fullExample && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-2 border-blue-300">
                            <div className="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-2">
                              Complete Puzzle Example
                            </div>
                            <div className="text-sm text-blue-900 dark:text-blue-100 mb-1">
                              <strong>Clue:</strong> {device.fullExample.clue}
                            </div>
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>How it works:</strong> {device.fullExample.breakdown}
                            </div>
                          </div>
                        )}

                        {device.tips && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                              💡 Pro Tips
                            </div>
                            <ul className="space-y-1">
                              {device.tips.map((tip, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                                >
                                  <span className="text-purple-600 dark:text-purple-400 flex-shrink-0">
                                    •
                                  </span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {device.examples && (
                          <div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                              More Examples
                            </div>
                            <div className="space-y-2">
                              {device.examples.map((ex, idx) => (
                                <div key={idx} className="p-2 bg-white/50 dark:bg-black/20 rounded">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xl">{ex.pair}</span>
                                    <div>
                                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                                        → {ex.meaning}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {ex.explanation}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-400">
                  <p className="text-sm text-yellow-900 dark:text-yellow-100">
                    <strong>💡 Remember:</strong> Most Daily Cryptic puzzles combine emoji
                    interpretation with 2-3 traditional devices. Look for multiple indicator words
                    in the clue!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hint System Section */}
          <div
            className={`rounded-2xl border-[3px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedSection(expandedSection === 'hints' ? null : 'hints')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'hints'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('hints')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Hint System
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'hints' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedSection === 'hints' && (
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Your Progressive Hint System
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Hints build on each other - start with Hint 1 and work your way through!
                  </p>

                  <div className="space-y-3">
                    {/* Hint 1: Fodder */}
                    <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300">
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-purple-100 dark:bg-purple-800 rounded-lg">
                        <Image src={getHintIcon('fodder')} alt="" width={32} height={32} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white mb-1">
                          1. Fodder{' '}
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">
                            (Most Detailed)
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Identifies all the components: what the emoji pair represents, what each
                          piece of text means, any substitutions needed. This hint walks you through
                          the raw materials.
                        </div>
                        <div className="text-xs italic text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 p-2 rounded">
                          Example: "'🎭🎪' together suggest STAGE (theatrical setting), giving us
                          the letters S-T-A-G-E to work with. 'Losing finale' tells us we'll remove
                          the last letter..."
                        </div>
                      </div>
                    </div>

                    {/* Hint 2: Indicator */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300">
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <Image src={getHintIcon('indicator')} alt="" width={32} height={32} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white mb-1">
                          2. Indicator{' '}
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                            (Operational)
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Points out the indicator words and what cryptic operations they signal.
                          Tells you what to DO with the fodder (rearrange it? reverse it? combine
                          it?).
                        </div>
                        <div className="text-xs italic text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                          Example: "'mixed' signals an anagram - rearrange those letters. 'loses'
                          means delete the last letter after anagramming."
                        </div>
                      </div>
                    </div>

                    {/* Hint 3: Definition */}
                    <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300">
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-green-100 dark:bg-green-800 rounded-lg">
                        <Image src={getHintIcon('definition')} alt="" width={32} height={32} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white mb-1">
                          3. Definition{' '}
                          <span className="text-xs text-green-600 dark:text-green-400 font-normal">
                            (Concise)
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Reveals which part of the clue is the straightforward definition - your
                          synonym for the answer. Usually found at the start or end of the clue.
                        </div>
                        <div className="text-xs italic text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 p-2 rounded">
                          Example: "Definition is 'entrance' — another word for a way in"
                        </div>
                      </div>
                    </div>

                    {/* Hint 4: Letter */}
                    <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300">
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-orange-100 dark:bg-orange-800 rounded-lg">
                        <Image src={getHintIcon('letter')} alt="" width={32} height={32} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white mb-1">
                          4. First Letter{' '}
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-normal">
                            (Final Nudge)
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Gives you the first letter of the answer. This is your last hint before
                          solving!
                        </div>
                        <div className="text-xs italic text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 p-2 rounded">
                          Example: "Starts with G"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solving Tips Section */}
          <div
            className={`rounded-2xl border-[3px] overflow-hidden ${
              highContrast
                ? 'border-hc-border bg-hc-surface'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedSection(expandedSection === 'strategy' ? null : 'strategy')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'strategy'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('solving')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Solving Tips
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'strategy' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedSection === 'strategy' && (
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div className="p-5 rounded-2xl border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Solving Strategy
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="text-lg font-bold flex-shrink-0 text-gray-600 dark:text-gray-400">
                        1.
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Start with the emojis
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          What do the TWO emojis suggest? They might work together or serve
                          different roles. This is your first interpretation layer.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-lg font-bold flex-shrink-0 text-gray-600 dark:text-gray-400">
                        2.
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Find the definition
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Usually at the start or end of the clue - a straightforward synonym for
                          the answer.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-lg font-bold flex-shrink-0 text-gray-600 dark:text-gray-400">
                        3.
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Spot the indicators
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Words like "mixed", "back", "in", "loses" tell you what operation to
                          perform.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-lg font-bold flex-shrink-0 text-gray-600 dark:text-gray-400">
                        4.
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Identify the fodder
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Which words/letters will you manipulate? What substitutions might work?
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-lg font-bold flex-shrink-0 text-gray-600 dark:text-gray-400">
                        5.
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Use hints progressively
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Start with Hint 1 (Fodder), then 2 (Indicator), etc. They build on each
                          other!
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-lg font-bold flex-shrink-0 text-gray-600 dark:text-gray-400">
                        6.
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Think laterally
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Cryptic clues reward creative thinking. What could this word mean in a
                          different context?
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Remember</h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">✓</span>
                      <span>Every word in a cryptic clue has a purpose</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">✓</span>
                      <span>
                        The TWO emojis might work together or represent different parts of the clue
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">✓</span>
                      <span>Look for the definition (usually at start or end)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">✓</span>
                      <span>There's no penalty for using hints - they're designed to teach!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">✓</span>
                      <span>The more you play, the better you'll recognize patterns</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky */}
        <div
          className={`sticky bottom-0 border-t-[3px] p-4 sm:p-6 ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
          }`}
        >
          <button
            onClick={onClose}
            className={`w-full px-6 py-3 sm:py-4 font-bold text-base sm:text-lg rounded-[20px] border-[3px] transition-all ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
            }`}
          >
            Got it! Let&apos;s Play
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
