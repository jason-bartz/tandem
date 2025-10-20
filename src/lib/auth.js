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

export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
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
