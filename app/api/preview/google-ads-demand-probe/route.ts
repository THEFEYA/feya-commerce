import { NextRequest, NextResponse } from 'next/server';
import {
  demandProbeDeploymentAllowed,
  demandProbeJob,
  demandProbeKeywords,
  demandProbeV2Deps,
  runDemandProbe,
  runDemandProbeJob,
  type KeywordPage,
} from '@/lib/googleAdsDemandProbe';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const maxDuration = 60;

const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};
const COOLDOWN_MS = 6_000;
let lastRunAt = 0;

const BANK_META = ['id', 'keyword', 'review_status', 'bank_bucket', 'source_clusters', 'page_type', 'role', 'role_label', 'avg_monthly_searches', 'last_checked'] as const;
const MASTER_META = ['keyword_id', 'keyword', 'keyword_axis', 'keyword_pattern', 'product_count', 'suggested_page_level', 'priority_tier', 'validation_status', 'source', 'active_flag'] as const;

function response(code: string, status: number, extras: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: status === 200, code, ...extras }, { status, headers: HEADERS });
}

/** Read-only SELECT of one bank or keyword-master page (service role, server side). No writes. */
async function readPage(source: 'bank' | 'master', page: number, pageSize: number): Promise<KeywordPage> {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw Object.assign(new Error('SUPABASE_ENV_MISSING'), { safeCode: 'SUPABASE_ENV_MISSING' });
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const result = source === 'bank'
    ? await client.from('seo_keyword_bank_v1').select(BANK_META.join(','), { count: 'exact' })
      .in('review_status', ['approved_draft', 'hold']).order('keyword_norm', { ascending: true }).order('id', { ascending: true }).range(from, to)
    : await client.from('feya_commerce_seo_keyword_master_v1').select(MASTER_META.join(','), { count: 'exact' })
      .order('keyword_norm', { ascending: true }).order('keyword_id', { ascending: true }).range(from, to);
  const { data, count, error } = result as { data: unknown; count: number | null; error: unknown };
  if (error) throw Object.assign(new Error('SUPABASE_READ_FAILED'), { safeCode: 'SUPABASE_READ_FAILED' });
  const columns = source === 'bank' ? BANK_META : MASTER_META;
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({ keyword: row.keyword, meta: columns.map((column) => row[column] ?? null) }));
  return { total: count ?? 0, rows };
}

/**
 * Owner-approved read-only Google Ads demand probe (Preview branch only, 2026-11-24).
 * No persistence, no campaign or account changes, no tokens returned. Not an import path.
 * Body: {set:'wave1'} or {set:'bank'|'master'|'extra'|'ideas', market?:'us'|'gb'|'ca'|'au', page?:n}.
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
  const job = demandProbeJob(body);
  if (!job) return response('GOOGLE_ADS_PROBE_BAD_REQUEST', 400);

  const now = Date.now();
  if (now - lastRunAt < COOLDOWN_MS) return response('GOOGLE_ADS_PROBE_COOLDOWN', 429);
  lastRunAt = now;

  try {
    if (job.kind === 'wave1') {
      const keywords = demandProbeKeywords('wave1');
      if (!keywords) return response('GOOGLE_ADS_PROBE_UNKNOWN_SET', 400);
      const report = await runDemandProbe(keywords, process.env);
      const { ok, code, ...rest } = report;
      return response(code, ok ? 200 : 502, rest);
    }
    const report = await runDemandProbeJob(job, process.env, demandProbeV2Deps(process.env, readPage));
    const { ok, code, ...rest } = report;
    const metaColumns = job.kind === 'metrics' && job.source === 'bank' ? BANK_META : job.kind === 'metrics' && job.source === 'master' ? MASTER_META : null;
    return response(code, ok ? 200 : 502, { ...rest, meta_columns: metaColumns });
  } catch {
    return response('GOOGLE_ADS_PROBE_FAILED', 502, { production_db_writes: 0, data_written: false, ai_calls: 0 });
  }
}
