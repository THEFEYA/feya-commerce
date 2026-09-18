import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type UnknownRecord = Record<string, unknown>;

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function clampLimit(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(numeric)));
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

export async function POST(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as UnknownRecord;
  const limit = clampLimit(body.limit);
  const dryRun = body.dryRun !== false;

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, dryRun, error: getMissingSupabaseServiceRoleEnvMessage() },
      { status: 500 },
    );
  }

  const { data: drafts, error: draftError } = await supabase
    .from('feya_commerce_seo_pack_drafts_v1')
    .select('id,canonical_product_id,status,review_status,cqa_status,similarity_check_snapshot,qa_self_report,updated_at')
    .eq('source_mode', 'growth_os_sco_shadow')
    .eq('cqa_status', 'not_run')
    .is('archived_at', null)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (draftError) {
    return NextResponse.json({ ok: false, dryRun, error: draftError.message }, { status: 500 });
  }

  const selected = (drafts || []) as UnknownRecord[];
  if (!selected.length) {
    return NextResponse.json({
      ok: true,
      dryRun,
      selectedCount: 0,
      processedCount: 0,
      appliedCount: 0,
      results: [],
      warnings: ['No Growth OS SCO shadow drafts currently require deterministic prechecks.'],
    });
  }

  const results: UnknownRecord[] = [];
  let appliedCount = 0;
  const warnings: string[] = [];

  for (const draft of selected) {
    const draftId = typeof draft.id === 'string' ? draft.id : null;
    if (!draftId) {
      warnings.push('Skipped a draft row with missing id.');
      continue;
    }

    const rpcName = dryRun
      ? 'feya_fn_preview_content_prechecks_v1'
      : 'feya_fn_apply_content_prechecks_v1';
    const rpcArgs = dryRun
      ? { p_draft_id: draftId }
      : { p_draft_id: draftId, p_actor: 'system:growth_os_content_prechecks_v1' };

    const { data, error } = await supabase.rpc(rpcName, rpcArgs);

    if (error) {
      warnings.push(`${draftId}: ${error.message}`);
      continue;
    }

    const precheck = data && typeof data === 'object' ? (data as UnknownRecord) : {};
    results.push({
      draft_id: draftId,
      canonical_product_id: draft.canonical_product_id,
      source_mode: 'growth_os_sco_shadow',
      precheck,
    });
    if (!dryRun) appliedCount += 1;
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    selectedCount: selected.length,
    processedCount: results.length,
    appliedCount,
    results,
    warnings,
  });
}
