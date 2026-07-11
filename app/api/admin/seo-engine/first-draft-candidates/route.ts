// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';

export const dynamic = 'force-dynamic';

const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const DECISION_SELECT = [
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'selected_keywords_json',
  'decision_status',
  'updated_at',
  'created_at',
].join(',');

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      status: 'missing_supabase_service_env',
      error: 'Server-side Supabase access is unavailable.',
    }, { status: 503 });
  }

  const result = await supabase
    .from(DECISIONS_TABLE)
    .select(DECISION_SELECT)
    .limit(2000);

  if (result.error) {
    return NextResponse.json({
      ok: false,
      status: 'decision_read_failed',
      error: result.error.message,
    }, { status: 500 });
  }

  const latestByProduct = new Map();
  [...(result.data || [])]
    .sort((a, b) => timestamp(b) - timestamp(a))
    .forEach((row) => {
      const id = String(row.canonical_product_id || '').trim();
      if (id && !latestByProduct.has(id)) latestByProduct.set(id, row);
    });

  const decisionsWithKeywords = [...latestByProduct.values()]
    .filter((row) => Array.isArray(row.selected_keywords_json) && row.selected_keywords_json.length > 0)
    .slice(0, 120);

  const candidates = [];
  for (const chunk of chunks(decisionsWithKeywords, 8)) {
    const rows = await Promise.all(chunk.map(async (decision) => {
      const productId = String(decision.canonical_product_id || '').trim();
      const bundle = await buildSeoBriefContractBundle(productId);
      return summarizeCandidate(bundle, decision);
    }));
    candidates.push(...rows);
  }

  candidates.sort((a, b) => {
    if (a.ready_for_openai !== b.ready_for_openai) return a.ready_for_openai ? -1 : 1;
    if (a.hard_blockers.length !== b.hard_blockers.length) return a.hard_blockers.length - b.hard_blockers.length;
    if (a.validated_metric_count !== b.validated_metric_count) return b.validated_metric_count - a.validated_metric_count;
    return b.useful_keyword_count - a.useful_keyword_count;
  });

  const ready = candidates.filter((item) => item.ready_for_openai);

  return NextResponse.json({
    ok: true,
    status: ready.length ? 'ready_candidate_found' : 'no_ready_candidate_found',
    read_only: true,
    totals: {
      decision_rows: (result.data || []).length,
      distinct_products_with_decisions: latestByProduct.size,
      products_with_selected_keywords: decisionsWithKeywords.length,
      candidates_checked: candidates.length,
      ready_for_openai: ready.length,
    },
    best_candidate: ready[0] || candidates[0] || null,
    ready_candidates: ready.slice(0, 10),
    nearest_candidates: candidates.slice(0, 20),
    guardrails: [
      'Read-only SELECT operations only.',
      'No OpenAI call.',
      'No Supabase write.',
      'No draft save or publish.',
      'Trusted keyword metric provenance remains mandatory.',
    ],
  });
}

function summarizeCandidate(bundle, decision) {
  const draft = bundle?.seoPackDraft || null;
  const truth = draft?.product_truth || {};
  const primary = draft?.keyword_roles?.primary || [];
  const secondary = draft?.keyword_roles?.secondary || [];
  const usefulKeywords = [...primary, ...secondary].filter((item) => Boolean(item?.keyword || item?.keyword_norm));
  const validatedCount = Number(draft?.metrics_status?.validated_count || 0);
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

  const hardBlockers = [];
  if (!draft) hardBlockers.push('missing_seo_pack_draft');
  if (!draft?.canonical_product_id) hardBlockers.push('missing_canonical_product_id');
  if (!truth?.title?.trim()) hardBlockers.push('missing_product_title');
  if (!truth?.slug?.trim()) hardBlockers.push('missing_product_slug');
  if (!identityEvidence) hardBlockers.push('insufficient_product_identity_evidence');
  if (!usefulKeywords.length) hardBlockers.push('missing_primary_or_secondary_keyword');
  if (validatedCount < 1) hardBlockers.push('missing_validated_keyword_metric');
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');
  if (draft?.qa_checks?.validated_metrics === 'blocker') hardBlockers.push('qa_blocker_validated_metrics');

  const sectionBlockers = [];
  if (truth.product_truth_source !== 'seo_product_truth_v1') sectionBlockers.push('composition_missing_canonical_product_truth');
  if (!((truth.included_components || []).length || (truth.known_components || []).length)) sectionBlockers.push('composition_missing_confirmed_components');
  if ((truth.unresolved_component_facts || []).length) sectionBlockers.push('composition_has_unresolved_facts');
  if ((truth.component_review_blockers || []).length) sectionBlockers.push('composition_has_review_blockers');

  return {
    canonical_product_id: draft?.canonical_product_id || decision?.canonical_product_id || null,
    matched_etsy_listing_id: draft?.matched_etsy_listing_id || decision?.matched_etsy_listing_id || null,
    product_slug: truth.slug || decision?.product_slug || null,
    product_title: truth.title || null,
    decision_status: decision?.decision_status || null,
    seo_pack_status: draft?.status || null,
    product_truth_source: truth.product_truth_source || bundle?.productTruthSource || null,
    useful_keyword_count: usefulKeywords.length,
    validated_metric_count: validatedCount,
    primary_keywords: primary.slice(0, 5).map(keywordSummary),
    secondary_keywords: secondary.slice(0, 5).map(keywordSummary),
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    generation_mode: hardBlockers.length
      ? 'BLOCKED'
      : sectionBlockers.length
        ? 'READY_PARTIAL'
        : 'READY_FULL',
    ready_for_openai: hardBlockers.length === 0,
    preview_path: draft?.canonical_product_id
      ? `/admin/seo-engine/draft-preview?product_id=${encodeURIComponent(draft.canonical_product_id)}`
      : null,
  };
}

function keywordSummary(item) {
  return {
    keyword: item?.keyword || item?.keyword_norm || null,
    avg_monthly_searches: item?.avg_monthly_searches ?? null,
    competition: item?.competition ?? null,
    metric_source: item?.metric_source ?? null,
    last_checked: item?.last_checked ?? null,
  };
}

function timestamp(row) {
  return new Date(row?.updated_at || row?.created_at || 0).getTime();
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}
