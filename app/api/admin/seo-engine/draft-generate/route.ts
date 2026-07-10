// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { getSeoPackDraftSaveBlockers } from '@/lib/seoPackContract';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-generate',
    method: 'POST',
    mode: 'protected_generation_entrypoint',
    status: 'draft_only_openai_ready_when_enabled',
    feature_flag: 'FEYA_SEO_AI_GENERATION_ENABLED',
    guardrails: generationGuardrails(),
    expected_body: {
      product_id: 'canonical_product_id UUID',
      dry_run: true,
      include_mock_output: true,
    },
    generation_pipeline: [
      'load versioned SEO Product Truth contract',
      'load SeoAgentInputContract',
      'load latest saved draft portfolio/source differentiation strategy when available',
      'attach primary product image to server-side OpenAI request when available',
      'build seo_agent_prompt_v1 with visual truth and configuration rules',
      'seed optional mock seo_agent_output_v1 from SeoPilotBrief.draftPreview during dry-run',
      'call OpenAI only when feature flag, key, product truth, metric provenance, portfolio strategy, and gates pass',
      'validate seo_agent_output_v1',
      'return AI draft for human review',
      'do not save automatically in this route',
      'do not publish automatically in this route',
    ],
    note: 'This route is intentionally gated. Real OpenAI generation is draft-only and never publishes or saves automatically.',
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
  const includePrompt = body.include_prompt === true;
  const includeMockOutput = body.include_mock_output !== false;
  const requirePortfolioStrategy = body.require_portfolio_strategy !== false;
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

  const primaryImageUrl = normalizeImageUrl(bundle.aiAgentInput?.product?.primary_image_url || bundle.seoPackDraft?.product_truth?.primary_image_url || null);
  const promptContract = buildSeoAgentPromptContract(bundle.aiAgentInput);
  const mockOutput = includeMockOutput ? buildMockSeoAgentOutput(bundle.aiAgentInput, bundle.brief) : null;
  const mockOutputValidation = mockOutput ? validateSeoAgentOutput(mockOutput) : null;
  const outputValidationGate = validateSeoAgentOutput(null);
  const draftSaveBlockers = getSeoPackDraftSaveBlockers(bundle.seoPackDraft);
  const canSaveDraft = draftSaveBlockers.length === 0;
  const portfolioStrategy = bundle.aiAgentInput?.portfolio_strategy || null;
  const blockers = collectGenerationBlockers({
    generationEnabled,
    hasServerKey,
    dryRun,
    draftSaveBlockers,
    seoPackDraft: bundle.seoPackDraft,
    portfolioStrategy,
    requirePortfolioStrategy,
  });
  const preflightPayload = {
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
      available_variant_count: bundle.seoPackDraft.product_truth?.available_variants?.length || 0,
      component_review_blocker_count: bundle.seoPackDraft.product_truth?.component_review_blockers?.length || 0,
      source_variation_count: bundle.seoPackDraft.product_truth?.source_variations?.length || 0,
      option_price_row_count: bundle.seoPackDraft.product_truth?.option_price_rows?.length || 0,
      has_source_description_fragment: Boolean(bundle.seoPackDraft.product_truth?.source_description_fragment),
      latest_saved_draft_id: bundle.latestSavedDraftContext?.id || null,
      latest_saved_draft_status: bundle.latestSavedDraftContext?.status || null,
      latest_saved_draft_review_status: bundle.latestSavedDraftContext?.review_status || null,
      primary_image_url: primaryImageUrl,
    },
    readiness: {
      has_server_openai_key: hasServerKey,
      has_client_exposed_openai_key: hasClientExposedKey,
      can_save_seo_pack_draft: canSaveDraft,
      seo_pack_draft_blockers: draftSaveBlockers,
      canonical_product_truth_ready: bundle.seoPackDraft.product_truth?.product_truth_source === 'seo_product_truth_v1',
      prompt_contract_ready: true,
      primary_image_available: Boolean(primaryImageUrl),
      primary_image_sent_to_openai: Boolean(primaryImageUrl) && !dryRun && generationEnabled && hasServerKey,
      visual_truth_rules_in_prompt: true,
      configuration_truth_rules_in_prompt: true,
      portfolio_strategy_loaded: Boolean(portfolioStrategy),
      portfolio_strategy_required: requirePortfolioStrategy,
      portfolio_strategy_classification: portfolioStrategy?.classification || null,
      portfolio_strategy_generation_mode: portfolioStrategy?.recommended_generation_mode || null,
      output_validator_ready: true,
      mock_output_ready: Boolean(mockOutput),
      mock_output_seed: bundle.brief ? 'seo_brief_draft_preview' : 'fallback_mock',
      mock_output_validator_passed: Boolean(mockOutputValidation?.ok),
      real_openai_draft_only_ready: generationEnabled
        && hasServerKey
        && !dryRun
        && !hasClientExposedKey
        && canSaveDraft
        && Boolean(portfolioStrategy || !requirePortfolioStrategy),
    },
    prompt_contract_summary: {
      ...summarizeSeoAgentPromptContract(promptContract),
      portfolio_strategy_in_prompt: Boolean(portfolioStrategy),
      visual_truth_rules_in_prompt: true,
      configuration_truth_rules_in_prompt: true,
      primary_image_url_in_prompt_context: Boolean(primaryImageUrl),
    },
    prompt_contract: includePrompt ? promptContract : undefined,
    portfolio_strategy: portfolioStrategy,
    output_validation_gate: {
      status: 'ready',
      dry_run_null_output_result: outputValidationGate,
      note: 'The validator is wired. It will validate the real model JSON before any future draft save.',
    },
    mock_draft_output: mockOutput,
    mock_draft_validation: mockOutputValidation,
    seo_pack_draft: bundle.seoPackDraft,
    ai_agent_input: bundle.aiAgentInput,
    guardrails: generationGuardrails(portfolioStrategy),
  };

  if (blockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers,
      mode: 'preflight_only',
      ...preflightPayload,
    }, { status: 423 });
  }

  const generation = await generateSeoDraftWithOpenAi(promptContract, { primaryImageUrl });
  const generatedValidation = generation.output ? validateSeoAgentOutput(generation.output) : validateSeoAgentOutput(null);

  if (!generation.ok || !generatedValidation.ok) {
    return NextResponse.json({
      ok: false,
      status: generation.ok ? 'generated_output_failed_validation' : generation.status,
      blocked: true,
      mode: 'openai_draft_only_not_saved',
      message: generation.ok ? 'OpenAI returned JSON, but validator blocked it. Nothing was saved or published.' : 'OpenAI draft generation failed. Nothing was saved or published.',
      openai_generation: sanitizeGeneration(generation),
      generated_draft_validation: generatedValidation,
      ...preflightPayload,
    }, { status: generation.ok ? 422 : 502 });
  }

  return NextResponse.json({
    ok: true,
    status: 'ai_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_draft_only_not_saved',
    message: 'OpenAI generated a valid review draft. It was not saved, published, or applied to product/storefront tables.',
    openai_generation: sanitizeGeneration(generation),
    generated_draft_output: generation.output,
    generated_draft_validation: generatedValidation,
    ...preflightPayload,
  }, { status: 200 });
}

function collectGenerationBlockers({ generationEnabled, hasServerKey, dryRun, draftSaveBlockers, seoPackDraft, portfolioStrategy, requirePortfolioStrategy }) {
  const blockers = [];
  if (!generationEnabled) blockers.push({ code: 'feature_flag_disabled', message: 'FEYA_SEO_AI_GENERATION_ENABLED is not true.' });
  if (!hasServerKey) blockers.push({ code: 'missing_openai_key', message: 'OPENAI_API_KEY is missing on the server.' });
  if (dryRun) blockers.push({ code: 'dry_run_only', message: 'dry_run is enabled, so no model call or save is allowed.' });
  draftSaveBlockers.forEach((code) => blockers.push({ code, message: blockerMessage(code) }));
  if (seoPackDraft?.similarity_check?.status === 'not_checked') blockers.push({ code: 'similarity_not_checked', message: 'Similarity/cannibalization check is required before publish readiness.' });
  if (requirePortfolioStrategy && !portfolioStrategy) blockers.push({ code: 'portfolio_strategy_missing', message: 'Portfolio/source differentiation strategy is required before real AI generation.' });
  return blockers;
}

function blockerMessage(code) {
  const messages = {
    missing_canonical_product_truth_contract: 'The versioned feya_commerce_v_seo_product_truth_v1 contract is not available for this product.',
    missing_confirmed_component_truth: 'No confirmed included component evidence is available.',
    unresolved_component_truth: 'Product component/configuration truth still contains unresolved facts.',
    component_review_blockers_present: 'Product component mappings still have review blockers.',
    missing_source_configuration_evidence: 'Source description, variation, and option-price evidence are missing.',
    missing_primary_or_secondary_keyword: 'No primary or secondary product keyword passed the decision pipeline.',
    missing_validated_keyword_metric: 'No keyword has a trusted metric source and freshness snapshot.',
  };
  return messages[code] || `SeoPackDraftContract blocker: ${code}.`;
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

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeImageUrl(value?: string | null) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function generationGuardrails(portfolioStrategy?: unknown) {
  return [
    'Generation is disabled unless FEYA_SEO_AI_GENERATION_ENABLED=true.',
    'Default request mode is dry_run=true.',
    'No OpenAI call is made while blockers exist.',
    'Real generation requires the versioned feya_commerce_v_seo_product_truth_v1 contract.',
    'Product Focus fallback remains readable for diagnostics but is blocked for real generation.',
    'OpenAI generation is draft-only: no automatic Supabase save.',
    'Primary product image is attached to OpenAI only server-side when a public image URL exists.',
    'Image analysis is evidence for visual truth and ALT, not a replacement for Product DNA or human review.',
    'No publish action is performed by this route.',
    'No product/storefront table mutation is performed by this route.',
    'The model must consume SeoAgentInputContract, not raw product rows.',
    'The model must return seo_agent_output_v1 JSON only.',
    'Model output must pass validator before any future save.',
    'Mock output is seeded from SeoPilotBrief.draftPreview when available and is only for route/UI validation.',
    'Product truth, configuration evidence, metric provenance, and QA gates must outrank keyword volume.',
    portfolioStrategy ? 'Portfolio/source differentiation strategy is loaded and must guide generation.' : 'Portfolio/source differentiation strategy is not loaded; similarity remains a required downstream gate.',
  ];
}
