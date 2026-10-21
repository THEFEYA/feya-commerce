import 'server-only';
import {NextResponse, type NextRequest} from 'next/server';
import {adminAccessDecision} from '@/lib/adminAccess';
import {getSupabaseAuthServerClient} from '@/lib/supabaseAuth';
import {isOwnerActionAuthRequired} from '@/lib/ownerActionStepUpPolicy';
import {sha256} from './runtime.ts';
import {paymentsStore} from './store.ts';

/** Invitation cookie for the Seller Online installation panel. */
export const PAYMENTS_ACCESS_COOKIE = '__Secure-feya-pay-access-v1';
/** Cookie set by the earlier setup panel; its links keep working (migrated grants). */
export const LEGACY_SETUP_COOKIE = '__Secure-feya-so-setup-v1';
export const PARTNER_API_BASE = '/api/partner/seller-online';

export const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {status, headers: NO_STORE_HEADERS});
}

export function validAccessToken(raw: unknown): raw is string {
  return typeof raw === 'string' && (/^[0-9a-f]{64}$/.test(raw) || /^[A-Za-z0-9_-]{43}$/.test(raw));
}

/** Browser POSTs must come from the same origin (CSRF protection). */
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.host === request.nextUrl.host && url.protocol === request.nextUrl.protocol;
  } catch { return false; }
}

export type PaymentsActor = {role: 'technician' | 'owner'; name: string; grantId: string | null};

/** Seller Online technician (invitation) — or the signed-in owner. */
export async function resolveInstaller(request: NextRequest): Promise<PaymentsActor | null> {
  const token = request.cookies.get(PAYMENTS_ACCESS_COOKIE)?.value || request.cookies.get(LEGACY_SETUP_COOKIE)?.value || '';
  if (validAccessToken(token)) {
    try {
      const grant = await paymentsStore.resolveGrant(sha256(token));
      if (grant.ok && grant.role) {
        return {role: grant.role, name: grant.role === 'owner' ? 'owner-link' : `seller-online:${(grant.grant_id || '').slice(0, 8)}`, grantId: grant.grant_id || null};
      }
    } catch { /* fall through */ }
  }
  return resolveOwner();
}

/** Signed-in, allow-listed TheFEYA owner (Supabase Auth, same rule as /admin). */
export async function resolveOwner(): Promise<PaymentsActor | null> {
  if (!isOwnerActionAuthRequired(process.env)) return null;
  const auth = await getSupabaseAuthServerClient();
  if (!auth) return null;
  const {data, error} = await auth.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims) return null;
  const decision = adminAccessDecision({id: claims.sub, email: claims.email}, process.env);
  if (!decision.allowed) return null;
  const email = typeof claims.email === 'string' ? claims.email : String(claims.sub || 'owner');
  return {role: 'owner', name: email.slice(0, 200), grantId: null};
}

export function setAccessCookie(response: NextResponse, token: string) {
  response.cookies.set(PAYMENTS_ACCESS_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: 'strict', path: PARTNER_API_BASE, maxAge: 14 * 24 * 60 * 60,
  });
  return response;
}
