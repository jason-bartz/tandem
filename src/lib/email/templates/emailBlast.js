/**
 * Email Blast Template
 *
 * On-brand HTML email template for admin email blasts.
 * Uses the flat design system for Tandem Daily emails.
 *
 * @module emailBlastTemplate
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
 * Category colors matching the brand
 */
const CATEGORY_COLORS = {
  general: { bg: '#a855f7', label: 'General' },
  update: { bg: '#38b6ff', label: 'Update' },
  promotion: { bg: '#7ed957', label: 'Promotion' },
  announcement: { bg: '#ffce00', label: 'Announcement' },
  maintenance: { bg: '#ff5757', label: 'Maintenance' },
};

/**
 * Convert plain text body to HTML paragraphs
 * Supports line breaks and basic formatting
 * @param {string} body - Plain text body
 * @returns {string} HTML formatted body
 */
function bodyToHtml(body) {
  if (!body) return '';

  return escapeHtml(body)
    .split('\n\n')
    .map((paragraph) => {
      const withBreaks = paragraph.replace(/\n/g, '<br>');
      return `<p style="margin: 0 0 16px 0; color: #111827; font-size: 15px; line-height: 1.6;">${withBreaks}</p>`;
    })
    .join('');
}

/**
 * Generate the full HTML email for an email blast
 * @param {Object} params
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Plain text body content
 * @param {string} [params.category='general'] - Email category
 * @returns {string} Full HTML email
 */
export function generateEmailBlastHtml({ subject, body, category = 'general' }) {
  const safeSubject = escapeHtml(subject);
  const categoryInfo = CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
  const htmlBody = bodyToHtml(body);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #F3F4F6; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: ${categoryInfo.bg}; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                ${safeSubject}
              </h1>
              <p style="margin: 8px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">
                Tandem Daily Games
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 40px;">
              ${htmlBody}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F3F4F6; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 700;">
                Tandem Daily Games
              </p>
              <p style="margin: 0; color: #6B7280; font-size: 12px; font-weight: 500;">
                You're receiving this because you have an account at tandemdaily.com
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
 * Generate plain text version of the email blast
 * @param {Object} params
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Plain text body
 * @returns {string} Plain text email
 */
export function generateEmailBlastText({ subject, body }) {
  return `
${subject}
${'='.repeat(subject.length)}

${body}

---
Tandem Daily Games
You're receiving this because you have an account at tandemdaily.com
  `.trim();
}

export { escapeHtml, CATEGORY_COLORS, bodyToHtml };
