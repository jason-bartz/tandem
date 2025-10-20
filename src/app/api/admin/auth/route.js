import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  authCredentialsSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
  validateEnvironmentVariables
} from '@/lib/security/validation';
import {
  getClientIdentifier,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  withRateLimit
} from '@/lib/security/rateLimiter';
import { generateCSRFToken } from '@/lib/security/csrf';
import { logFailedLogin, logSuccessfulLogin } from '@/lib/security/auditLog';
import logger from '@/lib/logger';

export async function POST(request) {
  try {
    // Validate environment variables
    validateEnvironmentVariables();
    
    // Check rate limiting for auth endpoint
    const rateLimitResponse = await withRateLimit(request, 'auth');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);
    
    // Check if client is locked out
    const lockoutStatus = await isLockedOut(clientId);
    if (lockoutStatus.locked) {
      return NextResponse.json(
        { 
          success: false, 
          error: lockoutStatus.message,
          lockedUntil: lockoutStatus.until,
          permanent: lockoutStatus.permanent || false
        },
        { status: 429 }
      );
    }
    
    // Parse and validate request body
    const { username, password } = await parseAndValidateJson(request, authCredentialsSchema);
    
    // Check credentials
    const isValidUsername = username === process.env.ADMIN_USERNAME;
    const isValidPassword = isValidUsername && await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );
    
    if (!isValidUsername || !isValidPassword) {
      // Record failed attempt
      const attemptResult = await recordFailedAttempt(clientId);

      // Log failed login attempt
      await logFailedLogin(
        clientId,
        username,
        isValidUsername ? 'Invalid password' : 'Invalid username'
      );

      return NextResponse.json(
        {
          success: false,
          error: attemptResult.message || 'Invalid credentials',
          remainingAttempts: attemptResult.remainingAttempts,
          locked: attemptResult.locked || false
        },
        { status: 401 }
      );
    }
    
    // Clear failed attempts on successful login
    await clearFailedAttempts(clientId);

    // Log successful login
    await logSuccessfulLogin(clientId, username);

    const token = jwt.sign(
      {
        username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Generate CSRF token for the session
    const csrfToken = await generateCSRFToken();

    return NextResponse.json({
      success: true,
      token,
      csrfToken,
      user: { username, role: 'admin' },
    });
  } catch (error) {
    logger.error('Admin authentication failed', error);

    const message = sanitizeErrorMessage(error);

    if (error.message.includes('Validation error')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    if (error.message.includes('environment variables')) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Generate new CSRF token on token validation
      const csrfToken = await generateCSRFToken();

      return NextResponse.json({
        success: true,
        valid: true,
        csrfToken,
        user: {
          username: decoded.username,
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