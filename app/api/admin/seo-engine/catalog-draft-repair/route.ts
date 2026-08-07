// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import {
  buildCompactSeoRepairPrompt,
  buildDeterministicSeoClaimPlan,
} from '@/lib/seoClaimPlanV2';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { validateSeoKeywordPlacement } from '@/lib/seoKeywordPlacementValidator';
import { assembleSeoProductPack } from '@/lib/seoFullPackAssembler';
import {
  getSeoGenerationProductTruthBlockers,
  getSeoKeywordSelectionBlockers,
  getSeoPackDraftSaveBlockers,
} from '@/lib/seoPackContract';
import {
  normalizeCodeOwnedSeoCollections,
  normalizeCodeOwnedPdpBlockOrder,
  normalizeDeterministicSeoIdentity,
  normalizeSingleSuppliedImageAltCandidate,
} from '@/lib/seoEditorialCandidateSelection';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const startedAt = Date.now();
  const body = await safeJson(request);
  const productId = String(body.product_id || '').trim();
  const repairAttempt = Number(body.repair_attempt || 0);
  const currentOutput = isRecord(body.current_output) ? body.current_output : null;

  if (!productId || !currentOutput) {
    return NextResponse.json({
      ok: false,
      status: 'invalid_repair_request',
      error: 'product_id and current_output are required.',
    }, { status: 400 });
  }
  if (repairAttempt !== 1) {
    return NextResponse.json({
      ok: false,
      status: 'repair_attempt_not_allowed',
      error: 'Exactly one explicit repair attempt is allowed for the displayed draft.',
    }, { status: 409 });
  }
  if (JSON.stringify(currentOutput).length > 60_000) {
    return NextResponse.json({
      ok: false,
      status: 'repair_payload_too_large',
      error: 'The repair source draft exceeds the safe payload limit.',
    }, { status: 413 });
  }
  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_client_key_leak_risk',
      error: 'A client-exposed OpenAI key is present. Repair is disabled.',
    }, { status: 409 });
  }
  if (process.env.FEYA_SEO_AI_GENERATION_ENABLED !== 'true' || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_repair',
      error: 'Server-side OpenAI generation is not enabled.',
    }, { status: 423 });
  }

  const briefStartedAt = Date.now();
  const bundle = await buildSeoBriefContractBundle(productId);
  const dbBriefMs = Date.now() - briefStartedAt;
  if (bundle.error || !bundle.product || !bundle.seoPackDraft || !bundle.aiAgentInput) {
    return NextResponse.json({
      ok: false,
      status: bundle.error ? 'seo_contract_load_failed' : 'product_not_found',
      error: bundle.error || 'Product contract was not found.',
    }, { status: bundle.error ? 503 : 404 });
  }

  const hardBlockers = unique([
    ...getSeoGenerationProductTruthBlockers(bundle.seoPackDraft),
    ...getSeoKeywordSelectionBlockers(bundle.seoPackDraft),
    ...(bundle.seoPackDraft.keyword_selection?.status === 'confirmed' ? [] : ['keyword_selection_not_human_confirmed']),
    ...((bundle.seoPackDraft.metrics_status?.validated_count || 0) > 0 ? [] : ['missing_validated_keyword_metric']),
    ...buildDeterministicSeoClaimPlan(bundle.aiAgentInput).blockers,
  ]);
  if (hardBlockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_repair',
      blockers: hardBlockers.map((code) => ({ code, message: `Repair gate: ${code}.` })),
    }, { status: 423 });
  }

  const commercialContext = {
    product_truth: bundle.seoPackDraft.product_truth,
    manual_focus: bundle.seoPackDraft.manual_focus,
    keyword_roles: bundle.seoPackDraft.keyword_roles,
  };
  const sourceStructural = validateSeoAgentOutput(currentOutput);
  const sourceCommercial = validateSeoCommercialCopy(currentOutput, commercialContext);
  const sourceKeywordPlacement = validateSeoKeywordPlacement(currentOutput, bundle.seoPackDraft);
  const issues = [
    ...(sourceStructural.issues || []),
    ...(sourceCommercial.issues || []),
    ...(sourceKeywordPlacement.issues || []),
  ];
  if (!issues.length) {
    return NextResponse.json({
      ok: false,
      status: 'repair_not_needed',
      error: 'The displayed draft has no deterministic issue to repair.',
    }, { status: 409 });
  }

  const primaryImageUrl = normalizeImageUrl(
    bundle.aiAgentInput.product?.primary_image_url
      || bundle.seoPackDraft.product_truth?.primary_image_url,
  );
  const readiness = {
    mode: 'READY_FULL',
    allowed_customer_sections: [
      'seo_title', 'h1', 'meta_description', 'intro', 'about_this_piece',
      'why_youll_love_it', 'ideal_for', 'main_description', 'image_alt_candidates',
    ],
    suppressed_customer_sections: [],
  };
  const promptStartedAt = Date.now();
  const compactRepair = buildCompactSeoRepairPrompt(
    bundle.aiAgentInput,
    currentOutput,
    issues,
    { readiness, primaryImageUrl },
  );
  const promptBuildMs = Date.now() - promptStartedAt;
  if (!compactRepair.preflight.ok) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_repair',
      blockers: compactRepair.preflight.issues,
      message: 'The repair brief contains internal or non-customer language. No AI call was made.',
    }, { status: 423 });
  }

  const writerStartedAt = Date.now();
  let generation = await generateSeoDraftWithOpenAi(compactRepair.prompt, {
    primaryImageUrl,
    reasoningEffort: 'low',
    timeoutMs: 120_000,
    maxOutputTokens: 2_500,
  });
  const writerMs = Date.now() - writerStartedAt;
  const primaryKeyword = bundle.seoPackDraft.keyword_roles?.primary?.[0]?.keyword
    || bundle.seoPackDraft.keyword_roles?.primary?.[0]?.keyword_norm
    || null;
  if (generation.output) {
    generation = {
      ...generation,
      output: normalizeCodeOwnedPdpBlockOrder(normalizeSingleSuppliedImageAltCandidate(
        normalizeCodeOwnedSeoCollections(
          normalizeDeterministicSeoIdentity(generation.output, {
            primary_keyword: primaryKeyword,
            selected_events: focusValues(bundle.seoPackDraft.manual_focus?.event),
          }),
        ),
      )),
    };
  }

  const validationStartedAt = Date.now();
  const structural = generation.output
    ? validateSeoAgentOutput(generation.output)
    : validateSeoAgentOutput(null);
  const commercial = generation.output
    ? validateSeoCommercialCopy(generation.output, commercialContext)
    : validateSeoCommercialCopy(null, commercialContext);
  const keywordPlacement = validateSeoKeywordPlacement(generation.output, bundle.seoPackDraft);
  const validationMs = Date.now() - validationStartedAt;
  const finalOk = Boolean(generation.ok && structural.ok && commercial.ok && keywordPlacement.ok);
  const assembledSeoPack = generation.output ? assembleSeoProductPack({
    draft: bundle.seoPackDraft,
    output: generation.output,
    structuralValidation: structural,
    commercialValidation: commercial,
    keywordPlacementValidation: keywordPlacement,
    productTruthBlockers: getSeoPackDraftSaveBlockers(bundle.seoPackDraft),
  }) : null;
  const pipelineTelemetry = {
    contract_version: 'seo_targeted_repair_pipeline_v1',
    product_id: productId,
    repair_attempt: 1,
    failed_scopes: compactRepair.failedScopes,
    db_brief_ms: dbBriefMs,
    prompt_build_ms: promptBuildMs,
    writer_ms: writerMs,
    validation_ms: validationMs,
    total_ms: Date.now() - startedAt,
    writer_calls: 1,
    automatic_retry_calls: 0,
    writer: generation.telemetry,
  };
  console.info('[feya-seo-targeted-repair]', JSON.stringify(pipelineTelemetry));

  return NextResponse.json({
    ok: finalOk,
    status: finalOk
      ? 'targeted_repair_generated_not_saved'
      : generation.ok ? 'targeted_repair_failed_validation' : generation.status,
    blocked: !finalOk,
    message: finalOk
      ? 'One explicit targeted repair passed deterministic QA. Nothing was saved or published.'
      : generation.status === 'upstream_timeout'
        ? 'The one allowed repair exceeded 120 seconds. No retry was attempted.'
        : 'The one allowed repair did not pass deterministic QA. No retry, save or publish action was attempted.',
    openai_generation: sanitizeGeneration(generation),
    generated_draft_output: generation.output || null,
    generated_draft_validation: structural,
    generated_draft_commercial_validation: commercial,
    generated_draft_keyword_placement_validation: keywordPlacement,
    assembled_seo_pack: assembledSeoPack,
    pipeline_telemetry: pipelineTelemetry,
    repair: {
      explicit: true,
      attempt: 1,
      additional_attempt_allowed: false,
      source_issue_count: issues.length,
      failed_scopes: compactRepair.failedScopes,
    },
  }, { status: finalOk ? 200 : generation.ok ? 422 : generation.status === 'upstream_timeout' ? 504 : 502 });
}

function sanitizeGeneration(generation) {
  return {
    ok: generation.ok,
    status: generation.status,
    model: generation.model,
    response_id: generation.response_id || null,
    error: generation.error || null,
    has_output: Boolean(generation.output),
    vision_input: generation.vision_input || null,
    telemetry: generation.telemetry || null,
  };
}

function focusValues(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return unique(values.map((item) => String(item || '').trim()).filter(Boolean));
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeImageUrl(value) {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text) ? text : null;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
