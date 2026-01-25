# Element Soup - Implementation Plan

**Version:** 1.2
**Last Updated:** 2026-01-23
**Status:** In Development (Phases 1-7 COMPLETE, Phase 8 Testing pending)

---

## Quick Reference - Key Design Decisions

| Aspect                | Decision                                                  |
| --------------------- | --------------------------------------------------------- |
| **Game Position**     | 3rd game on title screen (between Mini and Reel)          |
| **URL**               | `/element-soup`                                           |
| **Theme Color**       | Green (`soup-green-500: #22c55e`)                         |
| **Background**        | Green tinted (`soup-green-50` / `soup-green-900/20` dark) |
| **Logo**              | `public/icons/ui/element-soup.png` (cauldron icon)        |
| **Starter Elements**  | Earth, Water, Fire, Wind (same every day)                 |
| **Element Emojis**    | 1-3 emojis per element (1 most common)                    |
| **Win Condition**     | Create the daily target element                           |
| **Scoring**           | Time (primary) + Moves (secondary)                        |
| **Par System**        | Yes - admin sets benchmark # of moves                     |
| **First Discoveries** | Tracked globally with user attribution                    |
| **Element Bank**      | SMALL chips (4-col grid), NOT large cards                 |
| **AI Model**          | Claude (existing `ai.service.js`)                         |
| **Cache**             | Redis (Vercel KV) + PostgreSQL                            |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Game Mechanics](#2-game-mechanics)
3. [Database Architecture](#3-database-architecture)
4. [API Routes](#4-api-routes)
5. [AI Integration](#5-ai-integration)
6. [UI/UX Design](#6-uiux-design)
7. [Admin Panel](#7-admin-panel)
8. [Leaderboards & Stats](#8-leaderboards--stats)
9. [First Discovery System](#9-first-discovery-system)
10. [Accessibility](#10-accessibility)
11. [Sound & Haptics](#11-sound--haptics)
12. [File Structure](#12-file-structure)
13. [Implementation Phases](#13-implementation-phases)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Overview

### Game Concept

**Element Soup** is a daily puzzle game inspired by [Infinite Craft](https://neal.fun/infinite-craft/) by Neal Agarwal. Players combine elements to create new elements, starting from four base elements (Earth, Wind, Fire, Water) with the goal of creating a specific target element each day.

### Core Premise

- **Daily Puzzle Format**: Each day features a target element players must create
- **Starting Elements**: Earth, Wind, Fire, Water (same every day)
- **Infinite Possibilities**: AI-powered element combinations allow for unlimited creativity
- **Multiple Paths to Victory**: Many different combination routes can reach the target
- **Par System**: A "par" number of moves provides an aspirational benchmark

### Key Differentiators from Infinite Craft

- **Daily Puzzle Goal**: Specific target element to discover
- **Par System**: Benchmark for optimal play
- **Leaderboards**: Compete on time and moves
- **First Discovery Rewards**: Recognition for discovering new combinations
- **Integrated Stats**: Track progress across sessions

### Position in App

- 3rd game listed on the main title screen (between Daily Mini and Reel Connections)
- URL: `/element-soup`
- Green theme color (complementary to existing blue/yellow/red)

---

## 2. Game Mechanics

### Starting State

```javascript
const STARTER_ELEMENTS = [
  { id: 'earth', name: 'Earth', emoji: '🌍', isStarter: true },
  { id: 'water', name: 'Water', emoji: '💧', isStarter: true },
  { id: 'fire', name: 'Fire', emoji: '🔥', isStarter: true },
  { id: 'wind', name: 'Wind', emoji: '💨', isStarter: true },
];
```

### Element Emoji Rules

- Elements can be represented by **1-3 emojis** (1 is most common)
- Examples:
  - Single emoji: `🌍` Earth, `🔥` Fire, `🌋` Volcano
  - Double emoji: `🧑‍🚀` Astronaut, `🏝️` Island, `⚡🔥` Plasma
  - Triple emoji: `🧙‍♂️✨` Wizard, `🌊🏄‍♂️` Surfing
- AI determines appropriate emoji(s) during combination generation
- Database stores as VARCHAR(30) to accommodate up to 3 emojis with potential modifiers

### Combination Flow

1. Player selects first element from their element bank
2. Player selects second element (can be same element)
3. Elements "combine" with animation
4. Result element appears:
   - If new to player's bank: slides into bank with celebration
   - If already discovered by player: brief acknowledgment animation
   - If first global discovery: special celebration + notification
5. Continue until target element is created

### Win Condition

- Target element appears in player's element bank
- Game complete screen shows:
  - Time taken
  - Number of moves (combinations)
  - Par comparison
  - Share text

### Game States

```javascript
const ELEMENT_SOUP_STATES = {
  WELCOME: 'welcome', // Initial screen with Start button
  PLAYING: 'playing', // Active gameplay
  COMPLETE: 'complete', // Target element found
  ADMIRE: 'admire', // Viewing completed game (archive)
};
```

### Counting Moves

- Each combination attempt counts as 1 move
- Combining the same pair twice still counts as another move
- Only successful combinations count (no "failed" combinations in this game)

### Share Text Format

```
Element Soup Puzzle 1/23/26
⏱️ 2:34
🧮 12 moves (Par: 8)
🏆 First discoveries: 1

tandemdaily.com/element-soup
```

**Notes:**

- Date format: M/D/YY (matches user's local date)
- First discoveries line only shown if count > 0
- Par comparison shows moves vs par value

---

## 3. Database Architecture

### Element Combinations Table (Core)

This is the critical table that stores all discovered element combinations. Based on [research of Infinite Craft's architecture](https://en.wikipedia.org/wiki/Infinite_Craft):

```sql
-- Core combinations table - bidirectional key structure
CREATE TABLE element_combinations (
  id SERIAL PRIMARY KEY,

  -- Normalized key for bidirectional lookup (alphabetically sorted)
  -- e.g., "fire|water" not "water|fire"
  combination_key VARCHAR(255) NOT NULL UNIQUE,

  -- Individual elements (denormalized for query performance)
  element_a VARCHAR(100) NOT NULL,
  element_b VARCHAR(100) NOT NULL,

  -- Result
  result_element VARCHAR(100) NOT NULL,
  result_emoji VARCHAR(30) DEFAULT '✨',  -- Supports 1-3 emojis

  -- Discovery metadata
  discovered_by UUID REFERENCES auth.users(id),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discovery_count INTEGER DEFAULT 1,

  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT TRUE,
  ai_model VARCHAR(50),
  ai_prompt_tokens INTEGER,
  ai_response_tokens INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  use_count INTEGER DEFAULT 1
);

-- Critical index for fast lookups
CREATE INDEX idx_combination_key ON element_combinations(combination_key);
CREATE INDEX idx_result_element ON element_combinations(result_element);
CREATE INDEX idx_discovered_by ON element_combinations(discovered_by);

-- Function to create normalized combination key
CREATE OR REPLACE FUNCTION normalize_combination_key(a TEXT, b TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Alphabetically sort to ensure bidirectional consistency
  IF LOWER(a) <= LOWER(b) THEN
    RETURN LOWER(a) || '|' || LOWER(b);
  ELSE
    RETURN LOWER(b) || '|' || LOWER(a);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Caching Strategy (Vercel KV / Redis)

```javascript
// Cache key patterns
const CACHE_KEYS = {
  // Individual combination results (TTL: 7 days)
  combination: (a, b) => `soup:combo:${normalizeKey(a, b)}`,

  // Popular combinations (TTL: 1 hour)
  popularCombos: 'soup:popular:combos',

  // Today's puzzle (TTL: until midnight)
  dailyPuzzle: (date) => `soup:puzzle:${date}`,

  // User's element bank for current session (TTL: 24 hours)
  userBank: (userId, puzzleDate) => `soup:bank:${userId}:${puzzleDate}`,

  // First discovery claims (TTL: 1 minute - for race condition prevention)
  discoveryLock: (comboKey) => `soup:lock:${comboKey}`,
};

// Normalize key function (JavaScript)
function normalizeKey(a, b) {
  const lower = [a.toLowerCase(), b.toLowerCase()].sort();
  return `${lower[0]}|${lower[1]}`;
}
```

### Daily Puzzles Table

```sql
CREATE TABLE element_soup_puzzles (
  id SERIAL PRIMARY KEY,
  puzzle_number INTEGER NOT NULL UNIQUE,
  date DATE NOT NULL UNIQUE,

  -- Target element
  target_element VARCHAR(100) NOT NULL,
  target_emoji VARCHAR(30) DEFAULT '✨',  -- Supports 1-3 emojis

  -- Par value (minimum moves to create target)
  par_moves INTEGER NOT NULL,

  -- Solution path (for admin reference)
  solution_path JSONB NOT NULL,
  -- Format: [
  --   { step: 1, elementA: "Water", elementB: "Fire", result: "Steam" },
  --   { step: 2, elementA: "Steam", elementB: "Earth", result: "Mud" },
  --   ...
  -- ]

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_soup_puzzle_date ON element_soup_puzzles(date);
```

### User Stats Tables

```sql
-- Per-game results
CREATE TABLE element_soup_game_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_date DATE NOT NULL,
  puzzle_number INTEGER NOT NULL,

  -- Performance metrics
  completed BOOLEAN DEFAULT FALSE,
  time_taken INTEGER, -- seconds
  moves_count INTEGER,
  par_moves INTEGER,

  -- Discovery tracking for this game
  new_discoveries INTEGER DEFAULT 0,
  first_discoveries INTEGER DEFAULT 0,

  -- Completion metadata
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Element bank at completion (for replay/analysis)
  final_element_bank JSONB,

  UNIQUE(user_id, puzzle_date)
);

-- Aggregated user stats
CREATE TABLE element_soup_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Completion stats
  total_completed INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  best_time INTEGER, -- seconds
  average_time INTEGER,

  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_date DATE,

  -- Discovery stats
  total_discoveries INTEGER DEFAULT 0,
  first_discoveries INTEGER DEFAULT 0,

  -- Par performance
  under_par_count INTEGER DEFAULT 0,
  at_par_count INTEGER DEFAULT 0,
  over_par_count INTEGER DEFAULT 0,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### First Discoveries Log

```sql
CREATE TABLE element_soup_first_discoveries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username VARCHAR(100),

  -- The combination that was discovered
  combination_id INTEGER REFERENCES element_combinations(id),
  element_a VARCHAR(100) NOT NULL,
  element_b VARCHAR(100) NOT NULL,
  result_element VARCHAR(100) NOT NULL,
  result_emoji VARCHAR(30),  -- Supports 1-3 emojis

  -- Context
  puzzle_date DATE,
  puzzle_number INTEGER,

  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_first_discovery_user ON element_soup_first_discoveries(user_id);
CREATE INDEX idx_first_discovery_date ON element_soup_first_discoveries(discovered_at);
```

---

## 4. API Routes

### Public Routes

#### GET `/api/element-soup/puzzle`

Fetch today's puzzle or a specific date's puzzle.

```javascript
// Request
GET /api/element-soup/puzzle?date=2024-01-15

// Response
{
  "puzzle": {
    "id": 42,
    "number": 42,
    "date": "2024-01-15",
    "targetElement": "Volcano",
    "targetEmoji": "🌋",
    "parMoves": 8
  },
  "starterElements": [
    { "id": "earth", "name": "Earth", "emoji": "🌍" },
    { "id": "water", "name": "Water", "emoji": "💧" },
    { "id": "fire", "name": "Fire", "emoji": "🔥" },
    { "id": "wind", "name": "Wind", "emoji": "💨" }
  ]
}
```

#### POST `/api/element-soup/combine`

Combine two elements. This is the core gameplay endpoint.

```javascript
// Request
POST /api/element-soup/combine
{
  "elementA": "Fire",
  "elementB": "Water",
  "userId": "uuid" // optional, for first discovery tracking
}

// Response - Cached result
{
  "result": {
    "element": "Steam",
    "emoji": "♨️",
    "isNewToUser": true,
    "isFirstDiscovery": false
  },
  "cached": true
}

// Response - New AI-generated result
{
  "result": {
    "element": "Magma",
    "emoji": "🌋",
    "isNewToUser": true,
    "isFirstDiscovery": true,
    "firstDiscoverer": "PlayerName"
  },
  "cached": false
}
```

**Implementation Notes:**

1. Check Redis cache first (instant response)
2. If not cached, check PostgreSQL
3. If not in DB, call AI to generate result
4. Save to both DB and cache
5. Handle race conditions for first discoveries using Redis locks

### User Routes (Authenticated)

#### POST `/api/element-soup/complete`

Submit game completion.

```javascript
// Request
POST /api/element-soup/complete
{
  "puzzleDate": "2024-01-15",
  "timeTaken": 154, // seconds
  "movesCount": 12,
  "elementBank": ["Earth", "Water", "Fire", "Wind", "Steam", "Mud", ...],
  "newDiscoveries": 3,
  "firstDiscoveries": ["Magma"]
}

// Response
{
  "success": true,
  "stats": {
    "parComparison": "+4", // over par
    "rank": 42, // daily leaderboard position
    "totalFirstDiscoveries": 5 // lifetime
  }
}
```

#### GET `/api/element-soup/stats`

Get user's stats.

```javascript
// Response
{
  "completed": 15,
  "currentStreak": 7,
  "longestStreak": 12,
  "bestTime": 89,
  "averageTime": 145,
  "totalDiscoveries": 234,
  "firstDiscoveries": 12,
  "parStats": {
    "underPar": 3,
    "atPar": 5,
    "overPar": 7
  }
}
```

#### GET `/api/element-soup/discoveries`

Get user's first discovery history.

```javascript
// Response
{
  "discoveries": [
    {
      "element": "Magma",
      "emoji": "🌋",
      "from": ["Fire", "Lava"],
      "discoveredAt": "2024-01-15T10:30:00Z",
      "puzzleNumber": 42
    },
    // ...
  ]
}
```

### Admin Routes

#### GET/POST `/api/admin/element-soup/puzzles`

CRUD operations for puzzles.

#### POST `/api/admin/element-soup/sandbox`

Sandbox mode for testing combinations.

```javascript
// Request - same as /combine but bypasses rate limits
POST /api/admin/element-soup/sandbox
{
  "elementA": "Fire",
  "elementB": "Earth"
}
```

---

## 5. AI Integration

### Element Combination Prompt

Located in: `src/services/ai.service.js`

```javascript
async generateElementCombination(elementA, elementB) {
  const prompt = `You are generating results for an element combination game similar to "Infinite Craft".

TASK: Determine what results from combining these two elements:
Element 1: ${elementA}
Element 2: ${elementB}

RULES:
1. ALWAYS return a result - there are no "failed" combinations
2. Be creative but logical - the result should make intuitive sense
3. Real-world items, concepts, people, places, pop culture, history, science - ALL are fair game
4. NO profanity or offensive content
5. Keep element names concise (1-3 words typically)
6. Choose 1-3 appropriate emojis for the result (1 is most common, use 2-3 only when it enhances representation)

COMBINATION LOGIC EXAMPLES:
- Water + Fire = Steam (physical reaction)
- Earth + Water = Mud (material combination)
- Fire + Earth = Lava (extreme combination)
- Human + Fire = Firefighter (occupation/concept)
- Music + Sadness = Blues (cultural reference)
- Cat + Internet = Meme (pop culture)
- Einstein + Time = Relativity (historical/scientific)

IMPORTANT GUIDELINES:
- Two identical elements can still combine into something new (Fire + Fire = Inferno)
- Abstract concepts can combine (Love + Time = Memory)
- Be playful and creative with unexpected combinations
- Pop culture references are encouraged (Batman + Joker = Gotham)
- Historical figures and events are allowed (Napoleon + Winter = Retreat)

Respond with ONLY a JSON object in this exact format:
{
  "element": "ResultName",
  "emoji": "🔥"  // Can be 1-3 emojis, e.g., "🔥", "⚡🔥", or "🧙‍♂️✨🌟"
}`;

  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: 100,
    temperature: 0.8, // Balance creativity with consistency
    messages: [{ role: 'user', content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

### Rate Limiting & Caching Strategy

```javascript
// Combination lookup flow
async function getCombinationResult(elementA, elementB) {
  const cacheKey = normalizeKey(elementA, elementB);

  // 1. Check Redis cache (fastest)
  const cached = await redis.get(`soup:combo:${cacheKey}`);
  if (cached) {
    return { ...JSON.parse(cached), cached: true };
  }

  // 2. Check PostgreSQL
  const dbResult = await db.query('SELECT * FROM element_combinations WHERE combination_key = $1', [
    cacheKey,
  ]);

  if (dbResult.rows.length > 0) {
    const result = dbResult.rows[0];
    // Cache for next time
    await redis.setex(`soup:combo:${cacheKey}`, 604800, JSON.stringify(result)); // 7 days
    return { ...result, cached: false };
  }

  // 3. Generate via AI
  const aiResult = await aiService.generateElementCombination(elementA, elementB);

  // 4. Save to DB
  await db.query(
    `
    INSERT INTO element_combinations
    (combination_key, element_a, element_b, result_element, result_emoji, ai_generated)
    VALUES ($1, $2, $3, $4, $5, true)
  `,
    [cacheKey, elementA, elementB, aiResult.element, aiResult.emoji]
  );

  // 5. Cache result
  await redis.setex(`soup:combo:${cacheKey}`, 604800, JSON.stringify(aiResult));

  return { ...aiResult, cached: false, isNew: true };
}
```

### Concurrency Handling

For handling many concurrent players discovering the same combination:

```javascript
async function getCombinationWithLock(elementA, elementB) {
  const cacheKey = normalizeKey(elementA, elementB);
  const lockKey = `soup:lock:${cacheKey}`;

  // Try to acquire lock (1 minute TTL)
  const acquired = await redis.set(lockKey, '1', 'EX', 60, 'NX');

  if (!acquired) {
    // Another request is processing this - wait and retry
    await sleep(100);
    return getCombinationResult(elementA, elementB);
  }

  try {
    return await getCombinationResult(elementA, elementB);
  } finally {
    await redis.del(lockKey);
  }
}
```

---

## 6. UI/UX Design

### Color Theme

```javascript
// tailwind.config.js addition
colors: {
  'soup-green': {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Primary
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  }
}
```

### Game Screen Layout (Based on Mockup)

Reference mockup shows the following layout:

```
┌─────────────────────────────────────────────┐
│  [←]    Element Soup                   [≡]  │  <- Header with nav
├─────────────────────────────────────────────┤
│         Friday, January 23rd                │  <- Date display
│          Element Soup                       │  <- Title (centered)
├─────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │  ⏱️ 1:20   🧮 14  │  │  🚀 TARGET     │ │  <- Stats + Target
│  │   Time    Moves  │  │    Rocket      │ │     (target in blue pill)
│  └──────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │   ┌──────────┐ + ┌──────────┐      │   │  <- Combination area
│  │   │   ⚙️     │   │   🌍     │      │   │     (bordered container)
│  │   │  Engine  │   │  Earth   │      │   │
│  │   └──────────┘   └──────────┘      │   │
│  │                                     │   │
│  │   [   Clear   ]  [  Combine  ]     │   │  <- Action buttons
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  ELEMENT BANK        [Sort: Newest ▼]      │  <- Bank header
│  [🔍 Search elements...]                    │  <- Search field
├─────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │🌍Earth │ │💧Water │ │🔥Fire  │ │💨Wind  ││  <- Element chips
│  └────────┘ └────────┘ └────────┘ └────────┘│     (SMALL - 4 cols)
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │♨️Steam │ │⚙️Engine│ │🌊Ocean │ │🪨Stone ││
│  └────────┘ └────────┘ └────────┘ └────────┘│
│  ... scrollable for hundreds of elements    │
└─────────────────────────────────────────────┘
```

**Critical Design Notes (from mockup feedback):**

1. Element bank chips must be SMALL (~40px height) - mockup shows them too large
2. Use 6-column grid for element bank to fit many elements
3. Search field is essential for finding elements in large banks
4. Target element displayed as prominent blue pill/badge on right
5. Stats (Time/Moves) displayed in bordered container on left
6. Combination area has its own bordered container with two selection slots
7. Background should be GREEN (soup-green-100) not white

### Element Bank Design

**IMPORTANT: Elements must be SMALL chips, not large cards like in mockup**

```jsx
// Element Chip - approximately 80-100px wide, 36-40px tall
<div
  className="
  inline-flex items-center gap-1.5
  px-2.5 py-1.5
  bg-white dark:bg-gray-800
  border-[2px] border-black dark:border-gray-600
  rounded-lg
  shadow-[2px_2px_0px_rgba(0,0,0,1)]
  text-sm font-medium
  cursor-pointer
  hover:translate-y-[-1px]
  active:translate-y-0 active:shadow-none
  transition-all
"
>
  <span className="text-base">{emoji}</span>
  <span className="truncate max-w-[60px]">{name}</span>
</div>
```

**Layout Specifications:**

- **Grid**: 6 columns on mobile, 8-10 on tablet/desktop
- **Chip size**: ~80-100px wide, 36-40px tall
- **Gap**: 8px between chips
- **Container**: Max height ~300px, scrollable
- **Virtual scroll**: Required for 100+ elements (use react-window or similar)

**Sort Options:**

- Newest first (default) - most recently discovered at top
- Alphabetical A-Z

**Search Functionality:**

- Search field above grid
- Filters in real-time as user types
- Placeholder: "Search elements..."
- Clear button when text entered

**Tap Behavior:**

- Single tap adds to next empty combination slot
- If both slots full, replaces the most recently selected
- Visual feedback: brief scale animation

**Visual States:**
| State | Appearance |
|-------|------------|
| Normal | White bg, black border, subtle shadow |
| Selected | Blue bg highlight, in combination slot |
| Hover | Slight lift (-1px Y translation) |
| New (this session) | Green pulse animation, "NEW" micro-badge |
| Target element | Gold/yellow border + glow when discovered |
| Disabled | Grayed out (N/A for this game) |

### Component Specifications (from Mockup)

#### Stats Bar + Target Display

```jsx
// Stats and Target row - flex container
<div className="flex items-stretch gap-3">
  {/* Stats Container */}
  <div
    className="
    flex-1 flex items-center justify-center gap-6
    py-3 px-4
    bg-white dark:bg-gray-800
    border-[3px] border-black dark:border-gray-600
    rounded-2xl
    shadow-[3px_3px_0px_rgba(0,0,0,1)]
  "
  >
    <div className="text-center">
      <div className="text-xl font-bold">{formatTime(time)}</div>
      <div className="text-xs text-gray-500">Time</div>
    </div>
    <div className="text-center">
      <div className="text-xl font-bold">{moves}</div>
      <div className="text-xs text-gray-500">Moves</div>
    </div>
  </div>

  {/* Target Display - Blue Pill */}
  <div
    className="
    flex items-center gap-2
    py-3 px-4
    bg-soup-green-500 text-white
    border-[3px] border-black
    rounded-2xl
    shadow-[3px_3px_0px_rgba(0,0,0,1)]
  "
  >
    <span className="text-2xl">{targetEmoji}</span>
    <div>
      <div className="text-xs font-medium opacity-80">TARGET</div>
      <div className="font-bold">{targetElement}</div>
    </div>
  </div>
</div>
```

#### Combination Area

```jsx
// Combination container with bordered area
<div
  className="
  p-4
  bg-soup-green-50 dark:bg-soup-green-900/20
  border-[3px] border-black dark:border-gray-600
  rounded-2xl
  shadow-[4px_4px_0px_rgba(0,0,0,1)]
"
>
  {/* Selection Slots */}
  <div className="flex items-center justify-center gap-4 mb-4">
    {/* Slot A */}
    <div
      className={`
      w-28 h-28
      flex flex-col items-center justify-center
      bg-white dark:bg-gray-800
      border-[3px] ${selectedA ? 'border-soup-green-500 bg-soup-green-100' : 'border-black border-dashed'}
      rounded-xl
      transition-all
    `}
    >
      {selectedA ? (
        <>
          <span className="text-3xl mb-1">{selectedA.emoji}</span>
          <span className="text-sm font-medium">{selectedA.name}</span>
        </>
      ) : (
        <span className="text-gray-400 text-sm">Select</span>
      )}
    </div>

    {/* Plus Sign */}
    <span className="text-2xl font-bold text-gray-400">+</span>

    {/* Slot B */}
    <div
      className={`
      w-28 h-28
      flex flex-col items-center justify-center
      bg-white dark:bg-gray-800
      border-[3px] ${selectedB ? 'border-soup-green-500 bg-soup-green-100' : 'border-black border-dashed'}
      rounded-xl
      transition-all
    `}
    >
      {selectedB ? (
        <>
          <span className="text-3xl mb-1">{selectedB.emoji}</span>
          <span className="text-sm font-medium">{selectedB.name}</span>
        </>
      ) : (
        <span className="text-gray-400 text-sm">Select</span>
      )}
    </div>
  </div>

  {/* Action Buttons */}
  <div className="flex gap-3">
    <button
      className="
      flex-1 py-3
      bg-gray-200 dark:bg-gray-700
      border-[3px] border-black dark:border-gray-600
      rounded-xl font-bold
      shadow-[3px_3px_0px_rgba(0,0,0,1)]
      hover:translate-y-[-1px] active:translate-y-0 active:shadow-none
      transition-all
    "
    >
      Clear
    </button>
    <button
      className="
      flex-1 py-3
      bg-soup-green-500 text-white
      border-[3px] border-black
      rounded-xl font-bold
      shadow-[3px_3px_0px_rgba(0,0,0,1)]
      hover:translate-y-[-1px] active:translate-y-0 active:shadow-none
      transition-all
      disabled:opacity-50 disabled:cursor-not-allowed
    "
      disabled={!selectedA || !selectedB}
    >
      Combine
    </button>
  </div>
</div>
```

#### Element Bank Header

```jsx
<div className="flex items-center justify-between mb-2">
  <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 dark:text-gray-400">
    Element Bank
  </h3>
  <select
    className="
    px-3 py-1.5
    bg-white dark:bg-gray-800
    border-[2px] border-black dark:border-gray-600
    rounded-lg text-sm font-medium
    shadow-[2px_2px_0px_rgba(0,0,0,1)]
  "
  >
    <option value="newest">Sort: Newest</option>
    <option value="alpha">Sort: A-Z</option>
  </select>
</div>;

{
  /* Search Field */
}
<div className="relative mb-3">
  <input
    type="text"
    placeholder="Search elements..."
    className="
      w-full px-4 py-2 pl-10
      bg-white dark:bg-gray-800
      border-[2px] border-black dark:border-gray-600
      rounded-xl text-sm
      shadow-[2px_2px_0px_rgba(0,0,0,1)]
      focus:outline-none focus:ring-2 focus:ring-soup-green-500
    "
  />
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
</div>;
```

### Combination Animation Sequence

```javascript
const COMBINATION_ANIMATION = {
  // 1. Elements move toward each other
  approach: {
    duration: 300,
    easing: 'easeInQuad',
  },

  // 2. Elements "wobble/jiggle" as they collide
  collision: {
    duration: 200,
    keyframes: [
      { transform: 'rotate(-5deg) scale(1.1)' },
      { transform: 'rotate(5deg) scale(1.1)' },
      { transform: 'rotate(-3deg) scale(1.05)' },
      { transform: 'rotate(0deg) scale(1)' },
    ],
  },

  // 3. Flash/burst effect
  burst: {
    duration: 150,
    scale: 1.5,
    opacity: [1, 0],
  },

  // 4. Result element appears
  reveal: {
    duration: 400,
    easing: 'easeOutBack',
    scale: [0, 1.2, 1],
  },

  // 5. Slides to element bank (if new)
  addToBank: {
    duration: 500,
    easing: 'easeInOutQuad',
  },
};
```

### Visual States for Discoveries

1. **New to Player (this session)**:
   - Subtle green pulse animation
   - "NEW" badge briefly visible

2. **Existing (already in bank)**:
   - Brief shake animation
   - No celebration

3. **First Discovery (globally first)**:
   - Confetti burst
   - Special sound effect
   - Toast notification: "🎉 First Discovery! You discovered [Element]!"
   - Element gets special border/glow

### Skeleton Loading State

```jsx
function ElementSoupSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Target area skeleton */}
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />

      {/* Combination area skeleton */}
      <div className="flex justify-center gap-4 mb-4">
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="w-8 h-24 flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4 mx-auto w-40" />

      {/* Element bank skeleton */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 w-32" />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Admin Panel

### Game Selector Modal Update

Add Element Soup to the `GAMES` array in `src/components/admin/GameSelectorModal.jsx`:

```javascript
const GAMES = [
  // ... existing games
  {
    id: 'soup',
    name: 'Element Soup',
    description: 'Element combination puzzle',
    icon: '/icons/ui/element-soup.png',
    color: 'accent-green',
    bgColor: 'bg-accent-green/20',
    borderColor: 'border-accent-green',
  },
];
```

### Puzzle Editor Features

Create `src/app/admin/element-soup/page.jsx`:

1. **Target Element Selector**:
   - Search existing elements or type new one
   - Preview emoji

2. **Sandbox Mode**:
   - Full game environment for testing
   - Can combine elements to reach target
   - Tracks number of moves taken

3. **Par Calculator**:
   - After reaching target, set par value
   - Option to record the solution path

4. **Publish Controls**:
   - Save as draft
   - Publish to specific date
   - Preview share text

### Admin Sandbox Layout

```
┌─────────────────────────────────────────────────┐
│  Element Soup - Puzzle Creator                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Target Element:  [Volcano 🌋        ] [Change] │
│  Date:           [2024-01-20         ] 📅       │
│  Par Moves:      [___] (auto-calculated)        │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  SANDBOX MODE                                   │
│  ────────────────────                           │
│  [Full game interface here - same as player]   │
│                                                 │
│  Current Moves: 7                               │
│  Path: Water + Fire → Steam → Steam + Earth... │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Reset Sandbox]  [Save Path]  [Set as Par]    │
│                                                 │
│  [Save Draft]              [Publish Puzzle]    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 8. Leaderboards & Stats

### Daily Leaderboard

Ranked by time, with moves as tiebreaker.

```javascript
// Leaderboard entry structure
{
  rank: 1,
  userId: 'uuid',
  username: 'PlayerName',
  time: 89, // seconds
  moves: 6,
  parDiff: -2, // 2 under par
  firstDiscoveries: 1,
  completedAt: '2024-01-15T10:30:00Z'
}
```

### Streak Leaderboard

Same structure as other games:

```javascript
{
  rank: 1,
  userId: 'uuid',
  username: 'PlayerName',
  currentStreak: 45,
  longestStreak: 45
}
```

### Stats Modal Additions

Add Element Soup tab to `UnifiedStatsModal`:

- Total completed
- Current/longest streak
- Best time
- Average moves
- Par performance (under/at/over)
- Total discoveries
- First discoveries

---

## 9. First Discovery System

### Discovery Flow

```javascript
async function handleCombination(elementA, elementB, userId) {
  const cacheKey = normalizeKey(elementA, elementB);

  // Check if this combination exists
  const existing = await getExistingCombination(cacheKey);

  if (existing) {
    return {
      ...existing,
      isFirstDiscovery: false,
      isNewToUser: !userHasDiscovered(userId, existing.result),
    };
  }

  // New combination - generate via AI
  const result = await aiService.generateElementCombination(elementA, elementB);

  // Save combination
  const combo = await saveCombination({
    cacheKey,
    elementA,
    elementB,
    result: result.element,
    emoji: result.emoji,
    discoveredBy: userId,
  });

  // Log first discovery
  await logFirstDiscovery({
    userId,
    combinationId: combo.id,
    elementA,
    elementB,
    result: result.element,
    emoji: result.emoji,
    puzzleDate: getCurrentPuzzleDate(),
  });

  return {
    ...result,
    isFirstDiscovery: true,
    isNewToUser: true,
  };
}
```

### First Discovery Notification

```jsx
function FirstDiscoveryToast({ element, emoji }) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="bg-gradient-to-r from-yellow-400 to-orange-400
                      text-white px-6 py-3 rounded-2xl
                      border-[3px] border-black shadow-[4px_4px_0px_#000]
                      flex items-center gap-3"
      >
        <span className="text-2xl">🎉</span>
        <div>
          <div className="font-bold">First Discovery!</div>
          <div className="text-sm">
            You discovered {emoji} {element}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

### Discovery History Page

Add to user profile or stats:

- List of all first discoveries
- Filter by date range
- Sort by date or alphabetically
- Share individual discoveries

---

## 10. Accessibility

### High Contrast Mode

```jsx
// Element chip in high contrast mode
className={highContrast
  ? 'bg-hc-surface border-hc-border text-hc-text'
  : 'bg-soup-green-100 dark:bg-soup-green-900 border-soup-green-500'}
```

### Reduced Motion

```javascript
const { reduceMotion } = useTheme();

// Skip animations if reduced motion enabled
if (!reduceMotion) {
  await playCombinationAnimation();
}

// Simplified transition for reduced motion
className={reduceMotion
  ? 'transition-none'
  : 'transition-all duration-300'}
```

### Screen Reader Support

```jsx
<button
  aria-label={`Combine ${selectedA?.name || 'nothing'} with ${selectedB?.name || 'nothing'}`}
  aria-disabled={!selectedA || !selectedB}
>
  Combine!
</button>

<div
  role="region"
  aria-label="Element bank"
  aria-describedby="element-count"
>
  <span id="element-count" className="sr-only">
    {elements.length} elements available
  </span>
  {/* Element chips */}
</div>
```

### Keyboard Navigation

- Tab through element bank
- Enter/Space to select element
- Arrow keys to navigate within bank
- Escape to deselect

---

## 11. Sound & Haptics

### New Sound Effects

Add to `src/lib/sounds.js`:

```javascript
// Combination success sound - bubbling/magical
export function playCombineSound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Bubbling effect
  for (let i = 0; i < 5; i++) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400 + i * 100, currentTime + i * 0.05);

    gain.gain.setValueAtTime(0, currentTime + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.1, currentTime + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + i * 0.05 + 0.1);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + i * 0.05);
    osc.stop(currentTime + i * 0.05 + 0.15);
  }
}

// First discovery fanfare
export function playFirstDiscoverySound() {
  const context = initAudio();
  if (!context) return;

  const currentTime = context.currentTime;

  // Triumphant ascending arpeggio
  const notes = [
    { freq: 523.25, start: 0, duration: 0.15 }, // C5
    { freq: 659.25, start: 0.1, duration: 0.15 }, // E5
    { freq: 783.99, start: 0.2, duration: 0.15 }, // G5
    { freq: 1046.5, start: 0.3, duration: 0.4 }, // C6
    { freq: 1318.51, start: 0.35, duration: 0.35 }, // E6
    { freq: 1567.98, start: 0.4, duration: 0.5 }, // G6
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, currentTime + start);

    gain.gain.setValueAtTime(0, currentTime + start);
    gain.gain.linearRampToValueAtTime(0.15, currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + start + duration);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(currentTime + start);
    osc.stop(currentTime + start + duration);
  });
}
```

### Haptic Patterns

Add to `src/hooks/useHaptics.js`:

```javascript
// Element combination haptic
const combine = async () => {
  if (!isNative) return;

  // Quick succession of light impacts
  await Haptics.impact({ style: ImpactStyle.Light });
  await sleep(50);
  await Haptics.impact({ style: ImpactStyle.Light });
  await sleep(50);
  await Haptics.impact({ style: ImpactStyle.Medium });
};

// First discovery celebration haptic
const firstDiscovery = async () => {
  if (!isNative) return;

  // Build-up pattern
  for (let i = 0; i < 3; i++) {
    await Haptics.impact({ style: ImpactStyle.Light });
    await sleep(100);
  }
  await Haptics.impact({ style: ImpactStyle.Heavy });
  await sleep(200);
  await Haptics.impact({ style: ImpactStyle.Heavy });
};
```

---

## 12. File Structure

### New Files to Create

```
src/
├── app/
│   ├── element-soup/
│   │   └── page.jsx                    # Main game page
│   ├── api/
│   │   ├── element-soup/
│   │   │   ├── puzzle/
│   │   │   │   └── route.js            # GET puzzle
│   │   │   ├── combine/
│   │   │   │   └── route.js            # POST combination
│   │   │   ├── complete/
│   │   │   │   └── route.js            # POST completion
│   │   │   ├── stats/
│   │   │   │   └── route.js            # GET user stats
│   │   │   └── discoveries/
│   │   │       └── route.js            # GET user discoveries
│   │   └── admin/
│   │       └── element-soup/
│   │           ├── puzzles/
│   │           │   └── route.js        # CRUD puzzles
│   │           └── sandbox/
│   │               └── route.js        # Sandbox combine
│   └── admin/
│       └── element-soup/
│           └── page.jsx                # Admin puzzle creator
├── components/
│   └── element-soup/
│       ├── ElementSoupGame.jsx         # Main game container
│       ├── ElementSoupWelcomeScreen.jsx
│       ├── ElementSoupGameScreen.jsx   # Active gameplay
│       ├── ElementSoupCompleteScreen.jsx
│       ├── ElementBank.jsx             # Scrollable element list
│       ├── ElementChip.jsx             # Single element display
│       ├── CombinationArea.jsx         # Drop zone for combining
│       ├── TargetDisplay.jsx           # Shows target element
│       ├── FirstDiscoveryToast.jsx     # Celebration notification
│       └── ElementSoupSkeleton.jsx     # Loading state
├── hooks/
│   └── useElementSoupGame.js           # Game state & logic
├── lib/
│   ├── elementSoupStorage.js           # Local storage helpers
│   └── elementSoupConstants.js         # Game constants
└── services/
    └── elementSoup.service.js          # API calls

database/
└── element_soup_schema.sql             # All database tables

public/
├── icons/ui/
│   └── element-soup.png                # Already exists
└── screenshots/
    └── element-soup-howto.gif          # How to play demo
```

### Files to Modify

```
src/
├── components/
│   ├── game/
│   │   └── HowToPlayModal.jsx          # Add Element Soup tab
│   ├── admin/
│   │   └── GameSelectorModal.jsx       # Add Element Soup option
│   ├── stats/
│   │   └── UnifiedStatsModal.jsx       # Add Element Soup stats
│   └── navigation/
│       └── (various)                   # Add Element Soup nav
├── app/
│   └── support/
│       └── page.jsx                    # Add Element Soup help sections
├── lib/
│   ├── sounds.js                       # Add new sounds
│   └── constants.js                    # Add Element Soup constants
├── hooks/
│   └── useHaptics.js                   # Add new haptic patterns
└── services/
    └── ai.service.js                   # Add combination generation
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Database & API) - COMPLETED

**Completed: 2026-01-23**

- [x] Create database schema (`element_soup_schema.sql`)
- [ ] Run migrations in Supabase (MANUAL STEP REQUIRED)
- [x] Implement core API routes:
  - [x] GET `/api/element-soup/puzzle`
  - [x] POST `/api/element-soup/combine`
  - [x] POST `/api/element-soup/complete`
  - [x] GET/POST `/api/element-soup/stats`
- [x] Implement AI combination service (in `ai.service.js`)
- [x] Set up Redis caching layer (in combine route)
- [x] Add Element Soup constants (`element-soup.constants.js`)

### Phase 2: Core Game UI - COMPLETED

**Completed: 2026-01-23**

- [x] Create game page (`/element-soup/page.jsx`)
- [x] Implement `useElementSoupGame` hook
- [x] Build core components:
  - [x] `ElementSoupGame.jsx` (container)
  - [x] `ElementBank.jsx`
  - [x] `ElementChip.jsx`
  - [x] `CombinationArea.jsx`
  - [x] `TargetDisplay.jsx`
- [x] Implement combination animation (basic implementation)
- [x] Add skeleton loading state

### Phase 3: Game Screens & Flow - COMPLETED

**Completed: 2026-01-23**

- [x] `ElementSoupWelcomeScreen.jsx`
- [x] `ElementSoupGameScreen.jsx`
- [x] `ElementSoupCompleteScreen.jsx`
- [x] Share text generation
- [x] Game state persistence (localStorage)

### Phase 4: First Discovery System - COMPLETED

**Completed: 2026-01-23**

- [x] First discovery detection (in combine route)
- [x] `FirstDiscoveryToast.jsx`
- [x] Discovery logging to database (element_soup_first_discoveries table)
- [ ] User discovery history page (future enhancement)

### Phase 5: Stats & Leaderboards - COMPLETED

**Completed: 2026-01-23**

- [x] POST `/api/element-soup/complete`
- [x] GET `/api/element-soup/stats`
- [x] Leaderboard integration (uses existing leaderboard system)
- [x] Stats modal tab (SoupStatsSection added to UnifiedStatsModal)
- [x] useUnifiedStats hook updated to load soup stats
- [x] Share text updated to include Element Soup stats

### Phase 6: Admin Panel - COMPLETED

**Completed: 2026-01-23**

- [x] Puzzle creator page (ElementSoupPuzzleEditor component)
- [x] Sandbox mode (interactive testing with live AI combinations)
- [x] Par calculator (set moves as par after reaching target)
- [x] GameSelectorModal update (soup added to GAMES array)
- [x] Puzzle CRUD API (/api/admin/element-soup/puzzles)
- [x] UnifiedPuzzleCalendar integration (fetch & display soup puzzles)

### Phase 7: Polish & Integration - COMPLETED

**Completed: 2026-01-23**

- [x] Sound effects (playCombineSound, playFirstDiscoverySound, playNewElementSound)
- [x] Haptic feedback (soupCombine, soupFirstDiscovery, soupNewElement in useHaptics.js)
- [x] HowToPlayModal tab (Element Soup instructions added)
- [x] Support page sections (5 sections: Getting Started, Combination Tips, First Discoveries, FAQ, Troubleshooting)
- [x] Title screen integration (GameCard added to WelcomeScreen)
- [x] Admin GameSelectorModal updated
- [x] Greeting component updated for soup completion tracking
- [x] Accessibility audit (ARIA labels, roles, keyboard navigation verified)

### Phase 8: Testing & Launch

**Status: NOT STARTED**

- [ ] Unit tests for core logic
- [ ] Integration tests for API
- [ ] Manual QA across devices
- [ ] Performance optimization
- [ ] Soft launch / beta testing

---

## 14. Testing Strategy

### Unit Tests

```javascript
// useElementSoupGame.test.js
describe('useElementSoupGame', () => {
  it('starts with four starter elements', () => {});
  it('counts moves correctly', () => {});
  it('detects when target is reached', () => {});
  it('tracks new discoveries correctly', () => {});
});

// elementSoupUtils.test.js
describe('normalizeKey', () => {
  it('creates consistent keys regardless of order', () => {
    expect(normalizeKey('Fire', 'Water')).toBe('fire|water');
    expect(normalizeKey('Water', 'Fire')).toBe('fire|water');
  });
});
```

### API Tests

```javascript
// element-soup.api.test.js
describe('POST /api/element-soup/combine', () => {
  it('returns cached result for known combination', async () => {});
  it('generates AI result for new combination', async () => {});
  it('handles concurrent requests correctly', async () => {});
  it('tracks first discoveries', async () => {});
});
```

### E2E Tests

```javascript
// element-soup.e2e.test.js
describe('Element Soup Game', () => {
  it('completes a full game successfully', async () => {});
  it('shows first discovery notification', async () => {});
  it('persists progress on page refresh', async () => {});
  it('submits to leaderboard on completion', async () => {});
});
```

---

## Progress Tracking

### Completed Tasks (2026-01-23)

- [x] Initial planning document created
- [x] **Phase 1: Foundation** - Database schema, API routes, AI integration, Redis caching
- [x] **Phase 2: Core Game UI** - All components built
- [x] **Phase 3: Game Screens & Flow** - Welcome, game, complete screens with state persistence
- [x] **Phase 4: First Discovery System** - Detection, toast notifications, database logging
- [x] **Phase 5: Stats & Leaderboards** - API routes, stats modal, leaderboard integration
- [x] **Phase 6: Admin Panel** - Puzzle creator with sandbox mode, CRUD API, calendar integration
- [x] **Phase 7: Polish & Integration** - Sound effects, haptic feedback, support page, title screen, HowToPlayModal, admin modal, accessibility

### Current Phase

- **Phase 8**: Testing & Launch (NOT STARTED)

### Files Created

```
database/
  element_soup_schema.sql              # Database tables, indexes, RLS policies

src/lib/
  element-soup.constants.js            # Game constants, helpers, share text
  sounds.js                            # Added playCombineSound, playFirstDiscoverySound, playNewElementSound

src/services/
  ai.service.js                        # Added generateElementCombination method

src/app/api/element-soup/
  puzzle/route.js                      # GET puzzle endpoint
  combine/route.js                     # POST combine endpoint (with caching)
  complete/route.js                    # POST completion endpoint
  stats/route.js                       # GET/POST stats endpoints

src/app/api/admin/element-soup/
  puzzles/route.js                     # Admin CRUD for puzzles

src/components/admin/element-soup/
  ElementSoupPuzzleEditor.jsx          # Admin puzzle editor with sandbox mode

src/hooks/
  useElementSoupGame.js                # Main game logic hook
  useUnifiedStats.js                   # Updated to load soup stats

src/components/element-soup/
  index.js                             # Component exports
  ElementChip.jsx                      # Element display chip
  ElementBank.jsx                      # Scrollable element grid
  CombinationArea.jsx                  # Selection slots and combine button
  TargetDisplay.jsx                    # Target and stats display
  FirstDiscoveryToast.jsx              # First discovery notification
  ElementSoupWelcomeScreen.jsx         # Pre-game welcome screen
  ElementSoupGameScreen.jsx            # Active gameplay screen
  ElementSoupCompleteScreen.jsx        # Post-game completion screen
  ElementSoupGame.jsx                  # Main game container

src/components/stats/
  SoupStatsSection.jsx                 # Element Soup stats section for modal

src/app/element-soup/
  page.jsx                             # Main game page route
```

### Files Modified

```
src/components/stats/UnifiedStatsModal.jsx    # Added SoupStatsSection
src/components/admin/GameSelectorModal.jsx    # Added Element Soup to GAMES array
src/components/game/WelcomeScreen.jsx         # Added Element Soup GameCard
src/components/home/Greeting.jsx              # Added soup completion tracking
src/components/game/HowToPlayModal.jsx        # Added Element Soup tab with instructions
src/app/admin/page.jsx                        # Added soup editor case and handlers
src/components/admin/UnifiedPuzzleCalendar.jsx # Added soup puzzle fetching and display
src/hooks/useHaptics.js                       # Added soupCombine, soupFirstDiscovery, soupNewElement
src/hooks/useElementSoupGame.js               # Integrated haptic feedback calls
src/app/support/page.jsx                      # Added Element Soup tab with 5 help sections
```

### Next Steps (Manual Required)

1. **Run database migrations** - Execute element_soup_schema.sql in Supabase
2. **Create initial puzzles** - Use admin panel to create puzzles for upcoming days
3. **Test thoroughly** - Cross-device testing, edge cases
4. **Soft launch** - Beta testing with limited users

### Known Limitations

- Database migrations need to be run manually in Supabase
- User discovery history page not yet implemented (future enhancement)

---

## References

- [Infinite Craft by Neal Agarwal](https://neal.fun/infinite-craft/)
- [Infinite Craft Wikipedia](https://en.wikipedia.org/wiki/Infinite_Craft)
- [Existing Tandem codebase patterns](/Users/jasonbartz/Tandem/)

---

**Document maintained by:** Claude AI Assistant
**Last updated:** 2026-01-23 (Implementation session 5 - Completed Phase 7 Polish & Integration)
