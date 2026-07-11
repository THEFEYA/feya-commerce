// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildPilotKeywordBankFallbackBundle } from '@/lib/seoPilotKeywordBankFallback';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { generateSeoDraftWithOpenAi } from '@/lib/seoOpenAiDraftGenerator';

export const dynamic = 'force-dynamic';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-generate-pilot-auto',
    method: 'POST',
    mode: 'controlled_read_only_keyword_bank_fallback',
    product_id: PILOT_PRODUCT_ID,
    writes: false,
    publish: false,
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

  const generation = await generateSeoDraftWithOpenAi(promptContract, { primaryImageUrl });
  const validation = generation.output ? validateSeoAgentOutput(generation.output) : validateSeoAgentOutput(null);

  const shared = {
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
      product_truth_mode: 'partial_composition_suppressed',
    },
    guardrails: [
      'No Supabase write was performed.',
      'No Listing Master decision was created or updated.',
      'Only approved Keyword Bank rows with real metric provenance were used.',
      'What’s Included is suppressed because composition remains unresolved.',
      'No draft save or publish action is performed by this route.',
    ],
  };

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
      ...shared,
    }, { status: generation.ok ? 422 : 502 });
  }

  const reviewDraft = sanitizePartialOutput(generation.output, readiness);

  return NextResponse.json({
    ok: true,
    status: 'ai_partial_draft_generated_not_saved',
    blocked: false,
    mode: 'openai_draft_only_not_saved',
    message: 'The first real OpenAI SEO review draft was generated from canonical approved Keyword Bank metrics. Nothing was saved or published.',
    openai_generation: sanitizeGeneration(generation),
    generated_draft_output: reviewDraft,
    generated_draft_validation: validation,
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
  const identityEvidence = [
    truth.category,
    truth.material,
    truth.color,
    truth.world,
    truth.primary_image_url,
  ].some((value) => Boolean(String(value || '').trim()));

  if (!draft?.canonical_product_id) hardBlockers.push('missing_canonical_product_id');
  if (!truth?.title?.trim()) hardBlockers.push('missing_product_title');
  if (!truth?.slug?.trim()) hardBlockers.push('missing_product_slug');
  if (!identityEvidence) hardBlockers.push('insufficient_product_identity_evidence');
  if (!usefulKeywords.length) hardBlockers.push('missing_primary_or_secondary_keyword');
  if ((draft?.metrics_status?.validated_count || 0) < 1) hardBlockers.push('missing_validated_keyword_metric');
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');

  sectionBlockers.push('composition_missing_canonical_product_truth');
  sectionBlockers.push('composition_missing_confirmed_components');
  sectionBlockers.push('composition_has_unresolved_facts');
  sectionBlockers.push('composition_has_review_blockers');

  return {
    mode: hardBlockers.length ? 'BLOCKED' : 'READY_PARTIAL',
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    allowed_customer_sections: hardBlockers.length
      ? []
      : ['seo_title', 'h1', 'meta_description', 'intro', 'about_this_piece', 'why_youll_love_it', 'ideal_for', 'material', 'image_alt_candidates'],
    suppressed_customer_sections: hardBlockers.length
      ? ['seo_title', 'h1', 'meta_description', 'intro', 'about_this_piece', 'whats_included', 'why_youll_love_it', 'ideal_for', 'material', 'image_alt_candidates']
      : ['whats_included'],
  };
}

function applyReadinessToPromptContract(promptContract, readiness) {
  const appendix = [
    '',
    'GENERATION READINESS CONTRACT:',
    '- generation_mode: READY_PARTIAL',
    `- allowed_customer_sections: ${readiness.allowed_customer_sections.join(', ')}`,
    '- suppressed_customer_sections: whats_included',
    `- section_blockers: ${readiness.section_blockers.join(', ')}`,
    '- Generate a useful review draft for every allowed customer section.',
    '- Set output status to needs_review.',
    '- Do not state which pieces are included, do not reinterpret raw option labels, and do not mention prices.',
    '- For schema validation only, include a whats_included left_description block in the normal required position with this exact body: "Configuration details are withheld from this draft until product composition review is complete."',
    '- The schema-only whats_included block must use source_basis needs_human_review and needs_human_review true.',
    '- The server will remove that schema-only block before returning the human review draft.',
    '- All other customer-facing sections must be polished, specific, natural English and grounded in product identity, image truth and validated keyword evidence.',
  ].join('\n');

  return {
    ...promptContract,
    system_prompt: `${promptContract.system_prompt}\n${appendix}`,
    user_prompt: `${promptContract.user_prompt}\n${appendix}`,
    guardrails: [...(promptContract.guardrails || []), appendix],
  };
}

function sanitizePartialOutput(output, readiness) {
  const safe = JSON.parse(JSON.stringify(output || {}));
  safe.status = 'needs_review';
  safe.pdp_blocks = Array.isArray(safe.pdp_blocks)
    ? safe.pdp_blocks.filter((block) => block?.block_key !== 'whats_included')
    : [];
  safe.generation_notes = unique([
    ...(Array.isArray(safe.generation_notes) ? safe.generation_notes : []),
    'What’s Included was suppressed because product composition is not fully confirmed.',
    ...readiness.section_blockers,
  ]);
  safe.suppressed_sections = ['whats_included'];
  safe.generation_readiness = 'READY_PARTIAL';
  return safe;
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
