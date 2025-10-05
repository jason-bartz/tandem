# CloudKit Sync - Quick Start Guide

This is your 5-minute quick start to get CloudKit sync working.

## Step 1: Setup CloudKit Dashboard (⏱️ 30 minutes)

### Access Dashboard

1. Go to https://icloud.developer.apple.com/dashboard/
2. Sign in with your Apple Developer account
3. Select container: `iCloud.com.tandemdaily.app`

### Create Record Types

Click "Schema" → "Record Types" → "+" and create these 4 record types:

#### UserStats

```
Fields:
- played (Int64)
- wins (Int64)
- currentStreak (Int64)
- bestStreak (Int64)
- lastStreakDate (String)
- deviceId (String) [Queryable]
- modifiedAt (Date/Time) [Sortable]
```

#### PuzzleResult

```
Fields:
- date (String) [Queryable, Sortable]
- won (Int64)
- mistakes (Int64)
- solved (Int64)
- hintsUsed (Int64)
- theme (String)
- timestamp (String) [Sortable]
- deviceId (String) [Queryable]
```

#### PuzzleProgress

```
Fields:
- date (String) [Queryable]
- started (Int64)
- solved (Int64)
- mistakes (Int64)
- hintsUsed (Int64)
- lastUpdated (String) [Sortable]
- deviceId (String) [Queryable]
```

#### UserPreferences

```
Fields:
- theme (String)
- themeMode (String)
- highContrast (Int64)
- sound (Int64)
- deviceId (String) [Queryable]
- modifiedAt (Date/Time) [Sortable]
```

### Deploy to Production

1. Click "Deploy Schema Changes"
2. Review carefully
3. Deploy to Production

## Step 2: Build & Test (⏱️ 5 minutes)

### Build

```bash
# Build the iOS app
npm run build:ios

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### Verify in Xcode

1. Select "App" target
2. Go to "Signing & Capabilities"
3. Confirm:
   - ✅ iCloud capability is enabled
   - ✅ CloudKit is checked
   - ✅ Container `iCloud.com.tandemdaily.app` is selected
   - ✅ Background Modes includes "Remote notifications"

### Run

1. Build and run (Cmd+R)
2. App should launch normally
3. Open Settings (gear icon)
4. Scroll to "iCloud Sync" section
5. You should see:
   - "Sync with iCloud" toggle
   - If signed into iCloud: toggle will work
   - If not: message about signing in

## Step 3: Test Sync (⏱️ 10 minutes)

### Single Device Test

1. ✅ Sign into iCloud in iOS Settings
2. ✅ Open Tandem app
3. ✅ Go to Settings → iCloud Sync
4. ✅ Enable "Sync with iCloud"
5. ✅ Play a puzzle
6. ✅ Check CloudKit Dashboard → Data → UserStats
7. ✅ You should see a record created!

### Multi-Device Test

1. ✅ Sign into same iCloud account on 2nd device
2. ✅ Install app on 2nd device
3. ✅ Enable iCloud Sync in Settings
4. ✅ Play puzzle on device 1
5. ✅ Open app on device 2
6. ✅ Stats should sync automatically!

### Reinstall Test

1. ✅ Play several puzzles with sync enabled
2. ✅ Note your stats (wins, streak, etc.)
3. ✅ Delete app completely
4. ✅ Reinstall
5. ✅ Go to Settings → iCloud Sync
6. ✅ Tap "Restore from iCloud"
7. ✅ All data should be restored!

## Troubleshooting

### "Sync not available"

**Problem:** Toggle is disabled/grayed out
**Solution:**

- Go to iOS Settings → [Your Name] → iCloud
- Make sure you're signed in
- Enable iCloud Drive

### "No data when restoring"

**Problem:** "Restore from iCloud" says no data found
**Solution:**

- Make sure you enabled sync BEFORE deleting app
- Check CloudKit Dashboard → Data to verify records exist
- Verify same iCloud account on both devices

### Build errors

**Problem:** Xcode build fails
**Solution:**

```bash
# Clean and rebuild
npm run build:ios
npx cap sync ios
# In Xcode: Product → Clean Build Folder (Cmd+Shift+K)
# Then build again (Cmd+B)
```

### Import errors in JavaScript

**Problem:** Cannot import cloudkit.service
**Solution:**

- Make sure you ran `npm run build:ios`
- Check that all files are in correct locations
- Restart Metro bundler

## Verification Checklist

Before deploying to production:

- [ ] All 4 record types created in CloudKit Dashboard
- [ ] Schema deployed to Production
- [ ] App builds successfully in Xcode
- [ ] iCloud capability enabled in Xcode
- [ ] Settings shows "iCloud Sync" section
- [ ] Can toggle sync on/off
- [ ] Playing puzzle creates CloudKit records
- [ ] Stats sync between devices
- [ ] "Restore from iCloud" works after reinstall
- [ ] No errors in Xcode console

## Quick Reference

### Key Files

```
ios/App/App/Plugins/CloudKitSyncPlugin.swift  - Native plugin
src/services/cloudkit.service.js               - JS service
src/hooks/useCloudKitSync.js                   - React hook
src/components/Settings.jsx                    - UI controls
```

### Key Functions

```javascript
// Check if sync is available
cloudKitService.checkiCloudStatus();

// Get sync status
cloudKitService.getSyncStatus();

// Sync stats
cloudKitService.syncStats(stats);

// Restore from iCloud
restoreFromiCloud();
```

### CloudKit Dashboard Links

- **Dashboard**: https://icloud.developer.apple.com/dashboard/
- **Schema**: Dashboard → Schema → Record Types
- **Data**: Dashboard → Data (to view records)
- **Logs**: Dashboard → Logs (to debug issues)

## Need Help?

1. **Check docs:**
   - [CLOUDKIT_SCHEMA.md](./CLOUDKIT_SCHEMA.md) - Schema details
   - [CLOUDKIT_IMPLEMENTATION.md](./CLOUDKIT_IMPLEMENTATION.md) - Full docs

2. **Enable logging:**

   ```
   In Xcode scheme: -com.apple.CloudKit.logging.level debug
   ```

3. **Check Console:**
   - Open Console.app
   - Filter: `subsystem:com.apple.cloudkit`

4. **Apple Resources:**
   - CloudKit Documentation: https://developer.apple.com/cloudkit/
   - Developer Forums: https://developer.apple.com/forums/
   - Sample Code: https://developer.apple.com/sample-code/

## Success! 🎉

If you've completed all steps and tests pass, you're ready to deploy!

Your users can now:

- ✅ Sync stats across all their Apple devices
- ✅ Resume puzzles on different devices
- ✅ Restore all data after reinstalling
- ✅ Keep streaks alive across devices

CloudKit sync is fully operational!
