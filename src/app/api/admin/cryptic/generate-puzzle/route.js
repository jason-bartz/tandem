import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';

/**
 * POST /api/admin/cryptic/generate-puzzle
 * Generate a cryptic puzzle using AI (admin only)
 * Body: { difficulty, crypticDevices, themeHint }
 */
export async function POST(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const enabled = aiService.isEnabled();

    if (!enabled) {
      console.error('[generate-puzzle] AI service is not enabled');
      return NextResponse.json(
        {
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
          details: 'Contact your administrator to enable AI generation features.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { difficulty = 3, crypticDevices = [], themeHint = null } = body;

    // Validate difficulty
    if (difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ error: 'Difficulty must be between 1 and 5' }, { status: 400 });
    }

    // Validate cryptic devices if provided
    const validDevices = [
      'charade',
      'container',
      'deletion',
      'anagram',
      'reversal',
      'homophone',
      'hidden',
      'double_definition',
      'initial_letters',
    ];

    if (crypticDevices && !Array.isArray(crypticDevices)) {
      return NextResponse.json({ error: 'crypticDevices must be an array' }, { status: 400 });
    }

    // Validate each device
    const invalidDevices = crypticDevices.filter((d) => !validDevices.includes(d));
    if (invalidDevices.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid cryptic device(s): ${invalidDevices.join(', ')}. Must be one of: ${validDevices.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Generate puzzle using AI - pass all selected devices
    const puzzle = await aiService.generateCrypticPuzzle({
      difficulty,
      crypticDevices,
      themeHint,
    });

    return NextResponse.json({ puzzle }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/admin/cryptic/generate-puzzle:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate puzzle';
    let statusCode = 500;

    if (error.message.includes('rate_limit')) {
      errorMessage = 'AI service is currently rate limited. Please try again in a moment.';
      statusCode = 429;
    } else if (error.message.includes('authentication') || error.message.includes('API key')) {
      errorMessage = 'AI service authentication failed. Please check configuration.';
      statusCode = 503;
    } else if (error.message.includes('Invalid')) {
      errorMessage = `Puzzle generation failed validation: ${error.message}`;
      statusCode = 422;
    } else if (error.message.includes('failed after')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again later.';
      statusCode = 503;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
}
