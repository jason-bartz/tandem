# Debug 500 Internal Server Error

## Current Issue
The leaderboard submission is returning 500 Internal Server Error, which means there's a problem on the server side (not authentication).

## What We Know
From the console logs:
```
[useCrypticGame] Leaderboard submission check: { willSubmit: '2025-11-05' }
[useCrypticGame] Submitting to leaderboard: { gameType: 'cryptic', score: 6, ... }
POST http://localhost:3000/api/leaderboard/daily 500 (Internal Server Error)
[useCrypticGame] Leaderboard response: {error: 'Internal server error'}
```

This means:
- ✅ The code is trying to submit
- ✅ The request is reaching the server
- ❌ Something is failing in the API route or database

## Most Likely Causes

### 1. Database Functions Don't Exist
The `submit_leaderboard_score()` function might not exist in production database.

### 2. Database Tables Don't Exist
The `leaderboard_entries` or `leaderboard_preferences` tables might not exist.

### 3. Migration Failed Partially
The constraint error you got suggests the migration was partially applied before.

## How to Debug

### Step 1: Check Your Terminal/Server Console
Look at the terminal where `npm run dev` is running. You should see error logs like:

```
[POST /api/leaderboard/daily] Error submitting score: <actual error message>
```

**Please copy and share the server console output** - it will show the exact database error.

### Step 2: Verify Migration in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/kzljqfonampglzyfzaai/editor

Run this query to check if tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leaderboard_entries', 'leaderboard_preferences');
```

**Expected**: Should return 2 rows
**If 0 or 1 rows**: Migration didn't apply correctly

### Step 3: Verify Functions Exist

Run this in SQL Editor:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'submit_leaderboard_score',
    'get_daily_leaderboard',
    'get_user_daily_rank',
    'get_streak_leaderboard'
  );
```

**Expected**: Should return 4 rows
**If fewer**: Functions are missing

### Step 4: Check for Specific Database Errors

Run this to see if there were any recent errors:
```sql
-- Try to call the function directly to see the error
SELECT submit_leaderboard_score(
  auth.uid(),
  'cryptic',
  'daily_speed',
  '2025-11-05',
  10,
  '{}'::jsonb
);
```

This will show the exact error message.

## Quick Fix: Re-apply Migration Safely

If the migration didn't apply correctly, try running APPLY_LEADERBOARD_MIGRATION.sql again.

**IMPORTANT**: Before running, check your terminal logs to see the actual error. This will save time!

## Need to See

To help you further, I need:
1. **Server console output** from your terminal running `npm run dev`
2. **Results from Step 2** (tables check)
3. **Results from Step 3** (functions check)

The server logs will show the exact database error that's causing the 500.
