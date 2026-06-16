import { NextRequest, NextResponse } from 'next/server';

const ADMIN_ROBOTS_HEADER = 'noindex, nofollow, noarchive';

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

function withAdminRobotsHeader(response: NextResponse) {
  response.headers.set('X-Robots-Tag', ADMIN_ROBOTS_HEADER);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminPath(pathname)) return NextResponse.next();

  // Preview deployments are already protected by Vercel preview authentication.
  // The stricter app-level gate is enforced only for production aliases/domains.
  if (process.env.VERCEL_ENV !== 'production') return withAdminRobotsHeader(NextResponse.next());

  const expected = process.env.FEYA_ADMIN_ACCESS_TOKEN;
  if (!expected) {
    return withAdminRobotsHeader(new NextResponse('Admin access is not configured.', { status: 403 }));
  }

  const provided = request.cookies.get('feya_admin_token')?.value || request.headers.get('x-feya-admin-token') || '';
  if (provided !== expected) {
    return withAdminRobotsHeader(new NextResponse('Admin access required.', { status: 401 }));
  }

  return withAdminRobotsHeader(NextResponse.next());
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
