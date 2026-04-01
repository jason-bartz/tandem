import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { validateCSRFToken } from '@/lib/security/csrf';
import logger from '@/lib/logger';

// Role hierarchy for permission checks
const ROLE_LEVELS = { owner: 3, admin: 2, editor: 1 };

export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role && ROLE_LEVELS[decoded.role] >= 1) {
      return decoded;
    }
    return null;
  } catch (error) {
    logger.error('Token verification error', error);
    return null;
  }
}

export function generateAdminToken(user) {
  const payload =
    typeof user === 'string'
      ? { username: user, role: 'admin', iat: Math.floor(Date.now() / 1000) }
      : {
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          iat: Math.floor(Date.now() / 1000),
        };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function extractBearerToken(authHeader) {
  if (!authHeader) {
    return { token: null, error: 'No authorization header provided' };
  }

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

/**
 * Require admin authentication. Optionally require a minimum role level.
 * @param {Request} request
 * @param {Object} options
 * @param {string} options.minRole - Minimum role required: 'editor', 'admin', or 'owner'
 */
export async function requireAdmin(request, options = {}) {
  const { minRole = 'editor' } = options;

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

  // Check role level
  const requiredLevel = ROLE_LEVELS[minRole] || 1;
  const userLevel = ROLE_LEVELS[decoded.role] || 0;

  if (userLevel < requiredLevel) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 }),
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

  return {
    admin: {
      userId: decoded.userId || null,
      username: decoded.username,
      fullName: decoded.fullName || decoded.username,
      email: decoded.email || null,
      role: decoded.role,
    },
  };
}
