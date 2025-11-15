import { kv } from '@vercel/kv';
import logger from '@/lib/logger';

const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

// Rate limiter configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_ATTEMPTS = 5; // Maximum attempts allowed
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes lockout
const MAX_LOCKOUTS = 3; // Max lockouts before permanent block (24 hours)
const PERMANENT_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// General API rate limiting
const API_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const AI_GENERATION_WINDOW = 60 * 60 * 1000; // 1 hour for AI generation
const API_MAX_REQUESTS = {
  auth: 5, // 5 login attempts per minute
  general: 30, // 30 general API requests per minute
  write: 10, // 10 write operations per minute
  ai_generation: 30, // 30 AI generations per hour
};

/**
 * Get rate limit key for authentication attempts
 */
function getAuthRateLimitKey(identifier) {
  return `rate_limit:auth:${identifier}`;
}

/**
 * Get lockout key for an identifier
 */
function getLockoutKey(identifier) {
  return `lockout:${identifier}`;
}

/**
 * Get API rate limit key
 */
function getApiRateLimitKey(identifier, endpoint) {
  return `rate_limit:api:${endpoint}:${identifier}`;
}

/**
 * Check if an identifier is currently locked out
 */
export async function isLockedOut(identifier) {
  if (!isKvAvailable) {
    return { locked: false };
  }

  try {
    const lockoutKey = getLockoutKey(identifier);
    const lockoutData = await kv.get(lockoutKey);

    if (!lockoutData) {
      return { locked: false };
    }

    const { until, permanent } = lockoutData;
    const now = Date.now();

    if (permanent && now < until) {
      return {
        locked: true,
        permanent: true,
        until,
        message:
          'Account is permanently blocked due to excessive failed attempts. Try again later.',
      };
    }

    if (now < until) {
      const remainingMinutes = Math.ceil((until - now) / 60000);
      return {
        locked: true,
        until,
        remainingMinutes,
        message: `Too many failed attempts. Account locked for ${remainingMinutes} minutes.`,
      };
    }

    // Lockout expired, clean up
    await kv.del(lockoutKey);
    return { locked: false };
  } catch (error) {
    logger.error('Error checking lockout status', error);
    // Fail open to avoid blocking legitimate users due to Redis issues
    return { locked: false };
  }
}

/**
 * Record a failed authentication attempt
 */
export async function recordFailedAttempt(identifier) {
  if (!isKvAvailable) {
    return { locked: false };
  }

  try {
    const rateLimitKey = getAuthRateLimitKey(identifier);
    const lockoutKey = getLockoutKey(identifier);

    const lockoutStatus = await isLockedOut(identifier);
    if (lockoutStatus.locked) {
      return lockoutStatus;
    }

    // Get current attempt count
    const attempts = await kv.incr(rateLimitKey);

    if (attempts === 1) {
      await kv.expire(rateLimitKey, Math.floor(RATE_LIMIT_WINDOW / 1000));
    }

    if (attempts >= MAX_ATTEMPTS) {
      // Get current lockout count
      const currentLockout = await kv.get(lockoutKey);
      const lockoutCount = currentLockout ? currentLockout.count + 1 : 1;

      // Determine lockout duration
      let lockoutDuration = LOCKOUT_DURATION;
      let permanent = false;

      if (lockoutCount >= MAX_LOCKOUTS) {
        lockoutDuration = PERMANENT_BLOCK_DURATION;
        permanent = true;
      }

      const until = Date.now() + lockoutDuration;

      await kv.set(
        lockoutKey,
        {
          until,
          count: lockoutCount,
          permanent,
          lockedAt: Date.now(),
        },
        {
          ex: Math.floor(lockoutDuration / 1000),
        }
      );

      await kv.del(rateLimitKey);

      const remainingMinutes = Math.ceil(lockoutDuration / 60000);
      return {
        locked: true,
        permanent,
        until,
        remainingMinutes,
        message: permanent
          ? 'Account permanently blocked due to excessive failed attempts.'
          : `Account locked for ${remainingMinutes} minutes due to too many failed attempts.`,
      };
    }

    return {
      locked: false,
      remainingAttempts: MAX_ATTEMPTS - attempts,
      message: `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempts remaining.`,
    };
  } catch (error) {
    logger.error('Error recording failed attempt', error);
    // Fail open
    return { locked: false };
  }
}

/**
 * Clear failed attempts on successful authentication
 */
export async function clearFailedAttempts(identifier) {
  if (!isKvAvailable) {
    return;
  }

  try {
    const rateLimitKey = getAuthRateLimitKey(identifier);
    await kv.del(rateLimitKey);
  } catch (error) {
    logger.error('Error clearing failed attempts', error);
  }
}

/**
 * Check API rate limit
 */
export async function checkApiRateLimit(identifier, endpoint = 'general') {
  if (!isKvAvailable) {
    return { allowed: true };
  }

  try {
    const key = getApiRateLimitKey(identifier, endpoint);
    const limit = API_MAX_REQUESTS[endpoint] || API_MAX_REQUESTS.general;

    // Use different time window for AI generation (1 hour vs 1 minute)
    const window = endpoint === 'ai_generation' ? AI_GENERATION_WINDOW : API_RATE_LIMIT_WINDOW;
    const windowSeconds = Math.floor(window / 1000);

    // Get current request count
    const count = await kv.incr(key);

    if (count === 1) {
      await kv.expire(key, windowSeconds);
    }

    if (count > limit) {
      const timeUnit = endpoint === 'ai_generation' ? 'hour' : 'minute';
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetIn: windowSeconds,
        message: `Rate limit exceeded. Maximum ${limit} requests per ${timeUnit}.`,
      };
    }

    return {
      allowed: true,
      limit,
      remaining: limit - count,
      resetIn: windowSeconds,
    };
  } catch (error) {
    logger.error('Error checking API rate limit', error);
    // Fail open
    return { allowed: true };
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request) {
  // Try to get real IP from various headers (considering proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a generic identifier if no IP is available
  // This should rarely happen in production
  return 'unknown-client';
}

/**
 * Middleware helper to apply rate limiting
 */
export async function withRateLimit(request, endpoint = 'general') {
  const identifier = getClientIdentifier(request);
  const rateLimit = await checkApiRateLimit(identifier, endpoint);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: rateLimit.message,
        retryAfter: rateLimit.resetIn,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.resetIn),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Date.now() + rateLimit.resetIn * 1000),
        },
      }
    );
  }

  return null; // Continue with request
}
