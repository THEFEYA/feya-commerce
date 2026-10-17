import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuthConfigStatus, getSupabaseAuthServerClient } from '@/lib/supabaseAuth';
import { adminAccessDecision } from '@/lib/adminAccess';
import { captureOfficialGscOnce } from '@/lib/gscOfficialCaptureServer';

const CONFIRMATION = 'SAVE_GSC_OBSERVATION_V1';

function result(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

/**
 * Explicit owner-confirmed one-shot GSC operational receipt.
 * Not a source-health promotion, cron activation or GMEL model admission.
 */
export async function POST(request: NextRequest) {
  const host = request.headers.get('host');
  const forwarded = request.headers.get('x-forwarded-proto');
  const scheme = forwarded === 'https' || forwarded === 'http'
    ? forwarded : request.nextUrl.protocol.replace(':', '');
  const expectedOrigin = host && /^[-.a-zA-Z0-9]+(?::[0-9]+)?$/.test(host)
    ? scheme + '://' + host : null;
  if (!expectedOrigin || request.headers.get('origin') !== expectedOrigin) {
    return result({ ok: false, code: 'GSC_CAPTURE_OWNER_ORIGIN_DENIED' }, 403);
  }

  const config = getAdminAuthConfigStatus();
  if (!config.required || !config.allowlistConfigured) {
    return result({ ok: false, code: 'GSC_CAPTURE_OWNER_ACCESS_UNAVAILABLE' }, 503);
  }
  try {
    const auth = await getSupabaseAuthServerClient();
    if (!auth) return result({ ok: false, code: 'GSC_CAPTURE_OWNER_AUTH_UNAVAILABLE' }, 503);
    const { data, error } = await auth.auth.getClaims();
    if (error || !data?.claims) {
      return result({ ok: false, code: 'GSC_CAPTURE_OWNER_LOGIN_REQUIRED' }, 401);
    }
    if (!adminAccessDecision({
      id: data.claims.sub,
      email: data.claims.email,
    }, process.env).allowed) {
      return result({ ok: false, code: 'GSC_CAPTURE_OWNER_NOT_ALLOWED' }, 403);
    }
  } catch {
    return result({ ok: false, code: 'GSC_CAPTURE_OWNER_AUTH_UNAVAILABLE' }, 503);
  }

  // Fail closed before provider access or storage unless the owner enabled capture.
  if (process.env.FEYA_GSC_CAPTURE_ENABLED !== 'true'
    || process.env.FEYA_GSC_READ_ENABLED !== 'true') {
    return result({
      ok: false, code: 'GSC_CAPTURE_DISABLED', source_health_promoted: false,
    }, 423);
  }

  // An exact intent is required. Never accept provider rows, totals or resource from browser.
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return result({ ok: false, code: 'GSC_CAPTURE_CONFIRMATION_REQUIRED' }, 400);
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 256) return result({ ok: false, code: 'GSC_CAPTURE_INVALID_INTENT' }, 413);
    body = JSON.parse(text);
  } catch {
    return result({ ok: false, code: 'GSC_CAPTURE_INVALID_INTENT' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).length !== 1
    || (body as Record<string, unknown>).confirm !== CONFIRMATION) {
    return result({ ok: false, code: 'GSC_CAPTURE_CONFIRMATION_REQUIRED' }, 400);
  }

  try {
    const capture = await captureOfficialGscOnce();
    return result(capture.body, capture.status);
  } catch {
    return result({ ok: false, code: 'GSC_CAPTURE_UNAVAILABLE' }, 503);
  }
}
