import { NextResponse } from 'next/server';

export function middleware(request) {
  // Allow GET requests to rotate-puzzle endpoint for status checks
  if (request.nextUrl.pathname === '/api/admin/rotate-puzzle' && 
      request.method === 'GET') {
    return NextResponse.next();
  }
  
  // Basic auth check for admin routes (token verification happens in the API route)
  if (request.nextUrl.pathname.startsWith('/api/admin') && 
      !request.nextUrl.pathname.includes('/api/admin/auth')) {
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};