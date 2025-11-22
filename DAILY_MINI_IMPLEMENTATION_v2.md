# Daily Mini Implementation v2.0

**Project**: Re-implementation of Daily Mini Crossword Game
**Started**: November 17, 2025
**Status**: In Progress - Phase 1
**Current Completion**: 0%

---

## Project Overview

Complete implementation of Daily Mini, a 5×5 crossword puzzle game. This is a from-scratch build following the architecture patterns established by Daily Cryptic and Daily Tandem games.

### Key Requirements
- **Style**: Neo-brutalist with yellow theme (#FFEB3B)
- **Auth**: Free account required (same flow as Daily Cryptic)
- **Subscription**: Daily puzzle free, archive 4-day window, older puzzles require Tandem Unlimited
- **Layout**: Fixed layout with grid, clue bar, and keyboard visible (no scrolling)
- **Accessibility**: High contrast, dark mode, reduce motion support
- **Features**: Timer with start gate, check/reveal actions, stats tracking, leaderboard
- **Admin**: Simple manual crossword editor with calendar management

---

## Implementation Phases

### ✅ Phase 0: Planning & Documentation (COMPLETE)
- [x] Research existing codebase architecture
- [x] Verify integration status (found 0% complete, not 95%)
- [x] Create comprehensive implementation plan
- [x] Get user clarifications on approach
- [x] Create master tracking document

---

### 🔄 Phase 1: Core Game Components (IN PROGRESS)

**Status**: Starting implementation
**Files to Create**: 5 utility/service files

#### 1.1 Game Utilities
- [ ] `/src/lib/miniUtils.js` - Crossword logic
  - Grid coordinate system
  - Clue numbering algorithm
  - Cell navigation (arrow keys, direction switching)
  - Word boundary detection
  - Answer validation
  - Cell state management

#### 1.2 Storage Layer
- [ ] `/src/lib/miniStorage.js` - Three-tier storage
  - Local storage (fast access)
  - Database sync (authenticated users)
  - CloudKit sync (iOS background)
  - Stats calculation (streaks, averages)
  - Merge conflict resolution

#### 1.3 Share Text Generator
- [ ] `/src/lib/miniShareText.js` - Share functionality
  - Grid pattern generation
  - Stats summary formatting
  - Platform-specific share handling

#### 1.4 API Service
- [ ] `/src/services/mini.service.js` - API integration
  - Fetch puzzle by date
  - Fetch puzzle range (archive)
  - Validate solution
  - Save/load stats
  - Error handling

#### 1.5 Game State Hook
- [ ] `/src/hooks/useMiniGame.js` - State management
  - State machine: WELCOME → START → PLAYING → COMPLETE → ADMIRE
  - Timer logic (start, pause, resume, format)
  - Grid state (cells, selected position, direction)
  - User input handling (keyboard + on-screen)
  - Check/reveal logic (square, word, puzzle)
  - Auto-check toggle
  - Stats tracking
  - Persistence and sync

---

### 📋 Phase 2: Game Screens (PENDING)

**Status**: Not started
**Files to Create**: 6 React components

#### 2.1 Grid Component
- [ ] `/src/components/mini/MiniGrid.jsx`

#### 2.2 Clue Bar Component
- [ ] `/src/components/mini/MiniClueBar.jsx`

#### 2.3 Welcome Card
- [ ] `/src/components/mini/MiniWelcomeCard.jsx`

#### 2.4 Start Screen
- [ ] `/src/components/mini/MiniStartScreen.jsx`

#### 2.5 Game Screen
- [ ] `/src/components/mini/MiniGameScreen.jsx`

#### 2.6 Complete Screen
- [ ] `/src/components/mini/MiniCompleteScreen.jsx`

#### 2.7 Main Route
- [ ] `/src/app/dailymini/page.jsx`

---

### 📋 Phase 3: Integration Points (PENDING)

**Status**: Not started
**Files to Update**: 6 existing files

- [ ] `WelcomeScreen.jsx` - Add MiniWelcomeCard
- [ ] `UnifiedArchiveCalendar.jsx` - Add Mini tab
- [ ] `HowToPlayModal.jsx` - Add Mini instructions
- [ ] `UnifiedStatsModal.jsx` - Add Mini stats
- [ ] `support/page.jsx` - Add Mini section
- [ ] `PaywallModal.jsx` - Update benefits text

---

### 📋 Phase 4: Backend & Data (PENDING)

**Status**: Not started
**Files to Create**: 2 API routes + database schema

- [ ] `/src/app/api/mini/puzzle/route.js`
- [ ] `/src/app/api/mini/stats/route.js`
- [ ] Database schema (if not exists)
- [ ] Sample puzzles

---

### 📋 Phase 5: Admin Panel (PENDING)

**Status**: Not started
**Files to Create**: 2 admin components + integration

- [ ] `/src/components/admin/mini/MiniPuzzleCalendar.jsx`
- [ ] `/src/components/admin/mini/MiniPuzzleEditor.jsx`
- [ ] Update `admin/page.jsx`

---

### 📋 Phase 6: Polish & Accessibility (PENDING)

**Status**: Not started
**Tasks**: Testing and refinement

- [ ] High contrast mode verification
- [ ] Dark mode compatibility
- [ ] Reduce motion implementation
- [ ] Responsive design testing
- [ ] Performance optimization

---

### 📋 Phase 7: Testing & Launch (PENDING)

**Status**: Not started
**Tasks**: QA and deployment

- [ ] Complete game flow testing
- [ ] Console log cleanup
- [ ] Production readiness check

---

## File Inventory

### Created Files (0/33)
*None yet*

### Updated Files (0/8)
*None yet*

---

## Design Specifications

### Color Palette
- **Primary Yellow**: `#FFEB3B` (Mini theme color)
- **Blue (Selected Cell)**: `#38b6ff` (same as Tandem theme)
- **Green (Correct)**: `#7ed957` (standard success color)
- **Light Blue (Highlighted)**: Light variant of blue for word highlight
- **Black Borders**: `#000000` (neo-brutalist style)
- **Dark Mode**: Softer variants with reduced shadow opacity

### Neo-Brutalist Styling
```css
/* Card Style */
border-radius: 32px;
border-width: 3px;
box-shadow: 6px 6px 0px rgba(0,0,0,1);

/* Button Style */
border-radius: 20px;
border-width: 3px;
box-shadow: 4px 4px 0px rgba(0,0,0,1);

/* Press Animation */
hover: translate(2px, 2px) + shadow(2px 2px)
active: translate(4px, 4px) + shadow(none)

/* Cell Style */
border-width: 2px;
border-color: black;
```

### Grid Specifications
- **Size**: 5×5 cells
- **Cell Dimensions**: ~40px × 48px (responsive)
- **Black Squares**: Filled with dark color, no input
- **Clue Numbers**: Small, top-left corner of cells
- **Selected State**: Blue background
- **Highlighted State**: Light blue background (rest of word)
- **Correct State**: Green background (persists)

### Clue Bar Specifications
- **Position**: Above keyboard, below grid
- **Display**: "1A: Clue text here" or "1D: Clue text here"
- **Navigation**: Left/right arrows on sides
- **Interaction**: Tap clue to jump to that word
- **Styling**: Same neo-brutalist card style

### Keyboard Specifications
- **Layout**: QWERTY
- **Special Keys**:
  - List icon (public/icons/ui/list.png) - Opens check/reveal menu
  - Backspace
  - No "Enter" key needed for crossword
- **Theme Color**: Yellow (#FFEB3B) for check button
- **Haptic Feedback**: Medium impact on key press

---

## Game Flow State Machine

```
WELCOME (MiniWelcomeCard on main screen)
  ↓ [Play Button]
START (MiniStartScreen with blurred grid)
  ↓ [Start Button - Timer begins]
PLAYING (MiniGameScreen - interactive grid)
  ↓ [Complete puzzle]
COMPLETE (MiniCompleteScreen with stats)
  ↓ [View Archive with date param]
ADMIRE (MiniGameScreen in read-only mode)
```

---

## Authentication & Subscription Flow

### Account Requirements
1. **No Account**: Cannot access Daily Mini at all
2. **Free Account**: Can play daily puzzle + last 3 days (4-day window total)
3. **Tandem Unlimited**: Can play entire archive

### Auth Modal Trigger
```javascript
// On page load for /dailymini
if (!user && !authLoading) {
  showAuthModal = true; // Blocks game
}
```

### Subscription Check
```javascript
// For archive dates older than 4 days
const canAccessPuzzle = (puzzleDate) => {
  const today = new Date();
  const daysOld = (today - puzzleDate) / (1000 * 60 * 60 * 24);
  return daysOld <= 4 || hasSubscription;
};
```

---

## Data Models

### Puzzle Structure
```javascript
{
  id: number,
  date: "2025-11-17",
  number: 123,
  grid: [
    ["T","A","C","O","S"],
    ["A","R","E","A","■"],
    ["C","R","E","A","M"],
    ["O","D","O","R","■"],
    ["■","■","■","■","■"]
  ],
  clues: {
    across: [
      {
        number: 1,
        clue: "Mexican food",
        answer: "TACOS",
        startRow: 0,
        startCol: 0,
        length: 5
      }
    ],
    down: [
      {
        number: 1,
        clue: "Mexican wrap",
        answer: "TACO",
        startRow: 0,
        startCol: 0,
        length: 4
      }
    ]
  },
  solution: {
    // Same as grid but with all correct answers
  }
}
```

### User Stats Structure
```javascript
{
  totalCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageTime: 0, // seconds
  bestTime: 0,
  perfectSolves: 0, // No checks/reveals/mistakes
  totalChecks: 0,
  totalReveals: 0,
  completedPuzzles: {
    "2025-11-17": {
      timeTaken: 120,
      checksUsed: 0,
      revealsUsed: 0,
      mistakes: 0,
      completedAt: "2025-11-17T10:30:00Z",
      isDaily: true,
      perfectSolve: true
    }
  },
  lastPlayedDate: "2025-11-17"
}
```

### Share Text Format
```
Daily Mini #123
2:34 ⏱️
✨ Perfect solve!

Play at tandemgame.com
```

---

## Crossword Logic Algorithms

### Clue Numbering Algorithm
```javascript
// Assign numbers to cells that start across/down words
let clueNumber = 1;
for each cell (row, col) in grid:
  if cell is not black:
    startsAcross = (col === 0 || grid[row][col-1] === black) &&
                   (col < 4 && grid[row][col+1] !== black)
    startsDown = (row === 0 || grid[row-1][col] === black) &&
                 (row < 4 && grid[row+1][col] !== black)

    if startsAcross || startsDown:
      cell.number = clueNumber++
```

### Cell Navigation
```javascript
// Arrow keys move to next cell in current direction
// Across: left/right arrows move horizontally, skip black squares
// Down: up/down arrows move vertically, skip black squares
// Wrapping: if at end, wrap to start of same word

// Auto-advance: after typing letter, move to next cell
// Edge case: if at end of word, stay in place
```

### Check Logic
```javascript
// Check Square: Compare current cell to solution
// Check Word: Compare all cells in current word (across or down) to solution
// Check Puzzle: Compare entire grid to solution

// Visual feedback:
// - Correct: Keep current value, turn cell green
// - Incorrect: Clear cell (or show error animation), add to mistakes count
```

---

## API Endpoints

### GET /api/mini/puzzle
**Query Params**:
- `date` (optional): YYYY-MM-DD format, defaults to today
- `startDate` + `endDate` (optional): For range queries (archive calendar)

**Response**:
```json
{
  "success": true,
  "puzzle": { /* puzzle object */ },
  "puzzles": [ /* array for range queries */ ]
}
```

### POST /api/mini/puzzle/validate
**Body**:
```json
{
  "date": "2025-11-17",
  "grid": [ /* user's grid */ ]
}
```

**Response**:
```json
{
  "success": true,
  "correct": true
}
```

### GET /api/mini/stats
**Auth**: Required
**Response**:
```json
{
  "success": true,
  "stats": { /* user stats object */ }
}
```

### POST /api/mini/stats
**Auth**: Required
**Body**:
```json
{
  "puzzleDate": "2025-11-17",
  "timeTaken": 120,
  "checksUsed": 0,
  "revealsUsed": 0,
  "mistakes": 0,
  "isDaily": true
}
```

---

## Admin Editor Specifications

### Simple Manual Editor (Phase 1)
- 5×5 editable grid
- Click cell to toggle black square
- Type letters directly into cells
- Automatic clue numbering
- Manual clue text entry in form
- Validation:
  - All letters must have associated clues
  - Symmetry warning (optional, not enforced)
  - Minimum word length (2 letters)
- Preview mode
- Save/delete actions

### Future Enhancements (Post-Launch)
- Word database integration
- Auto-suggest as you type
- Auto-fill feature
- Difficulty rating
- Word quality scoring

---

## Testing Checklist

### Functional Testing
- [ ] Complete game flow (welcome → start → play → complete)
- [ ] Timer accuracy (starts, pauses, resumes, displays correctly)
- [ ] Grid interaction (cell selection, direction switching, typing)
- [ ] Clue navigation (arrows, tapping)
- [ ] Check square/word/puzzle logic
- [ ] Reveal square/word/puzzle logic
- [ ] Auto-check toggle
- [ ] Physical keyboard shortcuts
- [ ] On-screen keyboard
- [ ] Stats calculation (including streaks)
- [ ] Stats persistence (local + database + CloudKit)
- [ ] Share text generation and platform sharing
- [ ] Archive access control (4-day window)
- [ ] Subscription paywall
- [ ] Auth modal and flow

### UI/UX Testing
- [ ] Neo-brutalist styling consistent
- [ ] Yellow theme applied correctly
- [ ] Dark mode colors readable
- [ ] High contrast mode accessible
- [ ] Reduce motion disables animations
- [ ] Confetti celebration (when motion enabled)
- [ ] Haptic feedback on interactions
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

### Responsive Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad (tablet)
- [ ] Desktop (1920×1080)
- [ ] No scrolling during gameplay
- [ ] Safe area insets (notch, Dynamic Island)

### Performance Testing
- [ ] Initial load time < 2s
- [ ] No jank when typing
- [ ] Smooth animations (60fps)
- [ ] Efficient re-renders
- [ ] No memory leaks

### Integration Testing
- [ ] Main screen card displays correctly
- [ ] Archive calendar switches to Mini tab
- [ ] How to Play shows Mini instructions
- [ ] Stats modal shows Mini section
- [ ] Support page has Mini content
- [ ] Admin panel loads and functions

---

## Known Issues & Decisions

### Issue Log
*Will be updated as issues arise*

### Design Decisions
1. **Clue Display**: Chose to replace clue list with single-clue bar above keyboard (Ponder Club style) per user preference
2. **Admin Editor**: Starting with simple manual editor, auto-suggest deferred to post-launch
3. **Documentation**: Single master document chosen over multi-file structure
4. **Sample Puzzles**: Will create 2 simple test puzzles as part of implementation

---

## Dependencies & Prerequisites

### Required Assets
- [x] `/public/icons/ui/mini.png` - Mini game logo
- [x] `/public/icons/ui/list.png` - Check/reveal menu icon

### Required Infrastructure
- [x] Authentication system (Supabase)
- [x] Database (PostgreSQL via Supabase)
- [x] Subscription system (useSubscription hook)
- [x] CloudKit service (iOS sync)
- [x] Platform service (native share, haptics)
- [x] Theme context (dark mode, high contrast, reduce motion)

### Existing Patterns to Follow
- [x] Daily Cryptic architecture (auth, subscription, stats)
- [x] Daily Tandem styling (neo-brutalist, confetti)
- [x] OnScreenKeyboard component
- [x] LeftSidePanel component
- [x] GlobalNavigation component

---

## Progress Log

### November 17, 2025
- **10:00 AM**: Project started
- **10:15 AM**: Completed codebase research and planning
- **10:30 AM**: Created master implementation document
- **Next**: Starting Phase 1 - Core game utilities

---

## Notes & Reminders

- No emojis in the UI (game interface, buttons, text)
- Follow Apple HIG for mobile interactions
- Ensure all text has proper contrast ratios (WCAG AA minimum)
- Test with VoiceOver on iOS
- Keep console clean - remove all debug logs before completion
- Update this document after completing each major task
- Take breaks to review code quality and consistency

---

**Last Updated**: November 17, 2025 10:30 AM
**Current Phase**: Phase 1 - Core Game Components
**Next Task**: Create miniUtils.js