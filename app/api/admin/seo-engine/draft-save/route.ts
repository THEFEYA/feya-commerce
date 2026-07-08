// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { buildSeoDraftStoragePayload, seoDraftStoragePayloadGuardrails, summarizeSeoDraftStoragePayload } from '@/lib/seoDraftStoragePayload';

export const dynamic = 'force-dynamic';

const STORAGE_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const STORAGE_EVENTS_TABLE = 'feya_commerce_seo_pack_draft_events_v1';
const STORAGE_LATEST_VIEW = 'feya_commerce_v_seo_pack_drafts_latest_v1';
const STORAGE_QUEUE_VIEW = 'feya_commerce_v_seo_pack_review_queue_v1';
const STORAGE_FLAG = 'FEYA_SEO_DRAFT_STORAGE_ENABLED';

export async function GET() {
  const serviceClient = getSupabaseServiceClient();
  const storageHealth = await checkStorageContractHealth(serviceClient);

  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-save',
    method: 'POST',
    mode: 'server_only_storage_entrypoint',
    status: 'blocked_by_feature_flag',
    feature_flag: STORAGE_FLAG,
    storage_contract: storageContractMeta(),
    storage_health: storageHealth,
    expected_body: {
      product_id: 'canonical_product_id UUID',
      dry_run: true,
    },
    guardrails: draftSaveGuardrails(),
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
  const storageEnabled = process.env[STORAGE_FLAG] === 'true';
  const serviceClient = getSupabaseServiceClient();
  const hasServiceClient = Boolean(serviceClient);
  const storageHealth = await checkStorageContractHealth(serviceClient);

  if (!productId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_product_id',
      error: 'product_id is required.',
      storage_health: storageHealth,
      guardrails: draftSaveGuardrails(),
    }, { status: 400 });
  }

  const bundle = await buildSeoBriefContractBundle(productId);
  if (bundle.error) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_missing_supabase_env',
      error: bundle.error,
      storage_health: storageHealth,
      guardrails: draftSaveGuardrails(),
    }, { status: 503 });
  }

  if (!bundle.product || !bundle.seoPackDraft || !bundle.aiAgentInput) {
    return NextResponse.json({
      ok: false,
      status: 'product_not_found',
      error: 'Product not found in Product Focus view.',
      product_id: productId,
      storage_health: storageHealth,
      guardrails: draftSaveGuardrails(),
    }, { status: 404 });
  }

  const agentOutput = buildMockSeoAgentOutput(bundle.aiAgentInput, bundle.brief);
  const validationResult = validateSeoAgentOutput(agentOutput);
  const storagePayload = buildSeoDraftStoragePayload({
    seoPackDraft: bundle.seoPackDraft,
    agentInput: bundle.aiAgentInput,
    agentOutput,
    validationResult,
    sourceMode: 'brief_baseline',
    createdBy: 'seo-engine-draft-save-skeleton',
  });

  const blockers = collectDraftSaveBlockers({
    storageEnabled,
    dryRun,
    hasServiceClient,
    storageHealth,
    validationResult,
  });

  const basePayload = {
    route: '/api/admin/seo-engine/draft-save',
    mode: 'storage_preflight_only',
    feature_flag: {
      name: STORAGE_FLAG,
      enabled: storageEnabled,
    },
    dry_run: dryRun,
    storage_contract: storageContractMeta(),
    storage_health: storageHealth,
    readiness: {
      has_service_role_client: hasServiceClient,
      storage_feature_flag_enabled: storageEnabled,
      storage_contract_applied: storageHealth.ok,
      storage_contract_missing: storageHealth.missing_objects,
      output_validation_status: validationResult.status,
      output_validation_ok: validationResult.ok,
      payload_ready: true,
      actual_insert_enabled: false,
    },
    source: {
      product_id: storagePayload.canonical_product_id,
      matched_etsy_listing_id: storagePayload.matched_etsy_listing_id,
      product_slug: storagePayload.product_slug,
    },
    storage_payload_summary: summarizeSeoDraftStoragePayload(storagePayload),
    storage_payload: body.include_payload === true ? storagePayload : undefined,
    validation_result: validationResult,
    guardrails: draftSaveGuardrails(),
  };

  if (blockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_storage_write',
      blocked: true,
      blockers,
      ...basePayload,
    }, { status: 423 });
  }

  return NextResponse.json({
    ok: false,
    status: 'storage_write_not_implemented_yet',
    blocked: true,
    message: 'Preflight passed, but insert is intentionally not implemented until SQL is applied and verified in Supabase.',
    ...basePayload,
  }, { status: 501 });
}

function collectDraftSaveBlockers({ storageEnabled, dryRun, hasServiceClient, storageHealth, validationResult }) {
  const blockers = [];
  if (!storageEnabled) blockers.push({ code: 'feature_flag_disabled', message: `${STORAGE_FLAG} is not true.` });
  if (dryRun) blockers.push({ code: 'dry_run_only', message: 'dry_run is enabled, so no Supabase insert is allowed.' });
  if (!hasServiceClient) blockers.push({ code: 'missing_service_role_client', message: getMissingSupabaseServiceEnvMessage() });
  if (!storageHealth.ok) blockers.push({ code: 'storage_contract_not_applied', message: `Storage SQL is not fully applied. Missing/problem objects: ${storageHealth.missing_objects.join(', ') || 'unknown'}.` });
  if (!validationResult.ok) blockers.push({ code: 'output_validation_not_passing', message: 'SeoAgentOutputContract validation has blocker issues.' });
  blockers.push({ code: 'insert_flow_not_enabled', message: 'Actual Supabase insert is intentionally not implemented in this skeleton route.' });
  return blockers;
}

async function checkStorageContractHealth(serviceClient) {
  const objects = [
    { kind: 'table', name: STORAGE_TABLE, select: 'id' },
    { kind: 'table', name: STORAGE_EVENTS_TABLE, select: 'id' },
    { kind: 'view', name: STORAGE_LATEST_VIEW, select: 'id' },
    { kind: 'view', name: STORAGE_QUEUE_VIEW, select: 'id' },
  ];

  if (!serviceClient) {
    return {
      ok: false,
      status: 'missing_service_role_client',
      checked_objects: objects.map((item) => ({ ...item, ok: false, status: 'not_checked' })),
      missing_objects: objects.map((item) => item.name),
      note: getMissingSupabaseServiceEnvMessage(),
    };
  }

  const checked = [];
  for (const item of objects) {
    const result = await probeSupabaseObject(serviceClient, item.name, item.select);
    checked.push({ ...item, ...result });
  }

  const missing = checked.filter((item) => !item.ok).map((item) => item.name);
  return {
    ok: missing.length === 0,
    status: missing.length === 0 ? 'storage_contract_detected' : 'storage_contract_incomplete',
    checked_objects: checked,
    missing_objects: missing,
    note: missing.length === 0
      ? 'Storage contract tables/views are visible to the service-role client.'
      : 'Apply docs/SEO_DRAFT_STORAGE_CONTRACT_V1.sql in Supabase SQL Editor, then run this check again.',
  };
}

async function probeSupabaseObject(serviceClient, name: string, selectColumns: string) {
  try {
    const { error, count } = await serviceClient
      .from(name)
      .select(selectColumns, { count: 'exact', head: true });

    if (error) {
      return {
        ok: false,
        status: 'error',
        error_code: error.code || null,
        error_message: error.message || String(error),
      };
    }

    return {
      ok: true,
      status: 'ok',
      count: typeof count === 'number' ? count : null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'exception',
      error_message: err instanceof Error ? err.message : String(err),
    };
  }
}

function storageContractMeta() {
  return {
    sql_file: 'docs/SEO_DRAFT_STORAGE_CONTRACT_V1.sql',
    handoff_file: 'docs/SEO_DRAFT_STORAGE_HANDOFF_V1.md',
    main_table: STORAGE_TABLE,
    events_table: STORAGE_EVENTS_TABLE,
    latest_view: STORAGE_LATEST_VIEW,
    review_queue_view: STORAGE_QUEUE_VIEW,
  };
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function draftSaveGuardrails() {
  return [
    ...seoDraftStoragePayloadGuardrails(),
    'This route must use Supabase service role only for future writes.',
    'This route currently performs no insert, no update, no publish action.',
    'Do not enable storage writes until docs/SEO_DRAFT_STORAGE_CONTRACT_V1.sql is applied and smoke-tested.',
    'Save review draft is different from approve for publish.',
    'Publish readiness remains blocked until human review, similarity/cannibalization, and image ALT truth gates pass.',
  ];
}
