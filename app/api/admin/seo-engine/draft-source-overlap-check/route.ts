// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V4 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

const STORAGE_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const STORAGE_EVENTS_TABLE = 'feya_commerce_seo_pack_draft_events_v1';
const STORAGE_FLAG = 'FEYA_SEO_DRAFT_STORAGE_ENABLED';
const SOURCE_CANDIDATE_LIMIT = 120;
const WARNING_THRESHOLD = 0.58;
const BLOCKER_THRESHOLD = 0.78;

const SOURCE_SELECT = [
  'canonical_product_id',
  'product_slug',
  'matched_etsy_listing_id',
  'source_url',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'category_label',
  'world_label',
  'canonical_color_label',
  'primary_image_alt',
  'media_count',
  'min_price',
  'max_price',
  'currency',
  'public_configuration_count',
  'pdp_option_count',
].join(',');

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','can','for','from','in','into','is','it','of','on','or','the','this','to','with','your',
  'outfit','costume','fashion','wear','clothes','clothing','handmade','festival','rave','man','mens','men','women','womens','woman',
  'ready','review','draft','seo','pack','product','check','checked','thefeya'
]);

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-source-overlap-check',
    method: 'POST',
    mode: 'guarded_source_catalog_overlap_preflight',
    feature_flag: STORAGE_FLAG,
    source_view: STOREFRONT_VIEW_V4,
    strategy_doc: 'docs/SEO_PORTFOLIO_OVERLAP_STRATEGY_V1.md',
    expected_body: {
      draft_id: 'seo draft uuid',
    },
    guardrails: guardrails(),
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const draftId = String(body.draft_id || body.draftId || '').trim();
  const actor = String(body.actor || 'seo-approval-ui').trim();
  const storageEnabled = process.env[STORAGE_FLAG] === 'true';
  const serviceClient = getSupabaseServiceClient();

  if (!draftId) {
    return NextResponse.json({ ok: false, status: 'missing_draft_id', error: 'draft_id is required.', guardrails: guardrails() }, { status: 400 });
  }

  if (!storageEnabled) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_feature_flag_disabled',
      blocked: true,
      error: `${STORAGE_FLAG} is not true.`,
      guardrails: guardrails(),
    }, { status: 423 });
  }

  if (!serviceClient) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_missing_service_role_client',
      blocked: true,
      error: getMissingSupabaseServiceEnvMessage(),
      guardrails: guardrails(),
    }, { status: 503 });
  }

  const { data: currentDraft, error: readError } = await serviceClient
    .from(STORAGE_TABLE)
    .select('id,canonical_product_id,product_slug,status,review_status,seo_title,h1,meta_description,intro,bullet_highlights,faq,internal_linking_hints,keyword_roles_snapshot,qa_self_report,similarity_check_snapshot,product_truth_snapshot,agent_input_snapshot,created_at,updated_at')
    .eq('id', draftId)
    .is('archived_at', null)
    .single();

  if (readError || !currentDraft?.id) {
    return NextResponse.json({
      ok: false,
      status: 'draft_not_found',
      error: readError?.message || 'Draft was not found or is archived.',
      guardrails: guardrails(),
    }, { status: 404 });
  }

  const sourceState = await loadSourceState(serviceClient, currentDraft);
  const sourceOverlap = runSourceCatalogOverlapCheck(currentDraft, sourceState);
  const previousSnapshot = currentDraft.similarity_check_snapshot || {};
  const nextSimilaritySnapshot = {
    ...previousSnapshot,
    source_catalog_overlap_snapshot: sourceOverlap,
  };
  const nextQaReport = {
    ...(currentDraft.qa_self_report || {}),
    source_portfolio_overlap: sourceOverlap.status,
    source_portfolio_overlap_checked_at: sourceOverlap.checked_at,
    source_catalog_max_overlap_pct: sourceOverlap.source_catalog?.max_overlap_pct ?? null,
  };

  const shouldHoldForReview = sourceOverlap.status === 'blocker' || sourceOverlap.status === 'warning';
  const nextStatus = shouldHoldForReview ? 'needs_similarity_check' : (currentDraft.status === 'approved_draft' ? 'needs_image_alt_review' : currentDraft.status);

  const { data: updatedDraft, error: updateError } = await serviceClient
    .from(STORAGE_TABLE)
    .update({
      status: nextStatus,
      similarity_check_snapshot: nextSimilaritySnapshot,
      qa_self_report: nextQaReport,
    })
    .eq('id', draftId)
    .select('id,canonical_product_id,product_slug,status,review_status,similarity_check_snapshot,updated_at')
    .single();

  if (updateError || !updatedDraft?.id) {
    return NextResponse.json({
      ok: false,
      status: 'source_overlap_update_failed',
      error: updateError?.message || 'Source overlap update failed.',
      source_overlap: sourceOverlap,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  const eventPayload = {
    draft_id: updatedDraft.id,
    canonical_product_id: updatedDraft.canonical_product_id,
    event_type: 'similarity_checked',
    from_status: currentDraft.status,
    to_status: updatedDraft.status,
    actor,
    note: sourceOverlap.status === 'pass'
      ? 'Source/catalog overlap preflight passed. Draft can continue toward image ALT review. Publish not performed.'
      : 'Source/catalog overlap preflight found review risk. Draft remains before publish readiness.',
    payload: {
      check_type: 'source_catalog_overlap',
      status: sourceOverlap.status,
      target_source_loaded: Boolean(sourceState.target_product),
      source_candidate_count: sourceState.candidate_products.length,
      draft_vs_source_overlap_pct: sourceOverlap.draft_vs_target_source?.overlap_pct ?? null,
      source_catalog_max_overlap_pct: sourceOverlap.source_catalog?.max_overlap_pct ?? null,
      top_source_matches: sourceOverlap.source_catalog?.top_matches?.slice(0, 5) || [],
      publish_performed: false,
      ready_for_publish_performed: false,
    },
  };

  const { data: event, error: eventError } = await serviceClient
    .from(STORAGE_EVENTS_TABLE)
    .insert(eventPayload)
    .select('id,draft_id,canonical_product_id,event_type,from_status,to_status,created_at')
    .single();

  if (eventError || !event?.id) {
    return NextResponse.json({
      ok: false,
      status: 'source_overlap_event_failed',
      error: eventError?.message || 'Source overlap event insert failed.',
      draft: updatedDraft,
      source_overlap: sourceOverlap,
      event: event || null,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: sourceOverlap.status === 'pass' ? 'source_overlap_passed' : 'source_overlap_needs_review',
    message: sourceOverlap.status === 'pass'
      ? 'Проверка текущего каталога/source-состояния пройдена. Публикация не выполнялась.'
      : 'Нужна ручная проверка отличия от текущего каталога/source-состояния. Публикация не выполнялась.',
    draft: updatedDraft,
    event,
    source_overlap: sourceOverlap,
    guardrails: guardrails(),
  });
}

async function loadSourceState(serviceClient, currentDraft) {
  const result = {
    target_product: null,
    candidate_products: [],
    errors: [],
  };

  const targetQuery = serviceClient
    .from(STOREFRONT_VIEW_V4)
    .select(SOURCE_SELECT)
    .eq('canonical_product_id', currentDraft.canonical_product_id)
    .limit(1);
  const { data: targetRows, error: targetError } = await targetQuery;
  if (targetError) result.errors.push({ stage: 'target_source_product', message: targetError.message, code: targetError.code || null });
  result.target_product = targetRows?.[0] || null;

  const { data: candidateRows, error: candidatesError } = await serviceClient
    .from(STOREFRONT_VIEW_V4)
    .select(SOURCE_SELECT)
    .neq('canonical_product_id', currentDraft.canonical_product_id)
    .limit(SOURCE_CANDIDATE_LIMIT);
  if (candidatesError) result.errors.push({ stage: 'source_catalog_candidates', message: candidatesError.message, code: candidatesError.code || null });
  result.candidate_products = candidateRows || [];

  return result;
}

function runSourceCatalogOverlapCheck(currentDraft, sourceState) {
  const draftTokens = tokenizeDraft(currentDraft);
  const targetTokens = sourceState.target_product ? tokenizeSourceProduct(sourceState.target_product) : new Set();
  const draftVsTarget = sourceState.target_product ? compareTokenSets(draftTokens, targetTokens) : null;
  const sourceCatalogMatches = sourceState.target_product
    ? sourceState.candidate_products.map((candidate) => {
      const candidateTokens = tokenizeSourceProduct(candidate);
      const score = compareTokenSets(targetTokens, candidateTokens);
      return {
        canonical_product_id: candidate.canonical_product_id,
        product_slug: candidate.product_slug,
        matched_etsy_listing_id: candidate.matched_etsy_listing_id,
        title: candidate.card_title || candidate.h1 || candidate.seo_title || candidate.product_slug,
        overlap_pct: score.overlap_pct,
        jaccard_pct: score.jaccard_pct,
        target_coverage_pct: score.target_coverage_pct,
        shared_tokens: score.shared_tokens.slice(0, 30),
        source_axes: {
          product_type: candidate.product_type || null,
          material: candidate.material || null,
          color: candidate.color || null,
          category: candidate.category_label || null,
          world: candidate.world_label || null,
        },
      };
    }).sort((a, b) => b.overlap_pct - a.overlap_pct)
    : [];

  const maxSourceOverlap = sourceCatalogMatches[0]?.overlap_pct || 0;
  const sourceLoaded = Boolean(sourceState.target_product);
  const hasCatalogError = Boolean(sourceState.errors?.length);
  const status = !sourceLoaded
    ? 'warning'
    : maxSourceOverlap >= BLOCKER_THRESHOLD * 100
      ? 'blocker'
      : maxSourceOverlap >= WARNING_THRESHOLD * 100
        ? 'warning'
        : 'pass';

  return {
    contract_version: 'seo_source_catalog_overlap_v1',
    method: 'draft_to_current_source_and_source_to_catalog_token_overlap_v1',
    status,
    checked_at: new Date().toISOString(),
    source_view: STOREFRONT_VIEW_V4,
    thresholds: {
      warning_pct: roundPct(WARNING_THRESHOLD),
      blocker_pct: roundPct(BLOCKER_THRESHOLD),
    },
    target: {
      draft_id: currentDraft.id,
      canonical_product_id: currentDraft.canonical_product_id,
      product_slug: currentDraft.product_slug,
      source_loaded: sourceLoaded,
    },
    source_load_errors: sourceState.errors || [],
    target_source_snapshot: sourceState.target_product ? compactSourceProduct(sourceState.target_product) : null,
    draft_vs_target_source: draftVsTarget ? {
      overlap_pct: draftVsTarget.overlap_pct,
      jaccard_pct: draftVsTarget.jaccard_pct,
      target_coverage_pct: draftVsTarget.target_coverage_pct,
      shared_tokens: draftVsTarget.shared_tokens.slice(0, 30),
      interpretation: 'High draft-vs-source overlap is not automatically bad. It means the draft still follows current product/source language closely and should be evaluated for human uniqueness.',
    } : null,
    source_catalog: {
      candidate_count: sourceState.candidate_products.length,
      max_overlap_pct: maxSourceOverlap,
      top_matches: sourceCatalogMatches.slice(0, 10),
    },
    decision: status === 'pass'
      ? 'Current/source catalog overlap did not cross the warning threshold. Continue toward image ALT truth review.'
      : 'Review whether overlap is strategic cluster expansion or duplicate/conflict risk before publish readiness.',
    limitations: [
      'This uses the current storefront/source API view, not the full original Etsy raw import table yet.',
      'It does not use GA4 or Google Search Console performance feedback yet.',
      'It does not call OpenAI.',
    ],
  };
}

function compareTokenSets(a, b) {
  const shared = [...a].filter((token) => b.has(token));
  const unionSize = new Set([...a, ...b]).size || 1;
  const jaccard = shared.length / unionSize;
  const targetCoverage = a.size ? shared.length / a.size : 0;
  const score = Math.max(jaccard, targetCoverage * 0.82);
  return {
    overlap_pct: roundPct(score),
    jaccard_pct: roundPct(jaccard),
    target_coverage_pct: roundPct(targetCoverage),
    shared_tokens: shared,
  };
}

function compactSourceProduct(product) {
  return {
    canonical_product_id: product.canonical_product_id,
    product_slug: product.product_slug,
    matched_etsy_listing_id: product.matched_etsy_listing_id,
    source_url: product.source_url,
    card_title: product.card_title,
    h1: product.h1,
    seo_title: product.seo_title,
    meta_description: product.meta_description,
    product_type: product.product_type,
    material: product.material,
    color: product.color,
    category_label: product.category_label,
    world_label: product.world_label,
    canonical_color_label: product.canonical_color_label,
    primary_image_alt: product.primary_image_alt,
    media_count: product.media_count,
    price_range: {
      min_price: product.min_price,
      max_price: product.max_price,
      currency: product.currency,
    },
    option_count: product.pdp_option_count || product.public_configuration_count || null,
  };
}

function tokenizeDraft(draft) {
  const raw = [
    draft.seo_title,
    draft.h1,
    draft.meta_description,
    draft.intro,
    JSON.stringify(draft.bullet_highlights || []),
    JSON.stringify(draft.faq || []),
    JSON.stringify(draft.internal_linking_hints || []),
    JSON.stringify(draft.keyword_roles_snapshot || {}),
  ].filter(Boolean).join(' ');
  return tokenize(raw);
}

function tokenizeSourceProduct(product) {
  const raw = [
    product.card_title,
    product.h1,
    product.seo_title,
    product.meta_description,
    product.product_type,
    product.material,
    product.color,
    product.category_label,
    product.world_label,
    product.canonical_color_label,
    product.primary_image_alt,
    product.product_slug,
  ].filter(Boolean).join(' ');
  return tokenize(raw);
}

function tokenize(raw) {
  return new Set(String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim().replace(/^-+|-+$/g, ''))
    .filter((token) => token.length >= 4)
    .filter((token) => !STOPWORDS.has(token))
    .slice(0, 260));
}

function roundPct(value) {
  return Math.round(value * 1000) / 10;
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function guardrails() {
  return [
    'This route checks the saved SEO draft against current source/storefront catalog state.',
    'This route does not treat overlap as automatically bad.',
    'This route does not publish storefront pages.',
    'This route does not mark ready_for_publish.',
    'This route does not call OpenAI.',
    'The result is a pre-generation and pre-publish strategy signal for portfolio governance.',
  ];
}
