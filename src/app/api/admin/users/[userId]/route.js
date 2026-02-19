'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sanitizeErrorMessage } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { userId } = await params;

    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch all data in parallel
    const [
      authResult2,
      userResult,
      subscriptionResult,
      tandemResult,
      miniResult,
      reelResult,
      alchemyResult,
      achievementsResult,
    ] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('mini_user_stats').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('reel_user_stats').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('element_soup_user_stats').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId),
    ]);

    const authUser = authResult2?.data?.user;
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userData = userResult?.data;
    const subscription = subscriptionResult?.data;
    const tandemStats = tandemResult?.data;
    const miniStats = miniResult?.data;
    const reelStats = reelResult?.data;
    const alchemyStats = alchemyResult?.data;
    const achievements = achievementsResult?.data || [];

    // Determine auth provider
    const identities = authUser.identities || [];
    const provider =
      identities.length > 0
        ? identities[0].provider
        : authUser.is_anonymous
          ? 'anonymous'
          : 'email';

    return NextResponse.json({
      success: true,
      user: {
        // Profile
        id: authUser.id,
        email: authUser.email || userData?.email || null,
        username: userData?.username || null,
        avatarId: userData?.selected_avatar_id || null,
        countryCode: userData?.country_code || null,
        countryFlag: userData?.country_flag || null,

        // Auth
        isAnonymous: authUser.is_anonymous || false,
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at || null,
        provider,

        // Subscription
        subscription: subscription
          ? {
              status: subscription.status,
              tier: subscription.tier || null,
              currentPeriodEnd: subscription.current_period_end || null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              stripeCustomerId: subscription.stripe_customer_id || null,
            }
          : null,

        // Game Stats
        stats: {
          tandem: tandemStats
            ? {
                played: tandemStats.played || 0,
                wins: tandemStats.wins || 0,
                currentStreak: tandemStats.current_streak || 0,
                bestStreak: tandemStats.best_streak || 0,
                lastStreakDate: tandemStats.last_streak_date || null,
              }
            : null,
          mini: miniStats
            ? {
                totalCompleted: miniStats.total_completed || 0,
                currentStreak: miniStats.current_streak || 0,
                longestStreak: miniStats.longest_streak || 0,
                averageTime: miniStats.average_time || 0,
                bestTime: miniStats.best_time || 0,
                perfectSolves: miniStats.perfect_solves || 0,
              }
            : null,
          reel: reelStats
            ? {
                gamesPlayed: reelStats.games_played || 0,
                gamesWon: reelStats.games_won || 0,
                currentStreak: reelStats.current_streak || 0,
                bestStreak: reelStats.best_streak || 0,
              }
            : null,
          alchemy: alchemyStats
            ? {
                totalPlayed: alchemyStats.total_puzzles_played || 0,
                totalSolved: alchemyStats.total_puzzles_solved || 0,
                currentStreak: alchemyStats.current_streak || 0,
                bestStreak: alchemyStats.best_streak || 0,
              }
            : null,
        },

        // Achievements
        achievements: {
          count: achievements.length,
          items: achievements.map((a) => ({
            id: a.achievement_id,
            unlockedAt: a.unlocked_at,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/users/[userId] error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
