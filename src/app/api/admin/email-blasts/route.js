import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { sendEmail } from '@/lib/email/emailService';
import { generateEmailBlastHtml } from '@/lib/email/templates/emailBlast';
import logger from '@/lib/logger';

const CATEGORIES = ['general', 'update', 'promotion', 'announcement', 'maintenance'];
const RECIPIENT_TYPES = ['all', 'manual', 'import'];
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;
const FROM_EMAIL = 'Tandem Daily <notifications@goodvibesgames.com>';

// Resend allows up to 100 recipients per API call
const BATCH_SIZE = 50;

/**
 * GET - List email blast history with optional filters
 */
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const supabase = createServerClient();
    let query = supabase
      .from('email_blasts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    // Get counts by status
    const [draftCount, scheduledCount, sentCount, failedCount] = await Promise.all([
      supabase
        .from('email_blasts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabase
        .from('email_blasts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled'),
      supabase
        .from('email_blasts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent'),
      supabase
        .from('email_blasts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
    ]);

    return NextResponse.json({
      success: true,
      blasts: data,
      total: count,
      counts: {
        draft: draftCount.count || 0,
        scheduled: scheduledCount.count || 0,
        sent: sentCount.count || 0,
        failed: failedCount.count || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching email blasts', error);
    return NextResponse.json({ error: 'Failed to fetch email blasts' }, { status: 500 });
  }
}

/**
 * Fetch all user emails from the database
 */
async function getAllUserEmails(supabase) {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .not('email', 'is', null)
    .neq('email', '');

  if (error) throw error;

  return [...new Set(data.map((u) => u.email).filter(Boolean))];
}

/**
 * Send emails in batches
 */
async function sendInBatches(recipients, subject, html) {
  const results = { sent: 0, failed: 0, errors: [] };

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Send individually to avoid exposing recipient lists (BCC behavior)
    const batchResults = await Promise.allSettled(
      batch.map((email) =>
        sendEmail({
          from: FROM_EMAIL,
          to: email,
          subject,
          html,
          metadata: { type: 'email_blast' },
        })
      )
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        results.sent++;
      } else {
        results.failed++;
        const errMsg = result.status === 'rejected' ? result.reason?.message : result.value?.error;
        if (errMsg && results.errors.length < 10) {
          results.errors.push(errMsg);
        }
      }
    }
  }

  return results;
}

/**
 * POST - Create and optionally send/schedule an email blast
 *
 * Body: { subject, body, category, tags, recipientType, recipientList, action, scheduledAt }
 * action: 'draft' | 'send' | 'schedule'
 */
export async function POST(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const {
      subject,
      body,
      category = 'general',
      tags = [],
      recipientType = 'all',
      recipientList = [],
      action = 'draft',
      scheduledAt,
    } = await request.json();

    // Validation
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json(
        { error: `Subject must be under ${MAX_SUBJECT_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `Body must be under ${MAX_BODY_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!RECIPIENT_TYPES.includes(recipientType)) {
      return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 });
    }
    if (recipientType !== 'all' && (!Array.isArray(recipientList) || recipientList.length === 0)) {
      return NextResponse.json(
        { error: 'Recipient list is required for manual/import type' },
        { status: 400 }
      );
    }
    if (action === 'schedule' && !scheduledAt) {
      return NextResponse.json(
        { error: 'Scheduled time is required for scheduling' },
        { status: 400 }
      );
    }
    if (action === 'schedule') {
      const schedDate = new Date(scheduledAt);
      if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }
    }

    // Generate HTML
    const html = generateEmailBlastHtml({ subject: subject.trim(), body: body.trim(), category });

    const supabase = createServerClient();

    // Determine recipients
    let recipients = [];
    if (recipientType === 'all') {
      recipients = await getAllUserEmails(supabase);
    } else {
      recipients = [
        ...new Set(recipientList.filter((e) => e && typeof e === 'string' && e.includes('@'))),
      ];
    }

    if (action !== 'draft' && recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // Determine status
    let status = 'draft';
    if (action === 'send') status = 'sending';
    if (action === 'schedule') status = 'scheduled';

    // Save to database
    const { data: blast, error: insertError } = await supabase
      .from('email_blasts')
      .insert({
        subject: subject.trim(),
        body: body.trim(),
        html,
        category,
        tags,
        recipient_type: recipientType,
        recipient_list: recipientType !== 'all' ? recipients : [],
        recipient_count: recipients.length,
        status,
        scheduled_at: action === 'schedule' ? scheduledAt : null,
        sent_by: authResult.admin.username,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If sending immediately, send now
    if (action === 'send') {
      const results = await sendInBatches(recipients, subject.trim(), html);

      const finalStatus = results.failed === recipients.length ? 'failed' : 'sent';
      const errorMessage = results.errors.length > 0 ? results.errors.join('; ') : null;

      await supabase
        .from('email_blasts')
        .update({
          status: finalStatus,
          sent_at: new Date().toISOString(),
          recipient_count: results.sent,
          error_message: errorMessage,
        })
        .eq('id', blast.id);

      return NextResponse.json({
        success: true,
        blast: { ...blast, status: finalStatus, sent_at: new Date().toISOString() },
        results: {
          sent: results.sent,
          failed: results.failed,
          total: recipients.length,
        },
      });
    }

    return NextResponse.json({ success: true, blast });
  } catch (error) {
    logger.error('Error creating email blast', error);
    return NextResponse.json({ error: 'Failed to create email blast' }, { status: 500 });
  }
}

/**
 * PUT - Update a draft or reschedule a blast
 */
export async function PUT(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { id, subject, body, category, tags, recipientType, recipientList, action, scheduledAt } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Blast ID is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch existing blast
    const { data: existing, error: fetchError } = await supabase
      .from('email_blasts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Email blast not found' }, { status: 404 });
    }

    if (existing.status === 'sent' || existing.status === 'sending') {
      return NextResponse.json({ error: 'Cannot edit a sent or sending blast' }, { status: 400 });
    }

    // Build update object
    const updates = {};
    if (subject !== undefined) updates.subject = subject.trim();
    if (body !== undefined) updates.body = body.trim();
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (recipientType !== undefined) updates.recipient_type = recipientType;
    if (recipientList !== undefined) updates.recipient_list = recipientList;

    // Regenerate HTML if content changed
    if (subject !== undefined || body !== undefined || category !== undefined) {
      updates.html = generateEmailBlastHtml({
        subject: (subject || existing.subject).trim(),
        body: (body || existing.body).trim(),
        category: category || existing.category,
      });
    }

    // Handle action changes
    if (action === 'send') {
      let recipients = [];
      const rType = recipientType || existing.recipient_type;
      if (rType === 'all') {
        recipients = await getAllUserEmails(supabase);
      } else {
        recipients = [
          ...new Set(
            (recipientList || existing.recipient_list).filter((e) => e && e.includes('@'))
          ),
        ];
      }

      if (recipients.length === 0) {
        return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
      }

      updates.status = 'sending';
      await supabase.from('email_blasts').update(updates).eq('id', id);

      const finalHtml = updates.html || existing.html;
      const finalSubject = updates.subject || existing.subject;
      const results = await sendInBatches(recipients, finalSubject, finalHtml);

      const finalStatus = results.failed === recipients.length ? 'failed' : 'sent';

      await supabase
        .from('email_blasts')
        .update({
          status: finalStatus,
          sent_at: new Date().toISOString(),
          recipient_count: results.sent,
          sent_by: authResult.admin.username,
          error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        results: { sent: results.sent, failed: results.failed, total: recipients.length },
      });
    }

    if (action === 'schedule') {
      if (!scheduledAt) {
        return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
      }
      updates.status = 'scheduled';
      updates.scheduled_at = scheduledAt;
    }

    const { data, error: updateError } = await supabase
      .from('email_blasts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, blast: data });
  } catch (error) {
    logger.error('Error updating email blast', error);
    return NextResponse.json({ error: 'Failed to update email blast' }, { status: 500 });
  }
}

/**
 * DELETE - Delete a draft or scheduled blast
 */
export async function DELETE(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Blast ID is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: existing } = await supabase
      .from('email_blasts')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Email blast not found' }, { status: 404 });
    }

    if (existing.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete a blast that is currently sending' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('email_blasts').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting email blast', error);
    return NextResponse.json({ error: 'Failed to delete email blast' }, { status: 500 });
  }
}
