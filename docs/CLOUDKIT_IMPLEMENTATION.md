# CloudKit Sync Implementation Guide

## Overview

The Tandem iOS app uses Apple CloudKit to sync user data across devices and survive app reinstalls. This implementation follows Apple best practices and provides seamless iCloud integration for iOS users.

## Architecture

### Components

1. **Swift Native Layer** (`ios/App/App/Plugins/`)
   - `CloudKitSyncPlugin.swift` - Native CloudKit operations
   - `CloudKitSyncPlugin.m` - Capacitor bridge

2. **JavaScript Service Layer** (`src/services/`)
   - `cloudkit.service.js` - CloudKit service wrapper
   - Platform abstraction and retry logic

3. **React Integration** (`src/hooks/`)
   - `useCloudKitSync.js` - React hook for sync state

4. **Storage Integration** (`src/lib/`)
   - `storage.js` - Modified to sync on writes
   - Automatic background sync

5. **UI Components** (`src/components/`)
   - `Settings.jsx` - iCloud sync controls
   - Sync status indicators

## Features

### Core Functionality

✅ **Automatic Sync**

- Stats sync after every game
- Puzzle results sync on completion
- Preferences sync on settings change
- Background sync (non-blocking)

✅ **Conflict Resolution**

- Stats: Merge strategy (sum plays/wins, max streaks)
- Puzzle Results: Most recent timestamp wins
- Preferences: Last write wins
- Automatic client-side resolution

✅ **Offline Support**

- Graceful fallback to local-only mode
- Automatic sync when back online
- Queue pending operations with retry logic

✅ **Multi-Device Support**

- Seamless sync across iPhones/iPads
- Device identifier tracking
- Merge data from multiple sources

✅ **Reinstall Recovery**

- Restore data from iCloud after reinstall
- One-tap restore in Settings
- Smart merge with existing local data

### User Experience

- **Opt-in**: Users must enable sync in Settings
- **Transparent**: Sync happens in background
- **Status Indicators**: Last sync time shown
- **Error Handling**: Clear error messages
- **Privacy**: All data is private to the user

## Setup Instructions

### 1. CloudKit Dashboard Configuration

Follow the instructions in [CLOUDKIT_SCHEMA.md](./CLOUDKIT_SCHEMA.md) to:

1. Create record types (UserStats, PuzzleResult, PuzzleProgress, UserPreferences)
2. Configure indexes for optimal queries
3. Set security permissions (owner-only access)
4. Deploy schema to Production environment

### 2. Xcode Configuration

The entitlements are already configured in `ios/App/Tandem.entitlements`:

```xml
<key>com.apple.developer.icloud-container-identifiers</key>
<array>
    <string>iCloud.com.tandemdaily.app</string>
</array>
<key>com.apple.developer.icloud-services</key>
<array>
    <string>CloudKit</string>
</array>
```

Verify in Xcode:

1. Open `ios/App/App.xcworkspace`
2. Select the App target
3. Go to "Signing & Capabilities"
4. Verify "iCloud" capability is enabled
5. Verify CloudKit container is selected
6. Ensure Background Modes includes "Remote notifications"

### 3. Build and Sync

```bash
# Build for iOS
npm run build:ios

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 4. Testing

1. **Development Testing**
   - Run on simulator and physical device
   - Enable CloudKit logging in scheme
   - Monitor Console.app for CloudKit logs

2. **Multi-Device Testing**
   - Sign into same iCloud account on 2 devices
   - Enable sync on both
   - Play puzzle on device 1
   - Verify stats appear on device 2

3. **Reinstall Testing**
   - Enable sync and play several puzzles
   - Delete app
   - Reinstall
   - Verify "Restore from iCloud" works

## Usage

### For End Users

#### Enabling iCloud Sync

1. Open Settings (gear icon)
2. Scroll to "iCloud Sync" section
3. Toggle "Sync with iCloud" ON
4. Stats and progress now sync automatically

#### Restoring from iCloud

After reinstalling the app:

1. Open Settings
2. Go to "iCloud Sync"
3. Tap "Restore from iCloud"
4. Wait for confirmation
5. App will reload with restored data

### For Developers

#### Checking Sync Status

```javascript
import cloudKitService from '@/services/cloudkit.service';

// Check if iCloud is available
const available = await cloudKitService.checkiCloudStatus();

// Get sync status
const status = cloudKitService.getSyncStatus();
console.log('Available:', status.available);
console.log('Enabled:', status.enabled);
console.log('Last Sync:', status.lastSync);
```

#### Manual Sync Operations

```javascript
// Sync stats
await cloudKitService.syncStats({
  played: 10,
  wins: 8,
  currentStreak: 3,
  bestStreak: 5,
  lastStreakDate: '2025-10-04',
});

// Sync puzzle result
await cloudKitService.syncPuzzleResult('2025-10-04', {
  won: true,
  mistakes: 1,
  solved: 4,
  hintsUsed: 0,
  theme: 'Weather',
  timestamp: new Date().toISOString(),
});

// Fetch all data
const syncData = await cloudKitService.performFullSync();
```

#### Using React Hook

```javascript
import { useCloudKitSync } from '@/hooks/useCloudKitSync';

function MyComponent() {
  const {
    syncStatus, // { available, enabled, lastSync, syncing, error }
    toggleSync, // Enable/disable sync
    performFullSync, // Full sync operation
    syncStats, // Sync stats
    syncPuzzleResult, // Sync puzzle result
  } = useCloudKitSync();

  return (
    <div>
      <p>Sync Status: {syncStatus.enabled ? 'Enabled' : 'Disabled'}</p>
      {syncStatus.lastSync && <p>Last Sync: {new Date(syncStatus.lastSync).toLocaleString()}</p>}
      <button onClick={() => toggleSync(!syncStatus.enabled)}>Toggle Sync</button>
    </div>
  );
}
```

## Data Flow

### Write Path (Local → Cloud)

```
User Action (e.g., completes puzzle)
    ↓
Storage function called (savePuzzleResult)
    ↓
Data saved to localStorage
    ↓
cloudKitService.syncPuzzleResult() called (background)
    ↓
Native Swift plugin invoked
    ↓
CloudKit API called
    ↓
Record saved to iCloud
```

### Read Path (Cloud → Local)

```
App Launch / User triggers restore
    ↓
cloudKitService.performFullSync()
    ↓
Native Swift plugin queries CloudKit
    ↓
Records fetched from iCloud
    ↓
Merge logic applied (client-side)
    ↓
Merged data saved to localStorage
    ↓
UI updates with fresh data
```

## Conflict Resolution

### Stats Merging Example

**Device 1:**

```json
{
  "played": 10,
  "wins": 8,
  "currentStreak": 3,
  "bestStreak": 5
}
```

**Device 2:**

```json
{
  "played": 5,
  "wins": 4,
  "currentStreak": 2,
  "bestStreak": 4
}
```

**Merged Result:**

```json
{
  "played": 15, // Sum
  "wins": 12, // Sum
  "currentStreak": 3, // Most recent device
  "bestStreak": 5 // Max
}
```

### Puzzle Result Conflict

If the same puzzle is completed on two devices:

1. Compare timestamps
2. Keep the most recent completion
3. Update local storage if cloud version is newer

## Error Handling

### Common Scenarios

| Scenario                     | Behavior                            |
| ---------------------------- | ----------------------------------- |
| iCloud account not signed in | Sync disabled, local-only mode      |
| Network unavailable          | Queue operations, retry when online |
| CloudKit quota exceeded      | Show error, continue local-only     |
| Invalid record format        | Log error, skip that record         |
| Account changed              | Re-check status, may disable sync   |

### Retry Logic

- Exponential backoff: 1s, 2s, 4s
- Max 3 retries per operation
- Non-critical failures logged, don't block UI

## Performance Considerations

### Sync Frequency

Syncs are triggered on:

- Game completion (~1-2 times/day)
- Settings changes (rare)
- App launch (if sync enabled)
- Manual restore (user-initiated)

Estimated:

- **Daily syncs**: 2-5 per user
- **Bandwidth**: < 10 KB per sync
- **Storage**: < 1 MB per user total

### Optimization Techniques

1. **Background operations**: Never block UI
2. **Batching**: Combine multiple changes where possible
3. **Selective sync**: Only sync changed data
4. **Caching**: Remember last sync time, avoid unnecessary checks

## Security and Privacy

### Data Protection

- All records stored in Private Database
- Only accessible by the owning user
- Encrypted in transit and at rest by Apple
- No data shared between users

### Privacy Compliance

- User must opt-in to enable sync
- Clear disclosure in Settings
- Can disable sync anytime
- Can delete cloud data via "Clear" option

## Troubleshooting

### Debug Logging

Enable verbose CloudKit logging:

```swift
// In AppDelegate or plugin
UserDefaults.standard.set(true, forKey: "CKOperationLogLevel")
```

### Common Issues

**"Sync not available"**

- Check: User signed into iCloud in Settings app
- Check: iCloud Drive enabled
- Check: Network connection active

**"Data not appearing on second device"**

- Verify same iCloud account on both devices
- Check sync is enabled in Settings on both
- Try manual "Restore from iCloud"
- Wait a few minutes for sync to propagate

**"Restore from iCloud shows no data"**

- Verify sync was previously enabled
- Check CloudKit Dashboard for records
- Ensure signed into correct iCloud account

### Diagnostic Steps

1. Check iCloud account:
   - Settings → Apple ID → iCloud
   - Verify signed in

2. Check network:
   - Can access other iCloud services?
   - Try on WiFi vs cellular

3. Check CloudKit Dashboard:
   - Are records being created?
   - Check for error logs

4. Check Xcode console:
   - Filter for "CloudKit"
   - Look for error messages

## Testing Checklist

### Unit Testing

- [ ] CloudKit service initializes correctly
- [ ] Retry logic works with failures
- [ ] Merge logic combines stats correctly
- [ ] Timestamp comparison for conflicts

### Integration Testing

- [ ] Stats sync after game completion
- [ ] Puzzle results sync correctly
- [ ] Preferences sync on change
- [ ] Restore from iCloud works

### Device Testing

- [ ] Works on iPhone and iPad
- [ ] Syncs between devices
- [ ] Survives app kill/relaunch
- [ ] Works after reinstall

### Edge Cases

- [ ] Offline mode (no network)
- [ ] iCloud account not signed in
- [ ] Account switch mid-session
- [ ] Rapid consecutive updates
- [ ] Concurrent updates from 2 devices

## Monitoring

### Metrics to Track

1. **Sync Enablement Rate**
   - % of users with sync enabled
   - Track in analytics

2. **Sync Success Rate**
   - % of sync operations that succeed
   - Monitor CloudKit errors

3. **Data Volume**
   - Average records per user
   - Storage usage trends

4. **Performance**
   - Sync operation duration
   - Impact on app launch time

### CloudKit Console

Monitor in Apple Developer Console:

- Request volume
- Error rates
- Storage usage
- Active users

## Future Enhancements

### Potential Improvements

1. **Real-time sync**
   - Use CloudKit subscriptions
   - Push notifications on data changes
   - Instant cross-device updates

2. **Web sync**
   - CloudKit JS integration
   - Sync web version with iOS

3. **Shared features**
   - Friend leaderboards (public database)
   - Shared puzzle packs
   - Multiplayer features

4. **Advanced conflict resolution**
   - CRDTs for better merging
   - Operational transforms
   - Custom merge UIs

## Support

### For Users

Support email: support@tandemdaily.com

Include:

- iOS version
- App version
- Description of issue
- Screenshots if applicable

### For Developers

- CloudKit Documentation: https://developer.apple.com/icloud/cloudkit/
- CloudKit Dashboard: https://icloud.developer.apple.com/
- Apple Developer Forums: https://developer.apple.com/forums/

## License

This implementation is part of the Tandem iOS app and is proprietary.
