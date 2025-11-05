# Leaderboard Avatar Fix

## Issue
Player avatars are not displaying on the leaderboard - only the default avatar is shown for all players.

## Root Cause
The leaderboard database functions (`get_daily_leaderboard` and `get_streak_leaderboard`) were selecting `users.avatar_url` directly, which is a field intended for external avatar URLs (e.g., from OAuth providers like Google/Apple).

However, the avatar system stores the selected avatar in `users.selected_avatar_id`, which references the `avatars` table. The actual avatar image path is stored in `avatars.image_path`.

### Database Schema Overview
- `users.avatar_url` → External avatar URL (often NULL for email signups)
- `users.selected_avatar_id` → UUID referencing `avatars.id`
- `avatars.image_path` → Actual path to avatar image (e.g., `/images/avatars/cat.png`)

## Solution
Updated both leaderboard functions to:
1. LEFT JOIN with the `avatars` table
2. Use `COALESCE` to prioritize avatar sources:
   - First: Selected avatar's `image_path` (if user chose an avatar)
   - Second: User's `avatar_url` (if OAuth provider gave us one)
   - Third: Default avatar path (`/images/avatars/default-profile.png`)

### Changes Made
```sql
-- Before:
u.avatar_url

-- After:
COALESCE(a.image_path, u.avatar_url, '/images/avatars/default-profile.png') as avatar_url
```

With the addition of:
```sql
LEFT JOIN avatars a ON u.selected_avatar_id = a.id AND a.is_active = true
```

## Files Modified
1. Created migration: `/supabase/migrations/009_fix_leaderboard_avatars.sql`
2. Created production script: `/FIX_LEADERBOARD_AVATARS.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended for Production)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the contents of `FIX_LEADERBOARD_AVATARS.sql`
4. Paste and click "Run"

### Option 2: Supabase CLI (Local/Staging)
```bash
npx supabase db push
```

## Testing
After applying the fix:

1. **Check the database function directly:**
   ```sql
   SELECT * FROM get_daily_leaderboard('tandem', CURRENT_DATE, 10);
   ```

   The `avatar_url` column should now show:
   - `/images/avatars/cat.png` (or other avatar names)
   - NOT just `/images/avatars/default-profile.png` for everyone

2. **Test in the UI:**
   - Open the leaderboard modal
   - Check that player avatars are displaying (if they've selected one)
   - Users who haven't selected avatars will still show the default

3. **Verify both leaderboard types:**
   - Daily leaderboard (Today tab)
   - Streak leaderboard (Best Streaks tab)

## Expected Behavior After Fix
- ✅ Users who selected an avatar will see their chosen avatar on leaderboards
- ✅ Users with OAuth avatars (but no selected avatar) will see their OAuth avatar
- ✅ Users with neither will see the default avatar
- ✅ Avatars will display on both daily and streak leaderboards
- ✅ Avatars will display for both Tandem Daily and Daily Cryptic games

## Additional Notes
- This fix is **backwards compatible** - users who haven't selected avatars will continue to show defaults
- The fix works for both anonymous leaderboard viewers and authenticated users
- No frontend code changes required - the UI already handles avatar URLs correctly
- The migration is **idempotent** and safe to run multiple times
