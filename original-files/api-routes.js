// src/app/api/puzzle/route.js
import { NextResponse } from 'next/server';
import { getPuzzleForDate, incrementStats } from '@/lib/db';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { z } from 'zod';

/**
 * GET /api/puzzle - Fetch today's puzzle
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getCurrentPuzzleInfo().isoDate;
    
    // Validate date format
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const validatedDate = dateSchema.parse(date);
    
    const puzzle = await getPuzzleForDate(validatedDate);
    const puzzleInfo = getCurrentPuzzleInfo();
    
    // Track puzzle view
    await incrementStats('views');
    
    return NextResponse.json({
      success: true,
      date: validatedDate,
      puzzle: puzzle || null,
      puzzleNumber: puzzleInfo.number,
      displayDate: puzzleInfo.date,
    });
  } catch (error) {
    console.error('GET /api/puzzle error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/puzzle - Submit puzzle completion
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const completionSchema = z.object({
      completed: z.boolean(),
      time: z.number().min(0),
      mistakes: z.number().min(0).max(4),
    });
    
    const validatedData = completionSchema.parse(body);
    
    // Track stats
    await incrementStats('played');
    if (validatedData.completed) {
      await incrementStats('completed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Stats recorded successfully',
    });
  } catch (error) {
    console.error('POST /api/puzzle error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to save stats' },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/admin/auth/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

/**
 * POST /api/admin/auth - Admin login
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate credentials
    const credentialsSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });
    
    const { username, password } = credentialsSchema.parse(body);
    
    // Check username
    if (username !== process.env.ADMIN_USERNAME) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        username,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return NextResponse.json({
      success: true,
      token,
      user: { username, role: 'admin' },
    });
  } catch (error) {
    console.error('POST /api/admin/auth error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth - Verify token
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      return NextResponse.json({
        success: true,
        valid: true,
        user: {
          username: decoded.username,
          role: decoded.role,
        },
      });
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('GET /api/admin/auth error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Token verification failed' },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/admin/puzzles/route.js
import { NextResponse } from 'next/server';
import { 
  getPuzzlesRange, 
  setPuzzleForDate, 
  deletePuzzleForDate 
} from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { isValidPuzzle } from '@/lib/utils';
import { z } from 'zod';

/**
 * Middleware to verify admin authentication
 */
async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminToken(token);
}

/**
 * GET /api/admin/puzzles - Get puzzles in date range
 */
export async function GET(request) {
  try {
    // Verify admin
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    // Validate date parameters
    const dateRangeSchema = z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    
    const { start: validStart, end: validEnd } = dateRangeSchema.parse({ start, end });
    
    const puzzles = await getPuzzlesRange(validStart, validEnd);
    
    return NextResponse.json({
      success: true,
      puzzles,
      count: Object.keys(puzzles).length,
    });
  } catch (error) {
    console.error('GET /api/admin/puzzles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid date range' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/puzzles - Create or update puzzle
 */
export async function POST(request) {
  try {
    // Verify admin
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate puzzle data
    const puzzleSchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      puzzle: z.object({
        theme: z.string().min(3).max(50),
        puzzles: z.array(
          z.object({
            emoji: z.string().min(2).max(6),
            answer: z.string().min(2).max(10).regex(/^[A-Z\s]+$/),
          })
        ).length(4),
      }),
    });
    
    const { date, puzzle } = puzzleSchema.parse(body);
    
    // Additional validation
    if (!isValidPuzzle(puzzle)) {
      return NextResponse.json(
        { success: false, error: 'Invalid puzzle structure' },
        { status: 400 }
      );
    }
    
    // Save puzzle
    await setPuzzleForDate(date, {
      ...puzzle,
      createdBy: admin.username,
      createdAt: new Date().toISOString(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Puzzle saved for ${date}`,
      date,
    });
  } catch (error) {
    console.error('POST /api/admin/puzzles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid puzzle data',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to save puzzle' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/puzzles - Delete puzzle
 */
export async function DELETE(request) {
  try {
    // Verify admin
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    // Validate date
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const validatedDate = dateSchema.parse(date);
    
    await deletePuzzleForDate(validatedDate);
    
    return NextResponse.json({
      success: true,
      message: `Puzzle deleted for ${validatedDate}`,
    });
  } catch (error) {
    console.error('DELETE /api/admin/puzzles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete puzzle' },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/stats/route.js
import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

/**
 * GET /api/stats - Get game statistics
 */
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