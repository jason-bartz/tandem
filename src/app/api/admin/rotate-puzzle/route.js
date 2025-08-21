import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { manualRotatePuzzle, getCurrentPuzzleDateET } from '@/lib/scheduler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function verifyAdmin() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin-token');
    
    if (!token) {
      return false;
    }
    
    const decoded = jwt.verify(token.value, JWT_SECRET);
    return decoded.isAdmin === true;
  } catch (error) {
    return false;
  }
}

export async function GET(request) {
  try {
    // Check current puzzle date without requiring auth
    const currentDate = getCurrentPuzzleDateET();
    const lastRotation = global.lastPuzzleRotation || null;
    const schedulerStatus = global.schedulerRunning || false;
    
    return NextResponse.json({
      success: true,
      currentPuzzleDate: currentDate,
      lastRotation: lastRotation,
      schedulerRunning: schedulerStatus,
      serverTime: new Date().toISOString(),
      etTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    });
  } catch (error) {
    console.error('GET /api/admin/rotate-puzzle error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get rotation status' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdmin();
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const targetDate = body.date || null;
    
    // Perform manual rotation
    const result = await manualRotatePuzzle(targetDate);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Puzzle rotated to ${result.date}`,
        date: result.date,
        puzzleInfo: result.puzzle
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('POST /api/admin/rotate-puzzle error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rotate puzzle' },
      { status: 500 }
    );
  }
}