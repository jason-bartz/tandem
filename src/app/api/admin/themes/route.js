import { NextResponse } from 'next/server';
import { getPuzzlesRange } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';

export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authError = await requireAdmin(request);
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(request.url);
    let start = searchParams.get('start');
    let end = searchParams.get('end');

    if (!start) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      start = oneYearAgo.toISOString().split('T')[0];
    }

    if (!end) {
      const oneYearAhead = new Date();
      oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
      end = oneYearAhead.toISOString().split('T')[0];
    }

    const puzzles = await getPuzzlesRange(start, end);

    const themeAnalysis = {};
    const themes = [];

    Object.entries(puzzles).forEach(([date, puzzle]) => {
      const theme = puzzle.theme || 'No Theme';
      const normalizedTheme = theme.toLowerCase().trim();

      if (!themeAnalysis[normalizedTheme]) {
        themeAnalysis[normalizedTheme] = {
          theme,
          dates: [],
          count: 0
        };
      }

      themeAnalysis[normalizedTheme].dates.push(date);
      themeAnalysis[normalizedTheme].count++;

      themes.push({
        date,
        theme,
        puzzle
      });
    });

    const duplicates = Object.values(themeAnalysis).filter(t => t.count > 1);

    return NextResponse.json({
      success: true,
      puzzles,
      stats: {
        total: Object.keys(puzzles).length,
        uniqueThemes: Object.keys(themeAnalysis).length,
        duplicateCount: duplicates.reduce((sum, d) => sum + d.count, 0),
        duplicateThemes: duplicates.map(d => ({
          theme: d.theme,
          dates: d.dates,
          count: d.count
        }))
      },
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('GET /api/admin/themes error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch theme data' },
      { status: 500 }
    );
  }
}