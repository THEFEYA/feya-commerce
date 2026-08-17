// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import {
  getSeoGenerationProductTruthBlockers,
  getSeoKeywordSelectionBlockers,
} from '@/lib/seoPackContract';
import { STOREFRONT_VIEW_V1 } from '@/lib/storefront';
import { hasTrustedSeoMetricSnapshot } from '@/lib/seoTrustedMetricSnapshot';
import {
  getSeoPortfolioGenerationBlockers,
  getSeoPrimaryConflictBlockersForDecision,
} from '@/lib/seoPrimaryKeywordOwnership';

export const dynamic = 'force-dynamic';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';
const GENERIC_GENERATION_ROUTE = '/api/admin/seo-engine/catalog-draft-generate';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const LATEST_DRAFT_VIEW = 'feya_commerce_v_seo_pack_drafts_latest_v1';
const STOREFRONT_V1_CANDIDATE_SELECT = [
  'canonical_product_id',
  'product_slug',
  'matched_etsy_listing_id',
  'card_title',
  'h1',
  'product_type',
  'material',
  'color',
  'primary_image_url',
  'primary_image_alt',
].join(',');
const DECISION_SELECT = [
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'selected_keywords_json',
  'decision_status',
  'updated_at',
  'created_at',
].join(',');
const LATEST_DRAFT_SELECT = [
  'id',
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'status',
  'review_status',
  'updated_at',
  'created_at',
].join(',');

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('product_id')?.trim() || '';
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      status: 'missing_supabase_service_env',
      error: 'Server-side Supabase access is unavailable.',
    }, { status: 503 });
  }

  if (productId) return loadCandidateDetail(productId);

  const [decisionResult, catalogResult, draftResult] = await Promise.all([
    supabase.from(DECISIONS_TABLE).select(DECISION_SELECT).limit(2000),
    supabase.from(STOREFRONT_VIEW_V1).select(STOREFRONT_V1_CANDIDATE_SELECT).limit(1000),
    supabase.from(LATEST_DRAFT_VIEW).select(LATEST_DRAFT_SELECT).limit(2000),
  ]);

  if (decisionResult.error) {
    return NextResponse.json({
      ok: false,
      status: 'decision_read_failed',
      error: decisionResult.error.message,
    }, { status: 500 });
  }

  if (catalogResult.error) {
    return NextResponse.json({
      ok: false,
      status: 'catalog_read_failed',
      error: catalogResult.error.message,
    }, { status: 500 });
  }

  const latestDecisionByProduct = latestRowsByProduct(decisionResult.data || []);
  const latestDraftByProduct = latestRowsByProduct(draftResult.data || []);
  const catalogByProduct = new Map();

  (catalogResult.data || []).forEach((row) => {
    const id = clean(row?.canonical_product_id);
    if (id) catalogByProduct.set(id, row);
  });

  const allIds = new Set([
    ...catalogByProduct.keys(),
    ...latestDecisionByProduct.keys(),
    ...latestDraftByProduct.keys(),
    PILOT_PRODUCT_ID,
  ]);

  const candidates = [...allIds]
    .map((id) => {
      const candidate = summarizeCatalogCandidate(
        id,
        catalogByProduct.get(id) || null,
        latestDecisionByProduct.get(id) || null,
        latestDraftByProduct.get(id) || null,
        getSeoPrimaryConflictBlockersForDecision(
          latestDecisionByProduct.get(id) || null,
          decisionResult.data || [],
        ),
      );
      return id === PILOT_PRODUCT_ID ? { ...candidate, is_controlled_pilot: true } : candidate;
    })
    .filter(Boolean)
    .sort(compareCandidates);

  const ready = candidates.filter((item) => item.ready_for_openai);
  const fullPackReady = candidates.filter((item) => item.ready_for_full_pack);
  const blocked = candidates.filter((item) => !item.ready_for_openai);
  const withSavedDraft = candidates.filter((item) => item.has_saved_draft);
  const needsKeywordPreparation = candidates.filter((item) => item.workflow_stage === 'needs_keyword_preparation');

  return NextResponse.json({
    ok: true,
    status: ready.length ? 'catalog_ready' : 'catalog_loaded_without_ready_candidate',
    read_only: true,
    totals: {
      catalog_rows: (catalogResult.data || []).length,
      decision_rows: (decisionResult.data || []).length,
      distinct_products_with_decisions: latestDecisionByProduct.size,
      candidates: candidates.length,
      ready_for_openai: ready.length,
      ready_for_full_pack: fullPackReady.length,
      blocked: blocked.length,
      needs_keyword_preparation: needsKeywordPreparation.length,
      with_saved_draft: withSavedDraft.length,
    },
    best_candidate: ready.find((item) => item.is_controlled_pilot && !item.has_saved_draft)
      || ready.find((item) => !item.has_saved_draft)
      || ready[0]
      || candidates.find((item) => item.is_controlled_pilot)
      || candidates[0]
      || null,
    candidates,
    ready_candidates: ready.slice(0, 40),
    nearest_candidates: blocked.slice(0, 80),
    pilot_preflight: {
      canonical_product_id: PILOT_PRODUCT_ID,
      ready: Boolean(candidates.find((item) => item.canonical_product_id === PILOT_PRODUCT_ID)?.ready_for_openai),
      deferred_to_candidate_detail: true,
      error: null,
    },
    warnings: [
      ...(draftResult.error ? [`latest_draft_read_failed: ${draftResult.error.message}`] : []),
    ],
    guardrails: [
      'Catalog loading and pilot preparation are read-only.',
      'The list uses the fast storefront v1 summary; Product Truth and Keyword Bank detail load only for the selected product.',
      'No OpenAI call occurs while loading this list.',
      'No Supabase write, draft save, apply or publish.',
      'Automatic focus/keyword recommendations must be reviewed and saved in Listing Master before OpenAI generation.',
    ],
  });
}

async function loadCandidateDetail(productId: string) {
  const bundle = await buildSeoBriefContractBundle(productId);

  if (bundle?.error) {
    return NextResponse.json({
      ok: false,
      status: 'canonical_product_truth_read_failed',
      error: bundle.error,
      product_id: productId,
      read_only: true,
    }, { status: 503 });
  }

  const baseCandidate = summarizeCandidate(bundle, bundle?.decision || null);
  const candidate = productId === PILOT_PRODUCT_ID
    ? { ...baseCandidate, is_controlled_pilot: true }
    : baseCandidate;

  if (!candidate?.canonical_product_id) {
    return NextResponse.json({
      ok: false,
      status: 'candidate_not_found',
      error: bundle?.error || 'The selected product could not be resolved.',
      product_id: productId,
      read_only: true,
    }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: 'candidate_detail_ready',
    read_only: true,
    candidate,
    guardrails: [
      'No OpenAI call.',
      'No Supabase write.',
      'No draft save or publish.',
    ],
  });
}

function summarizeCatalogCandidate(id, product, decision, latestDraft, primaryConflictBlockers = []) {
  const selectedKeywords = Array.isArray(decision?.selected_keywords_json)
    ? decision.selected_keywords_json.filter((item) => clean(item?.keyword || item?.keyword_norm))
    : [];
  const validatedMetricCount = selectedKeywords.filter(hasTrustedSeoMetricSnapshot).length;
  const hardBlockers = [];

  if (!product) hardBlockers.push('missing_storefront_catalog_product');
  if (!clean(product?.card_title || product?.h1)) hardBlockers.push('missing_product_title');
  if (!clean(product?.product_slug || decision?.product_slug || latestDraft?.product_slug)) hardBlockers.push('missing_product_slug');
  if (!selectedKeywords.length) hardBlockers.push('missing_primary_or_secondary_keyword');
  if (validatedMetricCount < 1) hardBlockers.push('missing_validated_keyword_metric');
  if (clean(decision?.decision_status).toLowerCase() === 'blocked_by_product_mismatch') {
    hardBlockers.push('draft_status_blocked_by_product_mismatch');
  }
  if (clean(latestDraft?.status).toLowerCase() === 'blocked_by_product_mismatch') {
    hardBlockers.push('latest_draft_blocked_by_product_mismatch');
  }
  hardBlockers.push(...primaryConflictBlockers);

  return {
    canonical_product_id: id,
    matched_etsy_listing_id: product?.matched_etsy_listing_id || decision?.matched_etsy_listing_id || latestDraft?.matched_etsy_listing_id || null,
    product_slug: product?.product_slug || decision?.product_slug || latestDraft?.product_slug || null,
    product_title: product?.card_title || product?.h1 || product?.product_slug || id,
    primary_image_url: product?.primary_image_url || null,
    primary_image_alt: product?.primary_image_alt || product?.card_title || null,
    product_type: product?.product_type || null,
    material: product?.material || null,
    color: product?.color || null,
    decision_status: decision?.decision_status || null,
    selected_keyword_count: selectedKeywords.length,
    useful_keyword_count: selectedKeywords.length,
    validated_metric_count: validatedMetricCount,
    latest_draft_id: latestDraft?.id || null,
    latest_draft_status: latestDraft?.status || null,
    latest_review_status: latestDraft?.review_status || null,
    latest_draft_at: latestDraft?.updated_at || latestDraft?.created_at || null,
    has_saved_draft: Boolean(latestDraft?.id),
    hard_blockers: unique(hardBlockers),
    section_blockers: [],
    generation_mode: hardBlockers.length ? 'BLOCKED' : 'READY_CHECK',
    ready_for_openai: hardBlockers.length === 0,
    ready_for_full_pack: false,
    workflow_stage: hardBlockers.some((code) => code.includes('keyword_metric') || code.includes('primary_or_secondary_keyword'))
      ? 'needs_keyword_preparation'
      : hardBlockers.length ? 'blocked_by_product_truth' : 'ready_for_generation',
    is_controlled_pilot: false,
    generation_route: GENERIC_GENERATION_ROUTE,
    updated_at: decision?.updated_at || decision?.created_at || latestDraft?.updated_at || latestDraft?.created_at || null,
  };
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
  if (draft?.keyword_selection?.status !== 'confirmed') hardBlockers.push('keyword_selection_not_human_confirmed');
  if (draft?.status === 'blocked_by_product_mismatch') hardBlockers.push('draft_status_blocked_by_product_mismatch');
  if (draft?.qa_checks?.forbidden_mismatch === 'blocker') hardBlockers.push('qa_blocker_forbidden_mismatch');
  if (draft?.qa_checks?.product_specificity === 'blocker') hardBlockers.push('qa_blocker_product_specificity');
  if (draft?.qa_checks?.validated_metrics === 'blocker') hardBlockers.push('qa_blocker_validated_metrics');
  hardBlockers.push(...getSeoKeywordSelectionBlockers(draft));
  hardBlockers.push(...getSeoPortfolioGenerationBlockers(bundle?.portfolioStrategy));

  const sectionBlockers = getSeoGenerationProductTruthBlockers(draft);

  return {
    canonical_product_id: draft?.canonical_product_id || decision?.canonical_product_id || null,
    matched_etsy_listing_id: draft?.matched_etsy_listing_id || decision?.matched_etsy_listing_id || null,
    product_slug: truth.slug || decision?.product_slug || null,
    product_title: truth.title || null,
    primary_image_url: truth.primary_image_url || null,
    primary_image_alt: truth.primary_image_alt || truth.title || null,
    decision_status: decision?.decision_status || null,
    keyword_selection: draft?.keyword_selection || null,
    keyword_recommendation_diagnostics: bundle?.keywordRecommendationDiagnostics || null,
    portfolio_strategy: bundle?.portfolioStrategy || null,
    seo_pack_status: draft?.status || null,
    product_truth_source: truth.product_truth_source || bundle?.productTruthSource || null,
    useful_keyword_count: usefulKeywords.length,
    selected_keyword_count: usefulKeywords.length,
    validated_metric_count: validatedCount,
    primary_keywords: primary.slice(0, 5).map(keywordSummary),
    secondary_keywords: secondary.slice(0, 5).map(keywordSummary),
    latest_draft_id: bundle?.latestSavedDraftContext?.id || null,
    latest_draft_status: bundle?.latestSavedDraftContext?.status || null,
    latest_review_status: bundle?.latestSavedDraftContext?.review_status || null,
    latest_draft_at: bundle?.latestSavedDraftContext?.updated_at || bundle?.latestSavedDraftContext?.created_at || null,
    has_saved_draft: Boolean(bundle?.latestSavedDraftContext?.id),
    hard_blockers: unique(hardBlockers),
    section_blockers: unique(sectionBlockers),
    generation_mode: hardBlockers.length || sectionBlockers.length ? 'BLOCKED' : 'READY_FULL',
    ready_for_openai: hardBlockers.length === 0 && sectionBlockers.length === 0,
    ready_for_full_pack: hardBlockers.length === 0 && sectionBlockers.length === 0,
    workflow_stage: hardBlockers.length || sectionBlockers.length ? 'blocked_by_contract' : 'ready_for_generation',
    is_controlled_pilot: false,
    generation_route: GENERIC_GENERATION_ROUTE,
    preview_path: draft?.canonical_product_id
      ? `/admin/seo-engine/draft-preview?product_id=${encodeURIComponent(draft.canonical_product_id)}`
      : null,
  };
}

function compareCandidates(a, b) {
  if (a.ready_for_openai !== b.ready_for_openai) return a.ready_for_openai ? -1 : 1;
  if (a.is_controlled_pilot !== b.is_controlled_pilot) return a.is_controlled_pilot ? -1 : 1;
  if (a.has_saved_draft !== b.has_saved_draft) return a.has_saved_draft ? 1 : -1;
  if (a.hard_blockers.length !== b.hard_blockers.length) return a.hard_blockers.length - b.hard_blockers.length;
  if (a.validated_metric_count !== b.validated_metric_count) return b.validated_metric_count - a.validated_metric_count;
  return String(a.product_title || '').localeCompare(String(b.product_title || ''));
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

function latestRowsByProduct(rows) {
  const map = new Map();
  [...(rows || [])]
    .sort((a, b) => timestamp(b) - timestamp(a))
    .forEach((row) => {
      const id = clean(row?.canonical_product_id);
      if (id && !map.has(id)) map.set(id, row);
    });
  return map;
}

function timestamp(row) {
  return new Date(row?.updated_at || row?.created_at || 0).getTime();
}

function clean(value) {
  return String(value || '').trim();
}

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}
