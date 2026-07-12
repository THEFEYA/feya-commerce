// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { validateSeoKeywordPlacement } from '@/lib/seoKeywordPlacementValidator';
import { getSeoPackDraftSaveBlockers } from '@/lib/seoPackContract';
import { assembleSeoProductPack } from '@/lib/seoFullPackAssembler';
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
    guarded_write_body: {
      product_id: 'canonical_product_id UUID',
      dry_run: false,
      source_mode: 'openai_draft',
      agent_output: 'validated seo_agent_output_v1 object',
      note: 'Requires FEYA_SEO_DRAFT_STORAGE_ENABLED=true. Saves review draft only. Does not publish.',
    },
    guardrails: draftSaveGuardrails(),
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
  const requestedSourceMode = body.source_mode === 'openai_draft' ? 'openai_draft' : 'brief_baseline';
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

  const providedAgentOutput = pickProvidedAgentOutput(body);
  const usesProvidedOpenAiOutput = requestedSourceMode === 'openai_draft' && Boolean(providedAgentOutput);
  const agentOutput = usesProvidedOpenAiOutput
    ? providedAgentOutput
    : buildMockSeoAgentOutput(bundle.aiAgentInput, bundle.brief);
  const structuralValidation = validateSeoAgentOutput(agentOutput);
  const commercialValidation = validateSeoCommercialCopy(agentOutput);
  const keywordPlacementValidation = validateSeoKeywordPlacement(agentOutput, bundle.seoPackDraft);
  const productTruthBlockers = getSeoPackDraftSaveBlockers(bundle.seoPackDraft);
  const assembledSeoPack = assembleSeoProductPack({
    draft: bundle.seoPackDraft,
    output: agentOutput,
    structuralValidation,
    commercialValidation,
    keywordPlacementValidation,
    productTruthBlockers,
  });
  const validationIssues = [
    ...(structuralValidation.issues || []),
    ...(commercialValidation.issues || []),
    ...(keywordPlacementValidation.issues || []),
    ...productTruthBlockers.map((code) => ({
      code: `product_truth_${code}`,
      severity: 'blocker',
      message: `SEO Pack save gate failed: ${code}.`,
    })),
  ];
  const validationResult = {
    ok: structuralValidation.ok && commercialValidation.ok && keywordPlacementValidation.ok && productTruthBlockers.length === 0,
    status: validationIssues.some((issue) => issue.severity === 'blocker')
      ? 'blocked'
      : validationIssues.length ? 'warning' : 'valid',
    issues: validationIssues,
    structural_validation: structuralValidation,
    commercial_validation: commercialValidation,
    keyword_placement_validation: keywordPlacementValidation,
    product_truth_blockers: productTruthBlockers,
    assembled_seo_pack: assembledSeoPack,
  };
  const storagePayload = buildSeoDraftStoragePayload({
    seoPackDraft: bundle.seoPackDraft,
    agentInput: bundle.aiAgentInput,
    agentOutput,
    validationResult,
    sourceMode: usesProvidedOpenAiOutput ? 'openai_draft' : 'brief_baseline',
    createdBy: dryRun
      ? 'seo-engine-draft-save-preflight'
      : usesProvidedOpenAiOutput
        ? 'seo-engine-openai-draft-save-route'
        : 'seo-engine-draft-save-route',
  });

  const blockers = collectDraftSaveBlockers({
    storageEnabled,
    dryRun,
    hasServiceClient,
    storageHealth,
    validationResult,
    requestedSourceMode,
    providedAgentOutput,
  });

  const basePayload = {
    route: '/api/admin/seo-engine/draft-save',
    mode: dryRun ? 'storage_preflight_only' : 'guarded_storage_write',
    feature_flag: {
      name: STORAGE_FLAG,
      enabled: storageEnabled,
    },
    dry_run: dryRun,
    requested_source_mode: requestedSourceMode,
    saved_source_mode: storagePayload.source_mode,
    storage_contract: storageContractMeta(),
    storage_health: storageHealth,
    readiness: {
      has_service_role_client: hasServiceClient,
      storage_feature_flag_enabled: storageEnabled,
      storage_contract_applied: storageHealth.ok,
      storage_contract_missing: storageHealth.missing_objects,
      provided_openai_output_received: usesProvidedOpenAiOutput,
      output_validation_status: validationResult.status,
      output_validation_ok: validationResult.ok,
      output_validation_issue_count: validationResult.issues?.length || 0,
      product_truth_blocker_count: productTruthBlockers.length,
      payload_ready: true,
      actual_insert_enabled: storageEnabled && !dryRun && hasServiceClient && storageHealth.ok && validationResult.ok && (requestedSourceMode !== 'openai_draft' || usesProvidedOpenAiOutput),
    },
    source: {
      product_id: storagePayload.canonical_product_id,
      matched_etsy_listing_id: storagePayload.matched_etsy_listing_id,
      product_slug: storagePayload.product_slug,
    },
    storage_payload_summary: summarizeSeoDraftStoragePayload(storagePayload),
    storage_payload: body.include_payload === true ? storagePayload : undefined,
    validation_result: validationResult,
    assembled_seo_pack: assembledSeoPack,
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

  const saveResult = await insertSeoDraftWithEvent(serviceClient, storagePayload);
  if (!saveResult.ok) {
    return NextResponse.json({
      ok: false,
      status: 'storage_write_failed',
      blocked: true,
      error: saveResult.error,
      saved_draft: saveResult.draft || null,
      saved_event: saveResult.event || null,
      ...basePayload,
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: usesProvidedOpenAiOutput ? 'openai_draft_saved_for_review' : 'draft_saved_for_review',
    blocked: false,
    message: usesProvidedOpenAiOutput
      ? 'OpenAI SEO review draft saved. No publish action was performed.'
      : 'SEO review draft saved. No publish action was performed.',
    saved_draft: saveResult.draft,
    saved_event: saveResult.event,
    ...basePayload,
  }, { status: 201 });
}

function pickProvidedAgentOutput(body) {
  if (isRecord(body.agent_output)) return body.agent_output;
  if (isRecord(body.generated_draft_output)) return body.generated_draft_output;
  return null;
}

function collectDraftSaveBlockers({ storageEnabled, dryRun, hasServiceClient, storageHealth, validationResult, requestedSourceMode, providedAgentOutput }) {
  const blockers = [];
  if (!storageEnabled) blockers.push({ code: 'feature_flag_disabled', message: `${STORAGE_FLAG} is not true.` });
  if (dryRun) blockers.push({ code: 'dry_run_only', message: 'dry_run is enabled, so no Supabase insert is allowed.' });
  if (!hasServiceClient) blockers.push({ code: 'missing_service_role_client', message: getMissingSupabaseServiceEnvMessage() });
  if (!storageHealth.ok) blockers.push({ code: 'storage_contract_not_applied', message: `Storage SQL is not fully applied. Missing/problem objects: ${storageHealth.missing_objects.join(', ') || 'unknown'}.` });
  if (requestedSourceMode === 'openai_draft' && !providedAgentOutput) blockers.push({ code: 'missing_openai_agent_output', message: 'source_mode=openai_draft requires agent_output from the generation response.' });
  if (!validationResult.ok) blockers.push({ code: 'output_validation_not_passing', message: 'SeoAgentOutputContract validation has blocker issues.' });
  return blockers;
}

async function insertSeoDraftWithEvent(serviceClient, storagePayload) {
  const { data: draft, error: draftError } = await serviceClient
    .from(STORAGE_TABLE)
    .insert(storagePayload)
    .select('id, canonical_product_id, product_slug, status, review_status, source_mode, created_at')
    .single();

  if (draftError || !draft?.id) {
    return {
      ok: false,
      error: draftError?.message || 'Draft insert did not return an id.',
      draft: draft || null,
      event: null,
    };
  }

  const eventPayload = {
    draft_id: draft.id,
    canonical_product_id: draft.canonical_product_id,
    event_type: 'draft_created',
    from_status: null,
    to_status: draft.status,
    actor: storagePayload.created_by || 'seo-engine-draft-save-route',
    note: storagePayload.source_mode === 'openai_draft'
      ? 'OpenAI SEO review draft saved by gated server route. No publish action was performed.'
      : 'SEO review draft saved by gated server route. No publish action was performed.',
    payload: {
      source_mode: storagePayload.source_mode,
      output_contract_version: storagePayload.output_contract_version,
      validation_status: storagePayload.validation_result_snapshot?.status || 'not_checked',
      validation_issue_count: storagePayload.validation_result_snapshot?.issues?.length || 0,
      review_status: storagePayload.review_status,
    },
  };

  const { data: event, error: eventError } = await serviceClient
    .from(STORAGE_EVENTS_TABLE)
    .insert(eventPayload)
    .select('id, draft_id, canonical_product_id, event_type, to_status, created_at')
    .single();

  if (eventError || !event?.id) {
    return {
      ok: false,
      error: eventError?.message || 'Event insert did not return an id.',
      draft,
      event: event || null,
    };
  }

  return { ok: true, draft, event };
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

function isRecord(value: unknown) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function draftSaveGuardrails() {
  return [
    ...seoDraftStoragePayloadGuardrails(),
    'This route uses Supabase service role only for guarded future writes.',
    'Default UI mode still performs no insert, no update, no publish action.',
    'A write requires FEYA_SEO_DRAFT_STORAGE_ENABLED=true and dry_run=false.',
    'OpenAI draft save requires a validator-passing seo_agent_output_v1 object from the generation route.',
    'Save review draft is different from approve for publish.',
    'Publish readiness remains blocked until human review, similarity/cannibalization, and image ALT truth gates pass.',
  ];
}
