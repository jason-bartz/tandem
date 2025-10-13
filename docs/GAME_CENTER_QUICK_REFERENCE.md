# Game Center Quick Reference

Quick commands and IDs for Tandem Daily Game Center implementation.

## Quick Commands

```bash
# Install and sync
npm install @openforge/capacitor-game-connect
npx cap sync

# Open Xcode
npx cap open ios

# Build for iOS
npm run build:ios
npm run cap:sync
```

## All Achievement IDs (Copy-Paste Ready)

### Streak Achievements
```
com.tandemdaily.app.first_pedal
com.tandemdaily.app.finding_rhythm
com.tandemdaily.app.picking_up_speed
com.tandemdaily.app.steady_cadence
com.tandemdaily.app.cruising_along
com.tandemdaily.app.rolling_hills
com.tandemdaily.app.coast_to_coast
com.tandemdaily.app.monthly_rider
com.tandemdaily.app.swift_cyclist
com.tandemdaily.app.starlight_ride
com.tandemdaily.app.seaside_route
com.tandemdaily.app.summit_seeker
com.tandemdaily.app.cross_country
com.tandemdaily.app.century_ride
com.tandemdaily.app.mountain_pass
com.tandemdaily.app.pathfinder
com.tandemdaily.app.coastal_cruiser
com.tandemdaily.app.horizon_chaser
com.tandemdaily.app.grand_tour
com.tandemdaily.app.world_traveler
com.tandemdaily.app.round_the_sun
com.tandemdaily.app.infinite_road
com.tandemdaily.app.legendary_journey
```

### Total Wins Achievements
```
com.tandemdaily.app.first_win
com.tandemdaily.app.getting_hang
com.tandemdaily.app.puzzle_pal
com.tandemdaily.app.clever_cookie
com.tandemdaily.app.brainy_buddy
com.tandemdaily.app.puzzle_whiz
com.tandemdaily.app.word_wizard
com.tandemdaily.app.puzzle_king
```

### Leaderboard ID
```
com.tandemdaily.app.longest_streak
```

## Debugging Commands

### Check Game Center Status
```javascript
// In browser console or Node REPL
import gameCenterService from '@/services/gameCenter.service';

// Check if authenticated
gameCenterService.isAvailable()

// View player ID
gameCenterService.playerId

// Test achievement unlock
gameCenterService.submitAchievement('com.tandemdaily.app.first_pedal')

// Test leaderboard
gameCenterService.submitStreakToLeaderboard(10)
```

### Reset Game Center Data (Testing Only)
```javascript
import gameCenterService from '@/services/gameCenter.service';
await gameCenterService.resetGameCenterData();
```

### View Pending Queue
```javascript
import { Preferences } from '@capacitor/preferences';

// Check pending achievements
const achievements = await Preferences.get({ key: 'tandem_pending_achievements' });
console.log(JSON.parse(achievements.value || '[]'));

// Check pending leaderboard scores
const scores = await Preferences.get({ key: 'tandem_pending_leaderboard' });
console.log(JSON.parse(scores.value || '[]'));
```

## Code Locations

| Feature | File Path |
|---------|-----------|
| Achievement Definitions | `src/lib/achievementDefinitions.js` |
| Achievement Checker Logic | `src/lib/achievementChecker.js` |
| Game Center Service | `src/services/gameCenter.service.js` |
| Stats Integration | `src/services/stats.service.js` |
| Settings UI | `src/components/Settings.jsx` |
| Game Center Button | `src/components/GameCenterButton.jsx` |
| Achievement Toast | `src/components/game/AchievementToast.jsx` |
| Storage Keys | `src/lib/constants.js` |

## Testing Workflow

1. **Setup Sandbox Tester**
   - App Store Connect → Users & Access → Sandbox Testers
   - Create tester with unique email

2. **Device Setup**
   - Settings → Game Center → Sign Out
   - Delete app from device
   - Install fresh build

3. **Test Sequence**
   - Launch app (should auto-authenticate)
   - Complete first puzzle → Check for "First Win" achievement
   - Complete 3 days → Check for "First Pedal" achievement
   - Open Settings → View Game Center buttons
   - Tap "View Achievements" → Verify unlocked achievements
   - Tap "View Leaderboard" → Verify streak submitted

4. **Offline Test**
   - Enable Airplane Mode
   - Complete puzzle (achievement queued)
   - Disable Airplane Mode
   - Wait 10 seconds → Achievement should submit from queue

## Common Issues & Fixes

| Issue | Quick Fix |
|-------|-----------|
| Achievements not showing | Wait 5-10 min for App Store Connect propagation |
| Authentication fails | Verify Game Center capability in Xcode |
| Can't see sandbox achievements | Use sandbox Apple ID, not production |
| Duplicate unlocks | Check `LAST_SUBMITTED_STREAK` and `LAST_SUBMITTED_WINS` values |
| Toast doesn't appear | Check browser console for errors |
| Stats not updating | Verify `stats.bestStreak` and `stats.wins` are correctly tracked |

## App Store Connect URLs

- **Main Dashboard**: https://appstoreconnect.apple.com
- **Tandem App**: https://appstoreconnect.apple.com/apps/YOUR_APP_ID
- **Game Center**: https://appstoreconnect.apple.com/apps/YOUR_APP_ID/gamecenter
- **Sandbox Testers**: https://appstoreconnect.apple.com/access/testers

## Point Totals

- **Streak Achievements**: 1045 points (23 achievements)
- **Wins Achievements**: 395 points (8 achievements)
- **Total**: 1440 points (31 achievements)

## Emoji to Achievement Mapping (for Artwork)

```javascript
const emojiMap = {
  '🔥': 'first_pedal',
  '⭐': 'finding_rhythm',
  '💪': 'picking_up_speed',
  '🎯': 'steady_cadence',
  '🚴': 'cruising_along',
  '⛰️': 'rolling_hills',
  '🌊': 'coast_to_coast',
  '🏆': 'monthly_rider',
  '⚡': 'swift_cyclist',
  '🌟': 'starlight_ride',
  '🏖️': 'seaside_route',
  '🗻': 'summit_seeker',
  '🎖️': 'cross_country',
  '💯': 'century_ride',
  '🦅': 'mountain_pass',
  '🧭': 'pathfinder',
  '🌊': 'coastal_cruiser',
  '🌅': 'horizon_chaser',
  '🌍': 'grand_tour',
  '🌎': 'world_traveler',
  '☀️': 'round_the_sun',
  '🛤️': 'infinite_road',
  '🌟🏆🔥': 'legendary_journey',
  '🎉': 'first_win',
  '👍': 'getting_hang',
  '🧩': 'puzzle_pal',
  '🍪': 'clever_cookie',
  '🧠': 'brainy_buddy',
  '⚡': 'puzzle_whiz',
  '🪄': 'word_wizard',
  '👑': 'puzzle_king',
};
```

---

**Last Updated**: 2025-01-12
