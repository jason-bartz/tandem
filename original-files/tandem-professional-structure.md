# Tandem Game - Professional Structure

## Complete File Structure
```
tandem-game/
├── package.json
├── .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── middleware.js
│
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── globals.css
│   │   ├── admin/
│   │   │   ├── page.js
│   │   │   └── layout.js
│   │   └── api/
│   │       ├── puzzle/
│   │       │   └── route.js
│   │       ├── admin/
│   │       │   ├── puzzles/
│   │       │   │   └── route.js
│   │       │   └── auth/
│   │       │       └── route.js
│   │       └── stats/
│   │           └── route.js
│   │
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameContainer.js
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── PlayingScreen.js
│   │   │   ├── CompleteScreen.js
│   │   │   ├── PuzzleRow.js
│   │   │   ├── StatsBar.js
│   │   │   └── ThemeToggle.js
│   │   ├── admin/
│   │   │   ├── AdminLayout.js
│   │   │   ├── LoginForm.js
│   │   │   ├── PuzzleEditor.js
│   │   │   ├── PuzzleCalendar.js
│   │   │   ├── TemplateSelector.js
│   │   │   └── StatsOverview.js
│   │   └── shared/
│   │       ├── Button.js
│   │       ├── Input.js
│   │       ├── Card.js
│   │       ├── Modal.js
│   │       └── LoadingSpinner.js
│   │
│   ├── hooks/
│   │   ├── useGame.js
│   │   ├── useAuth.js
│   │   ├── useSound.js
│   │   ├── useTimer.js
│   │   ├── useLocalStorage.js
│   │   └── useTheme.js
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── puzzle.service.js
│   │   ├── auth.service.js
│   │   ├── stats.service.js
│   │   └── storage.service.js
│   │
│   ├── lib/
│   │   ├── constants.js
│   │   ├── utils.js
│   │   ├── validators.js
│   │   ├── db.js
│   │   └── audio.js
│   │
│   ├── store/
│   │   ├── gameStore.js
│   │   ├── adminStore.js
│   │   └── providers.js
│   │
│   └── styles/
│       ├── themes.js
│       ├── animations.css
│       └── components/
│           └── [component].module.css
│
├── public/
│   ├── sounds/
│   │   ├── correct.mp3
│   │   ├── incorrect.mp3
│   │   └── complete.mp3
│   └── images/
│       └── logo.svg
│
└── scripts/
    ├── hash-password.js
    └── seed-puzzles.js
```

## 1. Package.json
```json
{
  "name": "tandem-game",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest --watch",
    "test:ci": "jest --ci",
    "hash-password": "node scripts/hash-password.js",
    "seed": "node scripts/seed-puzzles.js"
  },
  "dependencies": {
    "@vercel/kv": "^1.0.1",
    "bcryptjs": "^2.4.3",
    "clsx": "^2.1.0",
    "date-fns": "^3.0.0",
    "html2canvas": "^1.4.1",
    "jsonwebtoken": "^9.0.2",
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "zustand": "^4.4.7",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.4",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8",
    "tailwindcss": "^3.3.0"
  }
}
```

## 2. Core Configuration Files

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['localhost', 'tandem.game'],
  },
}

module.exports = nextConfig
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        plum: {
          DEFAULT: '#6B46C1',
          dark: '#8B5CF6',
        },
        peach: {
          DEFAULT: '#FFB5A7',
          dark: '#FCA5A5',
        },
        sage: {
          DEFAULT: '#87A96B',
          dark: '#86EFAC',
        },
        coral: {
          DEFAULT: '#FF6B6B',
          dark: '#F87171',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease',
        'slide-up': 'slideUp 0.5s ease',
        'pulse': 'pulse 2s infinite',
        'link-snap': 'linkSnap 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shake': 'shake 0.5s',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: 0, transform: 'translateY(20px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          'from': { opacity: 0, transform: 'translateY(100%)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        linkSnap: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(0.95)' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
      },
    },
  },
  plugins: [],
}
```

## 3. Environment Variables (.env.local)
```env
# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$YourHashedPasswordHere
JWT_SECRET=your-secret-key-change-this-in-production

# Vercel KV Database (auto-populated by Vercel)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GAME_START_DATE=2025-01-01

# Feature Flags
NEXT_PUBLIC_ENABLE_SOUNDS=true
NEXT_PUBLIC_ENABLE_SHARING=true
NEXT_PUBLIC_ENABLE_STATS=true
```

## 4. Constants (src/lib/constants.js)
```javascript
// Game Configuration
export const GAME_CONFIG = {
  MAX_MISTAKES: 4,
  PUZZLE_COUNT: 4,
  MAX_ANSWER_LENGTH: 10,
  START_DATE: process.env.NEXT_PUBLIC_GAME_START_DATE || '2025-01-01',
};

// Storage Keys
export const STORAGE_KEYS = {
  THEME: 'tandemTheme',
  SOUND: 'tandemSound',
  STATS: 'tandemStats',
  AUTH_TOKEN: 'adminToken',
};

// API Endpoints
export const API_ENDPOINTS = {
  PUZZLE: '/api/puzzle',
  ADMIN_AUTH: '/api/admin/auth',
  ADMIN_PUZZLES: '/api/admin/puzzles',
  STATS: '/api/stats',
};

// Game States
export const GAME_STATES = {
  WELCOME: 'welcome',
  PLAYING: 'playing',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// Puzzle Templates
export const PUZZLE_TEMPLATES = [
  {
    id: 'weather',
    name: 'Weather',
    theme: 'Types of Weather',
    puzzles: [
      { emoji: '☀️🌡️', answer: 'SUNNY' },
      { emoji: '☁️💧', answer: 'RAIN' },
      { emoji: '❄️🌨️', answer: 'SNOW' },
      { emoji: '⚡🔊', answer: 'THUNDER' },
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    theme: 'Popular Sports',
    puzzles: [
      { emoji: '⚽🥅', answer: 'SOCCER' },
      { emoji: '🏀🗑️', answer: 'BASKETBALL' },
      { emoji: '🎾🏆', answer: 'TENNIS' },
      { emoji: '⚾🧢', answer: 'BASEBALL' },
    ],
  },
  {
    id: 'music',
    name: 'Music',
    theme: 'Music Genres',
    puzzles: [
      { emoji: '🎸🤘', answer: 'ROCK' },
      { emoji: '🎺🎷', answer: 'JAZZ' },
      { emoji: '🎹🎼', answer: 'CLASSICAL' },
      { emoji: '🎤🎵', answer: 'POP' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    theme: 'Popular Foods',
    puzzles: [
      { emoji: '🍕🇮🇹', answer: 'PIZZA' },
      { emoji: '🍔🍟', answer: 'BURGER' },
      { emoji: '🍣🇯🇵', answer: 'SUSHI' },
      { emoji: '🌮🇲🇽', answer: 'TACO' },
    ],
  },
];

// Sound Configuration
export const SOUND_CONFIG = {
  ENABLED: process.env.NEXT_PUBLIC_ENABLE_SOUNDS === 'true',
  VOLUME: 0.3,
  SOUNDS: {
    CORRECT: {
      frequencies: [523.25, 659.25, 783.99],
      duration: 0.3,
    },
    INCORRECT: {
      frequencies: [196, 174.61],
      duration: 0.2,
    },
    COMPLETE: {
      frequencies: [523.25, 659.25, 783.99, 1046.50],
      duration: 0.5,
    },
  },
};

// Theme Configuration
export const THEME_CONFIG = {
  LIGHT: 'light',
  DARK: 'dark',
  DEFAULT: 'light',
};

// Admin Configuration
export const ADMIN_CONFIG = {
  SESSION_DURATION: '7d',
  MAX_BULK_OPERATIONS: 30,
  CALENDAR_DAYS_AHEAD: 30,
};

// Validation Rules
export const VALIDATION_RULES = {
  ANSWER: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 10,
    PATTERN: /^[A-Z\s]+$/,
  },
  EMOJI: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 6,
  },
  THEME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
};

// Messages
export const MESSAGES = {
  ERRORS: {
    PUZZLE_LOAD_FAILED: 'Failed to load today\'s puzzle',
    AUTH_FAILED: 'Authentication failed',
    SAVE_FAILED: 'Failed to save your progress',
    NETWORK_ERROR: 'Network error. Please try again.',
  },
  SUCCESS: {
    PUZZLE_COMPLETE: 'Puzzle Complete!',
    PUZZLE_SAVED: 'Puzzle saved successfully',
    STATS_UPDATED: 'Statistics updated',
  },
  INFO: {
    NO_PUZZLE: 'No puzzle available for today',
    LOADING: 'Loading puzzle...',
    CHECKING: 'Checking answers...',
  },
};
```

## 5. Utilities (src/lib/utils.js)
```javascript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind CSS classes with proper precedence
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats seconds into MM:SS format
 */
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates puzzle number from start date
 */
export function getPuzzleNumber(startDate = '2025-01-01') {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = Math.abs(today - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Gets current puzzle date info
 */
export function getCurrentPuzzleInfo() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return {
    number: getPuzzleNumber(),
    date: now.toLocaleDateString('en-US', options),
    isoDate: now.toISOString().split('T')[0],
  };
}

/**
 * Generates share text for results
 */
export function generateShareText(puzzleNumber, time, mistakes, results) {
  const resultEmojis = results.map(r => r ? '🟣🟠' : '⚪⚪').join('');
  return `Tandem #${puzzleNumber}\n${resultEmojis}\nTime: ${time}\nMistakes: ${mistakes}/4\n\nPlay at tandem.game`;
}

/**
 * Debounce function for performance
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Checks if running on mobile device
 */
export function isMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Validates puzzle structure
 */
export function isValidPuzzle(puzzle) {
  if (!puzzle || typeof puzzle !== 'object') return false;
  if (!puzzle.theme || typeof puzzle.theme !== 'string') return false;
  if (!Array.isArray(puzzle.puzzles) || puzzle.puzzles.length !== 4) return false;
  
  return puzzle.puzzles.every(p => 
    p.emoji && 
    typeof p.emoji === 'string' && 
    p.answer && 
    typeof p.answer === 'string'
  );
}

/**
 * Sanitizes user input
 */
export function sanitizeInput(input) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '');
}

/**
 * Creates a delay promise
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parses JSON with fallback
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Generates a unique ID
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Formats date for display
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  
  if (format === 'short') {
    return d.toLocaleDateString();
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  
  return d.toISOString().split('T')[0];
}

/**
 * Deep clones an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if dates are the same day
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}
```

## 6. Services Layer (src/services/puzzle.service.js)
```javascript
import { API_ENDPOINTS } from '@/lib/constants';

class PuzzleService {
  /**
   * Fetches the puzzle for a specific date
   */
  async getPuzzle(date = null) {
    try {
      const url = date 
        ? `${API_ENDPOINTS.PUZZLE}?date=${date}`
        : API_ENDPOINTS.PUZZLE;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch puzzle: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('PuzzleService.getPuzzle error:', error);
      throw error;
    }
  }

  /**
   * Submits puzzle completion
   */
  async submitCompletion(data) {
    try {
      const response = await fetch(API_ENDPOINTS.PUZZLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit completion: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.submitCompletion error:', error);
      throw error;
    }
  }

  /**
   * Gets puzzle hints (if implemented)
   */
  async getHint(puzzleId, questionIndex) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PUZZLE}/hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ puzzleId, questionIndex }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get hint: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.getHint error:', error);
      throw error;
    }
  }

  /**
   * Validates a single answer
   */
  async validateAnswer(puzzleId, questionIndex, answer) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PUZZLE}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          puzzleId, 
          questionIndex, 
          answer: answer.toUpperCase() 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to validate answer: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.validateAnswer error:', error);
      throw error;
    }
  }

  /**
   * Gets upcoming puzzles preview (for logged-in users)
   */
  async getUpcomingPuzzles(days = 7) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PUZZLE}/upcoming?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch upcoming puzzles: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PuzzleService.getUpcomingPuzzles error:', error);
      throw error;
    }
  }
}

export default new PuzzleService();
```

## 7. Hook: useGame (src/hooks/useGame.js)
```javascript
import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES } from '@/lib/constants';
import puzzleService from '@/services/puzzle.service';
import statsService from '@/services/stats.service';
import { sanitizeInput } from '@/lib/utils';

export function useGame() {
  const [gameState, setGameState] = useState(GAME_STATES.WELCOME);
  const [puzzle, setPuzzle] = useState(null);
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState([false, false, false, false]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load puzzle on mount
  useEffect(() => {
    loadPuzzle();
  }, []);

  const loadPuzzle = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await puzzleService.getPuzzle();
      
      if (data.puzzle) {
        setPuzzle(data.puzzle);
      } else {
        setError('No puzzle available for today');
      }
    } catch (err) {
      setError('Failed to load puzzle. Please try again.');
      console.error('Failed to load puzzle:', err);
    } finally {
      setLoading(false);
    }
  };

  const startGame = useCallback(() => {
    setGameState(GAME_STATES.PLAYING);
    setMistakes(0);
    setSolved(0);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
  }, []);

  const updateAnswer = useCallback((index, value) => {
    const sanitized = sanitizeInput(value);
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = sanitized;
      return newAnswers;
    });
  }, []);

  const checkAnswers = useCallback(() => {
    if (!puzzle) return;

    let newMistakes = 0;
    let newSolved = 0;
    const newCorrectAnswers = [...correctAnswers];

    puzzle.puzzles.forEach((p, i) => {
      if (correctAnswers[i]) {
        newSolved++;
        return;
      }

      const userAnswer = answers[i].trim();
      if (userAnswer) {
        if (userAnswer === p.answer.toUpperCase()) {
          newCorrectAnswers[i] = true;
          newSolved++;
        } else {
          newMistakes++;
        }
      }
    });

    setCorrectAnswers(newCorrectAnswers);
    setMistakes(prev => prev + newMistakes);
    setSolved(newSolved);

    // Check game completion
    if (newSolved === GAME_CONFIG.PUZZLE_COUNT) {
      completeGame(true);
    } else if (mistakes + newMistakes >= GAME_CONFIG.MAX_MISTAKES) {
      completeGame(false);
    }

    return {
      correct: newSolved - solved,
      incorrect: newMistakes,
    };
  }, [puzzle, answers, correctAnswers, mistakes, solved]);

  const completeGame = useCallback(async (won) => {
    setGameState(GAME_STATES.COMPLETE);
    
    // Save stats
    try {
      await statsService.updateStats({
        completed: won,
        mistakes,
        solved,
      });
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  }, [mistakes, solved]);

  const resetGame = useCallback(() => {
    setGameState(GAME_STATES.WELCOME);
    setAnswers(['', '', '', '']);
    setCorrectAnswers([false, false, false, false]);
    setMistakes(0);
    setSolved(0);
  }, []);

  return {
    // State
    gameState,
    puzzle,
    answers,
    correctAnswers,
    mistakes,
    solved,
    loading,
    error,
    
    // Actions
    startGame,
    updateAnswer,
    checkAnswers,
    completeGame,
    resetGame,
    loadPuzzle,
  };
}
```

## 8. Main Game Container (src/components/game/GameContainer.js)
```javascript
'use client';
import { useGame } from '@/hooks/useGame';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/hooks/useTheme';
import { useSound } from '@/hooks/useSound';
import { GAME_STATES } from '@/lib/constants';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function GameContainer() {
  const game = useGame();
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING);
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound, playSound } = useSound();

  const handleCheckAnswers = () => {
    const result = game.checkAnswers();
    
    if (result.correct > 0) {
      playSound('correct');
    }
    if (result.incorrect > 0) {
      playSound('incorrect');
    }
  };

  const handleComplete = (won) => {
    if (won) {
      playSound('complete');
    }
    game.completeGame(won);
  };

  if (game.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-plum to-peach">
        <LoadingSpinner />
      </div>
    );
  }

  if (game.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-plum to-peach">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Oops!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {game.error}
          </p>
          <button
            onClick={game.loadPuzzle}
            className="px-6 py-3 bg-plum text-white rounded-xl hover:bg-plum-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-plum to-peach ${theme}`}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
          {game.gameState === GAME_STATES.WELCOME && (
            <WelcomeScreen
              onStart={game.startGame}
              theme={theme}
              toggleTheme={toggleTheme}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
            />
          )}

          {game.gameState === GAME_STATES.PLAYING && (
            <PlayingScreen
              puzzle={game.puzzle}
              answers={game.answers}
              correctAnswers={game.correctAnswers}
              mistakes={game.mistakes}
              solved={game.solved}
              time={timer.elapsed}
              onUpdateAnswer={game.updateAnswer}
              onCheckAnswers={handleCheckAnswers}
              theme={theme}
              toggleTheme={toggleTheme}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
            />
          )}

          {game.gameState === GAME_STATES.COMPLETE && (
            <CompleteScreen
              won={game.solved === 4}
              time={timer.elapsed}
              mistakes={game.mistakes}
              correctAnswers={game.correctAnswers}
              onPlayAgain={game.resetGame}
              theme={theme}
              toggleTheme={toggleTheme}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

## Setup Instructions

1. **Initialize Project**
```bash
npx create-next-app@latest tandem-game --app --tailwind --no-typescript
cd tandem-game
```

2. **Install Dependencies**
```bash
npm install @vercel/kv bcryptjs jsonwebtoken date-fns html2canvas zustand clsx zod
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

3. **Create Directory Structure**
```bash
mkdir -p src/{components/{game,admin,shared},hooks,services,lib,store,styles}
```

4. **Copy all files to their respective locations**

5. **Generate Admin Password**
```bash
node scripts/hash-password.js your-secure-password
```

6. **Deploy to Vercel**
```bash
vercel
```

This structure follows professional game development best practices:
- **Separation of concerns** with dedicated folders
- **Component-based architecture** with small, focused components
- **Service layer** for API calls
- **Custom hooks** for reusable logic
- **Constants and utils** properly organized
- **Each file stays under 300-500 lines**
- **Proper error handling and loading states**
- **Type-safe with validation**
- **Testable architecture**