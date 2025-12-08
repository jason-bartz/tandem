import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth/verify';
import {
  puzzleSubmissionSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
} from '@/lib/security/validation';
import {
  checkUserSubscription,
  getUserDailySubmissionCount,
  createPuzzleSubmission,
} from '@/lib/db';
import { SUBMISSION_LIMITS } from '@/lib/constants';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Get user's username from the database
 */
async function getUserUsername(userId) {
  const supabase = createServerClient();

  const { data } = await supabase.from('users').select('username').eq('id', userId).single();

  return data?.username || null;
}

/**
 * Submit a new puzzle
 * @route POST /api/puzzles/submit
 *
 * Requires:
 * - Authentication
 * - Active Tandem Unlimited subscription
 * - Less than 2 submissions today
 */
export async function POST(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Verify authentication
    const { user, response } = await requireAuth(request);

    if (!user) {
      return response;
    }

    // Check subscription status
    const subscription = await checkUserSubscription(user.id);

    if (!subscription.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tandem Unlimited subscription required to submit puzzles',
        },
        { status: 403 }
      );
    }

    // Check daily submission limit
    const todayCount = await getUserDailySubmissionCount(user.id);

    if (todayCount >= SUBMISSION_LIMITS.MAX_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          error: `You can only submit ${SUBMISSION_LIMITS.MAX_PER_DAY} puzzles per day. Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    // Parse and validate the submission
    const { isAnonymous, groups } = await parseAndValidateJson(request, puzzleSubmissionSchema);

    // Get the user's username
    const username = await getUserUsername(user.id);

    // Determine display name
    const displayName = isAnonymous ? 'An anonymous member' : username || 'A Tandem member';

    // Create the submission
    const submission = {
      id: randomUUID(),
      userId: user.id,
      username: username,
      displayName: displayName,
      isAnonymous: !!isAnonymous,
      groups: groups.map((group, index) => ({
        ...group,
        order: group.order || index + 1,
        movies: group.movies.map((movie, movieIndex) => ({
          ...movie,
          order: movie.order || movieIndex + 1,
        })),
      })),
    };

    const createdSubmission = await createPuzzleSubmission(submission);

    logger.info('Puzzle submission created', {
      submissionId: createdSubmission.id,
      userId: user.id,
      isAnonymous,
    });

    return NextResponse.json({
      success: true,
      submission: createdSubmission,
    });
  } catch (error) {
    logger.error('POST /api/puzzles/submit error', error);
    const message = sanitizeErrorMessage(error);
    const status = error.status || (message?.toLowerCase().includes('invalid') ? 400 : 500);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
