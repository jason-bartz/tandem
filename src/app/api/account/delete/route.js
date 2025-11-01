/**
 * Account Deletion API Endpoint
 *
 * Complies with Apple App Store Review Guideline 5.1.1(v):
 * "Apps that support account creation must also offer account deletion within the app"
 *
 * This endpoint handles:
 * 1. User authentication verification
 * 2. Apple Sign In token revocation (if applicable)
 * 3. Supabase account deletion
 * 4. Local data cleanup instructions
 * 5. Subscription status notification
 *
 * Note: Actual subscription cancellation must be done by user through
 * App Store (iOS) or Stripe portal (web)
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAuth } from '@/lib/auth/verify';
import { revokeAppleToken } from '@/lib/apple-auth';
import logger from '@/lib/logger';

/**
 * DELETE /api/account/delete
 *
 * Deletes the authenticated user's account and associated data
 *
 * Required headers:
 * - Authorization: Bearer <access_token>
 *
 * Optional body:
 * - appleRefreshToken: string (for Apple Sign In users)
 * - confirmationText: string (must be "DELETE")
 *
 * Returns:
 * - 200: Account deleted successfully
 * - 400: Invalid request or missing confirmation
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function DELETE(request) {
  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(request);

    if (authError || !user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Add CORS headers for Capacitor app
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }

    const userId = user.id;
    const userEmail = user.email;

    // Get Supabase client with service role for admin operations
    const supabase = createServerClient();

    // Parse request body
    let appleRefreshToken = null;
    let confirmationText = null;

    try {
      const body = await request.json();
      appleRefreshToken = body.appleRefreshToken;
      confirmationText = body.confirmationText;
    } catch (e) {
      // Body is optional for iOS native
    }

    // Require confirmation for web users
    const userAgent = request.headers.get('user-agent') || '';
    const isWeb = !userAgent.includes('Capacitor');

    if (isWeb && confirmationText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm account deletion' },
        { status: 400 }
      );
    }

    logger.info('[AccountDeletion] Starting deletion', { userId, userEmail });

    // Step 1: Revoke Apple Sign In tokens if applicable
    if (appleRefreshToken) {
      logger.info('[AccountDeletion] Revoking Apple Sign In tokens');
      // The token could be an authorization code or refresh token
      // Try as authorization code first (more common on iOS)
      const revokeResult = await revokeAppleToken(appleRefreshToken, 'authorization_code');

      if (!revokeResult.success) {
        logger.error('[AccountDeletion] Failed to revoke Apple token', {
          error: revokeResult.error,
        });
        // Continue with deletion even if revocation fails
        // Apple tokens may already be revoked, expired, or invalid
        // The user's account deletion request must still be honored
      } else {
        logger.info('[AccountDeletion] Apple tokens revoked successfully');
      }
    }

    // Step 2: Check for active subscriptions and warn user
    // Note: We don't cancel subscriptions - user must do this manually
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    const hasActiveSubscription = !!subscriptions;

    // Step 3: Delete user data from custom tables
    // Delete in order of dependencies to avoid foreign key violations

    // Delete subscription records
    const { error: subError } = await supabase.from('subscriptions').delete().eq('user_id', userId);

    if (subError) {
      logger.error('[AccountDeletion] Failed to delete subscriptions', { error: subError });
    }

    // Delete game statistics (if you have a stats table)
    // Note: This is optional - you may want to keep anonymized stats for analytics
    try {
      const { error: statsError } = await supabase
        .from('user_stats')
        .delete()
        .eq('user_id', userId);

      if (statsError && statsError.code !== '42P01') {
        // Ignore "table doesn't exist" error
        logger.error('[AccountDeletion] Failed to delete stats', { error: statsError });
      }
    } catch (e) {
      // Table may not exist
      logger.warn('[AccountDeletion] Stats table may not exist', { error: e.message });
    }

    // Step 4: Delete the auth user
    // This is the final step and cascades to auth.users table
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error('[AccountDeletion] Failed to delete auth user', { error: deleteError });
      return NextResponse.json(
        {
          error: 'Failed to delete account. Please contact support.',
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    logger.info('[AccountDeletion] Successfully deleted account', { userId });

    // Prepare response with important information
    const response = {
      success: true,
      message: 'Your account has been successfully deleted',
      deletedAt: new Date().toISOString(),
      dataRetention: {
        authAccount: 'Deleted immediately',
        subscriptionRecords:
          'Deleted (billing history retained for 7 years per legal requirements)',
        gameStats: 'Deleted or anonymized',
        localData: 'Please clear app data or browser cache manually',
      },
    };

    // Add subscription warning if applicable
    if (hasActiveSubscription) {
      response.subscription = {
        warning: 'You have an active subscription',
        action: 'Your subscription will continue to bill until you cancel it separately',
        iOS: 'Cancel via App Store > Subscriptions',
        web: 'Cancel via Stripe billing portal',
      };
    }

    const successResponse = NextResponse.json(response, { status: 200 });
    // Add CORS headers for Capacitor app
    successResponse.headers.set('Access-Control-Allow-Origin', '*');
    successResponse.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    successResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return successResponse;
  } catch (error) {
    logger.error('[AccountDeletion] Unexpected error', { error });
    const errorResponse = NextResponse.json(
      {
        error: 'An unexpected error occurred during account deletion',
        details: error.message,
      },
      { status: 500 }
    );
    // Add CORS headers for Capacitor app
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return errorResponse;
  }
}

/**
 * OPTIONS /api/account/delete
 *
 * Handles CORS preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
}

/**
 * GET /api/account/delete
 *
 * Returns information about the account deletion process
 * Used to inform users before they delete their account
 */
export async function GET(request) {
  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(request);

    if (authError || !user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }

    // Get Supabase client
    const supabase = createServerClient();

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const response = NextResponse.json({
      accountInfo: {
        email: user.email,
        createdAt: user.created_at,
        hasActiveSubscription: !!subscription,
      },
      deletionInfo: {
        whatWillBeDeleted: [
          'Your account credentials and authentication data',
          'Your game statistics and progress',
          'Your subscription records (billing history retained for legal compliance)',
          'Your user preferences and settings',
        ],
        whatWillNotBeDeleted: [
          'Active subscriptions (must be cancelled separately)',
          'Billing history (retained for 7 years per legal requirements)',
          'Anonymized analytics data',
        ],
        timeline: 'Immediate deletion upon confirmation',
        irreversible: true,
      },
      subscriptionInfo: subscription
        ? {
            platform: subscription.platform,
            status: subscription.status,
            expiryDate: subscription.expiry_date,
            cancelInstructions:
              subscription.platform === 'ios'
                ? 'Cancel via iPhone Settings > Your Name > Subscriptions'
                : 'Cancel via Stripe billing portal (link in Account page)',
          }
        : null,
    });
    // Add CORS headers for Capacitor app
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    logger.error('[AccountDeletion] Error fetching deletion info', { error });
    const errorResponse = NextResponse.json(
      {
        error: 'Failed to fetch account deletion information',
        details: error.message,
      },
      { status: 500 }
    );
    // Add CORS headers for Capacitor app
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return errorResponse;
  }
}
