import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/verify';
import { getStripe, getPriceId, getCheckoutMode } from '@/lib/stripe/config';
import logger from '@/lib/logger';

/**
 * Create Stripe Checkout Session
 *
 * This endpoint creates a Stripe checkout session for a user to purchase a subscription.
 * The user will be redirected to Stripe's hosted checkout page.
 *
 * @route POST /api/stripe/create-checkout-session
 * @body { tier: 'buddypass' | 'bestfriends' | 'soulmates' }
 * @returns {Object} { url: string } - Stripe checkout URL
 *
 * Flow:
 * 1. User clicks "Subscribe" in app
 * 2. App calls this endpoint with tier
 * 3. This creates Stripe checkout session
 * 4. User redirected to Stripe checkout
 * 5. After payment, user redirected back to app
 * 6. Webhook processes payment and activates subscription
 */
export async function POST(request) {
  try {
    // Require authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse request body
    const body = await request.json();
    const { tier } = body;

    if (!tier) {
      return NextResponse.json({ error: 'Tier is required' }, { status: 400 });
    }

    // Validate tier and get price
    let priceId;
    try {
      priceId = getPriceId(tier);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create Stripe checkout session
    const stripe = getStripe();
    // Use VERCEL_URL for automatic deployment URL detection, fallback to NEXT_PUBLIC_APP_URL or localhost
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const session = await stripe.checkout.sessions.create({
      ...(user.email ? { customer_email: user.email } : {}),
      client_reference_id: user.id, // Link to our user ID
      mode: getCheckoutMode(tier),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/account?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/?cancelled=true`,
      metadata: {
        user_id: user.id,
        tier: tier,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax calculation
      billing_address_collection: 'auto',
    });

    logger.info('Checkout session created', {
      userId: user.id,
      tier,
      sessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error('Checkout session creation failed', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
