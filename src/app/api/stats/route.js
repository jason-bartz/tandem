import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = await getStats();
    
    return NextResponse.json({
      success: true,
      stats: {
        played: stats.played || 0,
        completed: stats.completed || 0,
        views: stats.views || 0,
        completionRate: stats.played > 0 
          ? Math.round((stats.completed / stats.played) * 100) 
          : 0,
      },
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}