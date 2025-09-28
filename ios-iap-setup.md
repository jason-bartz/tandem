# iOS In-App Purchase Setup Guide

## Xcode Configuration Steps

1. **Open the iOS project in Xcode:**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Add In-App Purchase Capability:**
   - Select your app target
   - Go to "Signing & Capabilities" tab
   - Click "+ Capability"
   - Add "In-App Purchase"

3. **Configure Entitlements:**
   - The App.entitlements file has been created
   - In Xcode, ensure it's linked to your target:
     - Select your target → Build Settings
     - Search for "Code Signing Entitlements"
     - Set it to: `App/App.entitlements`

## App Store Connect Setup

1. **Create Subscription Group:**
   - Log into App Store Connect
   - Go to your app → In-App Purchases
   - Create a subscription group: "Tandem Plus"

2. **Create Products:**
   Create these exact product IDs:

   **Buddy Pass (Monthly)**
   - Product ID: `com.tandemdaily.app.buddy`
   - Type: Auto-Renewable Subscription
   - Price: $1.99/month

   **Best Friends (Yearly)**
   - Product ID: `com.tandemdaily.app.bestfriends`
   - Type: Auto-Renewable Subscription
   - Price: $14.99/year

   **Soulmates (Lifetime)**
   - Product ID: `com.tandemdaily.app.soulmate`
   - Type: Non-Consumable
   - Price: $29.99

3. **Configure Each Product:**
   - Add display name and description
   - Set pricing for all territories
   - Add review screenshot (can be placeholder for testing)
   - Submit for review when ready

## Testing Configuration

1. **Create Sandbox Test Account:**
   - App Store Connect → Users and Access → Sandbox Testers
   - Create a new test account with a valid email

2. **Configure iOS Device:**
   - Settings → App Store → Sandbox Account
   - Sign in with your sandbox test account

3. **Build and Test:**
   ```bash
   # Build for iOS
   npm run build:ios

   # Open in Xcode
   open ios/App/App.xcworkspace

   # Run on device/simulator
   # Note: IAP only works on real devices, not simulators
   ```

## Testing the Implementation

1. **Launch the app on a real iOS device**
2. **Open the Archive** (📅 button)
3. **Try to access a puzzle older than 5 days**
4. **The paywall should appear with three subscription options**
5. **Test purchase flow** (sandbox purchases are free)
6. **Test restore purchases** (bottom of paywall)
7. **Check Settings** (⚙️ button) for subscription status

## Troubleshooting

- **Products not loading:** Ensure product IDs match exactly
- **Purchases failing:** Check sandbox account is signed in
- **No paywall appearing:** Verify you're on iOS device, not web
- **Restore not working:** Make sure you've made a purchase first

## Important Notes

- Sandbox purchases don't charge real money
- Subscriptions auto-renew every few minutes in sandbox
- Always test on real device, not simulator
- Clear app data between tests if needed