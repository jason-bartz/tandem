# Production Logging Guide

## Overview

The Tandem app now uses a **production-ready, centralized logging system** that is quiet in production and verbose only when needed. This guide explains the logging architecture and how to use it.

## Key Changes

### Before (Verbose)
```javascript
// 698 console statements across 82 files
console.log('[generate-puzzle] Request received');
console.log('[generate-puzzle] Environment check:', envCheck);
console.error('[generate-puzzle] ERROR DETAILS:', { message, stack, ... });
```

### After (Production-Ready)
```javascript
// ~70 meaningful error logs only
import logger from '@/lib/logger';

logger.error('AI puzzle generation failed', error);
logger.debug('AI puzzle generated successfully', { date, theme });
```

## Logger API

### Import
```javascript
import logger from '@/lib/logger';
```

### Methods

#### `logger.error(message, error, ...metadata)`
**Production**: Always logged (ERROR level)
**Development**: Logged with full stack trace
**Usage**: Critical errors that require attention

```javascript
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', error, { userId, context });
}
```

#### `logger.warn(message, ...metadata)`
**Production**: Logged (WARN level)
**Development**: Logged with metadata
**Usage**: Non-critical issues, deprecated features

```javascript
logger.warn('Rate limit exceeded', { clientId, attempts });
```

#### `logger.info(message, ...metadata)`
**Production**: **Suppressed** (unless `NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true`)
**Development**: Logged
**Usage**: Informational messages

```javascript
logger.info('User logged in', { username });
```

#### `logger.debug(message, ...metadata)`
**Production**: **Suppressed** (unless `NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true`)
**Development**: Logged
**Usage**: Debug information

```javascript
logger.debug('Processing request', { requestId, params });
```

### Helper Methods

#### Performance Timing
```javascript
const startTime = logger.time('operation-name');
// ... do work ...
const duration = logger.timeEnd('operation-name', startTime);
// Development: Logs timing to console
// Returns: duration in milliseconds
```

#### Request Correlation
```javascript
logger.setRequestId('req-123');  // Set correlation ID
logger.error('API failed', error);  // Includes requestId
logger.clearRequestId();  // Clear after request
```

#### Sampled Logging (for high-frequency events)
```javascript
// Only log 10% of events (controlled by LOG_SAMPLING_RATE env var)
logger.sample('debug', 'High-frequency event', { data });
```

## Environment Configuration

### `.env` Variables

```bash
# Log Level (DEBUG, INFO, WARN, ERROR, NONE)
NEXT_PUBLIC_LOG_LEVEL=ERROR  # Production: ERROR, Development: DEBUG

# Enable debug logs in production (not recommended)
NEXT_PUBLIC_ENABLE_DEBUG_LOGS=false

# Sample rate for high-frequency logs (0.0 to 1.0)
LOG_SAMPLING_RATE=1.0  # 1.0 = all logs, 0.1 = 10% of logs
```

### Log Levels by Environment

| Environment | Default Level | Debug Logs | Info Logs | Warn Logs | Error Logs |
|------------|---------------|------------|-----------|-----------|------------|
| **Production** | ERROR | ❌ | ❌ | ✅ | ✅ |
| **Development** | DEBUG | ✅ | ✅ | ✅ | ✅ |
| **Test** | NONE | ❌ | ❌ | ❌ | ❌ |

## Security Features

### Automatic Data Sanitization

The logger automatically redacts sensitive data:

```javascript
logger.error('Auth failed', error, {
  password: 'secret123',  // → password: '***REDACTED***'
  apiKey: 'sk-ant-abc123',  // → apiKey: '***REDACTED***'
  token: 'Bearer xyz',  // → token: 'Bearer ***REDACTED***'
  email: 'user@example.com'  // → email: '***REDACTED***'
});
```

**Patterns automatically redacted:**
- Passwords
- API keys (including Anthropic `sk-ant-*` keys)
- Tokens (JWT, Bearer, etc.)
- Secrets
- Email addresses

### Structured Logging

**Production**: Logs are output as JSON for easy parsing
```json
{"timestamp":"2025-01-19T12:00:00.000Z","level":"ERROR","message":"API failed","platform":"Web","error":{"message":"Network error","stack":"Error: Network error"}}
```

**Development**: Logs are human-readable
```
[2025-01-19T12:00:00.000Z] [ERROR] API failed Error: Network error
    at fetch (...)
    ...
```

## Best Practices

### ✅ DO

```javascript
// Use logger for all error logging
logger.error('Database query failed', error, { query, params });

// Use descriptive, concise messages
logger.warn('Cache miss for user data', { userId });

// Include relevant context
logger.error('Payment processing failed', error, { orderId, amount });

// Use appropriate levels
logger.error('Critical: Payment failed', error);  // User-impacting
logger.warn('Deprecated API usage', { endpoint });  // Non-critical
logger.debug('Cache hit', { key });  // Development only
```

### ❌ DON'T

```javascript
// Don't use console.log() (removed from codebase)
console.log('Debug info');  // ❌

// Don't log sensitive data manually
logger.info('User password: ' + password);  // ❌ (auto-sanitized, but avoid)

// Don't use verbose messages in production
logger.error('ERROR DETAILS:', { stack, cause, metadata, ... });  // ❌

// Don't log in hot paths without sampling
for (let item of largeArray) {
  logger.debug('Processing', item);  // ❌ Use logger.sample() instead
}
```

## Migration Summary

### Files Updated

- **Logger Service**: [src/lib/logger.js](src/lib/logger.js)
- **Error Handler**: [src/lib/errorHandler.js](src/lib/errorHandler.js)
- **Audit Logs**: [src/lib/security/auditLog.js](src/lib/security/auditLog.js)
- **API Routes**: 16 files (all `/src/app/api/**/route.js`)
- **Services**: 20+ files (all `/src/services/**/*.js`)
- **Hooks**: 7 files (all `/src/hooks/*.js`)
- **Components**: 12+ files (admin, game, onboarding components)
- **Lib Utilities**: 10+ files (storage, db, auth, scheduler, etc.)

### Statistics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Console statements** | 698 | ~70 | **90% reduction** |
| **Files with console** | 82 | ~15 | **82% reduction** |
| **Verbose debug logs** | 400+ | 0 | **100% removed** |
| **Production logs** | All | Errors only | **Quiet by default** |

## Troubleshooting

### Enable debug logs temporarily

```bash
# In .env.local or environment variables
NEXT_PUBLIC_ENABLE_DEBUG_LOGS=true
NEXT_PUBLIC_LOG_LEVEL=DEBUG
```

Then restart the dev server or redeploy.

### Check logs in production

Since production logs are JSON, you can pipe them through `jq`:

```bash
vercel logs | jq 'select(.level == "ERROR")'
```

### Audit trail for admin actions

Admin actions are logged to Vercel KV (Redis) with 90-day retention:

```javascript
import { getAuditLogs } from '@/lib/security/auditLog';

const logs = await getAuditLogs('admin', 100);
```

## Future Enhancements

Possible integrations:
- **Sentry**: Error tracking and performance monitoring
- **Datadog**: APM and log aggregation
- **LogRocket**: Session replay with logs
- **Vercel Analytics**: Built-in monitoring

The current logger is designed to integrate seamlessly with these services.

## Support

For questions or issues with the logging system:
1. Check [src/lib/__tests__/logger.test.js](src/lib/__tests__/logger.test.js) for usage examples
2. Review [src/lib/logger.js](src/lib/logger.js) source code
3. Check environment variables in `.env.example`

---

**Generated**: 2025-01-19
**Version**: 1.0.0
**Status**: Production-ready ✅
