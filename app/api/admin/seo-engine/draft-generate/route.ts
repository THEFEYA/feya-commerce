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
    readiness_modes: ['READY_FULL', 'READY_PARTIAL', 'BLOCKED'],
    guardrails: generationGuardrails(),
    expected_body: {
      product_id: 'canonical_product_id UUID',
      dry_run: true,
      include_mock_output: true,
      require_portfolio_strategy: false,
    },
    generation_pipeline: [
      'load versioned SEO Product Truth contract when available',
      'classify READY_FULL, READY_PARTIAL, or BLOCKED',
      'load SeoAgentInputContract',
      'load latest saved draft portfolio/source differentiation strategy when available',
      'attach primary product image to server-side OpenAI request when available',
      'build seo_agent_prompt_v1 with readiness-specific section permissions',
      'seed optional mock seo_agent_output_v1 from SeoPilotBrief.draftPreview during dry-run',
      'call OpenAI only when feature flag, key, identity, keyword metric, and hard gates pass',
      'validate seo_agent_output_v1',
      'suppress unresolved composition sections from READY_PARTIAL output',
      'return AI draft for human review',
      'do not save automatically in this route',
      'do not publish automatically in this route',
    ],
    note: 'READY_PARTIAL may generate safe SEO and descriptive sections while unresolved composition remains suppressed. The route never saves or publishes automatically.',
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
  const includePrompt = body.include_prompt === true;
  const includeMockOutput = body.include_mock_output !== false;
  const requirePortfolioStrategy = body.require_portfolio_strategy === true;
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

  const generationReadiness = classifyGenerationReadiness(bundle.seoPackDraft);
  const primaryImageUrl = normalizeImageUrl(bundle.aiAgentInput?.product?.primary_image_url || bundle.seoPackDraft?.product_truth?.primary_image_url || null);
  const promptContract = applyReadinessToPromptContract(
    buildSeoAgentPromptContract(bundle.aiAgentInput),
    generationReadiness,
  );
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
    generationReadiness,
    portfolioStrategy,
    requirePortfolioStrategy,
  });
  const warnings = collectGenerationWarnings({
    generationReadiness,
    seoPackDraft: bundle.seoPackDraft,
    portfolioStrategy,
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
      generation_mode: generationReadiness.mode,
      hard_blockers: generationReadiness.hard_blockers,
      section_blockers: generationReadiness.section_blockers,
      allowed_customer_sections: generationReadiness.allowed_customer_sections,
      suppressed_customer_sections: generationReadiness.suppressed_customer_sections,
      can_generate_review_draft: generationReadiness.mode !== 'BLOCKED',
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
        && generationReadiness.mode !== 'BLOCKED'
        && Boolean(portfolioStrategy || !requirePortfolioStrategy),
    },
    generation_warnings: warnings,
    prompt_contract_summary: {
      ...summarizeSeoAgentPromptContract(promptContract),
      readiness_mode: generationReadiness.mode,
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
      note: 'The validator is wired. READY_PARTIAL uses an internal composition placeholder for schema validation, then suppresses that section from the returned review draft.',
    },
    mock_draft_output: mockOutput,
    mock_draft_validation: mockOutputValidation,
    seo_pack_draft: bundle.seoPackDraft,
    ai_agent_input: bundle.aiAgentInput,
    guardrails: generationGuardrails(portfolioStrategy, generationReadiness),
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

  const reviewDraftOutput = sanitizeOutputForReadiness(generation.output, generationReadiness);
  const isPartial = generationReadiness.mode === 'READY_PARTIAL';

  return NextResponse.json({
    ok: true,
    status: isPartial ? 'ai_partial_draft_generated_not_saved' : 'ai_full_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_draft_only_not_saved',
    message: isPartial
      ? 'OpenAI generated a valid partial review draft. Unresolved composition sections were suppressed. Nothing was saved, published, or applied.'
      : 'OpenAI generated a valid full review draft. It was not saved, published, or applied to product/storefront tables.',
    openai_generation: sanitizeGeneration(generation),
    generated_draft_output: reviewDraftOutput,
    generated_draft_validation: generatedValidation,
    ...preflightPayload,
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
      hard_blockers: uniqueCodes(hardBlockers),
      section_blockers: uniqueCodes(sectionBlockers),
      allowed_customer_sections: [],
      suppressed_customer_sections: ['seo_title', 'h1', 'meta_description', 'intro', 'about_this_piece', 'whats_included', 'why_youll_love_it', 'ideal_for', 'material', 'image_alt_candidates'],
    };
  }

  if (compositionReady) {
    return {
      mode: 'READY_FULL',
      hard_blockers: [],
      section_blockers: [],
      allowed_customer_sections: ['seo_title', 'h1', 'meta_description', 'intro', 'about_this_piece', 'whats_included', 'why_youll_love_it', 'ideal_for', 'material', 'image_alt_candidates'],
      suppressed_customer_sections: [],
    };
  }

  return {
    mode: 'READY_PARTIAL',
    hard_blockers: [],
    section_blockers: uniqueCodes(sectionBlockers),
    allowed_customer_sections: ['seo_title', 'h1', 'meta_description', 'intro', 'about_this_piece', 'why_youll_love_it', 'ideal_for', 'material', 'image_alt_candidates'],
    suppressed_customer_sections: ['whats_included'],
  };
}

function applyReadinessToPromptContract(promptContract, readiness) {
  const shared = [
    '',
    'GENERATION READINESS CONTRACT:',
    `- generation_mode: ${readiness.mode}`,
    `- allowed_customer_sections: ${readiness.allowed_customer_sections.join(', ') || 'none'}`,
    `- suppressed_customer_sections: ${readiness.suppressed_customer_sections.join(', ') || 'none'}`,
    `- section_blockers: ${readiness.section_blockers.join(', ') || 'none'}`,
  ];

  const modeRules = readiness.mode === 'READY_PARTIAL'
    ? [
      '- Generate a useful review draft for every allowed customer section. Do not return blocked merely because composition is unresolved.',
      '- Set output status to needs_review.',
      '- Do not state which pieces are included, do not reinterpret raw option labels, and do not mention prices.',
      '- For schema validation only, include a whats_included left_description block in the normal required position with this exact body: "Configuration details are withheld from this draft until product composition review is complete."',
      '- The schema-only whats_included block must use source_basis needs_human_review and needs_human_review true.',
      '- The server will remove that schema-only block before returning the human review draft.',
      '- All other customer-facing sections must remain polished, specific, natural English and grounded in confirmed identity, material, visual and keyword evidence.',
    ]
    : readiness.mode === 'READY_FULL'
      ? [
        '- Generate the complete review draft, including a factual whats_included block based only on confirmed included components and configurations.',
        '- Do not mention prices in customer-facing copy.',
      ]
      : [
        '- Return status blocked and do not create customer-facing copy.',
      ];

  const appendix = [...shared, ...modeRules].join('\n');
  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${appendix}`,
    user_prompt: `${promptContract.user_prompt}\n${appendix}`,
    guardrails: [...(promptContract.guardrails || []), ...shared.slice(1), ...modeRules],
  };
}

function collectGenerationBlockers({ generationEnabled, hasServerKey, dryRun, generationReadiness, portfolioStrategy, requirePortfolioStrategy }) {
  const blockers = [];
  if (!generationEnabled) blockers.push({ code: 'feature_flag_disabled', message: 'FEYA_SEO_AI_GENERATION_ENABLED is not true.' });
  if (!hasServerKey) blockers.push({ code: 'missing_openai_key', message: 'OPENAI_API_KEY is missing on the server.' });
  if (dryRun) blockers.push({ code: 'dry_run_only', message: 'dry_run is enabled, so no model call or save is allowed.' });
  generationReadiness.hard_blockers.forEach((code) => blockers.push({ code, message: blockerMessage(code) }));
  if (requirePortfolioStrategy && !portfolioStrategy) blockers.push({ code: 'portfolio_strategy_missing', message: 'Portfolio/source differentiation strategy was explicitly required for this request but is missing.' });
  return blockers;
}

function collectGenerationWarnings({ generationReadiness, seoPackDraft, portfolioStrategy }) {
  const warnings = generationReadiness.section_blockers.map((code) => ({ code, message: blockerMessage(code) }));
  if (seoPackDraft?.similarity_check?.status === 'not_checked') {
    warnings.push({ code: 'similarity_not_checked', message: 'Similarity/cannibalization is not checked. The draft may be reviewed, but it cannot be publish-ready.' });
  }
  if (!portfolioStrategy) {
    warnings.push({ code: 'portfolio_strategy_missing', message: 'No portfolio differentiation strategy is loaded. The draft requires similarity review before publish.' });
  }
  return warnings;
}

function blockerMessage(code) {
  const messages = {
    missing_canonical_product_truth_contract: 'The versioned Product Truth contract is unavailable.',
    missing_confirmed_component_truth: 'No confirmed included component evidence is available.',
    unresolved_component_truth: 'Product component/configuration truth contains unresolved facts.',
    component_review_blockers_present: 'Product component mappings contain review blockers.',
    missing_source_configuration_evidence: 'Source description, variation, and option-price evidence are missing.',
    missing_primary_or_secondary_keyword: 'No primary or secondary product keyword passed the decision pipeline.',
    missing_validated_keyword_metric: 'No keyword has a trusted metric source and freshness snapshot.',
    insufficient_product_identity_evidence: 'The product lacks enough identity, material, visual, or source evidence for a safe draft.',
    composition_missing_canonical_product_truth: 'What’s Included is suppressed because canonical Product Truth is unavailable.',
    composition_missing_confirmed_components: 'What’s Included is suppressed because no included component is confirmed.',
    composition_has_unresolved_facts: 'What’s Included is suppressed because component facts remain unresolved.',
    composition_has_review_blockers: 'What’s Included is suppressed because component mappings require review.',
  };
  return messages[code] || `SEO generation gate: ${code}.`;
}

function sanitizeOutputForReadiness(output, readiness) {
  const safeOutput = JSON.parse(JSON.stringify(output || {}));
  if (readiness.mode !== 'READY_PARTIAL') return safeOutput;

  safeOutput.status = 'needs_review';
  safeOutput.pdp_blocks = Array.isArray(safeOutput.pdp_blocks)
    ? safeOutput.pdp_blocks.filter((block) => block?.block_key !== 'whats_included')
    : [];
  safeOutput.generation_notes = uniqueCodes([
    ...(Array.isArray(safeOutput.generation_notes) ? safeOutput.generation_notes : []),
    'What’s Included was suppressed because product composition is not fully confirmed.',
    ...readiness.section_blockers,
  ]);
  safeOutput.suppressed_sections = readiness.suppressed_customer_sections;
  safeOutput.generation_readiness = readiness.mode;
  return safeOutput;
}

function uniqueCodes(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
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

function generationGuardrails(portfolioStrategy?: unknown, readiness?: unknown) {
  return [
    'Generation is disabled unless FEYA_SEO_AI_GENERATION_ENABLED=true.',
    'Default request mode is dry_run=true.',
    'No OpenAI call is made while hard blockers exist.',
    'READY_PARTIAL may generate safe SEO and descriptive sections while What’s Included remains suppressed.',
    'Component uncertainty is section-scoped unless it makes the product identity itself unreliable.',
    'Product Focus fallback may support a partial diagnostic review draft but can never support a factual What’s Included claim.',
    'OpenAI generation is draft-only: no automatic Supabase save.',
    'Primary product image is attached to OpenAI only server-side when a public image URL exists.',
    'Image analysis is evidence for visual truth and ALT, not proof of included components.',
    'No publish action is performed by this route.',
    'No product/storefront table mutation is performed by this route.',
    'The model must consume SeoAgentInputContract, not raw product rows.',
    'The model must return seo_agent_output_v1 JSON only.',
    'Model output must pass validator before any future save.',
    'Unresolved composition sections are removed from READY_PARTIAL output before human review.',
    'Product truth, metric provenance, and QA gates outrank keyword volume.',
    readiness ? `Current readiness mode: ${readiness.mode}.` : 'Readiness is calculated per product.',
    portfolioStrategy ? 'Portfolio/source differentiation strategy is loaded and must guide generation.' : 'Portfolio/source differentiation strategy is optional for draft generation but required before publish readiness.',
  ];
}
