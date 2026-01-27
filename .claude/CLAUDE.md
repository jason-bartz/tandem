# CLAUDE.md

This file provides guidance for Claude Code when working with this codebase.

## Project Overview

Tandem Daily is a PWA and native iOS app featuring four daily puzzle games:

- **Daily Tandem** - Emoji word puzzles (4 puzzles/day, 4 mistakes allowed)
- **Daily Mini** - 5x5 crossword with AI-generated clues
- **Reel Connections** - Group 16 movies into 4 categories
- **Daily Alchemy** - Element combination puzzle (combine elements to reach target compounds)

**Live site:** https://www.tandemdaily.com

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS, Framer Motion
- **State:** Zustand
- **Database:** Supabase (PostgreSQL + Auth)
- **Cache:** Vercel KV (Redis)
- **AI:** Anthropic Claude (puzzle/clue generation)
- **Mobile:** Capacitor 5 (iOS)
- **Payments:** Stripe (web), StoreKit (iOS)
- **Email:** Resend
- **Validation:** Zod
- **Charts:** Chart.js + react-chartjs-2

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production (web)
npm run build:ios    # Build for iOS (uses .env.ios)
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run test         # Run tests in watch mode
npm run test:ci      # Run tests once
npm run test:coverage # Run tests with coverage

# iOS development
npm run ios:dev      # Build, sync, and open Xcode
npm run cap:sync     # Sync web build to iOS

# Admin scripts
npm run seed         # Seed Tandem puzzles
npm run seed:cryptic # Seed cryptic puzzles

# Code quality
npm run format       # Format code with Prettier
npm run format:check # Check formatting
npm run security:check # Run audit and lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # API endpoints (22+ route directories)
│   │   ├── admin/          # Admin endpoints
│   │   ├── cron/           # Scheduled tasks
│   │   ├── daily-alchemy/  # Alchemy game API
│   │   ├── iap/            # In-app purchases
│   │   ├── leaderboard/    # Leaderboard API
│   │   ├── mini/           # Mini crossword API
│   │   ├── puzzle/         # Tandem puzzle API
│   │   ├── reel-connections/ # Reel Connections API
│   │   ├── stats/          # General stats
│   │   ├── stripe/         # Payment webhooks
│   │   ├── subscription/   # Subscription management
│   │   └── user-*/         # User-specific endpoints
│   ├── admin/              # Admin panel UI
│   ├── daily-alchemy/      # Daily Alchemy game page
│   ├── dailymini/          # Mini crossword game page
│   ├── reel-connections/   # Reel Connections game page
│   └── account/            # User account management
├── components/             # React components by feature
│   ├── achievements/       # Achievement system UI
│   ├── admin/              # Admin panel components
│   ├── auth/               # Authentication components
│   ├── daily-alchemy/      # Alchemy game (13 components)
│   ├── game/               # Tandem game (27 components)
│   ├── home/               # Home page (GameCard, Greeting, etc.)
│   ├── leaderboard/        # Leaderboard UI
│   ├── mini/               # Mini crossword (9 components)
│   ├── navigation/         # SidebarMenu, Header, etc.
│   ├── onboarding/         # First-time user experience
│   ├── reel-connections/   # Reel Connections (7 components)
│   ├── shared/             # Reusable components (21 files)
│   ├── stats/              # Stats display components
│   └── ui/                 # Base UI primitives
├── hooks/                  # Custom React hooks (27 files)
├── services/               # Business logic services (23 files)
├── contexts/               # React contexts (Auth, Subscription, Theme)
├── core/                   # Core abstractions layer
│   ├── config/             # App configuration, constants, API config
│   ├── platform/           # Platform detection (iOS vs web)
│   ├── services/           # Core services (auth, cloudkit, notifications)
│   └── storage/            # Storage abstraction layer
├── data/                   # Static game data (usernames, reel-connections)
├── lib/                    # Utilities (48 files)
│   ├── server/             # Server-only (CrosswordGenerator, TrieGenerator)
│   ├── supabase/           # Supabase client/server setup
│   ├── email/              # Email service and templates
│   ├── stripe/             # Stripe configuration
│   ├── auth/               # Auth verification utilities
│   └── security/           # Security utilities
└── utils/                  # Helper functions
    ├── helpers/            # General helpers
    └── validation/         # Input validation, profanity filter

database/                   # Word lists, frequency scores, SQL schemas
ios/                        # Capacitor iOS project
scripts/                    # Admin, maintenance, and migration scripts
docs/                       # Documentation
tests/                      # Test files
├── e2e/                    # End-to-end tests (Playwright)
├── helpers/                # Test utilities
└── screenshots/            # Test screenshots
```

## Key Files

### Game Logic Hooks

- `src/hooks/useGameWithInitialData.js` - Main Tandem game logic
- `src/hooks/useMiniGame.js` - Mini crossword game logic
- `src/hooks/useReelConnectionsGame.js` - Reel Connections game logic
- `src/hooks/useDailyAlchemyGame.js` - Daily Alchemy game logic

### Core Services

- `src/services/ai.service.js` - Claude AI integration for puzzle generation (largest file)
- `src/lib/server/CrosswordGenerator.js` - Mini crossword puzzle generator
- `src/lib/db.js` - Database helper functions

### State & Auth

- `src/contexts/AuthContext.jsx` - Authentication state management
- `src/contexts/SubscriptionContext.jsx` - Subscription state management
- `src/contexts/ThemeContext.js` - Theme state management

### Configuration

- `src/core/config/constants.js` - Master game configuration and constants
- `src/lib/daily-alchemy.constants.js` - Daily Alchemy specific constants
- `src/lib/achievementDefinitions.js` - Achievement data

### Achievements & Stats

- `src/lib/achievementChecker.js` - Achievement validation logic
- `src/services/achievementSync.service.js` - Achievement sync to server
- `src/hooks/useUnifiedStats.js` - Unified stats across games
- `src/services/botLeaderboard.service.js` - Bot leaderboard system

## Architecture Notes

### API Routes

- Public endpoints don't require auth
- User endpoints require Supabase session (via Bearer token on iOS)
- Admin endpoints require JWT authentication
- Cron endpoints for scheduled tasks (puzzle generation, cleanup)

### State Management

- Local game state uses Zustand stores
- User stats sync to Supabase when authenticated
- iOS uses iCloud sync via CloudKit for offline-first experience
- Achievement system tracks progress across all games

### iOS Build Process

- Uses `.env.ios` for iOS-specific environment variables
- `BUILD_TARGET=capacitor` triggers static export mode
- Capacitor syncs web build to native iOS project
- Platform detection in `src/core/platform/`

### Core Directory

The `src/core/` directory contains platform-agnostic abstractions:

- **config/** - Centralized configuration (constants, API config, SEO)
- **platform/** - iOS vs web detection and device detection
- **services/** - Core services used across features
- **storage/** - Storage abstraction for cross-platform compatibility

## Code Conventions

- JavaScript (not TypeScript)
- ESLint + Prettier for code style
- Husky pre-commit hooks enforce linting (via lint-staged)
- Components use `.jsx` extension
- API routes use `.js` extension

## Environment Variables

See `.env.example` for required variables. Key ones:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase access
- `KV_*` - Vercel KV (Redis) credentials
- `ANTHROPIC_API_KEY` - Claude AI for puzzle generation
- `JWT_SECRET` - Admin authentication
- `STRIPE_*` - Payment processing
- `RESEND_API_KEY` - Email service

## Testing

```bash
npm test              # Jest in watch mode
npm run test:ci       # CI mode (single run)
npm run test:coverage # With coverage report
```

Tests are located in:

- `src/lib/__tests__/` - Unit tests for library functions
- `src/utils/__tests__/` - Unit tests for utilities
- `tests/e2e/` - Playwright end-to-end tests

## Common Tasks

### Adding a new API endpoint

1. Create file in `src/app/api/[feature]/route.js`
2. Export async functions: `GET`, `POST`, etc.
3. Use `createClient()` from `@/lib/supabase/server` for auth

### Adding a new component

1. Create in appropriate `src/components/[feature]/` directory
2. Use Tailwind for styling
3. Use Lucide React for icons
4. Export from `index.js` if the feature has one

### Working with the Mini crossword generator

- Word lists in `database/*_letter_words.txt`
- Frequency scores in `database/word_frequencies/`
- Generator in `src/lib/server/CrosswordGenerator.js`

### Working with Daily Alchemy

- Components in `src/components/daily-alchemy/`
- Game logic in `src/hooks/useDailyAlchemyGame.js`
- Constants in `src/lib/daily-alchemy.constants.js`
- API in `src/app/api/daily-alchemy/`

### iOS-specific changes

- Native code in `ios/App/App/`
- Update `capacitor.config.ts` for plugin settings
- Run `npm run cap:sync` after web changes
- Platform detection: `src/core/platform/platform.js`
