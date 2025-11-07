# Storage and Session Persistence Fixes

## Issues Fixed

### 1. LocalStorage Quota Exceeded Error

**Problem**: Users experiencing QuotaExceededError causing stats/leaderboards to fail loading

- Storage cleanup was running but not reducing data (100 -> 100 events)
- Backup mechanism was duplicating data during failures
- No emergency cleanup when quota exceeded

**Root Cause**:

- Events accumulating beyond localStorage limits (~5-10MB)
- Backup creation before save was failing silently and consuming more space
- No aggressive cleanup mechanism when quota exceeded

**Solution**:

- Added emergency storage cleanup function that aggressively reduces to 50 events
- Modified cleanup to accept configurable max events parameter
- Improved error handling to skip backup on quota errors
- Added proactive quota checking before save operations
- Retry mechanism with minimal data on quota errors

**Files Changed**:

- `src/services/stats/providers/LocalStorageProvider.js`
  - Enhanced `save()` method with quota error handling and retry logic
  - Added `emergencyStorageCleanup()` method for aggressive cleanup
  - Updated `cleanupOldEvents()` to accept configurable max events
  - Modified `checkStorageQuota()` to return boolean instead of throwing

### 2. Event Store Null Reference Error

**Problem**: `Cannot read properties of null (reading 'id')` in GameEventStore

- Error occurred in `queueForSync()` when called from `importEvents()`
- `persistEvent(null)` was passing null to `queueForSync()`

**Solution**:

- Added null check in `queueForSync()` to skip when no event provided
- Gracefully handles bulk persist operations

**Files Changed**:

- `src/services/events/GameEventStore.js`
  - Added null check in `queueForSync()` method

### 3. Session Persistence / Auto-Logout Issue

**Problem**: Users having to login every time they close browser/tab

- Cookies not persisting across sessions
- No proper session expiry configuration

**Solution**:

- Configured Supabase client to use localStorage for session storage
- Set long-lived cookies (30 days) following mobile web game best practices
- Enabled auto token refresh
- Set proper cookie attributes (SameSite=Lax, Secure in production, path=/)

**Files Changed**:

- `src/lib/supabase/client.js`
  - Added session persistence configuration in `auth` options
  - Updated cookie `set()` to default to 30-day expiry
  - Added proper cookie security flags

## Implementation Details

### Storage Cleanup Strategy

1. **Normal Operation**: Keep 100 most recent events
2. **High Usage (>3MB)**: Auto cleanup on app init
3. **Quota Warning (>80%)**: Log warning but continue
4. **Quota Exceeded**: Emergency cleanup to 50 events, retry once
5. **Persistent Failure**: Remove backup files to free space

### Session Persistence Strategy

Following industry best practices for mobile web games:

- 30-day cookie expiry (auto-refreshed by Supabase)
- localStorage for primary session storage
- Cookie-based fallback for SSR compatibility
- Automatic token refresh before expiry
- Secure flag in production, SameSite=Lax for CSRF protection

## Testing Instructions

### Test 1: Storage Quota Recovery

1. Open browser DevTools → Console
2. Check current storage: `window.storageCleanup.checkUsage()`
3. Try to trigger the issue by:
   - Playing multiple games to generate events
   - Check stats page loads correctly
4. If quota issues occur, emergency cleanup should trigger automatically

### Test 2: Session Persistence

1. **Normal Browser**:
   - Login to the app
   - Close the tab completely
   - Reopen the app
   - **Expected**: Should still be logged in (no re-login required)

2. **After Browser Restart**:
   - Login to the app
   - Close entire browser
   - Reopen browser and go to app
   - **Expected**: Should still be logged in

3. **Private/Incognito Mode**:
   - Open in private/incognito
   - Login
   - Close tab
   - Reopen in new private/incognito tab
   - **Expected**: Will need to re-login (this is correct behavior)

### Test 3: Stats/Leaderboards Loading

1. Login with an account that has stats
2. Navigate to leaderboards page
3. **Expected**: Stats should load without errors
4. Check console for any QuotaExceededError messages
5. **Expected**: No quota errors

### Test 4: Profile Picture Display

1. Login with account that has profile picture
2. **Expected**: Profile picture should display immediately
3. Navigate away and back
4. **Expected**: Profile picture persists

## Browser Console Debugging

Check storage usage:

```javascript
window.storageCleanup.checkUsage();
```

Run emergency cleanup manually:

```javascript
await window.storageCleanup.emergencyCleanup();
```

Check event count:

```javascript
localStorage
  .getItem('CapacitorStorage.tandem_game_data_v2')
  .then((data) => JSON.parse(data))
  .then((parsed) => console.log('Events:', parsed.events?.length));
```

Check session:

```javascript
// In browser console
localStorage.getItem('sb-' + location.hostname.replace(/\./g, '-') + '-auth-token');
```

## Web Best Practices Implemented

1. **Progressive Enhancement**: Graceful degradation when storage quota exceeded
2. **Error Recovery**: Automatic retry with reduced data on failures
3. **Data Pruning**: Keep only essential recent data (last 90 days)
4. **Session Management**: Long-lived sessions similar to Discord, Spotify, etc.
5. **Security**: Proper cookie flags (Secure, SameSite, HttpOnly where applicable)
6. **User Experience**: No unnecessary re-authentication
7. **Performance**: Proactive cleanup to prevent quota issues

## Production Considerations

1. **Monitor**: Watch for QuotaExceededError in production logs
2. **Analytics**: Track cleanup frequency and storage usage patterns
3. **User Communication**: Consider UI indicator when storage is running low
4. **Backup**: Stats are also synced to server, so local cleanup is safe
5. **Testing**: Test on various browsers (Chrome, Safari, Firefox)

## Rollback Plan

If issues occur, revert these commits:

- `src/services/stats/providers/LocalStorageProvider.js`
- `src/services/events/GameEventStore.js`
- `src/lib/supabase/client.js`

Previous behavior will be restored.

## Future Improvements

1. Add UI notification when storage cleanup runs
2. Implement periodic background cleanup (every 7 days)
3. Add user preference for session length
4. Migrate to IndexedDB for larger storage quota
5. Server-side session validation for enhanced security
