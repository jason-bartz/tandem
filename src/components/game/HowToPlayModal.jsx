'use client';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

export default function HowToPlayModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  const [activeGame, setActiveGame] = useState('tandem'); // 'tandem' or 'cryptic'
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedDevice, setExpandedDevice] = useState(null);

  const tandemIcon = '/icons/ui/tandem.png';

  const getHintIcon = (type) => {
    const icons = {
      fodder: '/icons/ui/fodder.png',
      indicator: '/icons/ui/indicator.png',
      definition: '/icons/ui/definition.png',
      letter: '/icons/ui/letter.png',
    };
    return icons[type];
  };

  const getSectionIcon = (type) => {
    const icons = {
      intro: '/icons/ui/intro.png',
      emoji: '/icons/ui/tandem.png',
      example: '/icons/ui/example.png',
      devices: '/icons/ui/devices.png',
      hints: '/icons/ui/hint.png',
      solving: '/icons/ui/solving.png',
    };
    return icons[type];
  };

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
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="How To Play"
      maxWidth="650px"
      contentClassName="px-6 py-4"
    >
      {/* Game Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveGame('tandem');
            setExpandedSection(null);
            setExpandedDevice(null);
          }}
          className={`flex-1 px-4 py-3 rounded-2xl border-[3px] font-bold text-sm transition-all ${
            activeGame === 'tandem'
              ? 'bg-[#38b6ff] text-white border-[#38b6ff] shadow-[3px_3px_0px_rgba(0,0,0,0.3)]'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Image src={tandemIcon} alt="Daily Tandem" width={20} height={20} className="w-5 h-5" />
            <span>Daily Tandem</span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveGame('cryptic');
            setExpandedSection(null);
            setExpandedDevice(null);
          }}
          className={`flex-1 px-4 py-3 rounded-2xl border-[3px] font-bold text-sm transition-all ${
            activeGame === 'cryptic'
              ? 'bg-[#a855f7] text-white border-[#a855f7] shadow-[3px_3px_0px_rgba(0,0,0,0.3)]'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/icons/ui/cryptic.png"
              alt="Daily Cryptic"
              width={20}
              height={20}
              className="w-5 h-5 rounded-lg"
            />
            <span>Daily Cryptic</span>
          </div>
        </button>
      </div>

      {/* Daily Tandem Content */}
      {activeGame === 'tandem' && (
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">The Basics</h3>
            <p className="text-sm mb-2">
              Each puzzle shows two emojis that represent a single word. Type your guess and press
              Enter to submit.
            </p>
            <p className="text-sm">
              You have 4 mistakes across all puzzles. The theme is revealed only when you solve all
              four.
            </p>
          </div>

          <div
            className={`rounded-2xl p-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.2)] ${
              highContrast
                ? 'bg-hc-success text-white border-hc-border'
                : 'bg-accent-green/20 dark:bg-green-900/20 border-accent-green'
            }`}
          >
            <h4
              className={`font-semibold mb-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              Smart Hints
            </h4>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              <strong
                className={highContrast ? 'text-yellow-300' : 'text-green-600 dark:text-green-400'}
              >
                Green letters = locked in!
              </strong>{' '}
              When you guess incorrectly, any letters in the correct position turn green and stay
              locked. Just fill in the remaining blanks.
            </p>
            <div
              className={`text-sm space-y-1 mt-2 font-mono rounded p-2 ${
                highContrast
                  ? 'bg-black text-white border-2 border-yellow-300'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <p className={highContrast ? 'text-white' : ''}>
                <strong>Example:</strong> Answer is PLAN
              </p>
              <p className={`mt-1 ${highContrast ? 'text-white' : ''}`}>
                Guess:{' '}
                <span
                  className={
                    highContrast ? 'text-red-300 font-bold' : 'text-red-600 dark:text-red-400'
                  }
                >
                  PILL
                </span>{' '}
                → Result:{' '}
                <span
                  className={
                    highContrast
                      ? 'text-yellow-300 font-bold'
                      : 'text-green-600 dark:text-green-400 font-bold'
                  }
                >
                  P
                </span>
                _ _ _
              </p>
              <p className={highContrast ? 'text-white' : ''}>
                Next guess: Only type 3 letters for the blanks
              </p>
            </div>
            <p className={`text-sm mt-3 ${highContrast ? 'text-white' : ''}`}>
              <span className="font-semibold">💡 Need help?</span> Select an answer field and tap
              the hint button to reveal helpful context below that specific answer. You start with 1
              hint and unlock a 2nd hint after solving 2 puzzles.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Example Round</h3>
            <div
              className={`rounded-xl p-4 space-y-2 ${
                highContrast
                  ? 'bg-hc-surface border-2 border-hc-border'
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">☀️🔥</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= SUN</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Star → hot in the sky</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">🌶️🔥</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= PEPPER</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Spice → burns your mouth</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">☕🍵</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= COFFEE</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drink → served hot</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl">🏜️🌡️</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">= DESERT</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Climate → scorching heat</p>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Theme revealed: Things That Are Hot 🔥
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Difficulty Ratings ⭐
            </h3>
            <p className="text-sm mb-3">
              Each puzzle has a difficulty rating that appears after you complete a puzzle. These
              ratings help you reflect on the challenge and track your progress.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Easy:</span>
                <span>Straightforward connections, common vocabulary, clear emojis</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium-Easy:</span>
                <span>Some thinking required, mostly familiar words</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium:</span>
                <span>Balanced challenge, requires creative thinking</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Medium-Hard:</span>
                <span>Clever connections, wordplay involved</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[100px]">Hard:</span>
                <span>Abstract themes, challenging vocabulary, obscure connections</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Streaks 🔥</h3>
            <p className="text-sm">
              Complete the daily puzzle on your first try and play consecutive days to build your
              streak!
            </p>
          </div>

          <div
            className={`rounded-xl p-4 ${
              highContrast
                ? 'bg-hc-error text-white border-2 border-hc-border'
                : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
            }`}
          >
            <h3
              className={`font-semibold mb-2 flex items-center gap-2 ${highContrast ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}
            >
              <span className="text-lg">🔥</span> Hard Mode
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  highContrast
                    ? 'bg-black text-yellow-300 border border-yellow-300'
                    : 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300'
                }`}
              >
                Tandem Unlimited
              </span>
            </h3>
            <p className={`text-sm mb-2 ${highContrast ? 'text-white' : ''}`}>
              For the ultimate challenge, Tandem Unlimited subscribers can enable Hard Mode:
            </p>
            <ul className={`text-sm space-y-1 ml-4 ${highContrast ? 'text-white' : ''}`}>
              <li>
                • <strong>3-minute time limit</strong> - Complete the puzzle before time runs out
              </li>
              <li>
                • <strong>No hints available</strong> - Rely only on your word skills
              </li>
            </ul>
            <p
              className={`text-xs mt-2 ${highContrast ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Enable Hard Mode in Settings when you have an active Tandem Unlimited subscription.
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A new puzzle is released daily at midnight. Come back tomorrow!
            </p>
          </div>
        </div>
      )}

      {/* Daily Cryptic Content */}
      {activeGame === 'cryptic' && (
        <div className="space-y-4">
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
                <div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-2 border-purple-300 dark:border-purple-700 mb-4">
                    <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2 text-lg">
                      🎯 Our Unique Innovation
                    </h4>
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                      Every Daily Cryptic clue starts with{' '}
                      <strong>TWO emojis that can work together or independently</strong> to provide
                      hints, fodder, indicators, or thematic context.
                    </p>
                  </div>

                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">How Emojis Work:</h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                      <span>
                        <strong>Together:</strong> Both emojis combine to suggest one concept (🐝🦂
                        = STING)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                      <span>
                        <strong>Separately:</strong> Each emoji plays a different role (⚡ = anagram
                        indicator, 🏴‍☠️ = pirate/definition)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                      <span>
                        <strong>Context matters:</strong> The rest of the clue helps determine their
                        role
                      </span>
                    </li>
                  </ul>

                  <div className="mt-4 space-y-3">
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      Example Emoji Pairs:
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                        <div className="text-2xl mb-1">👑🦁</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          ROYAL, PRIDE, KING
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Both together = regal concepts
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                        <div className="text-2xl mb-1">🐝🦂</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          STING, STINGING
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Both together = stinging creatures
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                        <div className="text-2xl mb-1">⚡🏴‍☠️</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          Different roles
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          ⚡ = anagram indicator, 🏴‍☠️ = pirate
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                        <div className="text-2xl mb-1">📚🦉</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          WISE, SCHOLAR, SMART
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Both together = wisdom/knowledge
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Example Walkthrough Section */}
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
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border-2 border-yellow-300 dark:border-yellow-700 mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Sample Clue:</h4>
                    <p className="text-xl text-gray-900 dark:text-white mb-2">
                      🗽🦅 <em>I&apos;m a race mixed = nation (7)</em>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="font-bold text-purple-600 dark:text-purple-400 mb-1">
                        Step 1: Interpret the Emojis
                      </h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        🗽 (Statue of Liberty) + 🦅 (Bald Eagle) = American symbols, suggesting the
                        answer relates to America
                      </p>
                    </div>

                    <div>
                      <h5 className="font-bold text-purple-600 dark:text-purple-400 mb-1">
                        Step 2: Find the Definition
                      </h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        &quot;nation&quot; (at the end) = the definition
                      </p>
                    </div>

                    <div>
                      <h5 className="font-bold text-purple-600 dark:text-purple-400 mb-1">
                        Step 3: Identify the Wordplay
                      </h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        &quot;mixed&quot; = anagram indicator
                        <br />
                        &quot;I&apos;m a race&quot; = the fodder to anagram (7 letters)
                      </p>
                    </div>

                    <div>
                      <h5 className="font-bold text-purple-600 dark:text-purple-400 mb-1">
                        Step 4: Solve
                      </h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        Anagram of &quot;I&apos;m a race&quot; = <strong>AMERICA</strong> (7
                        letters)
                        <br />
                        Confirmed by emoji hints (American symbols) and definition (nation)
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700">
                      <p className="text-sm font-bold text-green-900 dark:text-green-100">
                        ✓ Answer: AMERICA
                      </p>
                    </div>
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
              <div className="p-4 space-y-3 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                  These are the techniques used to construct cryptic clues. Click each to learn
                  more:
                </p>
                {crypticDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`rounded-xl border-[2px] overflow-hidden ${
                      highContrast
                        ? 'border-hc-border bg-hc-background'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedDevice(expandedDevice === device.id ? null : device.id)
                      }
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      aria-expanded={expandedDevice === device.id}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{device.icon}</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {device.name}
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
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
                      <div className="p-3 space-y-3 border-t-2 border-gray-300 dark:border-gray-600">
                        <div>
                          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Description:
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {device.description}
                          </p>
                        </div>

                        <div>
                          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            How to Spot:
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {device.howToSpot}
                          </p>
                        </div>

                        <div>
                          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Common Indicators:
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            {device.indicators}
                          </p>
                        </div>

                        <div>
                          <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Example:
                          </h5>
                          <p className="text-sm font-mono bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-gray-900 dark:text-white">
                            {device.example}
                          </p>
                        </div>

                        {device.fullExample && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                            <h5 className="text-sm font-bold text-purple-900 dark:text-purple-100 mb-1">
                              Full Clue Example:
                            </h5>
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                              {device.fullExample.clue}
                            </p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">
                              {device.fullExample.breakdown}
                            </p>
                          </div>
                        )}

                        {device.tips && (
                          <div>
                            <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                              Tips:
                            </h5>
                            <ul className="space-y-1">
                              {device.tips.map((tip, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1"
                                >
                                  <span className="text-purple-600 dark:text-purple-400">•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hints Section */}
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
                  Using Hints
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
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 text-sm">
                    Daily Cryptic provides <strong>four progressive hints</strong> to help you solve
                    each puzzle. Each hint reveals a different part of the clue&apos;s construction:
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Image src={getHintIcon('fodder')} alt="Fodder" width={24} height={24} />
                        <h5 className="font-bold text-gray-900 dark:text-white">Hint 1: Fodder</h5>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Identifies which words or letters in the clue are used to build the answer
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Image
                          src={getHintIcon('indicator')}
                          alt="Indicator"
                          width={24}
                          height={24}
                        />
                        <h5 className="font-bold text-gray-900 dark:text-white">
                          Hint 2: Indicator
                        </h5>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Points out the wordplay indicator (anagram, reversal, container, etc.)
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Image
                          src={getHintIcon('definition')}
                          alt="Definition"
                          width={24}
                          height={24}
                        />
                        <h5 className="font-bold text-gray-900 dark:text-white">
                          Hint 3: Definition
                        </h5>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Reveals which part of the clue is the straightforward definition
                      </p>
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Image src={getHintIcon('letter')} alt="Letter" width={24} height={24} />
                        <h5 className="font-bold text-gray-900 dark:text-white">
                          Hint 4: First Letter
                        </h5>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Reveals the first letter of the answer as a final push toward the solution
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      💡 <strong>Tip:</strong> Try to solve without hints first! Using hints will
                      affect your solve statistics and achievements.
                    </p>
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
              onClick={() => setExpandedSection(expandedSection === 'solving' ? null : 'solving')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-expanded={expandedSection === 'solving'}
            >
              <div className="flex items-center gap-3">
                <Image src={getSectionIcon('solving')} alt="" width={32} height={32} />
                <span
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Solving Strategies
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                  expandedSection === 'solving' ? 'rotate-180' : ''
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

            {expandedSection === 'solving' && (
              <div className="p-4 space-y-4 animate-fadeIn border-t-2 border-gray-300 dark:border-gray-600">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                    General Solving Tips:
                  </h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">1.</span>
                      <span className="text-sm">
                        <strong>Start with the emojis:</strong> Interpret what they represent
                        together or separately
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">2.</span>
                      <span className="text-sm">
                        <strong>Identify the definition:</strong> Usually at the start or end of the
                        clue
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">3.</span>
                      <span className="text-sm">
                        <strong>Look for indicators:</strong> Words that signal anagrams, reversals,
                        containers, etc.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">4.</span>
                      <span className="text-sm">
                        <strong>Count letters:</strong> The number in parentheses is the answer
                        length
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">5.</span>
                      <span className="text-sm">
                        <strong>Work backwards:</strong> If you know the definition, think of
                        synonyms that fit the length
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">6.</span>
                      <span className="text-sm">
                        <strong>Don&apos;t trust surface reading:</strong> The clue is designed to
                        mislead - look for the hidden wordplay
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">7.</span>
                      <span className="text-sm">
                        <strong>Practice regularly:</strong> Cryptic solving is a skill that
                        improves with daily practice
                      </span>
                    </li>
                  </ul>

                  <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border-2 border-purple-300 dark:border-purple-700">
                    <h5 className="font-bold text-purple-900 dark:text-purple-100 mb-2">
                      🎯 Remember:
                    </h5>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      Every cryptic clue has <strong>both</strong> a definition and wordplay. Once
                      you solve it, the answer should work for both parts. This &quot;double
                      definition&quot; nature is what makes cryptics fair and satisfying!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
    </LeftSidePanel>
  );
}
