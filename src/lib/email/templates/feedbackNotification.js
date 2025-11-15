/**
 * Feedback Notification Email Template
 *
 * Professional HTML email template for feedback notifications.
 * Implements XSS protection through HTML escaping and input sanitization.
 *
 * @module feedbackNotificationTemplate
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }

  const str = String(text);
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitize and validate feedback data
 * @param {Object} feedback - Feedback data object
 * @returns {Object} Sanitized feedback object
 */
function sanitizeFeedbackData(feedback) {
  return {
    category: escapeHtml(feedback.category || 'Unknown'),
    message: escapeHtml(feedback.message || ''),
    email: escapeHtml(feedback.email || 'Not provided'),
    username: escapeHtml(feedback.username || 'Anonymous'),
    allowContact: Boolean(feedback.allowContact),
    platform: escapeHtml(feedback.platform || 'Unknown'),
    userAgent: escapeHtml(feedback.userAgent || 'Unknown'),
    createdAt: feedback.createdAt
      ? new Date(feedback.createdAt).toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        })
      : new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
        }),
  };
}

/**
 * Generate category badge color based on feedback category
 * @param {string} category - Feedback category
 * @returns {Object} Badge colors object with background and text
 */
function getCategoryBadgeColors(category) {
  const colors = {
    'Bug Report': { bg: '#ef4444', text: '#ffffff' },
    'Feature Request': { bg: '#3b82f6', text: '#ffffff' },
    'Game Feedback': { bg: '#10b981', text: '#ffffff' },
    Other: { bg: '#6b7280', text: '#ffffff' },
  };

  return colors[category] || colors.Other;
}

/**
 * Generate HTML email for feedback notification
 * @param {Object} feedback - Feedback data object
 * @param {string} feedback.category - Feedback category
 * @param {string} feedback.message - Feedback message content
 * @param {string} feedback.email - User's email address
 * @param {string} [feedback.username] - User's username
 * @param {boolean} feedback.allowContact - Whether user allows contact
 * @param {string} [feedback.platform] - Platform (web/mobile)
 * @param {string} [feedback.userAgent] - User agent string
 * @param {string|Date} [feedback.createdAt] - Submission timestamp
 * @returns {string} HTML email content
 */
export function generateFeedbackNotificationEmail(feedback) {
  // Sanitize all input data to prevent XSS
  const safe = sanitizeFeedbackData(feedback);
  const badgeColors = getCategoryBadgeColors(safe.category);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback Submission - Tandem</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                New Feedback Received
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">
                Tandem Daily Puzzle
              </p>
            </td>
          </tr>

          <!-- Category Badge -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: ${badgeColors.bg}; color: ${badgeColors.text}; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block;">
                    ${safe.category}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Content -->
          <tr>
            <td style="padding: 24px 40px;">
              <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px 20px; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 15px; white-space: pre-wrap; word-wrap: break-word;">
${safe.message}
                </p>
              </div>
            </td>
          </tr>

          <!-- User Information -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; font-weight: 600; padding-right: 12px; vertical-align: top; width: 120px;">
                          Username:
                        </td>
                        <td style="color: #111827; font-size: 14px;">
                          ${safe.username}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; font-weight: 600; padding-right: 12px; vertical-align: top; width: 120px;">
                          Email:
                        </td>
                        <td style="color: #111827; font-size: 14px;">
                          <a href="mailto:${safe.email}" style="color: #667eea; text-decoration: none;">
                            ${safe.email}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; font-weight: 600; padding-right: 12px; vertical-align: top; width: 120px;">
                          Contact OK:
                        </td>
                        <td style="color: #111827; font-size: 14px;">
                          ${
                            safe.allowContact
                              ? '<span style="color: #10b981; font-weight: 600;">✓ Yes</span>'
                              : '<span style="color: #ef4444;">✗ No</span>'
                          }
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; font-weight: 600; padding-right: 12px; vertical-align: top; width: 120px;">
                          Platform:
                        </td>
                        <td style="color: #111827; font-size: 14px;">
                          ${safe.platform}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; font-weight: 600; padding-right: 12px; vertical-align: top; width: 120px;">
                          Submitted:
                        </td>
                        <td style="color: #111827; font-size: 14px;">
                          ${safe.createdAt}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; font-weight: 600; padding-right: 12px; vertical-align: top; width: 120px;">
                          User Agent:
                        </td>
                        <td style="color: #6b7280; font-size: 12px; word-break: break-all;">
                          ${safe.userAgent}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                This is an automated notification from Tandem Daily Puzzle feedback system.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of feedback notification
 * Useful as fallback for email clients that don't support HTML
 * @param {Object} feedback - Feedback data object
 * @returns {string} Plain text email content
 */
export function generateFeedbackNotificationText(feedback) {
  const safe = sanitizeFeedbackData(feedback);

  return `
NEW FEEDBACK RECEIVED - TANDEM DAILY PUZZLE
============================================

Category: ${safe.category}

Message:
--------
${safe.message}

User Information:
-----------------
Username:     ${safe.username}
Email:        ${safe.email}
Contact OK:   ${safe.allowContact ? 'Yes' : 'No'}
Platform:     ${safe.platform}
Submitted:    ${safe.createdAt}
User Agent:   ${safe.userAgent}

---
This is an automated notification from Tandem Daily Puzzle feedback system.
  `.trim();
}

/**
 * Export for testing purposes
 * @private
 */
export const __testing__ = {
  escapeHtml,
  sanitizeFeedbackData,
  getCategoryBadgeColors,
};
