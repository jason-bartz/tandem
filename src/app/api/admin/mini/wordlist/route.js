import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';

// Mark as dynamic route (skip for static export/iOS builds)
export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * GET /api/admin/mini/wordlist
 * Serves word lists from the database folder
 */
export async function GET(request) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const length = searchParams.get('length');

    if (!length || !['2', '3', '4', '5'].includes(length)) {
      return NextResponse.json(
        { error: 'Invalid length parameter. Must be 2, 3, 4, or 5' },
        { status: 400 }
      );
    }

    // Read word list file from database folder
    const filePath = path.join(process.cwd(), 'database', `${length}_letter_words.txt`);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('[WordList API] Error reading word list:', error);
    return NextResponse.json({ error: 'Failed to load word list' }, { status: 500 });
  }
}
