# User Stats Database Sync Setup

This document explains the new cross-device stats synchronization feature and how to set it up.

## Overview

Previously, game stats (games played, wins, streaks) were stored only in local storage, meaning:

- Each browser/device had its own stats
- Signing in on a new device showed 0 stats
- Stats didn't sync across devices

**Now**, authenticated users have their stats synced to the database and merged across all devices!

## How It Works

### For Authenticated Users:

1. **On Load**: Stats are fetched from the database and merged with local stats (taking max values)
2. **On Save**: Stats are saved to both local storage AND the database
3. **Sync Priority**: Database stats with the most recent `lastStreakDate` take precedence for current streak

### For Unauthenticated Users:

- Stats remain in local storage only (no change from previous behavior)
- Stats are not synced across devices

### iOS Users:

- Database sync works alongside existing iCloud/CloudKit sync
- Both systems merge stats taking max values

## Setup Instructions

### 1. Run the Database Migration

You need to create the `user_stats` table in your Supabase database.

#### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd /Users/jasonbartz/Documents/Development\ Projects/Tandem

# Apply the migration
npx supabase db push

# Or if using local development
npx supabase migration up
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_user_stats_table.sql`
4. Run the query

### 2. Verify the Migration

After running the migration, verify the table was created:

```sql
-- In Supabase SQL Editor
SELECT * FROM user_stats LIMIT 1;
```

You should see the table structure with columns:

- `user_id` (UUID, PRIMARY KEY)
- `played` (INTEGER)
- `wins` (INTEGER)
- `current_streak` (INTEGER)
- `best_streak` (INTEGER)
- `last_streak_date` (DATE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 3. Deploy the Code

The following files have been updated/created:

- ✅ `src/app/api/user-stats/route.js` - New API endpoint
- ✅ `src/lib/constants.js` - Added USER_STATS endpoint
- ✅ `src/lib/storage.js` - Added database sync logic
- ✅ `supabase/migrations/001_user_stats_table.sql` - Database migration

Deploy these changes to your production environment.

## Testing the Sync

### Test Scenario 1: Same User, Different Browsers

1. **Browser 1 (e.g., Chrome)**:
   - Sign in with your test account
   - Play some games to build up stats (e.g., 5 games, 4 wins, 2 streak)
   - Note the stats displayed

2. **Browser 2 (e.g., Firefox)**:
   - Sign in with the SAME account
   - Stats should automatically show the same values from Browser 1!
   - Play another game
   - Stats should update

3. **Back to Browser 1**:
   - Refresh the page
   - Stats should now include the game played in Browser 2

### Test Scenario 2: Mobile and Desktop

1. **Desktop Browser**:
   - Sign in and play some games
   - Note your stats (e.g., 10 games played)

2. **iPhone/Android App**:
   - Sign in with the same account
   - Stats should match desktop!
   - The app will also sync with iCloud (iOS) in addition to database

### Test Scenario 3: Merge Behavior

1. **Desktop**:
   - Play 20 games, win 15, streak of 3

2. **Phone** (before signing in):
   - Play 5 games offline, win 5, streak of 2

3. **Phone** (sign in):
   - Stats should merge: 25 games played, 20 wins, streak of 3 (most recent)

## Monitoring Sync

Check browser console logs for sync status:

```
[storage.loadStats] Database stats fetched: {played: 20, wins: 15, ...}
[storage.loadStats] Merged stats (local + database): {played: 25, wins: 20, ...}
[storage.saveStats] Stats synced to database: {played: 26, wins: 21, ...}
```

## API Endpoints

### GET /api/user-stats

Returns authenticated user's stats from database.

**Response:**

```json
{
  "stats": {
    "played": 20,
    "wins": 15,
    "currentStreak": 3,
    "bestStreak": 5,
    "lastStreakDate": "2025-11-05"
  }
}
```

### POST /api/user-stats

Saves/merges user stats to database.

**Request:**

```json
{
  "played": 20,
  "wins": 15,
  "currentStreak": 3,
  "bestStreak": 5,
  "lastStreakDate": "2025-11-05"
}
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "played": 20,
    "wins": 15,
    "currentStreak": 3,
    "bestStreak": 5,
    "lastStreakDate": "2025-11-05"
  }
}
```

## Security

- Row Level Security (RLS) is enabled on the `user_stats` table
- Users can only read/write their own stats (enforced by `auth.uid()`)
- API endpoints verify authentication via Supabase session cookies
- Unauthenticated requests return 401 Unauthorized

## Troubleshooting

### Stats Not Syncing

1. Check browser console for errors
2. Verify user is signed in: Check for session in Supabase
3. Check network tab: Look for calls to `/api/user-stats`
4. Verify RLS policies: Ensure policies are created in Supabase

### Stats Reset to 0

If stats are showing as 0 after signing in:

1. Check if the user exists in `user_stats` table
2. The first time a user signs in, they won't have database stats yet
3. Play a game to trigger the first sync

### Different Stats on Different Devices

If you see different stats after signing in:

1. Check browser console logs for merge behavior
2. The system should take MAX values for played/wins/bestStreak
3. Current streak uses the most recent `lastStreakDate`
4. Try manually refreshing both devices

## Migration Rollback

If you need to rollback the migration:

```sql
-- Remove the table and all policies
DROP TABLE IF EXISTS user_stats CASCADE;
```

Then redeploy without the updated files.
