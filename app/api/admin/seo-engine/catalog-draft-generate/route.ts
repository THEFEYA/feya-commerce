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
  normalizeFinalSeoEditorialOutput,
  shouldSelectFinalSeoEditorialCandidate,
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
    generation_passes: 2,
    final_editorial_rewrite_passes: 1,
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
  const commercialContext = {
    product_truth: bundle.seoPackDraft.product_truth,
    manual_focus: bundle.seoPackDraft.manual_focus,
    keyword_roles: bundle.seoPackDraft.keyword_roles,
  };
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
    ? validateSeoCommercialCopy(firstGeneration.output, commercialContext)
    : validateSeoCommercialCopy(null, commercialContext);
  const firstKeywordPlacement = validateSeoKeywordPlacement(firstGeneration.output, bundle.seoPackDraft);

  let selectedGeneration = firstGeneration;
  let selectedStructural = firstStructural;
  let selectedCommercial = firstCommercial;
  let selectedKeywordPlacement = firstKeywordPlacement;
  let finalReviewGeneration = null;
  let finalReviewStructural = null;
  let finalReviewCommercial = null;
  let finalReviewKeywordPlacement = null;
  let finalReviewUsed = false;

  // One fast writer plus one strong clean-sheet editor is the complete
  // synchronous pipeline. The former mini-editor and residual fourth call made
  // the route exceed Vercel's five-minute ceiling without adding an independent
  // quality signal.
  const shouldRunFinalReview = Boolean(firstGeneration.ok && firstGeneration.output);
  if (shouldRunFinalReview) {
    const finalReviewPrompt = buildFinalReviewPrompt(
      promptContract,
      firstGeneration.output,
      firstStructural.issues || [],
      firstCommercial.issues || [],
      firstKeywordPlacement.issues || [],
      bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword
        || bundle.seoPackDraft?.keyword_roles?.primary?.[0]?.keyword_norm
        || null,
      buildFinalEditorContext(bundle.seoPackDraft, firstGeneration.output),
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
      ? validateSeoCommercialCopy(finalReviewGeneration.output, commercialContext)
      : validateSeoCommercialCopy(null, commercialContext);
    finalReviewKeywordPlacement = validateSeoKeywordPlacement(finalReviewGeneration.output, bundle.seoPackDraft);

    if (
      finalReviewGeneration.ok
      && finalReviewGeneration.output
      && shouldSelectFinalSeoEditorialCandidate(
        [finalReviewStructural, finalReviewCommercial, finalReviewKeywordPlacement],
        [firstStructural, firstCommercial, firstKeywordPlacement],
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
    humanizer_repair: {
      attempted: false,
      selected: false,
      reason: 'removed_from_synchronous_two_pass_pipeline',
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
      reason: shouldRunFinalReview ? 'final_editor_generation_unavailable' : 'first_generation_unavailable',
    },
    residual_editorial_review: {
      attempted: false,
      selected: false,
      reason: 'removed_from_synchronous_two_pass_pipeline',
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
    status: finalReviewUsed ? 'catalog_full_draft_repaired_not_saved' : 'catalog_full_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_review_draft_not_saved',
    message: finalReviewUsed
      ? 'The fast writer and independent strong editorial pass produced a valid catalog review draft. Nothing was saved or published.'
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
    'Do not use coordinated, stage-ready presence, strong finish, clear performance feel, bold complete outfit, reads clearly, buyers who want, people looking for, harder look, stronger costume look, more finished costume, looks intentional, or turn a vision into a look.',
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
    'SEO title is at most 68 characters and H1 at most 82 characters. Meta description is 110-150 characters and must identify the whole product and Burning Man, then add only a supported differentiator or purchase choice. Because a search snippet must stand alone, it may briefly repeat one core differentiator used on-page, but it must not repeat the component inventory. Never write pairs with your own layers, stronger costume look, sculpted look or another abstract padding phrase. Count before returning JSON.',
    'SEO title and H1 contain the exact Primary and one already-selected event. Use the natural construction “[Primary] for Burning Man” when Burning Man is the priority. End after the product-and-occasion meaning; do not append material or a fixed-right-panel fact unless that term is present in the approved keyword roles. Never write “for Burning Man styling”, “for festival styling”, or fuse two selected values into “Burning Man Festival”. Because this is a compact set, title and H1 do not inventory its components.',
    'Meta, intro and About do not list or paraphrase the component inventory.',
    'CONCEPT OWNERSHIP: Intro owns the selected occasion and the whole-product buyer job. About owns the exact Primary plus one different supported product or design outcome. Why owns original studio design plus one or two product-specific buyer outcomes supported by explicit visual or product facts. Ideal for owns people and selected uses. The close owns studio identity and self-expression. Do not move the same idea into two visible on-page owners.',
    'Intro contains exactly two concrete sentences. It states the selected buyer use and one supported design value. Leave fit/adjustment, finish/light behavior, material and component inventory to their owned sections so Intro cannot duplicate Why or the right panel. Across intro, About and Ideal for combined, base layer, top or bodysuit styling may appear in at most one sentence.',
    'Intro does not say part of a complete look, centerpiece, focal piece, easy to style, creates an accent, clear costume shape, distinct outline, character-driven feel, make the idea land, anchor an outfit, or contrast with darker pieces the buyer may own.',
    'About contains the exact Primary once, explains the whole product in one selected setting, and adds a different buyer value. Use one or two short sentences. Name one observed component only when visual_truth_evidence explicitly supports the concrete buyer outcome. Never infer coverage, freer movement, or how much clothing or body stays visible from a component shape. Do not compare the product with a full uniform or head-to-toe costume, and do not say the buyer can skip one or still feel dressed. Because separately selectable components form this set, never describe them as one piece, one continuous or unbroken line, a line from one body area to another, or a single design running between components. Do not write shows up cleanly, shows up clearly or similar design-review shorthand. Do not repeat the intro, and do not repeat straps, adjustment, fit or comfort from the fixed panel.',
    'Within each About sentence, use each meaningful content noun only once, treating singular and plural as the same term. Rewrite the sentence instead of mechanically swapping in a near-synonym. Never write constructions such as “shoulder pieces ... base pieces” inside one sentence.',
    'ALT starts with one natural approved component-level Secondary when it accurately describes the visible sold product, then may name another confirmed sold component and a brief setting. Natural word order and inflection are allowed. Omit base clothing, footwear, accessories and props that are visible but not confirmed as sold.',
    'Keep each repeated idea in one strongest block only. Before returning, silently assign every non-Primary buyer benefit to exactly one owner: meta, intro, About, Why, Ideal for or studio close. If the same idea appears in two owners through different wording, keep the stronger version and replace the other with a genuinely different supported value. Finish or light behavior belongs in at most one Why bullet, not intro, About, Ideal for or the studio close.',
    'Why contains exactly two or three distinct fact-to-outcome bullets. Two honest reasons are correct when the evidence does not support a third; never invent a filler bullet to reach three. Bullet 1 names one original-design benefit tied to a concrete buyer choice. Bullet 2 gives one different practical or visual outcome supported by sellable-offer truth or explicit visual_truth_evidence. Add bullet 3 only when another independent outcome is explicitly evidenced. The design bullet must name studio authorship plainly with “original studio design”, “studio-designed”, or an equally explicit studio-design phrase; do not replace authorship with an inventory recap. Every bullet contains one supported feature and one buyer result, not two benefits joined with “and”. Separately selectable components may support choosing, ordering, replacing or restyling one part, but do not list the full inventory. Use wearer-framing only when visual evidence explicitly describes the relevant shape or placement. Use light behavior only when visual evidence explicitly confirms glossy or light-catching behavior; metallic-looking alone and every uncertainty are insufficient. Never infer freer dancing, coverage, weather performance or comfort from component shape. The fixed right panel already explains standard sizing, adjustable straps, comfort, material, shape retention, production, shipping, care and customization; do not reuse those as left-block topics. “Build a look” is not product construction. Never use strong look, statement piece, presence, character, more individual look or looks intentional as an outcome.',
    'If left_copy_evidence_policy.required_why_plan is non-null, follow its value families exactly and return exactly that many Why bullets. The standalone meta snippet may repeat the separately-selectable purchase fact; the visible Why bullet must explain its concrete buyer consequence. Never replace the plan with matching-color composition, above-and-below-waist balance, photographs-as-one-outfit, or a comparison with separate add-ons.',
    'Ideal for contains exactly three short, natural use cases. A bullet may be a concise phrase or a sentence; never force a person + action + occasion template. Cover the authoritative event and persona focus naturally across the block, using each selected focus value at most once. Do not invent a profession, time of day, weather condition, location or extra audience merely to fill a bullet. Do not describe gold, metallic finish, silhouette, structure, construction, components or another product detail here.',
    'Ideal for contains no finish, anatomy, product inventory, fantasy, historical framing, “statement piece”, “calls for”, “when needed”, buyers-who-want or people-looking-for language. Do not repeat a meaningful word inside one bullet, such as “warrior-inspired performers wearing a warrior look”.',
    'Designed for self-expression contains exactly three natural sentences and 50-65 words. Begin “At TheFEYA, we…” and identify us as an independent design studio or independent design team. Connect our original ideas to personal style or a design that feels like the wearer. Write like a founder speaking plainly, not a brand manifesto. Do not use expressive dressing, a clearer sense of visual identity, not just something to wear once, from the first photo to the last, or turn a vision into a look.',
    'Use TheFEYA exactly once in all customer-facing generated copy, only in Designed for self-expression. Never put the brand in SEO title, H1, meta description, intro, ALT, Why or Ideal for.',
    'HUMAN VOICE CHECK: read every customer-facing sentence aloud as a shopper or salesperson. Rewrite anything that sounds like a search query, design critique, image-analysis note or sentence written only to satisfy a template. A grammatically valid sentence still fails if a normal person would not say it. Prefer a concrete product action or buyer result over abstract nouns such as layout, structure, balance, direction or presence. Do not add after sunset, outdoors or another filler circumstance unless it is both supported and useful to the purchase decision.',
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

function buildFinalEditorContext(seoPackDraft, firstPassOutput) {
  const truth = seoPackDraft?.product_truth || {};
  const sellableOffer = truth?.sellable_offer || {};
  const visualTruth = firstPassOutput?.visual_truth || {};
  const separatelySelectableLabels = (sellableOffer?.atomic_options || [])
    .map((item) => item?.label)
    .filter(Boolean);
  const requiredWhyPlan = separatelySelectableLabels.length >= 2
    ? [
      {
        value_family: 'studio_design_and_craft',
        supported_fact: 'original studio design',
        allowed_buyer_outcome: 'the buyer can interpret the selected persona through their own styling rather than copy a named character',
      },
      {
        value_family: 'purchase_flexibility',
        supported_fact: `these components are separately selectable: ${separatelySelectableLabels.join(', ')}`,
        allowed_buyer_outcome: 'the buyer can order only the part they need, or replace or restyle one part without buying the full set',
      },
    ]
    : null;
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
        separately_selectable_components: separatelySelectableLabels,
        aggregate_options: (sellableOffer?.aggregate_options || []).map((item) => ({
          label: item?.label || null,
          member_labels: item?.member_labels || [],
        })),
      },
    },
    keyword_roles: {
      primary: (seoPackDraft?.keyword_roles?.primary || []).map(compactRole),
      secondary: (seoPackDraft?.keyword_roles?.secondary || []).map(compactRole),
      supporting: (seoPackDraft?.keyword_roles?.supporting || []).map(compactRole),
    },
    visual_truth_evidence: {
      observed_product_facts: visualTruth?.observed_product_facts || [],
      uncertain_or_missing_facts: visualTruth?.uncertain_or_missing_facts || [],
      forbidden_visual_claims: visualTruth?.forbidden_visual_claims || [],
    },
    left_copy_evidence_policy: {
      original_studio_design: 'supported by brand policy',
      separately_selectable_purchase_format: separatelySelectableLabels,
      required_why_plan: requiredWhyPlan,
      fixed_right_panel_topics_to_avoid_repeating: [
        'standard sizing',
        'adjustable straps',
        'comfort',
        'material',
        'shape retention',
        'production',
        'shipping',
        'care',
        'customization',
      ],
      rule: 'Use only supported facts. Two strong Why bullets are sufficient when a third independent value is not explicitly evidenced.',
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
      generation_passes: 2,
      final_editorial_rewrite_passes: 1,
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
