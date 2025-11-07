# Daily Cryptic: Database-First Stats Architecture

## Overview

Refactored Daily Cryptic stats to follow mobile game best practices, matching Tandem Daily's proven pattern.

## Problem Fixed

- **Before:** Local storage was primary, database sync was optional → empty database tables
- **After:** Database is source of truth for authenticated users → proper cross-device sync

## Key Changes

### 1. Database-First Storage (src/lib/crypticStorage.js)

- `saveCrypticStats()`: Always syncs to database for authenticated users
- `loadCrypticStats()`: Database is source of truth, local is cache
- Matches Tandem Daily pattern exactly

### 2. Automatic Migration

- Client-side: `src/lib/migrations/crypticStatsMigration.js`
- Server-side: `scripts/backfill-cryptic-stats.js`
- Runs transparently on user sign-in
- Preserves existing local stats

### 3. AuthContext Integration (src/contexts/AuthContext.jsx)

- Triggers migration on SIGNED_IN event
- Loads stats from database
- Syncs to leaderboard

## Deployment Steps

1. Deploy code changes
2. Run migration script:
   ```bash
   node scripts/backfill-cryptic-stats.js
   ```
3. Users' local stats auto-sync to database on next sign-in

## Testing

```sql
-- Verify stats are syncing
SELECT * FROM user_cryptic_stats
WHERE user_id = '<your-user-id>';
```

## Architecture

**Authenticated Users:**

```
Play puzzle → Save to database → Update local cache
              ↓
        Source of truth ✅
```

**Unauthenticated Users:**

```
Play puzzle → Save to local storage
              ↓
        Source of truth ✅
```

## Benefits

✅ Stats persist across devices
✅ Database tables populate properly  
✅ Leaderboard sync works correctly
✅ Follows mobile game best practices
✅ No data loss during migration
