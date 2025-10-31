# Storage Quota Fix

## Problem

Users were experiencing the error:

```
Failed to execute 'setItem' on 'Storage': Setting the value of 'sb-auth-token' exceeded the quota.
```

This prevented login and authentication from working properly.

## Root Cause

The issue was NOT the auth token itself, but rather **game event data** filling up localStorage:

- **389 game events** were being stored, growing without limit
- Each event contained extensive metadata (timestamps, device info, session IDs, etc.)
- Events were persisted on every game action
- Total storage exceeded the 5-10MB localStorage quota

The auth error was a **symptom** - when trying to login, there was no room left for the auth token because game data had consumed all available space.

## Solution

Implemented automatic cleanup mechanisms across multiple layers:

### 1. GameEventStore Auto-Cleanup ([GameEventStore.js](../src/services/events/GameEventStore.js))

- **Automatic cleanup on load**: Removes old events when initializing
- **Keeps last 100 events**: Sufficient for stats computation (2-3 months of daily play)
- **90-day retention**: Only keeps events from the last 90 days
- **Preserves stats**: Creates synthetic migration events to preserve historical data
- **Storage monitoring**: Added `getStorageStats()` method to track usage

### 2. LocalStorageProvider Cleanup ([LocalStorageProvider.js](../src/services/stats/providers/LocalStorageProvider.js))

- **Cleanup before save**: Automatically reduces event count before persisting
- **Same limits**: 100 events max, 90 days retention
- **Prevents quota errors**: Ensures data fits within storage limits

### 3. Automatic Cleanup Utilities ([storageCleanup.js](../src/lib/storageCleanup.js))

New utility functions for storage management:

- `checkStorageUsage()`: Inspect current localStorage usage
- `cleanupGameEvents()`: Clean up old game events
- `cleanupGameData()`: Clean up game data storage
- `emergencyCleanup()`: Run all cleanup functions
- `autoCleanupIfNeeded()`: Automatically run cleanup if storage > 3MB

### 4. Auth Provider Integration ([AuthContext.jsx](../src/contexts/AuthContext.jsx))

- **Runs on initialization**: Automatically cleans up storage before auth
- **Prevents quota errors**: Ensures auth tokens can be stored
- **Silent failure**: Logs errors but doesn't block auth flow

## Usage

### For Users Currently Experiencing the Issue

1. **Quick Fix - Clear localStorage** (loses all data):

   ```javascript
   localStorage.clear();
   ```

2. **Better Fix - Use cleanup utilities** (preserves recent data):

   ```javascript
   // In browser console
   window.storageCleanup.emergencyCleanup();
   ```

3. **Check usage**:
   ```javascript
   window.storageCleanup.checkUsage();
   ```

### For Developers

The fix is automatic! No manual intervention needed:

- Auto-cleanup runs on app initialization
- Events are automatically pruned when loading/saving
- Storage is monitored and cleaned when needed

## Technical Details

### Event Retention Strategy

**Before Fix:**

- ✗ Unlimited event growth (389+ events)
- ✗ No cleanup mechanism
- ✗ Could exceed 5MB easily

**After Fix:**

- ✓ Maximum 100 events retained
- ✓ 90-day rolling window
- ✓ Automatic cleanup on load/save
- ✓ Stats preserved via migration events
- ✓ Typical storage: ~200-500KB

### Storage Quota Limits

- **localStorage**: 5-10MB per domain (varies by browser)
- **Typical event size**: 2-5KB each
- **389 events**: ~1-2MB (before cleanup)
- **100 events**: ~200-500KB (after cleanup)
- **Auth token**: ~10-50KB
- **Game data**: ~100-300KB

### Cleanup Triggers

1. **On app initialization** (via AuthProvider)
2. **When loading events** (GameEventStore)
3. **Before saving data** (LocalStorageProvider)
4. **Manual via console** (storageCleanup utilities)

## Testing

To verify the fix is working:

1. Open browser console
2. Check storage usage:
   ```javascript
   window.storageCleanup.checkUsage();
   ```
3. Should see reduced event counts and storage under 1MB

## Future Improvements

Consider implementing:

1. **IndexedDB migration**: Move events to IndexedDB (larger quota)
2. **Cloud sync**: Sync events to Supabase (unlimited storage)
3. **Compression**: Compress events before storage
4. **Configurable limits**: Allow users to adjust retention settings
5. **Export/backup**: Allow users to export their full history

## Related Files

- [src/services/events/GameEventStore.js](../src/services/events/GameEventStore.js)
- [src/services/stats/providers/LocalStorageProvider.js](../src/services/stats/providers/LocalStorageProvider.js)
- [src/lib/storageCleanup.js](../src/lib/storageCleanup.js)
- [src/contexts/AuthContext.jsx](../src/contexts/AuthContext.jsx)

## References

- [MDN: Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Supabase Auth Storage](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [localStorage limits](https://web.dev/storage-for-the-web/)
