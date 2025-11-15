import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * Link IAP Receipt to User Account
 *
 * This endpoint links an Apple In-App Purchase receipt to a Supabase user account.
 * Used when:
 * 1. User purchases subscription anonymously on iOS
 * 2. User later signs in with Apple/email
 * 3. We need to link their existing IAP subscription to their account
 *
 * @route POST /api/iap/link-to-user
 *
 * @body {
 *   originalTransactionId: string - Apple's unique transaction identifier
 *   productId: string - Product ID purchased (e.g., com.tandemdaily.app.buddypass)
 *   expiryDate: string - ISO string of subscription expiry
 * }
 *
 * @returns {
 *   success: boolean
 *   subscription: object - The linked subscription record
 * }
 */
export async function POST(request) {
  const supabase = createServerClient();

  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const { originalTransactionId, productId, expiryDate } = await request.json();

    if (!originalTransactionId || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields: originalTransactionId, productId' },
        { status: 400 }
      );
    }

    // Validate product ID format
    const validProductIds = [
      'com.tandemdaily.app.buddypass',
      'com.tandemdaily.app.bestfriends',
      'com.tandemdaily.app.soulmates',
    ];

    if (!validProductIds.includes(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Convert product ID to tier
    let tier = 'buddypass';
    if (productId === 'com.tandemdaily.app.bestfriends') {
      tier = 'bestfriends';
    } else if (productId === 'com.tandemdaily.app.soulmates') {
      tier = 'soulmates';
    }

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id, tier')
      .eq('apple_original_transaction_id', originalTransactionId)
      .single();

    if (existingSubscription && existingSubscription.user_id !== user.id) {
      logger.warn('Transaction already linked to different user', {
        originalTransactionId,
        existingUserId: existingSubscription.user_id,
        requestingUserId: user.id,
      });

      return NextResponse.json(
        {
          error: 'This purchase is already linked to another account',
          existingTier: existingSubscription.tier,
        },
        { status: 409 }
      );
    }

    let calculatedExpiryDate = expiryDate;
    if (!calculatedExpiryDate) {
      const now = new Date();
      if (productId === 'com.tandemdaily.app.soulmates') {
        // Lifetime - set expiry far in future
        calculatedExpiryDate = new Date('2099-12-31').toISOString();
      } else if (productId === 'com.tandemdaily.app.bestfriends') {
        // Yearly
        now.setFullYear(now.getFullYear() + 1);
        calculatedExpiryDate = now.toISOString();
      } else {
        // Monthly
        now.setMonth(now.getMonth() + 1);
        calculatedExpiryDate = now.toISOString();
      }
    }

    // Link or create subscription record
    const { data: subscription, error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          apple_original_transaction_id: originalTransactionId,
          tier,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: calculatedExpiryDate,
          cancel_at_period_end: false,
        },
        {
          onConflict: 'user_id', // Update if user already has a subscription
        }
      )
      .select()
      .single();

    if (upsertError) {
      logger.error('Failed to link IAP to user', {
        error: upsertError,
        userId: user.id,
        originalTransactionId,
      });

      return NextResponse.json(
        { error: 'Failed to link subscription to account' },
        { status: 500 }
      );
    }

    // Log to subscription history
    await supabase.from('subscription_history').insert({
      user_id: user.id,
      action: 'iap_linked',
      new_status: 'active',
      metadata: {
        originalTransactionId,
        productId,
        tier,
        source: 'ios_iap',
      },
    });

    logger.info('IAP linked to user account', {
      userId: user.id,
      originalTransactionId,
      tier,
    });

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    logger.error('IAP link endpoint error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get linked subscription status
 *
 * @route GET /api/iap/link-to-user
 *
 * @returns {
 *   linked: boolean
 *   subscription: object | null
 * }
 */
export async function GET() {
  const supabase = createServerClient();

  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's subscription with Apple IAP link
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .not('apple_original_transaction_id', 'is', null)
      .single();

    return NextResponse.json({
      linked: !!subscription,
      subscription: subscription || null,
    });
  } catch (error) {
    logger.error('IAP link status endpoint error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
