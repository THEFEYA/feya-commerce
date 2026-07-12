// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { getSeoPackDraftSaveBlockers } from '@/lib/seoPackContract';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';

export const dynamic = 'force-dynamic';

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
    route: '/api/admin/seo-engine/draft-generate',
    method: 'POST',
    mode: 'protected_generation_entrypoint',
    status: 'draft_only_openai_ready_when_enabled',
    feature_flag: 'FEYA_SEO_AI_GENERATION_ENABLED',
    readiness_modes: ['READY_FULL', 'READY_PARTIAL', 'BLOCKED'],
    expected_body: {
      product_id: 'canonical_product_id UUID',
      dry_run: true,
      include_mock_output: true,
      enforce_portfolio_strategy: false,
    },
    generation_pipeline: [
      'load versioned SEO Product Truth contract when available',
      'classify READY_FULL, READY_PARTIAL, or BLOCKED',
      'load SeoAgentInputContract',
      'load latest saved draft portfolio/source differentiation strategy when available',
      'attach primary product image server-side when available',
      'generate only SEO fields and left product-description blocks',
      'validate seo_agent_output_v1',
      'keep the complete right PDP panel immutable and storefront-controlled',
      'return AI draft for human review',
      'do not save or publish automatically',
    ],
    guardrails: generationGuardrails(),
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
  const includePrompt = body.include_prompt === true;
  const includeMockOutput = body.include_mock_output !== false;
  const requirePortfolioStrategy = body.enforce_portfolio_strategy === true || body.require_portfolio_strategy === true;
  const generationEnabled = process.env.FEYA_SEO_AI_GENERATION_ENABLED === 'true';
  const hasServerKey = Boolean(process.env.OPENAI_API_KEY);
  const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);

  if (!productId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_product_id',
      error: 'product_id is required.',
      guardrails: generationGuardrails(),
    }, { status: 400 });
  }

  if (hasClientExposedKey) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_client_key_leak_risk',
      error: 'NEXT_PUBLIC_OPENAI_API_KEY must not exist. OpenAI API keys must be server-only.',
      guardrails: generationGuardrails(),
    }, { status: 409 });
  }

  const bundle = await buildSeoBriefContractBundle(productId);
  if (bundle.error) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_missing_supabase_env',
      error: bundle.error,
      guardrails: generationGuardrails(),
    }, { status: 503 });
  }

  if (!bundle.product || !bundle.seoPackDraft || !bundle.aiAgentInput) {
    return NextResponse.json({
      ok: false,
      status: 'product_not_found',
      error: 'Product not found in canonical SEO Product Truth view or Product Focus fallback.',
      product_id: productId,
      guardrails: generationGuardrails(),
    }, { status: 404 });
  }

  const readiness = classifyGenerationReadiness(bundle.seoPackDraft);
  const primaryImageUrl = normalizeImageUrl(
    bundle.aiAgentInput?.product?.primary_image_url
      || bundle.seoPackDraft?.product_truth?.primary_image_url
      || null,
  );
  const promptContract = applyReadinessToPromptContract(
    buildSeoAgentPromptContract(bundle.aiAgentInput),
    readiness,
  );
  const mockOutput = includeMockOutput ? buildMockSeoAgentOutput(bundle.aiAgentInput, bundle.brief) : null;
  const mockValidation = mockOutput ? validateSeoAgentOutput(mockOutput) : null;
  const draftSaveBlockers = getSeoPackDraftSaveBlockers(bundle.seoPackDraft);
  const portfolioStrategy = bundle.aiAgentInput?.portfolio_strategy || null;
  const blockers = collectGenerationBlockers({
    generationEnabled,
    hasServerKey,
    dryRun,
    readiness,
    portfolioStrategy,
    requirePortfolioStrategy,
  });
  const warnings = collectGenerationWarnings({
    readiness,
    seoPackDraft: bundle.seoPackDraft,
    portfolioStrategy,
  });

  const preflight = {
    route: '/api/admin/seo-engine/draft-generate',
    feature_flag: {
      name: 'FEYA_SEO_AI_GENERATION_ENABLED',
      enabled: generationEnabled,
    },
    dry_run: dryRun,
    source: {
      product_id: bundle.seoPackDraft.canonical_product_id,
      matched_etsy_listing_id: bundle.seoPackDraft.matched_etsy_listing_id,
      selected_keyword_count: bundle.keywords.length,
      product_truth_source: bundle.seoPackDraft.product_truth?.product_truth_source || bundle.productTruthSource || null,
      product_truth_warning: bundle.productTruthWarning || null,
      included_component_count: bundle.seoPackDraft.product_truth?.included_components?.length || 0,
      optional_configuration_count: bundle.seoPackDraft.product_truth?.optional_configurations?.length || 0,
      component_review_blocker_count: bundle.seoPackDraft.product_truth?.component_review_blockers?.length || 0,
      primary_image_url: primaryImageUrl,
    },
    readiness: {
      generation_mode: readiness.mode,
      hard_blockers: readiness.hard_blockers,
      section_blockers: readiness.section_blockers,
      allowed_customer_sections: readiness.allowed_customer_sections,
      suppressed_customer_sections: readiness.suppressed_customer_sections,
      can_generate_review_draft: readiness.mode !== 'BLOCKED',
      has_server_openai_key: hasServerKey,
      has_client_exposed_openai_key: hasClientExposedKey,
      can_save_seo_pack_draft: draftSaveBlockers.length === 0,
      seo_pack_draft_blockers: draftSaveBlockers,
      canonical_product_truth_ready: bundle.seoPackDraft.product_truth?.product_truth_source === 'seo_product_truth_v1',
      primary_image_available: Boolean(primaryImageUrl),
      primary_image_sent_to_openai: Boolean(primaryImageUrl) && !dryRun && generationEnabled && hasServerKey,
      portfolio_strategy_loaded: Boolean(portfolioStrategy),
      portfolio_strategy_required: requirePortfolioStrategy,
      output_validator_ready: true,
      mock_output_ready: Boolean(mockOutput),
      mock_output_validator_passed: Boolean(mockValidation?.ok),
      right_panel_generation_enabled: false,
      real_openai_draft_only_ready: generationEnabled
        && hasServerKey
        && !dryRun
        && readiness.mode !== 'BLOCKED'
        && Boolean(portfolioStrategy || !requirePortfolioStrategy),
    },
    generation_warnings: warnings,
    prompt_contract_summary: {
      ...summarizeSeoAgentPromptContract(promptContract),
      readiness_mode: readiness.mode,
      right_panel_mode: 'immutable_storefront_owned',
      primary_image_url_in_prompt_context: Boolean(primaryImageUrl),
    },
    prompt_contract: includePrompt ? promptContract : undefined,
    portfolio_strategy: portfolioStrategy,
    mock_draft_output: mockOutput,
    mock_draft_validation: mockValidation,
    seo_pack_draft: bundle.seoPackDraft,
    ai_agent_input: bundle.aiAgentInput,
    guardrails: generationGuardrails(portfolioStrategy, readiness),
  };

  if (blockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers,
      mode: 'preflight_only',
      ...preflight,
    }, { status: 423 });
  }

  const generation = await generateSeoDraftWithOpenAi(promptContract, { primaryImageUrl });
  const validation = generation.output ? validateSeoAgentOutput(generation.output) : validateSeoAgentOutput(null);

  if (!generation.ok || !validation.ok) {
    return NextResponse.json({
      ok: false,
      status: generation.ok ? 'generated_output_failed_validation' : generation.status,
      blocked: true,
      mode: 'openai_draft_only_not_saved',
      message: generation.ok
        ? 'OpenAI returned JSON, but deterministic validation blocked it. Nothing was saved or published.'
        : 'OpenAI draft generation failed. Nothing was saved or published.',
      openai_generation: sanitizeGeneration(generation),
      generated_draft_validation: validation,
      ...preflight,
    }, { status: generation.ok ? 422 : 502 });
  }

  const reviewDraft = sanitizeOutputForReadiness(generation.output, readiness);
  return NextResponse.json({
    ok: true,
    status: readiness.mode === 'READY_PARTIAL'
      ? 'ai_partial_draft_generated_not_saved'
      : 'ai_full_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_draft_only_not_saved',
    message: readiness.mode === 'READY_PARTIAL'
      ? 'OpenAI generated valid left-side product SEO copy. The storefront-owned What’s Included block remains hidden until component mapping is confirmed. Nothing was saved or published.'
      : 'OpenAI generated valid left-side product SEO copy. The fixed right PDP panel was not generated or changed. Nothing was saved or published.',
    openai_generation: sanitizeGeneration(generation),
    generated_draft_output: reviewDraft,
    generated_draft_validation: validation,
    ...preflight,
  }, { status: 200 });
}

function classifyGenerationReadiness(draft) {
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
    truth.source_description_fragment,
  ].some((value) => Boolean(String(value || '').trim()))
    || Boolean(truth.source_variations?.length)
    || Boolean(truth.option_price_rows?.length);

  if (!draft) hardBlockers.push('missing_seo_pack_draft');
  if (!draft?.canonical_product_id) hardBlockers.push('missing_canonical_product_id');
  if (!truth?.title?.trim()) hardBlockers.push('missing_product_title');
  if (!truth?.slug?.trim()) hardBlockers.push('missing_product_slug');
  if (!identityEvidence) hardBlockers.push('insufficient_product_identity_evidence');
  if (!usefulKeywords.length) hardBlockers.push('missing_primary_or_secondary_keyword');
  if ((draft?.metrics_status?.validated_count || 0) < 1) hardBlockers.push('missing_validated_keyword_metric');
  if (draft?.keyword_selection?.status !== 'confirmed') hardBlockers.push('keyword_selection_not_human_confirmed');
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');
  if (draft?.qa_checks?.validated_metrics === 'blocker') hardBlockers.push('qa_blocker_validated_metrics');

  const hasConfirmedComponents = Boolean((truth.included_components || []).length || (truth.known_components || []).length);
  const hasUnresolvedComponents = Boolean((truth.unresolved_component_facts || []).length);
  const hasComponentReviewBlockers = Boolean((truth.component_review_blockers || []).length);
  const hasCanonicalTruth = truth.product_truth_source === 'seo_product_truth_v1';
  const compositionReady = hasCanonicalTruth
    && hasConfirmedComponents
    && !hasUnresolvedComponents
    && !hasComponentReviewBlockers;

  if (!hasCanonicalTruth) sectionBlockers.push('composition_missing_canonical_product_truth');
  if (!hasConfirmedComponents) sectionBlockers.push('composition_missing_confirmed_components');
  if (hasUnresolvedComponents) sectionBlockers.push('composition_has_unresolved_facts');
  if (hasComponentReviewBlockers) sectionBlockers.push('composition_has_review_blockers');

  if (hardBlockers.length) {
    return {
      mode: 'BLOCKED',
      hard_blockers: unique(hardBlockers),
      section_blockers: unique(sectionBlockers),
      allowed_customer_sections: [],
      suppressed_customer_sections: [...GENERATED_SECTIONS, 'right_panel_whats_included'],
    };
  }

  return {
    mode: compositionReady ? 'READY_FULL' : 'READY_PARTIAL',
    hard_blockers: [],
    section_blockers: compositionReady ? [] : unique(sectionBlockers),
    allowed_customer_sections: GENERATED_SECTIONS,
    suppressed_customer_sections: compositionReady ? [] : ['right_panel_whats_included'],
  };
}

function applyReadinessToPromptContract(promptContract, readiness) {
  const appendix = [
    '',
    'GENERATION READINESS CONTRACT:',
    `- generation_mode: ${readiness.mode}`,
    `- allowed_customer_sections: ${readiness.allowed_customer_sections.join(', ') || 'none'}`,
    `- suppressed_customer_sections: ${readiness.suppressed_customer_sections.join(', ') || 'none'}`,
    `- section_blockers: ${readiness.section_blockers.join(', ') || 'none'}`,
    '- Generate only SEO fields, image ALT candidates and the four required left_description blocks.',
    '- Never generate, rewrite, paraphrase or propose wording for the fixed right PDP panel.',
    '- Never generate a What’s Included placeholder. The storefront renders or hides that block from confirmed configuration mapping.',
    '- Do not state which pieces are included when composition is unresolved.',
    '- Do not mention prices in customer-facing copy.',
    readiness.mode === 'READY_PARTIAL' ? '- Set output status to needs_review.' : '- Return draft or needs_review according to remaining QA warnings.',
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${appendix}`,
    user_prompt: `${promptContract.user_prompt}\n${appendix}`,
    guardrails: [...(promptContract.guardrails || []), appendix],
  };
}

function collectGenerationBlockers({ generationEnabled, hasServerKey, dryRun, readiness, portfolioStrategy, requirePortfolioStrategy }) {
  const blockers = [];
  if (!generationEnabled) blockers.push({ code: 'feature_flag_disabled', message: 'FEYA_SEO_AI_GENERATION_ENABLED is not true.' });
  if (!hasServerKey) blockers.push({ code: 'missing_openai_key', message: 'OPENAI_API_KEY is missing on the server.' });
  if (dryRun) blockers.push({ code: 'dry_run_only', message: 'dry_run is enabled, so no model call or save is allowed.' });
  readiness.hard_blockers.forEach((code) => blockers.push({ code, message: blockerMessage(code) }));
  if (requirePortfolioStrategy && !portfolioStrategy) {
    blockers.push({ code: 'portfolio_strategy_missing', message: 'Portfolio/source differentiation strategy was required but is missing.' });
  }
  return blockers;
}

function collectGenerationWarnings({ readiness, seoPackDraft, portfolioStrategy }) {
  const warnings = readiness.section_blockers.map((code) => ({ code, message: blockerMessage(code) }));
  if (seoPackDraft?.similarity_check?.status === 'not_checked') {
    warnings.push({ code: 'similarity_not_checked', message: 'Similarity/cannibalization remains a publish-readiness gate.' });
  }
  if (!portfolioStrategy) {
    warnings.push({ code: 'portfolio_strategy_missing', message: 'No portfolio differentiation strategy is loaded.' });
  }
  return warnings;
}

function sanitizeOutputForReadiness(output, readiness) {
  const safe = JSON.parse(JSON.stringify(output || {}));
  if (readiness.mode === 'READY_PARTIAL') safe.status = 'needs_review';
  safe.suppressed_sections = readiness.suppressed_customer_sections;
  safe.generation_readiness = readiness.mode;
  safe.generation_notes = unique([
    ...(Array.isArray(safe.generation_notes) ? safe.generation_notes : []),
    ...(readiness.mode === 'READY_PARTIAL'
      ? ['The storefront-owned What’s Included block remains hidden until composition mapping is confirmed.']
      : []),
    ...readiness.section_blockers,
  ]);
  return safe;
}

function blockerMessage(code) {
  const messages = {
    missing_canonical_product_id: 'Canonical product id is missing.',
    missing_product_title: 'Product title is missing.',
    missing_product_slug: 'Product slug is missing.',
    missing_primary_or_secondary_keyword: 'No primary or secondary product keyword passed the decision pipeline.',
    missing_validated_keyword_metric: 'No keyword has a trusted metric source and freshness snapshot.',
    insufficient_product_identity_evidence: 'The product lacks enough identity, material, visual or source evidence for a safe draft.',
    composition_missing_canonical_product_truth: 'The storefront-owned What’s Included block is hidden because canonical Product Truth is unavailable.',
    composition_missing_confirmed_components: 'The storefront-owned What’s Included block is hidden because no included component is confirmed.',
    composition_has_unresolved_facts: 'The storefront-owned What’s Included block is hidden because component facts remain unresolved.',
    composition_has_review_blockers: 'The storefront-owned What’s Included block is hidden because component mappings require review.',
  };
  return messages[code] || `SEO generation gate: ${code}.`;
}

function sanitizeGeneration(generation) {
  return {
    ok: generation.ok,
    status: generation.status,
    model: generation.model,
    response_id: generation.response_id || null,
    has_output: Boolean(generation.output),
    vision_input: generation.vision_input || null,
    error: generation.error || null,
  };
}

function generationGuardrails(portfolioStrategy?: unknown, readiness?: unknown) {
  return [
    'Generation is disabled unless FEYA_SEO_AI_GENERATION_ENABLED=true.',
    'Default request mode is dry_run=true.',
    'No OpenAI call is made while hard blockers exist.',
    'OpenAI generates only SEO fields, ALT candidates and left product-description blocks.',
    'The complete right PDP information panel is immutable code-owned storefront content.',
    'What’s Included is rendered only from confirmed configuration mapping and is hidden when unresolved.',
    'No Supabase write, product mutation, publish or apply action is performed by this route.',
    'Model output must pass deterministic validation before any future save.',
    'Product truth, metric provenance and QA gates outrank keyword volume.',
    readiness ? `Current readiness mode: ${readiness.mode}.` : 'Readiness is calculated per product.',
    portfolioStrategy ? 'Portfolio/source differentiation strategy is loaded.' : 'Portfolio/source differentiation remains a publish-readiness gate.',
  ];
}

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeImageUrl(value?: string | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || !/^https?:\/\//i.test(text)) return null;
  return text;
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
