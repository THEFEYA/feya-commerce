// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildPilotKeywordBankFallbackBundle } from '@/lib/seoPilotKeywordBankFallback';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';

export const dynamic = 'force-dynamic';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';
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
    route: '/api/admin/seo-engine/draft-generate-pilot-auto',
    method: 'POST',
    mode: 'controlled_read_only_keyword_bank_fallback',
    product_id: PILOT_PRODUCT_ID,
    writes: false,
    publish: false,
    humanizer_repair_attempts: 1,
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || PILOT_PRODUCT_ID).trim();
  const generationEnabled = process.env.FEYA_SEO_AI_GENERATION_ENABLED === 'true';
  const hasServerKey = Boolean(process.env.OPENAI_API_KEY);
  const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);

  if (productId !== PILOT_PRODUCT_ID) {
    return NextResponse.json({
      ok: false,
      status: 'pilot_product_only',
      blocked: true,
      error: 'This controlled fallback is restricted to the first pilot product.',
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

  const bundle = await buildPilotKeywordBankFallbackBundle(productId);
  if (bundle.error || !bundle.seoPackDraft || !bundle.aiAgentInput) {
    return NextResponse.json({
      ok: false,
      status: 'pilot_keyword_bank_fallback_not_ready',
      blocked: true,
      error: bundle.error || 'The controlled pilot bundle could not be built.',
      keyword_bank_diagnostics: bundle.keywordDiagnostics || null,
      brief_status: bundle.brief?.status || null,
      blocker_checks: bundle.brief?.blockerChecks || [],
    }, { status: 423 });
  }

  const readiness = classifyReadiness(bundle.seoPackDraft);
  if (readiness.hard_blockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers: readiness.hard_blockers.map((code) => ({ code, message: blockerMessage(code) })),
      readiness,
      keyword_bank_diagnostics: bundle.keywordDiagnostics,
      brief_status: bundle.brief?.status || null,
      blocker_checks: bundle.brief?.blockerChecks || [],
    }, { status: 423 });
  }

  const primaryImageUrl = normalizeImageUrl(bundle.aiAgentInput?.product?.primary_image_url || bundle.seoPackDraft?.product_truth?.primary_image_url || null);
  const promptContract = applyReadinessToPromptContract(
    buildSeoAgentPromptContract(bundle.aiAgentInput),
    readiness,
  );

  const firstGeneration = await generateSeoDraftWithOpenAi(promptContract, { primaryImageUrl });
  const firstStructural = firstGeneration.output ? validateSeoAgentOutput(firstGeneration.output) : validateSeoAgentOutput(null);
  const firstCommercial = firstGeneration.output ? validateSeoCommercialCopy(firstGeneration.output) : validateSeoCommercialCopy(null);

  let selectedGeneration = firstGeneration;
  let selectedStructural = firstStructural;
  let selectedCommercial = firstCommercial;
  let repairGeneration = null;
  let repairStructural = null;
  let repairCommercial = null;
  let repairUsed = false;

  if (firstGeneration.ok && firstGeneration.output && shouldRunHumanizerRepair(firstStructural, firstCommercial)) {
    const repairPrompt = buildHumanizerRepairPrompt(
      promptContract,
      firstGeneration.output,
      firstStructural.issues || [],
      firstCommercial.issues || [],
    );
    repairGeneration = await generateSeoDraftWithOpenAi(repairPrompt, { primaryImageUrl });
    repairStructural = repairGeneration.output ? validateSeoAgentOutput(repairGeneration.output) : validateSeoAgentOutput(null);
    repairCommercial = repairGeneration.output ? validateSeoCommercialCopy(repairGeneration.output) : validateSeoCommercialCopy(null);

    if (repairGeneration.ok && repairGeneration.output && candidateScore(repairStructural, repairCommercial) <= candidateScore(firstStructural, firstCommercial)) {
      selectedGeneration = repairGeneration;
      selectedStructural = repairStructural;
      selectedCommercial = repairCommercial;
      repairUsed = true;
    }
  }

  const shared = buildSharedPayload(bundle, readiness, promptContract, primaryImageUrl);
  const finalDraft = selectedGeneration.output ? sanitizeOutputForReadiness(selectedGeneration.output, readiness) : null;
  const finalOk = Boolean(selectedGeneration.ok && selectedStructural.ok && selectedCommercial.ok);

  const attemptSummary = {
    first_pass: {
      openai: sanitizeGeneration(firstGeneration),
      structural_validation: firstStructural,
      commercial_validation: firstCommercial,
    },
    humanizer_repair: repairGeneration ? {
      attempted: true,
      selected: repairUsed,
      openai: sanitizeGeneration(repairGeneration),
      structural_validation: repairStructural,
      commercial_validation: repairCommercial,
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
      mode: 'openai_draft_only_not_saved',
      message: selectedGeneration.ok
        ? 'OpenAI generated a review draft and one Humanizer repair was attempted when needed, but deterministic QA still blocks saving or publishing. The best draft is shown for review.'
        : 'OpenAI draft generation failed. Nothing was saved or published.',
      openai_generation: sanitizeGeneration(selectedGeneration),
      generated_draft_output: finalDraft,
      generated_draft_validation: selectedStructural,
      generated_draft_commercial_validation: selectedCommercial,
      generation_attempts: attemptSummary,
      ...shared,
    }, { status: selectedGeneration.ok ? 422 : 502 });
  }

  const status = readiness.mode === 'READY_FULL'
    ? repairUsed ? 'ai_full_draft_repaired_not_saved' : 'ai_full_draft_generated_not_saved'
    : repairUsed ? 'ai_partial_draft_repaired_not_saved' : 'ai_partial_draft_generated_not_saved';

  return NextResponse.json({
    ok: true,
    status,
    blocked: false,
    mode: 'openai_draft_only_not_saved',
    message: repairUsed
      ? 'The first draft needed correction. The Humanizer repair pass produced a valid review draft from approved Keyword Bank metrics. Nothing was saved or published.'
      : 'The OpenAI SEO review draft passed deterministic structure and commercial QA. Nothing was saved or published.',
    openai_generation: sanitizeGeneration(selectedGeneration),
    generated_draft_output: finalDraft,
    generated_draft_validation: selectedStructural,
    generated_draft_commercial_validation: selectedCommercial,
    generation_attempts: attemptSummary,
    ...shared,
  }, { status: 200 });
}

function classifyReadiness(draft) {
  const hardBlockers = [];
  const sectionBlockers = [];
  const truth = draft?.product_truth || {};
  const usefulKeywords = [
    ...(draft?.keyword_roles?.primary || []),
    ...(draft?.keyword_roles?.secondary || []),
  ].filter((item) => Boolean(item?.keyword || item?.keyword_norm));
  const identityEvidence = [truth.category, truth.material, truth.color, truth.world, truth.primary_image_url]
    .some((value) => Boolean(String(value || '').trim()));

  if (!draft?.canonical_product_id) hardBlockers.push('missing_canonical_product_id');
  if (!truth?.title?.trim()) hardBlockers.push('missing_product_title');
  if (!truth?.slug?.trim()) hardBlockers.push('missing_product_slug');
  if (!identityEvidence) hardBlockers.push('insufficient_product_identity_evidence');
  if (!usefulKeywords.length) hardBlockers.push('missing_primary_or_secondary_keyword');
  if ((draft?.metrics_status?.validated_count || 0) < 1) hardBlockers.push('missing_validated_keyword_metric');
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');

  const hasCanonicalTruth = truth.product_truth_source === 'seo_product_truth_v1';
  const hasConfirmedComposition = Boolean(
    (truth.included_components || []).length
    || (truth.known_components || []).length
    || (truth.optional_configurations || []).length,
  );
  const hasUnresolvedFacts = Boolean((truth.unresolved_component_facts || []).length);
  const hasReviewBlockers = Boolean((truth.component_review_blockers || []).length);
  const hasSourceConfigurationEvidence = Boolean(
    (truth.source_variations || []).length
    || (truth.option_price_rows || []).length
    || String(truth.source_description_fragment || '').trim(),
  );

  if (!hasCanonicalTruth) sectionBlockers.push('composition_missing_canonical_product_truth');
  if (!hasConfirmedComposition) sectionBlockers.push('composition_missing_confirmed_components');
  if (hasUnresolvedFacts) sectionBlockers.push('composition_has_unresolved_facts');
  if (hasReviewBlockers) sectionBlockers.push('composition_has_review_blockers');
  if (!hasSourceConfigurationEvidence) sectionBlockers.push('composition_missing_source_configuration_evidence');

  const compositionReady = hasCanonicalTruth
    && hasConfirmedComposition
    && !hasUnresolvedFacts
    && !hasReviewBlockers
    && hasSourceConfigurationEvidence;

  return {
    mode: hardBlockers.length ? 'BLOCKED' : compositionReady ? 'READY_FULL' : 'READY_PARTIAL',
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    allowed_customer_sections: hardBlockers.length ? [] : GENERATED_SECTIONS,
    suppressed_customer_sections: hardBlockers.length
      ? [...GENERATED_SECTIONS, 'right_panel_whats_included']
      : compositionReady ? [] : ['right_panel_whats_included'],
    component_truth: {
      canonical: hasCanonicalTruth,
      confirmed_composition_count: Number((truth.included_components || []).length) + Number((truth.optional_configurations || []).length),
      unresolved_fact_count: Number((truth.unresolved_component_facts || []).length),
      review_blocker_count: Number((truth.component_review_blockers || []).length),
      source_variation_count: Number((truth.source_variations || []).length),
      option_price_row_count: Number((truth.option_price_rows || []).length),
    },
  };
}

function applyReadinessToPromptContract(promptContract, readiness) {
  const compositionRules = readiness.mode === 'READY_FULL'
    ? [
      '- Canonical Product Truth and selectable composition evidence are available.',
      '- The storefront renders confirmed selected-configuration contents. Do not generate a separate What’s Included block.',
      '- You may use confirmed component identity naturally where relevant, but do not merge alternative configurations into one purchase.',
    ]
    : [
      '- Composition remains partial or unresolved.',
      '- Do not state which pieces are included, do not reinterpret raw option labels, and do not mention prices.',
      '- Do not generate a What’s Included placeholder. The storefront hides that block until composition mapping is confirmed.',
      '- Set output status to needs_review.',
    ];

  const appendix = [
    '',
    'GENERATION READINESS CONTRACT:',
    `- generation_mode: ${readiness.mode}`,
    `- allowed_customer_sections: ${readiness.allowed_customer_sections.join(', ') || 'none'}`,
    `- suppressed_customer_sections: ${readiness.suppressed_customer_sections.join(', ') || 'none'}`,
    `- section_blockers: ${readiness.section_blockers.join(', ') || 'none'}`,
    '- Generate a useful review draft for every allowed customer section.',
    ...compositionRules,
    '- All generated customer-facing sections must be polished, product-first, natural English, and grounded in product identity, image truth, and validated keyword evidence.',
    '- Give each left-description block a distinct job. Do not repeat the same sentence, benefit, image observation, or studio-authorship idea across several blocks.',
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${appendix}`,
    user_prompt: `${promptContract.user_prompt}\n${appendix}`,
    guardrails: [...(promptContract.guardrails || []), appendix],
  };
}

function buildHumanizerRepairPrompt(promptContract, currentOutput, structuralIssues, commercialIssues) {
  const issueLines = [
    ...structuralIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...commercialIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
  ];
  const repairRules = [
    '',
    'THEFEYA HUMANIZER REPAIR PASS:',
    'Return a complete seo_agent_output_v1 JSON object, not a patch and not commentary.',
    'Repair only the generated customer-facing SEO fields and the four left_description blocks needed to satisfy the exact validator issues below.',
    'Preserve confirmed product identity, approved keyword roles, visual facts, internal-linking intent, and all forbidden-claim boundaries.',
    'Do not add, infer, translate, or repair included components, selectable configurations, prices, or raw option meanings.',
    'Do not generate or paraphrase any fixed right-panel content or What’s Included.',
    'Use first-person studio voice in Designed for self-expression: we, our, us. Do not begin with “TheFEYA is” and do not describe the studio as they or their.',
    'Keep each section functionally distinct: About describes this product; Why gives different purchase benefits; Ideal for gives supported use cases; Designed for self-expression describes our studio and the buyer’s visual identity.',
    'Remove repeated ideas and near-duplicate sentences. A concept such as reflective finish, sculptural silhouette, camera presence, durability, fit, or studio authorship should appear where it is strongest, not in every block.',
    'Do not weaken factual specificity and do not introduce generic AI sales language.',
    'Exact validation issues to repair:',
    ...(issueLines.length ? issueLines.map((line) => `- ${line}`) : ['- Improve human rhythm and remove repetition.']),
    '',
    'Current generated JSON to repair:',
    JSON.stringify(currentOutput, null, 2),
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${repairRules}`,
    user_prompt: `${promptContract.user_prompt}\n${repairRules}`,
    guardrails: [...(promptContract.guardrails || []), repairRules],
  };
}

function shouldRunHumanizerRepair(structural, commercial) {
  if (!structural?.ok || !commercial?.ok) return true;
  return (commercial?.issues || []).some((issue) => (
    String(issue.code || '').startsWith('repeated_idea_')
    || ['cross_block_repetition_warning', 'self_expression_close_lacks_clear_buyer_value'].includes(String(issue.code || ''))
  ));
}

function candidateScore(structural, commercial) {
  const issues = [
    ...(structural?.issues || []),
    ...(commercial?.issues || []),
  ];
  return issues.reduce((score, issue) => score + (issue.severity === 'blocker' ? 100 : 1), 0);
}

function sanitizeOutputForReadiness(output, readiness) {
  const safe = JSON.parse(JSON.stringify(output || {}));
  if (readiness.mode === 'READY_PARTIAL') safe.status = 'needs_review';
  safe.generation_notes = unique([
    ...(Array.isArray(safe.generation_notes) ? safe.generation_notes : []),
    ...(readiness.mode === 'READY_PARTIAL'
      ? ['The storefront What’s Included panel remains hidden because product composition is not fully confirmed.']
      : ['Canonical Product Truth is available; selected-configuration contents remain storefront-controlled.']),
    ...readiness.section_blockers,
  ]);
  safe.suppressed_sections = readiness.suppressed_customer_sections;
  safe.generation_readiness = readiness.mode;
  return safe;
}

function buildSharedPayload(bundle, readiness, promptContract, primaryImageUrl) {
  const compositionReady = readiness.mode === 'READY_FULL';
  return {
    source: {
      product_id: bundle.seoPackDraft.canonical_product_id,
      matched_etsy_listing_id: bundle.seoPackDraft.matched_etsy_listing_id,
      product_title: bundle.seoPackDraft.product_truth?.title || null,
      product_slug: bundle.seoPackDraft.product_truth?.slug || null,
      primary_image_url: primaryImageUrl,
      selected_keyword_count: bundle.keywords.length,
      keyword_fallback_mode: 'read_only_canonical_keyword_bank_pilot',
      product_truth_source: bundle.seoPackDraft.product_truth?.product_truth_source || null,
    },
    readiness,
    keyword_bank_diagnostics: bundle.keywordDiagnostics,
    prompt_contract_summary: {
      ...summarizeSeoAgentPromptContract(promptContract),
      readiness_mode: readiness.mode,
      product_truth_mode: compositionReady
        ? 'canonical_composition_available_storefront_controlled'
        : 'partial_composition_hidden_in_storefront_panel',
      humanizer_repair_attempts: 1,
    },
    guardrails: [
      'No Supabase write was performed.',
      'No Listing Master decision was created or updated.',
      'Only approved Keyword Bank rows with real metric provenance were used.',
      compositionReady
        ? 'Canonical Product Truth is connected; the storefront controls selected-configuration contents.'
        : 'The storefront What’s Included panel is hidden because composition remains unresolved.',
      'One Humanizer repair attempt may rewrite generated left copy but cannot change product facts or the right panel.',
      'No draft save or publish action is performed by this route.',
    ],
  };
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

function blockerMessage(code) {
  const messages = {
    missing_canonical_product_id: 'Canonical product id is missing.',
    missing_product_title: 'Product title is missing.',
    missing_product_slug: 'Product slug is missing.',
    insufficient_product_identity_evidence: 'Product identity evidence is insufficient.',
    missing_primary_or_secondary_keyword: 'No relevant product keyword passed the pilot selection.',
    missing_validated_keyword_metric: 'No selected keyword has trusted real metrics.',
    draft_status_blocked_by_product_mismatch: 'Keyword selection conflicts with the product.',
    qa_blocker_forbidden_mismatch: 'A forbidden or foreign intent reached the selected keyword set.',
    qa_blocker_product_specificity: 'The draft lacks product specificity.',
  };
  return messages[code] || `SEO generation gate: ${code}.`;
}

function normalizeImageUrl(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
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
