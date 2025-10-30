# Tandem Design Revamp Gameplan

## Overview

Revamping the Tandem game UI to be more refined and minimal, inspired by NYT Games, Apple News Games, and Minute Cryptic.

## Design Goals

- Minimal gradients (replace with flat colors)
- Thicker, bold borders (unified style)
- Pastel colors
- More rounded button shapes
- Faux drop shadow effects (similar to reference screenshot)
- Solid background colors instead of landscape wallpaper

## Color Palette

### Primary Accent Colors (from custom icons)

- Green: `#7ed957`
- Yellow: `#ffce00`
- Pink: `#ff66c4`
- Blue: `#38b6ff`
- Red: `#ff5757`
- Orange: `#ff751f`

### Background Colors

- Light mode: `#ffce00` (yellow)
- Dark mode: TBD (complementary to yellow, likely a dark blue/purple)

## Custom Icons Available

Located in `/public/ui-icons/`:

- `stats.svg` - Statistics icon
- `archive.svg` - Archive/calendar icon
- `how-to-play.svg` - Help/tutorial icon
- `settings.svg` - Settings gear icon
- `tandem-unlimited.svg` - Premium/unlimited feature (replaces sparkle emoji)
- `hardmode.svg` - Hard mode icon (replaces fire emoji)
- `leaderboard.svg` - Leaderboards icon
- `achievements.svg` - Achievements icon
- `hint.svg` - Hint icon (for gameplay)

## Tasks

### Phase 1: Foundation & Colors

- [x] Explore current UI structure and components
- [x] Verify custom UI icons exist
- [ ] Update background colors (light: #ffce00, dark: complementary)
- [ ] Define and update color system in globals.css and tailwind.config.js
- [ ] Replace gradient backgrounds with flat colors

### Phase 2: Icon Replacement

- [ ] Replace stats emoji (📊) with stats.svg in WelcomeScreen
- [ ] Replace archive emoji (📅) with archive.svg in WelcomeScreen
- [ ] Replace how-to-play emoji (❓) with how-to-play.svg in WelcomeScreen
- [ ] Replace settings emoji (⚙️) with settings.svg in WelcomeScreen
- [ ] Replace sparkle emoji (✨) with tandem-unlimited.svg in Settings
- [ ] Replace fire emoji (🔥) with hardmode.svg in Settings
- [ ] Replace leaderboard emoji with leaderboard.svg in Settings
- [ ] Replace achievements emoji with achievements.svg in Settings

### Phase 3: Border & Shape Updates

- [ ] Increase border thickness across all UI elements
- [ ] Update button border-radius for more rounded shapes
- [ ] Ensure consistent border styles (unified design language)

### Phase 4: Shadow & Depth

- [ ] Add faux drop shadow to main game card/container
- [ ] Update modal shadow effects
- [ ] Add subtle depth to buttons and interactive elements

### Phase 5: Accessibility

- [ ] Update high contrast mode with new color palette
- [ ] Ensure colorblind mode works with new flat colors
- [ ] Verify Apple HIG compliance
- [ ] Test focus states and interactive feedback

### Phase 6: Testing

- [ ] Test on all pages (Welcome, Playing, Complete, Archive, Stats, Settings)
- [ ] Test dark mode appearance
- [ ] Test high contrast mode
- [ ] Test on mobile devices (iOS native app)
- [ ] Verify no regressions in functionality

## Files to Update

### Core Styles

- `src/app/globals.css` - Global styles, CSS variables, animations
- `tailwind.config.js` - Tailwind configuration, color palette

### Components (Icon Replacement)

- `src/components/game/WelcomeScreen.jsx` - Top row icons (stats, archive, how-to-play, settings)
- `src/components/Settings.jsx` - Tandem unlimited, hard mode, leaderboard, achievements icons
- `src/components/game/PlayingScreen.jsx` - Possibly hint icon
- `src/components/game/CompleteScreen.jsx` - Share and stats buttons

### Layout Components

- `src/app/layout.js` - Background color changes
- `src/components/game/GameContainer.jsx` - Main container shadow effects

## Notes

- Admin backend is NOT in scope for this revamp
- Maintain all existing functionality (no structural changes)
- Focus on visual/aesthetic improvements only
- Ensure smooth transition for existing users

## Progress Tracking

- **Started:** 2025-10-20
- **Current Phase:** Phase 5 - Finalization
- **Completion Status:** 85%

### Completed Work ✅

✅ Updated color system with new pastel palette in globals.css and tailwind.config.js
✅ Replaced background with solid colors (#ffce00 light, #1a1a2e dark)
✅ Implemented faux drop shadow system (3px/4px/6px offset with solid colors)
✅ Increased border thickness to 3px across UI elements
✅ Replaced all emoji icons in WelcomeScreen with custom SVG icons (stats, archive, how-to-play, settings)
✅ Replaced emoji icons in Settings (unlimited, hard mode, achievements, leaderboard)
✅ Updated all button styles with rounded corners (rounded-2xl, rounded-[20px], rounded-[32px])
✅ Replaced gradients with flat accent colors throughout:

- Pink (#ff66c4) for primary CTAs
- Blue (#38b6ff) for secondary actions
- Green (#7ed957) for success states
- Yellow (#ffce00) for warnings/hints
- Orange (#ff751f) for stats
- Red (#ff5757) for errors
  ✅ Updated Settings modal with new border, shadow, and button styles
  ✅ Updated GameCenterButton with new icon-based design
  ✅ Updated StatsModal with colorful stat cards using accent colors
  ✅ Updated HowToPlayModal with new border and shadow system
  ✅ Updated PuzzleRow component:
- 3px borders on emoji containers and input fields
- Faux drop shadows on all elements
- Flat background colors instead of gradients
- Correct answers: green (#7ed957) with black border
- Wrong answers: red tint (#ff5757/20) with red border
- Hints: yellow tint (#ffce00/20) with yellow border
- Replaced hint emoji (💡) with hint.svg icon
  ✅ Updated high contrast/colorblind mode colors to match new accent palette

### Remaining Work ⏳

⏳ Update PlayingScreen header buttons (optional - low priority)
⏳ Update CompleteScreen design (optional)
⏳ Update OnScreenKeyboard styling (optional)
⏳ Test design across all pages
⏳ Build and verify in browser

### Notes

- Main visual transformation complete (85%)
- Core user-facing components updated with new minimal aesthetic
- All icons replaced, all gradients removed, all borders thickened
- Remaining work is optimization and testing

---

Last updated: 2025-10-20
