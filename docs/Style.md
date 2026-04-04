# Tandem Daily Style Guide

This document defines the **flat design system** for Tandem Daily. All components must follow these tokens and patterns to maintain consistency across games.

**Design philosophy:** Flat design — zero artificial depth, bold color blocking, geometric purity, typography-driven hierarchy. No shadows, no blur, no gradients on interactive elements. Visual interest comes from scale, color contrast, and strategic use of geometric shapes.

**No decorative emojis in UI.** Never use emojis as icons, decorations, or visual flair in components. Emojis are only acceptable when they are game data (e.g., element emojis in Daily Alchemy, puzzle content). Use Lucide icons or custom assets instead.

**Enforced by:** Claude Code hook on component edits + Tailwind config
**Source of truth for values:** `tailwind.config.js` and `src/app/globals.css`

---

## 1. Color System

### Structural Palette (Flat Design)

These structural tokens define the core visual language:

| Token               | Light     | Dark      | Usage                 |
| ------------------- | --------- | --------- | --------------------- |
| `primary`           | `#3B82F6` | `#60A5FA` | Primary action color  |
| `primary-hover`     | `#2563EB` | `#3B82F6` | Primary hover state   |
| `secondary`         | `#10B981` | `#34D399` | Supporting accent     |
| `secondary-hover`   | `#059669` | `#10B981` | Secondary hover state |
| `flat-accent`       | `#F59E0B` | `#FBBF24` | Highlights, badges    |
| `flat-accent-hover` | `#D97706` | `#F59E0B` | Accent hover state    |

### Game Identity Colors (Preserved)

Each game retains its identity accent. These are CSS variables that adapt to light/dark mode.

| Token           | Light     | Dark      | Usage                                           |
| --------------- | --------- | --------- | ----------------------------------------------- |
| `accent-green`  | `#7ed957` | `#86EFAC` | Success, correct answers, Daily Alchemy primary |
| `accent-yellow` | `#ffce00` | `#FDE68A` | Daily Mini primary, Reel Connections primary    |
| `accent-pink`   | `#ff66c4` | `#F9A8D4` | CTAs, primary action buttons                    |
| `accent-blue`   | `#38b6ff` | `#93C5FD` | Daily Tandem primary, links, secondary actions  |
| `accent-red`    | `#ff5757` | `#FCA5A5` | Errors, incorrect answers, destructive actions  |
| `accent-orange` | `#ff751f` | `#FDBA74` | Warnings, special highlights                    |
| `accent-purple` | `#a855f7` | `#C4B5FD` | Premium features, achievement badges            |

### Game Identity Mapping

| Game                 | Primary Token              | Background Context |
| -------------------- | -------------------------- | ------------------ |
| **Daily Tandem**     | `accent-blue`              | Light, clean       |
| **Daily Mini**       | `accent-yellow`            | Light, clean       |
| **Reel Connections** | `accent-yellow`            | Cinema-dark theme  |
| **Daily Alchemy**    | `soup-primary` (`#7ed957`) | Green nature theme |

### Background Colors

| Token         | Light     | Dark      | Usage                                         |
| ------------- | --------- | --------- | --------------------------------------------- |
| `bg-primary`  | `#FFFFFF` | `#111827` | Page-level canvas (pure white / dark gray)    |
| `bg-tandem`   | `#38b6ff` | `#1E3A5F` | Tandem game background                        |
| `bg-surface`  | `#F3F4F6` | `#1F2937` | Content surface areas, section blocks         |
| `bg-card`     | `#FFFFFF` | `#1F2937` | Card backgrounds                              |
| `ghost-white` | `#F3F4F6` | —         | Muted background (alias for Gray 100)         |
| `muted`       | `#F3F4F6` | —         | Muted background (preferred over ghost-white) |

### Text Colors

| Token            | Light     | Dark      | Usage                            |
| ---------------- | --------- | --------- | -------------------------------- |
| `text-primary`   | `#111827` | `#F9FAFB` | Primary body and heading text    |
| `text-secondary` | `#6B7280` | `#D1D5DB` | Supporting text, labels          |
| `text-muted`     | `#9CA3AF` | `#9CA3AF` | Placeholder, disabled, hint text |

### Border Colors

| Token          | Light     | Dark      | Usage                          |
| -------------- | --------- | --------- | ------------------------------ |
| `border-main`  | `#E5E7EB` | `#374151` | Subtle borders, used sparingly |
| `border-light` | `#E5E7EB` | `#374151` | Subtle dividers                |

### Rules

- **No hardcoded hex values** in components. Use Tailwind tokens (`bg-accent-green`, `text-accent-blue`, `bg-primary`, etc.)
- Exceptions: third-party brand colors (Google OAuth, Discord) inline in their specific components only
- Dark mode variants are handled by CSS variables — avoid manual `dark:bg-[#hex]` overrides
- Use `bg-bg-surface` or `bg-ghost-white` for muted backgrounds — never raw `bg-white`
- **Color as structure:** Use bold background colors to define sections and grouping, not lines or shadows

---

## 2. Typography

### Font Families

| Token                 | Font       | Usage                                         |
| --------------------- | ---------- | --------------------------------------------- |
| `font-sans` (default) | Outfit     | All UI text — body, headings, labels, buttons |
| `font-jua`            | Jua        | Daily Alchemy display text only               |
| `font-lilita-one`     | Lilita One | Daily Alchemy welcome/hero text only          |

Outfit is a geometric sans-serif that mirrors the shapes of the flat UI.

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

**Note:** `text-sm` is the standard body text size (mobile-first design). Don't default to `text-base`.

### Font Weights

| Weight           | Usage                                                           |
| ---------------- | --------------------------------------------------------------- |
| `font-extrabold` | Display headings, hero text (800 weight)                        |
| `font-bold`      | Headings, buttons, emphasis, key values (700)                   |
| `font-semibold`  | Section headers, labels, uppercase labels (600)                 |
| `font-medium`    | Important body text, active states (500)                        |
| `font-normal`    | Standard body (rarely needed explicitly since it's the default) |

### Heading Style

Headings use **tight letter-spacing** (`tracking-tight` or `-0.02em`) and bold/extra-bold weight. This creates strong visual hierarchy without relying on decorative elements.

| Level          | Pattern                                               | Context                          |
| -------------- | ----------------------------------------------------- | -------------------------------- |
| Page title     | `text-4xl font-extrabold tracking-tight`              | Top of page, completion screens  |
| Section header | `text-lg font-bold` or `text-xl font-semibold`        | Within modals, settings sections |
| Subsection     | `text-base font-semibold`                             | Card headers, list group titles  |
| Label          | `text-sm font-medium` (or `uppercase tracking-wider`) | Form labels, stat labels         |

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
| `8`   | 32px  | Page-level margins, generous card padding           |

### Rules

- Use Tailwind's spacing scale exclusively. No arbitrary values like `p-[20px]`.
- Exception: iOS safe-area calculations using `calc(env(safe-area-inset-*))`.

---

## 4. Borders, Shadows & Radius

### Flat Design Principles

- **No box shadows.** `shadow-none` everywhere. No `shadow-sm`, `shadow-md`, `shadow-lg`, or offset shadows.
- **No blur effects.** No `backdrop-blur`, no `blur-*`, no `filter: blur()`.
- **No gradients on interactive elements.** Backgrounds may use subtle directional gradients (`from-[#F3F4F6] to-transparent`) for decoration only.
- **Borders are subtle.** Use background color blocks to define structure, not borders. When a border is needed (e.g., inputs on focus), use `border-2` with a solid color.

### Border Width

| Context                | Width | Token      |
| ---------------------- | ----- | ---------- |
| Input focus state      | 2px   | `border-2` |
| High contrast outlines | 2px   | `border-2` |
| Subtle dividers        | 1px   | `border`   |
| Generally              | none  | No border  |

### Border Radius

| Context                        | Radius | Token          |
| ------------------------------ | ------ | -------------- |
| Buttons, inputs, small cards   | 6px    | `rounded-md`   |
| Cards, panels, modals          | 8px    | `rounded-lg`   |
| Tags, pills                    | full   | `rounded-full` |
| Circles (avatars, status dots) | full   | `rounded-full` |

Radius is consistent and moderate — not fully rounded (pill) unless it's a tag/chip.

### Interactive Feedback

Hover states use **scale transforms and color shifts** — never shadow depth:

```
Button hover:   hover:scale-105 hover:bg-[darker-shade]
Card hover:     hover:scale-[1.02] (subtle scale)
Outline button: hover:bg-[fill-color] hover:text-white (color fill)
```

---

## 5. Component Patterns

### Buttons

**Primary CTA:**

```
w-full h-14 rounded-md font-semibold text-white cursor-pointer
transition-all duration-200
bg-primary hover:bg-primary-hover hover:scale-105
```

For game-specific buttons, replace `bg-primary` with the game's accent color.

**Secondary:**

```
bg-bg-surface dark:bg-gray-700 text-text-primary
rounded-md h-14 font-medium
transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105
```

**Outline (bold):**

```
border-4 border-primary text-primary bg-transparent rounded-md
transition-all duration-200
hover:bg-primary hover:text-white hover:scale-105
```

**Icon button (close, menu):**

```
w-12 h-12 flex items-center justify-center transition-opacity
hover:opacity-70 active:opacity-50
```

### Cards

"Color Block" style — solid background, no shadow, no border:

```
bg-bg-card rounded-lg p-6
group cursor-pointer transition-all duration-200
hover:scale-[1.02]
```

For colored feature cards, use soft tints: `bg-blue-50`, `bg-green-50`, etc.

### Inputs

```
Normal:  bg-bg-surface rounded-md text-text-primary border-0 h-12 px-4
Focus:   bg-bg-card border-2 border-primary focus:outline-none
```

No focus ring glow — just the hard `border-2` on focus.

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
- Style: `rounded-md bg-bg-card px-6 py-4`

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

### Motion Style: "Digital, Snappy, Direct"

- `transition-all duration-200` for most interactions
- `duration-300` for larger transformations
- Hover feedback through **scale** (`hover:scale-105` buttons, `hover:scale-[1.02]` cards) and **color shifts** (darkening/lightening)
- No shadow-based motion — all feedback is via scale and color

### Easing

| Token         | CSS Curve                           | Usage                             |
| ------------- | ----------------------------------- | --------------------------------- |
| `ios-default` | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | General UI transitions            |
| `spring`      | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy entrances, button feedback |
| `sharp`       | `cubic-bezier(0.4, 0, 0.6, 1)`      | Quick, decisive movements         |

### Framer Motion Conventions

**Entry animations:**

- Use `initial` + `animate` with variants object
- Always gate on `reduceMotion`: `initial={!reduceMotion ? { opacity: 0 } : false}`

**Tap feedback:**

- Standard: `whileTap={{ scale: 0.98 }}`
- Gate on reduceMotion: `whileTap={!reduceMotion ? { scale: 0.98 } : undefined}`

**Spring physics:**

- Default: `type: "spring", stiffness: 300, damping: 20`
- Snappy variant: `type: "spring", stiffness: 400, damping: 15`

**List stagger:**

- 50ms (0.05s) delay per item via `staggerChildren: 0.05`

### Reduce Motion

**Every animation must respect `reduceMotion`.**

Two layers:

1. **CSS layer (automatic):** `globals.css` includes `@media (prefers-reduced-motion: reduce)` and `.reduce-motion` rules
2. **Framer Motion layer (manual):** Must be gated explicitly using `reduceMotion` from `useTheme()`

---

## 7. Icons

- **Library:** Lucide React (`lucide-react`)
- **Stroke:** Standard (2px) to bold (2.5px for emphasis)
- **Sizing:** `w-5 h-5` (small/inline), `w-6 h-6` (standard), `w-8 h-8` (feature/display)
- **Treatment:** Often placed inside a solid colored circle: `bg-white text-blue-600 rounded-full w-14 h-14 flex items-center justify-center`
- **Animation:** `transition-transform duration-200 group-hover:scale-110` for icons within cards

---

## 8. Layout

### Page Structure

```
Header (fixed, z-40, max-w-7xl mx-auto)
  -> Safe area padding (pt-safe for iOS)
Main content (max-w-2xl or max-w-md depending on game)
  -> px-4 standard horizontal padding
```

### Container

- Standard: `max-w-7xl` for wide layouts
- Game/content: `max-w-2xl` (672px) or `max-w-md` (448px)

### Responsive Strategy

- **Mobile-first** — no responsive text sizing
- Panels use `w-[90vw]` on mobile with max-width constraints
- Dynamic viewport height: `100dvh` (with `100vh` fallback)
- iOS safe areas via `pt-safe`, `pb-safe` utilities

---

## 9. Accessibility

### Theme Modes

Three independent toggles via `ThemeContext`:

1. **Light/Dark** — `data-theme` attribute on root
2. **High Contrast** — `high-contrast` class, swaps to WCAG AAA palette
3. **Reduce Motion** — `reduce-motion` class, disables non-essential animation

### High Contrast Colors

| Token           | Light HC  | Dark HC   |
| --------------- | --------- | --------- |
| `hc-primary`    | `#1E40AF` | `#1E3A5F` |
| `hc-success`    | `#166534` | `#14532D` |
| `hc-error`      | `#991B1B` | `#7F1D1D` |
| `hc-background` | `#F3F4F6` | `#030712` |
| `hc-surface`    | `#F9FAFB` | `#111827` |
| `hc-text`       | `#000000` | `#FFFFFF` |
| `hc-border`     | `#000000` | `#93C5FD` |

### Focus States

Since we have no shadows, focus states use high-contrast solid outlines:

```
focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
```

### Minimum Requirements

- All interactive elements: 44x44px minimum tap target
- Focus indicators: visible focus ring on keyboard navigation
- Buttons: always have accessible text (aria-label for icon-only buttons)
- Color alone must not be the only indicator of state — use icons or text as well

---

## 10. Loading States

### Decision Matrix

| Scenario                                               | Pattern                          |
| ------------------------------------------------------ | -------------------------------- |
| **Full page loading** (first paint, game puzzle fetch) | Skeleton screen                  |
| **Modal/panel loading** (stats, achievements, archive) | Skeleton screen                  |
| **Button action** (save, submit, subscribe)            | Disabled + spinner + text change |
| **Background refresh** (silent re-fetch, sync)         | No visible indicator             |

**Never use:** A bare spinner centered on a blank page.

### Skeleton Screens

- Animation: `skeleton-shimmer` CSS class (2s linear infinite)
- Background: `bg-gray-200 dark:bg-gray-700`
- Radius: Match the content being replaced (`rounded-md` for buttons, `rounded-lg` for cards)
- No borders on skeleton elements
- Always check `reduceMotion` — skip animation if true

### Spinners

- `border-4 border-t-transparent rounded-full animate-spin`
- Sizes: `w-4 h-4` (button), `w-8 h-8` (inline), `w-12 h-12` (section)
- Always include `role="status"` and `aria-label="Loading"`

---

## 11. Anti-Patterns (Do Not)

- Use raw hex colors in components (use tokens)
- Use `bg-white` (use `bg-bg-surface`, `bg-bg-card`, or `bg-ghost-white`)
- Use `font-light` (not part of our weight scale)
- **Use any box shadows** (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-[Xpx...]`) — flat design means zero shadows
- **Use blur effects** (`backdrop-blur`, `blur-*`) — flat design means no blur
- **Use gradients on buttons or cards** — gradients are only for subtle background decoration
- Add new font families without discussion
- Use responsive text sizing (`sm:text-lg md:text-xl`) — mobile-first with consistent sizing
- Use arbitrary spacing values (`p-[13px]`) — stick to the Tailwind scale
- Use thick borders (`border-2`, `border-[3px]`, `border-[4px]`) for decoration — borders are subtle (1px) or absent. Reserve `border-2` for input focus states and high contrast mode only
- Use `border-black` — our borders use `border-main` / `border-light` tokens
- Use borders on cards, containers, or skeleton elements — use background color blocks to define structure instead
- Use neo-brutalist offset shadows or translate-based press effects
- Skip dark mode support on any visible element
- Skip high contrast conditional rendering where colors are used
- Use `animate-pulse` for skeletons (use `skeleton-shimmer` class)
- Skip `reduceMotion` checks on any Framer Motion animation
- Use `whileTap` with anything other than `{ scale: 0.98 }`
- Use custom `cubic-bezier` curves — only use the three defined easing tokens
