import type {NextRequest} from 'next/server';
import {json, sameOrigin, setAccessCookie, validAccessToken} from '@/lib/payments/access';
import {BodyError, readLimitedJson} from '@/lib/payments/http';
import {sha256} from '@/lib/payments/runtime';
import {paymentsStore} from '@/lib/payments/store';

/** Exchanges the one-time invitation link (#access=…) for an HttpOnly session cookie. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  try {
    const body = await readLimitedJson(request, 400) as {token?: unknown};
    const token = body?.token;
    if (!validAccessToken(token)) return json({ok: false, code: 'invalid_invitation'}, 401);
    const grant = await paymentsStore.resolveGrant(sha256(token));
    if (!grant.ok) return json({ok: false, code: 'invalid_invitation'}, 401);
    return setAccessCookie(json({ok: true, role: grant.role, expires_at: grant.expires_at}), token);
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'invalid_invitation'}, error.status);
    return json({ok: false, code: 'storage_unavailable'}, 503);
  }
}
