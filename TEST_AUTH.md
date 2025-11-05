# Auth Testing Steps

## Check if Supabase cookies are set:

1. Open browser DevTools (F12)
2. Go to Application → Cookies → https://www.tandemdaily.com
3. Look for cookies with names like:
   - `sb-<project-ref>-auth-token`
   - `sb-<project-ref>-auth-token-code-verifier`
4. If these cookies DON'T exist → the cookie migration failed
5. If they DO exist → check their expiry and value

## Test API authentication:

Open browser console and run:
```javascript
fetch('/api/leaderboard/daily?game=tandem&date=2025-11-05&limit=10', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

Expected response if auth working:
```json
{
  "success": true,
  "leaderboard": [...],
  "userRank": {...}
}
```

If you get `{error: "Unauthorized"}` → auth is broken

## Force re-authentication:

1. Open browser console
2. Run: `localStorage.clear()`
3. Run: `document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));`
4. Hard refresh (Cmd+Shift+R)
5. Sign in again
6. Complete a puzzle
7. Check if leaderboard works

## Check if user has leaderboards enabled:

Open console:
```javascript
localStorage.getItem('tandem_leaderboards_enabled')
localStorage.getItem('tandem_has_seen_onboarding')
```

Should return:
- `tandem_leaderboards_enabled`: `null` or `"true"` (null means enabled by default)
- `tandem_has_seen_onboarding`: `"true"`

If `tandem_has_seen_onboarding` is `null` or `"false"`, run:
```javascript
localStorage.setItem('tandem_has_seen_onboarding', 'true')
```
