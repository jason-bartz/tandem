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

export default function EmailPreview({ subject, body, category = 'general' }) {
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

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
        <div style="max-width: 100%; background-color: #F3F4F6; border-radius: 8px; overflow: hidden;">
          <div style="background-color: ${headerColor}; padding: 20px 24px; text-align: center;">
            <h1 style="margin: 0; color: #111827; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
              ${safeSubject}
            </h1>
            <p style="margin: 6px 0 0 0; color: #111827; font-size: 12px; font-weight: 600;">
              Tandem Daily Games
            </p>
          </div>
          <div style="padding: 24px;">
            ${bodyHtml}
          </div>
          <div style="background-color: #F3F4F6; padding: 16px 24px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #111827; font-size: 11px; font-weight: 700;">
              Tandem Daily Games
            </p>
            <p style="margin: 0; color: #6B7280; font-size: 10px; font-weight: 500;">
              You&apos;re receiving this because you have an account at tandemdaily.com
            </p>
          </div>
        </div>
      </div>
    `;
  }, [subject, body, category]);

  return (
    <div
      className="rounded-lg overflow-hidden bg-ghost-white"
      style={{ maxHeight: '700px', overflowY: 'auto' }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
