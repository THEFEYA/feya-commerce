import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { probeOfficialGscReadOnly } from '@/lib/gscOfficialReadOnly';
import { planOfficialGscCapture } from '@/lib/gscOfficialCapture';

/**
 * The only validated first-party GSC → append-only receipt writer.
 * Owner browser and internal-token entrypoints share this implementation.
 * Never grants canonical HEALTHY, runs GMEL, schedules work or calls paid AI.
 */
export async function captureOfficialGscOnce(): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const denied = (code: string, status = 503) => ({
    status,
    body: { ok: false, code, source_health_promoted: false },
  });
  if (process.env.FEYA_GSC_CAPTURE_ENABLED !== 'true'
    || process.env.FEYA_GSC_READ_ENABLED !== 'true') {
    return denied('GSC_CAPTURE_DISABLED');
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) return denied('GSC_CAPTURE_STORAGE_UNAVAILABLE');
  const checkedAt = new Date();
  const evidence = await probeOfficialGscReadOnly(process.env, fetch, checkedAt);
  const plan = planOfficialGscCapture(process.env, evidence, new Date());
  if (!plan.ok) {
    return denied(plan.code, plan.code === 'GSC_CAPTURE_NO_FINAL_ROWS' ? 200 : 503);
  }

  try {
    // Atomic, service-only, immutable SHA-256 RPC; repeated requests are idempotent.
    const { data, error } = await service.rpc('feya_fn_stage_gsc_daily_observation_v1', plan.args);
    if (error) return denied('GSC_CAPTURE_STORAGE_REJECTED');
    const saved = Array.isArray(data) ? data[0] : null;
    if (!saved || typeof saved.receipt_id !== 'string'
      || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(saved.receipt_id)
      || typeof saved.payload_sha256 !== 'string'
      || !/^[0-9a-f]{64}$/.test(saved.payload_sha256)
      || typeof saved.created_new !== 'boolean'
      || saved.observed_days !== plan.args.p_daily_rows.length) {
      return denied('GSC_CAPTURE_STORAGE_RECEIPT_INVALID');
    }
    return {
      status: 200,
      body: {
        ok: true,
        code: saved.created_new ? 'GSC_CAPTURE_RECORDED' : 'GSC_CAPTURE_ALREADY_RECORDED',
        receipt_id: saved.receipt_id,
        payload_sha256: saved.payload_sha256,
        created_new: saved.created_new,
        property: 'sc-domain:thefeya.com',
        source_channel: 'GOOGLE_GSC_OFFICIAL_READONLY',
        window: { start_date: plan.args.p_query_start, end_date: plan.args.p_query_end },
        observed_days: saved.observed_days,
        clicks: plan.args.p_expected_clicks,
        impressions: plan.args.p_expected_impressions,
        source_health_promoted: false,
        auto_gmel_enabled: false,
        ai_calls: 0,
      },
    };
  } catch {
    // Ambiguous write failures must be retried, never treated as successful.
    return denied('GSC_CAPTURE_STORAGE_UNAVAILABLE');
  }
}
