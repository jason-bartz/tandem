import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * Get subscription status for authenticated user
 *
 * @route GET /api/subscription/status
 * @returns {Object} Subscription status object
 *
 * Response format:
 * {
 *   isActive: boolean,
 *   tier: string | null, // 'buddypass', 'bestfriends', 'soulmates'
 *   expiryDate: string | null, // ISO date string
 *   cancelAtPeriodEnd: boolean
 * }
 */
export async function GET(request) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuth(request);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized', isActive: false }, { status: 401 });
    }

    // Get subscription from database
    const supabase = createServerClient();

    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for users without subscription)
      logger.error('Subscription query error', dbError);
      return NextResponse.json({ error: 'Database error', isActive: false }, { status: 500 });
    }

    // Check if subscription is valid
    const isActive = subscription && subscription.status === 'active';
    const isExpired =
      subscription && subscription.current_period_end
        ? new Date(subscription.current_period_end) < new Date()
        : false;

    return NextResponse.json({
      isActive: isActive && !isExpired,
      tier: subscription?.tier || null,
      expiryDate: subscription?.current_period_end || null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    });
  } catch (error) {
    logger.error('Subscription status API error', error);
    return NextResponse.json({ error: 'Internal server error', isActive: false }, { status: 500 });
  }
}
