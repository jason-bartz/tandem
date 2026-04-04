'use server';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

/**
 * POST /api/admin/daily-alchemy/generate-description
 * Generate a short AI description for a puzzle target element
 */
export async function POST(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { elementName, elementEmoji } = await request.json();

    if (!elementName) {
      return NextResponse.json({ error: 'elementName is required' }, { status: 400 });
    }

    const description = await aiService.generateAlchemyDescription(
      elementName,
      elementEmoji || '✨'
    );

    return NextResponse.json({ success: true, description });
  } catch (error) {
    logger.error('[Admin] Generate description error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to generate description' },
      { status: 500 }
    );
  }
}
