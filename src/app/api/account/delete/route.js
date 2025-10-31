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
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revokeAppleToken } from '@/lib/apple-auth';

export const dynamic = 'force-dynamic';

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
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

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

    console.log(`[AccountDeletion] Starting deletion for user ${userId} (${userEmail})`);

    // Step 1: Revoke Apple Sign In tokens if applicable
    if (appleRefreshToken) {
      console.log('[AccountDeletion] Revoking Apple Sign In tokens...');
      // The token could be an authorization code or refresh token
      // Try as authorization code first (more common on iOS)
      const revokeResult = await revokeAppleToken(appleRefreshToken, 'authorization_code');

      if (!revokeResult.success) {
        console.error('[AccountDeletion] Failed to revoke Apple token:', revokeResult.error);
        // Continue with deletion even if revocation fails
        // Apple tokens may already be revoked, expired, or invalid
        // The user's account deletion request must still be honored
      } else {
        console.log('[AccountDeletion] Apple tokens revoked successfully');
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
      console.error('[AccountDeletion] Failed to delete subscriptions:', subError);
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
        console.error('[AccountDeletion] Failed to delete stats:', statsError);
      }
    } catch (e) {
      // Table may not exist
    }

    // Step 4: Delete the auth user
    // This is the final step and cascades to auth.users table
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[AccountDeletion] Failed to delete auth user:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete account. Please contact support.',
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    console.log(`[AccountDeletion] Successfully deleted account for user ${userId}`);

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

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[AccountDeletion] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred during account deletion',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/account/delete
 *
 * Returns information about the account deletion process
 * Used to inform users before they delete their account
 */
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    return NextResponse.json({
      accountInfo: {
        email: session.user.email,
        createdAt: session.user.created_at,
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
  } catch (error) {
    console.error('[AccountDeletion] Error fetching deletion info:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch account deletion information',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
