// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
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
  isStrictlyBetterSeoEditorialCandidate,
  normalizeFinalSeoEditorialOutput,
  shouldRunSeoEditorialRepair,
} from '@/lib/seoEditorialCandidateSelection';

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
    humanizer_repair_attempts: 2,
    final_editor_model: process.env.FEYA_SEO_OPENAI_EDITOR_MODEL || 'gpt-5.4',
    final_editor_reasoning_effort: 'high',
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
    ? validateSeoCommercialCopy(firstGeneration.output, { product_truth: bundle.seoPackDraft.product_truth, manual_focus: bundle.seoPackDraft.manual_focus })
    : validateSeoCommercialCopy(null, { product_truth: bundle.seoPackDraft.product_truth, manual_focus: bundle.seoPackDraft.manual_focus });
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

  const shouldRepair = shouldRunSeoEditorialRepair(
    firstStructural,
    firstCommercial,
    firstKeywordPlacement,
  );
  if (firstGeneration.ok && firstGeneration.output && shouldRepair) {
    const repairPrompt = buildRepairPrompt(
      promptContract,
      firstGeneration.output,
      firstStructural.issues || [],
      firstCommercial.issues || [],
      firstKeywordPlacement.issues || [],
    );
    // The second pass is an editorial pass over verified text. Excluding the image
    // prevents the editor from drifting back into computer-vision narration.
    repairGeneration = await generateSeoDraftWithOpenAi(repairPrompt);
    repairStructural = repairGeneration.output
      ? validateSeoAgentOutput(repairGeneration.output)
      : validateSeoAgentOutput(null);
    repairCommercial = repairGeneration.output
      ? validateSeoCommercialCopy(repairGeneration.output, { product_truth: bundle.seoPackDraft.product_truth, manual_focus: bundle.seoPackDraft.manual_focus })
      : validateSeoCommercialCopy(null, { product_truth: bundle.seoPackDraft.product_truth, manual_focus: bundle.seoPackDraft.manual_focus });
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
    finalReviewStructural = finalReviewGeneration.output
      ? validateSeoAgentOutput(finalReviewGeneration.output)
      : validateSeoAgentOutput(null);
    finalReviewCommercial = finalReviewGeneration.output
      ? validateSeoCommercialCopy(finalReviewGeneration.output, { product_truth: bundle.seoPackDraft.product_truth, manual_focus: bundle.seoPackDraft.manual_focus })
      : validateSeoCommercialCopy(null, { product_truth: bundle.seoPackDraft.product_truth, manual_focus: bundle.seoPackDraft.manual_focus });
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
      selected: repairUsed && !finalReviewUsed,
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
      selected: finalReviewUsed,
      openai: sanitizeGeneration(finalReviewGeneration),
      structural_validation: finalReviewStructural,
      commercial_validation: finalReviewCommercial,
      keyword_placement_validation: finalReviewKeywordPlacement,
    } : {
      attempted: false,
      selected: false,
      reason: shouldRunFinalReview ? 'selected_generation_unavailable' : 'best_candidate_qa_clean',
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
    status: repairUsed || finalReviewUsed ? 'catalog_full_draft_repaired_not_saved' : 'catalog_full_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_review_draft_not_saved',
    message: repairUsed || finalReviewUsed
      ? 'The first pass needed correction. The bounded editorial review produced a valid catalog review draft. Nothing was saved or published.'
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
  hardBlockers.push(...getSeoKeywordSelectionBlockers(draft));
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');
  if (draft?.qa_checks?.validated_metrics === 'blocker') hardBlockers.push('qa_blocker_validated_metrics');
  const compositionBlockers = getSeoGenerationProductTruthBlockers(draft);
  hardBlockers.push(...compositionBlockers);

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
    '- Composition is ready. Use confirmed identity naturally without merging mutually exclusive configurations.',
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${appendix}`,
    user_prompt: `${promptContract.user_prompt}\n${appendix}`,
    guardrails: [...(promptContract.guardrails || []), appendix],
  };
}

function buildRepairPrompt(promptContract, currentOutput, structuralIssues, commercialIssues, keywordPlacementIssues) {
  const primaryKeyword = keywordPlacementIssues.find((issue) => (
    issue.keyword && String(issue.code || '').startsWith('primary_')
  ))?.keyword || null;
  const prioritizedKeywordIssues = keywordPlacementIssues.filter((issue) => (
    issue.severity === 'blocker'
    || issue.code === 'primary_missing_meta_description'
    || issue.code === 'primary_missing_body'
  ));
  const commercialWarnings = keywordPlacementIssues
    .filter((issue) => issue.severity !== 'blocker' && issue.code === 'commercial_keyword_unplaced')
    .filter((issue, index, issues) => (
      issues.findIndex((candidate) => candidate.keyword === issue.keyword) === index
    ))
    .slice(0, 2);
  prioritizedKeywordIssues.push(...commercialWarnings);

  const issueLines = [
    ...structuralIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...commercialIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}`),
    ...prioritizedKeywordIssues.map((issue) => `${issue.severity}:${issue.code}: ${issue.message}${issue.keyword ? ` [${issue.keyword}]` : ''}`),
  ];
  const editorPolicy = [
    '',
    'THEFEYA FINAL BUYER-COPY EDITOR:',
    'Return a complete seo_agent_output_v1 JSON object, not a patch or commentary.',
    'Rewrite the customer-facing draft from a clean editorial sheet as a senior ecommerce editor. Product Truth, saved manual focus and approved keyword roles are authoritative; the current wording is not.',
    'Every sentence must answer a normal buyer question or add a concrete purchase benefit. Delete sentences that do neither.',
    'Treat search queries as evidence, not finished customer copy. SEO title, H1, metadata and body copy must use idiomatic English; reorder query tokens and inflect words when grammar requires it.',
    'Preserve the Primary product meaning and search intent naturally. Exact query word order is not required when it would produce awkward English. Secondary keywords are optional semantic evidence, never an exact-placement checklist.',
    'Use the exact Primary phrase no more than four times across the complete pack. Reserve those placements for seo_title, H1, meta_description and exactly one useful body passage, preferably About this piece. Do not repeat it in ALT, Why, Ideal for, Designed for self-expression, or in both intro and About.',
    'Keep the Primary whole-product concept as the clearest recurring subject without chasing a density percentage. Use idiomatic inflection and restrained semantic variation; do not build synonym chains.',
    'The operator-selected event, style, persona and audience values are a hard focus boundary. Never import rave, cosplay or another unselected high-intent context from the legacy title, image, current draft or Keyword Bank.',
    'Prefer clear product, event and buyer language. Do not write fashion-analysis, computer-vision or internal SEO language.',
    'Keep About this piece product-specific; Why you’ll love it benefit-led; Ideal for use-case-led; Designed for self-expression studio-led.',
    'H1 must contain the whole-product Primary meaning and one operator-selected event in natural English. Do not use its limited space to inventory the components.',
    'Intro and About this piece must do different jobs and must not repeat the same event sentence, finish, fit claim or benefit.',
    'Do not recap the deterministic component inventory in intro, meta or About this piece. Delete “combines”, “pairs”, “brings together” or equivalent sentences that merely restate What’s Included. A component word may remain only when it supports a different concrete buyer benefit.',
    'Why you’ll love it: 3-4 different supported reasons, each expressed as fact -> concrete buyer outcome. Include one concrete original-design benefit.',
    'The fixed right panel already owns raw fit, material, production, shipping and care facts. Never copy or lightly paraphrase a right-panel sentence into the left description. Use a supported fact once only when it produces a different concrete buyer outcome.',
    'Ideal for: supported events, personas, productions or styles only; never product anatomy or finish details.',
    'Designed for self-expression: 45-75 words about our independent design team, original ideas, and helping people build a look that feels personal. Begin naturally with “At TheFEYA, we” or an equivalent first-person construction. Never begin with “TheFEYA is” and never mention team size.',
    'Do not repeat a benefit, finish claim, event use or product-query variant across blocks.',
    'Do not repeat the product entity through a near-synonym in H1 or meta.',
    'Do not use abstract filler such as bold color, bold gold finish, coordinated look, coordinated costume, stage-ready shape, visual noise, presence, character, body line, reads clearly or sculptural silhouette.',
    'If supported commercial-intent keywords are listed, use at most one natural purchase sentence about ordering online, made-to-order availability or delivery. Never stack buy/order/shop/delivery phrases and never invent an offer.',
    'Do not report left/right orientation, placement, visibility from the front or other computer-vision coordinates in commercial copy.',
    'Do not alter raw variations, component mappings, configuration meaning, prices or the fixed right PDP panel.',
    'Do not turn Shoulder into Shoulders or Shoulders into Shoulder unless the source configuration itself uses that grammar.',
  ].join('\n');
  const repairRequest = [
    'Repair the current draft against these prioritized validation issues:',
    'Exact validation issues:',
    ...(issueLines.length ? issueLines.map((line) => `- ${line}`) : ['- Improve differentiation, rhythm and commercial clarity.']),
    '',
    'Current JSON to repair:',
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
    system_prompt: `${promptContract.system_prompt}\n${editorPolicy}`,
    user_prompt: repairRequest,
    guardrails: [...(promptContract.guardrails || []), editorPolicy],
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
    'SEO title and H1 contain the exact Primary and one already-selected event. Use Burning Man by itself when it is the clearest priority; do not fuse two selected values into the unnatural phrase “Burning Man Festival”. Because this is a compact set, title and H1 do not inventory its components.',
    'Meta, intro and About do not list or paraphrase the component inventory.',
    'CONCEPT OWNERSHIP: Intro owns the selected occasion and the whole-product buyer job. About owns the exact Primary plus one different supported product/design outcome. Why owns original studio design plus two product-specific buyer outcomes supported by visual or product facts. Ideal for owns people and selected uses. The close owns studio identity and self-expression. Do not move the same idea into two owners.',
    'Intro contains exactly two concrete sentences. It states the selected buyer use and one supported design value. Leave fit/adjustment, finish/light behavior, material and component inventory to their owned sections so Intro cannot duplicate Why or the right panel.',
    'Intro does not say part of a complete look, centerpiece, focal piece, easy to style, creates an accent, clear costume shape, distinct outline, character-driven feel, or make the idea land.',
    'About contains the exact Primary once, explains the whole product in one selected setting, and adds a different buyer value. Use two short sentences: the first connects the exact Primary to the selected occasion and buyer job; the second may name one observed component only when it explains what the wearer can combine, keep visible or change. Because separately selectable components form this set, never describe them as one piece, one continuous or unbroken line, a line from one body area to another, or a single design running between components. Do not write shows up cleanly, shows up clearly or similar design-review shorthand. Do not repeat the intro, and do not repeat straps, adjustment, fit or comfort from the fixed panel.',
    'ALT starts with the visibly sold component names in plain idiomatic English, not the exact whole-product Primary. Prefer one natural approved component-level Secondary only when it accurately describes what is visible.',
    'Keep each repeated idea in one strongest block only. Finish or light behavior belongs in at most one Why bullet, not intro, About, Ideal for or the studio close.',
    'Why contains exactly three distinct fact-to-outcome bullets: (1) one original-design benefit tied to personal styling, (2) one product-specific framing or styling-flexibility outcome, and (3) one different product-specific movement, photography, wear or practical outcome. Every outcome must be supported by Product Truth or preserved visual_truth. When Product Truth confirms separately selectable pieces, changing a base layer or restyling one piece is a valid styling-flexibility outcome; say change, swap, wear or restyle plainly, never rebuild the outfit. The fixed right panel already explains standard sizing, adjustable straps, comfort, material, shape retention, production, shipping, care and customization; do not reuse those as left-block topics unless product-specific evidence cannot support two honest outcomes, and then use at most one with a genuinely different buyer result. “Build a look” is not product construction. Never use strong look, statement piece, presence or character as an outcome.',
    'Ideal for contains exactly three short bullets. Use the grammar “[real person or professional role] + [active use] + [selected occasion or supported production]” and stop after the use case. Cover the authoritative event and persona focus naturally across the three bullets. Mention each selected focus value at most once in the entire Ideal for block: if “Burning Man attendees” is the subject, do not repeat “Burning Man” later in that bullet; if “festival dancers” is the subject, do not end with “for a festival”. Do not make an occasion itself the grammatical subject, do not describe gold, metallic finish, silhouette, structure, construction, components or any other product detail here, and do not invent an extra context merely to fill a bullet.',
    'Ideal for contains no finish, anatomy, product inventory, fantasy, historical framing, “statement piece”, “calls for”, “when needed”, buyers-who-want or people-looking-for language.',
    'Designed for self-expression contains exactly three natural sentences and 50-65 words. Begin “At TheFEYA, we…” and identify us as an independent design studio or independent design team. Connect our original ideas to the buyer’s visual identity, personal style, a design that feels like them, or their own look without comparing the buyer with a generic or standard costume.',
    'Use TheFEYA exactly once in all customer-facing generated copy, only in Designed for self-expression. Never put the brand in SEO title, H1, meta description, intro, ALT, Why or Ideal for.',
    'HUMAN VOICE CHECK: read every customer-facing sentence as a shopper. Rewrite any sentence whose value depends on vague approval words rather than a concrete meaning. In particular, do not write defined direction, visually defined, feels intentional, overall styling, memorable look, individual direction, blending into standard styling, final result, made for the moment, strong starting point, or practical choice. Do not replace them with another abstract fashion-analysis phrase.',
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
      humanizer_repair_attempts: 2,
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
