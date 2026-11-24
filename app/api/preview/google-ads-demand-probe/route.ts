import { NextRequest, NextResponse } from 'next/server';
import { demandProbeDeploymentAllowed, demandProbeKeywords, runDemandProbe } from '@/lib/googleAdsDemandProbe';

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};
const COOLDOWN_MS = 30_000;
let lastRunAt = 0;

function response(code: string, status: number, extras: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: status === 200, code, ...extras }, { status, headers: HEADERS });
}

/**
 * Owner-approved read-only Google Ads demand probe (Preview branch only, 2026-11-24).
 * No persistence, no campaign or account changes, no tokens returned. Not an import path.
 */
export async function POST(request: NextRequest) {
  // Production, other branches and local runs see nothing; checked before origin or body.
  if (!demandProbeDeploymentAllowed(process.env)) {
    return new NextResponse(null, { status: 404, headers: HEADERS });
  }

  const host = request.headers.get('host');
  const forwarded = request.headers.get('x-forwarded-proto');
  const scheme = forwarded === 'https' || forwarded === 'http'
    ? forwarded : request.nextUrl.protocol.replace(':', '');
  const expectedOrigin = host && /^[-.a-zA-Z0-9]+(?::[0-9]+)?$/.test(host)
    ? scheme + '://' + host : null;
  if (!expectedOrigin || request.headers.get('origin') !== expectedOrigin) {
    return response('GOOGLE_ADS_PROBE_ORIGIN_DENIED', 403);
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => key !== 'set')) {
    return response('GOOGLE_ADS_PROBE_BAD_REQUEST', 400);
  }
  const keywords = demandProbeKeywords((body as { set?: unknown }).set);
  if (!keywords) return response('GOOGLE_ADS_PROBE_UNKNOWN_SET', 400);

  const now = Date.now();
  if (now - lastRunAt < COOLDOWN_MS) return response('GOOGLE_ADS_PROBE_COOLDOWN', 429);
  lastRunAt = now;

  try {
    const report = await runDemandProbe(keywords, process.env);
    const { ok, code, ...rest } = report;
    return response(code, ok ? 200 : 502, rest);
  } catch {
    return response('GOOGLE_ADS_PROBE_FAILED', 502, { production_db_writes: 0, data_written: false, ai_calls: 0 });
  }
}
