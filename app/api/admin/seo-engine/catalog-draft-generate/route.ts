// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { validateSeoKeywordPlacement } from '@/lib/seoKeywordPlacementValidator';
import { assembleSeoProductPack } from '@/lib/seoFullPackAssembler';
import { getSeoPackDraftSaveBlockers } from '@/lib/seoPackContract';
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
    humanizer_repair_attempts: 1,
  });
}

export async function POST(request: Request) {
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

  const bundle = await buildSeoBriefContractBundle(productId);
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

  const readiness = classifyReadiness(bundle.seoPackDraft);
  const portfolioStrategy = bundle.aiAgentInput?.portfolio_strategy || null;
  const hardBlockers = [...readiness.hard_blockers];
  if (requirePortfolioStrategy && !portfolioStrategy) hardBlockers.push('portfolio_strategy_missing');

  const primaryImageUrl = normalizeImageUrl(
    bundle.aiAgentInput?.product?.primary_image_url
      || bundle.seoPackDraft?.product_truth?.primary_image_url
      || null,
  );
  const promptContract = applyReadinessToPromptContract(
    buildSeoAgentPromptContract(bundle.aiAgentInput),
    readiness,
  );
  const shared = buildSharedPayload(bundle, readiness, promptContract, primaryImageUrl, portfolioStrategy);

  if (hardBlockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers: unique(hardBlockers).map((code) => ({ code, message: blockerMessage(code) })),
      ...shared,
    }, { status: 423 });
  }

  const firstGeneration = await generateSeoDraftWithOpenAi(promptContract, { primaryImageUrl });
  const firstStructural = firstGeneration.output
    ? validateSeoAgentOutput(firstGeneration.output)
    : validateSeoAgentOutput(null);
  const firstCommercial = firstGeneration.output
    ? validateSeoCommercialCopy(firstGeneration.output, { product_truth: bundle.seoPackDraft.product_truth })
    : validateSeoCommercialCopy(null, { product_truth: bundle.seoPackDraft.product_truth });
  const firstKeywordPlacement = validateSeoKeywordPlacement(firstGeneration.output, bundle.seoPackDraft);

  let selectedGeneration = firstGeneration;
  let selectedStructural = firstStructural;
  let selectedCommercial = firstCommercial;
  let selectedKeywordPlacement = firstKeywordPlacement;
  let repairGeneration = null;
  let repairStructural = null;
  let repairCommercial = null;
  let repairKeywordPlacement = null;
  let repairUsed = false;

  if (firstGeneration.ok && firstGeneration.output && shouldRepair(firstStructural, firstCommercial, firstKeywordPlacement)) {
    const repairPrompt = buildRepairPrompt(
      promptContract,
      firstGeneration.output,
      firstStructural.issues || [],
      firstCommercial.issues || [],
      firstKeywordPlacement.issues || [],
    );
    repairGeneration = await generateSeoDraftWithOpenAi(repairPrompt, { primaryImageUrl });
    repairStructural = repairGeneration.output
      ? validateSeoAgentOutput(repairGeneration.output)
      : validateSeoAgentOutput(null);
    repairCommercial = repairGeneration.output
      ? validateSeoCommercialCopy(repairGeneration.output, { product_truth: bundle.seoPackDraft.product_truth })
      : validateSeoCommercialCopy(null, { product_truth: bundle.seoPackDraft.product_truth });
    repairKeywordPlacement = validateSeoKeywordPlacement(repairGeneration.output, bundle.seoPackDraft);

    if (
      repairGeneration.ok
      && repairGeneration.output
      && candidateScore(repairStructural, repairCommercial, repairKeywordPlacement) < candidateScore(firstStructural, firstCommercial, firstKeywordPlacement)
    ) {
      selectedGeneration = repairGeneration;
      selectedStructural = repairStructural;
      selectedCommercial = repairCommercial;
      selectedKeywordPlacement = repairKeywordPlacement;
      repairUsed = true;
    }
  }

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
  const generationAttempts = {
    first_pass: {
      openai: sanitizeGeneration(firstGeneration),
      structural_validation: firstStructural,
      commercial_validation: firstCommercial,
      keyword_placement_validation: firstKeywordPlacement,
    },
    humanizer_repair: repairGeneration ? {
      attempted: true,
      selected: repairUsed,
      openai: sanitizeGeneration(repairGeneration),
      structural_validation: repairStructural,
      commercial_validation: repairCommercial,
      keyword_placement_validation: repairKeywordPlacement,
    } : {
      attempted: false,
      selected: false,
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
        : 'OpenAI draft generation failed. Nothing was saved or published.',
      openai_generation: sanitizeGeneration(selectedGeneration),
      generated_draft_output: finalDraft,
      generated_draft_validation: selectedStructural,
      generated_draft_commercial_validation: selectedCommercial,
      generated_draft_keyword_placement_validation: selectedKeywordPlacement,
      assembled_seo_pack: assembledSeoPack,
      generation_attempts: generationAttempts,
      ...shared,
    }, { status: selectedGeneration.ok ? 422 : 502 });
  }

  return NextResponse.json({
    ok: true,
    status: readiness.mode === 'READY_FULL'
      ? repairUsed ? 'catalog_full_draft_repaired_not_saved' : 'catalog_full_draft_generated_not_saved'
      : repairUsed ? 'catalog_partial_draft_repaired_not_saved' : 'catalog_partial_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_review_draft_not_saved',
    message: repairUsed
      ? 'The first pass needed correction. The Humanizer produced a valid catalog review draft. Nothing was saved or published.'
      : 'The catalog review draft passed structural and commercial QA. Nothing was saved or published.',
    openai_generation: sanitizeGeneration(selectedGeneration),
    generated_draft_output: finalDraft,
    generated_draft_validation: selectedStructural,
    generated_draft_commercial_validation: selectedCommercial,
    generated_draft_keyword_placement_validation: selectedKeywordPlacement,
    assembled_seo_pack: assembledSeoPack,
    generation_attempts: generationAttempts,
    ...shared,
  });
}

function classifyReadiness(draft) {
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

  const hasCanonicalTruth = truth.product_truth_source === 'seo_product_truth_v1';
  const hasConfirmedComposition = Boolean(
    (truth.included_components || []).length
      || (truth.known_components || []).length
      || (truth.optional_configurations || []).length,
  );
  const hasUnresolvedFacts = Boolean((truth.unresolved_component_facts || []).length);
  const hasReviewBlockers = Boolean((truth.component_review_blockers || []).length);

  if (!hasCanonicalTruth) sectionBlockers.push('composition_missing_canonical_product_truth');
  if (!hasConfirmedComposition) sectionBlockers.push('composition_missing_confirmed_components');
  if (hasUnresolvedFacts) sectionBlockers.push('composition_has_unresolved_facts');
  if (hasReviewBlockers) sectionBlockers.push('composition_has_review_blockers');

  const compositionReady = hasCanonicalTruth
    && hasConfirmedComposition
    && !hasUnresolvedFacts
    && !hasReviewBlockers;

  return {
    mode: hardBlockers.length ? 'BLOCKED' : compositionReady ? 'READY_FULL' : 'READY_PARTIAL',
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    allowed_customer_sections: hardBlockers.length ? [] : GENERATED_SECTIONS,
    suppressed_customer_sections: hardBlockers.length
      ? [...GENERATED_SECTIONS, 'right_panel_whats_included']
      : compositionReady ? [] : ['right_panel_whats_included'],
  };
}

function applyReadinessToPromptContract(promptContract, readiness) {
  const appendix = [
    '',
    'CATALOG GENERATION READINESS CONTRACT:',
    `- generation_mode: ${readiness.mode}`,
    `- allowed_customer_sections: ${readiness.allowed_customer_sections.join(', ') || 'none'}`,
    `- suppressed_customer_sections: ${readiness.suppressed_customer_sections.join(', ') || 'none'}`,
    `- section_blockers: ${readiness.section_blockers.join(', ') || 'none'}`,
    '- Generate a useful review draft for every allowed customer section.',
    '- The component family Shoulders covers shoulder products as one Product DNA family.',
    '- Source grammar remains authoritative: Shoulder or One Shoulder stays singular; Shoulders or Full Shoulders stays plural.',
    '- Singular or plural wording does not imply that a paired design can be divided, or that two singular purchases form one symmetric pair.',
    '- Quantity selection is an order quantity and must not rewrite the product configuration meaning.',
    '- Never invent included pieces. The storefront controls What’s Included from confirmed selected-configuration evidence.',
    '- Generate only SEO fields, ALT candidates and the four left-description blocks.',
    '- Keep every block functionally distinct and remove repeated thoughts across intro, benefits, use cases and the closing studio paragraph.',
    '- Do not generate, rewrite or paraphrase the fixed right PDP panel.',
    '- Do not mention prices in customer-facing SEO copy.',
    readiness.mode === 'READY_PARTIAL'
      ? '- Composition is partial. Set status to needs_review, omit composition claims and still generate the safe product-specific sections.'
      : '- Composition is ready. Use confirmed identity naturally without merging mutually exclusive configurations.',
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${appendix}`,
    user_prompt: `${promptContract.user_prompt}\n${appendix}`,
    guardrails: [...(promptContract.guardrails || []), appendix],
  };
}

function buildRepairPrompt(promptContract, currentOutput, structuralIssues, commercialIssues, keywordPlacementIssues) {
  const issueLines = [
    ...structuralIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...commercialIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...keywordPlacementIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}${issue.keyword ? ` [${issue.keyword}]` : ''}`),
  ];
  const repairRules = [
    '',
    'THEFEYA CATALOG HUMANIZER REPAIR PASS:',
    'Return a complete seo_agent_output_v1 JSON object, not a patch or commentary.',
    'Repair generated customer-facing fields only. Preserve product truth, selected keywords, visual facts and forbidden-claim boundaries.',
    'Do not alter raw variations, component mappings, configuration meaning, prices or the fixed right PDP panel.',
    'Use natural human rhythm and remove repeated thoughts, near-duplicate sentences and repeated benefit categories.',
    'Keep About this piece product-specific, Why you’ll love it commercially useful, Ideal for grounded, and Designed for self-expression studio-focused.',
    'Rewrite Why you’ll love it as 3-4 purchase reasons. Each bullet must use supported feature or studio truth -> concrete buyer outcome.',
    'Use exactly one concrete studio-design differentiation benefit. Use the other bullets for supported wearability, adjustment, comfort, shape retention, durability, or verified finish behavior.',
    'Move styles, events, personas, audiences, stage/camera use and keyword variants to Ideal for. Delete abstract visual commentary and do not fill space with a fifth bullet.',
    'Repair primary keyword placement in meta_description and intro or About this piece body, never by stuffing Why you’ll love it.',
    'Do not turn Shoulder into Shoulders or Shoulders into Shoulder unless the source configuration itself uses that grammar.',
    'Exact validation issues:',
    ...(issueLines.length ? issueLines.map((line) => `- ${line}`) : ['- Improve differentiation, rhythm and commercial clarity.']),
    '',
    'Current JSON to repair:',
    JSON.stringify(currentOutput, null, 2),
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${repairRules}`,
    user_prompt: `${promptContract.user_prompt}\n${repairRules}`,
    guardrails: [...(promptContract.guardrails || []), repairRules],
  };
}

function shouldRepair(structural, commercial, keywordPlacement) {
  if (!structural?.ok || !commercial?.ok || !keywordPlacement?.ok) return true;
  return (commercial?.issues || []).some((issue) => (
    String(issue.code || '').startsWith('repeated_idea_')
      || ['cross_block_repetition_warning', 'self_expression_close_lacks_clear_buyer_value'].includes(String(issue.code || ''))
  ));
}

function candidateScore(structural, commercial, keywordPlacement) {
  return [
    ...(structural?.issues || []),
    ...(commercial?.issues || []),
    ...(keywordPlacement?.issues || []),
  ].reduce((score, issue) => score + (issue.severity === 'blocker' ? 100 : 1), 0);
}

function sanitizeOutputForReadiness(output, readiness) {
  const safe = JSON.parse(JSON.stringify(output || {}));
  if (readiness.mode === 'READY_PARTIAL') safe.status = 'needs_review';
  safe.generation_readiness = readiness.mode;
  safe.suppressed_sections = readiness.suppressed_customer_sections;
  safe.generation_notes = unique([
    ...(Array.isArray(safe.generation_notes) ? safe.generation_notes : []),
    ...readiness.section_blockers,
  ]);
  return safe;
}

function buildSharedPayload(bundle, readiness, promptContract, primaryImageUrl, portfolioStrategy) {
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
      humanizer_repair_attempts: 1,
      portfolio_strategy_loaded: Boolean(portfolioStrategy),
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
    missing_primary_or_secondary_keyword: 'No relevant primary or secondary keyword passed the decision pipeline.',
    missing_validated_keyword_metric: 'No selected keyword has a trusted validated metric snapshot.',
    portfolio_strategy_missing: 'Portfolio differentiation strategy was required but is missing.',
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
  };
}

function normalizeImageUrl(value) {
  const text = String(value || '').trim();
  if (!text || !/^https?:\/\//i.test(text)) return null;
  return text;
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
