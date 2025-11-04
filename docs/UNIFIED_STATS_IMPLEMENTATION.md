# Unified Statistics Modal - Implementation Plan

**Project:** Tandem Games - Unified Stats System
**Created:** January 2025
**Status:** Planning Phase

---

## Table of Contents
1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Design Specifications](#design-specifications)
4. [Implementation Phases](#implementation-phases)
5. [File Structure](#file-structure)
6. [Component Specifications](#component-specifications)
7. [Data Flow](#data-flow)
8. [Accessibility & Standards](#accessibility--standards)
9. [Testing Checklist](#testing-checklist)
10. [Future Enhancements](#future-enhancements)

---

## Overview

Create a production-ready unified statistics modal that displays stats for both **Tandem Daily** and **Daily Cryptic** games. The modal will be accessible from both games, showing segmented stats with infrastructure to support expandable stat cards (similar to NYT Games app).

### Goals
- ✅ Single modal accessible from both games
- ✅ Display stats for Tandem and Cryptic side-by-side
- ✅ Follow Apple Human Interface Guidelines
- ✅ Mobile game development best practices
- ✅ Production-ready, performant code
- ✅ Future-proof for expandable stat cards
- ✅ **NO changes to existing Tandem stats tracking** (keep CloudKit, Game Center, localStorage as-is)

---

## Current State Analysis

### Tandem Daily Stats (Existing - DO NOT MODIFY)

**Storage Stack:**
- Local: `tandemStats` in localStorage/Capacitor Preferences
- CloudKit: iCloud sync for iOS users
- Game Center: iOS leaderboards (current streak)
- Supabase: Optional server-side tracking (with user consent)

**Stats Tracked:**
```javascript
{
  played: number,           // Total games played
  wins: number,             // Total games won
  currentStreak: number,    // Current consecutive wins
  bestStreak: number,       // Longest streak achieved
  lastStreakDate: string,   // ISO date of last streak
  lastStreakUpdate: number, // Timestamp for race conditions
}
```

**Current Display:**
- Component: `src/components/game/StatsModal.jsx`
- Layout: 2x2 grid (Played, Win Rate, Current Streak, Best Streak) + Total Wins card
- Colors: Blue (Played), Green (Win Rate), Yellow (Current Streak), Pink (Best Streak), Orange (Total Wins)

**Data Loading:**
```javascript
// From storage.js
const stats = await loadStats();
// Returns merged stats from all sources (CloudKit, localStorage, etc.)
```

---

### Daily Cryptic Stats (Existing)

**Storage Stack:**
- Local: `cryptic_stats` in localStorage (via `crypticStorage.js`)
- Supabase: `cryptic_stats` table (individual puzzles) + `cryptic_user_stats` table (aggregates)
- Server-first for authenticated users, local fallback for unauthenticated

**Stats Tracked:**
```javascript
// Local storage (crypticStorage.js)
{
  totalCompleted: number,
  currentStreak: number,
  longestStreak: number,
  totalHintsUsed: number,
  perfectSolves: number,    // Completed without hints
  averageTime: number,       // Seconds
  completedPuzzles: object,  // Date-keyed completion data
}

// Supabase (cryptic_user_stats table)
{
  user_id: UUID,
  total_completed: number,
  current_streak: number,
  longest_streak: number,
  total_hints_used: number,
  perfect_solves: number,
  average_time: number,      // Seconds
  last_played_date: date,
}
```

**Current Display:**
- Component: Stats shown in `CrypticCompleteScreen.jsx` (3 cards: Time, Hints Used, Attempts)
- No dedicated stats modal yet
- Colors: Purple theme to match Daily Cryptic branding

**Data Loading:**
```javascript
// For authenticated users
const response = await crypticService.getAggregateStats();
const stats = response.stats;

// For unauthenticated users (fallback)
const stats = loadCrypticStats(); // from crypticStorage.js
```

---

## Design Specifications

### Visual Design

```
┌─────────────────────────────────────────────────────┐
│  Statistics                                    [×]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  🎮 Tandem Daily                              │ │
│  ├───────────────────────────────────────────────┤ │
│  │  ┌──────────┐ ┌──────────┐                   │ │
│  │  │  Played  │ │ Win Rate │                   │ │
│  │  │    45    │ │   89%    │                   │ │
│  │  └──────────┘ └──────────┘                   │ │
│  │  ┌──────────┐ ┌──────────┐                   │ │
│  │  │  Streak  │ │Best Stk  │                   │ │
│  │  │   7 🔥   │ │    12    │                   │ │
│  │  └──────────┘ └──────────┘                   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  🧩 Daily Cryptic                             │ │
│  ├───────────────────────────────────────────────┤ │
│  │  ┌──────────┐ ┌──────────┐                   │ │
│  │  │Completed │ │  Streak  │                   │ │
│  │  │    23    │ │   5 🔥   │                   │ │
│  │  └──────────┘ └──────────┘                   │ │
│  │  ┌──────────┐ ┌──────────┐                   │ │
│  │  │ Perfect  │ │ Avg Time │                   │ │
│  │  │    8     │ │   2m 34s │                   │ │
│  │  └──────────┘ └──────────┘                   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         Share My Stats                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ⓘ Not signed in? Stats are saved locally only.   │
│     Sign in to sync across devices.                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Apple HIG Compliance

- ✅ **Haptic Feedback:** Light tap on interactions, celebration on achievements
- ✅ **Dark Mode:** Full support with proper contrast ratios
- ✅ **High Contrast Mode:** Accessible color schemes with patterns
- ✅ **Reduce Motion:** Disable animations when user preference is set
- ✅ **Touch Targets:** Minimum 44x44pt tap areas
- ✅ **Safe Areas:** Respect iPhone notch/Dynamic Island
- ✅ **Typography:** Proper font scaling, weight hierarchy
- ✅ **VoiceOver:** ARIA labels, screen reader support

### Mobile Game Best Practices

- ⚡ **Performance:** < 16ms render time, 60fps animations
- 💾 **Offline Support:** All stats work without internet
- 🔄 **Optimistic Updates:** Instant feedback, background sync
- 🛡️ **Data Integrity:** Validation, corruption detection
- 📊 **Analytics Ready:** Track modal opens, stat views
- 🎨 **Consistent Design:** Match existing game aesthetics

---

## Implementation Phases

### Phase 1: Core Components (Week 1)

**Objective:** Build the foundational components and structure

**Tasks:**
1. Create base `UnifiedStatsModal` component
2. Create `StatCard` component (reusable)
3. Create `TandemStatsSection` component
4. Create `CrypticStatsSection` component
5. Set up proper TypeScript/PropTypes
6. Implement responsive layout (mobile-first)

**Deliverables:**
- ✅ Modal opens/closes smoothly
- ✅ Both sections render with mock data
- ✅ Dark mode support
- ✅ High contrast mode support
- ✅ Animations respect reduce motion

---

### Phase 2: Data Integration (Week 1)

**Objective:** Connect components to real data sources

**Tasks:**
1. Integrate Tandem stats loading (use existing `loadStats()`)
2. Integrate Cryptic stats loading (server-first, local fallback)
3. Handle loading states
4. Handle error states
5. Implement data refresh on modal open
6. Add authentication state detection

**Deliverables:**
- ✅ Tandem stats load from existing system (no changes to tracking)
- ✅ Cryptic stats load from Supabase (if auth) or localStorage
- ✅ Loading skeletons display properly
- ✅ Error states show user-friendly messages
- ✅ Stats refresh when modal opens

---

### Phase 3: Share Functionality (Week 1)

**Objective:** Unified sharing across both games

**Tasks:**
1. Create unified share text generator
2. Implement platform-aware sharing (native on iOS, clipboard on web)
3. Add success feedback with haptics
4. Design share text format
5. Add copy-to-clipboard fallback

**Deliverables:**
- ✅ Share button in modal
- ✅ Generates combined stats text
- ✅ Native share sheet on iOS
- ✅ Clipboard copy on web
- ✅ Success feedback ("Copied!")

**Share Text Format:**
```
My Tandem Games Stats 🎮
═══════════════════════

🎮 Tandem Daily
Played: 45 | Win Rate: 89%
Current Streak: 7 🔥

🧩 Daily Cryptic
Completed: 23 | Perfect Solves: 8
Current Streak: 5 🔥

Play at tandemdaily.com
#TandemGames
```

---

### Phase 4: Integration & Polish (Week 2)

**Objective:** Integrate modal into both games, polish UX

**Tasks:**
1. Add modal trigger to Tandem `CompleteScreen`
2. Add modal trigger to Cryptic `CrypticCompleteScreen`
3. Add stats button to both game welcome screens
4. Add stats option to Settings modal
5. Implement haptic feedback throughout
6. Add counter animations (using existing `useCounterAnimation`)
7. Test on all devices (iPhone, iPad, Web)
8. Performance optimization

**Deliverables:**
- ✅ Modal accessible from all entry points
- ✅ Smooth animations throughout
- ✅ Haptic feedback feels polished
- ✅ Works on iOS (native), Web (responsive)
- ✅ Performance benchmarks met

---

### Phase 5: Future-Proofing (Week 2)

**Objective:** Build infrastructure for expandable stats

**Tasks:**
1. Add `onPress` handler to `StatCard` component
2. Create expandable card infrastructure (no implementation yet)
3. Document expansion pattern for future use
4. Add analytics hooks (modal open, stat views)
5. Code documentation and comments

**Deliverables:**
- ✅ StatCard supports `isExpandable` prop
- ✅ Infrastructure ready for future detail views
- ✅ Analytics tracking in place
- ✅ Code fully documented

---

## File Structure

```
src/
├── components/
│   ├── stats/
│   │   ├── UnifiedStatsModal.jsx          [NEW] Main modal component
│   │   ├── TandemStatsSection.jsx         [NEW] Tandem stats display
│   │   ├── CrypticStatsSection.jsx        [NEW] Cryptic stats display
│   │   ├── StatCard.jsx                   [NEW] Reusable stat card
│   │   └── StatsSection.jsx               [NEW] Section wrapper
│   │
│   ├── game/
│   │   ├── StatsModal.jsx                 [DEPRECATE] Old Tandem-only modal
│   │   └── CompleteScreen.jsx             [UPDATE] Add UnifiedStatsModal
│   │
│   └── cryptic/
│       └── CrypticCompleteScreen.jsx      [UPDATE] Add UnifiedStatsModal
│
├── hooks/
│   ├── useUnifiedStats.js                 [NEW] Unified stats loading
│   └── useCrypticGame.js                  [NO CHANGE]
│
├── lib/
│   ├── storage.js                         [NO CHANGE] Keep existing
│   ├── crypticStorage.js                  [NO CHANGE] Keep existing
│   └── unifiedShareText.js                [NEW] Share text generator
│
└── services/
    ├── stats.service.js                   [NO CHANGE] Keep existing
    └── cryptic.service.js                 [NO CHANGE] Keep existing
```

---

## Component Specifications

### 1. UnifiedStatsModal.jsx

**Purpose:** Main modal container that orchestrates both game sections

**Props:**
```javascript
{
  isOpen: boolean,           // Control modal visibility
  onClose: function,         // Close handler
  defaultGame?: string,      // 'tandem' | 'cryptic' (which to highlight)
}
```

**State:**
```javascript
{
  tandemStats: object | null,
  crypticStats: object | null,
  loading: boolean,
  error: string | null,
  showShareSuccess: boolean,
}
```

**Features:**
- Loads stats for both games on mount
- Handles loading/error states
- Manages share functionality
- Respects theme, highContrast, reduceMotion preferences
- Accessible (keyboard navigation, VoiceOver)

---

### 2. StatCard.jsx

**Purpose:** Reusable stat display card with animation

**Props:**
```javascript
{
  value: number | string,    // Stat value to display
  label: string,             // Stat label
  color: string,             // 'blue' | 'green' | 'yellow' | 'pink' | 'orange' | 'purple'
  icon?: string,             // Optional emoji or icon
  isExpandable?: boolean,    // Future: can be tapped for details
  onPress?: function,        // Future: handler for expansion
  animate?: boolean,         // Whether to animate counter (default: true)
}
```

**Features:**
- Animated counter (using `useCounterAnimation`)
- Color-coded backgrounds
- Haptic feedback on press (if expandable)
- Accessibility labels
- High contrast mode support
- Respects reduce motion preference

**Example Usage:**
```jsx
<StatCard
  value={stats.currentStreak}
  label="Current Streak"
  color="yellow"
  icon="🔥"
  animate={!reduceMotion}
/>
```

---

### 3. TandemStatsSection.jsx

**Purpose:** Display Tandem Daily stats in 2x2 grid + total wins

**Props:**
```javascript
{
  stats: object,             // From loadStats()
  loading: boolean,
  error: string | null,
}
```

**Display:**
- Top Row: Played (blue) | Win Rate (green)
- Bottom Row: Current Streak (yellow) | Best Streak (pink)
- Full Width: Total Wins (orange)

**Data Source:**
```javascript
// Uses existing loadStats() function
const stats = await loadStats();
// No changes to existing tracking
```

---

### 4. CrypticStatsSection.jsx

**Purpose:** Display Daily Cryptic stats in 2x2 grid

**Props:**
```javascript
{
  stats: object,             // From crypticService or local
  loading: boolean,
  error: string | null,
  isAuthenticated: boolean,  // Determines data source
}
```

**Display:**
- Top Row: Total Completed (purple) | Current Streak (purple)
- Bottom Row: Perfect Solves (purple) | Average Time (purple)

**Data Source:**
```javascript
// Server-first for authenticated
if (user) {
  const response = await crypticService.getAggregateStats();
  const stats = response.stats;
} else {
  // Local fallback
  const stats = loadCrypticStats();
}
```

---

### 5. StatsSection.jsx

**Purpose:** Wrapper component for game sections

**Props:**
```javascript
{
  title: string,             // e.g., "🎮 Tandem Daily"
  icon?: string,             // Game icon
  children: ReactNode,       // StatCards
  loading?: boolean,
  error?: string,
}
```

**Features:**
- Consistent section styling
- Loading skeleton
- Error display
- Collapsible (future enhancement)

---

## Data Flow

### Loading Sequence

```
User Opens Modal
      ↓
┌─────────────────────────────────────┐
│ UnifiedStatsModal                   │
│ - Set loading = true                │
│ - Call useUnifiedStats hook         │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ useUnifiedStats Hook                │
│                                     │
│ Parallel Load:                      │
│ ├─ loadTandemStats()                │
│ │  └─ loadStats() from storage.js  │
│ │     (existing, no changes)        │
│ │                                   │
│ └─ loadCrypticStats()               │
│    ├─ Check if authenticated        │
│    ├─ YES: crypticService           │
│    │   .getAggregateStats()         │
│    │   (Supabase)                   │
│    └─ NO: loadCrypticStats()        │
│       (localStorage)                │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ Return to Modal                     │
│ - Set stats state                   │
│ - Set loading = false               │
│ - Render sections                   │
└─────────────────────────────────────┘
```

---

### Share Flow

```
User Clicks "Share My Stats"
      ↓
┌─────────────────────────────────────┐
│ Generate Share Text                 │
│ - Format Tandem stats               │
│ - Format Cryptic stats              │
│ - Combine into unified message      │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ Platform Detection                  │
│                                     │
│ ├─ iOS Native App                   │
│ │  └─ Use navigator.share()         │
│ │     (Native share sheet)          │
│ │                                   │
│ └─ Web / Fallback                   │
│    └─ Copy to clipboard             │
│       navigator.clipboard           │
│       .writeText()                  │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ User Feedback                       │
│ - Haptic: lightTap() or success()   │
│ - Visual: "Copied!" message         │
│ - Auto-dismiss after 2s             │
└─────────────────────────────────────┘
```

---

## Accessibility & Standards

### WCAG 2.1 AA Compliance

- ✅ **Color Contrast:** 4.5:1 minimum for text
- ✅ **Focus Indicators:** Visible keyboard focus
- ✅ **Touch Targets:** 44x44pt minimum
- ✅ **Screen Reader:** All content accessible via VoiceOver/TalkBack
- ✅ **Motion:** Respects `prefers-reduced-motion`
- ✅ **Text Scaling:** Supports Dynamic Type

### Apple HIG Mobile Game Standards

**Visual Design:**
- Rounded corners: 32px for modal, 16px for cards
- Border width: 3px for bold, neomorphic style
- Shadows: 6px offset for depth
- Spacing: 16px base unit, 8px for tight spacing

**Interactions:**
- Haptic feedback on all tappable elements
- Smooth 60fps animations
- Instant visual feedback
- Clear state transitions

**Performance:**
- Modal open: < 16ms (60fps)
- Stats load: < 100ms from cache
- Counter animations: 60fps, 800ms duration
- Memory: < 5MB for modal

---

## Testing Checklist

### Functional Testing

- [ ] Modal opens from Tandem CompleteScreen
- [ ] Modal opens from Cryptic CompleteScreen
- [ ] Modal opens from Settings menu
- [ ] Modal opens from game welcome screens
- [ ] Tandem stats load correctly (authenticated)
- [ ] Tandem stats load correctly (unauthenticated)
- [ ] Cryptic stats load from Supabase (authenticated)
- [ ] Cryptic stats load from localStorage (unauthenticated)
- [ ] Loading states display properly
- [ ] Error states display user-friendly messages
- [ ] Share generates correct text
- [ ] Share works on iOS (native sheet)
- [ ] Share works on web (clipboard)
- [ ] Success feedback shows after share
- [ ] Modal closes properly
- [ ] Stats refresh when reopened

### Visual Testing

- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] High contrast mode works
- [ ] Colors match design system
- [ ] Spacing is consistent
- [ ] Typography scales properly
- [ ] Cards align properly
- [ ] Modal is centered on screen
- [ ] Scrolling works on small screens
- [ ] Safe areas respected on iPhone

### Accessibility Testing

- [ ] VoiceOver can navigate modal
- [ ] All buttons have accessible labels
- [ ] Focus order is logical
- [ ] Keyboard navigation works
- [ ] Close button is keyboard accessible
- [ ] Animations disabled with reduce motion
- [ ] High contrast mode readable
- [ ] Touch targets meet 44x44pt minimum
- [ ] Color contrast meets WCAG AA

### Performance Testing

- [ ] Modal opens in < 16ms
- [ ] Stats load in < 100ms (cached)
- [ ] Animations run at 60fps
- [ ] No memory leaks
- [ ] Works offline (local stats)
- [ ] Works with slow network (Supabase)
- [ ] Counter animations smooth
- [ ] No jank during scroll

### Device Testing

- [ ] iPhone SE (small screen)
- [ ] iPhone 15 Pro (Dynamic Island)
- [ ] iPad (tablet layout)
- [ ] Desktop web (Chrome)
- [ ] Desktop web (Safari)
- [ ] Desktop web (Firefox)

---

## Future Enhancements

### Phase 6: Expandable Stats (Post-Launch)

**Concept:** Tap stat card to view detailed breakdown

**Example: Tandem Streak Card Expansion**
```
User Taps "Current Streak" Card
      ↓
Modal Expands to Full Screen
      ↓
┌─────────────────────────────────────┐
│  ← Current Streak Details           │
├─────────────────────────────────────┤
│                                     │
│  Your current streak: 7 days 🔥     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Streak History              │   │
│  │                             │   │
│  │  Jan 15 ✅ Solved           │   │
│  │  Jan 14 ✅ Solved           │   │
│  │  Jan 13 ✅ Solved           │   │
│  │  Jan 12 ✅ Solved           │   │
│  │  Jan 11 ✅ Solved           │   │
│  │  Jan 10 ✅ Solved           │   │
│  │  Jan 9  ✅ Solved           │   │
│  │  Jan 8  ❌ Missed           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Longest streak: 12 days            │
│  Started: Dec 20, 2024              │
└─────────────────────────────────────┘
```

**Implementation:**
- StatCard accepts `isExpandable={true}`
- StatCard accepts `onPress={() => showDetail()}`
- Create detail view components
- Smooth modal-to-fullscreen transition

---

### Phase 7: Achievements & Badges

**Concept:** Award badges for milestones

**Examples:**
- 🔥 "Hot Streak" - 7 day streak
- ⚡ "Lightning Fast" - Complete puzzle in < 1 min
- 🧠 "Genius" - 10 perfect solves (no hints)
- 💯 "Completionist" - 100 puzzles solved

**Implementation:**
- Add achievements to stats display
- Show unlocked badges
- Celebration animation on unlock
- Shareable achievement cards

---

### Phase 8: Leaderboards Integration

**Concept:** Show global rank in stats modal

**Display:**
```
┌─────────────────────────────────────┐
│ 🏆 Leaderboards                     │
├─────────────────────────────────────┤
│ Your Rank: #142 of 10,234          │
│ Top 2% of players                   │
│                                     │
│ [View Full Leaderboard]             │
└─────────────────────────────────────┘
```

**Implementation:**
- Fetch user rank from Game Center / Supabase
- Display in stats modal
- Link to full leaderboard view

---

## Success Metrics

### User Engagement
- **Target:** 60% of completions → view stats
- **Measure:** Track modal opens per game completion

### Share Rate
- **Target:** 15% of stats views → share
- **Measure:** Track share button clicks

### Performance
- **Target:** < 16ms modal open time
- **Measure:** Performance.now() benchmarks

### Retention
- **Target:** Users who view stats have 20% higher 7-day retention
- **Measure:** Cohort analysis

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tandem stats loading fails | High | Graceful error state, retry mechanism |
| Cryptic Supabase down | Medium | Local fallback always available |
| Modal renders slowly | Medium | Lazy load modal, optimize animations |
| Stats out of sync | Low | Show last updated timestamp |
| Share fails on iOS | Low | Clipboard fallback |

### UX Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users confused by dual stats | Medium | Clear section headers, icons |
| Modal too cluttered | Low | Clean design, white space |
| Stats not updating | Medium | Refresh on modal open |
| Animations distracting | Low | Respect reduce motion |

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1:** Core Components | 3 days | Modal structure, StatCard component |
| **Phase 2:** Data Integration | 2 days | Real data loading, error handling |
| **Phase 3:** Share Functionality | 2 days | Unified sharing working |
| **Phase 4:** Integration & Polish | 3 days | All entry points, haptics, testing |
| **Phase 5:** Future-Proofing | 2 days | Expandable infrastructure, docs |
| **Testing & Bug Fixes** | 2 days | Full QA pass |
| **Total** | **2 weeks** | Production-ready unified stats modal |

---

## Sign-Off

### Approved By:
- [ ] Product Owner
- [ ] Design Lead
- [ ] Engineering Lead
- [ ] QA Lead

### Deployment Plan:
1. Merge to `dev` branch
2. Internal testing (1 week)
3. Beta release to TestFlight
4. Monitor for bugs (3 days)
5. Production release

---

## Appendix

### A. Design System Colors

**Tandem Colors:**
- Blue (Played): `bg-accent-blue/20`, `text-accent-blue`
- Green (Win Rate): `bg-accent-green/20`, `text-accent-green`
- Yellow (Streak): `bg-accent-yellow/20`, `text-accent-yellow`
- Pink (Best): `bg-accent-pink/20`, `text-accent-pink`
- Orange (Wins): `bg-accent-orange/20`, `text-accent-orange`

**Cryptic Colors:**
- Purple: `bg-purple-500/20`, `text-purple-600`
- Dark Purple: `bg-purple-900/50`, `text-purple-400` (dark mode)

### B. Animation Timings

- Modal enter: 300ms ease-out
- Modal exit: 200ms ease-in
- Counter animation: 800ms ease-out
- Haptic delay: 50ms after interaction
- Loading skeleton: 1.5s pulse

### C. Keyboard Shortcuts (Future)

- `Cmd+S` / `Ctrl+S`: Open stats modal
- `Esc`: Close modal
- `Tab`: Navigate between sections
- `Enter`: Activate focused element

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Next Review:** After Phase 1 completion
