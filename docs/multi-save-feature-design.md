# Multi-Save Feature Design — Daily Alchemy Creative Mode

## Overview

Replace the current sliding menu bar (Menu → Save / Start Fresh) with a **Saves Modal** accessible from the creative mode toolbar. The modal presents 3 save slots, each with rename and clear capabilities. Players can switch between slots to experiment with different element combination strategies.

Inspired by Infinite Craft's save system.

## Current State → Proposed State

**Current:** Single save per user in `daily_alchemy_creative_saves` (keyed by `user_id`). Toolbar shows a sliding "Save" + "Start Fresh" pair that auto-closes after 3 seconds.

**Proposed:** 3 save slots per user. A "Saves" button in the toolbar opens a modal showing all 3 slots. The active slot is highlighted. Switching slots auto-saves the current one and loads the new one.

---

## Database Changes

Add `slot_number` and `slot_name` columns to the existing `daily_alchemy_creative_saves` table. Existing rows migrate seamlessly as slot 1.

```sql
-- Add slot_number to existing table, defaulting existing rows to slot 1
ALTER TABLE daily_alchemy_creative_saves
  ADD COLUMN slot_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN slot_name TEXT DEFAULT NULL;

-- Drop old unique constraint on user_id alone
-- Add new composite unique constraint
ALTER TABLE daily_alchemy_creative_saves
  DROP CONSTRAINT daily_alchemy_creative_saves_pkey;
ALTER TABLE daily_alchemy_creative_saves
  ADD CONSTRAINT daily_alchemy_creative_saves_pkey
    PRIMARY KEY (user_id, slot_number);

-- Constraint: slot_number must be 1, 2, or 3
ALTER TABLE daily_alchemy_creative_saves
  ADD CONSTRAINT valid_slot_number CHECK (slot_number BETWEEN 1 AND 3);
```

### New Columns

| Column        | Type    | Default | Purpose                                  |
| ------------- | ------- | ------- | ---------------------------------------- |
| `slot_number` | INTEGER | 1       | Save slot identifier (1–3)               |
| `slot_name`   | TEXT    | NULL    | Custom name (falls back to "Save 1/2/3") |

The upsert conflict key changes from `user_id` to `(user_id, slot_number)`.

### Migration

Existing single-save rows automatically get `slot_number = 1` and `slot_name = NULL` (displays as "Save 1"). Zero disruption for current users.

---

## API Changes

### `GET /api/daily-alchemy/creative/saves` (new endpoint)

Returns all 3 slot summaries at once for the modal. Lightweight — does not include full element banks.

**Response:**

```json
{
  "success": true,
  "saves": [
    {
      "slot": 1,
      "name": "Main",
      "hasSave": true,
      "elementCount": 89,
      "totalDiscoveries": 89,
      "firstDiscoveries": 12,
      "lastPlayedAt": "2024-12-15T18:45:23.000Z"
    },
    {
      "slot": 2,
      "name": null,
      "hasSave": false
    },
    {
      "slot": 3,
      "name": "Volcano Path",
      "hasSave": true,
      "elementCount": 34,
      "totalDiscoveries": 34,
      "firstDiscoveries": 3,
      "lastPlayedAt": "2024-12-14T10:00:00.000Z"
    }
  ]
}
```

### `GET /api/daily-alchemy/creative/save?slot=1`

Existing endpoint, updated with optional `slot` query parameter (default: 1). Returns the full save data for a specific slot.

### `POST /api/daily-alchemy/creative/save`

Existing endpoint. Add `slotNumber` (1–3) to request body. Upsert uses `(user_id, slot_number)` as conflict key.

```json
{
  "slotNumber": 1,
  "elementBank": [...],
  "totalMoves": 247,
  "totalDiscoveries": 89,
  "firstDiscoveries": 12,
  "firstDiscoveryElements": ["Steam", "Lava"]
}
```

### `PATCH /api/daily-alchemy/creative/save` (new)

Rename a slot:

```json
{ "slotNumber": 2, "name": "Volcano Path" }
```

### `DELETE /api/daily-alchemy/creative/save?slot=2`

Existing endpoint, updated with `slot` query parameter. Clears a specific slot.

---

## Frontend Components

### 1. SavesModal.jsx (new component)

The primary new component. Triggered by a "Saves" button in the creative toolbar.

```
┌──────────────────────────────────────┐
│  Saves                            ✕  │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ ★ Main  ✏️                     │  │  ← Active slot (highlighted)
│  │   89 elements · 12 first      │  │
│  │                        Clear   │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │   Save 2  ✏️                   │  │  ← Empty slot
│  │   Empty                        │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │   Volcano Path  ✏️             │  │  ← Slot with data
│  │   34 elements · 3 first       │  │
│  │                        Clear   │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

#### Slot Card States

- **Active + Has Data:** Highlighted border/background (light cyan, similar to Infinite Craft). Shows stats summary, pencil rename icon, clear button.
- **Inactive + Has Data:** Default border. Shows stats summary, pencil rename icon, clear button. Tapping the card switches to this slot.
- **Inactive + Empty:** Muted/dimmed styling, "Empty" label. Tapping creates a fresh save in this slot and switches to it.

#### Interactions

| Action              | Behavior                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Tap slot card       | If not active: auto-save current slot → load tapped slot → close modal                              |
| Tap pencil icon     | Inline rename: slot name becomes an editable input field, Enter or blur to confirm, PATCH to server |
| Tap "Clear"         | Confirmation dialog → DELETE slot → shows as empty. If active slot, resets to 4 starter elements    |
| Tap ✕               | Close modal                                                                                         |

#### Confirmation Dialog (for Clear)

```
┌──────────────────────────────────┐
│  Clear Save?                     │
│                                  │
│  All discovered elements in      │
│  "Volcano Path" will be lost.    │
│  This cannot be undone.          │
│                                  │
│       [Cancel]  [Clear Save]     │
└──────────────────────────────────┘
```

### 2. Toolbar Changes

Replace the current sliding menu approach with a cleaner layout.

**Current:**

```
[Menu ▸]  [Save] [Start Fresh]          89 created · 12 first
```

**Proposed:**

```
[📁 Saves]  [Auto-saved ✓]              89 created · 12 first
```

- **Saves button:** Opens the SavesModal. Optionally shows current slot name as subtitle text beneath the button or as a tooltip.
- **Auto-save indicator:** Small text/icon that briefly appears on autosave events (replaces the manual Save button since autosave handles persistence automatically).
- **Stats** remain on the right side, same as today.

The manual "Save" button is removed — every slot switch triggers an auto-save, and the existing autosave-every-5-discoveries mechanism continues running. The "Start Fresh" button moves into the modal as the per-slot "Clear" action.

### 3. Active Slot Tracking

Store the user's currently active slot in localStorage for fast loading on mount:

```javascript
const ACTIVE_SLOT_KEY = 'soup_creative_active_slot';
// Value: 1, 2, or 3 (default: 1)
```

This avoids an extra API call on game mount. The game loads the slot number from localStorage, then fetches that slot's data.

---

## State Changes in useDailyAlchemyGame.js

### New State

```javascript
const [activeSlot, setActiveSlot] = useState(1);
const [slotSummaries, setSlotSummaries] = useState([]); // For modal display
```

### New Functions

```javascript
// Load all slot summaries (lightweight, for modal display)
async function loadSlotSummaries() {
  const res = await fetch('/api/daily-alchemy/creative/saves');
  const data = await res.json();
  setSlotSummaries(data.saves);
}

// Switch to a different slot
async function switchSlot(newSlotNumber) {
  // 1. Auto-save current slot to server
  await saveCreativeMode(activeSlot);
  // 2. Fetch full data for the new slot
  const data = await loadCreativeSave(newSlotNumber);
  // 3. Replace in-memory state (elementBank, discoveredElements, stats)
  // 4. Update activeSlot state
  setActiveSlot(newSlotNumber);
  // 5. Persist active slot to localStorage
  localStorage.setItem(ACTIVE_SLOT_KEY, newSlotNumber);
}

// Rename a slot
async function renameSlot(slotNumber, newName) {
  await fetch('/api/daily-alchemy/creative/save', {
    method: 'PATCH',
    body: JSON.stringify({ slotNumber, name: newName }),
  });
  // Update slotSummaries locally
}

// Clear a specific slot
async function clearSlot(slotNumber) {
  await fetch(`/api/daily-alchemy/creative/save?slot=${slotNumber}`, {
    method: 'DELETE',
  });
  if (slotNumber === activeSlot) {
    // Reset in-memory state to starter elements
    resetToStarterElements();
  }
  // Update slotSummaries locally
}
```

### Modified Functions

The existing `saveCreativeMode` and `loadCreativeSave` functions gain an optional `slotNumber` parameter that defaults to `activeSlot`:

```javascript
async function saveCreativeMode(slot = activeSlot) {
  // Existing logic, but include slotNumber in POST body
}

async function loadCreativeSave(slot = activeSlot) {
  // Existing logic, but pass ?slot= query param
}
```

---

## UX Flow

### First Time in Creative Mode

1. Slot 1 is active by default
2. Opening the Saves modal shows Slot 1 as active, Slots 2–3 as empty
3. Game plays exactly as it does today (no visible change until the modal is opened)

### Switching Saves

1. Player opens Saves modal
2. Sees all 3 slots with summaries — active slot highlighted
3. Player taps Slot 2 (empty)
4. Current progress auto-saves to Slot 1
5. Slot 2 activates with the 4 starter elements (Water, Fire, Wind, Earth)
6. Modal closes, player starts fresh in Slot 2

### Renaming a Save

1. Player taps the pencil icon next to "Save 2"
2. Slot name becomes an inline editable text input
3. Player types "Volcano Run", presses Enter
4. Name persists to the server via PATCH

### Switching Back

1. Player opens Saves modal
2. Taps Slot 1 (shows "89 elements · 12 first")
3. Slot 2 auto-saves with its current progress
4. Slot 1 loads — all 89 elements restored
5. Modal closes

### Clearing a Save

1. Player taps "Clear" on Slot 2
2. Confirmation dialog: "All discovered elements in 'Volcano Run' will be lost."
3. Player confirms
4. Slot 2 is deleted server-side, shows as "Empty" in the modal
5. If Slot 2 was active, game resets to 4 starter elements

---

## What This Enables

- **Experimentation:** Players can pursue different combination paths without losing progress
- **Goal-based play:** One slot for "discover everything," another for "find all foods," another for "volcano path only"
- **Risk-free exploration:** Try a different strategy in Slot 2, always go back to main progress in Slot 1
- **Organized play:** Name saves to remember what each experiment was about

---

## Scope Boundaries

### In Scope

- 3 save slots per user
- Rename slots (custom names)
- Clear individual slots (with confirmation)
- Switch between slots (auto-saves current on switch)
- Modal UI replacing the sliding menu toolbar
- Auto-save indicator in toolbar

### Out of Scope (for now)

- Export / Import saves
- Slot duplication / copying
- More than 3 slots
- Sharing saves with other players
- Slot-specific favorites (favorites remain global)
