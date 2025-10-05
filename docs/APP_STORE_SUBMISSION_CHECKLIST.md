# App Store Submission Checklist for Tandem

## 🔴 CRITICAL - Must Complete Before Submission

### CloudKit Setup

- [ ] Log into [CloudKit Dashboard](https://icloud.developer.apple.com/dashboard/)
- [ ] Select container: `iCloud.com.tandemdaily.app`
- [ ] Switch to **Development** environment
- [ ] Create all 4 record types (see [CLOUDKIT_SCHEMA.md](./CLOUDKIT_SCHEMA.md)):
  - [ ] UserStats
  - [ ] PuzzleResult
  - [ ] PuzzleProgress
  - [ ] UserPreferences
- [ ] Configure indexes for all record types
- [ ] Test sync on physical device with Development environment
- [ ] Switch to **Production** environment in Dashboard
- [ ] Deploy schema to Production: "Deploy Schema Changes"
- [ ] Test sync on physical device with Production environment
- [ ] Verify records are created in Production database

### Xcode Project Configuration

- [ ] Open `ios/App/App.xcworkspace` in Xcode
- [ ] Select "App" target
- [ ] Go to "Signing & Capabilities"
- [ ] Verify:
  - [ ] **iCloud** capability is enabled
  - [ ] **CloudKit** is checked
  - [ ] Container `iCloud.com.tandemdaily.app` is selected
  - [ ] **Background Modes** capability is enabled
  - [ ] "Remote notifications" is checked
- [ ] Go to "Build Settings"
- [ ] Search for "Code Signing Entitlements"
- [ ] Verify it points to `Tandem.entitlements`
- [ ] Verify `App.entitlements` file does NOT exist (should be deleted)

### Build & Archive

- [ ] Select "Any iOS Device (arm64)" as build destination
- [ ] Product → Clean Build Folder (Cmd+Shift+K)
- [ ] Product → Archive
- [ ] Wait for archive to complete successfully
- [ ] Verify no build errors or warnings (warnings are OK, but review them)

### Version Numbers

- [ ] Verify `CFBundleShortVersionString` is `1.0.0` in Info.plist
- [ ] Verify `CFBundleVersion` is `1` in Info.plist
- [ ] These match what you'll enter in App Store Connect

---

## 📸 App Store Assets

### Screenshots (REQUIRED)

You need screenshots for these sizes:

#### 6.7" Display (iPhone 14 Pro Max, 15 Pro Max)

- [ ] 5-10 screenshots at 1290 x 2796 pixels
- [ ] Suggested order:
  1. Main game screen with puzzle
  2. Dark mode showcase
  3. Statistics/streaks screen
  4. Archive/calendar view
  5. Completion celebration

#### 6.5" Display (iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max)

- [ ] 5-10 screenshots at 1284 x 2778 pixels
- [ ] Can reuse 6.7" screenshots (App Store will resize)

#### iPad Pro (12.9-inch) - REQUIRED if supporting iPad

- [ ] 5-10 screenshots at 2048 x 2732 pixels
- [ ] Show iPad-optimized layout

#### How to Capture:

- [ ] Run app on device/simulator
- [ ] Navigate to key screens
- [ ] Take screenshots (Cmd+S in simulator)
- [ ] Add text overlays/annotations if desired (optional but recommended)
- [ ] Export as PNG files

### App Icon

- [ ] Verify all icon sizes present in `Assets.xcassets/AppIcon.appiconset/`
- [ ] 1024x1024 App Store icon exists
- [ ] Icon follows Apple Human Interface Guidelines
- [ ] No alpha channels
- [ ] No rounded corners (iOS adds them automatically)

### App Preview Video (Optional but Recommended)

- [ ] 15-30 second video showing gameplay
- [ ] Sizes: 1920x1080 or device-specific
- [ ] MP4 or MOV format
- [ ] No audio narration needed (music OK)

---

## 📝 App Store Connect Setup

### App Information

- [ ] Log into [App Store Connect](https://appstoreconnect.apple.com/)
- [ ] Click "My Apps" → "+" → "New App"
- [ ] Fill in:
  - [ ] **Platform**: iOS
  - [ ] **Name**: Tandem - Daily Emoji Puzzles
  - [ ] **Primary Language**: English (U.S.)
  - [ ] **Bundle ID**: com.tandemdaily.app
  - [ ] **SKU**: com.tandemdaily.app.v1 (or unique identifier)
  - [ ] **User Access**: Full Access

### App Privacy

- [ ] Click "App Privacy" in left sidebar
- [ ] Answer privacy questions:
  - [ ] Do you collect data from this app? **YES**
  - [ ] Data types collected:
    - [ ] **Gameplay Content** - Linked to user (iCloud sync)
    - [ ] **Performance Data** - Not linked to user
- [ ] Save privacy responses

### Pricing and Availability

- [ ] **Price**: Free
- [ ] **Availability**: All territories (or select specific countries)
- [ ] **App Distribution Method**: Public
- [ ] **Pre-orders**: Not applicable for v1.0

### App Information Section

- [ ] **Subtitle**: Daily word puzzles with emoji (30 chars max)
- [ ] **Category**:
  - [ ] Primary: Games
  - [ ] Secondary: Word
- [ ] **Content Rights**: Check if you own/license all content
- [ ] **Age Rating**: Click "Edit" and answer questions
  - [ ] Should result in **4+** rating
- [ ] **Copyright**: © 2025 Good Vibes Games

### Version Information (1.0.0)

- [ ] **Screenshots**: Upload all required sizes
- [ ] **Promotional Text**: (See APP_STORE_MARKETING.md)
- [ ] **Description**: Copy from APP_STORE_MARKETING.md
- [ ] **Keywords**: puzzle,word game,emoji,brain teaser,daily challenge...
- [ ] **Support URL**: https://www.tandemdaily.com/support
- [ ] **Marketing URL**: https://www.tandemdaily.com (optional)
- [ ] **Version**: 1.0.0
- [ ] **Copyright**: © 2025 Good Vibes Games
- [ ] **What's New**: Copy from APP_STORE_MARKETING.md

### App Review Information

- [ ] **Sign-In Required**: No
- [ ] **Contact Information**:
  - [ ] First Name: Jason
  - [ ] Last Name: Bartz
  - [ ] Phone: [Your phone number]
  - [ ] Email: jason@goodvibesgames.com
- [ ] **Demo Account**: Not applicable
- [ ] **Notes** for reviewer:

```
Thank you for reviewing Tandem!

KEY FEATURES TO TEST:
1. Play the daily puzzle (main game screen)
2. View statistics (tap stats icon)
3. Access puzzle archive (tap calendar icon)
4. Test dark mode (tap moon/sun icon)
5. Share results (complete a puzzle, tap share)

iCLOUD SYNC:
- iCloud sync is OPTIONAL and disabled by default
- To test: Settings → iCloud Sync → Enable toggle
- Requires being signed into iCloud on device
- Data syncs across user's Apple devices

SUBSCRIPTIONS:
- Daily puzzle is FREE forever
- Subscriptions unlock full archive access
- Test subscription flow if desired (will not be charged)

The app is family-friendly, privacy-first, and contains no ads.

Thank you!
```

### In-App Purchases (Subscriptions)

- [ ] Click "In-App Purchases" in left sidebar
- [ ] Verify subscriptions are configured:
  - [ ] **Buddy Pass** ($1.99/month) - Product ID: com.tandemdaily.app.buddypass
  - [ ] **Best Friends** ($14.99/year) - Product ID: com.tandemdaily.app.bestfriends
  - [ ] **Soulmates** ($29.99/lifetime) - Product ID: com.tandemdaily.app.soulmates
- [ ] For each subscription:
  - [ ] Add localized names and descriptions
  - [ ] Add subscription group if not already in one
  - [ ] Set pricing for all territories
  - [ ] Add promotional image (1024x1024, optional)
  - [ ] Submit for review

---

## 🧪 Testing Requirements

### Device Testing

Test on physical devices (simulator testing not sufficient):

- [ ] iPhone SE (smallest screen)
- [ ] iPhone 14/15 (standard size)
- [ ] iPhone 14/15 Pro Max (largest screen)
- [ ] iPad (if claiming iPad support)

### iOS Version Testing

- [ ] iOS 14.0 (minimum supported version)
- [ ] iOS 15.x
- [ ] iOS 16.x
- [ ] iOS 17.x (latest)

### Functional Testing

- [ ] App launches successfully
- [ ] Daily puzzle loads correctly
- [ ] Can complete a puzzle
- [ ] Statistics track properly
- [ ] Streak logic works (play multiple days)
- [ ] Archive loads and shows previous puzzles
- [ ] Can replay archive puzzles
- [ ] Dark mode toggle works
- [ ] Sound effects toggle works
- [ ] Share functionality works
- [ ] Settings open and save preferences
- [ ] App works offline (launch, play cached puzzle)
- [ ] App resumes properly from background
- [ ] No crashes during normal use

### iCloud Sync Testing

- [ ] Enable iCloud Sync in Settings
- [ ] Play a puzzle, verify data syncs to CloudKit
- [ ] Check CloudKit Dashboard for new records
- [ ] Open app on second device (signed into same iCloud)
- [ ] Verify stats appear on second device
- [ ] Delete app, reinstall
- [ ] Use "Restore from iCloud" feature
- [ ] Verify all data restored

### Subscription Testing

- [ ] Open paywall (tap subscription prompt)
- [ ] All three tiers display correctly
- [ ] Can initiate purchase flow (don't complete if using real card)
- [ ] "Restore Purchases" works
- [ ] Subscription status shows in Settings
- [ ] Archive unlocks after subscription
- [ ] Can manage subscription (links to App Store)

### Edge Cases

- [ ] Airplane mode (app should work offline)
- [ ] Poor network (app shouldn't crash)
- [ ] iCloud account not signed in (graceful message)
- [ ] Storage almost full (handles errors)
- [ ] Low battery mode (performs well)
- [ ] Interruptions (phone call, notification)
- [ ] App switching (properly suspends/resumes)

### Accessibility Testing

- [ ] VoiceOver enabled (navigate entire app)
- [ ] Dynamic Type (increase font size)
- [ ] High contrast mode toggle
- [ ] Color vision (test with color blind simulators)
- [ ] Voice Control works

---

## 🔒 Privacy & Legal Review

### Privacy Policy

- [ ] Privacy policy accessible at https://www.tandemdaily.com/privacypolicy
- [ ] URL works on mobile devices
- [ ] Content matches app's data collection practices
- [ ] Mentions iCloud sync clearly
- [ ] GDPR/CCPA compliant
- [ ] Last updated date is current

### Terms of Use

- [ ] Terms accessible at https://www.tandemdaily.com/terms
- [ ] URL works on mobile devices
- [ ] Subscription terms clearly stated
- [ ] Refund policy matches Apple's
- [ ] Age requirements stated

### Content Review

- [ ] All puzzle content is appropriate for 4+ rating
- [ ] No offensive language
- [ ] No violent imagery
- [ ] No sexual content
- [ ] No gambling elements
- [ ] No alcohol/drug references

### Third-Party Content

- [ ] Emoji are standard Unicode (no custom emoji)
- [ ] No copyrighted material
- [ ] No trademark violations
- [ ] Own all puzzle content or have license

---

## 📤 Upload & Submit

### Upload Build

- [ ] In Xcode Organizer, select your archive
- [ ] Click "Distribute App"
- [ ] Select "App Store Connect"
- [ ] Select "Upload"
- [ ] Choose signing options (automatic recommended)
- [ ] Upload build (may take 5-30 minutes)
- [ ] Wait for email confirmation that build processed
- [ ] Build appears in App Store Connect under "TestFlight" tab

### TestFlight Beta (Optional but Recommended)

- [ ] In App Store Connect, go to TestFlight tab
- [ ] Add Internal Testers (yourself, team)
- [ ] Invite External Testers (optional)
- [ ] Collect feedback
- [ ] Fix any critical bugs
- [ ] Upload new build if needed

### Final Submission

- [ ] In App Store Connect, go to "App Store" tab
- [ ] Click version "1.0.0"
- [ ] Select build from dropdown
- [ ] Review all information one final time
- [ ] **Export Compliance**:
  - [ ] Does your app use encryption? **NO** (unless you added it)
  - [ ] If YES, answer additional questions
- [ ] Click "Add for Review"
- [ ] Click "Submit for Review"

---

## ⏰ After Submission

### Review Timeline

- Expect 24-48 hours for initial review
- Could be faster or up to 7 days in rare cases
- You'll receive email updates

### Possible Outcomes

#### Approved ✅

- [ ] App goes live automatically or on date you set
- [ ] Share launch announcement
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback

#### Metadata Rejected 📝

- [ ] Fix requested information
- [ ] Resubmit (usually fast re-review)

#### Binary Rejected ❌

- [ ] Read rejection reason carefully
- [ ] Fix issues in code
- [ ] Build new version (increment build number)
- [ ] Upload new build
- [ ] Resubmit for review

### Post-Launch Monitoring

- [ ] Monitor crash reports in App Store Connect
- [ ] Check user reviews daily (first week)
- [ ] Respond to reviews
- [ ] Track download numbers
- [ ] Monitor subscription metrics
- [ ] Check CloudKit usage in Dashboard

---

## 📋 Quick Pre-Submission Validation

Run through this quick checklist right before clicking "Submit":

1. [ ] Build archives successfully with no errors
2. [ ] Test on physical device (not simulator)
3. [ ] iCloud sync works (tested on 2 devices)
4. [ ] All screenshots uploaded (correct sizes)
5. [ ] Privacy policy URL works
6. [ ] Support URL works
7. [ ] Subscriptions configured and visible
8. [ ] App description has no typos
9. [ ] Version number is 1.0.0
10. [ ] Bundle ID matches: com.tandemdaily.app
11. [ ] App icon looks good (no placeholder)
12. [ ] No console.log statements in production
13. [ ] No "TODO" or "FIXME" in critical code
14. [ ] CloudKit schema deployed to Production
15. [ ] Tested with production CloudKit environment

---

## 🆘 Common Rejection Reasons & Fixes

### Rejection: iCloud Not Working

**Fix**: Verify CloudKit schema deployed to Production, test on physical device with production environment

### Rejection: Incomplete Metadata

**Fix**: Double-check all fields in App Store Connect, add missing screenshots

### Rejection: Privacy Policy Issues

**Fix**: Ensure privacy policy matches actual data collection, update privacy manifest

### Rejection: Subscription Issues

**Fix**: Verify subscriptions are configured, add clear descriptions, ensure free content available

### Rejection: Crashes on Launch

**Fix**: Test on older iOS versions and devices, check CloudKit errors are handled gracefully

### Rejection: Missing Features

**Fix**: Ensure core functionality works without subscription, daily puzzle must be free

---

## 📞 Support Resources

### Apple Documentation

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [CloudKit Documentation](https://developer.apple.com/icloud/cloudkit/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Internal Documentation

- [CLOUDKIT_QUICKSTART.md](./CLOUDKIT_QUICKSTART.md) - CloudKit setup guide
- [CLOUDKIT_SCHEMA.md](./CLOUDKIT_SCHEMA.md) - CloudKit schema details
- [APP_STORE_MARKETING.md](./APP_STORE_MARKETING.md) - Marketing content
- [CLOUDKIT_IMPLEMENTATION.md](./CLOUDKIT_IMPLEMENTATION.md) - Technical implementation

### Contact

- **Developer**: jason@goodvibesgames.com
- **App Store Connect**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com/)
- **CloudKit Dashboard**: [icloud.developer.apple.com](https://icloud.developer.apple.com/)

---

## ✅ Final Checklist Before Clicking "Submit"

- [ ] I have tested the app on a physical iOS device
- [ ] I have verified CloudKit sync works in Production
- [ ] I have uploaded all required screenshots
- [ ] I have reviewed all App Store Connect metadata
- [ ] I have read the rejection reasons section
- [ ] I am confident the app is ready for review
- [ ] I understand review may take 24-48 hours
- [ ] I am prepared to respond to reviewer questions

**Ready to submit!** 🚀

---

_Last updated: October 4, 2025_
_App Version: 1.0.0_
_Build: 1_
