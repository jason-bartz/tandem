# Avatar System - Testing Checklist

## 🚀 Quick Start Testing Guide

### Prerequisites
1. ✅ Database migration completed (avatars table created)
2. ✅ All 8 avatar images in `public/images/avatars/`
3. ✅ Dev server running (`npm run dev`)
4. ✅ User account created (for testing)

---

## 🧪 Test Scenarios

### Test 1: First-Time User Flow
**Goal:** Verify avatar prompt appears for new users

**Steps:**
1. Create new account (or clear localStorage)
2. Sign in to app
3. Wait 2 seconds after game loads
4. **Expected:** Avatar selection modal appears
5. Select an avatar
6. **Expected:** Modal closes, avatar saves
7. Open Settings
8. **Expected:** Avatar appears next to "Hi {name}!"

**Pass Criteria:**
- [ ] Modal appears automatically after 2-second delay
- [ ] Modal cannot be closed by clicking backdrop (first-time)
- [ ] All 8 avatars display with images and bios
- [ ] Selection highlights chosen avatar
- [ ] Haptic feedback on selection (mobile)
- [ ] "Confirm Selection" button saves avatar
- [ ] Avatar appears in Settings immediately

---

### Test 2: Skip Avatar Flow
**Goal:** Verify users can skip avatar selection

**Steps:**
1. Trigger avatar prompt (new user or clear localStorage)
2. Click "Skip for Now"
3. **Expected:** Modal closes, prompt doesn't reappear
4. Refresh page
5. **Expected:** Prompt doesn't appear again
6. Open Settings
7. **Expected:** "Select Avatar" link appears
8. Click "Select Avatar"
9. **Expected:** Modal opens

**Pass Criteria:**
- [ ] Skip button dismisses modal
- [ ] Prompt doesn't reappear after refresh
- [ ] "Select Avatar" CTA visible in Settings
- [ ] Manual open works from Settings
- [ ] Manual open works from Account page

---

### Test 3: Change Avatar from Settings
**Goal:** Verify users can change avatar from Settings

**Steps:**
1. Ensure user has avatar selected
2. Open Settings modal
3. **Expected:** 48x48px circular avatar appears
4. **Expected:** Avatar name shows with "Change Avatar" link
5. Click avatar or "Change Avatar"
6. **Expected:** Avatar modal opens
7. Select different avatar
8. Click "Confirm Selection"
9. **Expected:** Modal closes
10. **Expected:** New avatar displays immediately

**Pass Criteria:**
- [ ] Avatar displays in Settings Account section
- [ ] Avatar is clickable
- [ ] "Change Avatar" link opens modal
- [ ] Current avatar is pre-selected in modal
- [ ] Modal is dismissable (not first-time)
- [ ] Avatar updates without page refresh
- [ ] Haptic feedback on save (mobile)

---

### Test 4: Change Avatar from Account Page
**Goal:** Verify users can change avatar from Account page

**Steps:**
1. Navigate to `/account` page
2. **Expected:** 96x96px avatar in Profile section
3. **Expected:** Character name and bio displayed
4. Click avatar or "Change Avatar" button
5. **Expected:** Avatar modal opens
6. Select different avatar
7. **Expected:** Avatar updates in Profile section
8. Scroll down and back up
9. **Expected:** New avatar persists

**Pass Criteria:**
- [ ] Large avatar displays prominently
- [ ] Character name and bio show
- [ ] Avatar is clickable
- [ ] "Change Avatar" button works
- [ ] Avatar updates immediately
- [ ] No page refresh required
- [ ] Smooth animations

---

### Test 5: No Avatar State
**Goal:** Verify UI for users without avatar

**Steps:**
1. Clear user's avatar (via Supabase dashboard or service)
2. Open Settings
3. **Expected:** Placeholder icon (👤) appears
4. **Expected:** "Select Your Avatar" link visible
5. Navigate to Account page
6. **Expected:** Placeholder with "Select Your Avatar" button
7. Click button
8. **Expected:** Modal opens
9. Select avatar
10. **Expected:** Placeholder replaced with avatar

**Pass Criteria:**
- [ ] Placeholder icon shows instead of avatar
- [ ] CTA is clear and prominent
- [ ] Both Settings and Account show correct state
- [ ] Modal opens from both locations
- [ ] Avatar replaces placeholder after selection

---

### Test 6: Responsive Design
**Goal:** Verify layout on different screen sizes

**Test on Mobile (375px):**
- [ ] Avatar grid: 2 columns
- [ ] Avatar cards readable
- [ ] Touch targets adequate (44x44pt min)
- [ ] Modal scrollable
- [ ] Buttons full width

**Test on Tablet (768px):**
- [ ] Avatar grid: 4 columns
- [ ] Proper spacing
- [ ] Modal fits on screen

**Test on Desktop (1920px):**
- [ ] Avatar grid: 4 columns (max)
- [ ] Modal centered
- [ ] Not too wide (max-w-4xl)

**Pass Criteria:**
- [ ] Responsive at 320px, 375px, 768px, 1024px, 1920px
- [ ] No horizontal scroll
- [ ] Touch targets adequate
- [ ] Text readable at all sizes

---

### Test 7: Dark Mode
**Goal:** Verify dark mode styling

**Steps:**
1. Enable dark mode
2. Open avatar modal
3. **Expected:** Dark background, light text
4. **Expected:** Avatar cards have dark styling
5. **Expected:** Selection state visible
6. Check Settings avatar
7. **Expected:** Border colors adapt
8. Check Account page avatar
9. **Expected:** Proper contrast

**Pass Criteria:**
- [ ] Modal background dark
- [ ] Text readable (sufficient contrast)
- [ ] Avatar cards styled for dark mode
- [ ] Selection state visible
- [ ] Borders/shadows adapt
- [ ] No color contrast issues

---

### Test 8: High Contrast Mode
**Goal:** Verify accessibility for visually impaired

**Steps:**
1. Enable high contrast mode
2. Open avatar modal
3. **Expected:** High contrast styling applied
4. **Expected:** Selection clearly visible
5. **Expected:** All text readable
6. Navigate with keyboard
7. **Expected:** Focus states visible

**Pass Criteria:**
- [ ] High contrast colors applied
- [ ] Clear visual differentiation
- [ ] Selection state obvious
- [ ] Keyboard focus visible
- [ ] Meets WCAG AAA standards

---

### Test 9: Loading States
**Goal:** Verify loading indicators display

**Steps:**
1. Throttle network (DevTools → Network → Slow 3G)
2. Open avatar modal
3. **Expected:** Loading spinner appears
4. **Expected:** "Loading avatars..." text
5. Wait for avatars to load
6. **Expected:** Grid appears smoothly
7. Open Settings with slow network
8. **Expected:** Avatar section shows loading state

**Pass Criteria:**
- [ ] Loading spinner visible
- [ ] Loading text displays
- [ ] Smooth transition to content
- [ ] No layout shift
- [ ] Timeout handling (if network fails)

---

### Test 10: Error States
**Goal:** Verify error handling

**Steps:**
1. Disconnect internet
2. Open avatar modal
3. **Expected:** Error message displays
4. **Expected:** Retry button available
5. Reconnect internet
6. Click retry
7. **Expected:** Avatars load
8. Try saving with network off
9. **Expected:** Save error message

**Pass Criteria:**
- [ ] Clear error messages
- [ ] Retry functionality works
- [ ] No crash or blank screen
- [ ] User can recover from errors
- [ ] Errors logged to console

---

### Test 11: Persistence
**Goal:** Verify avatar persists across sessions

**Steps:**
1. Select avatar
2. Refresh page
3. **Expected:** Avatar still selected
4. Sign out
5. Sign back in
6. **Expected:** Avatar persists
7. Close browser completely
8. Reopen app
9. **Expected:** Avatar still there

**Pass Criteria:**
- [ ] Avatar persists after refresh
- [ ] Avatar persists after sign out/in
- [ ] Avatar persists after browser close
- [ ] Correct avatar loads on each page

---

### Test 12: iOS Native (if applicable)
**Goal:** Verify iOS-specific functionality

**Steps:**
1. Build and run iOS app
2. Sign in
3. **Expected:** Avatar prompt appears after onboarding
4. Select avatar with haptic feedback
5. **Expected:** Haptic feedback on tap
6. Open Settings
7. **Expected:** Avatar displays
8. Navigate to Account page
9. **Expected:** Avatar displays
10. Kill app and reopen
11. **Expected:** Avatar persists

**Pass Criteria:**
- [ ] Works after onboarding
- [ ] Haptic feedback present
- [ ] Navigation works smoothly
- [ ] Avatar persists after app kill
- [ ] No crashes or freezes

---

### Test 13: Keyboard Accessibility
**Goal:** Verify keyboard navigation works

**Steps:**
1. Open avatar modal
2. Press Tab repeatedly
3. **Expected:** Focus moves through avatars
4. **Expected:** Focus indicator visible
5. Press Enter on avatar
6. **Expected:** Avatar selected
7. Tab to Confirm button
8. Press Enter
9. **Expected:** Avatar saved

**Pass Criteria:**
- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Enter key selects avatar
- [ ] Space key works on buttons
- [ ] Esc key closes modal (if not first-time)
- [ ] Focus trap in modal

---

### Test 14: Screen Reader
**Goal:** Verify screen reader compatibility

**Steps:**
1. Enable VoiceOver (iOS) or NVDA (Windows)
2. Open avatar modal
3. Navigate with screen reader
4. **Expected:** Modal title announced
5. **Expected:** Avatar names and bios read
6. **Expected:** Selection state announced
7. **Expected:** Button labels clear

**Pass Criteria:**
- [ ] Modal announced properly
- [ ] All text read correctly
- [ ] ARIA labels present
- [ ] Selection state communicated
- [ ] Button purposes clear
- [ ] No missing labels

---

### Test 15: Performance
**Goal:** Verify system is performant

**Metrics to Check:**
1. Time to open modal: < 200ms
2. Time to load avatars: < 500ms
3. Time to save avatar: < 500ms
4. Avatar image load time: < 100ms each
5. Settings page load with avatar: < 200ms
6. Account page load with avatar: < 300ms

**Tools:**
- Chrome DevTools → Performance
- Network tab → Timing
- React DevTools → Profiler

**Pass Criteria:**
- [ ] Modal opens quickly (<200ms)
- [ ] Avatars load fast (<500ms)
- [ ] Save operation fast (<500ms)
- [ ] No janky animations
- [ ] Smooth scrolling
- [ ] Low memory usage

---

## 🐛 Bug Report Template

If you find an issue, use this template:

```markdown
### Bug: [Brief Description]

**Severity:** [Critical / High / Medium / Low]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots:**


**Environment:**
- OS:
- Browser/Device:
- App Version:
- User ID:

**Console Errors:**


**Additional Context:**

```

---

## ✅ Sign-Off Checklist

Before marking as complete:

### Functionality
- [ ] All 15 test scenarios pass
- [ ] No console errors
- [ ] No 404s for images
- [ ] No database errors

### Design
- [ ] Matches design system
- [ ] Responsive on all sizes
- [ ] Dark mode works
- [ ] High contrast works

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets adequate

### Performance
- [ ] Fast load times
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Optimized images

### Cross-Platform
- [ ] Works on Chrome
- [ ] Works on Safari
- [ ] Works on Firefox
- [ ] Works on iOS app
- [ ] Works on Android (if supported)

---

## 📊 Test Results Summary

**Tester:** _______________
**Date:** _______________
**Environment:** _______________

| Test | Status | Notes |
|------|--------|-------|
| 1. First-Time Flow | ⬜ | |
| 2. Skip Flow | ⬜ | |
| 3. Change from Settings | ⬜ | |
| 4. Change from Account | ⬜ | |
| 5. No Avatar State | ⬜ | |
| 6. Responsive Design | ⬜ | |
| 7. Dark Mode | ⬜ | |
| 8. High Contrast | ⬜ | |
| 9. Loading States | ⬜ | |
| 10. Error States | ⬜ | |
| 11. Persistence | ⬜ | |
| 12. iOS Native | ⬜ | |
| 13. Keyboard Nav | ⬜ | |
| 14. Screen Reader | ⬜ | |
| 15. Performance | ⬜ | |

**Overall Status:** ⬜ Pass / ⬜ Fail

**Blocker Issues:** _______________

**Sign-off:** ⬜ Approved for Production

---

**Good luck with testing! 🎮**
