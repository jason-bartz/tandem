# iOS Sign Up + Subscribe Flow - Implementation Guide

## Overview

This document describes the new Apple-compliant sign up and subscription flow for iOS that mirrors the web experience while following Apple's Human Interface Guidelines and App Store Review Guidelines.

## Implementation Summary

We've implemented a **Sign in with Apple + Optional Account Creation** approach that:

- ✅ Complies with Apple HIG (optional, not forced)
- ✅ Matches web's "sign up first" philosophy
- ✅ Maximizes conversion (doesn't require account)
- ✅ Enables cross-platform sync
- ✅ Uses existing infrastructure with minimal changes

## User Flows

### Flow A: Sign In THEN Subscribe (Recommended)

**Best for users who want cross-platform access:**

1. User opens app, plays free puzzles
2. User hits paywall
3. **NEW:** Sees "Sign in with Apple" prompt with benefits:
   - "Access your subscription on all devices"
   - "Sync progress and stats"
   - "Recover subscription if you switch devices"
4. User taps "Sign in with Apple"
5. Native Apple Sign In dialog appears (Face ID/Touch ID)
6. User authenticates
7. Account created in Supabase
8. Subscription options appear
9. User selects subscription tier
10. Apple IAP dialog (Face ID/Touch ID)
11. Purchase completes
12. **Subscription automatically linked to account**
13. User can now access on web/other devices

### Flow B: Purchase THEN Account (Optional Linking)

**Best for quick conversions:**

1. User opens app, plays free puzzles
2. User hits paywall
3. Sees "Sign in with Apple" option
4. User scrolls down to "or continue below without an account"
5. User taps subscription button directly
6. Apple IAP dialog (Face ID/Touch ID)
7. Purchase completes (anonymous)
8. **NEW:** Post-purchase prompt appears:
   - "Thanks for subscribing!"
   - "Create an account to access on all devices"
   - Benefits listed
   - "Sign in with Apple" button
   - "Maybe later" skip option
9. User can:
   - **Option A:** Sign in with Apple → subscription auto-links
   - **Option B:** Skip → can link later in Settings

### Flow C: Existing User Returns

**User already has account on web:**

1. User downloads iOS app
2. Taps "Sign in with Apple" in paywall
3. Authenticates with existing Apple ID
4. **If account exists:** Signed into existing account
5. Subscription status syncs from web
6. User has access to all features

## Technical Architecture

### Components Modified

1. **[AuthContext.jsx](../src/contexts/AuthContext.jsx)**
   - Added `signInWithApple()` method
   - Supports both iOS native and web OAuth
   - Creates Supabase user account

2. **[PaywallModal.jsx](../src/components/PaywallModal.jsx)**
   - Shows "Sign in with Apple" card for unauthenticated iOS users
   - Triggers post-purchase prompt after anonymous purchases
   - Handles account linking on success

3. **[iOSSubscriptionService.js](../src/services/iOSSubscriptionService.js)**
   - New `linkPurchaseToAccount()` method
   - Automatically links purchases when user is authenticated
   - Stores transaction IDs for future linking

4. **[PostPurchaseAccountPrompt.jsx](../src/components/PostPurchaseAccountPrompt.jsx)** (NEW)
   - Shows after anonymous purchases
   - Encourages account creation with benefits
   - "Maybe later" option (non-intrusive)

### API Endpoints Created

1. **POST /api/iap/link-to-user**
   - Links Apple IAP receipt to user account
   - Validates transaction uniqueness
   - Creates subscription record with Apple transaction ID
   - Returns success/error status

2. **GET /api/iap/link-to-user**
   - Checks if user has linked IAP
   - Returns subscription details

### Database Schema Changes

New columns in `subscriptions` table:

```sql
apple_original_transaction_id TEXT UNIQUE -- Apple's unique transaction ID
apple_user_id TEXT                        -- Apple user ID from Sign in with Apple
```

See [apple_iap_linking_migration.md](./apple_iap_linking_migration.md) for full migration guide.

## Configuration Required

### 1. Xcode Configuration

Enable **Sign in with Apple** capability:

1. Open `ios/App/App.xcodeproj` in Xcode
2. Select "App" target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Sign in with Apple"
6. Verify bundle ID matches: `com.tandemdaily.app`

### 2. Apple Developer Portal

1. Go to [developer.apple.com](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles
3. Select your App ID (`com.tandemdaily.app`)
4. Enable "Sign in with Apple"
5. Save changes

### 3. Supabase Configuration

Enable Apple OAuth provider:

1. Go to Supabase Dashboard
2. Authentication → Providers
3. Enable "Apple"
4. Add Services ID: `com.tandemdaily.app`
5. Add redirect URL: `https://tandemdaily.com/auth/callback`
6. Save configuration

### 4. Database Migration

Run the SQL migration from [apple_iap_linking_migration.md](./apple_iap_linking_migration.md):

```bash
# Using Supabase SQL Editor or CLI
supabase migration new apple_iap_linking
# Add SQL from migration doc
supabase db push
```

## Testing Checklist

### Pre-Flight Checks

- [ ] Apple Sign In capability enabled in Xcode
- [ ] Bundle ID matches: `com.tandemdaily.app`
- [ ] Apple OAuth enabled in Supabase
- [ ] Database migration completed
- [ ] Environment variables set (if needed)

### Flow A: Sign In First

- [ ] Open app on iOS TestFlight
- [ ] Navigate to paywall
- [ ] See "Sign in with Apple" card
- [ ] Tap "Sign in with Apple"
- [ ] Native Apple dialog appears
- [ ] Authenticate with Face ID/Touch ID
- [ ] Card disappears, user info appears
- [ ] Select subscription tier
- [ ] Complete purchase
- [ ] Verify subscription is active
- [ ] Sign in on web with same Apple ID
- [ ] Verify subscription status syncs

### Flow B: Purchase Then Account

- [ ] Open app on iOS TestFlight (fresh install)
- [ ] Navigate to paywall
- [ ] Scroll past "Sign in with Apple" card
- [ ] Tap subscription button directly
- [ ] Complete purchase (anonymous)
- [ ] See post-purchase prompt
- [ ] Tap "Sign in with Apple"
- [ ] Authenticate
- [ ] See success message
- [ ] Sign in on web with same Apple ID
- [ ] Verify subscription status syncs

### Flow C: Skip Account Creation

- [ ] Complete Flow B up to post-purchase prompt
- [ ] Tap "Maybe later"
- [ ] Prompt closes
- [ ] Subscription still works in app
- [ ] Reinstall app
- [ ] Tap "Restore Purchase"
- [ ] Subscription restored

### Cross-Platform Sync

- [ ] Subscribe on iOS (with account)
- [ ] Sign out
- [ ] Sign in on web with same Apple ID
- [ ] Verify subscription active on web
- [ ] Play puzzle on web
- [ ] Return to iOS
- [ ] Verify stats synced

### Edge Cases

- [ ] Transaction already linked to different account → returns 409 error
- [ ] Network error during linking → shows error message, doesn't break app
- [ ] User cancels Apple Sign In → returns to paywall gracefully
- [ ] User signs in but doesn't complete purchase → can still purchase later
- [ ] Family Sharing subscription → (future enhancement)

## Monitoring & Analytics

### Key Metrics to Track

1. **Conversion Funnel:**
   - Paywall views
   - "Sign in with Apple" taps
   - Successful sign-ins
   - Purchase completions
   - Post-purchase account creation rate

2. **Account Linking:**
   - Anonymous purchases
   - Post-purchase prompt shown
   - Post-purchase account creation rate
   - Cross-platform sign-ins

3. **Errors:**
   - Apple Sign In failures
   - IAP linking failures (409 conflicts)
   - Network errors during linking

### Log Locations

- `subscription_history` table - All subscription events
- Server logs - API endpoint calls
- iOS console - Client-side errors

### Important Events to Monitor

```javascript
// Track in analytics
{
  event: 'apple_signin_initiated',
  platform: 'ios',
  context: 'paywall' | 'post_purchase'
}

{
  event: 'iap_linked_to_account',
  transaction_id: 'xxx',
  tier: 'buddypass' | 'bestfriends' | 'soulmates',
  flow: 'pre_purchase' | 'post_purchase'
}

{
  event: 'post_purchase_prompt_shown',
  anonymous_purchase: true
}

{
  event: 'post_purchase_account_created',
  success: boolean
}
```

## Rollback Plan

If issues arise:

### Quick Rollback (UI Only)

1. Hide "Sign in with Apple" card in PaywallModal:

   ```jsx
   {/* Temporarily disabled */}
   {false && isIOS && !user && (
     // Apple Sign In card
   )}
   ```

2. Disable post-purchase prompt:
   ```jsx
   setShowPostPurchasePrompt(false); // Always false
   ```

### Full Rollback

1. Revert AuthContext changes
2. Revert PaywallModal changes
3. Revert iOSSubscriptionService changes
4. (Optional) Remove database columns
5. Redeploy

### Database Rollback

See [apple_iap_linking_migration.md](./apple_iap_linking_migration.md) for rollback SQL.

## Support & Troubleshooting

### Common Issues

**"Failed to sign in with Apple"**

- Check Apple Sign In capability in Xcode
- Verify bundle ID matches
- Check Supabase Apple OAuth configuration

**"Failed to link purchase"**

- Check user is authenticated
- Verify transaction ID is valid
- Check for 409 conflicts (already linked)

**"Subscription not syncing across platforms"**

- Verify same Apple ID used on both platforms
- Check subscription linked (query subscriptions table)
- Verify network connectivity

### User Support Script

```
If user reports subscription not syncing:

1. Verify they're signed in with Apple on both platforms
2. Check subscription status on iOS: Settings → Account
3. Try "Restore Purchase" on iOS
4. Check subscription status on web: Account page
5. If issue persists, check subscription_history table for linking errors
```

## Next Steps

After successful deployment:

1. **Iteration 1:** Monitor conversion rates and adjust UI/copy
2. **Iteration 2:** Add analytics to track user behavior
3. **Iteration 3:** Consider adding email sign-in option (requires email field in UI)
4. **Iteration 4:** Add Family Sharing support (Apple IAP feature)
5. **Iteration 5:** Add account linking from Settings (for users who skipped)

## Resources

- [Apple Sign In with Apple Docs](https://developer.apple.com/sign-in-with-apple/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Supabase Apple OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Capacitor Apple Sign In Plugin](https://github.com/capacitor-community/apple-sign-in)

## Questions?

Contact the development team or refer to:

- [apple_iap_linking_migration.md](./apple_iap_linking_migration.md) - Database migration
- [PaywallModal.jsx](../src/components/PaywallModal.jsx) - UI implementation
- [iOSSubscriptionService.js](../src/services/iOSSubscriptionService.js) - IAP logic
