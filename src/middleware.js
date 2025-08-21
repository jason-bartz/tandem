import { NextResponse } from 'next/server';

export function middleware(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  
  // Create response
  let response;
  
  // Allow GET requests to rotate-puzzle endpoint for status checks
  if (request.nextUrl.pathname === '/api/admin/rotate-puzzle' && 
      request.method === 'GET') {
    response = NextResponse.next();
  }
  // Basic auth check for admin routes (token verification happens in the API route)
  else if (request.nextUrl.pathname.startsWith('/api/admin') && 
      !request.nextUrl.pathname.includes('/api/admin/auth')) {
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response = NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};