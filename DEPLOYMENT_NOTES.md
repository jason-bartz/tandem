# AI Puzzle Generation - Production Deployment Notes

## 🚀 Deployment Checklist

### 1. Environment Variables (Critical)

Add these to your production environment (Vercel, etc.):

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_API_KEY_HERE

# Optional (with defaults)
AI_MODEL=claude-3-5-sonnet-20241022
AI_GENERATION_ENABLED=true
```

**⚠️ Security Note**: The API key is sensitive. Ensure it's:

- Never committed to version control
- Only accessible by admins
- Stored securely in production environment variables
- Rotated periodically for security

### 2. Vercel Deployment

```bash
# Add environment variables to Vercel
vercel env add ANTHROPIC_API_KEY production
vercel env add AI_MODEL production
vercel env add AI_GENERATION_ENABLED production

# Deploy
vercel --prod
```

Or via Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with value
3. Add `AI_MODEL` (optional, defaults to claude-3-5-sonnet-20241022)
4. Add `AI_GENERATION_ENABLED` = `true`
5. Redeploy

### 3. iOS Build

For Capacitor/iOS builds:

```bash
# AI generation is admin-only, so it works via API
# No special iOS configuration needed
npm run build:ios
npm run cap:sync
```

The feature is web-based (admin panel), so iOS app will access it through the web interface.

## 📊 Monitoring & Analytics

### What to Monitor

1. **Generation Success Rate**
   - Check server logs for `"AI puzzle generated:"` messages
   - Monitor failed generation attempts
   - Track average generation time

2. **Rate Limiting**
   - Default: 10 generations per hour per admin
   - Monitor 429 (rate limit) responses
   - Adjust if needed in `src/app/api/admin/generate-puzzle/route.js`

3. **API Costs**
   - Monitor Anthropic console for usage
   - Estimated: $0.001-0.003 per puzzle
   - ~$1-3/month for 10 puzzles/day

### Logging

All AI operations are logged with:

```javascript
{
  date: "2025-01-15",
  theme: "Generated theme",
  duration: 2500,
  pastPuzzlesAnalyzed: 30,
  admin: "username"
}
```

Check logs in:

- Vercel Dashboard → Logs
- `console.log` and `logger.info` statements
- Error tracking (Sentry, if configured)

## 🔒 Security Best Practices

### Already Implemented ✅

- [x] Admin-only access (requires authentication)
- [x] Rate limiting (10 requests/hour)
- [x] Input validation (Zod schemas)
- [x] Output sanitization
- [x] Error handling with retries
- [x] API key stored server-side only
- [x] CSRF protection via existing middleware

### Additional Recommendations

1. **API Key Rotation**

   ```bash
   # Generate new key from Anthropic console
   # Update in Vercel environment variables
   # Old key will be invalidated
   ```

2. **Monitor Usage**
   - Set up Anthropic usage alerts
   - Monitor for unusual patterns
   - Track generation frequency

3. **Backup Plan**
   - AI generation is optional
   - Admins can still create puzzles manually
   - System gracefully handles API failures

## 🎯 Performance Optimizations

### Already Implemented ✅

1. **Retry Logic**
   - Automatic retry on transient failures
   - Exponential backoff (1s, 2s, 4s)
   - Maximum 3 attempts per generation

2. **Timeout Protection**
   - 30-second timeout per request
   - Prevents hanging requests

3. **Context Optimization**
   - Analyzes last 30 days by default
   - Configurable (7-90 days)
   - Minimal database queries

### Tuning Options

**Adjust retry attempts**:

```javascript
// src/services/ai.service.js
this.maxRetries = 2; // Change to 1 or 3
```

**Adjust rate limit**:

```javascript
// src/app/api/admin/generate-puzzle/route.js
const rateLimitResponse = await withRateLimit(request, 'write', { max: 10 });
// Change max to 5, 15, or 20
```

**Adjust context window**:

```javascript
// src/app/api/admin/generate-puzzle/route.js
includePastDays: z.number().min(7).max(90).optional().default(30);
// Change default to 7, 60, or 90
```

## 🧪 Testing in Production

### Smoke Test

1. Deploy to production
2. Log into admin panel
3. Navigate to puzzle editor
4. Click "✨ AI Generate"
5. Verify puzzle is generated
6. Save puzzle and check it appears in calendar

### Integration Test

```bash
# Run setup verification
node test-ai-simple.mjs

# Check server logs
vercel logs --follow

# Generate a test puzzle
# Navigate to admin panel and generate
```

### Monitoring Dashboard

Check these endpoints:

- Admin panel: `https://yourdomain.com/admin`
- Generate endpoint: `https://yourdomain.com/api/admin/generate-puzzle` (POST only)
- Health check: Verify 200 responses on admin auth

## 📱 Mobile Considerations

### iOS App

- AI generation works through admin web interface
- No native iOS code required
- Works in WKWebView (Capacitor)
- Requires active internet connection

### Performance

- Average generation time: 2-5 seconds
- Shows loading spinner during generation
- Works on cellular data
- No offline support (requires API)

## 🐛 Troubleshooting

### Common Issues

1. **"AI generation is not enabled"**

   ```bash
   # Check environment variables
   vercel env ls

   # Ensure ANTHROPIC_API_KEY is set
   vercel env add ANTHROPIC_API_KEY production
   ```

2. **"Rate limit exceeded"**
   - Wait 1 hour
   - Or increase limit in code
   - Check admin isn't spamming button

3. **"Generation failed after 3 attempts"**
   - Check Anthropic API status
   - Verify API key is valid
   - Check server logs for details

4. **Slow generation (>10s)**
   - Normal during high API load
   - Check Anthropic status page
   - Consider reducing temperature

### Debug Mode

Enable detailed logging:

```javascript
// Temporarily in src/services/ai.service.js
logger.setLevel('DEBUG'); // Add at top of generatePuzzle
```

## 📈 Scaling Considerations

### Current Limits

- Rate limit: 10 generations/hour per admin
- Retry attempts: 3 per request
- Timeout: 30 seconds
- Context: 30 days of puzzles

### When to Scale

If you have multiple admins generating puzzles frequently:

1. **Increase rate limits**

   ```javascript
   // Increase per-user limit
   { max: 20, window: '1h' }
   ```

2. **Add caching**
   - Cache recent puzzles in memory
   - Reduce database queries

3. **Batch generation**
   - Generate multiple days at once
   - Add batch API endpoint

## 🎉 Success Metrics

### Key Performance Indicators

Track these metrics:

1. **Usage**
   - Puzzles generated per week
   - % of puzzles created with AI vs manual
   - Average generation time

2. **Quality**
   - Theme variety (unique themes vs repeats)
   - Admin edits after generation
   - Player engagement with AI-generated puzzles

3. **Reliability**
   - Success rate (should be >95%)
   - Error rate
   - API uptime

### Monitoring Tools

- Vercel Analytics (free)
- Anthropic Console (API usage)
- Server logs (generation tracking)
- Admin feedback (manual quality check)

## 📚 Additional Resources

- [Anthropic API Docs](https://docs.anthropic.com/)
- [Claude Rate Limits](https://docs.anthropic.com/claude/reference/rate-limits)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [AI_PUZZLE_GENERATION.md](AI_PUZZLE_GENERATION.md) - Full feature documentation

## ✅ Pre-Launch Checklist

- [ ] Environment variables added to production
- [ ] API key tested and working
- [ ] Rate limiting configured appropriately
- [ ] Error handling tested
- [ ] Admin panel accessible
- [ ] First puzzle generated successfully
- [ ] Logs monitored for errors
- [ ] Cost monitoring set up
- [ ] Team trained on feature
- [ ] Backup plan documented

## 🚨 Rollback Plan

If issues occur after deployment:

1. **Disable AI generation immediately**

   ```bash
   vercel env add AI_GENERATION_ENABLED false production
   vercel --prod
   ```

2. **Manual puzzle creation**
   - Admins can still create puzzles manually
   - No functionality loss
   - System continues working

3. **Investigate and fix**
   - Check server logs
   - Verify API key
   - Test in staging
   - Redeploy when fixed

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Version**: 1.0.0
**Status**: Production Ready ✅
