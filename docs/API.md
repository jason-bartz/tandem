# Tandem API Documentation

Complete API reference for Tandem Daily's REST endpoints.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Public Endpoints](#public-endpoints)
  - [Daily Tandem](#daily-tandem)
  - [Daily Mini](#daily-mini)
  - [Reel Connections](#reel-connections)
  - [Leaderboards](#leaderboards)
  - [Statistics](#statistics)
  - [Miscellaneous](#miscellaneous)
- [Authenticated Endpoints](#authenticated-endpoints)
  - [User Stats](#user-stats)
  - [Achievements](#achievements)
  - [Account Management](#account-management)
  - [Subscriptions](#subscriptions)
  - [Feedback](#feedback)
- [Admin Endpoints](#admin-endpoints)
  - [Authentication](#admin-authentication)
  - [Tandem Puzzles](#tandem-puzzle-management)
  - [Mini Puzzles](#mini-puzzle-management)
  - [Reel Connections Puzzles](#reel-connections-puzzle-management)
  - [AI Generation](#ai-generation)
  - [Feedback Management](#feedback-management)
  - [Submissions](#submissions-management)
- [Error Handling](#error-handling)

---

## Base URL

| Platform    | Base URL                      |
| ----------- | ----------------------------- |
| Web         | Relative URLs (same origin)   |
| iOS         | `https://www.tandemdaily.com` |
| Development | `http://localhost:3000`       |

---

## Authentication

### Authentication Methods

Tandem supports two authentication methods:

#### 1. Cookie-Based (Web)

Session cookies are automatically managed via Supabase Auth. Used for web browser clients.

#### 2. Bearer Token (iOS/Native)

For native apps, include the Supabase access token in the Authorization header:

```http
Authorization: Bearer <supabase_access_token>
```

### Admin Authentication

Admin endpoints require a separate JWT token:

```http
Authorization: Bearer <admin_jwt_token>
```

See [Admin Authentication](#admin-authentication) for obtaining admin tokens.

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint Type           | Limit       | Window   |
| ----------------------- | ----------- | -------- |
| Auth                    | 5 requests  | 1 minute |
| General (GET)           | 30 requests | 1 minute |
| Write (POST/PUT/DELETE) | 10 requests | 1 minute |
| AI Generation           | 30 requests | 1 hour   |

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
Retry-After: 60
```

**Rate Limit Response (429):**

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

---

## Public Endpoints

### Daily Tandem

#### Get Today's Puzzle

```http
GET /api/puzzle
```

**Query Parameters:**

| Parameter | Type   | Description                                   |
| --------- | ------ | --------------------------------------------- |
| `date`    | string | ISO date (YYYY-MM-DD). Defaults to today (ET) |
| `number`  | number | Puzzle number                                 |

**Response (200):**

```json
{
  "success": true,
  "date": "2025-10-03",
  "puzzle": {
    "theme": "Kitchen Appliances",
    "puzzles": [
      { "emoji": "🍞", "answer": "TOASTER" },
      { "emoji": "❄️", "answer": "REFRIGERATOR" },
      { "emoji": "🔥", "answer": "STOVE" },
      { "emoji": "🌀", "answer": "BLENDER" }
    ],
    "puzzleNumber": 246
  }
}
```

#### Get Archive Puzzles

```http
GET /api/puzzles/archive
```

**Query Parameters:**

| Parameter   | Type   | Description             |
| ----------- | ------ | ----------------------- |
| `start`     | number | Start puzzle number     |
| `end`       | number | End puzzle number       |
| `startDate` | string | Start date (ISO format) |
| `endDate`   | string | End date (ISO format)   |

**Response:** Array of puzzles sorted newest first. Supports ETag caching (304 responses).

#### Get Batch Puzzles

```http
POST /api/puzzles/batch
```

**Request Body:**

```json
{
  "dates": ["2025-10-01", "2025-10-02", "2025-10-03"]
}
```

**Validation:** Maximum 100 dates per request.

**Response (200):**

```json
{
  "puzzles": {
    "2025-10-01": {
      /* puzzle object */
    },
    "2025-10-02": {
      /* puzzle object */
    },
    "2025-10-03": {
      /* puzzle object */
    }
  }
}
```

#### Get Paginated Puzzles

```http
GET /api/puzzles/paginated
```

**Query Parameters:**

| Parameter | Type   | Default | Description             |
| --------- | ------ | ------- | ----------------------- |
| `cursor`  | string | -       | Pagination cursor       |
| `limit`   | number | 20      | Items per page (max 50) |

**Response (200):**

```json
{
  "puzzles": [
    /* puzzle objects */
  ],
  "nextCursor": "2025-09-15",
  "hasMore": true
}
```

---

### Daily Mini

#### Get Mini Puzzle

```http
GET /api/mini/puzzle
```

**Query Parameters:**

| Parameter   | Type   | Description               |
| ----------- | ------ | ------------------------- |
| `date`      | string | ISO date (YYYY-MM-DD)     |
| `startDate` | string | Range start (for archive) |
| `endDate`   | string | Range end (for archive)   |

**Response (200):**

```json
{
  "id": "mini_123",
  "date": "2025-10-03",
  "puzzleNumber": 42,
  "grid": [
    ["C", "A", "T", "C", "H"],
    ["A", "R", "E", "N", "A"],
    ["R", "I", "D", "E", "S"],
    ["D", "O", "N", "E", "R"],
    ["S", "L", "E", "P", "T"]
  ],
  "clues": {
    "across": [{ "number": 1, "clue": "Seize or grab", "answer": "CATCH", "row": 0, "col": 0 }],
    "down": [{ "number": 1, "clue": "Playing cards", "answer": "CARDS", "row": 0, "col": 0 }]
  }
}
```

**Note:** Solution is never returned to the client for validation purposes.

#### Validate Mini Solution

```http
POST /api/mini/puzzle
```

**Request Body:**

```json
{
  "date": "2025-10-03",
  "grid": [
    ["C", "A", "T", "C", "H"],
    ["A", "R", "E", "N", "A"],
    ["R", "I", "D", "E", "S"],
    ["D", "O", "N", "E", "R"],
    ["S", "L", "E", "P", "T"]
  ]
}
```

**Response (200):**

```json
{
  "correct": true,
  "message": "Congratulations!"
}
```

---

### Reel Connections

#### Get Today's Puzzle

```http
GET /api/reel-connections/puzzle
```

**Query Parameters:**

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `date`    | string | ISO date (optional) |

**Response (200):**

```json
{
  "id": "reel_123",
  "date": "2025-10-03",
  "puzzleNumber": 15,
  "groups": [
    {
      "connection": "Movies with colors in the title",
      "difficulty": "yellow",
      "movies": [
        { "title": "The Green Mile", "year": 1999, "imdbId": "tt0120689", "poster": "https://..." }
      ]
    }
  ]
}
```

#### Get Archive

```http
GET /api/reel-connections/archive
```

**Query Parameters:**

| Parameter   | Type   | Description             |
| ----------- | ------ | ----------------------- |
| `startDate` | string | Start date (ISO format) |
| `endDate`   | string | End date (ISO format)   |

---

### Leaderboards

#### Get Daily Leaderboard

```http
GET /api/leaderboard/daily
```

**Query Parameters:**

| Parameter | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| `date`    | string | Date (YYYY-MM-DD)                      |
| `game`    | string | `tandem`, `cryptic`, `mini`, or `reel` |

**Response (200):**

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "speedster123",
      "score": 45,
      "avatar": "avatar_cat"
    }
  ],
  "userRank": 15,
  "userScore": 120
}
```

#### Submit Score

```http
POST /api/leaderboard/daily
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "game": "tandem",
  "date": "2025-10-03",
  "score": 85
}
```

**Validation:** Score must be 1-7200 (seconds).

#### Get Streak Leaderboard

```http
GET /api/leaderboard/streak
```

**Query Parameters:**

| Parameter | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| `game`    | string | `tandem`, `cryptic`, `mini`, or `reel` |

#### Submit Streak

```http
POST /api/leaderboard/streak
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "game": "tandem",
  "streak": 42
}
```

**Validation:** Streak must be 1-10000.

#### Leaderboard Preferences

```http
GET /api/leaderboard/preferences
POST /api/leaderboard/preferences
```

**Auth Required:** Yes

**Request Body (POST):**

```json
{
  "enabled": true,
  "show_on_global": true
}
```

---

### Statistics

#### Get Global Statistics

```http
GET /api/stats
```

**Query Parameters:**

| Parameter | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| `type`    | string | `puzzle`, `popular`, or `activity` |
| `date`    | string | Date for puzzle stats              |
| `days`    | number | Days for activity stats            |

**Response (200):**

```json
{
  "overall": {
    "played": 15234,
    "completed": 12456,
    "completionRate": 0.82,
    "averageTime": 145,
    "perfectGames": 3421
  },
  "popular": [
    /* top puzzles */
  ],
  "activity": [
    /* daily counts */
  ]
}
```

---

### Miscellaneous

#### Get Version

```http
GET /api/version
```

**Response (200):**

```json
{
  "version": "2.0.0",
  "features": ["mini", "reel-connections", "achievements"],
  "endpoints": {
    "puzzle": "/api/puzzle",
    "mini": "/api/mini/puzzle",
    "reel": "/api/reel-connections/puzzle"
  }
}
```

#### Get Horoscope

```http
GET /api/horoscope
```

**Query Parameters:**

| Parameter  | Type   | Description                 |
| ---------- | ------ | --------------------------- |
| `sign`     | string | Zodiac sign (e.g., "aries") |
| `timezone` | string | IANA timezone (optional)    |

**Response:** Date-seeded deterministic horoscope. Cached for 1 hour.

---

## Authenticated Endpoints

### User Stats

#### Get/Update Tandem Stats

```http
GET /api/user-stats
POST /api/user-stats
```

**Auth Required:** Yes (Bearer or Cookie)

**Request Body (POST):**

```json
{
  "gamesPlayed": 42,
  "gamesWon": 38,
  "currentStreak": 15,
  "maxStreak": 23,
  "lastPlayedDate": "2025-10-03"
}
```

**Merge Strategy:** Uses maximum values for streaks and totals.

#### Get/Update Mini Stats

```http
GET /api/user-mini-stats
POST /api/user-mini-stats
```

**Auth Required:** Yes

**Request Body (POST):**

```json
{
  "completionCount": 25,
  "currentStreak": 10,
  "maxStreak": 18,
  "totalTimeSeconds": 3600,
  "bestTimeSeconds": 45,
  "perfectSolves": 12,
  "totalChecks": 5,
  "totalReveals": 2
}
```

#### Get/Save Mini Puzzle Stats

```http
GET /api/mini/stats?date=2025-10-03
POST /api/mini/stats
```

**Auth Required:** Yes

**Request Body (POST):**

```json
{
  "date": "2025-10-03",
  "time": 85,
  "checks": 0,
  "reveals": 0,
  "mistakes": 1,
  "perfect": true
}
```

#### Get/Update Reel Connections Stats

```http
GET /api/user-reel-stats
POST /api/user-reel-stats
```

**Auth Required:** Yes (Cookie-based)

**Request Body (POST):**

```json
{
  "gamesPlayed": 15,
  "gamesWon": 12,
  "currentStreak": 5,
  "maxStreak": 8,
  "totalTimeSeconds": 1800,
  "gameHistory": ["2025-10-01", "2025-10-02"]
}
```

---

### Achievements

#### Get/Sync Achievements

```http
GET /api/user-achievements
POST /api/user-achievements
```

**Auth Required:** Yes (Cookie-based)

**Request Body (POST):**

```json
{
  "achievements": ["com.tandemdaily.app.first_win", "com.tandemdaily.app.streak_7"]
}
```

**Strategy:** Upserts with duplicate prevention.

---

### Account Management

#### Get/Update Username

```http
GET /api/account/username
POST /api/account/username
```

**Auth Required:** Yes

**Request Body (POST):**

```json
{
  "username": "player123"
}
```

**Validation:**

- 3-20 characters
- Alphanumeric and underscore only
- Profanity filter applied
- Must be unique

#### Delete Account

```http
GET /api/account/delete
DELETE /api/account/delete
```

**Auth Required:** Yes

**Request Body (DELETE - Web):**

```json
{
  "confirmation": "DELETE"
}
```

**Features:**

- App Store compliance
- Apple Sign-In token revocation
- Subscription warning before deletion

---

### Subscriptions

#### Check Subscription Status

```http
GET /api/subscription/status
```

**Auth Required:** Yes

**Response (200):**

```json
{
  "isActive": true,
  "tier": "bestfriends",
  "expiryDate": "2026-01-15T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

#### Link iOS IAP

```http
POST /api/iap/link-to-user
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "originalTransactionId": "1000000123456789",
  "productId": "com.tandemdaily.bestfriends.monthly",
  "expiryDate": "2026-01-15T00:00:00Z"
}
```

#### Validate Apple Receipt

```http
POST /api/iap/validate-receipt
```

**Request Body:**

```json
{
  "receiptData": "base64_encoded_receipt"
}
```

**Response:** Subscription info, trial status, renewal status.

#### Create Stripe Checkout

```http
POST /api/stripe/create-checkout-session
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "tier": "bestfriends"
}
```

**Tiers:** `buddypass`, `bestfriends`, `soulmates`

**Response (200):**

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### Create Stripe Portal

```http
POST /api/stripe/create-portal-session
```

**Auth Required:** Yes

**Response:** Returns portal URL for subscription management.

---

### Feedback

#### Submit Feedback

```http
POST /api/feedback
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "category": "bug",
  "message": "The app crashes when...",
  "allowContact": true
}
```

**Categories:** `bug`, `feature`, `other`

**Features:**

- Email notification sent (async)
- Rate limited
- Platform detection

---

## Admin Endpoints

All admin endpoints require JWT authentication.

### Admin Authentication

#### Login

```http
POST /api/admin/auth
```

**Request Body:**

```json
{
  "username": "admin",
  "password": "admin_password"
}
```

**Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

**Security:**

- Rate limited
- Lockout after 5 failed attempts
- CSRF token included

#### Verify Token

```http
GET /api/admin/auth
Authorization: Bearer <token>
```

---

### Tandem Puzzle Management

#### List Puzzles

```http
GET /api/admin/puzzles?start=2025-10-01&end=2025-10-31
Authorization: Bearer <token>
```

#### Create Puzzle

```http
POST /api/admin/puzzles
Authorization: Bearer <token>

{
  "date": "2025-10-15",
  "theme": "Jungle Animals",
  "puzzles": [
    { "emoji": "🦁", "answer": "LION" },
    { "emoji": "🐘", "answer": "ELEPHANT" },
    { "emoji": "🦒", "answer": "GIRAFFE" },
    { "emoji": "🐒", "answer": "MONKEY" }
  ]
}
```

#### Update Puzzle

```http
PATCH /api/admin/puzzles
Authorization: Bearer <token>
```

#### Delete Puzzle

```http
DELETE /api/admin/puzzles?date=2025-10-15
Authorization: Bearer <token>
```

#### Bulk Import

```http
POST /api/admin/bulk-import
Authorization: Bearer <token>

{
  "puzzles": [ /* up to 365 puzzles */ ],
  "overwrite": false
}
```

#### Export Puzzles

```http
GET /api/admin/puzzles/export?format=json
Authorization: Bearer <token>
```

**Formats:** `json`, `migrate`

#### Get Themes

```http
GET /api/admin/themes
Authorization: Bearer <token>
```

**Response:** Theme analysis with duplicates and date ranges.

---

### Mini Puzzle Management

#### List Mini Puzzles

```http
GET /api/admin/mini/puzzles?startDate=2025-10-01&endDate=2025-10-31
Authorization: Bearer <token>
```

#### Create/Update Mini Puzzle

```http
POST /api/admin/mini/puzzles
PUT /api/admin/mini/puzzles
Authorization: Bearer <token>

{
  "date": "2025-10-15",
  "grid": [ /* 5x5 grid */ ],
  "solution": [ /* 5x5 solution */ ],
  "clues": {
    "across": [ /* clue objects */ ],
    "down": [ /* clue objects */ ]
  }
}
```

#### Delete Mini Puzzle

```http
DELETE /api/admin/mini/puzzles?date=2025-10-15
Authorization: Bearer <token>
```

#### Get Word List

```http
GET /api/admin/mini/wordlist?length=5
Authorization: Bearer <token>
```

#### Get Word Frequencies

```http
GET /api/admin/mini/word-frequencies?length=5&threshold=50
```

**Note:** Public endpoint, cached 24 hours.

---

### Reel Connections Puzzle Management

#### List Puzzles

```http
GET /api/admin/reel-connections/puzzles?startDate=2025-10-01&endDate=2025-10-31
Authorization: Bearer <token>
```

#### Create/Update Puzzle

```http
POST /api/admin/reel-connections/puzzles
PUT /api/admin/reel-connections/puzzles
Authorization: Bearer <token>

{
  "date": "2025-10-15",
  "groups": [
    {
      "connection": "Movies directed by Christopher Nolan",
      "difficulty": "yellow",
      "movies": [
        { "imdbId": "tt0468569", "title": "The Dark Knight", "year": 2008, "poster": "https://..." }
      ]
    }
  ]
}
```

#### Delete Puzzle

```http
DELETE /api/admin/reel-connections/puzzles?date=2025-10-15
Authorization: Bearer <token>
```

#### Search Movies

```http
GET /api/admin/reel-connections/search?query=inception
Authorization: Bearer <token>
```

**Features:** Smart year parsing, fallback poster images.

---

### AI Generation

#### Generate Tandem Puzzle

```http
POST /api/admin/generate-puzzle
Authorization: Bearer <token>

{
  "date": "2025-10-15",
  "excludeThemes": ["Kitchen", "Weather"],
  "hintLevel": "medium"
}
```

**Rate Limit:** 30 per hour

**Features:** Analyzes past/future puzzles for variety.

#### Generate Mini Puzzle

```http
POST /api/admin/mini/generate
Authorization: Bearer <token>

{
  "mode": "scratch",
  "symmetry": true,
  "maxRetries": 100,
  "minFrequency": 30
}
```

**Modes:** `scratch`, `fill`

**Features:**

- Two-level heuristic algorithm
- Trie-based word selection
- AI clue generation via Claude
- Word deduplication

**Response:**

```json
{
  "grid": [ /* 5x5 */ ],
  "solution": [ /* 5x5 */ ],
  "words": ["CATCH", "ARENA", ...],
  "clueNumbers": { /* positions */ },
  "stats": {
    "attempts": 15,
    "avgFrequency": 68
  }
}
```

#### Generate Reel Connections Movies

```http
POST /api/admin/reel-connections/generate
Authorization: Bearer <token>

{
  "connection": "Movies featuring time travel",
  "difficulty": "purple"
}
```

**Features:**

- OMDb verification
- Poster validation
- 206 partial response if some movies fail

#### Generate Hints

```http
POST /api/admin/generate-hints
Authorization: Bearer <token>

{
  "date": "2025-10-15",
  "theme": "Kitchen Appliances",
  "puzzles": [
    { "emoji": "🍞", "answer": "TOASTER" }
  ]
}
```

#### Assess Difficulty

```http
POST /api/admin/assess-difficulty
Authorization: Bearer <token>

{
  "theme": "Kitchen Appliances",
  "puzzles": [ /* 4 emoji-answer pairs */ ]
}
```

---

### Feedback Management

#### List Feedback

```http
GET /api/admin/feedback?status=new&page=1&limit=20
Authorization: Bearer <token>
```

**Statuses:** `new`, `acknowledged`, `in_progress`, `resolved`

#### Update Feedback

```http
PATCH /api/admin/feedback
Authorization: Bearer <token>

{
  "id": "feedback_123",
  "status": "resolved",
  "adminComment": "Fixed in v2.1.0"
}
```

---

### Submissions Management

#### List Submissions

```http
GET /api/admin/puzzle-submissions?status=pending&limit=20
Authorization: Bearer <token>
```

**Statuses:** `pending`, `approved`, `needs_edit`, `archived`

#### Update Submission

```http
PATCH /api/admin/puzzle-submissions
Authorization: Bearer <token>

{
  "id": "submission_123",
  "status": "approved",
  "adminNotes": "Great puzzle!"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": {
    /* optional */
  }
}
```

### Status Codes

| Code | Meaning               | Description                         |
| ---- | --------------------- | ----------------------------------- |
| 200  | OK                    | Request succeeded                   |
| 206  | Partial Content       | Partial success (some items failed) |
| 304  | Not Modified          | Resource unchanged (ETag match)     |
| 400  | Bad Request           | Invalid input data                  |
| 401  | Unauthorized          | Missing or invalid authentication   |
| 403  | Forbidden             | Insufficient permissions            |
| 404  | Not Found             | Resource not found                  |
| 409  | Conflict              | Resource already exists             |
| 429  | Too Many Requests     | Rate limit exceeded                 |
| 500  | Internal Server Error | Server error                        |
| 503  | Service Unavailable   | External service down               |

### Common Error Scenarios

**Invalid Input:**

```json
{
  "error": "Validation Error",
  "message": "Invalid date format",
  "details": {
    "field": "date",
    "expected": "YYYY-MM-DD"
  }
}
```

**Rate Limited:**

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

**Authentication Failed:**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

---

## Webhook Events (Stripe)

The `/api/stripe/webhook` endpoint handles:

| Event                           | Description                |
| ------------------------------- | -------------------------- |
| `checkout.session.completed`    | Create new subscription    |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Cancel subscription        |
| `invoice.payment_succeeded`     | Log successful payment     |
| `invoice.payment_failed`        | Mark as past_due           |

---

## Best Practices

### Caching

- Puzzle endpoints support ETag headers (use `If-None-Match`)
- Cache puzzle responses until midnight ET
- Version endpoint cached for 1 hour

### Error Handling

- Implement exponential backoff for 429 responses
- Handle network failures gracefully (offline mode)
- Re-authenticate on 401 responses

### Performance

- Use batch endpoints when fetching multiple puzzles
- Debounce statistics updates
- Preload next day's puzzle before midnight

---

## Platform-Specific Notes

### iOS (Capacitor)

- Use Bearer token authentication (from Supabase access token)
- Handle 401 by refreshing Supabase session
- IAP validation uses Apple's production/sandbox endpoints

### Web (PWA)

- Cookie-based authentication (automatic)
- CORS headers set for same-origin
- Service worker caches puzzle data

---

For questions or issues, contact support@goodvibesgames.com or visit [www.tandemdaily.com/support](https://www.tandemdaily.com/support).
