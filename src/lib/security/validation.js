import { z } from 'zod';
import logger from '@/lib/logger';

// Constants for validation
const MAX_STRING_LENGTH = 1000;
const MAX_THEME_LENGTH = 50;
const MAX_ANSWER_LENGTH = 30;
const MAX_EMOJI_LENGTH = 10;
const MAX_REQUEST_SIZE = 1024 * 100; // 100KB max request size

// Regex patterns for validation
const PATTERNS = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  safeString: /^[a-zA-Z0-9\s\-_.,:!?'"]+$/, // Alphanumeric and common punctuation
  alphaOnly: /^[A-Z\s,]+$/, // Capital letters, spaces, and commas for answers
  username: /^[a-zA-Z0-9_-]{3,20}$/, // Username pattern
  emoji:
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\s]+$/u,
};

// XSS prevention - escape HTML entities
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return text;
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

// Strip potentially dangerous characters
export function sanitizeString(input, maxLength = MAX_STRING_LENGTH) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove control characters except newline and tab
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, maxLength);

  return sanitized;
}

// Validate and sanitize username
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(PATTERNS.username, 'Username can only contain letters, numbers, underscores, and hyphens')
  .transform((val) => sanitizeString(val, 20));

// Validate and sanitize password
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .refine((password) => {
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }
    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return false;
    }
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return false;
    }
    return true;
  }, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

// Enhanced auth credentials schema
export const authCredentialsSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(100), // Don't apply password rules on login, just length limits
});

// Date validation schema
export const dateSchema = z
  .string()
  .regex(PATTERNS.date, 'Invalid date format. Use YYYY-MM-DD')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
  }, 'Invalid date');

// Date range validation schema
export const dateRangeSchema = z
  .object({
    start: dateSchema,
    end: dateSchema,
  })
  .refine((data) => {
    const start = new Date(data.start);
    const end = new Date(data.end);
    return start <= end;
  }, 'Start date must be before or equal to end date');

// Enhanced puzzle validation schema
export const puzzleItemSchema = z.object({
  emoji: z
    .string()
    .min(1, 'Emoji is required')
    .max(MAX_EMOJI_LENGTH, `Emoji must be at most ${MAX_EMOJI_LENGTH} characters`)
    .transform((val) => sanitizeString(val, MAX_EMOJI_LENGTH)),
  answer: z
    .string()
    .min(2, 'Answer must be at least 2 characters')
    .max(MAX_ANSWER_LENGTH, `Answer must be at most ${MAX_ANSWER_LENGTH} characters`)
    .regex(PATTERNS.alphaOnly, 'Answer can only contain uppercase letters, spaces, and commas')
    .transform((val) => sanitizeString(val, MAX_ANSWER_LENGTH).toUpperCase()),
  hint: z
    .string()
    .max(60, 'Hint must be at most 60 characters')
    .optional()
    .default('')
    .transform((val) => escapeHtml(sanitizeString(val || '', 60))),
});

export const puzzleSchema = z.object({
  theme: z
    .string()
    .min(3, 'Theme must be at least 3 characters')
    .max(MAX_THEME_LENGTH, `Theme must be at most ${MAX_THEME_LENGTH} characters`)
    .transform((val) => escapeHtml(sanitizeString(val, MAX_THEME_LENGTH))),
  puzzles: z.array(puzzleItemSchema).length(4, 'Puzzle must have exactly 4 items'),
});

// Full puzzle with date schema
export const puzzleWithDateSchema = z.object({
  date: dateSchema,
  puzzle: puzzleSchema,
});

// Bulk import schema
export const bulkImportSchema = z.object({
  puzzles: z
    .array(puzzleWithDateSchema)
    .min(1, 'At least one puzzle is required')
    .max(365, 'Maximum 365 puzzles can be imported at once'),
});

// Request size validation
export function validateRequestSize(request) {
  const contentLength = request.headers.get('content-length');

  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    return {
      valid: false,
      error: `Request body too large. Maximum size is ${MAX_REQUEST_SIZE / 1024}KB`,
    };
  }

  return { valid: true };
}

// Validate JSON body with size limit
export async function parseAndValidateJson(request, schema) {
  // Check request size
  const sizeCheck = validateRequestSize(request);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  try {
    const body = await request.json();

    // Additional check for parsed JSON size
    const jsonString = JSON.stringify(body);
    if (jsonString.length > MAX_REQUEST_SIZE) {
      throw new Error(`Request body too large. Maximum size is ${MAX_REQUEST_SIZE / 1024}KB`);
    }

    // Validate against schema
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Sanitize error messages to prevent information leakage
export function sanitizeErrorMessage(error) {
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    // Log the actual error server-side
    logger.error('Sanitized error', error);

    // Return generic messages based on error type
    if (error.message.includes('Validation error')) {
      return 'Invalid input data provided';
    }
    if (error.message.includes('Unauthorized')) {
      return 'Authentication required';
    }
    if (error.message.includes('Rate limit') || error.message.includes('rate_limit')) {
      return error.message; // Rate limit messages are safe to expose
    }

    // AI-specific errors - preserve full message for debugging
    // The message includes the underlying error which helps diagnose issues
    if (error.message.includes('AI generation failed')) {
      return error.message; // Includes "AI generation failed after X attempts: [actual error]"
    }
    if (error.message.includes('Failed to parse AI response')) {
      return 'AI generated an invalid response. Please try again.';
    }
    if (
      error.message.includes('Invalid theme generated') ||
      error.message.includes('Must have exactly 4 puzzle pairs') ||
      error.message.includes('Puzzle pair') ||
      error.message.includes('Answer')
    ) {
      return 'AI generated puzzle did not meet quality standards. Please try again.';
    }

    // Generic error message
    return 'An error occurred processing your request';
  }

  // In development, return the actual error message
  return error.message;
}

// Validate environment variables
export function validateEnvironmentVariables() {
  const required = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'JWT_SECRET'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Check for default/weak values in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'tandem-jwt-secret-key-2024-change-in-production') {
      throw new Error('Default JWT secret detected in production. Please set a secure JWT_SECRET');
    }

    if (process.env.ADMIN_USERNAME === 'admin') {
      logger.warn('Using default admin username in production is not recommended');
    }
  }
}
