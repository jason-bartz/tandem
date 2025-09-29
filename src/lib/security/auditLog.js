import { kv } from '@vercel/kv';

const AUDIT_LOG_PREFIX = 'audit:';
const FAILED_LOGIN_PREFIX = 'failed_login:';
const LOG_RETENTION_DAYS = 90;

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(clientId, username, reason) {
  try {
    const timestamp = new Date().toISOString();
    const key = `${AUDIT_LOG_PREFIX}${FAILED_LOGIN_PREFIX}${timestamp}:${clientId}`;

    const logEntry = {
      timestamp,
      clientId,
      username: username ? username.substring(0, 3) + '***' : 'unknown', // Partial username for privacy
      reason,
      userAgent: global.lastUserAgent || 'unknown',
    };

    // Store in KV with expiration
    await kv.set(key, logEntry, {
      ex: LOG_RETENTION_DAYS * 24 * 60 * 60, // Convert days to seconds
    });

    // Also log to console for immediate visibility
    console.warn('[SECURITY] Failed login attempt:', {
      clientId,
      username: logEntry.username,
      reason,
      timestamp,
    });

    return true;
  } catch (error) {
    // Don't let logging failures break the auth flow
    console.error('[AUDIT] Failed to log failed login:', error);
    return false;
  }
}

/**
 * Log a successful login
 */
export async function logSuccessfulLogin(clientId, username) {
  try {
    const timestamp = new Date().toISOString();
    const key = `${AUDIT_LOG_PREFIX}login:${timestamp}:${clientId}`;

    const logEntry = {
      timestamp,
      clientId,
      username,
      success: true,
    };

    await kv.set(key, logEntry, {
      ex: LOG_RETENTION_DAYS * 24 * 60 * 60,
    });

    console.info('[SECURITY] Successful login:', {
      clientId,
      username,
      timestamp,
    });

    return true;
  } catch (error) {
    console.error('[AUDIT] Failed to log successful login:', error);
    return false;
  }
}

/**
 * Log admin actions
 */
export async function logAdminAction(username, action, details = {}) {
  try {
    const timestamp = new Date().toISOString();
    const key = `${AUDIT_LOG_PREFIX}admin:${timestamp}:${username}`;

    const logEntry = {
      timestamp,
      username,
      action,
      details,
    };

    await kv.set(key, logEntry, {
      ex: LOG_RETENTION_DAYS * 24 * 60 * 60,
    });

    console.info('[ADMIN] Action logged:', {
      username,
      action,
      timestamp,
    });

    return true;
  } catch (error) {
    console.error('[AUDIT] Failed to log admin action:', error);
    return false;
  }
}

/**
 * Get failed login attempts for a client
 */
export async function getFailedLoginAttempts(clientId, hours = 24) {
  try {
    const pattern = `${AUDIT_LOG_PREFIX}${FAILED_LOGIN_PREFIX}*:${clientId}`;
    const keys = await kv.keys(pattern);

    if (!keys || keys.length === 0) {
      return [];
    }

    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const attempts = [];

    for (const key of keys) {
      const data = await kv.get(key);
      if (data && new Date(data.timestamp).getTime() > cutoffTime) {
        attempts.push(data);
      }
    }

    return attempts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('[AUDIT] Failed to retrieve failed login attempts:', error);
    return [];
  }
}

/**
 * Get audit logs by type
 */
export async function getAuditLogs(type = 'all', limit = 100) {
  try {
    let pattern = `${AUDIT_LOG_PREFIX}*`;
    if (type !== 'all') {
      pattern = `${AUDIT_LOG_PREFIX}${type}:*`;
    }

    const keys = await kv.keys(pattern);

    if (!keys || keys.length === 0) {
      return [];
    }

    // Sort keys by timestamp (embedded in key)
    const sortedKeys = keys.sort().reverse().slice(0, limit);

    const logs = [];
    for (const key of sortedKeys) {
      const data = await kv.get(key);
      if (data) {
        logs.push({
          key,
          ...data,
        });
      }
    }

    return logs;
  } catch (error) {
    console.error('[AUDIT] Failed to retrieve audit logs:', error);
    return [];
  }
}