# Game Center Setup Guide

Complete guide for implementing and configuring Game Center for Tandem Daily.

## Overview

Tandem Daily includes 31 achievements and 1 leaderboard integrated with Apple Game Center:

- **23 Streak Achievements** - Based on consecutive daily puzzle completions
- **8 Total Wins Achievements** - Based on lifetime puzzle completions
- **1 Leaderboard** - Longest Streak (best streak ever achieved)

## Prerequisites

- Apple Developer Account
- Xcode 14.0 or later
- Physical iOS device for testing (Game Center doesn't work in simulator for all features)
- Tandem app configured in App Store Connect

## Part 1: Xcode Configuration

### Step 1: Open iOS Project

```bash
cd /Users/jasonbartz/Documents/Development\ Projects/Tandem
npx cap open ios
```

### Step 2: Enable Game Center Capability

1. In Xcode, select the **Tandem** target (NOT App)
2. Click on "Signing & Capabilities" tab
3. Click "+ Capability" button
4. Search for and add "**Game Center**"
5. The Game Center capability should now appear in the list
6. No additional configuration needed in the capability itself

### Step 3: Verify Info.plist (Auto-configured)

The Game Center capability automatically configures Info.plist. Verify it contains:

```xml
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>gamekit</string>
</array>
```

### Step 4: Build and Archive

Build the app to ensure no errors:

1. Select "Any iOS Device (arm64)" as the destination
2. Product → Build (⌘B)
3. Verify no Game Center-related errors

## Part 2: App Store Connect Configuration

### Step 1: Access Game Center

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → **Tandem**
3. Click on **Services** in the left sidebar
4. Click on **Game Center**

### Step 2: Create Leaderboard

1. Click "**+**" next to Leaderboards
2. Select "**Classic Leaderboard**"
3. Fill in details:
   - **Leaderboard Reference Name**: Longest Streak
   - **Leaderboard ID**: `com.tandemdaily.app.longest_streak`
   - **Score Format**: Integer
   - **Score Submission Type**: Best Score
   - **Sort Order**: High to Low
   - **Score Range Minimum**: 0
   - **Score Range Maximum**: 10000

4. **Leaderboard Localization** (English - U.S.):
   - **Name**: Longest Streak
   - **Score Format Suffix (Singular)**: day
   - **Score Format Suffix (Plural)**: days

5. **Image**: Upload a 1024x1024px image (cycling/streak theme)

6. Click **Save**

### Step 3: Create Achievements (31 Total)

Click "**+**" next to Achievements and create each achievement with these details:

#### Streak Achievements (23 achievements)

| Achievement ID                          | Name              | Description                | Points | Hidden |
| --------------------------------------- | ----------------- | -------------------------- | ------ | ------ |
| `com.tandemdaily.app.first_pedal`       | First Pedal       | Maintain a 3-day streak    | 5      | NO     |
| `com.tandemdaily.app.finding_rhythm`    | Finding Rhythm    | Maintain a 5-day streak    | 5      | NO     |
| `com.tandemdaily.app.picking_up_speed`  | Picking Up Speed  | Maintain a 7-day streak    | 10     | NO     |
| `com.tandemdaily.app.steady_cadence`    | Steady Cadence    | Maintain a 10-day streak   | 10     | NO     |
| `com.tandemdaily.app.cruising_along`    | Cruising Along    | Maintain a 15-day streak   | 15     | NO     |
| `com.tandemdaily.app.rolling_hills`     | Rolling Hills     | Maintain a 20-day streak   | 15     | NO     |
| `com.tandemdaily.app.coast_to_coast`    | Coast to Coast    | Maintain a 25-day streak   | 20     | NO     |
| `com.tandemdaily.app.monthly_rider`     | Monthly Rider     | Maintain a 30-day streak   | 25     | NO     |
| `com.tandemdaily.app.swift_cyclist`     | Swift Cyclist     | Maintain a 40-day streak   | 25     | NO     |
| `com.tandemdaily.app.starlight_ride`    | Starlight Ride    | Maintain a 50-day streak   | 30     | NO     |
| `com.tandemdaily.app.seaside_route`     | Seaside Route     | Maintain a 60-day streak   | 30     | NO     |
| `com.tandemdaily.app.summit_seeker`     | Summit Seeker     | Maintain a 75-day streak   | 40     | NO     |
| `com.tandemdaily.app.cross_country`     | Cross Country     | Maintain a 90-day streak   | 40     | NO     |
| `com.tandemdaily.app.century_ride`      | Century Ride      | Maintain a 100-day streak  | 50     | NO     |
| `com.tandemdaily.app.mountain_pass`     | Mountain Pass     | Maintain a 125-day streak  | 60     | NO     |
| `com.tandemdaily.app.pathfinder`        | Pathfinder        | Maintain a 150-day streak  | 60     | NO     |
| `com.tandemdaily.app.coastal_cruiser`   | Coastal Cruiser   | Maintain a 175-day streak  | 75     | NO     |
| `com.tandemdaily.app.horizon_chaser`    | Horizon Chaser    | Maintain a 200-day streak  | 75     | NO     |
| `com.tandemdaily.app.grand_tour`        | Grand Tour        | Maintain a 250-day streak  | 80     | NO     |
| `com.tandemdaily.app.world_traveler`    | World Traveler    | Maintain a 300-day streak  | 100    | NO     |
| `com.tandemdaily.app.round_the_sun`     | Round the Sun     | Maintain a 365-day streak  | 100    | NO     |
| `com.tandemdaily.app.infinite_road`     | Infinite Road     | Maintain a 500-day streak  | 100    | NO     |
| `com.tandemdaily.app.legendary_journey` | Legendary Journey | Maintain a 1000-day streak | 100    | NO     |

#### Total Wins Achievements (8 achievements)

| Achievement ID                      | Name                   | Description             | Points | Hidden |
| ----------------------------------- | ---------------------- | ----------------------- | ------ | ------ |
| `com.tandemdaily.app.first_win`     | First Win              | Solve your first puzzle | 5      | NO     |
| `com.tandemdaily.app.getting_hang`  | Getting the Hang of It | Solve 10 puzzles        | 10     | NO     |
| `com.tandemdaily.app.puzzle_pal`    | Puzzle Pal             | Solve 25 puzzles        | 25     | NO     |
| `com.tandemdaily.app.clever_cookie` | Clever Cookie          | Solve 50 puzzles        | 30     | NO     |
| `com.tandemdaily.app.brainy_buddy`  | Brainy Buddy           | Solve 100 puzzles       | 50     | NO     |
| `com.tandemdaily.app.puzzle_whiz`   | Puzzle Whiz            | Solve 250 puzzles       | 75     | NO     |
| `com.tandemdaily.app.word_wizard`   | Word Wizard            | Solve 500 puzzles       | 100    | NO     |
| `com.tandemdaily.app.puzzle_king`   | Puzzle King            | Solve 1000 puzzles      | 100    | NO     |

**Total Points**: ~1395 points across all achievements

### Achievement Fields for Each:

For each achievement above:

1. **Achievement Reference Name**: [Name from table]
2. **Achievement ID**: [ID from table]
3. **Point Value**: [Points from table]
4. **Hidden**: NO (all visible to motivate players)
5. **Achievable More Than Once**: NO

6. **Achievement Localization** (English - U.S.):
   - **Title**: [Name from table]
   - **Pre-earned Description**: [Description from table]
   - **Earned Description**: [Description from table]

7. **Image**: Upload 512x512px PNG (see Artwork section below)

## Part 3: Achievement Artwork

### Emoji-Based Placeholder Artwork (Initial Launch)

For rapid deployment, we're using emoji-based artwork. Create 31 images (512x512px PNG):

#### Tools:

- Figma
- Sketch
- Canva
- Or programmatically with Node.js canvas

#### Specifications:

- **Size**: 512x512px
- **Format**: PNG with transparency
- **Content**: Large emoji centered (Apple applies circular mask)
- **Background**: Gradient matching brand colors (sky-to-teal)
- **Safety Margin**: Keep important content within 400px diameter circle

#### Emoji Mapping:

- 🔥 First Pedal
- ⭐ Finding Rhythm
- 💪 Picking Up Speed
- 🎯 Steady Cadence
- 🚴 Cruising Along
- ⛰️ Rolling Hills
- 🌊 Coast to Coast
- 🏆 Monthly Rider
- ⚡ Swift Cyclist
- 🌟 Starlight Ride
- 🏖️ Seaside Route
- 🗻 Summit Seeker
- 🎖️ Cross Country
- 💯 Century Ride
- 🦅 Mountain Pass
- 🧭 Pathfinder
- 🌊 Coastal Cruiser
- 🌅 Horizon Chaser
- 🌍 Grand Tour
- 🌎 World Traveler
- ☀️ Round the Sun
- 🛤️ Infinite Road
- 🌟🏆🔥 Legendary Journey (combine 3 emojis)
- 🎉 First Win
- 👍 Getting the Hang of It
- 🧩 Puzzle Pal
- 🍪 Clever Cookie
- 🧠 Brainy Buddy
- ⚡ Puzzle Whiz
- 🪄 Word Wizard
- 👑 Puzzle King

### Quick Artwork Generation Script (Optional)

See `scripts/generate-achievement-artwork.js` for automated generation.

## Part 4: Testing

### Sandbox Testing Setup

1. **Create Sandbox Apple ID**:
   - App Store Connect → Users and Access → Sandbox Testers
   - Create new tester with unique email
   - Note: Use + addressing (e.g., `yourname+gc1@gmail.com`)

2. **Configure Device**:
   - Settings → Game Center → Sign Out (if signed in)
   - Build and run app on physical device
   - App will prompt for Game Center login
   - Use sandbox Apple ID credentials

### Testing Checklist

- [ ] App launches without Game Center errors
- [ ] Silent authentication works on launch
- [ ] Achievements unlock when thresholds reached
- [ ] Leaderboard updates with streak values
- [ ] "View Achievements" button works in Settings
- [ ] "View Leaderboard" button works in Settings
- [ ] Achievement toast appears when unlocked
- [ ] Offline queueing works (airplane mode test)
- [ ] Multiple achievements unlock correctly
- [ ] CloudKit sync + Game Center work together

### Common Testing Issues

**Issue**: Achievements not appearing

- **Solution**: Wait 5-10 minutes for App Store Connect to propagate

**Issue**: Authentication fails

- **Solution**: Ensure Game Center capability is properly signed

**Issue**: Sandbox ID doesn't work

- **Solution**: Sign out of production Game Center first

## Part 5: Deployment

### Pre-Release Checklist

- [ ] All 31 achievements created in App Store Connect
- [ ] Leaderboard configured correctly
- [ ] All achievement artwork uploaded (512x512)
- [ ] Tested on TestFlight with sandbox ID
- [ ] Privacy Policy updated to mention Game Center

### Release Process

1. Submit app for review as normal
2. Game Center features automatically go live with app
3. Monitor analytics in App Store Connect → Game Center

### Post-Release

- Achievement unlock rates viewable in App Store Connect
- Leaderboard rankings update in real-time
- Can add more achievements later (up to 100 total)

## Troubleshooting

### Build Errors

**Error**: Game Center capability signing failed

- Ensure provisioning profile includes Game Center

**Error**: GameConnect plugin not found

- Run `npm install && npx cap sync`

### Runtime Errors

**Error**: Authentication fails silently

- Check console logs for detailed error
- Verify Game Center is enabled in Settings app

**Error**: Achievements don't unlock

- Check offline queue in storage
- Verify achievement IDs match exactly

## Support Resources

- [Apple Game Center Documentation](https://developer.apple.com/game-center/)
- [Game Center HIG](https://developer.apple.com/design/human-interface-guidelines/game-center/)
- [capacitor-game-connect](https://github.com/openforge/capacitor-game-connect)

## Future Enhancements

Potential additions for future releases:

- Professional artwork (commission designer)
- Multiplayer challenges
- More achievement types (speed, perfect games, etc.)
- Weekly/monthly leaderboards
- Achievement progress tracking UI

---

**Last Updated**: 2025-01-12
**Document Version**: 1.0
**Status**: Production Ready
