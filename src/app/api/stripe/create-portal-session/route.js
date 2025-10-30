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

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (error || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
