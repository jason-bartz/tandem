# CloudKit Schema Configuration

This document describes the CloudKit schema that must be configured in the CloudKit Dashboard for the Tandem iOS app.

## Container Information

- **Container ID**: `iCloud.com.tandemdaily.app`
- **Database**: Private Database (user-specific data)
- **Security**: All records are user-scoped and private

## Record Types

### 1. UserStats

Stores user game statistics across devices.

**Fields:**

- `played` (Int64) - Total games played
- `wins` (Int64) - Total games won
- `currentStreak` (Int64) - Current win streak
- `bestStreak` (Int64) - Best win streak achieved
- `lastStreakDate` (String) - Last date streak was updated (YYYY-MM-DD format)
- `deviceId` (String) - Device identifier for tracking sync source
- `modifiedAt` (Date/Time) - Last modification timestamp

**Indexes:**

- `deviceId` - Queryable
- `modifiedAt` - Sortable

**Notes:**

- Multiple device records are merged client-side
- Stats are summed across devices (played, wins)
- Streaks use the most recent value

### 2. PuzzleResult

Stores completed puzzle results for each date.

**Fields:**

- `date` (String) - Puzzle date in YYYY-MM-DD format (indexed)
- `won` (Int64 as Boolean) - Whether the puzzle was won (1 = true, 0 = false)
- `mistakes` (Int64) - Number of mistakes made
- `solved` (Int64) - Number of puzzles solved
- `hintsUsed` (Int64) - Number of hints used
- `theme` (String) - Puzzle theme name
- `timestamp` (String) - ISO 8601 timestamp of completion
- `deviceId` (String) - Device identifier

**Indexes:**

- `date` - Queryable & Sortable
- `timestamp` - Sortable
- `deviceId` - Queryable

**Notes:**

- Record name format: `puzzleResult_{date}_{deviceId}`
- Most recent timestamp wins during conflicts
- One result per device per date

### 3. PuzzleProgress

Stores in-progress puzzle state.

**Fields:**

- `date` (String) - Puzzle date in YYYY-MM-DD format (indexed)
- `started` (Int64 as Boolean) - Whether puzzle was started
- `solved` (Int64) - Number of puzzles solved so far
- `mistakes` (Int64) - Number of mistakes so far
- `hintsUsed` (Int64) - Number of hints used
- `lastUpdated` (String) - ISO 8601 timestamp of last update
- `deviceId` (String) - Device identifier

**Indexes:**

- `date` - Queryable
- `lastUpdated` - Sortable
- `deviceId` - Queryable

**Notes:**

- Record name format: `puzzleProgress_{date}_{deviceId}`
- Most recent update wins during conflicts
- Used for resuming puzzles across devices

### 4. UserPreferences

Stores user app preferences and settings.

**Fields:**

- `theme` (String) - Theme selection ("light" or "dark")
- `themeMode` (String) - Theme mode ("auto" or "manual")
- `highContrast` (Int64 as Boolean) - High contrast mode enabled
- `sound` (Int64 as Boolean) - Sound effects enabled
- `deviceId` (String) - Device identifier
- `modifiedAt` (Date/Time) - Last modification timestamp

**Indexes:**

- `deviceId` - Queryable
- `modifiedAt` - Sortable

**Notes:**

- Record name format: `userPreferences_{deviceId}`
- Most recent modification wins
- One preference set per device

## Security and Permissions

All record types use:

- **Owner**: Current User
- **Permissions**:
  - Read: Owner only
  - Write: Owner only
  - Delete: Owner only

## Indexes Configuration

For optimal query performance, create the following indexes in CloudKit Dashboard:

### UserStats Indexes

1. `deviceId` (Queryable, String)
2. `modifiedAt` (Sortable, Date/Time)

### PuzzleResult Indexes

1. `date` (Queryable + Sortable, String)
2. `timestamp` (Sortable, String)
3. `deviceId` (Queryable, String)

### PuzzleProgress Indexes

1. `date` (Queryable, String)
2. `lastUpdated` (Sortable, String)
3. `deviceId` (Queryable, String)

### UserPreferences Indexes

1. `deviceId` (Queryable, String)
2. `modifiedAt` (Sortable, Date/Time)

## Setup Instructions

### 1. Access CloudKit Dashboard

1. Go to [CloudKit Dashboard](https://icloud.developer.apple.com/dashboard/)
2. Sign in with your Apple Developer account
3. Select the `iCloud.com.tandemdaily.app` container

### 2. Create Record Types

For each record type (UserStats, PuzzleResult, PuzzleProgress, UserPreferences):

1. Click "Schema" > "Record Types"
2. Click the "+" button to add a new record type
3. Enter the record type name (exactly as shown above)
4. Add all fields with the specified types
5. Mark appropriate fields as sortable/queryable
6. Save the record type

### 3. Configure Indexes

1. Select each record type
2. Click "Indexes" tab
3. Add the indexes listed above
4. Save changes

### 4. Deploy to Production

1. Test in Development environment first
2. Once verified, deploy schema to Production:
   - Select "Deploy Schema Changes" from the menu
   - Review changes carefully
   - Deploy to Production environment

## Data Migration

If users already have local data when CloudKit sync is enabled:

1. Local data is preserved
2. First sync pulls CloudKit data
3. Client-side merge logic combines data:
   - Stats: Sum plays/wins, max for streaks
   - Results: Keep most recent by timestamp
   - Preferences: Last write wins
4. Merged data syncs back to CloudKit

## Conflict Resolution

**Strategy by Record Type:**

- **UserStats**: Merge strategy (sum plays/wins, max streaks, recent streak date)
- **PuzzleResult**: Last write wins (most recent timestamp)
- **PuzzleProgress**: Last write wins (most recent lastUpdated)
- **UserPreferences**: Last write wins (most recent modifiedAt)

## Testing

### Development Testing

1. Enable CloudKit Development environment
2. Use Xcode CloudKit tools to inspect records
3. Test sync with multiple devices:
   - Simulator + Physical device
   - Two physical devices
4. Test edge cases:
   - Offline mode
   - Account changes
   - App reinstall

### Production Verification

1. Deploy to TestFlight
2. Test with beta users
3. Monitor CloudKit Console for errors
4. Check sync performance metrics

## Troubleshooting

### Common Issues

**"iCloud sync not available"**

- User not signed into iCloud
- iCloud Drive disabled in Settings
- CloudKit entitlements missing

**"Sync failed"**

- Network connectivity issues
- CloudKit service issues
- Invalid record format

**"Data not syncing between devices"**

- Check both devices are signed into same iCloud account
- Verify sync is enabled in Settings
- Check CloudKit Dashboard for errors

### Debugging

Enable CloudKit logging in Xcode:

```
-com.apple.CloudKit.logging.level debug
```

Check Console.app for CloudKit logs:

```
subsystem:com.apple.cloudkit
```

## Quotas and Limits

CloudKit Free Tier includes:

- **Storage**: 10 GB per user
- **Requests**: 40 requests/second
- **Bandwidth**: 200 MB/day per user

Our app usage:

- **Storage per user**: < 1 MB (estimated)
- **Requests**: Minimal (sync on app launch/close, puzzle complete)
- **Bandwidth**: Very low

## Best Practices

1. **Minimize sync frequency**: Only sync on meaningful events
2. **Use background operations**: Don't block UI during sync
3. **Handle failures gracefully**: Fall back to local-only mode
4. **Respect user privacy**: Never share data between users
5. **Test thoroughly**: Edge cases, poor network, account changes

## Future Enhancements

Potential improvements:

- CloudKit subscriptions for push notifications on data changes
- Shared databases for leaderboards (requires separate schema)
- CloudKit JS for web version sync
- Advanced conflict resolution with CRDTs
