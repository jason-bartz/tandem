/**
 * Email Service
 *
 * Secure email delivery service using Resend API.
 * Handles email sending with proper error handling, logging, and input validation.
 *
 * @module emailService
 */

import { Resend } from 'resend';
import logger from '../logger.js';

/**
 * Initialize Resend client with API key from environment variables
 * The API key should be stored securely in environment variables, never in code
 */
let resendClient = null;

/**
 * Get or initialize the Resend client singleton
 * @returns {Resend|null} Resend client instance or null if not configured
 */
function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logger.warn('RESEND_API_KEY not configured - email notifications will be disabled');
    return null;
  }

  try {
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch (error) {
    logger.error('Failed to initialize Resend client', { error: error.message });
    return null;
  }
}

/**
 * Validates email configuration and parameters
 * @param {Object} params - Email parameters
 * @param {string} params.from - Sender email address
 * @param {string|string[]} params.to - Recipient email address(es)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @returns {Object} Validation result with isValid boolean and error message
 */
function validateEmailParams({ from, to, subject, html }) {
  if (!from || typeof from !== 'string') {
    return { isValid: false, error: 'Invalid sender email address' };
  }

  if (!to || (typeof to !== 'string' && !Array.isArray(to))) {
    return { isValid: false, error: 'Invalid recipient email address' };
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return { isValid: false, error: 'Invalid email subject' };
  }

  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    return { isValid: false, error: 'Invalid email content' };
  }

  // Check for reasonable length limits to prevent abuse
  if (subject.length > 500) {
    return { isValid: false, error: 'Email subject too long' };
  }

  if (html.length > 100000) {
    return { isValid: false, error: 'Email content too long' };
  }

  return { isValid: true };
}

/**
 * Send an email using Resend
 *
 * @param {Object} params - Email parameters
 * @param {string} params.from - Sender email address (must be verified domain)
 * @param {string|string[]} params.to - Recipient email address(es)
 * @param {string} params.subject - Email subject line
 * @param {string} params.html - HTML email content
 * @param {string} [params.replyTo] - Optional reply-to address
 * @param {Object} [params.metadata] - Optional metadata for tracking
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export async function sendEmail({ from, to, subject, html, replyTo, metadata = {} }) {
  // Validate parameters
  const validation = validateEmailParams({ from, to, subject, html });
  if (!validation.isValid) {
    logger.error('Email validation failed', { error: validation.error, metadata });
    return {
      success: false,
      error: validation.error,
    };
  }

  // Get Resend client
  const client = getResendClient();
  if (!client) {
    logger.error('Email service not configured - cannot send email', { metadata });
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    // Prepare email payload
    const emailPayload = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    // Add optional parameters
    if (replyTo) {
      emailPayload.replyTo = replyTo;
    }

    // Send email via Resend
    const response = await client.emails.send(emailPayload);

    // Log success (without sensitive content)
    logger.info('Email sent successfully', {
      emailId: response.id,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      metadata,
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    // Log error with context but without sensitive data
    logger.error('Failed to send email', {
      error: error.message,
      statusCode: error.statusCode,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      metadata,
    });

    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

/**
 * Check if email service is configured and available
 * @returns {boolean} True if email service is ready to use
 */
export function isEmailServiceAvailable() {
  return getResendClient() !== null;
}

/**
 * Export for testing purposes
 * @private
 */
export const __testing__ = {
  validateEmailParams,
  getResendClient,
};
