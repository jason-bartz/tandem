/**
 * Enhanced validation service using Zod
 * Provides comprehensive input validation across the application
 */

import { z } from 'zod';
import logger from './logger';

// Common validation patterns
const patterns = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  safeString: /^[a-zA-Z0-9\s\-_.,!?'"]+$/
};

// Common schemas
export const schemas = {
  // Date validation
  dateString: z.string().regex(patterns.date, 'Invalid date format (YYYY-MM-DD)'),

  // Puzzle validation
  puzzle: z.object({
    theme: z.string().min(1).max(100),
    puzzles: z.array(
      z.object({
        emoji: z.string().min(1).max(20),
        answer: z.string().min(1).max(50).transform(val => val.toUpperCase())
      })
    ).length(4)
  }),

  // Game state validation
  gameCompletion: z.object({
    completed: z.boolean(),
    time: z.number().min(0).max(86400), // Max 24 hours
    mistakes: z.number().min(0).max(4),
    hintsUsed: z.number().min(0).max(1).optional(),
    shared: z.boolean().optional()
  }),

  // Admin authentication
  adminAuth: z.object({
    password: z.string().min(8).max(100)
  }),

  // Stats validation
  stats: z.object({
    played: z.number().min(0),
    won: z.number().min(0),
    currentStreak: z.number().min(0),
    maxStreak: z.number().min(0),
    averageTime: z.number().min(0).optional(),
    averageMistakes: z.number().min(0).max(4).optional()
  }),

  // User answer validation
  userAnswer: z.string()
    .min(1)
    .max(30)
    .transform(val => val.trim().toUpperCase())
    .refine(val => patterns.safeString.test(val), 'Invalid characters in answer'),

  // Bulk import validation
  bulkImport: z.object({
    puzzles: z.array(
      z.object({
        date: z.string().regex(patterns.date),
        theme: z.string().min(1).max(100),
        puzzles: z.array(
          z.object({
            emoji: z.string().min(1).max(20),
            answer: z.string().min(1).max(50)
          })
        ).length(4)
      })
    ).min(1).max(100) // Max 100 puzzles at once
  })
};

/**
 * Validation helper class
 */
class ValidationService {
  /**
   * Validate data against a schema
   */
  validate(schema, data) {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation failed', {
          errors: error.errors,
          data: this.sanitizeForLogging(data)
        });
        return {
          success: false,
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        };
      }
      logger.error('Unexpected validation error', error);
      return {
        success: false,
        errors: [{ field: 'unknown', message: 'Validation error occurred' }]
      };
    }
  }

  /**
   * Validate with throwing error
   */
  validateOrThrow(schema, data) {
    return schema.parse(data);
  }

  /**
   * Safe validation (returns null on error)
   */
  validateSafe(schema, data) {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
  }

  /**
   * Sanitize data for logging (remove sensitive info)
   */
  sanitizeForLogging(data) {
    if (!data || typeof data !== 'object') {return data;}

    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Validate API request
   */
  validateApiRequest(schema, request) {
    const validation = this.validate(schema, request);
    if (!validation.success) {
      return {
        success: false,
        status: 400,
        error: 'Validation failed',
        details: validation.errors
      };
    }
    return {
      success: true,
      data: validation.data
    };
  }

  /**
   * Create custom validator
   */
  createValidator(schema, options = {}) {
    return (data) => {
      const result = this.validate(schema, data);
      if (!result.success && options.throwOnError) {
        throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`);
      }
      return result;
    };
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {return '';}

    let sanitized = input.trim();

    switch (type) {
      case 'text':
        // Remove any HTML tags and dangerous characters
        sanitized = sanitized.replace(/<[^>]*>/g, '');
        sanitized = sanitized.replace(/[<>\"']/g, '');
        break;
      case 'answer':
        // For puzzle answers - only allow letters and spaces
        sanitized = sanitized.toUpperCase().replace(/[^A-Z\s]/g, '');
        break;
      case 'alphanumeric':
        sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
        break;
      case 'email':
        sanitized = sanitized.toLowerCase();
        break;
    }

    return sanitized.substring(0, 1000); // Max length for safety
  }

  /**
   * Validate environment variables
   */
  validateEnv() {
    const envSchema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
      NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
      NEXT_PUBLIC_API_URL: z.string().url().optional(),
      NEXT_PUBLIC_LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']).optional()
    });

    try {
      envSchema.parse(process.env);
      return true;
    } catch (error) {
      logger.error('Environment validation failed', error);
      return false;
    }
  }
}

// Create singleton instance
const validationService = new ValidationService();

export default validationService;