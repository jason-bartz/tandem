import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

// Cache parsed words in memory (process-level)
let _wordCache = null;

async function loadMasterDict() {
  if (_wordCache) return _wordCache;

  const dictPath = path.join(process.cwd(), 'database', 'crossword-master.dict');
  const content = await fs.readFile(dictPath, 'utf-8');

  const byLength = { 2: [], 3: [], 4: [], 5: [] };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const semiIdx = trimmed.lastIndexOf(';');
    if (semiIdx === -1) continue;

    const word = trimmed.substring(0, semiIdx);
    if (!word || !/^[A-Z]+$/.test(word)) continue;

    const len = word.length;
    if (len >= 2 && len <= 5) {
      byLength[len].push(word);
    }
  }

  _wordCache = byLength;
  return byLength;
}

/**
 * GET /api/admin/mini/wordlist
 * Serves word lists from the master crossword dictionary
 */
export async function GET(request) {
  try {
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

    const byLength = await loadMasterDict();
    const words = byLength[parseInt(length, 10)] || [];
    const fileContent = words.join('\n');

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    logger.error('[WordList API] Error reading word list:', error);
    return NextResponse.json({ error: 'Failed to load word list' }, { status: 500 });
  }
}
