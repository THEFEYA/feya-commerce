import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { adminAccessDecision } from '@/lib/adminAccess';

function getPublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export async function middleware(request: NextRequest) {
  const isAdminApi = request.nextUrl.pathname.startsWith('/api/admin/');

  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next({ request });
  }

  if (process.env.FEYA_ADMIN_AUTH_REQUIRED !== 'true') {
    return isAdminApi
      ? NextResponse.json({ ok: false, error: 'FEYA Admin is locked until authentication is configured.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
      : new NextResponse('FEYA Admin is locked until authentication is configured.', { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getPublicKey();

  if (!supabaseUrl || !publicKey) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, error: 'FEYA Admin authentication is required but Supabase Auth environment variables are missing.' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    return new NextResponse('FEYA Admin authentication is required but Supabase Auth environment variables are missing.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (!claims) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const access = adminAccessDecision({ id: claims.sub, email: claims.email }, process.env);

  if (!access.configured) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, error: 'FEYA Admin auth is enabled, but no admin allowlist is configured.' },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    return new NextResponse('FEYA Admin auth is enabled, but no admin allowlist is configured.', {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  if (!access.allowed) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, error: 'Not authorized for FEYA Admin.' },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    url.searchParams.set('error', 'not_authorized');
    return NextResponse.redirect(url);
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
