/**
 * Apple Sign In REST API Client
 * Handles token revocation for account deletion compliance
 *
 * Apple requires apps using Sign in with Apple to revoke user tokens
 * when deleting accounts (App Store Review Guideline 5.1.1)
 *
 * References:
 * - https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
 * - https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */

import jwt from 'jsonwebtoken';

/**
 * Generate client secret for Apple Sign In REST API
 * Required for token revocation and validation
 *
 * @returns {string} JWT client secret
 */
export function generateAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.APPLE_CLIENT_ID || 'com.tandemdaily.app';
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error('Missing required Apple Sign In credentials');
  }

  // Decode the private key (it's base64 encoded in env)
  const decodedKey = Buffer.from(privateKey, 'base64').toString('utf-8');

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 86400 * 180, // Valid for 180 days (max allowed)
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const options = {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: keyId,
    },
  };

  return jwt.sign(payload, decodedKey, options);
}

/**
 * Exchange authorization code for refresh token
 * Required before revoking access
 *
 * @param {string} authorizationCode - Authorization code from Apple Sign In
 * @returns {Promise<{success: boolean, refreshToken?: string, error?: string}>}
 */
export async function getRefreshToken(authorizationCode) {
  if (!authorizationCode) {
    return { success: false, error: 'No authorization code provided' };
  }

  try {
    const clientSecret = generateAppleClientSecret();
    const clientId = process.env.APPLE_CLIENT_ID || 'com.tandemdaily.app';

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.status === 200) {
      const data = await response.json();
      return {
        success: true,
        refreshToken: data.refresh_token,
        accessToken: data.access_token,
      };
    }

    const errorText = await response.text();
    console.error('[AppleAuth] Token exchange failed:', errorText);

    return {
      success: false,
      error: `Failed to exchange authorization code: ${response.status}`,
    };
  } catch (error) {
    console.error('[AppleAuth] Token exchange error:', error);
    return {
      success: false,
      error: error.message || 'Token exchange failed',
    };
  }
}

/**
 * Revoke Apple Sign In tokens
 * Must be called when user deletes their account
 *
 * @param {string} token - Refresh token, access token, or authorization code to revoke
 * @param {string} tokenTypeHint - 'refresh_token', 'access_token', or 'authorization_code'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function revokeAppleToken(token, tokenTypeHint = 'refresh_token') {
  if (!token) {
    return { success: false, error: 'No token provided' };
  }

  try {
    let tokenToRevoke = token;

    // If we have an authorization code, exchange it for a refresh token first
    if (tokenTypeHint === 'authorization_code') {
      const exchangeResult = await getRefreshToken(token);

      if (!exchangeResult.success) {
        console.error('[AppleAuth] Failed to exchange authorization code:', exchangeResult.error);
        // Try to revoke the authorization code directly as fallback
        tokenToRevoke = token;
        tokenTypeHint = 'access_token'; // Treat as access token
      } else {
        tokenToRevoke = exchangeResult.refreshToken;
        tokenTypeHint = 'refresh_token';
      }
    }

    const clientSecret = generateAppleClientSecret();
    const clientId = process.env.APPLE_CLIENT_ID || 'com.tandemdaily.app';

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token: tokenToRevoke,
      token_type_hint: tokenTypeHint,
    });

    const response = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // Apple returns 200 for both successful revocation and already-revoked tokens
    if (response.status === 200) {
      return { success: true };
    }

    const errorText = await response.text();
    console.error('[AppleAuth] Token revocation failed:', errorText);

    return {
      success: false,
      error: `Failed to revoke Apple token: ${response.status}`,
    };
  } catch (error) {
    console.error('[AppleAuth] Token revocation error:', error);
    return {
      success: false,
      error: error.message || 'Token revocation failed',
    };
  }
}

/**
 * Validate Apple ID token
 * Useful for verifying user identity before account deletion
 *
 * @param {string} idToken - Apple ID token from sign-in
 * @returns {Promise<{valid: boolean, userId?: string, email?: string, error?: string}>}
 */
export async function validateAppleIdToken(idToken) {
  if (!idToken) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Decode without verification to get the payload
    const decoded = jwt.decode(idToken, { complete: true });

    if (!decoded) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Extract user info
    const { sub: userId, email } = decoded.payload;

    // In production, you should verify the signature using Apple's public keys
    // For now, we'll do basic validation
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp && decoded.payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      userId,
      email: email || null,
    };
  } catch (error) {
    console.error('[AppleAuth] Token validation error:', error);
    return {
      valid: false,
      error: error.message || 'Token validation failed',
    };
  }
}

export default {
  generateAppleClientSecret,
  revokeAppleToken,
  validateAppleIdToken,
};
