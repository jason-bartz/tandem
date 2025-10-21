# UI Icons

This directory contains all UI icons used throughout the Tandem application with automatic theme-aware switching.

## Structure

Icons are organized with light and dark mode variants:

- Light mode: `{icon-name}.png`
- Dark mode: `{icon-name}-dark.png`

## Available Icons

- **achievements** - Game Center achievements icon
- **archive** - Puzzle archive icon
- **hardmode** - Hard mode indicator icon
- **hint** - Hint indicator icon
- **how-to-play** - How to play tutorial icon
- **leaderboard** - Game Center leaderboard icon
- **settings** - Settings menu icon
- **stats** - Statistics icon
- **tandem-unlimited** - Premium subscription icon

## Usage

Import and use the `useUIIcon` hook in your component:

```jsx
import { useUIIcon } from '@/hooks/useUIIcon';

function MyComponent() {
  const getIconPath = useUIIcon();

  return <img src={getIconPath('stats')} alt="Statistics" />;
}
```

The hook automatically returns the correct icon path based on the current theme (light/dark mode).

## Adding New Icons

1. Add both light and dark variants to this directory:
   - `new-icon.png` (light mode)
   - `new-icon-dark.png` (dark mode)

2. Use the `useUIIcon` hook to reference it:
   ```jsx
   const iconPath = getIconPath('new-icon');
   ```

## Best Practices

- Always provide both light and dark variants
- Use consistent naming: base name + `-dark` suffix
- Keep icons optimized (PNG format, reasonable file size)
- Ensure sufficient contrast for accessibility
- Test icons in both themes before deployment
