# Leaderboard Debugging Guide for Localhost

## Problem: Leaderboards not updating on localhost

### Step 1: Verify Authentication

**The 401 error on `/api/subscription/status` in your console logs indicates you're NOT authenticated.**

1. Open browser DevTools → Console
2. Look for "401 Unauthorized" errors (you already have this)
3. To fix: **Click the account/sign-in button in your app** and authenticate
4. After signing in, verify by running in console:
```javascript
// Open DevTools Console and paste this:
fetch('/api/subscription/status').then(r => r.json()).then(console.log)
```

**Expected Result**: Should return `{ isActive: false, tier: null, ... }` (NOT a 401 error)
**If 401**: You're not logged in → Sign in via the app's auth modal first

---

### Step 2: Verify Database Migrations

1. Open Supabase Dashboard (http://localhost:54323 or your local URL)
2. Go to SQL Editor
3. Run this query:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('leaderboard_entries', 'leaderboard_preferences');
```

**Expected Result**: Should return both table names
**If Empty**: Migrations not applied → Run `supabase db reset` or `supabase migration up`

---

### Step 3: Check Leaderboard Preferences

1. In Supabase SQL Editor, run:
```sql
SELECT * FROM leaderboard_preferences WHERE user_id = 'YOUR_USER_ID';
```

**Expected Result**: `enabled = true`, `show_on_global = true`
**If No Row**: Trigger didn't fire → Manually insert:
```sql
INSERT INTO leaderboard_preferences (user_id, enabled, show_on_global)
VALUES ('YOUR_USER_ID', true, true);
```

---

### Step 4: Complete a Puzzle and Monitor Network

1. Open browser DevTools → Network tab
2. Filter by "leaderboard"
3. Play and complete a **Daily Tandem** or **Daily Cryptic** puzzle (NOT an archive puzzle)
4. Look for:
   - POST request to `/api/leaderboard/daily`
   - Status code 200 (success) or 4XX/5XX (error)

**Expected Request Body**:
```json
{
  "gameType": "tandem",
  "puzzleDate": "2025-11-05",
  "score": 123,
  "metadata": { "hintsUsed": 0, "mistakes": 2 }
}
```

**Common Failures**:
- **401 Unauthorized**: Not logged in (see Step 1)
- **403 Forbidden**: Leaderboard preferences disabled (see Step 3)
- **400 Bad Request**: Invalid data (check console for error details)
- **404 Not Found**: Database function missing (see Step 2)

---

### Step 5: Verify Submission in Database

1. After completing a puzzle, run in Supabase SQL Editor:
```sql
SELECT * FROM leaderboard_entries
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**: Should show your recent submission with:
- `game_type`: 'tandem' or 'cryptic'
- `leaderboard_type`: 'daily_speed'
- `puzzle_date`: '2025-11-05'
- `score`: Your completion time in seconds
- `metadata`: JSON with hints/mistakes/attempts

---

### Step 6: Check Browser Console for Errors

Look for these specific log messages:

**Success**:
```
[useGameWithInitialData] Submitting to leaderboard: {gameType: 'tandem', ...}
```

**Failure**:
```
[useGameWithInitialData] Failed to submit to leaderboard: <error>
```

---

## Common Issues and Solutions

### Issue 1: "401 Unauthorized" on leaderboard POST
**Cause**: Not logged in or Supabase session expired
**Fix**: Sign in via auth modal, verify session in DevTools

### Issue 2: No POST request to `/api/leaderboard/daily`
**Possible Causes**:
- Playing an archive puzzle (leaderboard only tracks daily puzzles)
- Puzzle not completed (didn't solve all words/clues)
- `timeTaken` is 0 or negative (shouldn't happen)
- Code condition not met: `if (won && timeTaken > 0 && currentPuzzleDate)`

**Fix**:
- Verify you're playing today's daily puzzle (URL should be `/tandem` or `/dailycryptic`, not `/archive/...`)
- Check browser console for completion logs

### Issue 3: "QuotaExceededError" in console
**Cause**: localStorage is full from gameEvents
**Impact**: Doesn't prevent leaderboard submissions (separate system)
**Fix**: Clear browser localStorage or the specific `gameEvents` key

### Issue 4: Leaderboard modal shows "No entries yet"
**Cause**: Either no one has completed today's puzzle, or you're looking at the wrong date
**Fix**:
- Check the date selector in the leaderboard modal
- Verify your submission was inserted (Step 5)
- Try refreshing the leaderboard (it auto-refreshes every 30 seconds)

### Issue 5: "Streak Leaderboard" is empty
**This is EXPECTED**: The streak leaderboard is not populated from web games currently. Only iOS Game Center submits streaks.
**Known Limitation**: See LEADERBOARD_ANALYSIS.md for details

---

## Advanced Debugging: Enable Detailed Logging

Add this to your game completion flow to see exactly what's being submitted:

In `useGameWithInitialData.js` (line 286):
```javascript
if (won && timeTaken > 0 && currentPuzzleDate) {
  const payload = {
    gameType: 'tandem',
    puzzleDate: currentPuzzleDate,
    score: timeTaken,
    metadata: { hintsUsed, mistakes, solved },
  };
  console.log('[useGameWithInitialData] Submitting to leaderboard:', payload);

  try {
    const response = await fetch('/api/leaderboard/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log('[useGameWithInitialData] Leaderboard response:', result);
  } catch (err) {
    console.error('[useGameWithInitialData] Failed to submit to leaderboard:', err);
  }
}
```

---

## Testing Checklist

- [ ] Verified I'm logged in (user ID shows in console)
- [ ] Database tables exist (`leaderboard_entries`, `leaderboard_preferences`)
- [ ] Leaderboard preferences are enabled for my user
- [ ] Completed a **daily** puzzle (not archive)
- [ ] Saw POST request to `/api/leaderboard/daily` in Network tab
- [ ] POST request returned 200 status code
- [ ] Entry appears in database when queried
- [ ] Leaderboard modal shows my entry

---

## Stats Migration

**Question**: Can we migrate existing stats into the leaderboard?

**Answer**: Not currently implemented. The leaderboard system only tracks:
- Completion times submitted after the feature was deployed
- Daily puzzles only (archive games don't submit)
- Via the `/api/leaderboard/daily` POST endpoint

**To Enable Migration**: Would need to create:
1. A new API route (e.g., `/api/leaderboard/import`)
2. Logic to parse localStorage/Game Center stats
3. Bulk insert into `leaderboard_entries` table
4. Validation to prevent abuse

This is a feature request, not currently available.

---

## Environment: Localhost vs Production

**Both environments use the same code paths**. The only differences:
- Database: Local Supabase vs Remote Supabase
- Auth: Local sessions vs Production sessions
- URL: `http://localhost:3000` vs `https://tandemdaily.com`

Leaderboards work identically in both environments **as long as**:
- Supabase connection is configured correctly
- Migrations have been applied
- User is authenticated

---

## Next Steps

1. Follow Step 1-6 above in order
2. If still not working, check browser console for specific error messages
3. Share:
   - Network tab screenshot of `/api/leaderboard/daily` POST request
   - Console logs showing submission attempt
   - Database query results from Step 5

This will help identify the exact point of failure.
