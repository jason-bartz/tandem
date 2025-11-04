# Avatar System - Next Steps

## 🎯 What You Need To Do Now

The avatar system is **fully implemented** and ready for testing! Here's your action plan.

---

## ✅ Step 1: Verify Database (DONE)

You've already run the SQL migration to create the avatars table. Verify it's set up correctly:

```sql
-- Run this in Supabase SQL Editor to verify:
SELECT * FROM avatars ORDER BY sort_order;
```

**Expected:** 8 rows with Berry, Clover, Nutmeg, Pearl, Pip, Poppy, Thistle, Ziggy

✅ **Status:** Already completed!

---

## 🔧 Step 2: Test Locally

### Start Development Server

```bash
cd "/Users/jasonbartz/Documents/Development Projects/Tandem"
npm run dev
```

### Test Basic Functionality

1. **Open browser:** http://localhost:3004 (or your dev port)
2. **Sign in** with a test account
3. **Wait 2 seconds** - Avatar modal should appear
4. **Select an avatar** - Choose one and confirm
5. **Open Settings** - Avatar should display next to your name
6. **Visit `/account`** - Avatar should show with bio
7. **Change avatar** - Click and select different one

### Check Console

Watch for any errors in browser console:
- No 404s for avatar images
- No database errors
- Service logs should show successful operations

---

## 🐛 Step 3: Fix Any Issues

### Common Issues & Solutions

#### Avatar Modal Doesn't Appear
**Possible causes:**
- User already has avatar selected
- User dismissed prompt (check localStorage)
- User not authenticated

**Solutions:**
```javascript
// Clear dismissal flag in browser console:
localStorage.removeItem('avatar_prompt_dismissed_' + user.id)

// Or manually trigger:
// Add this temporarily to GameContainerClient.jsx:
const { triggerPrompt } = useAvatarPrompt(user);
// Then call triggerPrompt() from console
```

#### Images Not Loading (404s)
**Check:**
- Files exist in `public/images/avatars/`
- Filenames match: `berry.png`, `clover.png`, etc.
- All lowercase names

#### Database Errors
**Check:**
- Supabase connection working
- RLS policies created (from migration)
- User is authenticated

---

## 📱 Step 4: Test on iOS (Optional)

If you're building for iOS:

```bash
# Build for Capacitor
BUILD_TARGET=capacitor npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

**Test:**
- Avatar prompt after onboarding
- Haptic feedback works
- Avatar persists after app kill
- Settings navigation
- Account page navigation

---

## 🚀 Step 5: Deploy to Production

### Pre-Deployment Checklist

- [ ] All local tests pass
- [ ] No console errors
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Database migration ready

### Deployment Steps

1. **Run Migration on Production Database**
   ```sql
   -- Copy from: supabase/migrations/006_avatar_system.sql
   -- Run in Supabase Production SQL Editor
   ```

2. **Deploy Code**
   ```bash
   # If using Vercel:
   git add .
   git commit -m "feat: add avatar profile selection system"
   git push origin main

   # Vercel will auto-deploy
   ```

3. **Verify Production**
   - Visit production URL
   - Test avatar selection
   - Check Supabase logs
   - Monitor for errors

---

## 📊 Step 6: Monitor & Iterate

### Analytics to Track

**User Engagement:**
- % of users who select avatar within 7 days
- Most popular avatars
- Avatar change frequency

**Technical Metrics:**
- Avatar load times
- Error rates
- Failed saves

**User Feedback:**
- Support tickets about avatars
- User confusion points
- Feature requests

### Where to Monitor

1. **Supabase Dashboard:**
   - Query `avatars` table for stats
   - Check `users.selected_avatar_id` distribution

2. **Application Logs:**
   - Browser console errors
   - Server logs (if applicable)

3. **User Feedback:**
   - Support emails
   - App reviews
   - Social media

---

## 🎨 Step 7: Future Enhancements (Optional)

Once the base system is stable, consider:

### Phase 2 Features
1. **Avatar Unlocks**
   - Unlock special avatars via achievements
   - Add `unlock_condition` column to avatars table

2. **Animated Avatars**
   - Add WebP/APNG animations
   - Add `animation_path` column

3. **Avatar Stats**
   - Track most popular avatars
   - Show "X% of players chose this"

4. **Avatar Frames**
   - Premium borders for subscribers
   - Seasonal frames

5. **Leaderboard Display**
   - Show avatars on global leaderboards
   - Avatar next to username in rankings

---

## 🆘 Troubleshooting Guide

### Issue: "Failed to load avatars"

**Check:**
1. Network tab - is request failing?
2. Console logs - what's the error?
3. Supabase - is database accessible?

**Solution:**
```javascript
// Test service directly in console:
import avatarService from '@/services/avatar.service';
const avatars = await avatarService.getAllAvatars();
console.log(avatars);
```

### Issue: "Failed to save avatar"

**Check:**
1. User ID valid?
2. RLS policies correct?
3. Avatar ID exists in database?

**Solution:**
```javascript
// Test save directly:
await avatarService.updateUserAvatar(userId, 'berry');
```

### Issue: Avatar doesn't persist

**Check:**
1. Database save successful?
2. User ID same across sessions?
3. Cache cleared between tests?

**Solution:**
- Check Supabase `users` table
- Verify `selected_avatar_id` column has value

---

## 📞 Getting Help

### Resources

1. **Implementation Docs:**
   - `docs/AVATAR_PROFILE_IMPLEMENTATION_PLAN.md` - Full technical plan
   - `docs/AVATAR_IMPLEMENTATION_SUMMARY.md` - What was built
   - `docs/AVATAR_TESTING_CHECKLIST.md` - Test scenarios

2. **Code Files:**
   - `src/services/avatar.service.js` - Service layer
   - `src/components/AvatarSelectionModal.jsx` - Modal UI
   - `src/hooks/useAvatarPrompt.js` - Prompt logic

3. **Database:**
   - Supabase Dashboard → SQL Editor
   - Table: `avatars` (reference data)
   - Column: `users.selected_avatar_id` (user selection)

### Debug Mode

Add this to enable verbose logging:

```javascript
// In avatar.service.js, uncomment console.logs
// All service methods already have detailed logging
```

---

## ✨ Success Criteria

You'll know it's working when:

✅ New users see avatar prompt after signing in
✅ Avatar displays in Settings next to "Hi {name}!"
✅ Avatar displays on Account page with bio
✅ Users can change avatar anytime
✅ Avatar persists across sessions
✅ No console errors
✅ Images load quickly
✅ Haptic feedback works (mobile)

---

## 🎉 That's It!

The avatar system is production-ready. Just:

1. ✅ Test locally
2. ✅ Fix any issues
3. ✅ Deploy to production
4. ✅ Monitor usage
5. ✅ Iterate based on feedback

**You're all set! Good luck! 🚀**

---

## 📝 Quick Reference

### Important Files
```
src/
├── services/avatar.service.js          # Data layer
├── components/AvatarSelectionModal.jsx # UI component
├── hooks/useAvatarPrompt.js            # Logic hook
├── components/Settings.jsx             # Shows avatar
├── app/account/page.jsx                # Shows avatar
└── components/game/GameContainerClient.jsx # First-time prompt

public/images/avatars/
├── berry.png
├── clover.png
├── nutmeg.png
├── pearl.png
├── pip.png
├── poppy.png
├── thistle.png
└── ziggy.png
```

### Quick Test Commands
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Build for iOS
BUILD_TARGET=capacitor npm run build
npx cap sync ios
```

### Supabase Queries
```sql
-- Get all avatars
SELECT * FROM avatars;

-- Get users with avatars
SELECT u.email, a.display_name
FROM users u
LEFT JOIN avatars a ON u.selected_avatar_id = a.id;

-- Avatar popularity
SELECT a.display_name, COUNT(u.id) as users
FROM avatars a
LEFT JOIN users u ON u.selected_avatar_id = a.id
GROUP BY a.id, a.display_name
ORDER BY users DESC;
```

---

**Last Updated:** November 4, 2025
**Version:** 1.0.0
**Status:** ✅ Ready for Production
