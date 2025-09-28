import { NextResponse } from 'next/server';
import {
  getStats,
  getPopularPuzzles,
  getDailyActivity,
  getPuzzleStats
} from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'global';
    const date = searchParams.get('date');
    const days = parseInt(searchParams.get('days') || '7');

    if (type === 'puzzle' && date) {
      // Get stats for specific puzzle
      const puzzleStats = await getPuzzleStats(date);
      return NextResponse.json({
        success: true,
        stats: puzzleStats || {
          played: 0,
          completed: 0,
          completionRate: 0,
          averageTime: 0,
          averageMistakes: 0,
          perfectGames: 0,
          hintsUsed: 0,
          shared: 0
        }
      });
    }

    if (type === 'popular') {
      // Get popular puzzles
      const popular = await getPopularPuzzles();
      return NextResponse.json({
        success: true,
        puzzles: popular
      });
    }

    if (type === 'activity') {
      // Get daily activity
      const activity = await getDailyActivity(days);
      return NextResponse.json({
        success: true,
        activity
      });
    }

    // Default: return global stats
    const stats = await getStats();
    const popularPuzzles = await getPopularPuzzles(3);
    const dailyActivity = await getDailyActivity(7);

    return NextResponse.json({
      success: true,
      stats: {
        played: stats.played || 0,
        completed: stats.completed || 0,
        views: stats.views || 0,
        completionRate: stats.played > 0
          ? Math.round((stats.completed / stats.played) * 100)
          : 0,
        uniquePlayers: stats.uniquePlayers || 0,
        averageTime: stats.played > 0
          ? Math.round((stats.totalTime || 0) / stats.played)
          : 0,
        perfectGames: stats.perfectGames || 0,
        hintsUsed: stats.hintsUsed || 0,
        gamesShared: stats.gamesShared || 0
      },
      popularPuzzles,
      dailyActivity
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}