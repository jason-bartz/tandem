import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_LENGTH = 32;
// Use __Host- prefix only in production (requires HTTPS)
const CSRF_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-csrf' : 'csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Generate a cryptographically secure random token
 */
function generateToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Generate a CSRF token for the current session
 */
export async function generateCSRFToken() {
  const token = generateToken();
  const cookieStore = await cookies();

  // Set the CSRF token in a secure, httpOnly cookie
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });

  return token;
}

/**
 * Get the current CSRF token from cookies
 */
export async function getCSRFToken() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Validate a CSRF token from a request
 */
export async function validateCSRFToken(request) {
  // Skip CSRF validation for GET requests
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  // Check for CSRF token in headers
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (headerToken && headerToken === cookieToken) {
    return true;
  }

  // Check for CSRF token in request body (for form submissions)
  try {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await request.clone().json();
      if (body.csrfToken === cookieToken) {
        return true;
      }
    }
  } catch {
    // Body parsing failed, continue to return false
  }

  return false;
}

/**
 * Middleware helper to require CSRF validation
 */
export async function requireCSRF(request) {
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return new Response(
      JSON.stringify({
        error: 'CSRF validation failed',
        message: 'Invalid or missing CSRF token'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null; // Validation passed
}