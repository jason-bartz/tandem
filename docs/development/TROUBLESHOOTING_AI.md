# AI Puzzle Generation Troubleshooting Guide

This guide helps diagnose and fix issues with AI-powered puzzle generation using the Anthropic Claude API.

## Common Issues

### 1. First Generation Works, Then Subsequent Attempts Fail

**Symptoms:**

- First puzzle generation succeeds
- Subsequent generations return 503 errors
- Error message: "An error occurred processing your request"

**Possible Causes:**

#### A. Anthropic API Rate Limits

The Anthropic API has rate limits that may be hit during rapid successive calls.

**Check Server Logs For:**

```
[generate-puzzle] Anthropic rate limit exceeded
error.status === 429
error.error?.type === 'rate_limit_error'
```

**Solution:**

- Wait 60 seconds between generation attempts
- The system automatically retries with exponential backoff
- Check your Anthropic API tier and limits at https://console.anthropic.com

#### B. API Key Authentication Issues

The API key may be failing to load on subsequent requests.

**Check Server Logs For:**

```
[generate-puzzle] Environment check:
  hasAnthropicKey: false
  aiEnabled: false
```

**Solution:**

1. Verify `.env.local` contains: `ANTHROPIC_API_KEY=sk-ant-api03-...`
2. Restart the development server: `npm run dev`
3. For production (Vercel), ensure environment variable is set in dashboard

#### C. Anthropic Service Overload

The Anthropic API may be temporarily overloaded (status 529).

**Check Server Logs For:**

```
[generate-puzzle] Anthropic service overloaded
error.status === 529
```

**Solution:**

- System will automatically retry with longer delays
- Wait a few minutes and try again
- Check Anthropic status page: https://status.anthropic.com

#### D. Invalid API Response/Parsing Errors

The AI may generate a response that doesn't match the expected format.

**Check Server Logs For:**

```
Failed to parse AI response
Invalid theme generated
Must have exactly 4 puzzle pairs
Puzzle pair needs exactly 2 emojis
```

**Solution:**

- System automatically retries up to 3 times
- If persistent, the AI prompt may need adjustment in `ai.service.js`
- Check that the model is `claude-sonnet-4-5-20250929` (in `.env.local`)

### 2. AI Generation Always Returns 503

**Check Server Logs For:**

```
[generate-puzzle] AI service enabled check: false
AI generation is not enabled. Please configure ANTHROPIC_API_KEY.
```

**Solution:**

1. Ensure `ANTHROPIC_API_KEY` is set in `.env.local`
2. Verify `AI_GENERATION_ENABLED=true` (or not set to 'false')
3. Restart the server after changing environment variables

### 3. Generic "An error occurred processing your request"

This means the error is being sanitized for security in production.

**To Debug:**

1. Check server logs (not browser console) for full error details:
   - Local: Terminal where you ran `npm run dev`
   - Vercel: Dashboard → Project → Logs → Functions
2. Look for `[generate-puzzle] ERROR DETAILS:` with full error information
3. Match the error to one of the patterns above

## Debugging Steps

### Step 1: Check Server Logs

Always check server-side logs first (not browser console). The browser only shows sanitized errors.

**Local Development:**

```bash
# Terminal where you ran npm run dev
# Look for lines starting with [generate-puzzle]
```

**Vercel Production:**

```bash
# Install Vercel CLI if not already
npm i -g vercel

# View logs
vercel logs
```

### Step 2: Verify Environment Variables

**Local:**

```bash
# Check .env.local exists and contains:
cat .env.local | grep ANTHROPIC
# Should show: ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Production (Vercel):**

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify `ANTHROPIC_API_KEY` is set

### Step 3: Test API Key

Create a test file to verify the API key works:

```javascript
// test-anthropic.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function test() {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hello!' }],
    });
    console.log('✓ API key works!', message.content[0].text);
  } catch (error) {
    console.error('✗ API key failed:', error.message, error.status);
  }
}

test();
```

Run: `node test-anthropic.js`

### Step 4: Check Rate Limits

If you're hitting rate limits frequently:

1. **Check your API tier** at https://console.anthropic.com
2. **Review usage** in the Anthropic Console
3. **Implement client-side throttling** (already in place: 10 requests/hour)

## Error Code Reference

| Status | Meaning                        | Solution                                 |
| ------ | ------------------------------ | ---------------------------------------- |
| 400    | Bad Request / Validation Error | Check puzzle date format and parameters  |
| 401    | Authentication Failed          | Verify API key is correct                |
| 429    | Rate Limit Exceeded            | Wait 60 seconds, system auto-retries     |
| 500    | Internal Server Error          | Check server logs for details            |
| 503    | Service Unavailable            | AI service issue, check logs             |
| 529    | Service Overloaded             | Anthropic API is overloaded, retry later |

## Enhanced Logging (v2)

As of the latest update, the system includes comprehensive error logging:

### What's Logged:

- Full error details including Anthropic-specific fields
- Error type, status code, and response body
- Retry attempts and backoff delays
- Rate limit information and retry-after values
- Validation errors with specific field details

### Key Log Patterns:

**Success:**

```
[generate-puzzle] Request received
[generate-puzzle] Authentication successful
[generate-puzzle] AI service enabled check: true
AI puzzle generated: { date, theme, duration, ... }
```

**Rate Limit:**

```
[generate-puzzle] ERROR DETAILS: { statusCode: 429, ... }
[generate-puzzle] Anthropic rate limit exceeded
Rate limit hit, will retry after delay { retryAfter: 60 }
```

**Authentication Error:**

```
[generate-puzzle] ERROR DETAILS: { statusCode: 401, ... }
[generate-puzzle] Anthropic authentication error
Authentication error - not retrying
```

**Service Overload:**

```
[generate-puzzle] ERROR DETAILS: { statusCode: 529, ... }
[generate-puzzle] Anthropic service overloaded
Service overloaded, will retry with longer delay
```

## Getting Help

If issues persist:

1. **Collect logs**: Copy relevant server logs showing the error
2. **Check Anthropic Status**: https://status.anthropic.com
3. **Verify API Key**: Test with the script in Step 3 above
4. **Review Recent Changes**: Check git history for config changes

## Configuration Reference

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional (with defaults)
AI_MODEL=claude-sonnet-4-5-20250929
AI_GENERATION_ENABLED=true
```

### Service Configuration

File: `src/services/ai.service.js`

```javascript
maxRetries: 2; // Number of retry attempts
timeout: 30000; // 30 seconds timeout
temperature: 1.0; // Creative variety (0-2)
max_tokens: 1024; // Response length limit
```

### Rate Limiting

File: `src/app/api/admin/generate-puzzle/route.js`

```javascript
max: 10; // 10 requests per hour per IP
```

## Prevention Tips

1. **Don't spam the generate button** - Wait for each request to complete
2. **Monitor usage** - Check Anthropic Console regularly
3. **Test locally first** - Use development environment before production
4. **Keep API key secure** - Never commit to git or share publicly
5. **Check status pages** - Both Vercel and Anthropic have status pages

## Recent Updates

### v2.0 (Current)

- Added comprehensive error logging with Anthropic-specific error handling
- Improved retry logic with exponential backoff for rate limits
- Better error messages for different failure scenarios
- Enhanced debugging with full error context logging

### v1.0

- Initial AI generation implementation
- Basic retry logic and validation
