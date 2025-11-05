# Production Database Check

## Issue Summary
Your localhost is configured to use **production Supabase**, not a local instance.

Config in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://kzljqfonampglzyfzaai.supabase.co
```

This means:
- ✅ No need to run local Supabase
- ✅ No need to apply migrations locally
- ❌ Must be authenticated to production
- ❌ Leaderboard functions must exist in production database

## The 500 Error Cause

The API is returning 500 Internal Server Error on `/api/leaderboard/daily` POST, which suggests:

**Most Likely**: The database stored procedures don't exist in production:
- `submit_leaderboard_score()`
- `get_daily_leaderboard()`
- `get_user_daily_rank()`

**Less Likely**: Authentication issue (but you're already getting 401 on subscription, so this is consistent)

## Steps to Fix

### Step 1: Verify Migrations Are Applied to Production

Go to your Supabase Dashboard:
https://supabase.com/dashboard/project/kzljqfonampglzyfzaai/editor

Run this query to check if leaderboard tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leaderboard_entries', 'leaderboard_preferences');
```

**Expected Result**: Both tables should exist
**If Empty**: Migrations haven't been applied to production

### Step 2: Check if Stored Procedures Exist

Run this query:
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

**Expected Result**: All 4 functions should exist
**If Missing**: Need to run migration 007

### Step 3: Apply Migrations to Production (If Missing)

If tables/functions are missing, you have two options:

**Option A - Via Supabase CLI**:
```bash
# Make sure you're logged in to Supabase
npx supabase login

# Link to production project
npx supabase link --project-ref kzljqfonampglzyfzaai

# Push migrations to production
npx supabase db push
```

**Option B - Manual SQL (Safer for Production)**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/007_leaderboard_system.sql`
3. Paste and run in SQL Editor
4. Copy contents of `supabase/migrations/008_update_user_profile_trigger_for_username.sql`
5. Paste and run in SQL Editor

### Step 4: Sign In to Your App

After migrations are applied:
1. Open http://localhost:3000 in your browser
2. Click the account/auth button
3. Sign in with your credentials
4. Verify auth works by running in console:
```javascript
fetch('/api/subscription/status').then(r => r.json()).then(console.log)
```
Should return `{ isActive: false, ... }` (not 401)

### Step 5: Test Leaderboard Submission

1. Complete a Daily Cryptic or Tandem Daily puzzle
2. Check console for:
```
[useCrypticGame] Leaderboard submission check: { willSubmit: true }
[useCrypticGame] Submitting to leaderboard: { gameType: 'cryptic', ... }
[useCrypticGame] Leaderboard response: { success: true, entryId: '...' }
```

3. Open leaderboard modal to see your entry

---

## Alternative: Use Local Supabase Instead

If you want to avoid touching production during development:

### 1. Start Local Supabase
```bash
# Make sure Docker Desktop is running
npx supabase start
```

### 2. Update `.env.local`
Replace the Supabase section with local URLs:
```bash
# Supabase (Local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<key from supabase start output>
```

### 3. Apply Migrations
```bash
npx supabase db reset
```

### 4. Restart Dev Server
```bash
npm run dev
```

---

## Recommendation

**For quick testing**: Fix production database (Option A above)
- Faster
- No Docker setup needed
- Already configured

**For development**: Set up local Supabase (Alternative above)
- Safer for testing
- Won't affect production data
- Requires Docker

---

## Next Steps

1. Check production database for missing tables/functions (Step 1-2 above)
2. If missing, apply migrations to production (Step 3)
3. Sign in to your app (Step 4)
4. Test leaderboard submission (Step 5)

Let me know which approach you prefer and I can guide you through it.
