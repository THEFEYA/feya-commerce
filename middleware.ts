import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { adminAccessDecision } from '@/lib/adminAccess';
import { isOwnerPreviewDeployment } from '@/lib/ownerPreviewPolicy';
import {
  isOwnerActionStepUpPath,
  ownerPreviewMutationAllowed,
} from '@/lib/ownerActionStepUpPolicy';

function getPublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminApi = pathname.startsWith('/api/admin/');
  const isLogin = pathname === '/admin/login';
  const isStepUpOwnerAction = isOwnerActionStepUpPath(pathname);
  const ownerPreview = isOwnerPreviewDeployment(process.env);

  if (isLogin) {
    if (ownerPreview && !ownerPreviewMutationAllowed(pathname, request.method, process.env)) {
      return NextResponse.json(
        { ok: false, code: 'owner_preview_read_only', error: 'Предпросмотр: изменение данных выключено.' },
        { status: 423, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
      );
    }
    const response = NextResponse.next({ request });
    response.headers.set('Cache-Control','private, no-store');
    response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    return response;
  }

  if (ownerPreview && ['GET','HEAD'].includes(request.method) && !isStepUpOwnerAction) {
    const response = NextResponse.next({ request });
    response.headers.set('Cache-Control','private, no-store');
    response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    return response;
  }

  if (ownerPreview && !['GET','HEAD'].includes(request.method)
    && !ownerPreviewMutationAllowed(pathname,request.method,process.env)) {
    return NextResponse.json(
      { ok: false, code: 'owner_preview_read_only', error: 'Предпросмотр: изменение данных выключено.' },
      { status: 423, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
    );
  }

  const stepUpAuth = isStepUpOwnerAction && process.env.FEYA_OWNER_ACTION_AUTH_REQUIRED === 'true';
  const fullAdminAuth = process.env.FEYA_ADMIN_AUTH_REQUIRED === 'true';
  const authRequiredForRequest = fullAdminAuth || stepUpAuth;

  if (!authRequiredForRequest) {
    if (ownerPreview) {
      return NextResponse.json(
        { ok: false, code: 'owner_action_step_up_disabled', error: 'Protected owner action authentication is disabled.' },
        { status: 423, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
      );
    }
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
        { ok: false, code: 'authentication_required', error: 'Authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const access = adminAccessDecision({ id: claims.sub, email: claims.email }, process.env);

  if (!access.configured) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, code: 'owner_allowlist_missing', error: 'FEYA Admin auth is enabled, but no admin allowlist is configured.' },
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
        { ok: false, code: 'owner_not_allowed', error: 'Not authorized for FEYA Admin.' },
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
  if (ownerPreview) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
