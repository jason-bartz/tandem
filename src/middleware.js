import { NextResponse } from 'next/server';
import { getClientIdentifier, checkApiRateLimit } from '@/lib/security/rateLimiter';

// Security headers configuration
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// Content Security Policy for admin routes
const adminCSP = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'block-all-mixed-content',
    'upgrade-insecure-requests',
  ].join('; '),
};

// Whitelist of allowed CORS origins
const ALLOWED_ORIGINS = [
  'https://www.tandemdaily.com',
  'https://tandemdaily.com',
  'https://tandem-game.vercel.app',
];

/**
 * Check if an origin is allowed for CORS
 * @param {string|null} origin - The request origin header
 * @returns {string|null} - The allowed origin or null
 */
function getAllowedOrigin(origin) {
  if (!origin) return null;

  // Check static whitelist
  if (ALLOWED_ORIGINS.includes(origin)) return origin;

  // Allow localhost in development only
  if (process.env.NODE_ENV === 'development' && origin === 'http://localhost:3000') {
    return origin;
  }

  // Allow Capacitor iOS app origins
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
    return origin;
  }

  return null;
}

export async function middleware(request) {
  // Handle CORS preflight requests with proper origin validation
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    const allowedOrigin = getAllowedOrigin(origin);

    const response = new NextResponse(null, { status: 200 });

    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Create response
  let response;

  // Allow GET requests to rotate-puzzle endpoint for status checks
  if (request.nextUrl.pathname === '/api/admin/rotate-puzzle' && request.method === 'GET') {
    response = NextResponse.next();
  }
  // Admin route protection with rate limiting
  else if (
    request.nextUrl.pathname.startsWith('/api/admin') &&
    !request.nextUrl.pathname.includes('/api/admin/auth')
  ) {
    // Apply rate limiting for admin API routes
    const clientId = getClientIdentifier(request);
    const endpoint = request.method === 'GET' ? 'general' : 'write';
    const rateLimit = await checkApiRateLimit(clientId, endpoint);

    if (!rateLimit.allowed) {
      response = NextResponse.json(
        {
          error: 'Too Many Requests',
          message: rateLimit.message,
          retryAfter: rateLimit.resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetIn),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    } else {
      const authHeader = request.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response = NextResponse.json(
          { error: 'Unauthorized - No token provided' },
          { status: 401 }
        );
      } else {
        response = NextResponse.next();
      }
    }
  } else {
    response = NextResponse.next();
  }

  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add stricter CSP for admin routes
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/admin')
  ) {
    Object.entries(adminCSP).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Add CORS headers for API routes with strict origin validation
  // SECURITY: Never use wildcard (*) to prevent cross-site request attacks
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigin = getAllowedOrigin(origin);

    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    // If origin doesn't match, don't set CORS headers - browser will block the request

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token'
    );
    response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
