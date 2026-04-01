'use client';

import { useMemo } from 'react';

const CATEGORY_COLORS = {
  general: '#a855f7',
  update: '#38b6ff',
  promotion: '#7ed957',
  announcement: '#ffce00',
  maintenance: '#ff5757',
};

function escapeHtml(text) {
  if (!text) return '';
  const str = String(text);
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

export default function EmailPreview({
  subject,
  body,
  category = 'general',
  buttonText,
  buttonUrl,
}) {
  const html = useMemo(() => {
    const safeSubject = escapeHtml(subject || 'Your subject line here...');
    const headerColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.general;

    const bodyHtml = body
      ? escapeHtml(body)
          .split('\n\n')
          .map(
            (p) =>
              `<p style="margin: 0 0 16px 0; color: #111827; font-size: 13px; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`
          )
          .join('')
      : '<p style="margin: 0; color: #9CA3AF; font-size: 13px; font-style: italic;">Start typing to see your email here...</p>';

    const buttonHtml =
      buttonText && buttonUrl
        ? `
          <div style="text-align: center; padding: 0 24px 24px 24px;">
            <a href="${escapeHtml(buttonUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px;">
              ${escapeHtml(buttonText)}
            </a>
          </div>`
        : '';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
        <div style="max-width: 100%; background-color: #FFFFFF; border-radius: 8px; overflow: hidden;">
          <div style="background-color: ${headerColor}; padding: 20px 24px; text-align: center;">
            <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
              ${safeSubject}
            </h1>
            <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600;">
              Tandem Daily Games
            </p>
          </div>
          <div style="padding: 24px;">
            ${bodyHtml}
          </div>
          ${buttonHtml}
          <div style="background-color: #F3F4F6; padding: 16px 24px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 10px; font-weight: 500;">
              You&apos;re receiving this because you have an account on one of our games
            </p>
            <p style="margin: 0; font-size: 10px;">
              <a href="https://tandemdaily.com" style="color: #3B82F6; text-decoration: none; font-weight: 600;">Tandem Daily Games</a>
              &nbsp;&middot;&nbsp;
              <a href="https://dailyalchemy.fun" style="color: #3B82F6; text-decoration: none; font-weight: 600;">Daily Alchemy</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }, [subject, body, category, buttonText, buttonUrl]);

  return (
    <div
      className="rounded-lg overflow-hidden bg-ghost-white"
      style={{ maxHeight: '700px', overflowY: 'auto' }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
