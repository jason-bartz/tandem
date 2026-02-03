import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getStripe } from '@/lib/stripe/config';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import {
  notifyPaymentSuccess,
  notifyNewSubscription,
  notifySubscriptionCancelled,
  notifyPaymentFailed,
} from '@/lib/discord';

// Check if KV is available for idempotency tracking
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

// Idempotency window: 24 hours (Stripe may retry webhooks for up to 3 days)
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/**
 * Check if a webhook event has already been processed
 * Returns true if event was already processed (should be skipped)
 *
 * @param {string} eventId - Stripe event ID
 * @returns {Promise<boolean>} - true if already processed
 */
async function isEventProcessed(eventId) {
  if (!isKvAvailable) {
    // If KV is not available, allow processing (fail open)
    // This is safer than blocking all webhooks
    return false;
  }

  try {
    const key = `stripe_webhook:${eventId}`;
    const exists = await kv.get(key);
    return !!exists;
  } catch (error) {
    logger.error('Error checking webhook idempotency', error);
    // Fail open to avoid blocking legitimate webhooks
    return false;
  }
}

/**
 * Mark a webhook event as processed
 *
 * @param {string} eventId - Stripe event ID
 */
async function markEventProcessed(eventId) {
  if (!isKvAvailable) {
    return;
  }

  try {
    const key = `stripe_webhook:${eventId}`;
    await kv.set(key, { processedAt: Date.now() }, { ex: IDEMPOTENCY_TTL_SECONDS });
  } catch (error) {
    logger.error('Error marking webhook as processed', error);
    // Non-critical - event will process but may be vulnerable to replay
  }
}

/**
 * Stripe Webhook Handler
 *
 * This endpoint handles subscription lifecycle events from Stripe.
 * It is called by Stripe when events occur (payment success, subscription cancel, etc.)
 *
 * SECURITY: This endpoint verifies webhook signatures to ensure requests
 * come from Stripe and haven't been tampered with.
 *
 * @route POST /api/stripe/webhook
 *
 * Events handled:
 * - checkout.session.completed: Initial purchase completed
 * - customer.subscription.created: Subscription created
 * - customer.subscription.updated: Subscription updated (renewal, plan change)
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_succeeded: Payment succeeded
 * - invoice.payment_failed: Payment failed
 */
export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      logger.error('Webhook signature verification failed', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // SECURITY: Check idempotency to prevent duplicate processing
    // Stripe may retry webhooks, and network issues can cause duplicates
    if (await isEventProcessed(event.id)) {
      logger.info('Duplicate webhook event skipped', { eventId: event.id, type: event.type });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Mark event as processed BEFORE handling to prevent race conditions
    // If processing fails, the event won't be retried (Stripe will retry anyway)
    await markEventProcessed(event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session) {
  const supabase = createServerClient();
  const userId = session.metadata?.user_id || session.client_reference_id;
  const tier = session.metadata?.tier;

  if (!userId) {
    logger.error('Checkout completed but no user_id in metadata', { sessionId: session.id });
    return;
  }

  logger.info('Checkout completed', {
    userId,
    tier,
    sessionId: session.id,
    mode: session.mode,
  });

  // Get customer email for notifications
  let customerEmail = session.customer_email;
  if (!customerEmail && session.customer) {
    try {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(session.customer);
      if (!customer.deleted) {
        customerEmail = customer.email;
      }
    } catch (e) {
      logger.warn('Could not fetch customer email for notification', e);
    }
  }

  // For one-time payments (Lifetime Membership), create subscription record directly
  if (session.mode === 'payment') {
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: `payment_${session.id}`, // Not a real subscription ID
      tier: tier,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date('2099-12-31').toISOString(), // Lifetime
      cancel_at_period_end: false,
    });

    if (error) {
      logger.error('Failed to create lifetime subscription', error);
    } else {
      // Log to history
      await supabase.from('subscription_history').insert({
        user_id: userId,
        action: 'subscription_created',
        new_status: 'active',
        metadata: {
          tier,
          type: 'lifetime',
          session_id: session.id,
        },
      });

      // Send Discord notification for lifetime purchase
      await notifyNewSubscription({
        customerEmail,
        tier,
        type: 'Lifetime Purchase',
      });
    }
  } else if (session.mode === 'subscription') {
    // For subscriptions, create an active subscription record
    // The subscription will be created as active since payment succeeded
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription, // Subscription ID from checkout
      tier: tier,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now (default, will be updated by subscription event)
      cancel_at_period_end: false,
    });

    if (error) {
      logger.error('Failed to create subscription from checkout', error);
    } else {
      logger.info('Subscription created from checkout', { userId, tier, status: 'active' });

      // Send Discord notification for new subscription
      await notifyNewSubscription({
        customerEmail,
        tier,
        type: 'New Subscription',
      });
    }
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription) {
  const supabase = createServerClient();

  // Get user ID from subscription metadata or lookup by customer
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  let userId = existingSubscription?.user_id;
  let customerEmail = null;

  if (!userId) {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer);
    customerEmail = customer.email;

    if (customer.deleted) {
      logger.error('Customer deleted', { customerId: subscription.customer });
      return;
    }

    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers();

    if (error) {
      logger.error('Failed to list users', error);
      return;
    }

    const user = users.find((u) => u.email === customerEmail);
    userId = user?.id;
  }

  if (!userId) {
    logger.error('Cannot find user for subscription', {
      subscriptionId: subscription.id,
      customerEmail,
    });
    return;
  }

  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id;
  let tier = 'buddypass'; // default

  if (priceId === process.env.STRIPE_PRICE_BUDDY_MONTHLY) {
    tier = 'buddypass';
  } else if (priceId === process.env.STRIPE_PRICE_BESTFRIENDS_YEARLY) {
    tier = 'bestfriends';
  } else if (priceId === process.env.STRIPE_PRICE_SOULMATES_LIFETIME) {
    tier = 'soulmates';
  }

  // Validate required date fields
  if (!subscription.current_period_start || !subscription.current_period_end) {
    logger.error('Missing required date fields in subscription', {
      subscriptionId: subscription.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
    });
    return;
  }

  // Upsert subscription
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    tier: tier,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancelled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  });

  if (error) {
    logger.error('Failed to update subscription', error);
  } else {
    logger.info('Subscription updated', {
      userId,
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    // Log to history
    await supabase.from('subscription_history').insert({
      user_id: userId,
      action: 'subscription_updated',
      new_status: subscription.status,
      metadata: {
        tier,
        subscription_id: subscription.id,
      },
    });
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  const supabase = createServerClient();

  // Get subscription details before updating
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id, tier')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    logger.error('Failed to mark subscription as cancelled', error);
  } else {
    logger.info('Subscription cancelled', { subscriptionId: subscription.id });

    // Log to history
    if (existingSub) {
      await supabase.from('subscription_history').insert({
        user_id: existingSub.user_id,
        action: 'subscription_cancelled',
        new_status: 'cancelled',
        metadata: {
          subscription_id: subscription.id,
        },
      });

      // Get customer email for notification
      let customerEmail = null;
      try {
        const stripe = getStripe();
        const customer = await stripe.customers.retrieve(subscription.customer);
        if (!customer.deleted) {
          customerEmail = customer.email;
        }
      } catch (e) {
        logger.warn('Could not fetch customer email for cancellation notification', e);
      }

      // Send Discord notification
      await notifySubscriptionCancelled({
        customerEmail,
        tier: existingSub.tier,
      });
    }
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  const supabase = createServerClient();

  logger.info('Payment succeeded', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  if (invoice.subscription) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id, tier')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (sub) {
      await supabase.from('subscription_history').insert({
        user_id: sub.user_id,
        action: 'payment_succeeded',
        metadata: {
          invoice_id: invoice.id,
          amount: invoice.amount_paid,
        },
      });

      // Send Discord notification for payment (only for renewals, not initial)
      // Initial payments are handled by checkout.session.completed
      if (invoice.billing_reason === 'subscription_cycle') {
        await notifyPaymentSuccess({
          amount: invoice.amount_paid,
          currency: invoice.currency,
          customerEmail: invoice.customer_email,
          tier: sub.tier,
          type: 'Renewal',
        });
      }
    }
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const supabase = createServerClient();

  logger.error('Payment failed', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  // Log to history
  if (invoice.subscription) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (sub) {
      await supabase.from('subscription_history').insert({
        user_id: sub.user_id,
        action: 'payment_failed',
        metadata: {
          invoice_id: invoice.id,
          amount: invoice.amount_due,
        },
      });

      // Mark subscription as past_due
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription);

      // Send Discord notification for failed payment
      await notifyPaymentFailed({
        amount: invoice.amount_due,
        currency: invoice.currency,
        customerEmail: invoice.customer_email,
        reason: invoice.last_finalization_error?.message || 'Payment declined',
      });
    }
  }
}
