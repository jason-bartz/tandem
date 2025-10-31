# Quick Start: Apple Sign-In Implementation

## 🚀 What Was Built

A unified sign-up + subscription flow for iOS that matches your web experience while following Apple's guidelines.

## ⚡ Quick Setup (5 Steps)

### 1. Xcode Configuration (2 min)

```
Open ios/App/App.xcodeproj
→ App target
→ Signing & Capabilities
→ + Capability
→ Sign in with Apple
→ Done ✅
```

### 2. Apple Developer Portal (2 min)

```
developer.apple.com
→ Certificates, Identifiers & Profiles
→ Identifiers
→ com.tandemdaily.app
→ Edit
→ Enable "Sign in with Apple"
→ Save ✅
```

### 3. Supabase Dashboard (2 min)

```
supabase.com/dashboard
→ Your Project
→ Authentication
→ Providers
→ Apple (toggle ON)
→ Services ID: com.tandemdaily.app
→ Redirect URI: https://tandemdaily.com/auth/callback
→ Save ✅
```

### 4. Database Migration (1 min)

```sql
-- Paste into Supabase SQL Editor
ALTER TABLE subscriptions
ADD COLUMN apple_original_transaction_id TEXT UNIQUE,
ADD COLUMN apple_user_id TEXT;

CREATE INDEX idx_subscriptions_apple_transaction
ON subscriptions(apple_original_transaction_id)
WHERE apple_original_transaction_id IS NOT NULL;

ALTER TABLE users
ADD COLUMN apple_user_id TEXT UNIQUE;

-- Run ✅
```

### 5. Build & Test (5 min)

```bash
# Build for iOS
npm run build:ios

# Sync Capacitor
npm run cap:sync

# Open in Xcode
npm run cap:open

# Upload to TestFlight
# (Archive → Distribute → TestFlight)
```

## ✨ User Experience

### Option A: Sign In First

```
User opens app
  → Hits paywall
  → Sees "Sign in with Apple" card
  → Taps it
  → Native Apple dialog (Face ID)
  → Account created
  → Selects subscription
  → Purchase completes
  → Works on web too! 🎉
```

### Option B: Purchase First

```
User opens app
  → Hits paywall
  → Scrolls down
  → Taps subscription directly
  → Purchase completes (anonymous)
  → Post-purchase prompt:
     "Create account to sync?"
  → User can sign in or skip
  → If signs in → auto-links
```

## 📋 Testing Checklist

### Must Test Before Launch

- [ ] Sign in with Apple button appears on iOS
- [ ] Native Apple dialog appears when tapped
- [ ] Account created in Supabase
- [ ] Purchase with account works
- [ ] Purchase without account works
- [ ] Post-purchase prompt appears
- [ ] Account linking works
- [ ] Subscription syncs to web
- [ ] Restore purchases still works

### Quick Test Script

```
1. Fresh TestFlight install
2. Open app → paywall
3. Tap "Sign in with Apple"
4. Authenticate → should succeed
5. Select Buddy Pass
6. Complete purchase → should succeed
7. Open tandemdaily.com
8. Sign in with same Apple ID
9. Should see active subscription ✅
```

## 🔍 Troubleshooting

### "Sign in with Apple" button not showing

- Check if `user` is already authenticated (won't show if logged in)
- Verify platform is iOS (only shows on iOS)
- Check PaywallModal line ~482

### Apple Sign In fails

- Xcode: Check "Sign in with Apple" capability is enabled
- Apple Portal: Verify capability enabled for App ID
- Supabase: Verify Apple provider enabled

### Purchase won't link to account

- Check user is authenticated before linking
- Verify `/api/iap/link-to-user` endpoint is deployed
- Check server logs for errors
- Look in `subscription_history` table

### Cross-platform sync not working

- Confirm same Apple ID used on both platforms
- Check `subscriptions` table for `apple_original_transaction_id`
- Verify network connectivity
- Check Supabase auth logs

## 📁 Key Files

```
Modified:
- src/contexts/AuthContext.jsx          (Apple Sign In logic)
- src/components/PaywallModal.jsx       (UI with Apple button)
- src/services/iOSSubscriptionService.js (Linking logic)

Created:
- src/components/PostPurchaseAccountPrompt.jsx  (Post-purchase UI)
- src/app/api/iap/link-to-user/route.js        (Backend linking)
- docs/ios_signup_subscription_flow.md         (Full guide)
- docs/apple_iap_linking_migration.md          (DB migration)
```

## 🎯 Success Metrics

Track these in your analytics:

1. **Apple Sign-In Rate:** % of users who tap "Sign in with Apple"
2. **Pre-Purchase Sign-In:** % who sign in BEFORE purchasing
3. **Post-Purchase Link Rate:** % who create account AFTER anonymous purchase
4. **Cross-Platform Usage:** % of subscribers using both iOS + web

## 🆘 Quick Commands

```bash
# View logs
npm run dev  # Watch server logs

# Rebuild iOS
npm run build:ios && npm run cap:sync

# Open Xcode
npm run cap:open

# Check database
# Supabase Dashboard → Table Editor → subscriptions
# Look for apple_original_transaction_id

# Test API endpoint locally
curl -X POST http://localhost:3000/api/iap/link-to-user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"originalTransactionId":"123","productId":"com.tandemdaily.app.buddypass"}'
```

## 🎉 You're Done!

Your iOS app now has:

- ✅ Apple Sign-In
- ✅ Cross-platform subscription sync
- ✅ Optional account creation (Apple compliant)
- ✅ Post-purchase linking
- ✅ Unified web + iOS experience

## 📚 Full Documentation

- **Complete Guide:** [ios_signup_subscription_flow.md](./ios_signup_subscription_flow.md)
- **DB Migration:** [apple_iap_linking_migration.md](./apple_iap_linking_migration.md)
- **Summary:** [IMPLEMENTATION_SUMMARY_APPLE_SIGNIN.md](./IMPLEMENTATION_SUMMARY_APPLE_SIGNIN.md)

---

**Questions?** Check the full docs or contact the dev team.

**Found a bug?** Check the troubleshooting section above first.

**Ready to launch?** Complete the testing checklist and monitor key metrics.
