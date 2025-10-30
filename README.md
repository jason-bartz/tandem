# Tandem - Daily Emoji Word Puzzle Game

A progressive web application (PWA) and native iOS game where players solve emoji-based word puzzles. Built with Next.js 14 and Capacitor 5 for seamless cross-platform deployment.

## 📱 Features

### Core Gameplay

- **Daily Puzzle:** New puzzle every day at midnight Eastern Time with automatic rotation
- **Archive Mode:** Access and play previous puzzles with pagination
- **Smart Input System:** On-screen keyboard with multiple layouts (QWERTY, QWERTZ, AZERTY)
- **Single-Press Delete:** Simple, reliable backspace functionality
- **Hint System:** One hint per puzzle revealing the first letter
- **Answer Validation:** Smart checking with support for variations and alternate forms
- **Statistics Tracking:** Comprehensive stats including wins, streaks, solve times, and accuracy

### User Experience

- **Responsive Design:** Unified layout across all devices with mobile-first approach
- **Dark Mode:** Automatic theme switching based on system preferences with manual override
- **High Contrast Mode:** Color blind friendly mode with enhanced patterns
- **Offline Support:** Full PWA support with service workers and offline caching
- **Sound Effects:** Optional keyboard sounds and game feedback
- **Haptic Feedback:** Native haptics on iOS for enhanced tactile experience

### iOS Native Features

- **iCloud Sync:** Automatic stats and progress synchronization across devices
- **Push Notifications:** Daily puzzle reminders and streak protection alerts
- **Share Functionality:** Native iOS share sheet integration
- **In-App Subscriptions:** Three-tier subscription system (Buddy Pass, Best Friends, Soulmates)
- **App Lifecycle Management:** Proper timer handling during background/foreground transitions
- **Status Bar Theming:** Dynamic status bar styling based on theme

### Admin Panel

- **Puzzle Management:** Create, edit, and delete puzzles
- **Bulk Import:** CSV/JSON import for batch puzzle creation
- **Analytics Dashboard:** View play statistics and user engagement metrics
- **Theme Management:** Organize puzzles by categories
- **Manual Rotation:** Force puzzle updates when needed

## 🏗️ Architecture

### Technology Stack

**Frontend:**

- Next.js 14 (App Router)
- React 18
- Tailwind CSS for styling
- Zustand for state management

**Mobile:**

- Capacitor 5 (iOS native integration)
- Native plugins: Haptics, Notifications, Share, Keyboard, Status Bar, Preferences
- In-App Purchase plugin (cordova-plugin-purchase)

**Backend:**

- Next.js API Routes
- Vercel KV (Redis) for data persistence
- JWT authentication for admin panel
- Bcrypt for password hashing

**Development Tools:**

- Jest + React Testing Library
- ESLint + Prettier (with pre-commit hooks via Husky)
- Lint-staged for staged file linting
- Playwright for E2E testing

### Project Structure

```
tandem/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── puzzles/        # Puzzle CRUD endpoints
│   │   │   ├── stats/          # Statistics endpoints
│   │   │   ├── admin/          # Admin authentication & management
│   │   │   └── version/        # Version checking
│   │   ├── admin/              # Admin panel UI
│   │   │   ├── login/          # Admin login page
│   │   │   └── page.jsx        # Admin dashboard
│   │   ├── support/            # Support page
│   │   ├── terms/              # Terms of service
│   │   ├── privacypolicy/      # Privacy policy
│   │   ├── page.jsx            # Main game page
│   │   ├── layout.jsx          # Root layout with metadata
│   │   └── globals.css         # Global styles & Tailwind
│   ├── components/             # React components
│   │   ├── game/               # Game components
│   │   │   ├── GameContainerClient.jsx  # Main game container
│   │   │   ├── WelcomeScreen.jsx        # Welcome/home screen
│   │   │   ├── PlayingScreen.jsx        # Active game screen
│   │   │   ├── CompleteScreen.jsx       # Game completion screen
│   │   │   ├── OnScreenKeyboard.jsx     # Virtual keyboard
│   │   │   ├── PuzzleRow.jsx            # Individual puzzle input
│   │   │   ├── StatsBar.jsx             # Timer/mistakes display
│   │   │   └── [modals]                 # Various modal dialogs
│   │   ├── admin/              # Admin components
│   │   │   ├── PuzzleEditor.jsx         # Puzzle creation/editing
│   │   │   ├── BulkImport.jsx           # Bulk puzzle import
│   │   │   └── ThemeTracker.jsx         # Theme statistics
│   │   ├── shared/             # Reusable components
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── VersionChecker.jsx       # iOS version management
│   │   ├── Settings.jsx        # Settings modal
│   │   ├── PaywallModal.jsx    # Subscription paywall (iOS)
│   │   └── SEOHead.jsx         # SEO metadata
│   ├── hooks/                  # Custom React hooks
│   │   ├── useGame.js          # Core game logic
│   │   ├── useGameLogic.js     # Game state management
│   │   ├── useGameWithInitialData.js
│   │   ├── useTimer.js         # Timer functionality
│   │   ├── useHaptics.js       # Haptic feedback
│   │   ├── useSound.js         # Sound effects
│   │   ├── useTheme.js         # Theme management (deprecated - use context)
│   │   ├── useCloudKitSync.js  # iCloud synchronization
│   │   ├── useMidnightRefresh.js  # Auto-refresh at midnight
│   │   └── usePerformanceOptimizations.js
│   ├── services/               # Business logic & API clients
│   │   ├── api.js              # API client wrapper
│   │   ├── platform.js         # Platform detection & services
│   │   ├── cloudkit.service.js # iCloud/CloudKit integration
│   │   ├── notificationService.js  # Push notifications
│   │   ├── subscriptionService.js  # In-app purchases
│   │   ├── puzzle.service.js   # Puzzle data management
│   │   ├── stats.service.js    # Statistics management
│   │   ├── admin.service.js    # Admin operations
│   │   └── auth.service.js     # Authentication
│   ├── lib/                    # Utilities & helpers
│   │   ├── security/           # Security utilities
│   │   │   ├── csrf.js         # CSRF protection
│   │   │   ├── rateLimiter.js  # Rate limiting
│   │   │   └── headers.js      # Security headers
│   │   ├── db.js               # Database operations (Vercel KV)
│   │   ├── auth.js             # JWT authentication
│   │   ├── validation.js       # Zod schemas for validation
│   │   ├── storage.js          # Local/iCloud storage management
│   │   ├── sounds.js           # Sound effect management
│   │   ├── deviceDetection.js  # Device type detection
│   │   ├── puzzleNumber.js     # Puzzle numbering logic
│   │   ├── constants.js        # App-wide constants
│   │   ├── utils.js            # General utilities
│   │   ├── analytics.js        # Google Analytics
│   │   ├── errorHandler.js     # Error handling
│   │   ├── logger.js           # Logging utilities
│   │   └── notificationMessages.js  # Notification templates
│   ├── contexts/               # React contexts
│   │   └── ThemeContext.js     # Theme provider (auto/manual modes)
│   ├── data/                   # Static data
│   │   └── puzzle-templates/   # Template puzzles
│   └── styles/                 # Additional styles
├── ios/                        # iOS native app (Capacitor)
│   └── App/
│       ├── App/                # iOS native code
│       │   ├── AppDelegate.swift
│       │   ├── Info.plist
│       │   ├── PrivacyInfo.xcprivacy
│       │   ├── capacitor.config.json
│       │   └── Plugins/        # Native plugin implementations
│       ├── Podfile             # CocoaPods dependencies
│       └── App.xcworkspace     # Xcode workspace
├── public/                     # Static assets
│   ├── puzzles/                # Puzzle JSON files
│   ├── images/                 # Images & backgrounds
│   ├── icons/                  # PWA & app icons
│   ├── sounds/                 # Sound effects
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
├── scripts/                    # Utility scripts
│   ├── admin/                  # Admin & setup scripts
│   │   ├── hash-password.js    # Password hash generator
│   │   ├── seed-puzzles.js     # Puzzle seeding script
│   │   └── [others]            # JWT, passwords, achievements
│   ├── maintenance/            # Data migration & fixes
│   └── README.md               # Scripts documentation
├── docs/                       # Documentation
│   ├── setup/                  # Setup & configuration guides
│   ├── features/               # Feature documentation
│   ├── development/            # Developer guides
│   └── README.md               # Documentation index
├── supabase/                   # Supabase project files
│   └── migrations/             # Database migrations
└── tests/                      # Test files
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Xcode 14+ (for iOS development)
- CocoaPods (for iOS dependencies): `sudo gem install cocoapods`
- Vercel account (for KV database)

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

   Create `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:

   ```env
   # Vercel KV (Redis) - Required for production
   KV_URL=your_redis_url
   KV_REST_API_URL=your_redis_rest_url
   KV_REST_API_TOKEN=your_redis_token
   KV_REST_API_READ_ONLY_TOKEN=your_redis_readonly_token

   # Admin Authentication
   JWT_SECRET=your_jwt_secret_key
   ADMIN_PASSWORD_HASH=your_bcrypt_hash

   # API Configuration
   NEXT_PUBLIC_API_URL=https://www.tandemdaily.com

   # Optional: Google Analytics
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

   # Optional: Logging level
   NEXT_PUBLIC_LOG_LEVEL=WARN

   # Environment
   NODE_ENV=development
   ```

4. **Generate admin credentials**

   ```bash
   # Generate password hash
   npm run hash-password
   # Copy the hash to ADMIN_PASSWORD_HASH in .env.local

   # JWT_SECRET can be any secure random string
   ```

### Development

**Web Development:**

```bash
npm run dev
```

Visit `http://localhost:3000`

**iOS Development:**

```bash
# Build for iOS with Capacitor target
npm run build:ios

# Sync with Capacitor
npm run cap:sync

# Open in Xcode
npm run cap:open

# Or run all steps at once
npm run ios:dev
```

### Building for Production

**Web Build:**

```bash
npm run build
npm start
```

**iOS Build:**

```bash
# Build and sync for iOS
npm run ios:build

# Then open in Xcode and:
# 1. Select "Any iOS Device (arm64)"
# 2. Product → Archive
# 3. Validate and distribute to App Store
```

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once (CI)
npm run test:ci

# Generate coverage report
npm run test:coverage

# E2E tests with Playwright
npx playwright test
```

## 📝 Code Quality

**Linting:**

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

**Formatting:**

```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

**Pre-commit Hooks:**
Husky automatically runs ESLint and Prettier on staged files before each commit.

**Security Audit:**

```bash
npm run audit         # Check for vulnerabilities
npm run audit:fix     # Attempt to fix vulnerabilities
npm run security:check # Run audit + lint
```

## 🔒 Security Features

- **CSRF Protection:** Token-based protection for all state-changing operations
- **Rate Limiting:** Prevents brute force attacks
  - Auth endpoints: 5 attempts per 15 minutes
  - General API: 30 requests per minute
  - Write operations: 10 requests per minute
- **Input Validation:** Zod schemas validate all user input
- **JWT Authentication:** Secure admin panel access with token expiration
- **Security Headers:** Comprehensive headers via Next.js middleware
- **Content Security Policy:** Strict CSP for admin routes
- **Password Security:** Bcrypt hashing with salt rounds

## 🎮 Game Logic

### Puzzle Structure

Each puzzle contains:

- **Theme:** Category hint (e.g., "Kitchen Appliances", "Sports Equipment")
- **4 Emoji-Word Pairs:** Emoji clues with corresponding answers
- **Date:** ISO date string (YYYY-MM-DD)
- **Puzzle Number:** Sequential numbering from app launch date

### Game Rules

- **Mistakes:** 4 incorrect answers allowed before game over
- **Hints:** 1 hint per puzzle (reveals first letter of random unsolved answer)
- **Answer Checking:** Individual answer validation on Enter key
- **Timer:** Tracks solve time, pauses when app backgrounded
- **Variations:** Accepts plurals and common alternate forms
- **Statistics:** Tracks wins, losses, streaks, average time, accuracy

### Puzzle Rotation

Puzzles rotate daily at **midnight Eastern Time (ET)**. The system:

1. Checks Vercel KV/Redis for custom puzzles by date
2. Falls back to local JSON files in `/public/puzzles/`
3. Uses template puzzles if no puzzle exists for the date
4. Auto-refreshes on iOS apps at midnight

### Keyboard Layouts

Supports three keyboard layouts:

- **QWERTY** (English, default)
- **QWERTZ** (German)
- **AZERTY** (French)

## 📊 Admin Panel

Access at `/admin` (web only - not available in iOS app)

### Features

- **Puzzle Management:** Create, edit, delete, and preview puzzles
- **Bulk Import:** Import multiple puzzles via CSV or JSON
- **Analytics Dashboard:**
  - Total plays, wins, completion rate
  - Average solve time and mistake rate
  - Theme distribution and popularity
- **Theme Management:** Organize and categorize puzzles
- **Manual Rotation:** Force immediate puzzle update
- **Statistics Viewer:** View global and per-puzzle stats

### Authentication

```bash
# Generate admin password hash
npm run hash-password
# Enter password when prompted
# Add hash to .env.local as ADMIN_PASSWORD_HASH

# JWT_SECRET should be a secure random string (min 32 chars)
```

Login at `/admin/login` with your configured password.

## 📱 iOS-Specific Features

### Native Capabilities

- **Haptic Feedback:** Light, medium, heavy, success, error, warning patterns
- **Local Notifications:**
  - Daily puzzle reminder (6:00 AM ET)
  - Streak protection alert (8:00 PM ET if puzzle not completed)
- **Share Functionality:** Native iOS share sheet for results
- **Status Bar Theming:** Matches light/dark mode
- **Keyboard Management:** Auto-resize handling for on-screen keyboard
- **iCloud Sync:** CloudKit-based stats and progress synchronization
- **App Lifecycle:** Proper pause/resume timer management

### In-App Subscriptions

Three subscription tiers:

- **Buddy Pass:** Basic premium features
- **Best Friends:** Enhanced features + archive access
- **Soulmates:** Lifetime access with all features

Managed via `subscriptionService.js` and iOS StoreKit.

### Configuration

- **Bundle ID:** `com.tandemdaily.app`
- **Min iOS Version:** 13.0
- **Deployment Target:** iOS 13.0+
- **Supported Devices:** iPhone, iPad
- **Orientation:** Portrait only
- **Entitlements:**
  - CloudKit
  - iCloud Key-Value Storage
  - Push Notifications
  - In-App Purchase

### Privacy

The app includes a comprehensive `PrivacyInfo.xcprivacy` file detailing:

- Data collection practices
- Third-party SDK usage
- API endpoints accessed
- Required by Apple for App Store submission

## 🌐 API Endpoints

### Public API

**Puzzles:**

- `GET /api/puzzles` - Get today's puzzle
- `GET /api/puzzles?date=YYYY-MM-DD` - Get puzzle by date
- `POST /api/puzzles/batch` - Get multiple puzzles
- `GET /api/puzzles/paginated?page=1&limit=10` - Paginated puzzle list

**Statistics:**

- `GET /api/stats` - Get global statistics
- `POST /api/stats` - Update user statistics

**System:**

- `GET /api/version` - Get API version for update checking

### Admin API (JWT Required)

**Authentication:**

- `POST /api/admin/auth` - Login (returns JWT token)

**Puzzle Management:**

- `GET /api/admin/puzzles` - List all puzzles
- `POST /api/admin/puzzles` - Create puzzle
- `PUT /api/admin/puzzles` - Update puzzle
- `DELETE /api/admin/puzzles?id=puzzle-id` - Delete puzzle
- `POST /api/admin/bulk-import` - Bulk import puzzles
- `POST /api/admin/rotate-puzzle` - Force puzzle rotation

**Rate Limits:**

- Auth endpoints: 5 requests/15 minutes
- Read operations: 30 requests/minute
- Write operations: 10 requests/minute

### CSRF Protection

All state-changing operations require a valid CSRF token in the `X-CSRF-Token` header.

## 🚢 Deployment

### Vercel (Web/PWA)

1. **Connect Repository**
   - Import repository in Vercel dashboard
   - Select the `main` branch for production

2. **Configure Environment Variables**
   - Add all variables from `.env.example` to Vercel
   - Ensure `NEXT_PUBLIC_API_URL` points to your production domain

3. **Configure Vercel KV**
   - Create a KV database in Vercel dashboard
   - Copy connection strings to environment variables

4. **Deploy**
   - Push to `main` branch triggers automatic deployment
   - Preview deployments created for pull requests

**Custom Domain:**

- Add domain in Vercel dashboard
- Update `NEXT_PUBLIC_API_URL` to match custom domain

### App Store (iOS)

1. **Prepare for Build**

   ```bash
   # Ensure version is updated in package.json and Info.plist
   npm run ios:build
   ```

2. **Build in Xcode**
   - Open `ios/App/App.xcworkspace`
   - Select "Any iOS Device (arm64)"
   - Product → Archive
   - Wait for archive to complete

3. **Validate & Upload**
   - Click "Validate App" in Organizer
   - Fix any issues found
   - Click "Distribute App"
   - Select "App Store Connect"
   - Upload to App Store Connect

4. **App Store Connect**
   - Complete app metadata
   - Upload screenshots (required sizes)
   - Submit for review

**Pre-submission Checklist:**

- ✅ Privacy policy URL updated in Info.plist
- ✅ PrivacyInfo.xcprivacy is complete
- ✅ All entitlements configured
- ✅ In-app purchases tested in sandbox
- ✅ Push notifications working
- ✅ iCloud sync functional
- ✅ No console warnings in production build

### Environment-Specific Builds

**Development:**

```bash
npm run dev
```

**Production Web:**

```bash
npm run build
```

**Production iOS:**

```bash
BUILD_TARGET=capacitor npm run build
```

The `BUILD_TARGET=capacitor` environment variable ensures:

- Static export for Capacitor
- Proper asset paths
- iOS-optimized builds

## 📚 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

- **[Setup Guides](docs/setup/)** - CloudKit, Supabase, Game Center configuration
- **[Feature Documentation](docs/features/)** - Detailed feature implementations
- **[Development Guides](docs/development/)** - Architecture and troubleshooting
- **[Scripts Documentation](scripts/README.md)** - Utility scripts reference

See [docs/README.md](docs/README.md) for a complete documentation index.

## 🐛 Troubleshooting

### iOS Build Issues

**Build fails in Xcode:**

```bash
# Clean build folder
xcodebuild clean -workspace ios/App/App.xcworkspace -scheme App

# Reinstall pods
cd ios/App
pod deintegrate
pod install
cd ../..

# Rebuild
npm run ios:build
```

**Capacitor sync fails:**

```bash
# Remove and re-add iOS platform
npx cap remove ios
npx cap add ios
npm run cap:sync
```

**Code signing errors:**

- Verify team and bundle ID in Xcode
- Check provisioning profiles in Apple Developer portal
- Clean build folder and retry

### Database Issues

**KV connection fails:**

- Verify credentials in `.env.local`
- Check Vercel KV dashboard for status
- App falls back to in-memory storage if KV unavailable

**Data not persisting:**

- Check browser localStorage permissions
- Verify iCloud is enabled (iOS)
- Check network connection for KV sync

### Puzzle Loading Issues

**Puzzle not appearing:**

- Check `/public/puzzles/` for puzzle file
- Verify date format is YYYY-MM-DD
- Check browser console for errors
- Ensure puzzle JSON is valid

**Wrong puzzle showing:**

- Verify timezone (app uses Eastern Time)
- Check system date/time settings
- Clear browser cache and reload

### Performance Issues

**Slow loading:**

- Check network connection
- Verify assets are properly optimized
- Check browser DevTools Performance tab

**Memory leaks:**

- Ensure proper cleanup in useEffect hooks
- Verify service worker is not holding stale data
- Check for infinite re-renders in React DevTools

## 📄 License

© 2025 Good Vibes Games. All rights reserved.

## 🤝 Contributing

This is a private repository. For internal development guidelines:

1. Create feature branches from `main`
2. Follow existing code style (enforced by ESLint/Prettier)
3. Write tests for new features
4. Ensure all tests pass before PR
5. Use conventional commit messages

## 📞 Support

- **In-App:** Settings → Support
- **Web:** [www.tandemdaily.com/support](https://www.tandemdaily.com/support)
- **Email:** support@goodvibesgames.com
- **Privacy Policy:** [www.tandemdaily.com/privacypolicy](https://www.tandemdaily.com/privacypolicy)

---

**Built with ❤️ for puzzle enthusiasts worldwide**
