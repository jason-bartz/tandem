import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';

/**
 * POST /api/admin/cryptic/assess-difficulty
 * Assess the difficulty of a cryptic puzzle using AI (admin only)
 * Body: { clue, answer, hints }
 */
export async function POST(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Check if AI generation is enabled
    if (!aiService.isEnabled()) {
      return NextResponse.json(
        {
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
          details: 'Contact your administrator to enable AI generation features.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { clue, answer, hints } = body;

    // Validate required fields
    if (!clue || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields: clue, answer' },
        { status: 400 }
      );
    }

    console.log('[assess-difficulty] Assessing puzzle difficulty:', {
      answer,
      admin: authResult.admin.username,
    });

    // Build difficulty assessment prompt
    const prompt = `You are an expert cryptic crossword puzzle creator. Assess the difficulty of this cryptic puzzle on a scale of 1-5.

PUZZLE:
Clue: ${clue}
Answer: ${answer}
${hints ? `Hints available: ${hints.length}` : ''}

DIFFICULTY SCALE:
1 - Very Easy: Simple words, obvious wordplay
2 - Easy: Familiar words, clear wordplay
3 - Medium: Standard cryptic difficulty, clever but fair
4 - Challenging: Complex wordplay, less common words, requires experience
5 - Very Difficult: Advanced techniques, subtle indicators, tricky

Consider:
- Complexity of the wordplay
- Clarity of the definition
- Commonness of the answer word
- Fairness of the cryptic device used
- How many hints would be needed

RESPONSE FORMAT (JSON only):
{
  "difficulty": 3,
  "reasoning": "Brief explanation of why this difficulty level"
}

Assess this puzzle now.`;

    const message = await aiService.getClient().messages.create({
      model: aiService.model,
      max_tokens: 256,
      temperature: 0.5, // Lower temperature for more consistent assessment
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].text;

    // Parse response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const assessment = JSON.parse(jsonMatch[0]);

    if (!assessment.difficulty || assessment.difficulty < 1 || assessment.difficulty > 5) {
      throw new Error('Invalid difficulty rating from AI');
    }

    console.log('[assess-difficulty] Assessment complete:', {
      answer,
      difficulty: assessment.difficulty,
    });

    return NextResponse.json(
      {
        difficulty: assessment.difficulty,
        reasoning: assessment.reasoning || '',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/cryptic/assess-difficulty:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Failed to assess difficulty';
    let statusCode = 500;

    if (error.message.includes('rate_limit')) {
      errorMessage = 'AI service is currently rate limited. Please try again in a moment.';
      statusCode = 429;
    } else if (error.message.includes('authentication') || error.message.includes('API key')) {
      errorMessage = 'AI service authentication failed. Please check configuration.';
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
