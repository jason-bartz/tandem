# CloudKit Setup & Verification Guide

This guide helps you verify that your CloudKit container and schema are properly configured for Tandem's iCloud sync functionality.

## Prerequisites

- Apple Developer account with CloudKit access
- App ID created in Apple Developer Portal
- Xcode with your project opened

## Step 1: Verify CloudKit Container

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Your App ID (`com.tandemdaily.app`)
4. Verify that **iCloud** capability is enabled
5. Confirm the CloudKit container `iCloud.com.tandemdaily.app` is listed

## Step 2: Access CloudKit Dashboard

1. Go to [CloudKit Dashboard](https://icloud.developer.apple.com/dashboard/)
2. Sign in with your Apple Developer account
3. Select the container: `iCloud.com.tandemdaily.app`
4. Choose **Development** environment for testing (switch to **Production** after app approval)

## Step 3: Create Required Record Types

Your app requires the following record types in CloudKit. Create each one with the specified fields:

### 1. UserStats

Record type for storing user game statistics across devices.

**Fields:**

- `played` - Int64
- `wins` - Int64
- `currentStreak` - Int64
- `bestStreak` - Int64
- `lastStreakDate` - String
- `deviceId` - String (indexed)
- `modifiedAt` - Date/Time

**Indexes:**

- `deviceId` (Queryable)
- `modifiedAt` (Sortable)

### 2. PuzzleResult

Record type for completed puzzle results.

**Fields:**

- `date` - String (indexed)
- `won` - Int64 (0 or 1 for Boolean)
- `mistakes` - Int64
- `solved` - Int64
- `hintsUsed` - Int64
- `theme` - String
- `timestamp` - String
- `deviceId` - String (indexed)

**Indexes:**

- `date` (Queryable, Sortable)
- `deviceId` (Queryable)

### 3. PuzzleProgress

Record type for in-progress puzzle state (for syncing across devices).

**Fields:**

- `date` - String (indexed)
- `started` - Int64 (0 or 1 for Boolean)
- `solved` - Int64
- `mistakes` - Int64
- `hintsUsed` - Int64
- `lastUpdated` - String
- `deviceId` - String (indexed)

**Indexes:**

- `date` (Queryable)
- `deviceId` (Queryable)
- `lastUpdated` (Sortable)

### 4. UserPreferences

Record type for syncing user preferences (theme, sound settings, etc.).

**Fields:**

- `theme` - String
- `themeMode` - String
- `highContrast` - Int64 (0 or 1 for Boolean)
- `sound` - Int64 (0 or 1 for Boolean)
- `deviceId` - String (indexed)
- `modifiedAt` - Date/Time

**Indexes:**

- `deviceId` (Queryable)
- `modifiedAt` (Sortable)

## Step 4: Configure Security Roles (Important!)

For each record type, configure security settings:

1. Click on the record type
2. Go to **Security Roles**
3. Set the following permissions:

**World (Unauthenticated users):**

- Create: No
- Read: No
- Write: No

**Authenticated (Signed-in users):**

- Create: Yes
- Read: Only records created by this user
- Write: Only records created by this user

This ensures users can only access their own data.

## Step 5: Test in Development Environment

1. In Xcode, ensure you're signed in with your Apple ID (Xcode → Preferences → Accounts)
2. Build and run the app on a simulator or device
3. Sign in to iCloud in Settings (simulator may require sandbox account)
4. Launch Tandem and enable iCloud sync in Settings
5. Play a puzzle and check CloudKit Dashboard for new records in Development environment

## Step 6: Deploy to Production

**Important**: Record types must be deployed to Production environment before your app goes live!

1. In CloudKit Dashboard, verify all record types are created correctly in Development
2. Go to **Schema** → **Deploy Schema Changes**
3. Select changes to deploy to Production
4. Click **Deploy**
5. Confirm deployment (this cannot be undone!)

## Verification Checklist

Before submitting to App Store:

- [ ] CloudKit container exists and is associated with App ID
- [ ] All 4 record types created with correct fields
- [ ] Indexes configured for queryable/sortable fields
- [ ] Security roles properly configured
- [ ] Schema deployed to Production environment
- [ ] Tested in Development environment successfully
- [ ] App entitlements file includes correct container identifier
- [ ] Xcode project has CloudKit capability enabled

## Troubleshooting

### "iCloud not available" in app

- Ensure user is signed into iCloud on device
- Verify CloudKit container is in App ID
- Check entitlements file matches container identifier

### Records not syncing

- Verify network connection
- Check CloudKit Dashboard for errors
- Ensure security roles allow user to read/write records
- Verify record type fields match plugin implementation

### "Schema not found" errors

- Deploy schema to Production if app is live
- Use Development environment for TestFlight builds

## Related Documentation

- **[StoreKit Testing Setup](../STOREKIT_TESTING.md)** - Guide for testing in-app purchases locally in Xcode
- **[CloudKit Implementation Details](CLOUDKIT_IMPLEMENTATION.md)** - Technical implementation details
- **[CloudKit Schema Reference](CLOUDKIT_SCHEMA.md)** - Complete schema documentation

## Additional Resources

- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [CloudKit Dashboard](https://icloud.developer.apple.com/dashboard/)
- [Apple Developer Forums - CloudKit](https://developer.apple.com/forums/tags/cloudkit)

## Support

For issues with Tandem's CloudKit implementation, check:

- `ios/App/App/Plugins/CloudKitSyncPlugin.swift` - Native plugin implementation
- `src/services/cloudkit.service.js` - JavaScript service layer
- App logs for CloudKit-related errors
