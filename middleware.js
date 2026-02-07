import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const DAILY_ALCHEMY_HOSTS = ['dailyalchemy.fun', 'www.dailyalchemy.fun'];

function isDailyAlchemyDomain(host) {
  if (!host) return false;
  // Strip port for local development
  const hostname = host.split(':')[0];
  return DAILY_ALCHEMY_HOSTS.includes(hostname);
}

export async function middleware(request) {
  const host = request.headers.get('host');
  const isAlchemyDomain = isDailyAlchemyDomain(host);
  const pathname = request.nextUrl.pathname;

  // Daily Alchemy standalone domain: redirect other game routes to root
  if (isAlchemyDomain && (pathname === '/dailymini' || pathname === '/reel-connections')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Rewrite root to /daily-alchemy on the standalone domain
  const shouldRewriteToAlchemy = isAlchemyDomain && pathname === '/';

  function buildResponse() {
    if (shouldRewriteToAlchemy) {
      const url = request.nextUrl.clone();
      url.pathname = '/daily-alchemy';
      return NextResponse.rewrite(url, {
        request: { headers: request.headers },
      });
    }
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  let response = buildResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = buildResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
