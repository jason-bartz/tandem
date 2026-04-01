import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  authCredentialsSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
} from '@/lib/security/validation';
import {
  getClientIdentifier,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  withRateLimit,
} from '@/lib/security/rateLimiter';
import { generateCSRFToken, getOrGenerateCSRFToken } from '@/lib/security/csrf';
import { logFailedLogin, logSuccessfulLogin } from '@/lib/security/auditLog';
import { authenticateAdmin } from '@/lib/adminUsers';
import logger from '@/lib/logger';

export async function POST(request) {
  try {
    // Check rate limiting for auth endpoint
    const rateLimitResponse = await withRateLimit(request, 'auth');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);

    const lockoutStatus = await isLockedOut(clientId);
    if (lockoutStatus.locked) {
      return NextResponse.json(
        {
          success: false,
          error: lockoutStatus.message,
          lockedUntil: lockoutStatus.until,
          permanent: lockoutStatus.permanent || false,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const { username, password } = await parseAndValidateJson(request, authCredentialsSchema);

    // Authenticate against database (falls back to env vars if table doesn't exist)
    const authResult = await authenticateAdmin(username, password);

    if (!authResult.success) {
      const attemptResult = await recordFailedAttempt(clientId);
      await logFailedLogin(clientId, username, authResult.reason);

      return NextResponse.json(
        {
          success: false,
          error: attemptResult.message || 'Invalid credentials',
          remainingAttempts: attemptResult.remainingAttempts,
          locked: attemptResult.locked || false,
        },
        { status: 401 }
      );
    }

    await clearFailedAttempts(clientId);
    await logSuccessfulLogin(clientId, username);

    const { user } = authResult;

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const csrfToken = await generateCSRFToken();

    return NextResponse.json({
      success: true,
      token,
      csrfToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Admin authentication failed', error);
    const message = sanitizeErrorMessage(error);

    if (error.message.includes('Validation error')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
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

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const { token, error: tokenError } = extractBearerToken(authHeader);

    if (tokenError || !token) {
      return NextResponse.json(
        { success: false, error: tokenError || 'No token provided' },
        { status: 401 }
      );
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const csrfToken = await getOrGenerateCSRFToken();

      return NextResponse.json({
        success: true,
        valid: true,
        csrfToken,
        user: {
          id: decoded.userId || null,
          username: decoded.username,
          fullName: decoded.fullName || decoded.username,
          email: decoded.email || null,
          role: decoded.role,
        },
      });
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('Token verification failed', error);
    return NextResponse.json(
      { success: false, error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
