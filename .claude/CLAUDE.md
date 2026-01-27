# CLAUDE.md

This file provides guidance for Claude Code when working with this codebase.

## Project Overview

Tandem Daily is a PWA and native iOS app featuring four daily puzzle games:

- **Daily Tandem** - Emoji word puzzles (4 puzzles/day, 4 mistakes allowed)
- **Daily Mini** - 5x5 crossword with AI-generated clues
- **Reel Connections** - Group 16 movies into 4 categories
- **Daily Alchemy** - Element combination puzzle with time limit

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

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production (web)
npm run build:ios    # Build for iOS (uses .env.ios)
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run test         # Run tests in watch mode
npm run test:ci      # Run tests once

# iOS development
npm run ios:dev      # Build, sync, and open Xcode
npm run cap:sync     # Sync web build to iOS

# Admin scripts
npm run seed         # Seed Tandem puzzles
npm run seed:cryptic # Seed cryptic puzzles
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # API endpoints (puzzle, stats, leaderboard, admin)
│   ├── admin/        # Admin panel UI
│   ├── dailymini/    # Mini crossword game page
│   └── reel-connections/  # Reel Connections game page
├── components/       # React components organized by feature
│   ├── game/         # Tandem game components
│   ├── mini/         # Mini crossword components
│   ├── reel-connections/  # Reel Connections components
│   └── shared/       # Reusable components
├── hooks/            # Custom React hooks (game logic, sync, etc.)
├── services/         # Business logic services
├── contexts/         # React contexts (Auth, Subscription, Theme)
├── lib/              # Utilities, Supabase client, server helpers
│   └── server/       # Server-only code (CrosswordGenerator, TrieGenerator)
└── utils/            # Helper functions

database/             # Word lists for Mini generator, SQL schemas
ios/                  # Capacitor iOS project
scripts/              # Admin and maintenance scripts
docs/                 # Documentation
```

## Key Files

- `src/services/ai.service.js` - Claude AI integration for puzzle generation
- `src/lib/server/CrosswordGenerator.js` - Mini crossword puzzle generator
- `src/hooks/useGameWithInitialData.js` - Main Tandem game logic
- `src/hooks/useMiniGame.js` - Mini crossword game logic
- `src/hooks/useReelConnectionsGame.js` - Reel Connections game logic
- `src/contexts/AuthContext.js` - Authentication state management
- `src/contexts/SubscriptionContext.js` - Subscription state management

## Architecture Notes

### API Routes

- Public endpoints don't require auth
- User endpoints require Supabase session (via Bearer token on iOS)
- Admin endpoints require JWT authentication

### State Management

- Local game state uses Zustand stores
- User stats sync to Supabase when authenticated
- iOS uses iCloud sync via CloudKit for offline-first experience

### iOS Build Process

- Uses `.env.ios` for iOS-specific environment variables
- `BUILD_TARGET=capacitor` triggers static export mode
- Capacitor syncs web build to native iOS project

## Code Conventions

- JavaScript (not TypeScript)
- ESLint + Prettier for code style
- Husky pre-commit hooks enforce linting
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

## Testing

```bash
npm test              # Jest in watch mode
npm run test:ci       # CI mode (single run)
npm run test:coverage # With coverage report
```

## Common Tasks

### Adding a new API endpoint

1. Create file in `src/app/api/[feature]/route.js`
2. Export async functions: `GET`, `POST`, etc.
3. Use `createClient()` from `@/lib/supabase/server` for auth

### Adding a new component

1. Create in appropriate `src/components/[feature]/` directory
2. Use Tailwind for styling
3. Use Lucide React for icons

### Working with the Mini crossword generator

- Word lists in `database/*_letter_words.txt`
- Frequency scores in `database/word_frequencies/`
- Generator in `src/lib/server/CrosswordGenerator.js`

### iOS-specific changes

- Native code in `ios/App/App/`
- Update `capacitor.config.ts` for plugin settings
- Run `npm run cap:sync` after web changes
