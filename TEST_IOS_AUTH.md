# iOS Authentication Issue Diagnosis

## Problem
iOS app shows "Unauthorized" when trying to delete account, but web version works fine.

## Current Status
- ✅ Capacitor HTTP is configured and enabled
- ✅ API URL is correctly set to `https://tandemdaily.com`
- ✅ Session token exists on iOS (confirmed in logs)
- ❌ Server returns 401 Unauthorized

## Likely Causes

### 1. Production Server Doesn't Have Updated Code
The changes we made (enhanced logging, CORS headers) are only on local machine.
Production server at `tandemdaily.com` doesn't have these changes yet.

**Solution**: Deploy to production

### 2. Capacitor HTTP Headers Format
Capacitor HTTP might format headers differently than standard fetch.
Server might be receiving headers in unexpected format.

**Test**: Check if headers are being sent correctly with current logs

### 3. Token Format Issue
The token from Supabase on iOS might be in a different format or expired.

**Test**: Compare token length/format between web and iOS

## Testing Steps

1. **Test with enhanced logging** (iOS app in Xcode):
   ```
   Look for these logs:
   - [DeleteAccount] Session check: {tokenLength: XXX, tokenPreview: "..."}
   - [DeleteAccount] Calling API with: {authHeaderPreview: "Bearer ..."}
   - [CapacitorFetch] Using native HTTP: {headers: {...}}
   ```

2. **Compare with web version**:
   - Open browser DevTools → Network tab
   - Try account deletion on web
   - Check Authorization header in request
   - Compare token format with iOS

3. **Check production logs** (if accessible):
   - Vercel dashboard → Functions logs
   - Look for auth verification attempts
   - Check what headers server received

## Next Actions

### Option A: Deploy to Production (Recommended)
```bash
# Commit changes
git add .
git commit -m "fix: add CORS support and enhanced auth logging for iOS"
git push

# Vercel will auto-deploy
# Wait for deployment, then test iOS app
```

### Option B: Test Against Local Server
```bash
# Update .env.ios to use local server
NEXT_PUBLIC_API_URL=http://localhost:3000

# Start local server
npm run dev

# Rebuild iOS app
npm run build:ios && npx cap sync ios

# Test in Xcode
# Note: May need to handle HTTPS/localhost certificate issues
```

### Option C: Add Debug Endpoint
Create `/api/debug/headers` endpoint that returns all received headers.
Test with iOS app to see exactly what's being sent.

## Current Logs Analysis

From your last test:
```
[DeleteAccount] Session check: {"hasSession":true}
[CapacitorFetch] Using native HTTP: {"url":"https://tandemdaily.com/api/account/delete","method":"DELETE"}
Response status: 401
Response: {"error":"Unauthorized"}
```

**Missing**: We don't see the token details or headers being sent.
**Need**: Run with latest build to see enhanced logging.
