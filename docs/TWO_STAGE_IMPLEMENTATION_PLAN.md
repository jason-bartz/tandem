# Two-Stage Implementation Plan: Cryptic Migration + Unified Stats

**Project:** Tandem Games - Complete Stats Infrastructure Overhaul
**Created:** January 2025
**Status:** Planning Phase - Awaiting Approval

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Why Two Stages](#why-two-stages)
3. [Stage 1: Daily Cryptic Migration](#stage-1-daily-cryptic-migration)
4. [Stage 2: Unified Stats Modal](#stage-2-unified-stats-modal)
5. [Complete Timeline](#complete-timeline)
6. [Dependencies & Blockers](#dependencies--blockers)
7. [Success Criteria](#success-criteria)
8. [Rollback Strategy](#rollback-strategy)

---

## Executive Summary

### The Goal
Create a world-class, unified statistics system for Tandem Games that:
- ✅ Works identically on iOS and Web
- ✅ Syncs across devices via CloudKit (iOS)
- ✅ Displays stats for both games in one beautiful modal
- ✅ Follows Apple HIG and mobile game best practices
- ✅ Is production-ready and maintainable

### The Approach
**Two-stage implementation** for cleaner foundation and reduced risk:

**Stage 1 (Week 1): Cryptic Migration**
- Migrate Daily Cryptic to platform-agnostic storage
- Add CloudKit sync for Daily Cryptic (match Tandem)
- Ensure both games use identical infrastructure
- **Deliverable:** Daily Cryptic works same as Tandem Daily

**Stage 2 (Week 2): Unified Stats Modal**
- Build unified stats modal on clean foundation
- Both games load from same storage patterns
- Single modal accessible from both games
- **Deliverable:** Production-ready unified stats system

### Timeline
- **Stage 1:** 5 days (includes CloudKit integration)
- **Stage 2:** 4 days (cleaner implementation on solid foundation)
- **Total:** 9 days (~2 weeks)

---

## Why Two Stages

### Technical Reasons

**1. Clean Foundation ✅**
```
Stage 1: Ensure both games use same storage pattern
   ↓
Stage 2: Build unified modal that works with both
```
vs.
```
❌ Build modal while games use different storage
   ↓
❌ Hacky workarounds and technical debt
```

**2. Reduced Risk ✅**
- Test each stage independently
- Catch issues early before they compound
- Easier rollback if something fails

**3. Better Code Quality ✅**
- Unified modal code is simpler when both games match
- No "if Tandem use this, if Cryptic use that" logic
- Single source of truth for data loading

**4. CloudKit Integration ✅**
- Add CloudKit to Cryptic in Stage 1
- Stage 2 unified modal automatically gets CloudKit benefits
- No need to retrofit later

### User Experience Reasons

**1. No Breaking Changes During Modal Build**
- Stage 1: Invisible migration (users don't notice)
- Stage 2: New feature (unified modal) when foundation is solid

**2. Faster Bug Fixes**
- If Stage 1 has issues, fix before building Stage 2
- If Stage 2 has issues, doesn't affect core storage

**3. Better Testing**
- Test migration thoroughly before adding new UI
- Test new UI on proven storage layer

---

## Stage 1: Daily Cryptic Migration

### Duration: 5 Days

### Objectives
1. ✅ Migrate Daily Cryptic to platform-agnostic storage (iOS Preferences, Web localStorage)
2. ✅ Add CloudKit sync for Daily Cryptic (match Tandem)
3. ✅ Ensure zero data loss for existing users
4. ✅ Match Tandem's proven storage pattern exactly

### Detailed Tasks

#### Day 1: Platform-Agnostic Storage Layer

**Morning (4 hours):**
- [ ] Add platform-agnostic helpers to `crypticStorage.js`
  - `getCrypticStorageItem(key)`
  - `setCrypticStorageItem(key, value)`
  - `removeCrypticStorageItem(key)`
  - `getCrypticStorageKeys()`
- [ ] Write unit tests for helpers (both iOS and Web)
- [ ] Test on both platforms

**Afternoon (4 hours):**
- [ ] Migrate core storage functions to async:
  - `saveCrypticStats()` → async
  - `loadCrypticStats()` → async
  - `saveCrypticGameState()` → async
  - `loadCrypticGameState()` → async
  - `clearCrypticGameState()` → async
- [ ] Update all internal calls within `crypticStorage.js`
- [ ] Write unit tests for migrated functions

**Deliverable:** ✅ Platform-agnostic storage layer working on iOS + Web

---

#### Day 2: Update All Call Sites

**Morning (4 hours):**
- [ ] Update `useCrypticGame.js` - add `await` to ~8 storage calls:
  - Line 78: `await saveCrypticGameState(...)`
  - Line 108: `await loadCrypticPuzzleProgress(...)`
  - Line 109: `await loadCrypticGameState()`
  - Line 175: `await saveCrypticPuzzleProgress(...)`
  - Line 241: `await saveCrypticPuzzleProgress(...)`
  - Line 250: `await updateCrypticStatsAfterCompletion(...)`
  - Line 270: `await clearCrypticGameState()`
  - Line 359: `await clearCrypticGameState()`
- [ ] Add proper error handling (try/catch or .catch())
- [ ] Test game flow works correctly

**Afternoon (4 hours):**
- [ ] Update any other components that call crypticStorage:
  - Check `CrypticCompleteScreen.jsx`
  - Check `CrypticWelcomeScreen.jsx`
  - Check admin pages if any
- [ ] Test all user flows (start game, complete puzzle, view archive)
- [ ] Verify no regressions

**Deliverable:** ✅ All Daily Cryptic storage calls are async and platform-agnostic

---

#### Day 3: iOS Data Migration + CloudKit Foundation

**Morning (4 hours):**
- [ ] Add iOS data migration function:
  - Detect old localStorage data on iOS
  - Migrate to Preferences automatically
  - Mark migration complete with flag
  - Test with real data from TestFlight users
- [ ] Test migration thoroughly:
  - Install old version with data
  - Update to new version
  - Verify all stats migrated correctly
  - Verify no data loss

**Afternoon (4 hours):**
- [ ] Add CloudKit service integration to `crypticStorage.js`:
  - Import `cloudKitService` (existing service)
  - Add `loadCrypticStats()` CloudKit merge logic
  - Add `saveCrypticStats()` CloudKit sync logic
  - Match Tandem's exact pattern
- [ ] Update `loadCrypticStats()` to merge with CloudKit:
  ```javascript
  // Match Tandem's loadStats() pattern
  export async function loadCrypticStats() {
    const localStats = await getCrypticStorageItem(...);

    if (cloudKitService.isSyncAvailable()) {
      const cloudStats = await cloudKitService.fetchCrypticStats();
      if (cloudStats) {
        const mergedStats = mergeCrypticStats(localStats, cloudStats);
        await saveCrypticStats(mergedStats, true); // skipCloudSync
        return mergedStats;
      }
    }

    return localStats;
  }
  ```

**Deliverable:** ✅ iOS migration working + CloudKit foundation ready

---

#### Day 4: CloudKit Sync Implementation

**Morning (4 hours):**
- [ ] Update `cloudKitService.js` to support Daily Cryptic:
  - Add `fetchCrypticStats()` method
  - Add `syncCrypticStats(stats)` method
  - Add cryptic record types to CloudKit schema
  - Match Tandem's sync patterns exactly
- [ ] Add conflict resolution for cryptic stats:
  - Take max values for counters (totalCompleted, longestStreak, etc.)
  - Take most recent date for currentStreak
  - Merge completedPuzzles objects

**Afternoon (4 hours):**
- [ ] Update `saveCrypticStats()` to sync to CloudKit:
  ```javascript
  export async function saveCrypticStats(stats, skipCloudSync = false) {
    // Save locally first (instant)
    await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(stats));

    // Sync to CloudKit (background, non-blocking)
    if (!skipCloudSync && cloudKitService.isSyncAvailable()) {
      const syncResult = await cloudKitService.syncCrypticStats(stats);
      if (syncResult.mergedStats) {
        await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(syncResult.mergedStats));
        return syncResult.mergedStats;
      }
    }

    return stats;
  }
  ```
- [ ] Test CloudKit sync:
  - Play puzzle on iPhone → verify syncs to iCloud
  - Open iPad → verify stats pulled from iCloud
  - Offline test → verify queues for later sync

**Deliverable:** ✅ CloudKit sync working for Daily Cryptic (matches Tandem)

---

#### Day 5: Testing, Polish & Documentation

**Morning (4 hours):**
- [ ] Comprehensive testing:
  - Web: Chrome, Safari, Firefox
  - iOS: iPhone, iPad
  - Test migration path (old data → new storage)
  - Test CloudKit sync (multiple devices)
  - Test offline → online transitions
  - Verify stats accuracy after migration
- [ ] Performance testing:
  - Measure load times (should be < 100ms)
  - Verify no UI jank
  - Check memory usage

**Afternoon (4 hours):**
- [ ] Code cleanup:
  - Remove old `*Async` duplicate functions
  - Clean up comments
  - Update JSDoc documentation
  - Remove dead code
- [ ] Write migration summary document:
  - What changed
  - How to test
  - Known issues (if any)
  - Rollback procedure
- [ ] Code review preparation:
  - Create PR with detailed description
  - Add screenshots/videos of testing
  - Document any edge cases

**Deliverable:** ✅ Stage 1 complete, tested, and ready for production

---

### Stage 1 Success Criteria

**Must Pass Before Stage 2:**
- ✅ All cryptic storage functions are async
- ✅ iOS uses Capacitor Preferences
- ✅ Web uses localStorage
- ✅ CloudKit sync works on iOS (match Tandem)
- ✅ Zero data loss during migration
- ✅ All unit tests pass
- ✅ Manual testing complete on iOS + Web
- ✅ Performance benchmarks met (< 100ms load)
- ✅ Code review approved
- ✅ QA sign-off

**Deployment:**
- Deploy to TestFlight for beta testing (3-5 days)
- Monitor for issues
- Fix any bugs before Stage 2
- Deploy to production when stable

---

## Stage 2: Unified Stats Modal

### Duration: 4 Days

### Objectives
1. ✅ Build unified stats modal accessible from both games
2. ✅ Display Tandem + Cryptic stats side-by-side
3. ✅ Unified sharing functionality
4. ✅ Production-ready UI/UX
5. ✅ Apple HIG compliant

### Detailed Tasks

#### Day 6: Core Modal Components

**Morning (4 hours):**
- [ ] Create `src/components/stats/` directory
- [ ] Build `UnifiedStatsModal.jsx`:
  - Modal container with close button
  - Dark mode support
  - High contrast mode support
  - Accessibility (VoiceOver, keyboard nav)
  - Animations (respect reduce motion)
- [ ] Build `StatCard.jsx`:
  - Reusable stat display card
  - Animated counter (using `useCounterAnimation`)
  - Color-coded backgrounds
  - Haptic feedback on press
  - Props: `value`, `label`, `color`, `icon`, `isExpandable`, `onPress`

**Afternoon (4 hours):**
- [ ] Build `TandemStatsSection.jsx`:
  - Display Tandem stats in 2x2 grid
  - Cards: Played, Win Rate, Current Streak, Best Streak
  - Use existing Tandem colors (blue, green, yellow, pink)
  - Loading skeleton
  - Error state
- [ ] Build `CrypticStatsSection.jsx`:
  - Display Cryptic stats in 2x2 grid
  - Cards: Completed, Current Streak, Perfect Solves, Avg Time
  - Use purple theme (match Daily Cryptic)
  - Loading skeleton
  - Error state

**Deliverable:** ✅ Core components built and rendering

---

#### Day 7: Data Integration

**Morning (4 hours):**
- [ ] Create `src/hooks/useUnifiedStats.js`:
  ```javascript
  export function useUnifiedStats() {
    const [loading, setLoading] = useState(true);
    const [tandemStats, setTandemStats] = useState(null);
    const [crypticStats, setCrypticStats] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
      loadStats();
    }, []);

    async function loadStats() {
      try {
        setLoading(true);

        // Load both in parallel
        const [tandem, cryptic] = await Promise.all([
          loadTandemStats(),     // From storage.js (includes CloudKit merge)
          loadCrypticStatsData() // From crypticStorage.js (includes CloudKit merge)
        ]);

        setTandemStats(tandem);
        setCrypticStats(cryptic);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    return { tandemStats, crypticStats, loading, error, refresh: loadStats };
  }
  ```
- [ ] Create helper to load cryptic stats (server-first, local fallback):
  ```javascript
  async function loadCrypticStatsData() {
    const user = await getUser();

    if (user) {
      // Authenticated: Try server first
      try {
        const response = await crypticService.getAggregateStats();
        if (response.success) {
          return response.stats;
        }
      } catch (err) {
        console.warn('Failed to load server stats, using local');
      }
    }

    // Fallback to local (or unauthenticated users)
    return await loadCrypticStats(); // From crypticStorage.js
  }
  ```

**Afternoon (4 hours):**
- [ ] Integrate `useUnifiedStats` into `UnifiedStatsModal`:
  - Pass stats to sections
  - Handle loading states
  - Handle error states
  - Show sync status indicators
- [ ] Test data loading:
  - Verify Tandem stats load correctly (with CloudKit merge)
  - Verify Cryptic stats load correctly (with CloudKit merge)
  - Verify stats refresh when modal reopens
  - Verify offline functionality

**Deliverable:** ✅ Real data loading into modal from both games

---

#### Day 8: Share Functionality & Integration

**Morning (4 hours):**
- [ ] Create `src/lib/unifiedShareText.js`:
  ```javascript
  export function generateUnifiedShareText(tandemStats, crypticStats) {
    return `My Tandem Games Stats 🎮
  ═══════════════════════

  🎮 Tandem Daily
  Played: ${tandemStats.played} | Win Rate: ${calculateWinRate(tandemStats)}%
  Current Streak: ${tandemStats.currentStreak} 🔥

  🧩 Daily Cryptic
  Completed: ${crypticStats.totalCompleted} | Perfect: ${crypticStats.perfectSolves}
  Current Streak: ${crypticStats.currentStreak} 🔥

  Play at tandemdaily.com
  #TandemGames`;
  }
  ```
- [ ] Add share button to `UnifiedStatsModal`:
  - Use existing `ShareButton` component
  - Platform-aware (native share on iOS, clipboard on Web)
  - Success feedback with haptics
  - "Copied!" message

**Afternoon (4 hours):**
- [ ] Integrate modal into both games:
  - Update `src/components/game/CompleteScreen.jsx`:
    - Replace old `StatsModal` with `UnifiedStatsModal`
    - Add stats button to header
  - Update `src/components/cryptic/CrypticCompleteScreen.jsx`:
    - Add stats button to header
    - Open `UnifiedStatsModal` on click
  - Update `src/components/Settings.jsx`:
    - Add "View Statistics" option
    - Open `UnifiedStatsModal`
- [ ] Add haptic feedback throughout:
  - Light tap on modal open
  - Light tap on card press
  - Success haptic on share

**Deliverable:** ✅ Modal accessible from all entry points with sharing

---

#### Day 9: Polish, Testing & Documentation

**Morning (4 hours):**
- [ ] Visual polish:
  - Fine-tune spacing and alignment
  - Verify colors match design system
  - Test dark mode appearance
  - Test high contrast mode
  - Verify animations are smooth
  - Add subtle micro-interactions
- [ ] Accessibility improvements:
  - Add ARIA labels to all interactive elements
  - Test VoiceOver navigation
  - Verify keyboard navigation works
  - Check focus indicators
  - Test with Dynamic Type (text scaling)
  - Verify touch targets are 44x44pt minimum

**Afternoon (4 hours):**
- [ ] Comprehensive testing:
  - Test on iPhone SE (small screen)
  - Test on iPhone 15 Pro (Dynamic Island)
  - Test on iPad (tablet layout)
  - Test on Web (Chrome, Safari, Firefox)
  - Test modal open/close animations
  - Test counter animations
  - Test with reduce motion enabled
  - Test offline functionality
  - Test with no stats (new user)
  - Test with high stats (power user)
- [ ] Performance testing:
  - Modal open time: < 16ms ✅
  - Stats load time: < 100ms ✅
  - Animations: 60fps ✅
  - Memory usage: < 5MB ✅
- [ ] Create test report document
- [ ] Update `UNIFIED_STATS_IMPLEMENTATION.md` with final notes

**Deliverable:** ✅ Stage 2 complete, polished, and production-ready

---

### Stage 2 Success Criteria

**Must Pass Before Production:**
- ✅ Modal opens from all entry points (Tandem Complete, Cryptic Complete, Settings)
- ✅ Displays accurate stats for both games
- ✅ Tandem stats include CloudKit sync
- ✅ Cryptic stats include CloudKit sync
- ✅ Share button generates correct unified text
- ✅ Dark mode works perfectly
- ✅ High contrast mode works perfectly
- ✅ Animations respect reduce motion
- ✅ VoiceOver navigation works
- ✅ Performance benchmarks met
- ✅ All manual tests pass
- ✅ Code review approved
- ✅ QA sign-off

---

## Complete Timeline

### Week 1: Stage 1 - Daily Cryptic Migration

| Day | Focus | Key Deliverables |
|-----|-------|------------------|
| **Day 1** | Platform-agnostic storage | Helpers + async functions |
| **Day 2** | Update call sites | All storage calls async |
| **Day 3** | Migration + CloudKit setup | iOS migration + CloudKit foundation |
| **Day 4** | CloudKit sync | Full CloudKit integration |
| **Day 5** | Testing & polish | Stage 1 production-ready |

**Milestone:** ✅ Daily Cryptic matches Tandem's storage pattern + CloudKit sync

---

### Week 2: Stage 2 - Unified Stats Modal

| Day | Focus | Key Deliverables |
|-----|-------|------------------|
| **Day 6** | Core components | Modal + sections built |
| **Day 7** | Data integration | Real stats loading |
| **Day 8** | Share + integration | Modal in all games |
| **Day 9** | Polish & testing | Production-ready |

**Milestone:** ✅ Unified stats modal live in production

---

## Dependencies & Blockers

### Stage 1 Dependencies

**Technical:**
- ✅ Capacitor Preferences API available
- ✅ CloudKit service already exists (from Tandem)
- ✅ Supabase cryptic_user_stats table exists
- ✅ iOS app has iCloud entitlements

**Potential Blockers:**
- ⚠️ CloudKit schema changes (need to add cryptic record types)
- ⚠️ iOS data migration issues (plan: extensive testing)
- ⚠️ Breaking changes to useCrypticGame hook (plan: backward compat testing)

**Mitigation:**
- Test CloudKit schema changes in dev environment first
- Beta test migration with TestFlight users
- Keep rollback plan ready

---

### Stage 2 Dependencies

**Technical:**
- ✅ Stage 1 complete and deployed (blocking dependency)
- ✅ Both games use same storage pattern
- ✅ CloudKit sync working for both games
- ✅ Existing UI components (ShareButton, etc.)

**Potential Blockers:**
- ⚠️ Stage 1 issues delaying Stage 2 start
- ⚠️ Design changes during implementation
- ⚠️ Performance issues on older devices

**Mitigation:**
- Don't start Stage 2 until Stage 1 is stable in production
- Lock design before starting implementation
- Test on older devices early (iPhone SE, iPad mini)

---

## Success Criteria

### Overall Project Success

**Technical Metrics:**
- ✅ Daily Cryptic uses platform-agnostic storage (iOS + Web)
- ✅ Daily Cryptic has CloudKit sync (match Tandem)
- ✅ Unified modal displays stats from both games
- ✅ All stats accurate and properly synced
- ✅ Performance targets met (< 16ms modal, < 100ms load)
- ✅ Zero data loss during migration
- ✅ Error rate < 0.1%

**User Metrics:**
- ✅ 60%+ of completions view stats
- ✅ 15%+ of stats views result in shares
- ✅ No increase in support tickets
- ✅ Positive user feedback

**Code Quality:**
- ✅ 100% test coverage for storage layer
- ✅ All code reviewed and approved
- ✅ Documentation complete
- ✅ No technical debt introduced

---

## Rollback Strategy

### Stage 1 Rollback

**If migration fails:**

1. **Revert Code Changes:**
   ```bash
   git revert <stage-1-commit-range>
   ```

2. **Clear Migrated iOS Data:**
   - Add developer tool to Settings
   - Clear all Preferences keys starting with `cryptic_`
   - Restore from localStorage backup (if kept)

3. **Redeploy Previous Version:**
   - Deploy last known good version
   - Monitor for data consistency

4. **User Communication:**
   - Notify affected users
   - Explain rollback
   - Provide ETA for fix

---

### Stage 2 Rollback

**If unified modal has issues:**

1. **Remove Modal Integration:**
   - Restore old `StatsModal` for Tandem
   - Remove stats button from Cryptic
   - Keep Stage 1 changes (they're stable)

2. **Revert Components:**
   ```bash
   git revert <stage-2-commit-range>
   # Keep Stage 1 commits intact
   ```

3. **Verify Core Functionality:**
   - Both games still work
   - Stats still save correctly
   - CloudKit sync still works

**Advantage:** Stage 2 rollback doesn't affect Stage 1 (storage layer is independent)

---

## Risk Assessment

### Overall Risk: Medium-Low

| Risk | Probability | Impact | Stage | Mitigation |
|------|-------------|--------|-------|------------|
| Data loss during migration | Low | Critical | 1 | Extensive testing, backup mechanism |
| CloudKit sync fails | Medium | High | 1 | Fallback to local, retry queue |
| Performance regression | Low | Medium | 2 | Performance testing, optimization |
| Breaking game flows | Medium | High | 1 | Thorough integration testing |
| iOS migration bugs | Medium | High | 1 | Beta testing, phased rollout |
| Modal UI issues | Low | Low | 2 | Design review, user testing |

**Overall Mitigation:**
- Two-stage approach reduces compound risk
- Extensive testing at each stage
- Beta testing before production
- Rollback plans ready
- Monitoring and alerts in place

---

## Communication Plan

### Internal Team

**Stage 1:**
- 📢 Kickoff meeting (review plan, answer questions)
- 📋 Daily standups (progress updates, blockers)
- 🎯 Code reviews (all changes reviewed before merge)
- 🧪 QA handoff (detailed test plan)
- ✅ Stage 1 completion meeting (review metrics, decide on Stage 2 start)

**Stage 2:**
- 📢 Design review (finalize UI/UX)
- 📋 Daily standups
- 🎯 Code reviews
- 🧪 QA handoff
- ✅ Final review (production readiness)

---

### Users

**Stage 1 (Invisible Migration):**
- ℹ️ No user-facing announcements
- ℹ️ Silent migration happens automatically
- ⚠️ If issues: Immediate notification + rollback

**Stage 2 (New Feature):**
- 📣 Feature announcement (social media, in-app)
- 📝 Blog post explaining unified stats
- 📹 Demo video showing new modal
- 💬 Encourage sharing stats

---

## Resource Requirements

### Engineering

**Stage 1:**
- 1 senior engineer (full-time, 5 days)
- 1 QA engineer (3 days testing)

**Stage 2:**
- 1 senior engineer (full-time, 4 days)
- 1 QA engineer (2 days testing)

**Total:** ~2 engineer-weeks

---

### Design

**Stage 1:**
- None (using existing patterns)

**Stage 2:**
- Design review for unified modal (2 hours)
- Final UI polish feedback (1 hour)

---

### QA

**Stage 1:**
- iOS testing (iPhone, iPad)
- Web testing (Chrome, Safari, Firefox)
- Migration testing (old → new)
- CloudKit sync testing (multiple devices)
- Regression testing

**Stage 2:**
- UI testing (all devices)
- Integration testing (all entry points)
- Accessibility testing (VoiceOver, keyboard)
- Performance testing
- Regression testing

---

## Post-Launch Monitoring

### Stage 1 Metrics to Track

**Week 1 After Deploy:**
- Error rates (target: < 0.1%)
- CloudKit sync success rate (target: > 95%)
- Stats load times (target: < 100ms)
- Migration completion rate (target: 100% of iOS users)
- User-reported issues (target: < 5)

**Action Items:**
- Daily error log review
- CloudKit sync monitoring
- User feedback monitoring
- Hotfix deployment if critical issues found

---

### Stage 2 Metrics to Track

**Week 1 After Deploy:**
- Modal open rate (target: > 60% of completions)
- Share rate (target: > 15% of modal views)
- Modal performance (target: < 16ms open)
- Error rates (target: < 0.1%)
- User feedback (target: mostly positive)

**Action Items:**
- Analytics dashboard review (daily)
- User feedback monitoring
- Performance monitoring
- A/B test opportunities

---

## Future Enhancements (Post-Launch)

### Phase 3: Expandable Stats (Month 2)
- Tap stat card to view detailed breakdown
- Streak history calendar view
- Puzzle completion history
- Time-based analytics

### Phase 4: Achievements & Badges (Month 3)
- Milestone badges (7-day streak, 100 puzzles, etc.)
- Achievement celebration animations
- Shareable achievement cards
- Achievement leaderboards

### Phase 5: Advanced Analytics (Month 4)
- Win rate trends over time
- Average solve time trends
- Difficulty analysis
- Personalized insights ("You're fastest on Mondays!")

---

## Approval & Sign-Off

### Stage 1 Approval
- [ ] Product Owner: ____________________  Date: ______
- [ ] Engineering Lead: __________________  Date: ______
- [ ] QA Lead: __________________________  Date: ______

### Stage 2 Approval
- [ ] Product Owner: ____________________  Date: ______
- [ ] Engineering Lead: __________________  Date: ______
- [ ] Design Lead: ______________________  Date: ______
- [ ] QA Lead: __________________________  Date: ______

### Production Deployment
- [ ] Stage 1 Deployed: __________________  Date: ______
- [ ] Stage 1 Verified: __________________  Date: ______
- [ ] Stage 2 Deployed: __________________  Date: ______
- [ ] Stage 2 Verified: __________________  Date: ______

---

## Key Decisions Log

| Date | Decision | Rationale | Stakeholder |
|------|----------|-----------|-------------|
| Jan 2025 | Two-stage approach | Cleaner foundation, reduced risk | Engineering |
| Jan 2025 | Add CloudKit to Cryptic | Match Tandem, cross-device sync | Product |
| Jan 2025 | Migrate first, then build modal | Solid foundation for modal | Engineering |
| Jan 2025 | 9-day timeline (5 + 4) | Realistic with testing | Engineering + QA |

---

## Questions & Answers

**Q: Why not build the modal first and migrate later?**
A: Building on mismatched foundations leads to hacky code and technical debt. Clean migration first = cleaner modal code.

**Q: Can we skip CloudKit for Cryptic?**
A: We could, but then Cryptic users don't get cross-device sync. Better to add it now while we're doing the migration.

**Q: What if Stage 1 takes longer than 5 days?**
A: We don't start Stage 2 until Stage 1 is stable. Timeline is flexible, quality is not.

**Q: What if we find a critical bug in production?**
A: Rollback plan is ready. We can revert within hours if needed.

**Q: How do we test CloudKit sync?**
A: Use multiple iOS devices (iPhone + iPad), verify stats sync correctly. Test offline → online transitions.

---

## Next Steps

1. **Review this plan** - Team meeting to discuss and refine
2. **Get approvals** - Product, Engineering, QA sign-off
3. **Schedule kickoff** - Lock in timeline and resources
4. **Begin Stage 1** - Start with Day 1 tasks
5. **Daily updates** - Keep team informed of progress

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Awaiting Approval
**Owner:** Engineering Team
