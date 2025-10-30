import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/verify';
import { getStripe } from '@/lib/stripe/config';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * Create Stripe Customer Portal Session
 *
 * This endpoint creates a Stripe Customer Portal session where users can:
 * - View subscription details
 * - Update payment method
 * - Cancel subscription
 * - View invoices and billing history
 *
 * @route POST /api/stripe/create-portal-session
 * @returns {Object} { url: string } - Stripe portal URL
 *
 * Flow:
 * 1. User clicks "Manage Subscription" in app
 * 2. App calls this endpoint
 * 3. This creates Stripe portal session
 * 4. User redirected to Stripe portal
 * 5. User can manage subscription
 * 6. User redirected back to app
 */
export async function POST(request) {
  try {
    // Require authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Get user's Stripe customer ID from subscription
    const supabase = createServerClient();

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'past_due', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Database query failed', error);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    // Get the most recent subscription with a valid Stripe customer ID
    const subscription = subscriptions?.find((sub) => sub.stripe_customer_id);

    if (!subscription?.stripe_customer_id) {
      logger.warn('No stripe customer ID found', { userId: user.id });
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Create portal session
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/account`,
    });

    logger.info('Portal session created', {
      userId: user.id,
      customerId: subscription.stripe_customer_id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error('Portal session creation failed', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
