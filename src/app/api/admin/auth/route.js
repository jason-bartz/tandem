import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const credentialsSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });
    
    const { username, password } = credentialsSchema.parse(body);
    
    if (username !== process.env.ADMIN_USERNAME) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
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