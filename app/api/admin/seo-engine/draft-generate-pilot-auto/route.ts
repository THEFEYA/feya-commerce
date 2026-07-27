// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildPilotKeywordBankFallbackBundle } from '@/lib/seoPilotKeywordBankFallback';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { validateSeoKeywordPlacement } from '@/lib/seoKeywordPlacementValidator';
import { assembleSeoProductPack } from '@/lib/seoFullPackAssembler';
import { getSeoGenerationProductTruthBlockers, getSeoPackDraftSaveBlockers } from '@/lib/seoPackContract';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';
import {
  isStrictlyBetterSeoEditorialCandidate,
  mergeBoundedSeoEditorialRepair,
  normalizeFinalSeoEditorialOutput,
  shouldRunSeoEditorialRepair,
} from '@/lib/seoEditorialCandidateSelection';

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
    humanizer_repair_attempts: 2,
    final_editor_model: process.env.FEYA_SEO_OPENAI_EDITOR_MODEL || 'gpt-5.4',
    final_editor_reasoning_effort: 'high',
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
  const commercialContext = {
    product_truth: bundle.seoPackDraft.product_truth,
    manual_focus: bundle.seoPackDraft.manual_focus,
    keyword_roles: bundle.seoPackDraft.keyword_roles,
  };

  const firstGeneration = await generateSeoDraftWithOpenAi(promptContract, { primaryImageUrl });
  const firstStructural = firstGeneration.output ? validateSeoAgentOutput(firstGeneration.output) : validateSeoAgentOutput(null);
  const firstCommercial = firstGeneration.output
    ? validateSeoCommercialCopy(firstGeneration.output, commercialContext)
    : validateSeoCommercialCopy(null, commercialContext);
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
  let finalReviewGeneration = null;
  let finalReviewStructural = null;
  let finalReviewCommercial = null;
  let finalReviewKeywordPlacement = null;
  let finalReviewUsed = false;
  let residualReviewGeneration = null;
  let residualReviewStructural = null;
  let residualReviewCommercial = null;
  let residualReviewKeywordPlacement = null;
  let residualReviewUsed = false;

  const shouldRepair = shouldRunSeoEditorialRepair(
    firstStructural,
    firstCommercial,
    firstKeywordPlacement,
  );
  if (firstGeneration.ok && firstGeneration.output && shouldRepair) {
    const repairPrompt = buildHumanizerRepairPrompt(
      promptContract,
      firstGeneration.output,
      firstStructural.issues || [],
      firstCommercial.issues || [],
      firstKeywordPlacement.issues || [],
    );
    // Editing uses verified text and contracts only. Re-sending the image can
    // pull the rewrite back toward visual-audit language.
    repairGeneration = await generateSeoDraftWithOpenAi(repairPrompt);
    repairStructural = repairGeneration.output ? validateSeoAgentOutput(repairGeneration.output) : validateSeoAgentOutput(null);
    repairCommercial = repairGeneration.output
      ? validateSeoCommercialCopy(repairGeneration.output, commercialContext)
      : validateSeoCommercialCopy(null, commercialContext);
    repairKeywordPlacement = validateSeoKeywordPlacement(repairGeneration.output, bundle.seoPackDraft);

    if (
      repairGeneration.ok
      && repairGeneration.output
      && isStrictlyBetterSeoEditorialCandidate(
        [repairStructural, repairCommercial, repairKeywordPlacement],
        [firstStructural, firstCommercial, firstKeywordPlacement],
      )
    ) {
      selectedGeneration = repairGeneration;
      selectedStructural = repairStructural;
      selectedCommercial = repairCommercial;
      selectedKeywordPlacement = repairKeywordPlacement;
      repairUsed = true;
    }
  }

  const shouldRunFinalReview = selectedGeneration.ok
    && selectedGeneration.output
    && shouldRunSeoEditorialRepair(
      selectedStructural,
      selectedCommercial,
      selectedKeywordPlacement,
    );
  if (shouldRunFinalReview) {
    const finalReviewPrompt = buildFinalReviewPrompt(
      promptContract,
      selectedGeneration.output,
      selectedStructural.issues || [],
      selectedCommercial.issues || [],
      selectedKeywordPlacement.issues || [],
      bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword
        || bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword_norm
        || null,
      buildFinalEditorContext(bundle.seoPackDraft),
    );
    finalReviewGeneration = await generateSeoDraftWithOpenAi(finalReviewPrompt, {
      model: process.env.FEYA_SEO_OPENAI_EDITOR_MODEL || 'gpt-5.4',
      reasoningEffort: 'high',
    });
    if (finalReviewGeneration.output) {
      finalReviewGeneration = {
        ...finalReviewGeneration,
        output: normalizeFinalSeoEditorialOutput(finalReviewGeneration.output),
      };
    }
    finalReviewStructural = finalReviewGeneration.output ? validateSeoAgentOutput(finalReviewGeneration.output) : validateSeoAgentOutput(null);
    finalReviewCommercial = finalReviewGeneration.output
      ? validateSeoCommercialCopy(finalReviewGeneration.output, commercialContext)
      : validateSeoCommercialCopy(null, commercialContext);
    finalReviewKeywordPlacement = validateSeoKeywordPlacement(finalReviewGeneration.output, bundle.seoPackDraft);

    if (
      finalReviewGeneration.ok
      && finalReviewGeneration.output
      && isStrictlyBetterSeoEditorialCandidate(
        [finalReviewStructural, finalReviewCommercial, finalReviewKeywordPlacement],
        [selectedStructural, selectedCommercial, selectedKeywordPlacement],
      )
    ) {
      selectedGeneration = finalReviewGeneration;
      selectedStructural = finalReviewStructural;
      selectedCommercial = finalReviewCommercial;
      selectedKeywordPlacement = finalReviewKeywordPlacement;
      finalReviewUsed = true;
    }
  }

  const shouldRunResidualReview = finalReviewGeneration?.ok
    && finalReviewGeneration.output
    && shouldRunSeoEditorialRepair(
      finalReviewStructural,
      finalReviewCommercial,
      finalReviewKeywordPlacement,
    );
  if (shouldRunResidualReview) {
    const residualReviewPrompt = buildFinalReviewPrompt(
      promptContract,
      finalReviewGeneration.output,
      finalReviewStructural.issues || [],
      finalReviewCommercial.issues || [],
      finalReviewKeywordPlacement.issues || [],
      bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword
        || bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword_norm
        || null,
      buildFinalEditorContext(bundle.seoPackDraft),
    );
    // The strong editor already did the substantive rewrite. This bounded pass
    // only repairs its remaining deterministic issue codes and must stay inside
    // the synchronous Vercel request budget.
    residualReviewGeneration = await generateSeoDraftWithOpenAi(residualReviewPrompt, {
      model: process.env.FEYA_SEO_OPENAI_EDITOR_MODEL || 'gpt-5.4',
      reasoningEffort: 'medium',
    });
    if (residualReviewGeneration.output) {
      const normalizedResidualOutput = normalizeFinalSeoEditorialOutput(residualReviewGeneration.output);
      residualReviewGeneration = {
        ...residualReviewGeneration,
        output: mergeBoundedSeoEditorialRepair(
          finalReviewGeneration.output,
          normalizedResidualOutput,
          finalReviewStructural,
          finalReviewCommercial,
          finalReviewKeywordPlacement,
        ),
      };
    }
    residualReviewStructural = residualReviewGeneration.output
      ? validateSeoAgentOutput(residualReviewGeneration.output)
      : validateSeoAgentOutput(null);
    residualReviewCommercial = residualReviewGeneration.output
      ? validateSeoCommercialCopy(residualReviewGeneration.output, commercialContext)
      : validateSeoCommercialCopy(null, commercialContext);
    residualReviewKeywordPlacement = validateSeoKeywordPlacement(
      residualReviewGeneration.output,
      bundle.seoPackDraft,
    );

    if (
      residualReviewGeneration.ok
      && residualReviewGeneration.output
      && isStrictlyBetterSeoEditorialCandidate(
        [residualReviewStructural, residualReviewCommercial, residualReviewKeywordPlacement],
        [selectedStructural, selectedCommercial, selectedKeywordPlacement],
      )
    ) {
      selectedGeneration = residualReviewGeneration;
      selectedStructural = residualReviewStructural;
      selectedCommercial = residualReviewCommercial;
      selectedKeywordPlacement = residualReviewKeywordPlacement;
      residualReviewUsed = true;
    }
  }

  const shared = buildSharedPayload(bundle, readiness, promptContract, primaryImageUrl);
  const finalDraft = selectedGeneration.output ? sanitizeOutputForReadiness(selectedGeneration.output, readiness) : null;
  const assembledSeoPack = finalDraft ? assembleSeoProductPack({
    draft: bundle.seoPackDraft,
    output: finalDraft,
    structuralValidation: selectedStructural,
    commercialValidation: selectedCommercial,
    keywordPlacementValidation: selectedKeywordPlacement,
    productTruthBlockers: getSeoPackDraftSaveBlockers(bundle.seoPackDraft),
  }) : null;
  const finalOk = Boolean(selectedGeneration.ok && selectedStructural.ok && selectedCommercial.ok && selectedKeywordPlacement.ok);

  const attemptSummary = {
    first_pass: {
      openai: sanitizeGeneration(firstGeneration),
      structural_validation: firstStructural,
      commercial_validation: firstCommercial,
      keyword_placement_validation: firstKeywordPlacement,
    },
    humanizer_repair: repairGeneration ? {
      attempted: true,
      selected: repairUsed && !finalReviewUsed && !residualReviewUsed,
      openai: sanitizeGeneration(repairGeneration),
      structural_validation: repairStructural,
      commercial_validation: repairCommercial,
      keyword_placement_validation: repairKeywordPlacement,
    } : {
      attempted: false,
      selected: false,
      reason: shouldRepair ? 'first_generation_unavailable' : 'deterministic_qa_clean',
    },
    final_editorial_review: finalReviewGeneration ? {
      attempted: true,
      selected: finalReviewUsed && !residualReviewUsed,
      openai: sanitizeGeneration(finalReviewGeneration),
      structural_validation: finalReviewStructural,
      commercial_validation: finalReviewCommercial,
      keyword_placement_validation: finalReviewKeywordPlacement,
    } : {
      attempted: false,
      selected: false,
      reason: shouldRunFinalReview ? 'selected_generation_unavailable' : 'best_candidate_qa_clean',
    },
    residual_editorial_review: residualReviewGeneration ? {
      attempted: true,
      selected: residualReviewUsed,
      openai: sanitizeGeneration(residualReviewGeneration),
      structural_validation: residualReviewStructural,
      commercial_validation: residualReviewCommercial,
      keyword_placement_validation: residualReviewKeywordPlacement,
    } : {
      attempted: false,
      selected: false,
      reason: shouldRunResidualReview ? 'residual_generation_unavailable' : 'final_editorial_candidate_qa_clean_or_not_selected',
    },
  };

  if (!finalOk) {
    return NextResponse.json({
      ok: false,
      status: selectedGeneration.ok ? 'generated_output_failed_validation' : selectedGeneration.status,
      blocked: true,
      mode: 'openai_draft_only_not_saved',
      message: selectedGeneration.ok
        ? 'OpenAI generated a review draft and the bounded editorial review ran when needed, but deterministic QA still blocks saving or publishing. The best draft is shown for review.'
        : 'OpenAI draft generation failed. Nothing was saved or published.',
      openai_generation: sanitizeGeneration(selectedGeneration),
      generated_draft_output: finalDraft,
      generated_draft_validation: selectedStructural,
      generated_draft_commercial_validation: selectedCommercial,
      generated_draft_keyword_placement_validation: selectedKeywordPlacement,
      assembled_seo_pack: assembledSeoPack,
      generation_attempts: attemptSummary,
      ...shared,
    }, { status: selectedGeneration.ok ? 422 : 502 });
  }

  const status = repairUsed || finalReviewUsed || residualReviewUsed ? 'ai_full_draft_repaired_not_saved' : 'ai_full_draft_generated_not_saved';

  return NextResponse.json({
    ok: true,
    status,
    blocked: false,
    mode: 'openai_draft_only_not_saved',
    message: repairUsed || finalReviewUsed || residualReviewUsed
      ? 'The first draft needed correction. The bounded editorial review produced a valid review draft from approved Keyword Bank metrics. Nothing was saved or published.'
      : 'The OpenAI SEO review draft passed deterministic structure and commercial QA. Nothing was saved or published.',
    openai_generation: sanitizeGeneration(selectedGeneration),
    generated_draft_output: finalDraft,
    generated_draft_validation: selectedStructural,
    generated_draft_commercial_validation: selectedCommercial,
    generated_draft_keyword_placement_validation: selectedKeywordPlacement,
    assembled_seo_pack: assembledSeoPack,
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
  const compositionBlockers = getSeoGenerationProductTruthBlockers(draft);
  hardBlockers.push(...compositionBlockers);

  const hasCanonicalTruth = truth.product_truth_source === 'seo_product_truth_v1';
  sectionBlockers.push(...compositionBlockers);

  return {
    mode: hardBlockers.length ? 'BLOCKED' : 'READY_FULL',
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    allowed_customer_sections: hardBlockers.length ? [] : GENERATED_SECTIONS,
    suppressed_customer_sections: hardBlockers.length
      ? [...GENERATED_SECTIONS, 'right_panel_whats_included']
      : [],
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

function buildHumanizerRepairPrompt(promptContract, currentOutput, structuralIssues, commercialIssues, keywordPlacementIssues) {
  const primaryKeyword = keywordPlacementIssues.find((issue) => (
    issue.keyword && String(issue.code || '').startsWith('primary_')
  ))?.keyword || null;
  const issueLines = [
    ...structuralIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...commercialIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...keywordPlacementIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}${issue.keyword ? ` [${issue.keyword}]` : ''}`),
  ];
  const repairRules = [
    '',
    'THEFEYA HUMANIZER REPAIR PASS:',
    'Return a complete seo_agent_output_v1 JSON object, not a patch and not commentary.',
    'Rewrite the generated customer-facing SEO fields and four left_description blocks from a clean editorial sheet to satisfy the exact validator issues below. The current wording is not a template.',
    'Preserve confirmed product identity, approved keyword roles, visual facts, internal-linking intent, and all forbidden-claim boundaries.',
    'Do not add, infer, translate, or repair included components, selectable configurations, prices, or raw option meanings.',
    'Do not generate or paraphrase any fixed right-panel content or What’s Included.',
    'Use first-person studio voice in Designed for self-expression: we, our, us. Do not begin with “TheFEYA is” and do not describe the studio as they or their.',
    'Keep each section functionally distinct: About describes this product; Why gives different purchase benefits; Ideal for gives supported use cases; Designed for self-expression describes our studio and the buyer’s visual identity.',
    'Remove repeated ideas and near-duplicate sentences. A concept such as reflective finish, sculptural silhouette, camera presence, durability, fit, or studio authorship should appear where it is strongest, not in every block.',
    'Rewrite Why you’ll love it as 3-4 purchase reasons. Every bullet must connect a supported feature or studio truth to a concrete buyer outcome.',
    'Use exactly one concrete studio-design differentiation benefit; use the remaining bullets for supported wearability, adjustment, comfort, shape retention, durability, or verified finish behavior.',
    'State studio value as buyer value: our varied original ideas help the buyer choose a distinctive design and build a complete look that feels personal. Do not compare it with standard templates, generic costumes or mass production.',
    'Never say that an item keeps its shape during movement. Explain supported retention as keeping shape between wears, resisting creasing, storing better or remaining reusable for future events.',
    'Use construction, structure or build in at most one Why bullet.',
    'Move styles, events, personas, audiences, stage/camera use and keyword variants to Ideal for. Delete abstract visual commentary and never invent a filler fifth bullet.',
    'Use the exact Primary phrase no more than four times across the complete pack. Reserve those placements for seo_title, H1, meta_description and exactly one useful body passage, preferably About this piece. Do not repeat it in ALT, Why, Ideal for, Designed for self-expression, or in both intro and About.',
    'Keep the Primary whole-product concept as the clearest recurring subject without chasing a density percentage. Use idiomatic inflection and restrained semantic variation; do not build synonym chains.',
    'Treat operator-selected event, style, persona and audience values as a hard focus boundary. Never import rave, cosplay or another unselected high-intent context from the legacy title, image, current draft or Keyword Bank.',
    'If the operator selected an event focus, H1 must contain the whole-product Primary meaning and one selected event in the natural pattern [primary product entity] for [selected event]. Do not inventory the components there.',
    'Intro and About this piece must do different jobs and must not repeat the same event sentence, finish, fit claim or benefit.',
    'Do not recap the deterministic component inventory in intro, meta or About this piece. Delete “combines”, “pairs”, “brings together” or equivalent sentences that merely restate What’s Included. A component term may remain only when it supports a different concrete buyer benefit.',
    'The fixed right panel already owns raw fit, material, production, shipping and care facts. Never copy or lightly paraphrase a right-panel sentence into the left description. Use a supported fact once only when it produces a different concrete buyer outcome.',
    'Rewrite Designed for self-expression as 45-75 words in 3-4 natural sentences: our independent design team and fresh point of view, how varied original ideas help people find a design that feels like them, and how this product supports a complete look in one supported setting. Begin naturally with “At TheFEYA, we” or an equivalent first-person construction. Never begin with “TheFEYA is” and never mention team size.',
    'Delete visual noise, clarity of the look, expressive accent, presence, character, considered appearance and other abstract design-review language.',
    'Delete all computer-vision reporting from commercial copy: left/right orientation, positioned high, visible from the front, clearly visible, anatomical upper-body geometry and shoulder coordinates belong only in ALT or visual_truth.',
    'Delete desert light, desert-ready, standard costume template and buyers who want or are looking for a product component. Start from the buyer’s event/style/performance look.',
    'Do not weaken factual specificity and do not introduce generic AI sales language.',
    'Exact validation issues to repair:',
    ...(issueLines.length ? issueLines.map((line) => `- ${line}`) : ['- Improve human rhythm and remove repetition.']),
    '',
    'Current generated JSON to repair:',
    JSON.stringify(currentOutput, null, 2),
    '',
    'FINAL SILENT CHECK BEFORE RETURNING JSON:',
    primaryKeyword
      ? `- Count the phrase “${primaryKeyword}” across every customer-facing field. It may appear no more than four times total: SEO title, H1, meta description and one About sentence only. Remove it from intro, ALT, Why, Ideal for and the studio close.`
      : '- Keep the approved whole-product Primary in the required fields without exact-match repetition.',
    '- H1 contains one selected event. Intro does not repeat About. Neither intro nor About names the complete component inventory.',
    '- Image ALT starts from the visible sold component names and may use one natural approved component-level Secondary phrase; it does not repeat the exact whole-product Primary.',
    '- Why has 3-4 different bullets. Use “build a look” only as studio-design buyer value; use construction/structure in no more than one other bullet.',
    '- A finish bullet must state a concrete supported result such as catching available light or keeping detail visible in photographs, never “a strong look”.',
    '- Ideal for uses people, roles, occasions or productions directly. Never write “buyers who want” or “people looking for”.',
    '- Designed for self-expression explicitly connects the design to the buyer’s visual identity, personal style or own look.',
    '- Delete coordinated, stage-ready presence, strong finish, clear performance feel, bold complete outfit and every sentence that merely sounds promotional.',
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${repairRules}`,
    user_prompt: `${promptContract.user_prompt}\n${repairRules}`,
    guardrails: [...(promptContract.guardrails || []), repairRules],
  };
}

function buildFinalReviewPrompt(
  promptContract,
  currentOutput,
  structuralIssues,
  commercialIssues,
  keywordPlacementIssues,
  authoritativePrimaryKeyword,
  authoritativeContext,
) {
  const primaryKeyword = authoritativePrimaryKeyword || keywordPlacementIssues.find((issue) => (
    issue.keyword && String(issue.code || '').startsWith('primary_')
  ))?.keyword || null;
  const issueLines = [
    ...structuralIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...commercialIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...keywordPlacementIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}${issue.keyword ? ` [${issue.keyword}]` : ''}`),
  ];
  const finalSystem = [
    'You are the final human-copy line editor for TheFEYA product pages.',
    'Return only one complete JSON object matching seo_agent_output_v1. Do not return commentary.',
    'The current JSON is a rejected editorial draft, not a wording template. Preserve its supported facts, contract keys, visual_truth items, internal-linking hints and forbidden-claim boundaries, but replace its customer-facing wording where needed.',
    'Rewrite only customer-facing SEO fields, image ALT wording, and the four left_description bodies needed to remove the listed QA issues.',
    'Do not invent a component, material property, event, audience, fit promise, price, delivery promise or right-panel wording.',
    'Use natural en-US ecommerce prose. Every sentence must answer a buyer question or add a concrete supported outcome.',
    'Do not use coordinated, stage-ready presence, strong finish, clear performance feel, bold complete outfit, reads clearly, buyers who want, or people looking for.',
  ].join('\n');
  const finalUser = [
    'Repair every listed issue. Silently validate the finished JSON before returning it.',
    'Deterministic issues:',
    ...(issueLines.length ? issueLines.map((line) => `- ${line}`) : ['- Remove repetition and robotic phrasing.']),
    '',
    'AUTHORITATIVE CONTEXT — preserve it exactly and never expand it from the legacy title, current draft, image, Keyword Bank, or imagination:',
    JSON.stringify(authoritativeContext || {}, null, 2),
    'Only non-empty manual_focus event, style, persona and audience values may become high-intent customer contexts. A null or empty axis means do not invent a value for that axis.',
    'Never add rave, cosplay, fantasy, historical, medieval, costume-party or another subculture/style/event unless that exact value is present in manual_focus.',
    'Do not use the generic word event or events anywhere in customer-facing copy. Name a selected occasion instead.',
    '',
    primaryKeyword
      ? `PRIMARY PLACEMENT: “${primaryKeyword}” must appear in SEO title, H1, meta description and exactly one About this piece sentence. Maximum four total. It must not appear in intro, ALT, highlights, Why, Ideal for or the studio close.`
      : 'Keep the approved whole-product Primary in required fields without repetition.',
    'SEO title is at most 68 characters, H1 at most 82 characters, and meta description at most 150 characters. Count before returning JSON.',
    'SEO title and H1 contain the exact Primary and one already-selected event. Use the natural construction “[Primary] for Burning Man” when Burning Man is the priority. End after the product-and-occasion meaning; do not append material or a fixed-right-panel fact unless that term is present in the approved keyword roles. Never write “for Burning Man styling”, “for festival styling”, or fuse two selected values into “Burning Man Festival”. Because this is a compact set, title and H1 do not inventory its components.',
    'Meta, intro and About do not list or paraphrase the component inventory.',
    'CONCEPT OWNERSHIP: Intro owns the selected occasion and the whole-product buyer job. About owns the exact Primary plus one different supported product/design outcome. Why owns original studio design plus two product-specific buyer outcomes supported by visual or product facts. Ideal for owns people and selected uses. The close owns studio identity and self-expression. Do not move the same idea into two owners.',
    'Intro contains exactly two concrete sentences. It states the selected buyer use and one supported design value. Leave fit/adjustment, finish/light behavior, material and component inventory to their owned sections so Intro cannot duplicate Why or the right panel.',
    'Intro does not say part of a complete look, centerpiece, focal piece, easy to style, creates an accent, clear costume shape, distinct outline, character-driven feel, or make the idea land.',
    'About contains the exact Primary once, explains the whole product in one selected setting, and adds a different buyer value. Use two short sentences: the first connects the exact Primary to the selected occasion and buyer job; the second may name one observed component only when it explains what the wearer can combine, keep visible or change. Because separately selectable components form this set, never describe them as one piece, one continuous or unbroken line, a line from one body area to another, or a single design running between components. Do not write shows up cleanly, shows up clearly or similar design-review shorthand. Do not repeat the intro, and do not repeat straps, adjustment, fit or comfort from the fixed panel.',
    'Within each About sentence, use each meaningful content noun only once, treating singular and plural as the same term. Rewrite the sentence instead of mechanically swapping in a near-synonym. Never write constructions such as “shoulder pieces ... base pieces” inside one sentence.',
    'ALT starts with the visibly sold component names in plain idiomatic English, not the exact whole-product Primary. Prefer one natural approved component-level Secondary only when it accurately describes what is visible.',
    'Keep each repeated idea in one strongest block only. Finish or light behavior belongs in at most one Why bullet, not intro, About, Ideal for or the studio close.',
    'Why contains exactly three distinct fact-to-outcome bullets: (1) one original-design benefit tied to personal styling, (2) one product-specific framing or styling-flexibility outcome, and (3) one different product-specific movement, photography, wear or practical outcome. The first bullet must name studio authorship plainly with “original studio design”, “studio-designed”, or an equally explicit studio-design phrase; do not replace authorship with a shoulder-and-skirt pairing or another inventory recap. Every bullet contains one supported feature and one buyer result, not two benefits joined with “and”. When Product Truth confirms separately selectable pieces, changing a base layer or restyling one piece is a valid styling-flexibility outcome; say change, swap, wear or restyle plainly, never rebuild the outfit. Do not name both confirmed components in the same Why bullet. The fixed right panel already explains standard sizing, adjustable straps, comfort, material, shape retention, production, shipping, care and customization; do not reuse those as left-block topics unless product-specific evidence cannot support two honest outcomes, and then use at most one with a genuinely different buyer result. “Build a look” is not product construction. Never use strong look, statement piece, presence or character as an outcome.',
    'Ideal for contains exactly three short bullets. Use the grammar “[real person or professional role] + [active use] + [selected occasion or supported production]” and stop after the use case. Cover the authoritative event and persona focus naturally across the three bullets. Mention each selected focus value at most once in the entire Ideal for block: if “Burning Man attendees” is the subject, do not repeat “Burning Man” later in that bullet; if “festival dancers” is the subject, do not end with “for a festival”. Do not make an occasion itself the grammatical subject, do not describe gold, metallic finish, silhouette, structure, construction, components or any other product detail here, and do not invent an extra context merely to fill a bullet.',
    'Ideal for contains no finish, anatomy, product inventory, fantasy, historical framing, “statement piece”, “calls for”, “when needed”, buyers-who-want or people-looking-for language. Do not repeat a meaningful word inside one bullet, such as “warrior-inspired performers wearing a warrior look”.',
    'Designed for self-expression contains exactly three natural sentences and 50-65 words. Begin “At TheFEYA, we…” and identify us as an independent design studio or independent design team. Connect our original ideas to the buyer’s visual identity, personal style, a design that feels like them, or their own look without comparing the buyer with a generic or standard costume.',
    'Use TheFEYA exactly once in all customer-facing generated copy, only in Designed for self-expression. Never put the brand in SEO title, H1, meta description, intro, ALT, Why or Ideal for.',
    'HUMAN VOICE CHECK: read every customer-facing sentence as a shopper. Rewrite any sentence whose value depends on vague approval words or an undefined comparison rather than a concrete meaning. In particular, do not write defined direction, visually defined, feels intentional, overall styling, memorable look, individual direction, blending into standard styling, final result, made for the moment, strong starting point, practical choice, or stands apart from a basic or generic look. Do not replace them with another abstract fashion-analysis phrase.',
    'Outside the studio close, prefer concrete verbs such as frame, move, pair, wear and photograph. Do not describe an “idea”, “theme”, “direction” or “identity” when a concrete product action or buyer result can say the same thing.',
    'Read About, Why and Ideal aloud once. Replace “warrior line”, “armored effect”, “visually open”, “continuous line”, “cohesive styling”, “shows up cleanly”, “photos pick up more depth” and similar design-review shorthand with a plain statement of what the wearer can combine, do, change or photograph.',
    'Do not repeat raw fit, material, production, shipping or care sentences from the fixed right panel.',
    '',
    'Current JSON:',
    JSON.stringify(currentOutput, null, 2),
  ].join('\n');
  return {
    ...promptContract,
    system_prompt: finalSystem,
    user_prompt: finalUser,
    guardrails: [...(promptContract.guardrails || []), finalSystem],
  };
}

function buildFinalEditorContext(seoPackDraft) {
  const truth = seoPackDraft?.product_truth || {};
  const sellableOffer = truth?.sellable_offer || {};
  const compactRole = (item) => ({
    keyword: item?.keyword || item?.keyword_norm || null,
    role: item?.role || null,
    search_volume: item?.search_volume ?? item?.volume ?? null,
    competition: item?.competition || null,
  });
  return {
    manual_focus: seoPackDraft?.manual_focus || null,
    product_truth: {
      product_truth_source: truth?.product_truth_source || null,
      category: truth?.category || null,
      material: truth?.material || null,
      color: truth?.color || null,
      world: truth?.world || null,
      included_components: truth?.included_components || [],
      sellable_offer: {
        status: sellableOffer?.status || null,
        component_labels: sellableOffer?.component_labels || [],
        default_included_components: sellableOffer?.default_included_components || [],
      },
    },
    keyword_roles: {
      primary: (seoPackDraft?.keyword_roles?.primary || []).map(compactRole),
      secondary: (seoPackDraft?.keyword_roles?.secondary || []).map(compactRole),
      supporting: (seoPackDraft?.keyword_roles?.supporting || []).map(compactRole),
    },
  };
}

function sanitizeOutputForReadiness(output, readiness) {
  const safe = JSON.parse(JSON.stringify(output || {}));
  safe.generation_notes = unique([
    ...(Array.isArray(safe.generation_notes) ? safe.generation_notes : []),
    'Canonical Product Truth is available; selected-configuration contents remain storefront-controlled.',
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
        : 'blocked_composition_not_generated',
      humanizer_repair_attempts: 2,
    },
    guardrails: [
      'No Supabase write was performed.',
      'No Listing Master decision was created or updated.',
      'Only approved Keyword Bank rows with real metric provenance were used.',
      compositionReady
        ? 'Canonical Product Truth is connected; the storefront controls selected-configuration contents.'
        : 'The storefront What’s Included panel is hidden because composition remains unresolved.',
      'At most two bounded editorial passes may rewrite generated left copy. Each pass must reduce deterministic QA issues and cannot change product facts, saved focus, keyword roles, or the right panel.',
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
    composition_missing_canonical_product_truth: 'Generation is blocked because canonical Product Truth is unavailable.',
    composition_missing_confirmed_components: 'Generation is blocked because the exact included components are not confirmed.',
    composition_has_unresolved_facts: 'Generation is blocked because component facts remain unresolved.',
    composition_has_review_blockers: 'Generation is blocked because component mappings require human review.',
    composition_missing_source_configuration_evidence: 'Generation is blocked because the source listing does not provide configuration evidence.',
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
