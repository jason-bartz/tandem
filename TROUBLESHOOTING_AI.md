# 🔧 AI Generation Troubleshooting Guide

## ❌ Error: "AI generation is not enabled. Please configure ANTHROPIC_API_KEY."

This error means the API key isn't being loaded by the server. Here's how to fix it:

---

## ✅ Solution Steps

### Step 1: Verify `.env.local` File

```bash
# Check the file exists and has the API key
cat .env.local | grep ANTHROPIC_API_KEY
```

**Expected output:**

```
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

**If missing:** Add these lines to `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
AI_MODEL=claude-3-5-sonnet-20241022
AI_GENERATION_ENABLED=true
```

---

### Step 2: Restart Dev Server (CRITICAL!)

Environment variables are only loaded when the server starts. You MUST restart:

```bash
# Stop any running dev server
pkill -f "next dev"

# Wait a moment
sleep 2

# Start fresh
npm run dev
```

**Look for this in the output:**

```
- Environments: .env.local
```

This confirms the file is being loaded!

---

### Step 3: Clear Next.js Cache (If Still Not Working)

```bash
# Stop server
pkill -f "next dev"

# Clear cache
rm -rf .next

# Reinstall (in case SDK is missing)
npm install

# Start fresh
npm run dev
```

---

### Step 4: Test the Setup

```bash
# Run verification script
node test-ai-simple.mjs
```

**Expected output:**

```
✅ ANTHROPIC_API_KEY is configured
✅ AI_MODEL is configured
✅ AI_GENERATION_ENABLED is true
✅ AI service file exists
✅ API endpoint exists
✅ PuzzleEditor has AI generation button
✅ ADMIN_GENERATE_PUZZLE endpoint is defined
🎉 All setup checks passed!
```

---

### Step 5: Test in Admin Panel

1. Open http://localhost:3000/admin/login
2. Log in with credentials:
   - Username: `delta_overseer_8688`
   - Password: (your admin password)
3. Click on any date in the calendar
4. Look for the purple "✨ AI Generate" button
5. Click it and wait 2-5 seconds

---

## 🔍 Debugging Checklist

Use this checklist to diagnose the issue:

- [ ] `.env.local` file exists in project root
- [ ] `ANTHROPIC_API_KEY` is in `.env.local`
- [ ] API key starts with `sk-ant-api03-`
- [ ] Dev server was restarted after adding env vars
- [ ] Server logs show "Environments: .env.local"
- [ ] `node test-ai-simple.mjs` passes all checks
- [ ] Logged into admin panel successfully
- [ ] "✨ AI Generate" button is visible
- [ ] No console errors in browser

---

## 🐛 Common Issues

### Issue 1: "Button doesn't appear"

**Cause**: UI not updated after code changes

**Fix**:

```bash
pkill -f "next dev"
rm -rf .next
npm run dev
# Hard refresh browser (Cmd+Shift+R on Mac)
```

---

### Issue 2: "API key not found" in logs

**Cause**: Environment file not loaded

**Fix**:

1. Verify file is named exactly `.env.local` (not `.env` or `env.local`)
2. File must be in project root (same folder as `package.json`)
3. Restart server completely
4. Check logs show "Environments: .env.local"

---

### Issue 3: "Module not found: @anthropic-ai/sdk"

**Cause**: Dependency not installed

**Fix**:

```bash
npm install @anthropic-ai/sdk
npm run dev
```

---

### Issue 4: Still shows error after fixes

**Cause**: Browser cache or Next.js cache

**Fix**:

```bash
# Full reset
pkill -f "next dev"
rm -rf .next
rm -rf node_modules/.cache
npm run dev

# In browser:
# - Open DevTools (F12)
# - Right-click refresh button
# - Click "Empty Cache and Hard Reload"
```

---

## 📊 Check Server Logs

While the error occurs, check the server logs:

```bash
# Watch logs in real-time
tail -f /tmp/tandem-debug.log

# Or check recent logs
tail -50 /tmp/tandem-debug.log
```

**Look for:**

- `"AI generation check failed"` - Shows why it failed
- `"ANTHROPIC_API_KEY not found"` - Key missing
- `"hasApiKey: false"` - Key not loaded

---

## ✅ Verification After Fix

Once fixed, you should see:

1. **In terminal (server logs):**

   ```
   - Environments: .env.local
   ✓ Ready in 2.2s
   ```

2. **In admin panel:**
   - Purple "✨ AI Generate" button visible
   - Button not disabled

3. **After clicking generate:**
   - Loading spinner appears
   - "🤖 Generating puzzle with AI..." message
   - Success message after 2-5 seconds
   - Fields filled with theme + puzzles

---

## 🆘 Still Not Working?

If you've tried all the above and it still doesn't work:

### Check Environment Loading

Create a test file `check-env.js`:

```javascript
// check-env.js
console.log('Environment check:');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');
console.log('AI_MODEL:', process.env.AI_MODEL || 'NOT SET');
console.log('AI_GENERATION_ENABLED:', process.env.AI_GENERATION_ENABLED || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
```

Run with Next.js context:

```bash
# This will show if Next.js can see the env vars
npm run dev &
sleep 5
# Check the logs
```

### Manual API Test

```bash
# Get admin token first (login via browser)
# Then test with curl:

curl -X POST http://localhost:3000/api/admin/generate-puzzle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"date":"2025-10-15"}'
```

---

## 📝 Final Checklist

Before asking for help, confirm:

- [x] `.env.local` exists in project root
- [x] API key is correctly formatted (starts with `sk-ant-`)
- [x] Server restarted completely (not just code refresh)
- [x] `node test-ai-simple.mjs` passes
- [x] Logged into admin panel successfully
- [x] Tried clearing .next cache
- [x] Checked server logs for errors
- [x] Hard refreshed browser

---

## 🎯 Quick Fix Command

Try this all-in-one fix:

```bash
#!/bin/bash
echo "🔧 Fixing AI Generation Setup..."

# Verify env file
if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env.local; then
    echo "✅ API key found in .env.local"
else
    echo "❌ API key missing! Add to .env.local:"
    echo "ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE"
    exit 1
fi

# Stop server
pkill -f "next dev"
sleep 2

# Clear caches
rm -rf .next
rm -rf node_modules/.cache

# Ensure dependencies
npm install

# Start server
npm run dev &

echo "✅ Server restarting with clean cache..."
echo "   Wait 10 seconds, then test in browser"
```

Save as `fix-ai-setup.sh`, make executable, and run:

```bash
chmod +x fix-ai-setup.sh
./fix-ai-setup.sh
```

---

**Last Updated**: $(date)
**Status**: Ready to help debug your AI generation issue!
