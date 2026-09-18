import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function parseCsvEnv(name: string) {
  return new Set(
    (process.env[name] || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getPublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export async function middleware(request: NextRequest) {
  const isAdminApi = request.nextUrl.pathname.startsWith('/api/admin/');

  if (process.env.FEYA_ADMIN_AUTH_REQUIRED !== 'true') {
    return NextResponse.next({ request });
  }

  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next({ request });
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

  const allowedUserIds = parseCsvEnv('FEYA_ADMIN_ALLOWED_USER_IDS');
  const allowedEmails = parseCsvEnv('FEYA_ADMIN_ALLOWED_EMAILS');

  if (!allowedUserIds.size && !allowedEmails.size) {
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

  const userId = typeof claims.sub === 'string' ? claims.sub.toLowerCase() : '';
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';

  if (!allowedUserIds.has(userId) && !allowedEmails.has(email)) {
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
