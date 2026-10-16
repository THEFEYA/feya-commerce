import { NextRequest, NextResponse } from 'next/server';
import { adminAccessDecision } from '@/lib/adminAccess';
import { getAdminAuthConfigStatus, getSupabaseAuthServerClient } from '@/lib/supabaseAuth';
import { probeOfficialGscReadOnly } from '@/lib/gscOfficialReadOnly';

export const runtime = 'nodejs';

function response(code: string, status: number, extras: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: status === 200, code, ...extras }, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

/** Owner diagnostic only: no persistence, no tokens returned, no automatic GMEL work. */
export async function POST(request: NextRequest) {
  if (!request.headers.get('origin') || request.headers.get('origin') !== request.nextUrl.origin) {
    return response('GSC_OWNER_ORIGIN_DENIED', 403);
  }

  const config = getAdminAuthConfigStatus();
  if (!config.required || !config.allowlistConfigured) {
    return response('GSC_OWNER_ACCESS_UNAVAILABLE', 503);
  }
  try {
    const auth = await getSupabaseAuthServerClient();
    if (!auth) return response('GSC_OWNER_AUTH_UNAVAILABLE', 503);
    const { data, error } = await auth.auth.getClaims();
    if (error || !data?.claims) return response('GSC_OWNER_LOGIN_REQUIRED', 401);
    const { sub, email } = data.claims;
    if (!adminAccessDecision({ id: sub, email }, process.env).allowed) {
      return response('GSC_OWNER_NOT_ALLOWED', 403);
    }
  } catch {
    return response('GSC_OWNER_AUTH_UNAVAILABLE', 503);
  }

  // Allowlisted owner access is NOT permission to bypass the production read switch.
  if (process.env.FEYA_GSC_READ_ENABLED !== 'true') {
    return response('GSC_READ_DISABLED', 503, { source_health_promoted: false });
  }

  try {
    const check = await probeOfficialGscReadOnly(process.env);
    return response(check.code, check.ok ? 200 : 503, {
      property: check.property,
      window: check.window,
      checked_at: check.checked_at,
      permission: check.property_permission,
      days_observed: check.days_observed,
      last_observed_date: check.last_observed_date,
      clicks: check.clicks_in_observed_rows,
      impressions: check.impressions_in_observed_rows,
      source_health_promoted: false,
      data_written: false,
      ai_calls: 0,
    });
  } catch {
    return response('GSC_OWNER_PROBE_FAILED', 503);
  }
}
