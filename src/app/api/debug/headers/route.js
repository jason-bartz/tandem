import { NextResponse } from 'next/server';

/**
 * Debug endpoint to inspect headers
 * This helps diagnose authentication issues from iOS app
 *
 * DELETE THIS ENDPOINT BEFORE GOING TO PRODUCTION!
 */
export async function GET(request) {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return NextResponse.json({
    headers,
    authHeader: request.headers.get('authorization'),
    hasAuthHeader: !!request.headers.get('authorization'),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request) {
  return GET(request);
}

export async function DELETE(request) {
  return GET(request);
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
