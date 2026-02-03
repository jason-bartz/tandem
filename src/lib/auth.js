import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { validateCSRFToken } from '@/lib/security/csrf';
import logger from '@/lib/logger';

export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      return decoded;
    }
    return null;
  } catch (error) {
    logger.error('Token verification error', error);
    return null;
  }
}

export function generateAdminToken(username) {
  return jwt.sign(
    {
      username,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Extract and validate Bearer token from Authorization header
 * Uses regex to properly parse the header and prevent edge cases
 *
 * @param {string|null} authHeader - The Authorization header value
 * @returns {{ token: string|null, error: string|null }}
 */
function extractBearerToken(authHeader) {
  if (!authHeader) {
    return { token: null, error: 'No authorization header provided' };
  }

  // Use regex to properly extract token after "Bearer " prefix
  // This prevents issues with multiple "Bearer " occurrences or malformed headers
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match || !match[1]) {
    return { token: null, error: 'Invalid authorization header format' };
  }

  const token = match[1].trim();

  if (!token) {
    return { token: null, error: 'Empty token in authorization header' };
  }

  return { token, error: null };
}

export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  const { token, error: tokenError } = extractBearerToken(authHeader);

  if (tokenError || !token) {
    return {
      error: NextResponse.json(
        { error: `Unauthorized - ${tokenError || 'No token provided'}` },
        { status: 401 }
      ),
    };
  }

  const decoded = verifyAdminToken(token);

  if (!decoded) {
    return {
      error: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }),
    };
  }

  // Validate CSRF token for state-changing operations
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      return {
        error: NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }),
      };
    }
  }

  return { admin: decoded }; // Auth passed, return admin info
}
