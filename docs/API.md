# Tandem API Documentation

Complete API reference for Tandem's REST endpoints.

## Base URL

- **Web:** Relative URLs (same origin)
- **iOS:** `https://tandemdaily.com` or configured `NEXT_PUBLIC_API_URL`

## Authentication

### Public Endpoints

Public endpoints do not require authentication. These include:

- Puzzle retrieval
- Statistics viewing

### Admin Endpoints

Admin endpoints require JWT authentication via `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

**Get Admin Token:**

```http
POST /api/admin/auth
Content-Type: application/json

{
  "password": "admin_password"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint Type           | Limit       | Window   |
| ----------------------- | ----------- | -------- |
| Auth                    | 5 requests  | 1 minute |
| General (GET)           | 30 requests | 1 minute |
| Write (POST/PUT/DELETE) | 10 requests | 1 minute |

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
Retry-After: 60 (seconds, when rate limited)
```

**Rate Limit Response (429):**

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

## Security

### CSRF Protection

All state-changing requests (POST, PUT, DELETE) require CSRF tokens for web clients:

```http
X-CSRF-Token: <csrf_token>
```

### Headers

All requests should include:

```http
Content-Type: application/json
```

---

## Public Endpoints

### Get Today's Puzzle

Retrieve the current day's puzzle (midnight Eastern Time rotation).

```http
GET /api/puzzles
```

**Query Parameters:**

- `date` (optional): ISO date string (YYYY-MM-DD). Defaults to today (ET).

**Response (200):**

```json
{
  "success": true,
  "date": "2025-10-03",
  "puzzle": {
    "theme": "Kitchen Appliances",
    "puzzles": [
      {
        "emoji": "🍞",
        "answer": "TOASTER"
      },
      {
        "emoji": "❄️",
        "answer": "REFRIGERATOR"
      },
      {
        "emoji": "🔥",
        "answer": "STOVE"
      },
      {
        "emoji": "🌀",
        "answer": "BLENDER"
      }
    ],
    "puzzleNumber": 246
  }
}
```

**Error Responses:**

- `404`: Puzzle not found for the specified date
- `500`: Server error

---

### Get Batch Puzzles

Retrieve multiple puzzles in a single request.

```http
POST /api/puzzles/batch
Content-Type: application/json

{
  "dates": ["2025-10-01", "2025-10-02", "2025-10-03"]
}
```

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

**Validation:**

- Maximum 30 dates per request
- Dates must be in YYYY-MM-DD format

---

### Get Paginated Puzzles

Retrieve puzzles with pagination for archive view.

```http
GET /api/puzzles/paginated?page=1&limit=20
```

**Query Parameters:**

- `page` (optional): Page number (1-indexed). Default: 1
- `limit` (optional): Puzzles per page (max 100). Default: 20

**Response (200):**

```json
{
  "puzzles": [
    {
      "date": "2025-10-03",
      "theme": "Kitchen Appliances",
      "puzzles": [
        /* ... */
      ],
      "puzzleNumber": 246
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 12,
    "totalPuzzles": 240,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### Get Statistics

Retrieve global game statistics.

```http
GET /api/stats
```

**Response (200):**

```json
{
  "views": 15234,
  "played": 8456,
  "completed": 6789,
  "uniquePlayers": 3421,
  "totalTime": 1234567,
  "perfectGames": 456,
  "hintsUsed": 1234,
  "gamesShared": 890
}
```

---

### Update Statistics

Update statistics after game completion (client-side tracking).

```http
POST /api/stats
Content-Type: application/json

{
  "completed": true,
  "mistakes": 2,
  "solved": 4,
  "hintsUsed": 0,
  "time": 125,
  "puzzleDate": "2025-10-03"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Statistics updated successfully"
}
```

---

### Check Version

Check API version and compatibility (used by iOS app).

```http
GET /api/version
```

**Response (200):**

```json
{
  "version": "1.0.0",
  "buildNumber": "42",
  "minSupportedVersion": "1.0.0",
  "updateAvailable": false,
  "updateRequired": false
}
```

---

## Admin Endpoints

All admin endpoints require authentication. Include JWT token in `Authorization` header.

### Authenticate Admin

```http
POST /api/admin/auth
Content-Type: application/json

{
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

**Error Responses:**

- `401`: Invalid password
- `429`: Too many attempts (account locked)

---

### List Puzzles

Get puzzles for a date range (admin panel).

```http
GET /api/admin/puzzles?start=2025-10-01&end=2025-10-31
Authorization: Bearer <token>
```

**Query Parameters:**

- `start` (optional): Start date (ISO format)
- `end` (optional): End date (ISO format)

**Response (200):**

```json
{
  "puzzles": [
    {
      "id": "puzzle_123",
      "date": "2025-10-03",
      "theme": "Kitchen Appliances",
      "puzzles": [
        /* ... */
      ],
      "createdAt": "2025-09-15T12:00:00Z",
      "updatedAt": "2025-09-15T12:00:00Z"
    }
  ]
}
```

---

### Create/Update Puzzle

Create a new puzzle or update an existing one.

**Create:**

```http
POST /api/admin/puzzles
Authorization: Bearer <token>
Content-Type: application/json

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

**Update:**

```http
PUT /api/admin/puzzles
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "puzzle_123",
  "date": "2025-10-15",
  "theme": "Jungle Animals",
  "puzzles": [/* ... */]
}
```

**Validation:**

- `theme`: 1-100 characters
- `puzzles`: Must be exactly 4 items
- Each puzzle must have `emoji` (1-20 chars) and `answer` (1-50 chars)
- `date`: Must be valid ISO date (YYYY-MM-DD)

**Response (200):**

```json
{
  "success": true,
  "puzzle": {
    "id": "puzzle_123",
    "date": "2025-10-15",
    "theme": "Jungle Animals",
    "puzzles": [
      /* ... */
    ]
  }
}
```

**Error Responses:**

- `400`: Validation error
- `401`: Unauthorized
- `409`: Puzzle already exists for this date (use PUT to update)

---

### Delete Puzzle

Delete a puzzle by ID.

```http
DELETE /api/admin/puzzles?id=puzzle_123
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Puzzle deleted successfully"
}
```

**Error Responses:**

- `400`: Missing puzzle ID
- `401`: Unauthorized
- `404`: Puzzle not found

---

### Bulk Import Puzzles

Import multiple puzzles at once (max 100 per request).

```http
POST /api/admin/bulk-import
Authorization: Bearer <token>
Content-Type: application/json

{
  "puzzles": [
    {
      "date": "2025-10-15",
      "theme": "Jungle Animals",
      "puzzles": [/* 4 emoji-answer pairs */]
    },
    {
      "date": "2025-10-16",
      "theme": "Weather",
      "puzzles": [/* 4 emoji-answer pairs */]
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "imported": 25,
  "failed": 2,
  "errors": [
    {
      "date": "2025-10-20",
      "error": "Puzzle already exists"
    },
    {
      "date": "2025-10-25",
      "error": "Invalid emoji"
    }
  ]
}
```

---

### Force Puzzle Rotation

Manually trigger puzzle rotation (for testing).

```http
POST /api/admin/rotate-puzzle
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Puzzle rotation triggered",
  "newPuzzleDate": "2025-10-03"
}
```

---

### Get Themes

List all available puzzle themes.

```http
GET /api/admin/themes
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "themes": ["Kitchen Appliances", "Jungle Animals", "Weather", "Sports", "Transportation"]
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": {
    /* Optional additional info */
  }
}
```

### Common Status Codes

| Code | Meaning               | Description                                        |
| ---- | --------------------- | -------------------------------------------------- |
| 200  | OK                    | Request succeeded                                  |
| 400  | Bad Request           | Invalid input data                                 |
| 401  | Unauthorized          | Missing or invalid authentication                  |
| 403  | Forbidden             | CSRF validation failed or insufficient permissions |
| 404  | Not Found             | Resource not found                                 |
| 409  | Conflict              | Resource already exists                            |
| 429  | Too Many Requests     | Rate limit exceeded                                |
| 500  | Internal Server Error | Server error                                       |

---

## Best Practices

### Caching

- Cache puzzle responses for 24 hours (until midnight ET)
- Invalidate cache when puzzle is updated via admin API
- Use `ETag` headers when available

### Error Handling

Always handle these scenarios:

- Network failures (offline mode)
- Rate limiting (implement exponential backoff)
- Invalid authentication (prompt for re-login)
- Validation errors (display user-friendly messages)

### Performance

- Use batch endpoints when fetching multiple puzzles
- Implement request debouncing for statistics updates
- Preload next day's puzzle at 11:50 PM ET

---

## Webhook Events (Future)

_Coming soon: Webhook notifications for puzzle updates and events_

---

## SDK / Client Libraries

_Coming soon: Official JavaScript/TypeScript SDK_

---

For questions or issues, please contact support or create an issue in the repository.
