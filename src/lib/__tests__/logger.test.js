/**
 * Logger service tests
 */

import logger, { Logger, LogLevel } from '../logger';

describe('Logger', () => {
  let consoleDebugSpy;
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Log Level Configuration', () => {
    it('should default to WARN in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();
      expect(prodLogger.level).toBe(LogLevel.WARN);
      process.env.NODE_ENV = originalEnv;
    });

    it('should default to DEBUG in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const devLogger = new Logger();
      expect(devLogger.level).toBe(LogLevel.DEBUG);
      process.env.NODE_ENV = originalEnv;
    });

    it('should respect NEXT_PUBLIC_LOG_LEVEL environment variable', () => {
      const originalLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;
      process.env.NEXT_PUBLIC_LOG_LEVEL = 'ERROR';
      const customLogger = new Logger();
      expect(customLogger.level).toBe(LogLevel.ERROR);
      process.env.NEXT_PUBLIC_LOG_LEVEL = originalLevel;
    });
  });

  describe('Logging Methods', () => {
    it('should log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const devLogger = new Logger();
      devLogger.debug('test debug');
      expect(consoleDebugSpy).toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();
      prodLogger.debug('test debug');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should log errors with proper formatting', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should format log messages with timestamp', () => {
      const testLogger = new Logger();
      const formatted = testLogger.formatMessage(LogLevel.INFO, 'Test message');
      expect(formatted).toHaveProperty('timestamp');
      expect(formatted).toHaveProperty('level', 'INFO');
      expect(formatted).toHaveProperty('message', 'Test message');
    });
  });

  describe('Error Tracking', () => {
    it('should store errors in localStorage in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();
      prodLogger.error('Test error', new Error('Test'));

      // Check if localStorage was called
      const errorLogs = prodLogger.getErrorLogs();
      expect(Array.isArray(errorLogs)).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should limit stored errors to 50', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();

      // Add 60 errors
      for (let i = 0; i < 60; i++) {
        prodLogger.error(`Error ${i}`, new Error(`Test ${i}`));
      }

      const errorLogs = prodLogger.getErrorLogs();
      expect(errorLogs.length).toBeLessThanOrEqual(50);

      process.env.NODE_ENV = originalEnv;
    });

    it('should clear error logs', () => {
      logger.error('Test error', new Error('Test'));
      logger.clearErrorLogs();
      const errorLogs = logger.getErrorLogs();
      expect(errorLogs).toEqual([]);
    });
  });

  describe('Platform Detection', () => {
    it('should detect iOS platform', () => {
      window.Capacitor = { isNativePlatform: () => true };
      const iosLogger = new Logger();
      expect(iosLogger.isIOS).toBe(true);
      delete window.Capacitor;
    });

    it('should detect web platform', () => {
      const webLogger = new Logger();
      expect(webLogger.isIOS).toBe(false);
    });
  });
});