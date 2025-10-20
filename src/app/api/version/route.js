import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

// API version information
const VERSION_INFO = {
  apiVersion: '1.0.0',
  minSupportedClient: '1.0.0',
  currentWebVersion: '1.0.0',
  features: {
    puzzles: true,
    stats: true,
    archive: true,
    offline: true,
    share: true,
  },
  endpoints: {
    puzzle: '/api/puzzle',
    stats: '/api/stats',
    batch: '/api/puzzles/batch',
  },
};

export async function GET() {
  try {
    return NextResponse.json(VERSION_INFO, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    logger.error('Version check failed', error);
    return NextResponse.json({ error: 'Failed to get version info' }, { status: 500 });
  }
}
