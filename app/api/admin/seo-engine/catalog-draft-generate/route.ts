// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import {
  buildCompactSeoWriterPrompt,
  buildDeterministicSeoClaimPlan,
} from '@/lib/seoClaimPlanV2';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { validateSeoKeywordPlacement } from '@/lib/seoKeywordPlacementValidator';
import { assembleSeoProductPack } from '@/lib/seoFullPackAssembler';
import {
  getSeoGenerationProductTruthBlockers,
  getSeoKeywordSelectionBlockers,
  getSeoPackDraftSaveBlockers,
} from '@/lib/seoPackContract';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';
import {
  normalizeCodeOwnedSeoCollections,
  normalizeCodeOwnedPdpBlockOrder,
  normalizeBodyPrimaryVariation,
  normalizeDeterministicSeoIdentity,
  normalizeImageAltPrimaryVariation,
  normalizeMainDescriptionSentenceBoundaries,
  normalizeRepeatedAboutFinishClause,
  normalizeSingleSuppliedImageAltCandidate,
} from '@/lib/seoEditorialCandidateSelection';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const GENERATED_SECTIONS = [
  'seo_title',
  'h1',
  'meta_description',
  'intro',
  'about_this_piece',
  'why_youll_love_it',
  'ideal_for',
  'main_description',
  'image_alt_candidates',
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/catalog-draft-generate',
    method: 'POST',
    mode: 'catalog_review_draft_only',
    expected_body: {
      product_id: 'canonical_product_id UUID',
      enforce_portfolio_strategy: false,
    },
    writes: false,
    publish: false,
    apply: false,
    generation_passes: 1,
    automatic_retries: 0,
    automatic_editorial_rewrite_passes: 0,
    writer_model: process.env.FEYA_SEO_OPENAI_MODEL || 'gpt-5.4-mini',
    writer_reasoning_effort: 'low',
    writer_timeout_ms: 120000,
  });
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const requirePortfolioStrategy = body.enforce_portfolio_strategy === true;
  const generationEnabled = process.env.FEYA_SEO_AI_GENERATION_ENABLED === 'true';
  const hasServerKey = Boolean(process.env.OPENAI_API_KEY);
  const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);

  if (!productId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_product_id',
      blocked: true,
      error: 'product_id is required.',
    }, { status: 400 });
  }

  if (hasClientExposedKey) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_client_key_leak_risk',
      blocked: true,
      error: 'A client-exposed OpenAI key is present. Generation is disabled.',
    }, { status: 409 });
  }

  if (!generationEnabled || !hasServerKey) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers: [
        ...(!generationEnabled ? [{ code: 'feature_flag_disabled', message: 'FEYA_SEO_AI_GENERATION_ENABLED is not true.' }] : []),
        ...(!hasServerKey ? [{ code: 'missing_openai_key', message: 'OPENAI_API_KEY is missing on the server.' }] : []),
      ],
    }, { status: 423 });
  }

  const briefStartedAt = Date.now();
  const bundle = await buildSeoBriefContractBundle(productId);
  const dbBriefMs = Date.now() - briefStartedAt;
  if (bundle.error) {
    return NextResponse.json({
      ok: false,
      status: 'seo_contract_load_failed',
      blocked: true,
      error: bundle.error,
      product_id: productId,
    }, { status: 503 });
  }

  if (!bundle.product || !bundle.seoPackDraft || !bundle.aiAgentInput) {
    return NextResponse.json({
      ok: false,
      status: 'product_not_found',
      blocked: true,
      error: 'Product not found in canonical SEO Product Truth or Product Focus fallback.',
      product_id: productId,
    }, { status: 404 });
  }

  const preflightClaimPlan = buildDeterministicSeoClaimPlan(bundle.aiAgentInput);
  const readiness = classifyReadiness(bundle.seoPackDraft, preflightClaimPlan.blockers);
  const portfolioStrategy = bundle.aiAgentInput?.portfolio_strategy || null;
  const hardBlockers = [...readiness.hard_blockers];
  if (requirePortfolioStrategy && !portfolioStrategy) hardBlockers.push('portfolio_strategy_missing');

  const primaryImageUrl = normalizeImageUrl(
    bundle.aiAgentInput?.product?.primary_image_url
      || bundle.seoPackDraft?.product_truth?.primary_image_url
      || null,
  );
  const promptStartedAt = Date.now();
  const compactWriter = buildCompactSeoWriterPrompt(bundle.aiAgentInput, {
    readiness,
    primaryImageUrl,
  });
  if (!compactWriter.preflight.ok) {
    hardBlockers.push(...compactWriter.preflight.issues.map((issue) => issue.code));
    readiness.mode = 'BLOCKED';
    readiness.hard_blockers = unique(hardBlockers);
    readiness.allowed_customer_sections = [];
    readiness.suppressed_customer_sections = [...GENERATED_SECTIONS, 'right_panel_whats_included'];
  }
  const promptContract = compactWriter.prompt;
  const promptBuildMs = Date.now() - promptStartedAt;
  const commercialContext = {
    product_truth: bundle.seoPackDraft.product_truth,
    manual_focus: bundle.seoPackDraft.manual_focus,
    keyword_roles: bundle.seoPackDraft.keyword_roles,
  };
  const shared = buildSharedPayload(
    bundle,
    readiness,
    promptContract,
    primaryImageUrl,
    portfolioStrategy,
    compactWriter,
  );

  if (hardBlockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers: unique(hardBlockers).map((code) => ({
        code,
        message: compactWriter.preflight.issues.find((issue) => issue.code === code)?.message
          || blockerMessage(code),
      })),
      ...shared,
    }, { status: 423 });
  }

  const primaryKeyword = bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword
    || bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword_norm
    || null;
  const selectedEvents = normalizeFocusValues(bundle.seoPackDraft?.manual_focus?.event);
  const identityNormalizationContext = {
    primary_keyword: primaryKeyword,
    selected_events: selectedEvents,
    body_identity_variant: preflightClaimPlan.body_identity_variant_en,
  };
  const writerStartedAt = Date.now();
  let firstGeneration = await generateSeoDraftWithOpenAi(promptContract, {
    primaryImageUrl,
    reasoningEffort: 'low',
    timeoutMs: 120_000,
    maxOutputTokens: 2_500,
  });
  const writerMs = Date.now() - writerStartedAt;
  if (firstGeneration.output) {
    firstGeneration = {
      ...firstGeneration,
      output: normalizeCodeOwnedPdpBlockOrder(normalizeSingleSuppliedImageAltCandidate(
        normalizeImageAltPrimaryVariation(
          normalizeMainDescriptionSentenceBoundaries(
            normalizeRepeatedAboutFinishClause(
              normalizeBodyPrimaryVariation(
                normalizeCodeOwnedSeoCollections(
                  normalizeDeterministicSeoIdentity(firstGeneration.output, identityNormalizationContext),
                ),
                identityNormalizationContext,
              ),
            ),
          ),
          identityNormalizationContext,
        ),
      )),
    };
  }
  const validationStartedAt = Date.now();
  const firstStructural = firstGeneration.output
    ? validateSeoAgentOutput(firstGeneration.output)
    : validateSeoAgentOutput(null);
  const firstCommercial = firstGeneration.output
    ? validateSeoCommercialCopy(firstGeneration.output, commercialContext)
    : validateSeoCommercialCopy(null, commercialContext);
  const firstKeywordPlacement = validateSeoKeywordPlacement(firstGeneration.output, bundle.seoPackDraft);
  const validationMs = Date.now() - validationStartedAt;
  const selectedGeneration = firstGeneration;
  const selectedStructural = firstStructural;
  const selectedCommercial = firstCommercial;
  const selectedKeywordPlacement = firstKeywordPlacement;

  const finalDraft = selectedGeneration.output
    ? sanitizeOutputForReadiness(selectedGeneration.output, readiness)
    : null;
  const assembledSeoPack = finalDraft ? assembleSeoProductPack({
    draft: bundle.seoPackDraft,
    output: finalDraft,
    structuralValidation: selectedStructural,
    commercialValidation: selectedCommercial,
    keywordPlacementValidation: selectedKeywordPlacement,
    productTruthBlockers: getSeoPackDraftSaveBlockers(bundle.seoPackDraft),
  }) : null;
  const finalOk = Boolean(selectedGeneration.ok && selectedStructural.ok && selectedCommercial.ok && selectedKeywordPlacement.ok);
  const pipelineTelemetry = {
    contract_version: 'seo_generation_pipeline_v2',
    product_id: productId,
    db_brief_ms: dbBriefMs,
    prompt_build_ms: promptBuildMs,
    writer_ms: writerMs,
    validation_ms: validationMs,
    total_ms: Date.now() - requestStartedAt,
    normal_writer_calls: 1,
    automatic_retry_calls: 0,
    automatic_editor_calls: 0,
    writer: firstGeneration.telemetry,
  };
  console.info('[feya-seo-generation]', JSON.stringify(pipelineTelemetry));
  const generationAttempts = {
    first_pass: {
      openai: sanitizeGeneration(firstGeneration),
      structural_validation: firstStructural,
      commercial_validation: firstCommercial,
      keyword_placement_validation: firstKeywordPlacement,
    },
    targeted_repair: {
      attempted: false,
      selected: false,
      reason: 'manual_explicit_action_only',
    },
    automatic_editorial_review: {
      attempted: false,
      selected: false,
      reason: 'removed_from_normal_generation_pipeline',
    },
    automatic_retry: {
      attempted: false,
      selected: false,
      reason: 'disabled',
    },
  };

  if (!finalOk) {
    return NextResponse.json({
      ok: false,
      status: selectedGeneration.ok ? 'generated_output_failed_validation' : selectedGeneration.status,
      blocked: true,
      mode: 'openai_review_draft_not_saved',
      message: selectedGeneration.ok
        ? 'OpenAI returned a review draft, but deterministic structure or commercial QA still blocks approval. The best draft is shown for inspection. Nothing was saved or published.'
        : selectedGeneration.status === 'upstream_timeout'
          ? 'The single writer exceeded its 120-second upstream limit. No retry, editor, save or publish action was attempted.'
          : 'OpenAI draft generation failed. No retry was attempted and nothing was saved or published.',
      openai_generation: sanitizeGeneration(selectedGeneration),
      generated_draft_output: finalDraft,
      generated_draft_validation: selectedStructural,
      generated_draft_commercial_validation: selectedCommercial,
      generated_draft_keyword_placement_validation: selectedKeywordPlacement,
      assembled_seo_pack: assembledSeoPack,
      generation_attempts: generationAttempts,
      pipeline_telemetry: pipelineTelemetry,
      ...shared,
    }, { status: selectedGeneration.ok ? 422 : selectedGeneration.status === 'upstream_timeout' ? 504 : 502 });
  }

  return NextResponse.json({
    ok: true,
    status: 'catalog_full_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_review_draft_not_saved',
    message: 'The single bounded writer produced a catalog review draft that passed deterministic QA. Nothing was saved or published.',
    openai_generation: sanitizeGeneration(selectedGeneration),
    generated_draft_output: finalDraft,
    generated_draft_validation: selectedStructural,
    generated_draft_commercial_validation: selectedCommercial,
    generated_draft_keyword_placement_validation: selectedKeywordPlacement,
    assembled_seo_pack: assembledSeoPack,
    generation_attempts: generationAttempts,
    pipeline_telemetry: pipelineTelemetry,
    ...shared,
  });
}

function classifyReadiness(draft, additionalBlockers = []) {
  const hardBlockers = [];
  const sectionBlockers = [];
  const truth = draft?.product_truth || {};
  const usefulKeywords = [
    ...(draft?.keyword_roles?.primary || []),
    ...(draft?.keyword_roles?.secondary || []),
  ].filter((item) => Boolean(item?.keyword || item?.keyword_norm));
  const identityEvidence = [
    truth.category,
    truth.material,
    truth.color,
    truth.world,
    truth.primary_image_url,
    ...(truth.sellable_offer?.component_labels || []),
  ].some((value) => Boolean(String(value || '').trim()))
    || Boolean(truth.sellable_offer?.signature);

  if (!draft?.canonical_product_id) hardBlockers.push('missing_canonical_product_id');
  if (!truth?.title?.trim()) hardBlockers.push('missing_product_title');
  if (!truth?.slug?.trim()) hardBlockers.push('missing_product_slug');
  if (!identityEvidence) hardBlockers.push('insufficient_product_identity_evidence');
  if (!usefulKeywords.length) hardBlockers.push('missing_primary_or_secondary_keyword');
  if ((draft?.metrics_status?.validated_count || 0) < 1) hardBlockers.push('missing_validated_keyword_metric');
  if (draft?.keyword_selection?.status !== 'confirmed') hardBlockers.push('keyword_selection_not_human_confirmed');
  hardBlockers.push(...getSeoKeywordSelectionBlockers(draft));
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');
  if (draft?.qa_checks?.validated_metrics === 'blocker') hardBlockers.push('qa_blocker_validated_metrics');
  const compositionBlockers = getSeoGenerationProductTruthBlockers(draft);
  hardBlockers.push(...compositionBlockers);
  hardBlockers.push(...additionalBlockers);

  sectionBlockers.push(...compositionBlockers);

  return {
    mode: hardBlockers.length ? 'BLOCKED' : 'READY_FULL',
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    allowed_customer_sections: hardBlockers.length ? [] : GENERATED_SECTIONS,
    suppressed_customer_sections: hardBlockers.length
      ? [...GENERATED_SECTIONS, 'right_panel_whats_included']
      : [],
  };
}

function sanitizeOutputForReadiness(output, readiness) {
  const safe = JSON.parse(JSON.stringify(output || {}));
  safe.generation_readiness = readiness.mode;
  safe.suppressed_sections = readiness.suppressed_customer_sections;
  safe.generation_notes = unique([
    ...(Array.isArray(safe.generation_notes) ? safe.generation_notes : []),
    ...readiness.section_blockers,
  ]);
  return safe;
}

function buildSharedPayload(
  bundle,
  readiness,
  promptContract,
  primaryImageUrl,
  portfolioStrategy,
  compactWriter,
) {
  return {
    source: {
      product_id: bundle.seoPackDraft.canonical_product_id,
      matched_etsy_listing_id: bundle.seoPackDraft.matched_etsy_listing_id,
      product_title: bundle.seoPackDraft.product_truth?.title || null,
      product_slug: bundle.seoPackDraft.product_truth?.slug || null,
      product_truth_source: bundle.seoPackDraft.product_truth?.product_truth_source || bundle.productTruthSource || null,
      selected_keyword_count: bundle.keywords?.length || 0,
      primary_image_url: primaryImageUrl,
    },
    readiness,
    keyword_bank_diagnostics: buildKeywordDiagnostics(bundle.seoPackDraft),
    prompt_contract_summary: {
      ...summarizeSeoAgentPromptContract(promptContract),
      readiness_mode: readiness.mode,
      right_panel_mode: 'immutable_storefront_owned',
      generation_passes: 1,
      automatic_retry_passes: 0,
      automatic_editorial_rewrite_passes: 0,
      portfolio_strategy_loaded: Boolean(portfolioStrategy),
    },
    writer_brief_summary: {
      contract_version: compactWriter.brief.contract_version,
      family_profile: compactWriter.brief.claim_plan.family_profile,
      current_confirmed_writer_fact_count: compactWriter.evidence.current_confirmed_facts
        .filter((item) => item.publishable && item.placement === 'writer').length,
      excluded_legacy_fact_codes: compactWriter.evidence.legacy_candidate_facts.map((item) => item.fact_code),
      deterministic_claim_count: compactWriter.brief.claim_plan.claims.length,
      claim_plan_blockers: compactWriter.brief.claim_plan.blockers,
      editorial_memory_version: compactWriter.brief.editorial_reference,
      writer_brief_preflight_ok: compactWriter.preflight.ok,
      ideal_for_portrait_count: compactWriter.brief.ideal_for_portraits.length,
      code_owned_sections: compactWriter.brief.code_owned_sections,
    },
    seo_pack_draft: bundle.seoPackDraft,
    guardrails: [
      'No Supabase write was performed.',
      'No Listing Master decision was created or updated.',
      'Only validated keyword snapshots already present in the SEO contract may be used.',
      'Shoulder singular/plural grammar remains source-controlled and does not create a separate DNA family.',
      'The fixed right PDP panel is not generated or changed.',
      'No draft save, apply or publish action is performed.',
    ],
  };
}

function buildKeywordDiagnostics(draft) {
  const primary = draft?.keyword_roles?.primary || [];
  const secondary = draft?.keyword_roles?.secondary || [];
  const selected = [...primary, ...secondary];
  return {
    bank_rows_found: selected.length,
    trusted_metric_rows: selected.filter((item) => Number(item?.avg_monthly_searches || 0) > 0 && item?.competition).length,
    useful_candidate_rows: selected.length,
    useful_validated_rows: Number(draft?.metrics_status?.validated_count || 0),
    selected_keywords: selected.slice(0, 12).map((item) => ({
      keyword: item?.keyword || item?.keyword_norm || null,
      role: item?.role || item?.placement || null,
      avg_monthly_searches: item?.avg_monthly_searches ?? null,
      competition: item?.competition ?? null,
      metric_source: item?.metric_source ?? null,
      last_checked: item?.last_checked ?? null,
    })),
  };
}

function blockerMessage(code) {
  const messages = {
    feature_flag_disabled: 'FEYA_SEO_AI_GENERATION_ENABLED is not true.',
    missing_openai_key: 'OPENAI_API_KEY is missing on the server.',
    missing_canonical_product_id: 'Canonical product id is missing.',
    missing_product_title: 'Product title is missing.',
    missing_product_slug: 'Product slug is missing.',
    insufficient_product_identity_evidence: 'Product identity evidence is insufficient.',
    claim_plan_missing_about_fact: 'Generation is blocked because About this piece has no distinct confirmed design, material, finish or color fact.',
    claim_plan_insufficient_distinct_why_claims: 'Generation is blocked because fewer than three distinct confirmed feature-to-outcome benefits are available for Why you’ll love it.',
    missing_primary_or_secondary_keyword: 'No relevant primary or secondary keyword passed the decision pipeline.',
    missing_validated_keyword_metric: 'No selected keyword has a trusted validated metric snapshot.',
    portfolio_strategy_missing: 'Portfolio differentiation strategy was required but is missing.',
    primary_keyword_scope_mismatch_for_multi_component_product: 'The confirmed product contains multiple pieces, but Primary names only one component. Return to Listing Master and choose an outfit, set, costume, ensemble or attire query as Primary; keep component queries Secondary.',
    composition_missing_canonical_product_truth: 'Generation is blocked because canonical Product Truth is unavailable.',
    composition_missing_confirmed_components: 'Generation is blocked because the exact included components are not confirmed.',
    composition_has_unresolved_facts: 'Generation is blocked because component facts remain unresolved.',
    composition_has_review_blockers: 'Generation is blocked because component mappings require human review.',
    composition_missing_source_configuration_evidence: 'Generation is blocked because the source listing does not provide configuration evidence.',
  };
  return messages[code] || `SEO generation gate: ${code}.`;
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

function normalizeImageUrl(value) {
  const text = String(value || '').trim();
  if (!text || !/^https?:\/\//i.test(text)) return null;
  return text;
}

function normalizeFocusValues(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return unique(values);
}

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
