# Tandem Daily - Three Daily Puzzle Games

A progressive web application (PWA) and native iOS app featuring three daily puzzle games: Daily Tandem (emoji word puzzles), Daily Mini (5x5 crossword), and Reel Connections (movie trivia). Built with Next.js 14, Supabase, and Capacitor 5 for seamless cross-platform deployment.

**Live at:** [www.tandemdaily.com](https://www.tandemdaily.com)

## Games

### Daily Tandem

The original emoji word puzzle game. Decode four emoji clues to reveal words that share a common theme.

- **4 puzzles per day** with emoji clues
- **4 mistakes allowed** before game over
- **Hint system** with progressive unlocks
- **Hard Mode** with 3-minute time limit

### Daily Mini

A 5x5 mini crossword puzzle with AI-generated clues.

- **Quick 5x5 grid** perfect for a coffee break
- **AI-generated clues** using Claude
- **Check and reveal** features for hints
- **Speed-based scoring** for leaderboards

### Reel Connections

Group 16 movies into four categories that share something in common.

- **Movie trivia** meets Connections-style gameplay
- **4 difficulty tiers** (Easy to Tricky)
- **Hint system** reveals category themes
- **Film buff challenge** with deep cuts and classics

## Features

### Gameplay

- **Daily puzzles** rotate at midnight Eastern Time
- **Archive access** to play past puzzles (subscription for older archives)
- **Statistics tracking** for each game type
- **Streak tracking** with streak protection alerts
- **Share results** with emoji-based share cards

### Leaderboards

- **Daily speed leaderboards** for each game
- **Best streak leaderboards** tracking longest win streaks
- **Cross-device sync** of leaderboard positions
- **Opt-in participation** via settings

### Achievements

- **40+ achievements** across all three games
- **Cross-device sync** via Supabase
- **Achievement notifications** with celebration animations
- **Progress tracking** for multi-tier achievements

### User Experience

- **Dark/Light mode** with system preference detection
- **High contrast mode** for accessibility
- **Sound effects** and haptic feedback
- **Offline support** via PWA service worker
- **Responsive design** for all screen sizes

### iOS Native Features

- **iCloud sync** for stats and progress
- **Push notifications** for daily reminders and streak alerts
- **Apple Sign In** for quick account creation
- **In-app purchases** for Tandem Unlimited subscription
- **Haptic feedback** throughout gameplay
- **Native share sheet** integration

### Account System

- **Free tier** includes daily puzzles for all games
- **Tandem Unlimited** subscription unlocks full archive access
- **Cross-device sync** of all progress and stats
- **Avatar selection** with unlockable avatars

## Tech Stack

### Frontend

- **Next.js 14** (App Router)
- **React 18** with hooks
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **Lucide React** for icons

### Backend

- **Supabase** (PostgreSQL database + Auth)
- **Vercel KV** (Redis for caching)
- **Next.js API Routes** for serverless functions
- **Anthropic Claude AI** for puzzle generation

### Mobile

- **Capacitor 5** for iOS native integration
- **Native plugins:** Haptics, Notifications, Share, Keyboard, Preferences
- **cordova-plugin-purchase** for In-App Purchases
- **Apple Sign In** via Capacitor plugin

### Payments

- **Stripe** for web subscriptions
- **StoreKit** for iOS In-App Purchases

### Infrastructure

- **Vercel** for hosting and deployment
- **Supabase** for database and auth
- **Resend** for transactional emails

## Project Structure

```
tandem/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── admin/            # Admin endpoints (puzzles, generation)
│   │   │   ├── leaderboard/      # Leaderboard endpoints
│   │   │   ├── mini/             # Mini crossword API
│   │   │   ├── reel-connections/ # Reel Connections API
│   │   │   ├── user-stats/       # User statistics
│   │   │   └── ...
│   │   ├── admin/                # Admin panel UI
│   │   ├── dailymini/            # Daily Mini game page
│   │   ├── reel-connections/     # Reel Connections game page
│   │   ├── account/              # User account page
│   │   ├── how-to-play/          # Game instructions
│   │   └── page.jsx              # Main Tandem game
│   ├── components/
│   │   ├── game/                 # Tandem game components
│   │   ├── mini/                 # Mini crossword components
│   │   ├── reel-connections/     # Reel Connections components
│   │   ├── leaderboard/          # Leaderboard UI
│   │   ├── achievements/         # Achievement system UI
│   │   ├── stats/                # Statistics displays
│   │   ├── admin/                # Admin panel components
│   │   └── shared/               # Reusable components
│   ├── hooks/
│   │   ├── useGameWithInitialData.js  # Tandem game logic
│   │   ├── useMiniGame.js             # Mini crossword logic
│   │   ├── useReelConnectionsGame.js  # Reel Connections logic
│   │   ├── useCloudKitSync.js         # iCloud sync
│   │   └── ...
│   ├── services/
│   │   ├── ai.service.js         # Claude AI integration
│   │   ├── stats.service.js      # Statistics management
│   │   ├── puzzle.service.js     # Puzzle data management
│   │   └── ...
│   ├── contexts/
│   │   ├── AuthContext.js        # Authentication state
│   │   ├── SubscriptionContext.js # Subscription state
│   │   └── ThemeContext.js       # Theme management
│   └── lib/
│       ├── supabase/             # Supabase client configuration
│       ├── server/               # Server-side utilities
│       │   ├── CrosswordGenerator.js  # Mini puzzle generator
│       │   └── TrieGenerator.js       # Word lookup trie
│       ├── constants.js          # App-wide constants
│       ├── storage.js            # Local storage management
│       └── ...
├── database/
│   ├── *_letter_words.txt        # Word lists for Mini generator
│   ├── word_frequencies/         # Word frequency scores
│   └── *.sql                     # Database schema files
├── ios/                          # iOS native app (Capacitor)
│   └── App/
│       ├── App/                  # Native Swift code
│       └── Podfile               # CocoaPods dependencies
├── public/
│   ├── images/                   # Static images
│   ├── sounds/                   # Sound effects
│   └── manifest.json             # PWA manifest
└── docs/                         # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 14+ (for iOS development)
- CocoaPods: `sudo gem install cocoapods`
- Supabase account
- Vercel account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/jason-bartz/tandem.git
   cd tandem
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Vercel KV (Redis)
   KV_URL=your_redis_url
   KV_REST_API_URL=your_redis_rest_url
   KV_REST_API_TOKEN=your_redis_token

   # Admin Authentication
   JWT_SECRET=your_jwt_secret_key
   ADMIN_PASSWORD_HASH=your_bcrypt_hash

   # AI (for puzzle generation)
   ANTHROPIC_API_KEY=your_anthropic_key

   # Stripe (optional, for web payments)
   STRIPE_SECRET_KEY=your_stripe_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public

   # Email (optional)
   RESEND_API_KEY=your_resend_key

   # API URL
   NEXT_PUBLIC_API_URL=https://www.tandemdaily.com
   ```

4. **Set up the database**
   - Create a Supabase project
   - Run the SQL schemas in `database/` directory
   - Configure Row Level Security policies

### Development

**Web Development:**

```bash
npm run dev
```

Visit `http://localhost:3000`

**iOS Development:**

```bash
npm run ios:dev  # Build, sync, and open Xcode
```

### Building for Production

**Web:**

```bash
npm run build
```

**iOS:**

```bash
npm run ios:build  # Build and sync for iOS
# Then archive in Xcode for App Store
```

## API Endpoints

### Public APIs

- `GET /api/puzzle` - Get today's Tandem puzzle
- `GET /api/mini/puzzle` - Get today's Mini puzzle
- `GET /api/reel-connections/puzzle` - Get today's Reel Connections puzzle
- `GET /api/leaderboard/daily` - Get daily leaderboard
- `GET /api/leaderboard/streak` - Get streak leaderboard

### Authenticated APIs

- `GET/POST /api/user-stats` - User statistics for Tandem
- `GET/POST /api/user-mini-stats` - User statistics for Mini
- `GET/POST /api/user-reel-stats` - User statistics for Reel Connections
- `GET/POST /api/user-achievements` - User achievements

### Admin APIs (JWT Required)

- `POST /api/admin/puzzles` - Manage Tandem puzzles
- `POST /api/admin/mini/generate` - Generate Mini puzzles
- `POST /api/admin/reel-connections/generate` - Generate Reel puzzles

## Game Configurations

### Daily Tandem

- 4 emoji-word puzzles per day
- 4 mistakes allowed
- 2 hints available (unlock at 2 correct answers)
- Hard mode: 3-minute time limit

### Daily Mini

- 5x5 crossword grid
- Check feature to validate answers
- Reveal feature for stuck players
- AI-generated clues via Claude

### Reel Connections

- 16 movies in 4 groups
- 4 difficulty tiers per puzzle
- 4 mistakes allowed
- Hint reveals category theme

## Deployment

### Vercel (Web)

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy from `main` branch

### App Store (iOS)

1. Build with `npm run ios:build`
2. Open in Xcode and archive
3. Upload to App Store Connect
4. Submit for review

## Testing

```bash
npm test              # Run tests in watch mode
npm run test:ci       # Run tests once
npm run test:coverage # Generate coverage report
```

## Code Quality

```bash
npm run lint          # Check for lint issues
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format with Prettier
```

Pre-commit hooks run ESLint and Prettier automatically.

## Documentation

See the [docs/](docs/) directory for detailed documentation:

- Setup guides for CloudKit, Supabase, etc.
- Feature documentation
- Development guides and troubleshooting

## License

© 2026 Good Vibes Games. All rights reserved.

## Support

- **In-App:** Settings → Support
- **Web:** [www.tandemdaily.com/support](https://www.tandemdaily.com/support)
- **Email:** support@goodvibesgames.com

---

**Built with love for puzzle enthusiasts worldwide**
