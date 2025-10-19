# Game Center Cross-Device Sync - Test Plan

## Summary of Changes

We've implemented a production-ready Game Center sync system following Apple HIG and modern game development best practices. The key changes include:

### 1. **Game Center Integration** ✅
- Modified `UnifiedStatsManager.js` to submit current streak to Game Center on every game completion
- Added immediate Game Center submission for GAME_COMPLETED and STREAK_CONTINUED events
- Configured to use your single leaderboard: `com.tandemdaily.app.longest_streak`
- Other stats (games played, wins) sync via CloudKit only since no leaderboards exist for them

### 2. **CloudKit User-Scoped Records** ✅
- Updated `CloudKitSyncPlugin.swift` to use user-scoped record IDs instead of device-specific ones
- Added `getUserID()` method that fetches CloudKit user record ID for cross-device consistency
- Puzzle results and progress now use format: `puzzleResult_{date}_{userID}` instead of `puzzleResult_{date}_{deviceId}`

### 3. **Unified Sync Hook** ✅
- Created new `useUnifiedSync.js` hook that coordinates Game Center, CloudKit, and local storage
- Settings component now uses unified sync instead of CloudKit-only sync
- Removed destructive `window.location.reload()` - now uses proper React state updates

### 4. **Native iOS UI Components** ✅
- Enhanced `SyncStatusView.swift` to display Game Center as primary provider
- Shows appropriate SF Symbols: gamecontroller.fill for Game Center, icloud for CloudKit
- Dynamic provider detection based on authentication status

### 5. **Settings UI Improvements** ✅
- Shows which sync provider is active (Game Center, iCloud, or Local)
- Displays last sync time with provider information
- Added haptic feedback on successful sync

## Testing Instructions

### Prerequisites
1. **App Store Connect Configuration**
   - Verify your single Game Center leaderboard is configured:
     - **Reference Name**: "Longest Active Streak"
     - **Leaderboard ID**: `com.tandemdaily.app.longest_streak`
     - **Score Format**: Integer (1, 100, 0, -5, 999)
     - **Score Submission Type**: Best Score
     - **Sort Order**: High to Low

2. **Test Devices**
   - iPhone and iPad both signed into same Apple ID
   - Game Center enabled on both devices
   - iCloud enabled on both devices

### Test Scenarios

#### Test 1: Initial Sync Setup
1. Fresh install on iPhone
2. Play one game and complete it
3. Check Settings → Sync shows "Using: 🎮 Game Center"
4. Note the stats displayed

#### Test 2: Cross-Device Sync
1. Install app on iPad
2. Sign into same Game Center account
3. Open Settings → tap "Sync Now"
4. **Expected**: Stats from iPhone should appear on iPad
5. **Verify**: Both devices show same wins, played, and streak values

#### Test 3: Game Completion Sync
1. Complete a puzzle on iPhone
2. Wait 5 seconds (debounce time)
3. Open app on iPad
4. Tap "Sync Now" in Settings
5. **Expected**: New game stats reflected on iPad

#### Test 4: Streak Continuation
1. Play daily puzzle on iPhone (day 1)
2. Next day, play on iPad (day 2)
3. **Expected**: Streak continues from 1 to 2
4. Sync on iPhone
5. **Expected**: iPhone shows streak of 2

#### Test 5: Conflict Resolution
1. Put iPad in airplane mode
2. Play game on iPad (offline)
3. Play different game on iPhone (online)
4. Turn iPad online
5. Tap "Sync Now" on iPad
6. **Expected**: Higher values should win (max of games played, wins, streaks)

### Debug Verification

#### Check Game Center Submission
In Xcode console, you should see:
```
[UnifiedStatsManager] Submitting to Game Center for event: GAME_COMPLETED
[UnifiedStatsManager] Game Center submission complete
```

#### Check CloudKit User ID
In Xcode console, you should see:
```
CloudKit user record fetch succeeded
Using user ID: [some_id] instead of device ID
```

#### Verify Leaderboard Updates
1. Open Game Center app
2. Navigate to Tandem
3. Check leaderboards show updated scores

### Known Issues to Watch For

1. **First Launch**: Game Center might not be authenticated on first launch. User needs to sign in via Settings app.

2. **Sync Delay**: Game Center leaderboards may have up to 30 second delay before showing on other devices.

3. **CloudKit Fallback**: If Game Center fails, system should fallback to CloudKit automatically.

### Success Criteria

✅ Scores sync between iPhone and iPad within 1 minute
✅ Game Center leaderboards update after each game
✅ Streak continues properly across devices
✅ Settings shows correct primary provider (Game Center)
✅ No data loss during sync operations
✅ Proper conflict resolution (higher values win)

## Rollback Plan

If issues occur:
1. Previous CloudKit-only sync still works as fallback
2. Local storage maintains all data independently
3. Can disable Game Center in Settings if needed

## Production Deployment Checklist

- [ ] Verify leaderboard IDs in App Store Connect
- [ ] Test on TestFlight with multiple users
- [ ] Monitor for sync errors in crash reporting
- [ ] Document any Game Center authentication issues
- [ ] Verify sync works on iOS 14+ devices