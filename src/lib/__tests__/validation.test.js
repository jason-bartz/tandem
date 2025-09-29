/**
 * Validation service tests
 */

import validationService, { schemas } from '../validation';

describe('ValidationService', () => {
  describe('Date Validation', () => {
    it('should validate correct date format', () => {
      const result = validationService.validate(schemas.dateString, '2025-09-29');
      expect(result.success).toBe(true);
      expect(result.data).toBe('2025-09-29');
    });

    it('should reject invalid date format', () => {
      const result = validationService.validate(schemas.dateString, '09/29/2025');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Puzzle Validation', () => {
    it('should validate correct puzzle structure', () => {
      const puzzle = {
        theme: 'Animals',
        puzzles: [
          { emoji: '🐶', answer: 'DOG' },
          { emoji: '🐱', answer: 'CAT' },
          { emoji: '🐭', answer: 'MOUSE' },
          { emoji: '🐰', answer: 'RABBIT' }
        ]
      };
      const result = validationService.validate(schemas.puzzle, puzzle);
      expect(result.success).toBe(true);
    });

    it('should reject puzzle with wrong number of items', () => {
      const puzzle = {
        theme: 'Animals',
        puzzles: [
          { emoji: '🐶', answer: 'DOG' },
          { emoji: '🐱', answer: 'CAT' }
        ]
      };
      const result = validationService.validate(schemas.puzzle, puzzle);
      expect(result.success).toBe(false);
    });

    it('should transform answers to uppercase', () => {
      const puzzle = {
        theme: 'Animals',
        puzzles: [
          { emoji: '🐶', answer: 'dog' },
          { emoji: '🐱', answer: 'cat' },
          { emoji: '🐭', answer: 'mouse' },
          { emoji: '🐰', answer: 'rabbit' }
        ]
      };
      const result = validationService.validate(schemas.puzzle, puzzle);
      expect(result.success).toBe(true);
      expect(result.data.puzzles[0].answer).toBe('DOG');
    });
  });

  describe('Game Completion Validation', () => {
    it('should validate correct game completion data', () => {
      const completion = {
        completed: true,
        time: 300,
        mistakes: 2,
        hintsUsed: 1,
        shared: false
      };
      const result = validationService.validate(schemas.gameCompletion, completion);
      expect(result.success).toBe(true);
    });

    it('should reject invalid mistake count', () => {
      const completion = {
        completed: true,
        time: 300,
        mistakes: 5
      };
      const result = validationService.validate(schemas.gameCompletion, completion);
      expect(result.success).toBe(false);
    });

    it('should reject negative time', () => {
      const completion = {
        completed: true,
        time: -1,
        mistakes: 2
      };
      const result = validationService.validate(schemas.gameCompletion, completion);
      expect(result.success).toBe(false);
    });
  });

  describe('User Answer Validation', () => {
    it('should validate and transform user answer', () => {
      const result = validationService.validate(schemas.userAnswer, '  hello  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO');
    });

    it('should reject answer with invalid characters', () => {
      const result = validationService.validate(schemas.userAnswer, 'hello@#$');
      expect(result.success).toBe(false);
    });

    it('should reject too long answer', () => {
      const longAnswer = 'a'.repeat(31);
      const result = validationService.validate(schemas.userAnswer, longAnswer);
      expect(result.success).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML tags from text input', () => {
      const input = '<script>alert("xss")</script>Hello';
      const sanitized = validationService.sanitizeInput(input, 'text');
      expect(sanitized).toBe('Hello');
    });

    it('should sanitize answer input to only letters and spaces', () => {
      const input = 'Hello123!@#';
      const sanitized = validationService.sanitizeInput(input, 'answer');
      expect(sanitized).toBe('HELLO');
    });

    it('should limit input length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = validationService.sanitizeInput(longInput, 'text');
      expect(sanitized.length).toBe(1000);
    });

    it('should handle non-string input', () => {
      const sanitized = validationService.sanitizeInput(null, 'text');
      expect(sanitized).toBe('');
    });
  });

  describe('API Request Validation', () => {
    it('should validate API request successfully', () => {
      const result = validationService.validateApiRequest(
        schemas.adminAuth,
        { password: 'securePassword123' }
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return error for invalid API request', () => {
      const result = validationService.validateApiRequest(
        schemas.adminAuth,
        { password: '123' }
      );
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('Safe Validation', () => {
    it('should return null for invalid data with validateSafe', () => {
      const result = validationService.validateSafe(schemas.dateString, 'invalid');
      expect(result).toBeNull();
    });

    it('should return parsed data for valid data with validateSafe', () => {
      const result = validationService.validateSafe(schemas.dateString, '2025-09-29');
      expect(result).toBe('2025-09-29');
    });
  });

  describe('Environment Validation', () => {
    it('should validate environment variables', () => {
      const result = validationService.validateEnv();
      expect(typeof result).toBe('boolean');
    });
  });
});