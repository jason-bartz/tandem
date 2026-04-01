import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/emailService';
import logger from '@/lib/logger';

const BATCH_SIZE = 50;
const FROM_EMAIL = 'Tandem Daily <notifications@goodvibesgames.com>';

/**
 * Vercel Cron endpoint for sending scheduled email blasts
 * Should run every 5-10 minutes to check for due emails
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isDevelopment && !isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Find scheduled blasts that are due
    const { data: dueBlasts, error: fetchError } = await supabase
      .from('email_blasts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (fetchError) throw fetchError;

    if (!dueBlasts || dueBlasts.length === 0) {
      return NextResponse.json({ success: true, message: 'No scheduled emails due', processed: 0 });
    }

    const results = [];

    for (const blast of dueBlasts) {
      // Mark as sending
      await supabase.from('email_blasts').update({ status: 'sending' }).eq('id', blast.id);

      // Get recipients
      let recipients = [];
      if (blast.recipient_type === 'all') {
        const { data } = await supabase
          .from('users')
          .select('email')
          .not('email', 'is', null)
          .neq('email', '');
        recipients = [...new Set((data || []).map((u) => u.email).filter(Boolean))];
      } else {
        recipients = blast.recipient_list || [];
      }

      if (recipients.length === 0) {
        await supabase
          .from('email_blasts')
          .update({ status: 'failed', error_message: 'No valid recipients' })
          .eq('id', blast.id);
        results.push({ id: blast.id, status: 'failed', reason: 'no recipients' });
        continue;
      }

      // Send in batches
      let sent = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map((email) =>
            sendEmail({
              from: FROM_EMAIL,
              to: email,
              subject: blast.subject,
              html: blast.html,
              metadata: { type: 'email_blast', blastId: blast.id },
            })
          )
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            sent++;
          } else {
            failed++;
            const errMsg =
              result.status === 'rejected' ? result.reason?.message : result.value?.error;
            if (errMsg && errors.length < 10) errors.push(errMsg);
          }
        }
      }

      const finalStatus = failed === recipients.length ? 'failed' : 'sent';

      await supabase
        .from('email_blasts')
        .update({
          status: finalStatus,
          sent_at: new Date().toISOString(),
          recipient_count: sent,
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', blast.id);

      results.push({ id: blast.id, status: finalStatus, sent, failed });
      logger.info(`[Cron Email] Blast ${blast.id} ${finalStatus}: ${sent} sent, ${failed} failed`);
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    logger.error('[Cron Email] Error processing scheduled emails', error);
    return NextResponse.json({ error: 'Failed to process scheduled emails' }, { status: 500 });
  }
}
