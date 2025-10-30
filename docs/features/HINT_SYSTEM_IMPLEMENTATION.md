# Contextual Hint System Implementation Guide

## Overview
This document tracks the implementation of the new contextual hint system for Tandem, replacing the random letter-reveal system with intelligent, crossword-style hints that follow Apple HIG and modern mobile game development standards.

## Implementation Status

### Phase 1: Infrastructure & Data Layer ⏳
- [ ] **Database Schema Updates** (`/src/lib/db.js`)
  - [ ] Add `hint` field to puzzle structure
  - [ ] Maintain backward compatibility for existing puzzles
  - [ ] Add hint validation utilities
  - [ ] Update save/load functions

- [ ] **API Modifications** (`/src/app/api/puzzle/route.js`)
  - [ ] Include hints in GET responses
  - [ ] Validate hints in POST requests
  - [ ] Add hint-specific error handling
  - [ ] Update response caching strategy

- [ ] **Storage Layer** (`/src/lib/storage.js`)
  - [ ] Save hint usage per answer
  - [ ] Track unlocked hints count
  - [ ] Persist hint display state
  - [ ] Handle storage migration

- [ ] **Migration Utilities**
  - [ ] Create schema migration script
  - [ ] Build bulk hint updater for admin
  - [ ] Add validation for hint quality
  - [ ] Create rollback mechanism

### Phase 2: Admin Tools & Content Generation ⏳
- [ ] **Puzzle Editor Enhancement** (`/src/components/admin/PuzzleEditor.jsx`)
  - [ ] Add hint input fields (60 char limit)
  - [ ] Implement hint validation
  - [ ] Add hint preview functionality
  - [ ] Include hint quality indicators
  - [ ] Support bulk hint editing

- [ ] **AI Service Updates** (`/src/services/ai.service.js`)
  - [ ] Modify prompt for hint generation
  - [ ] Parse hints from AI response
  - [ ] Validate hint appropriateness
  - [ ] Add fallback hint generation
  - [ ] Implement hint quality scoring

- [ ] **Admin Service** (`/src/services/admin.service.js`)
  - [ ] Handle hint saving
  - [ ] Validate hint uniqueness
  - [ ] Check hint difficulty balance
  - [ ] Support hint suggestions

### Phase 3: Game State Management ⏳
- [ ] **State Updates** (`/src/hooks/useGameState.js`)
  - [ ] Change hintsUsed to numeric (0-2)
  - [ ] Add hintedAnswers array
  - [ ] Track unlockedHints count
  - [ ] Add hint display states
  - [ ] Implement hint animation states

- [ ] **Logic Updates** (`/src/hooks/useGameLogic.js`)
  - [ ] Refactor useHint() for context
  - [ ] Add hint unlock logic
  - [ ] Prevent duplicate hints
  - [ ] Handle hint exhaustion
  - [ ] Track hint effectiveness

- [ ] **New Hint Hook** (`/src/hooks/useHintSystem.js`)
  - [ ] Centralize hint management
  - [ ] Handle unlock conditions
  - [ ] Manage hint animations
  - [ ] Track hint analytics
  - [ ] Provide hint availability

### Phase 4: UI Components (Apple HIG) ⏳
- [ ] **HintDisplay Component** (NEW: `/src/components/game/HintDisplay.jsx`)
  - [ ] Slide-in animation (0.3s)
  - [ ] SF Symbol lightbulb icon
  - [ ] System yellow color scheme
  - [ ] Responsive text sizing
  - [ ] Auto-dismiss on solve
  - [ ] Landscape support

- [ ] **PuzzleRow Updates** (`/src/components/game/PuzzleRow.jsx`)
  - [ ] Remove letter hint logic
  - [ ] Add hint text container
  - [ ] Implement focus indicators
  - [ ] Support hint highlighting
  - [ ] Handle hint tap targets

- [ ] **PlayingScreen Updates** (`/src/components/game/PlayingScreen.jsx`)
  - [ ] Update hint button text
  - [ ] Show available hints count
  - [ ] Handle focused answer hints
  - [ ] Add unlock celebration
  - [ ] Implement hint tutorial

### Phase 5: Polish & Accessibility ⏳
- [ ] **Haptic Feedback**
  - [ ] Hint button tap feedback
  - [ ] Hint unlock celebration
  - [ ] Error state vibration
  - [ ] Success confirmation

- [ ] **Accessibility**
  - [ ] VoiceOver labels for hints
  - [ ] Dynamic Type support
  - [ ] Reduce Motion compliance
  - [ ] High Contrast mode
  - [ ] Keyboard navigation

- [ ] **Animations**
  - [ ] Hint reveal (slide + fade)
  - [ ] Unlock celebration
  - [ ] Button state transitions
  - [ ] Focus ring animations

- [ ] **Performance**
  - [ ] Lazy load hint data
  - [ ] Memoize hint components
  - [ ] Optimize re-renders
  - [ ] Reduce bundle size

## Apple HIG Compliance Checklist

### Visual Design ✅
- [ ] SF Symbols for icons
- [ ] System font (SF Pro)
- [ ] Semantic colors (systemYellow)
- [ ] 8pt grid alignment
- [ ] Consistent corner radius (12pt)
- [ ] Proper shadow/elevation

### Interaction ✅
- [ ] 44x44pt minimum touch targets
- [ ] Immediate visual feedback
- [ ] Smooth transitions (0.3s)
- [ ] Clear affordances
- [ ] Predictable behavior
- [ ] Gesture support

### Accessibility ✅
- [ ] Full VoiceOver support
- [ ] Dynamic Type compliance
- [ ] Reduce Motion honored
- [ ] High Contrast support
- [ ] Color blind friendly
- [ ] Focus management

## Modern Game Standards Checklist

### Player Experience 🎮
- [ ] Meaningful player choice
- [ ] Progressive difficulty
- [ ] Clear feedback loops
- [ ] Reward mechanisms
- [ ] Frustration prevention
- [ ] Engagement tracking

### Technical Excellence 💻
- [ ] Error boundaries
- [ ] Graceful degradation
- [ ] State predictability
- [ ] Performance metrics
- [ ] Analytics integration
- [ ] A/B testing ready

### Mobile Optimization 📱
- [ ] All iOS device sizes
- [ ] Portrait/landscape
- [ ] Offline capability
- [ ] Battery efficiency
- [ ] Network optimization
- [ ] Storage efficiency

## Testing Scenarios

### Unit Tests
```javascript
// Hint system tests
- [ ] Hint unlock after 2 correct answers
- [ ] Maximum 2 hints per game
- [ ] Hint persists on refresh
- [ ] Hint clears on new game
- [ ] Focus tracking accuracy
- [ ] Hint exhaustion handling
```

### Integration Tests
```javascript
// Full flow tests
- [ ] Complete hint flow (request → display → solve)
- [ ] Hint + answer submission
- [ ] Multiple hints in one game
- [ ] Hint state persistence
- [ ] Migration compatibility
```

### Device Testing
- [ ] iPhone SE (smallest)
- [ ] iPhone 15 (standard)
- [ ] iPhone 15 Pro Max (largest)
- [ ] iPad Mini
- [ ] iPad Pro 12.9"
- [ ] Landscape orientation
- [ ] Split View (iPad)

## Hint Writing Guidelines

### Good Hints ✅
- **Concise**: 3-8 words ideal
- **Clear**: Unambiguous meaning
- **Clever**: Engaging wordplay when appropriate
- **Contextual**: Related to theme
- **Accessible**: No specialized knowledge

### Bad Hints ❌
- Too vague: "A thing"
- Too specific: "The GE Profile 5.0 cu ft"
- Too long: Won't fit on one line
- Too clever: Obscure references
- Too easy: Gives away answer

### Examples
| Answer | Good Hint | Bad Hint |
|--------|-----------|----------|
| STOVE | "Kitchen cooking surface" | "Thing that heats" |
| FRIDGE | "Cold food storage" | "Refrigerator" |
| TOASTER | "Bread browning device" | "Makes things crispy" |
| COFFEE | "Morning brew machine" | "Caffeine" |

## Performance Benchmarks

### Target Metrics
- Hint display: < 100ms
- Animation start: < 16ms
- State update: < 50ms
- API response: < 200ms
- Bundle increase: < 5KB

### Monitoring
- [ ] React DevTools Profiler
- [ ] Lighthouse scores
- [ ] Bundle analyzer
- [ ] Network waterfall
- [ ] Memory profiler

## Migration Guide

### For Existing Puzzles
1. Run migration script: `npm run migrate:hints`
2. Access admin panel
3. Navigate to past puzzles
4. Add hints for each answer
5. Validate and save

### Bulk Hint Addition
```javascript
// Admin panel will support CSV import:
// date,puzzle_index,hint
// 2025-10-01,0,"Kitchen surface"
// 2025-10-01,1,"Cold storage"
```

## Launch Checklist

### Pre-Launch
- [ ] All tests passing
- [ ] Device testing complete
- [ ] Accessibility audit passed
- [ ] Performance targets met
- [ ] Migration tested
- [ ] Documentation complete

### Launch Day
- [ ] Deploy to staging
- [ ] Smoke tests pass
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Check analytics
- [ ] User feedback loop

### Post-Launch
- [ ] Monitor hint usage
- [ ] Track effectiveness
- [ ] Gather feedback
- [ ] Iterate on hints
- [ ] Update guidelines
- [ ] Plan enhancements

## Code Style Guidelines

### Component Structure
```jsx
// Follow this pattern for hint components
const HintDisplay = ({ hint, isVisible, onDismiss }) => {
  // Hooks first
  const { haptics } = useHaptics();
  const { theme } = useTheme();

  // State management
  const [animating, setAnimating] = useState(false);

  // Effects
  useEffect(() => {
    // Animation logic
  }, [isVisible]);

  // Render
  return (
    <motion.div className={styles.hint}>
      {/* Content */}
    </motion.div>
  );
};
```

### State Management
```javascript
// Hint state shape
const hintState = {
  hintsUsed: 0,        // 0, 1, or 2
  unlockedHints: 1,    // 1 or 2
  hintedAnswers: [],   // [0, 2] (indices)
  activeHint: null,    // { index: 0, text: "..." }
  showingHint: false,  // Animation state
};
```

## Analytics Events

### Track These Events
```javascript
// Hint usage
track('hint_requested', {
  puzzleNumber,
  answerIndex,
  hintsUsed
});

track('hint_unlocked', {
  puzzleNumber,
  correctAnswers
});

track('hint_effectiveness', {
  puzzleNumber,
  solvedAfterHint: boolean,
  timeToSolve: ms
});
```

## Support & Troubleshooting

### Common Issues
1. **Hints not showing**: Check focusedIndex state
2. **Unlock not working**: Verify correctAnswers count
3. **Animation janky**: Check Reduce Motion setting
4. **Text cut off**: Verify character limit
5. **Wrong hint**: Check answer index mapping

### Debug Commands
```javascript
// In browser console
localStorage.getItem('tandem-hints-debug')
window.__HINT_STATE__
window.__debugHints = true
```

## Version History
- **v1.0.0** - Initial implementation (Oct 2025)
- **v1.1.0** - (Planned) Difficulty-based hints
- **v1.2.0** - (Planned) Progressive hints
- **v2.0.0** - (Planned) AI-powered dynamic hints

---

*Last Updated: October 19, 2025*
*Implementation Lead: Jason Bartz*
*Status: In Progress*