import { NextResponse } from 'next/server';
import { getClientIdentifier, checkApiRateLimit } from '@/lib/security/rateLimiter';

// Security headers configuration
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
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
    "block-all-mixed-content",
    "upgrade-insecure-requests",
  ].join('; '),
};

export async function middleware(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  
  // Create response
  let response;
  
  // Allow GET requests to rotate-puzzle endpoint for status checks
  if (request.nextUrl.pathname === '/api/admin/rotate-puzzle' && 
      request.method === 'GET') {
    response = NextResponse.next();
  }
  // Admin route protection with rate limiting
  else if (request.nextUrl.pathname.startsWith('/api/admin') && 
      !request.nextUrl.pathname.includes('/api/admin/auth')) {
    
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
  if (request.nextUrl.pathname.startsWith('/admin') || 
      request.nextUrl.pathname.startsWith('/api/admin')) {
    Object.entries(adminCSP).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  // Add CORS headers for API routes (but restrict for admin routes)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      // Restrict CORS for admin API routes
      const origin = request.headers.get('origin');
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'https://tandem-game.vercel.app', // Add your production domain
      ];
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      // Allow CORS for public API routes
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};