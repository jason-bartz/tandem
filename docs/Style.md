# Tandem Daily Style Guide

This document defines the visual design system for Tandem Daily. All components must follow these tokens and patterns to maintain consistency across games.

**Enforced by:** Claude Code hook on component edits + Tailwind config
**Source of truth for values:** `tailwind.config.js` and `src/app/globals.css`

---

## 1. Color System

### Accent Palette

All accent colors are defined as CSS variables in `globals.css` and mapped in `tailwind.config.js`. Never use raw hex values for these — always use the Tailwind token.

| Token           | Light Mode | Dark Mode | Usage                                           |
| --------------- | ---------- | --------- | ----------------------------------------------- |
| `accent-green`  | `#7ed957`  | `#7ed957` | Success, correct answers, Daily Alchemy primary |
| `accent-yellow` | `#ffce00`  | `#ffd700` | Daily Mini primary, Reel Connections primary    |
| `accent-pink`   | `#ff66c4`  | `#ff69b4` | CTAs, primary action buttons                    |
| `accent-blue`   | `#38b6ff`  | `#5eb3ff` | Daily Tandem primary, links, secondary actions  |
| `accent-red`    | `#ff5757`  | `#ff7b7b` | Errors, incorrect answers, destructive actions  |
| `accent-orange` | `#ff751f`  | `#ffa64d` | Warnings, special highlights                    |
| `accent-purple` | `#a855f7`  | `#c084fc` | Premium features, achievement badges            |

### Game Identity Colors

Each game has a primary accent that identifies it across the app:

| Game                 | Primary Token              | Secondary                                   | Background Context |
| -------------------- | -------------------------- | ------------------------------------------- | ------------------ |
| **Daily Tandem**     | `accent-blue`              | `bg-surface`                                | Light, clean       |
| **Daily Mini**       | `accent-yellow`            | `accent-blue`                               | Light, clean       |
| **Reel Connections** | `accent-yellow`            | Dark gradient `from-[#1a1a2e] to-[#0f0f1e]` | Cinema-dark theme  |
| **Daily Alchemy**    | `soup-primary` (`#7ed957`) | `soup-light` (`#d4f4c4`)                    | Green nature theme |

### Background Colors

| Token         | Light     | Dark      | Usage                                         |
| ------------- | --------- | --------- | --------------------------------------------- |
| `bg-primary`  | `#ffce00` | `#1a1a2e` | Page-level backgrounds (game-specific)        |
| `bg-tandem`   | `#39b6ff` | `#1a1a2e` | Tandem game background                        |
| `bg-surface`  | `#f4f5f9` | `#16213e` | Content surface areas                         |
| `bg-card`     | `#f4f5f9` | `#0f3460` | Card backgrounds                              |
| `ghost-white` | `#F4F5F9` | —         | Light mode surface replacement for pure white |

### Text Colors

| Token            | Light     | Dark      | Usage                            |
| ---------------- | --------- | --------- | -------------------------------- |
| `text-primary`   | `#2c2c2c` | `#f9fafb` | Primary body and heading text    |
| `text-secondary` | `#6b7280` | `#d1d5db` | Supporting text, labels          |
| `text-muted`     | `#9ca3af` | `#9ca3af` | Placeholder, disabled, hint text |

### Border Colors

| Token          | Light     | Dark      | Usage                                 |
| -------------- | --------- | --------- | ------------------------------------- |
| `border-main`  | `#2c2c2c` | `#4b5563` | Primary borders (bold, neo-brutalist) |
| `border-light` | `#e5e7eb` | `#4b5563` | Subtle dividers                       |

### Rules

- **No hardcoded hex values** in components. Use Tailwind tokens (`bg-accent-green`, `text-accent-blue`, etc.)
- Exceptions: third-party brand colors (Google OAuth, Discord) inline in their specific components only
- Dark mode variants are handled by CSS variables — avoid manual `dark:bg-[#hex]` overrides
- Always use `ghost-white` (`#F4F5F9`) instead of pure `white` for backgrounds

---

## 2. Typography

### Font Families

| Token                 | Font              | Usage                                         |
| --------------------- | ----------------- | --------------------------------------------- |
| `font-sans` (default) | Plus Jakarta Sans | All UI text — body, headings, labels, buttons |
| `font-jua`            | Jua               | Daily Alchemy display text only               |
| `font-lilita-one`     | Lilita One        | Daily Alchemy welcome/hero text only          |

**Rule:** Only use `font-jua` and `font-lilita-one` within Daily Alchemy components. All other games and shared components use the default `font-sans`.

### Type Scale

| Class       | Size     | Usage                                        |
| ----------- | -------- | -------------------------------------------- |
| `text-xs`   | 0.75rem  | Metadata, timestamps, fine print             |
| `text-sm`   | 0.875rem | Default body text, form labels, descriptions |
| `text-base` | 1rem     | Emphasized body text, larger form elements   |
| `text-lg`   | 1.125rem | Section headers, modal titles                |
| `text-xl`   | 1.25rem  | Page sub-headers, prominent labels           |
| `text-2xl`  | 1.5rem   | Section titles, game headers                 |
| `text-3xl`  | 1.875rem | Major headings (rare)                        |
| `text-4xl`  | 2.25rem  | Page titles, completion screens              |

**Note:** `text-sm` is the standard body text size (mobile-first design). Don't default to `text-base` — the app is optimized for compact, information-dense layouts.

### Font Weights

| Weight          | Usage                                                           |
| --------------- | --------------------------------------------------------------- |
| `font-bold`     | Headings, buttons, emphasis, key values                         |
| `font-semibold` | Section headers, secondary emphasis                             |
| `font-medium`   | Important body text, active states                              |
| `font-normal`   | Standard body (rarely needed explicitly since it's the default) |

### Heading Hierarchy

| Level          | Pattern                                        | Context                          |
| -------------- | ---------------------------------------------- | -------------------------------- |
| Page title     | `text-4xl font-bold` or `text-3xl font-bold`   | Top of page, completion screens  |
| Section header | `text-lg font-bold` or `text-xl font-semibold` | Within modals, settings sections |
| Subsection     | `text-base font-semibold`                      | Card headers, list group titles  |
| Label          | `text-sm font-medium`                          | Form labels, stat labels         |

---

## 3. Spacing

### Scale

The project uses Tailwind's default 4px base unit. The most common spacing values:

| Token | Value | Typical Use                                         |
| ----- | ----- | --------------------------------------------------- |
| `1`   | 4px   | Tight inline gaps                                   |
| `2`   | 8px   | Default flex gap (`gap-2`), icon-to-text spacing    |
| `3`   | 12px  | Medium gaps (`gap-3`), button padding (`px-3 py-2`) |
| `4`   | 16px  | Standard component padding (`p-4`), section gaps    |
| `6`   | 24px  | Large section padding (`p-6`), generous spacing     |
| `8`   | 32px  | Page-level margins                                  |

### Common Patterns

| Context            | Pattern                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| Button padding     | `px-3 py-2` (small) / `px-4 py-3` (standard) / `px-6 py-4` (large CTA) |
| Card padding       | `p-4` (standard) / `p-5` (generous)                                    |
| Flex gap           | `gap-2` (tight) / `gap-3` (standard) / `gap-4` (spacious)              |
| Section separation | `gap-4` or `gap-6` between major blocks                                |
| Inline icon gap    | `gap-2`                                                                |

### Rules

- Use Tailwind's spacing scale exclusively. No arbitrary values like `p-[20px]`.
- Exception: iOS safe-area calculations using `calc(env(safe-area-inset-*))`.

---

## 4. Borders & Shadows

### Neo-Brutalist Style

The app uses a distinctive neo-brutalist visual language with bold borders and offset shadows.

### Border Width

| Context                            | Width | Token                        |
| ---------------------------------- | ----- | ---------------------------- |
| Primary (cards, buttons, inputs)   | 3px   | `border-[3px]`               |
| Secondary (badges, inner elements) | 2px   | `border-[2px]` or `border-2` |

### Shadows (Offset, not blur)

| Token (CSS Variable) | Light Mode                  | Dark Mode                     | Usage                  |
| -------------------- | --------------------------- | ----------------------------- | ---------------------- |
| `--shadow-card`      | `4px 4px 0px rgba(0,0,0,1)` | `4px 4px 0px rgba(0,0,0,0.5)` | Cards, panels          |
| `--shadow-button`    | `3px 3px 0px rgba(0,0,0,1)` | `3px 3px 0px rgba(0,0,0,0.5)` | Buttons                |
| `--shadow-small`     | `2px 2px 0px rgba(0,0,0,1)` | `2px 2px 0px rgba(0,0,0,0.3)` | Small elements, badges |

### Interactive Shadow Behavior

Buttons and cards follow a consistent press interaction:

```
Default:    shadow-[4px_4px_0px_...]  translate(0, 0)
Hover:      shadow-[2px_2px_0px_...]  translate(2px, 2px)
Active:     shadow-none               translate(4px, 4px)
```

This creates the illusion of a physical button being pressed down.

### Border Radius

| Context                        | Radius | Token            |
| ------------------------------ | ------ | ---------------- |
| Small elements (badges, chips) | 12px   | `rounded-xl`     |
| Buttons                        | 20px   | `rounded-[20px]` |
| Cards                          | 24px   | `rounded-[24px]` |
| Large modals/containers        | 32px   | `rounded-[32px]` |
| Circles (avatars, status dots) | full   | `rounded-full`   |

---

## 5. Component Patterns

### Buttons

No shared Button component — buttons are styled inline with consistent patterns.

**Primary CTA:**

```
w-full p-4 rounded-[20px] border-[3px] border-black dark:border-gray-600
font-bold text-white cursor-pointer transition-all
bg-accent-pink  (or game-specific color)
shadow-[4px_4px_0px_rgba(0,0,0,1)]
hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
```

**Secondary:**

```
bg-ghost-white dark:bg-gray-700 border-black dark:border-gray-600
shadow-[2px_2px_0px_rgba(0,0,0,1)]
```

**Icon button (close, menu):**

```
w-12 h-12 flex items-center justify-center transition-opacity
hover:opacity-70 active:opacity-50
```

### Cards (GameCard pattern)

```
rounded-[24px] border-[3px] overflow-hidden p-5
shadow-[4px_4px_0px_rgba(0,0,0,1)]
bg-ghost-white dark:bg-gray-800
```

- Full-width clickable area
- Spring entrance animation with stagger
- Tap feedback: `whileTap={{ scale: 0.98 }}`

### Modals (LeftSidePanel)

All modals use `LeftSidePanel` from `src/components/shared/LeftSidePanel.jsx`:

- Slides in from left, 300ms with iOS easing
- Backdrop: `bg-black/50`
- Default max-width: 450px (can be 550px or 650px)
- Close: backdrop click, ESC key, swipe left >100px, or X button
- Safe-area aware for iOS notch

### Toasts

- Position: `fixed top-20 left-1/2 -translate-x-1/2 z-[9999]`
- Auto-dismiss: 3000ms (achievements) / 5000ms (discoveries)
- Style: `rounded-2xl border-[3px] border-black px-6 py-4`
- Exposed globally via `window.__showAchievementToast()`

---

## 6. Animation

### Timing

| Token         | Duration | Tailwind Class | Usage                                     |
| ------------- | -------- | -------------- | ----------------------------------------- |
| `instant`     | 100ms    | `duration-100` | Micro-interactions (toggle, checkbox)     |
| `micro`       | 150ms    | `duration-150` | Button hover/active, inline state changes |
| `fast`        | 200ms    | `duration-200` | Hover states, small transitions           |
| `standard`    | 300ms    | `duration-300` | Panel slides, modal transitions           |
| `prominent`   | 350ms    | `duration-350` | Entry animations, page transitions        |
| `celebration` | 500ms    | `duration-500` | Achievement unlocks, game completion      |

**Allowed durations only.** Do not use durations outside this table (e.g., 250ms, 400ms, 600ms, 800ms). Repeating/looping animations (radar pulses, shimmers) may use longer durations but should stay under 2s.

### Easing

| Token         | CSS Curve                           | Framer Motion Array     | Usage                             |
| ------------- | ----------------------------------- | ----------------------- | --------------------------------- |
| `ios-default` | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | `[0.25, 0.1, 0.25, 1]`  | General UI transitions            |
| `spring`      | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `[0.34, 1.56, 0.64, 1]` | Bouncy entrances, button feedback |
| `sharp`       | `cubic-bezier(0.4, 0, 0.6, 1)`      | `[0.4, 0, 0.6, 1]`      | Quick, decisive movements         |

**Use only these three curves.** Do not introduce custom cubic-bezier values. When using Framer Motion's named easings (`easeOut`, `easeInOut`), these are acceptable for simple keyframe animations but prefer the named curves above for consistency.

### Framer Motion Conventions

**Entry animations:**

- Use `initial` + `animate` with variants object
- Always gate on `reduceMotion`: `initial={!reduceMotion ? { opacity: 0 } : false}`

**Tap feedback:**

- Standard: `whileTap={{ scale: 0.98 }}`
- Always use `scale: 0.98` — do not add x/y translation or shadow changes to whileTap
- Gate on reduceMotion: `whileTap={!reduceMotion ? { scale: 0.98 } : undefined}`

**Spring physics:**

- Default: `type: "spring", stiffness: 300, damping: 20`
- Snappy variant (drag feedback, hold-to-drag pop): `type: "spring", stiffness: 400, damping: 15`
- Use the default for all general UI springs. Only use the snappy variant for drag interactions and tactile feedback on touch-hold gestures.

**List stagger:**

- 50ms (0.05s) delay per item via `staggerChildren: 0.05`
- Do not exceed 50ms per item

**Exit animations:**

- Always wrap conditionally rendered `motion.*` elements with `<AnimatePresence>`
- Exit transitions should be faster than entrance (use `fast` or `instant` timing)

### Interactive Shadow Press Pattern

Buttons and interactive cards follow a proportional press pattern based on their shadow size:

**Primary buttons (4px shadow):**

```
Default:  shadow-[4px_4px_0px_...]  translate(0, 0)
Hover:    shadow-[2px_2px_0px_...]  translate(2px, 2px)
Active:   shadow-none               translate(4px, 4px)
```

**Secondary/small elements (2–3px shadow):**

```
Default:  shadow-[2px_2px_0px_...]  translate(0, 0)
Hover:    shadow-[1px_1px_0px_...]  translate(1px, 1px)
Active:   shadow-none               translate(2px, 2px)
```

**Rule:** Shadow reduction + translation must always equal the original shadow offset. Never use upward (`-y`) translations on hover — movement is always downward/right to simulate pressing in.

### Reduce Motion

**Every animation must respect `reduceMotion`.**

There are two layers of reduce-motion support:

1. **CSS layer (automatic):** `globals.css` includes `@media (prefers-reduced-motion: reduce)` and `.reduce-motion` rules that set `animation-duration: 0.01ms !important` on all elements. This covers CSS animations (`animate-backdrop-enter`, `animate-slide-in-left`, `skeleton-shimmer`, etc.) automatically — no per-component checks needed for CSS-only animations.

2. **Framer Motion layer (manual):** Framer Motion animations bypass CSS and must be gated explicitly using `reduceMotion` from `useTheme()`:

```jsx
const { reduceMotion } = useTheme();

// Gate initial/animate
initial={!reduceMotion ? { opacity: 0, y: 20 } : false}

// Gate whileTap
whileTap={!reduceMotion ? { scale: 0.98 } : undefined}

// Gate spring duration
transition={{ duration: reduceMotion ? 0 : 0.3 }}

// Gate repeating animations
animate={!reduceMotion ? { y: [0, -3, 0] } : undefined}
```

### Rules

- Respect `reduceMotion` from ThemeContext — skip non-essential Framer Motion animations
- CSS animations are handled automatically via `prefers-reduced-motion` and `.reduce-motion` class
- Prefer Tailwind animation classes for simple transitions
- Use Framer Motion for complex, multi-step, or physics-based animations
- Use `skeleton-shimmer` class for loading skeletons — never `animate-pulse`
- All Tailwind transition durations must use a value from the Timing table above

---

## 7. Icons

- **Library:** Lucide React (`lucide-react`)
- **Sizing:** `w-5 h-5` (small/inline), `w-6 h-6` (standard), `w-8 h-8` (feature/display)
- **Color:** Inherit from parent text color, or use semantic color tokens
- **Custom icons:** Only in game-specific directories (e.g., `daily-alchemy/icons/`)

---

## 8. Layout

### Page Structure

```
Header (fixed, z-40, max-w-2xl mx-auto)
  -> Safe area padding (pt-safe for iOS)
Main content (max-w-2xl or max-w-md depending on game)
  -> px-4 standard horizontal padding
```

### Responsive Strategy

- **Mobile-first** — no responsive text sizing, layouts adapt via spacing/flex
- Panels use `w-[90vw]` on mobile with max-width constraints
- Dynamic viewport height: `100dvh` (with `100vh` fallback)
- iOS safe areas via `pt-safe`, `pb-safe` utilities

### Containers

| Context      | Max Width                     |
| ------------ | ----------------------------- |
| Page content | `max-w-2xl` (672px)           |
| Game board   | `max-w-md` (448px)            |
| Modal panels | 450px default / 550px / 650px |

---

## 9. Accessibility

### Theme Modes

Three independent toggles via `ThemeContext`:

1. **Light/Dark** — `data-theme` attribute on root
2. **High Contrast** — `high-contrast` class, swaps to WCAG AAA palette
3. **Reduce Motion** — `reduce-motion` class, disables non-essential animation

### High Contrast Colors

When `highContrast` is true, use `hc-*` tokens:

| Token           | Light HC  | Dark HC   |
| --------------- | --------- | --------- |
| `hc-primary`    | `#0066b3` | `#003d73` |
| `hc-success`    | `#2d8504` | `#1a5c00` |
| `hc-error`      | `#c7251a` | `#8b0000` |
| `hc-background` | `#f4f5f9` | `#000814` |
| `hc-surface`    | `#f5f5f5` | `#001d3d` |
| `hc-text`       | `#000000` | `#ffffff` |
| `hc-border`     | `#000000` | `#5eb3ff` |

### Minimum Requirements

- All interactive elements: 44x44px minimum tap target
- Focus indicators: visible focus ring on keyboard navigation
- Buttons: always have accessible text (aria-label for icon-only buttons)
- Color alone must not be the only indicator of state — use icons or text as well

---

## 10. Loading States

Loading is a first-class part of the user experience. Every loading state must be intentional, consistent, and match the visual language of the content it replaces.

### Decision Matrix: Which Loading Pattern to Use

| Scenario                                                | Pattern                          | Component                 | Example                                     |
| ------------------------------------------------------- | -------------------------------- | ------------------------- | ------------------------------------------- |
| **Full page loading** (first paint, game puzzle fetch)  | Skeleton screen                  | Game-specific skeleton    | Opening Daily Mini, Reel Connections        |
| **Modal/panel loading** (stats, achievements, archive)  | Skeleton screen                  | Feature-specific skeleton | Opening stats modal, achievements list      |
| **Inline data fetch** (small area within a loaded page) | Skeleton placeholder             | Inline skeleton elements  | Loading avatar list, loading calendar dates |
| **Button action** (save, submit, subscribe)             | Disabled + spinner + text change | Inline in button          | "Save" -> spinner + "Saving..."             |
| **Destructive/irreversible action** (delete account)    | Disabled + spinner + text change | Inline in button          | "Delete" -> spinner + "Deleting..."         |
| **Background refresh** (silent re-fetch, sync)          | No visible indicator             | None                      | Syncing stats to server                     |

**Never use:** A bare spinner centered on a blank page. Always show structure (skeleton) so the user knows what's coming.

### Skeleton Screens

Skeletons must mirror the layout of the content they replace — same heights, widths, gaps, and border radii. The user should not see a layout shift when content loads.

**Animation:** All skeletons use the `skeleton-shimmer` CSS class.

- Duration: **2s**, linear, infinite
- Direction: Left to right (horizontal sweep)
- Light mode gradient: `rgba(229, 231, 235, 0) -> rgba(229, 231, 235, 0.8) -> rgba(229, 231, 235, 0)`
- Dark mode gradient: `rgba(55, 65, 81, 0) -> rgba(55, 65, 81, 0.8) -> rgba(55, 65, 81, 0)`

**Exception:** Reel Connections uses `reel-skeleton-shimmer` (golden gradient, 1.5s) because of its cinema-dark theme. This is the only allowed game-specific skeleton animation.

**Skeleton element styling:**

| Element being replaced | Skeleton classes                                           | Notes                                           |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Text line              | `h-4 rounded bg-gray-200 dark:bg-gray-700`                 | Vary width (w-3/4, w-1/2, w-full) for realism   |
| Heading                | `h-6 rounded bg-gray-200 dark:bg-gray-700`                 | Usually w-1/2 or w-2/3                          |
| Icon/avatar            | `rounded-full bg-gray-200 dark:bg-gray-700`                | Match actual icon size (w-6 h-6, w-8 h-8, etc.) |
| Button                 | `h-12 rounded-[20px] bg-gray-200 dark:bg-gray-700`         | Match actual button border-radius               |
| Card                   | `rounded-[24px] border-[3px] bg-gray-200 dark:bg-gray-700` | Match actual card structure                     |
| Image/thumbnail        | `rounded-xl bg-gray-200 dark:bg-gray-700`                  | Match actual image dimensions                   |

**Stagger animation:** When showing multiple skeleton items (list of cards, grid of tiles), stagger their shimmer with `animationDelay`:

- Delay per item: **100ms**
- Maximum total delay: **400ms** (cap at 4 items, then repeat)
- Pattern: `style={{ animationDelay: '${Math.min(i, 4) * 100}ms' }}`

**Rules:**

- Always use `skeleton-shimmer` class — never use Tailwind's `animate-pulse` for skeletons
- Every skeleton must check `reduceMotion` from `useTheme()` and skip animation if true
- Skeleton background color is always `bg-gray-200 dark:bg-gray-700` — no other grays
- No borders on skeleton placeholder elements (borders appear only on skeleton containers that match actual card borders)

### Spinners

Use the `LoadingSpinner` component from `src/components/shared/LoadingSpinner.jsx` for any standalone spinner need.

**When to use a spinner instead of a skeleton:**

- Inside a button during an action (small spinner, inline)
- Transitional moments under 1 second where building a skeleton isn't justified
- Never as a full-page loading state (use a skeleton instead)

**Spinner styling:**

- Border-based spinning circle: `border-4 border-t-transparent rounded-full animate-spin`
- Color: Match the game/context accent color (not hardcoded purple)
- Sizes: `w-4 h-4` (inside button), `w-8 h-8` (inline), `w-12 h-12` (section-level)
- Always include `role="status"` and `aria-label="Loading"` for accessibility
- Always check `reduceMotion` — if true, show a static indicator or text only

### Button Loading States

When a button triggers an async action, it must show a loading state:

```
Idle:       [  Save Avatar  ]       (normal styling)
Loading:    [  * Saving...  ]       (disabled, spinner, text change)
Success:    [  * Saved!     ]       (brief success state, 1.5s, then revert)
Error:      [  Try Again    ]       (error state with accent-red)
```

**Implementation pattern:**

```jsx
<button disabled={isLoading} className={`... ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
  {isLoading ? (
    <>
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</button>
```

**Rules:**

- Disabled state uses `opacity-70` (not `opacity-50` — too faded)
- Always change button text to reflect the action in progress ("Saving...", "Deleting...", "Subscribing...")
- Include a small inline spinner (`w-4 h-4`) before the loading text
- Use `cursor-not-allowed` when disabled
- If the action has a success state, briefly show it (1.5s) before reverting

### Loading Text & Messages

For longer loading operations (>2 seconds), use rotating loading messages via `AnimatedLoadingMessage`:

- Messages rotate every **2 seconds** with a **300ms** opacity fade
- Messages are shuffled on mount
- Always respect `reduceMotion` (show static text if true)
- Game-specific loading messages are allowed (Reel Connections cinema messages, etc.)
- Generic messages live in `AnimatedLoadingMessage.jsx`

### Transition: Loading to Content

When content finishes loading:

- **Preferred:** Instant swap (skeleton disappears, content appears) — no additional fade animation needed. The skeleton already set the spatial expectation.
- **Acceptable:** Quick fade-in (`opacity 0->1`, 200ms) for content that differs significantly from the skeleton layout.
- **Never:** Slow fade (>300ms), slide-in from off-screen, or scale animation for loaded content.

### Reduce Motion Requirements

**Every loading animation must respect the `reduceMotion` preference:**

```jsx
const { reduceMotion } = useTheme();

// Skeleton
className={`bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}

// Spinner
className={`... ${!reduceMotion ? 'animate-spin' : ''}`}

// If no animation, show static text: "Loading..."
```

When `reduceMotion` is true:

- Skeleton elements render as static gray blocks (no shimmer)
- Spinners render as static circles (no rotation) or are replaced with "Loading..." text
- Loading messages show a single static message (no rotation)

---

## 11. Anti-Patterns (Do Not)

- Use raw hex colors in components (use tokens)
- Use `bg-white` (use `bg-ghost-white` or `bg-bg-surface`)
- Use `font-light` (not part of our weight scale)
- Use blur-based shadows (our style is offset, no blur)
- Add new font families without discussion
- Use responsive text sizing (`sm:text-lg md:text-xl`) — our layouts are mobile-first with consistent sizing
- Use arbitrary spacing values (`p-[13px]`) — stick to the Tailwind scale
- Introduce new border widths — we use 3px (primary) and 2px (secondary)
- Skip dark mode support on any visible element
- Skip high contrast conditional rendering where colors are used
- Use a bare spinner as a full-page loading state (use a skeleton screen)
- Use Tailwind's `animate-pulse` for skeletons (use `skeleton-shimmer` class)
- Disable a button during loading without changing its text and adding a spinner
- Use `opacity-50` for disabled/loading states (use `opacity-70`)
- Skip `reduceMotion` checks on any Framer Motion animation
- Use different skeleton background colors across pages (always `bg-gray-200 dark:bg-gray-700`)
- Create layout-shifting loading states (skeleton dimensions must match content dimensions)
- Use `whileTap` with anything other than `{ scale: 0.98 }` (no x/y translation, no shadow changes)
- Use custom `cubic-bezier` curves — only use the three defined easing tokens
- Use spring physics other than `stiffness: 300, damping: 20` (default) or `stiffness: 400, damping: 15` (snappy/drag) without discussion
- Use Tailwind `duration-*` values outside the timing table (100, 150, 200, 300, 350, 500)
- Use upward (`-y`) hover translations on buttons — press direction is always down/right
- Use stagger delays other than 50ms per item
