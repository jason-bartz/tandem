import { notifyNewSignup } from '@/lib/discord';
import logger from '@/lib/logger';

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/new-signup
 *
 * Receives webhook from Supabase database trigger when a new user signs up.
 * Sends a notification to Discord.
 */
export async function POST(request) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        logger.warn('New signup webhook: invalid authorization');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { email, provider } = body;

    logger.info('New signup webhook received', { email, provider });

    await notifyNewSignup({
      email,
      provider: provider || 'email',
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('New signup webhook error', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
