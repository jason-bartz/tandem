import { createServerClient } from '@/lib/supabase/server';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import logger from '@/lib/logger';

/**
 * Generate the HTML page for unsubscribe confirmation/result.
 * Uses inline styles (no Tailwind) since this is a standalone page
 * served from the API route.
 */
function renderPage({ title, message, showForm = false, email = '', token = '' }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Tandem Daily Games</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="max-width: 480px; width: 100%; margin: 40px 20px; background: #FFFFFF; border-radius: 8px; overflow: hidden; text-align: center;">
    <div style="background-color: #a855f7; padding: 24px 32px;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
        ${title}
      </h1>
      <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">
        Tandem Daily Games
      </p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${message}
      </p>
      ${
        showForm
          ? `
        <form method="POST" action="/api/email/unsubscribe">
          <input type="hidden" name="email" value="${email}">
          <input type="hidden" name="token" value="${token}">
          <button type="submit" style="display: inline-block; padding: 14px 28px; background-color: #EF4444; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 16px; cursor: pointer;">
            Unsubscribe
          </button>
        </form>
        <p style="color: #9CA3AF; font-size: 13px; margin: 16px 0 0 0;">
          You can always re-subscribe by creating a new account.
        </p>`
          : ''
      }
    </div>
    <div style="background-color: #F3F4F6; padding: 16px 32px;">
      <p style="margin: 0; font-size: 13px;">
        <a href="https://tandemdaily.com" style="color: #3B82F6; text-decoration: none; font-weight: 600;">Tandem Daily Games</a>
        &nbsp;&middot;&nbsp;
        <a href="https://dailyalchemy.fun" style="color: #3B82F6; text-decoration: none; font-weight: 600;">Daily Alchemy</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * GET - Render unsubscribe confirmation page
 * Public endpoint — no auth required
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  if (!email || !token) {
    return new Response(
      renderPage({
        title: 'Invalid Link',
        message:
          'This unsubscribe link is invalid or has expired. Please use the link from your email.',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return new Response(
      renderPage({
        title: 'Invalid Link',
        message:
          'This unsubscribe link could not be verified. Please use the link directly from your email.',
      }),
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Check if already unsubscribed
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle();

  if (existing) {
    return new Response(
      renderPage({
        title: 'Already Unsubscribed',
        message: `<strong>${email}</strong> is already unsubscribed from our emails.`,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  return new Response(
    renderPage({
      title: 'Unsubscribe',
      message: `Are you sure you want to unsubscribe <strong>${email}</strong> from Tandem Daily Games emails?`,
      showForm: true,
      email,
      token,
    }),
    { headers: { 'Content-Type': 'text/html' } }
  );
}

/**
 * POST - Process the unsubscribe
 * Accepts both JSON and form-encoded data
 */
export async function POST(request) {
  try {
    let email, token;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      email = formData.get('email');
      token = formData.get('token');
    } else {
      const body = await request.json();
      email = body.email;
      token = body.token;
    }

    if (!email || !token) {
      return new Response(
        renderPage({
          title: 'Invalid Request',
          message: 'Missing required parameters.',
        }),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!verifyUnsubscribeToken(email, token)) {
      return new Response(
        renderPage({
          title: 'Invalid Link',
          message: 'This unsubscribe link could not be verified.',
        }),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabase = createServerClient();

    // Upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('email_unsubscribes')
      .upsert(
        { email: email.toLowerCase().trim(), source: 'link' },
        { onConflict: 'email', ignoreDuplicates: true }
      );

    if (error) {
      logger.error('Error processing unsubscribe', error);
      return new Response(
        renderPage({
          title: 'Something Went Wrong',
          message: "We couldn't process your request. Please try again later.",
        }),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    logger.info('[Unsubscribe] Email unsubscribed', { email: email.toLowerCase().trim() });

    return new Response(
      renderPage({
        title: 'Unsubscribed',
        message: `<strong>${email}</strong> has been unsubscribed. You will no longer receive email blasts from us.`,
      }),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    logger.error('Error in unsubscribe POST', error);
    return new Response(
      renderPage({
        title: 'Something Went Wrong',
        message: "We couldn't process your request. Please try again later.",
      }),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
