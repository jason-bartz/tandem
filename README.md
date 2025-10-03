# Tandem - Daily Emoji Word Puzzle Game

A progressive web application (PWA) and native iOS game where players solve emoji-based word puzzles. Built with Next.js and Capacitor for cross-platform deployment.

## 📱 Features

- **Daily Puzzle:** New puzzle every day at midnight Eastern Time
- **Archive Mode:** Play previous puzzles
- **Statistics Tracking:** Monitor wins, streaks, and performance
- **Offline Support:** Play even without internet connection
- **Dark Mode:** System-aware theme switching
- **PWA Support:** Installable on web and mobile
- **Native iOS App:** Full Capacitor integration
- **Admin Panel:** Manage puzzles, view analytics (web only)

## 🏗️ Architecture

### Technology Stack

**Frontend:**

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Zustand (state management)

**Mobile:**

- Capacitor 5 (iOS)
- Native iOS integrations (Haptics, Notifications, Share, etc.)

**Backend:**

- Next.js API Routes
- Vercel KV (Redis) for data persistence
- JWT authentication for admin panel

**Testing:**

- Jest + React Testing Library
- Coverage threshold: 60%

### Project Structure

```
tandem/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   ├── admin/              # Admin panel pages
│   │   └── page.jsx            # Main game page
│   ├── components/             # React components
│   │   ├── game/               # Game-specific components
│   │   ├── admin/              # Admin panel components
│   │   └── shared/             # Shared/reusable components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Business logic & API clients
│   ├── lib/                    # Utilities & helpers
│   │   ├── security/           # Security utilities (CSRF, rate limiting)
│   │   ├── db.js               # Database operations
│   │   ├── auth.js             # Authentication logic
│   │   └── validation.js       # Input validation (Zod)
│   ├── contexts/               # React contexts
│   ├── data/                   # Static data & puzzle templates
│   └── styles/                 # Global CSS
├── ios/                        # iOS app (Capacitor)
│   └── App/
│       ├── App/                # iOS native code
│       └── Podfile             # CocoaPods dependencies
├── public/                     # Static assets
│   ├── puzzles/                # Puzzle JSON files
│   ├── images/                 # Images & icons
│   └── icons/                  # PWA icons
├── scripts/                    # Utility scripts
└── tests/                      # Test files

```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Xcode 14+ (for iOS development)
- CocoaPods (for iOS dependencies)
- Redis (local development) or Vercel KV (production)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd tandem
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:

   ```env
   # Database
   KV_REST_API_URL=your_redis_url
   KV_REST_API_TOKEN=your_redis_token

   # Admin Authentication
   JWT_SECRET=your_jwt_secret_key
   ADMIN_PASSWORD_HASH=your_bcrypt_hash

   # Optional: Analytics
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Generate admin credentials** (if needed)
   ```bash
   npm run hash-password
   npm run generate-jwt-secret
   ```

### Development

**Web Development:**

```bash
npm run dev
```

Visit `http://localhost:3000`

**iOS Development:**

```bash
# Build for iOS
npm run build:ios

# Sync with Capacitor
npm run cap:sync

# Open in Xcode
npm run cap:open

# Or run all at once
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
npm run ios:build
# Then build in Xcode for distribution
```

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once (CI)
npm run test:ci

# Generate coverage report
npm run test:coverage
```

## 📝 Code Quality

**Linting:**

```bash
npm run lint
npm run lint:fix
```

**Formatting:**

```bash
npm run format
npm run format:check
```

**Pre-commit hooks:**
Husky is configured to run linting and formatting on staged files automatically.

## 🔒 Security Features

- **CSRF Protection:** Token-based protection for state-changing operations
- **Rate Limiting:** Prevents brute force attacks (5 attempts per 15 minutes)
- **Input Validation:** Zod schemas validate all user input
- **JWT Authentication:** Secure admin panel access
- **Security Headers:** Comprehensive security headers via middleware
- **Content Security Policy:** Strict CSP for admin routes

## 🎮 Game Logic

### Puzzle Structure

Each puzzle contains:

- **Theme:** Category or hint (e.g., "Kitchen Appliances")
- **4 Emoji-Word Pairs:** Emoji clues and corresponding answers
- **Date:** ISO date string (YYYY-MM-DD)

### Game Rules

- 4 mistakes allowed
- 1 hint available per puzzle
- Answers accept variations (plurals, alternate forms)
- Timer tracks solving time
- Statistics persist locally

### Puzzle Rotation

Puzzles rotate daily at midnight Eastern Time. The system:

1. Checks Redis/Vercel KV for custom puzzles
2. Falls back to local JSON files in `/public/puzzles/`
3. Uses template puzzles if no custom puzzle exists

## 📊 Admin Panel

Access at `/admin` (web only)

**Features:**

- View and edit puzzles
- Bulk import puzzles
- View statistics and analytics
- Manage themes
- Force puzzle rotation

**Authentication:**

```bash
# Generate admin password hash
npm run hash-password
# Add hash to .env.local as ADMIN_PASSWORD_HASH
```

## 📱 iOS-Specific Features

### Capabilities

- Haptic feedback on interactions
- Local notifications for daily puzzles
- Share functionality
- Status bar theming
- Keyboard handling
- Offline puzzle caching

### Configuration

- **Bundle ID:** `com.tandemdaily.app`
- **Min iOS Version:** 13.0
- **Entitlements:** CloudKit, iCloud, Push Notifications

## 🌐 API Endpoints

### Public API

- `GET /api/puzzles` - Get today's puzzle
- `POST /api/puzzles/batch` - Get multiple puzzles
- `GET /api/puzzles/paginated` - Paginated puzzle list
- `GET /api/stats` - Get global statistics
- `POST /api/stats` - Update statistics
- `GET /api/version` - Get API version

### Admin API (requires JWT)

- `POST /api/admin/auth` - Authenticate
- `GET /api/admin/puzzles` - List puzzles
- `POST /api/admin/puzzles` - Create puzzle
- `PUT /api/admin/puzzles` - Update puzzle
- `DELETE /api/admin/puzzles` - Delete puzzle
- `POST /api/admin/bulk-import` - Bulk import
- `POST /api/admin/rotate-puzzle` - Force rotation

**Rate Limits:**

- Auth: 5 requests/minute
- General: 30 requests/minute
- Write: 10 requests/minute

## 🚢 Deployment

### Vercel (Web)

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### App Store (iOS)

1. Build in Xcode (Product → Archive)
2. Validate app
3. Upload to App Store Connect
4. Submit for review

**Note:** Ensure `Info.plist` has proper privacy settings before submission.

## 🐛 Troubleshooting

**iOS build fails:**

- Clean build folder: `xcodebuild clean`
- Reinstall pods: `cd ios/App && pod deintegrate && pod install`
- Check Xcode version compatibility

**Database connection issues:**

- Verify Redis/KV credentials in `.env.local`
- Check Vercel KV dashboard for connection status
- Falls back to in-memory storage if Redis unavailable

**Puzzle not loading:**

- Check `/public/puzzles/` directory
- Verify date format (YYYY-MM-DD)
- Check browser console for errors

## 📄 License

[Add your license here]

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## 📞 Support

For issues or questions, please [create an issue](link-to-issues).

---

**Built with ❤️ for puzzle enthusiasts**
