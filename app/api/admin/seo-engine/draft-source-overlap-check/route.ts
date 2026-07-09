// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V1, STOREFRONT_VIEW_V2, STOREFRONT_VIEW_V3, STOREFRONT_VIEW_V4 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

const STORAGE_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const STORAGE_EVENTS_TABLE = 'feya_commerce_seo_pack_draft_events_v1';
const STORAGE_FLAG = 'FEYA_SEO_DRAFT_STORAGE_ENABLED';
const SOURCE_CANDIDATE_LIMIT = 160;
const WARNING_THRESHOLD = 0.58;
const BLOCKER_THRESHOLD = 0.78;

const SOURCE_SELECT_BASE = [
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
  'primary_image_url',
  'primary_image_alt',
  'media_count',
  'min_price',
  'max_price',
  'currency',
].join(',');

const SOURCE_SELECT_V4 = [
  SOURCE_SELECT_BASE,
  'category_label',
  'world_label',
  'canonical_color_label',
].join(',');

const SOURCE_VIEW_CANDIDATES = [
  { view: STOREFRONT_VIEW_V4, select: SOURCE_SELECT_V4, tier: 'v4_full' },
  { view: STOREFRONT_VIEW_V3, select: SOURCE_SELECT_BASE, tier: 'v3_base' },
  { view: STOREFRONT_VIEW_V2, select: SOURCE_SELECT_BASE, tier: 'v2_base' },
  { view: STOREFRONT_VIEW_V1, select: SOURCE_SELECT_BASE, tier: 'v1_base' },
];

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
    source_view_fallback_order: SOURCE_VIEW_CANDIDATES.map((item) => item.view),
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
    .select('id,canonical_product_id,matched_etsy_listing_id,product_slug,status,review_status,seo_title,h1,meta_description,intro,bullet_highlights,faq,internal_linking_hints,keyword_roles_snapshot,qa_self_report,similarity_check_snapshot,product_truth_snapshot,agent_input_snapshot,created_at,updated_at')
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
    source_catalog_candidates_checked: sourceOverlap.source_catalog?.candidate_count ?? 0,
    source_catalog_view_used: sourceOverlap.source_view_used || null,
    seo_differentiation_classification: sourceOverlap.differentiation_strategy?.classification || null,
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
      source_view_used: sourceOverlap.source_view_used,
      target_source_loaded: Boolean(sourceState.target_product),
      source_candidate_count: sourceState.candidate_products.length,
      draft_vs_source_overlap_pct: sourceOverlap.draft_vs_target_source?.overlap_pct ?? null,
      source_catalog_max_overlap_pct: sourceOverlap.source_catalog?.max_overlap_pct ?? null,
      top_source_matches: sourceOverlap.source_catalog?.top_matches?.slice(0, 5) || [],
      differentiation_strategy: sourceOverlap.differentiation_strategy || null,
      load_attempts: sourceState.load_attempts || [],
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
    source_view_used: null,
    source_select_tier: null,
    match_key_used: null,
    errors: [],
    load_attempts: [],
  };

  for (const source of SOURCE_VIEW_CANDIDATES) {
    const targetAttempt = await loadTargetProduct(serviceClient, source, currentDraft);
    result.load_attempts.push(targetAttempt.summary);
    if (targetAttempt.error) result.errors.push(targetAttempt.error);
    if (!targetAttempt.product) continue;

    result.target_product = normalizeSourceProduct(targetAttempt.product);
    result.source_view_used = source.view;
    result.source_select_tier = source.tier;
    result.match_key_used = targetAttempt.match_key_used;

    const candidatesAttempt = await loadCandidateProducts(serviceClient, source, currentDraft);
    result.load_attempts.push(candidatesAttempt.summary);
    if (candidatesAttempt.error) result.errors.push(candidatesAttempt.error);
    result.candidate_products = (candidatesAttempt.products || [])
      .map(normalizeSourceProduct)
      .filter((product) => product.canonical_product_id !== result.target_product.canonical_product_id)
      .slice(0, SOURCE_CANDIDATE_LIMIT);
    return result;
  }

  return result;
}

async function loadTargetProduct(serviceClient, source, currentDraft) {
  const matchers = [
    { key: 'canonical_product_id', value: currentDraft.canonical_product_id },
    { key: 'product_slug', value: currentDraft.product_slug },
    { key: 'matched_etsy_listing_id', value: currentDraft.matched_etsy_listing_id },
  ].filter((item) => item.value != null && String(item.value).trim());

  for (const matcher of matchers) {
    const { data, error } = await serviceClient
      .from(source.view)
      .select(source.select)
      .eq(matcher.key, String(matcher.value))
      .limit(1);

    if (error) {
      return {
        product: null,
        match_key_used: matcher.key,
        error: { stage: 'target_source_product', view: source.view, select_tier: source.tier, match_key: matcher.key, message: error.message, code: error.code || null },
        summary: { stage: 'target_source_product', view: source.view, select_tier: source.tier, match_key: matcher.key, status: 'error', message: error.message, code: error.code || null },
      };
    }

    if (data?.[0]) {
      return {
        product: data[0],
        match_key_used: matcher.key,
        error: null,
        summary: { stage: 'target_source_product', view: source.view, select_tier: source.tier, match_key: matcher.key, status: 'found' },
      };
    }
  }

  return {
    product: null,
    match_key_used: null,
    error: null,
    summary: { stage: 'target_source_product', view: source.view, select_tier: source.tier, match_key: 'all_known_keys', status: 'empty' },
  };
}

async function loadCandidateProducts(serviceClient, source, currentDraft) {
  const { data, error } = await serviceClient
    .from(source.view)
    .select(source.select)
    .limit(SOURCE_CANDIDATE_LIMIT + 1);

  if (error) {
    return {
      products: [],
      error: { stage: 'source_catalog_candidates', view: source.view, select_tier: source.tier, message: error.message, code: error.code || null },
      summary: { stage: 'source_catalog_candidates', view: source.view, select_tier: source.tier, status: 'error', message: error.message, code: error.code || null },
    };
  }

  return {
    products: (data || []).filter((product) => String(product.canonical_product_id || '') !== String(currentDraft.canonical_product_id || '')),
    error: null,
    summary: { stage: 'source_catalog_candidates', view: source.view, select_tier: source.tier, status: 'loaded', count: data?.length || 0 },
  };
}

function normalizeSourceProduct(product) {
  return {
    canonical_product_id: String(product.canonical_product_id || ''),
    product_slug: product.product_slug || null,
    matched_etsy_listing_id: product.matched_etsy_listing_id || null,
    source_url: product.source_url || null,
    card_title: product.card_title || null,
    h1: product.h1 || null,
    seo_title: product.seo_title || null,
    meta_description: product.meta_description || null,
    product_type: product.product_type || null,
    material: product.material || null,
    color: product.color || null,
    category_label: product.category_label || null,
    world_label: product.world_label || null,
    canonical_color_label: product.canonical_color_label || null,
    primary_image_url: product.primary_image_url || null,
    primary_image_alt: product.primary_image_alt || null,
    media_count: product.media_count ?? null,
    min_price: product.min_price ?? null,
    max_price: product.max_price ?? null,
    currency: product.currency || null,
    public_configuration_count: product.public_configuration_count ?? null,
    pdp_option_count: product.pdp_option_count ?? null,
  };
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
  const status = !sourceLoaded
    ? 'warning'
    : maxSourceOverlap >= BLOCKER_THRESHOLD * 100
      ? 'blocker'
      : maxSourceOverlap >= WARNING_THRESHOLD * 100
        ? 'warning'
        : 'pass';
  const differentiationStrategy = buildDifferentiationStrategy({
    status,
    sourceLoaded,
    maxSourceOverlap,
    currentDraft,
    targetSource: sourceState.target_product,
    draftVsTarget,
    topMatches: sourceCatalogMatches.slice(0, 5),
  });

  return {
    contract_version: 'seo_source_catalog_overlap_v1',
    method: 'draft_to_current_source_and_source_to_catalog_token_overlap_v4_differentiation_strategy',
    status,
    checked_at: new Date().toISOString(),
    source_view_used: sourceState.source_view_used,
    source_select_tier: sourceState.source_select_tier,
    match_key_used: sourceState.match_key_used,
    source_view_fallback_order: SOURCE_VIEW_CANDIDATES.map((item) => item.view),
    thresholds: {
      warning_pct: roundPct(WARNING_THRESHOLD),
      blocker_pct: roundPct(BLOCKER_THRESHOLD),
    },
    target: {
      draft_id: currentDraft.id,
      canonical_product_id: currentDraft.canonical_product_id,
      matched_etsy_listing_id: currentDraft.matched_etsy_listing_id,
      product_slug: currentDraft.product_slug,
      source_loaded: sourceLoaded,
      draft_token_count: draftTokens.size,
      source_token_count: targetTokens.size,
    },
    source_load_errors: sourceState.errors || [],
    load_attempts: sourceState.load_attempts || [],
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
    differentiation_strategy: differentiationStrategy,
    decision: status === 'pass'
      ? 'Current/source catalog overlap did not cross the warning threshold. Continue toward image ALT truth review.'
      : sourceLoaded
        ? 'Use the differentiation strategy before generation. Decide whether this is strategic cluster expansion or duplicate/conflict risk before publish readiness.'
        : 'Source product was not loaded from any known storefront view. Fix source mapping before treating this as a real portfolio result.',
    limitations: [
      'This uses current storefront/source API views with fallback, not the full original Etsy raw import table yet.',
      'It does not use GA4 or Google Search Console performance feedback yet.',
      'It does not call OpenAI.',
    ],
  };
}

function buildDifferentiationStrategy({ status, sourceLoaded, maxSourceOverlap, currentDraft, targetSource, draftVsTarget, topMatches }) {
  const topMatch = topMatches?.[0] || null;
  const sharedTokens = topMatch?.shared_tokens || [];
  const clusterTermsToKeep = pickTerms(sharedTokens, ['burning', 'gold', 'armor', 'steampunk', 'leather', 'shoulders', 'shoulder', 'futuristic', 'dune', 'warrior']).slice(0, 10);
  const genericTermsToAvoid = pickTerms(sharedTokens, ['costume', 'outfit', 'component', 'faux', 'fabric', 'leather', 'festival']).slice(0, 10);
  const productSignals = [targetSource?.product_type, targetSource?.material, targetSource?.color, targetSource?.category_label, targetSource?.world_label].filter(Boolean);
  const classification = !sourceLoaded
    ? 'source_mapping_issue'
    : maxSourceOverlap >= BLOCKER_THRESHOLD * 100
      ? 'possible_duplicate_risk'
      : maxSourceOverlap >= WARNING_THRESHOLD * 100
        ? 'strategic_cluster_overlap_needs_differentiation'
        : 'portfolio_clear';
  const riskLevel = classification === 'possible_duplicate_risk'
    ? 'high'
    : classification === 'strategic_cluster_overlap_needs_differentiation'
      ? 'medium'
      : classification === 'source_mapping_issue'
        ? 'mapping'
        : 'low';
  const primaryAngle = inferPrimaryAngle(currentDraft, targetSource, clusterTermsToKeep);

  return {
    contract_version: 'seo_differentiation_strategy_v1',
    classification,
    risk_level: riskLevel,
    max_source_catalog_overlap_pct: maxSourceOverlap,
    draft_vs_source_overlap_pct: draftVsTarget?.overlap_pct ?? null,
    human_decision_needed: classification !== 'portfolio_clear',
    agent_instruction_summary: classification === 'portfolio_clear'
      ? 'The SEO draft can preserve its current angle. Avoid generic repetition, but no strong catalog conflict was detected.'
      : classification === 'source_mapping_issue'
        ? 'Do not generate final SEO copy until source mapping is fixed. The current product could not be loaded reliably.'
        : 'Keep the useful cluster intent, but create a visibly different product angle, title structure, first paragraph, and image ALT story from the nearest catalog matches.',
    recommended_generation_mode: classification === 'portfolio_clear' ? 'normal_generation' : 'differentiated_cluster_generation',
    primary_angle_to_own: primaryAngle,
    title_strategy: classification === 'portfolio_clear'
      ? 'Use the selected primary keyword naturally and keep the title concise.'
      : 'Do not reuse the same title skeleton as the top catalog matches. Put the unique product angle before the shared cluster terms.',
    h1_strategy: classification === 'portfolio_clear'
      ? 'H1 can stay close to product truth.'
      : 'H1 should make the item identifiable as this specific product, not only another Burning Man gold armor costume.',
    meta_strategy: classification === 'portfolio_clear'
      ? 'Meta description should summarize product truth and use one primary intent.'
      : 'Meta description must explain the differentiator in the first sentence and avoid repeating the full phrase sequence of the top matches.',
    body_strategy: classification === 'portfolio_clear'
      ? 'Body can follow normal human SEO pack rules.'
      : 'First paragraph and bullets must separate this product by silhouette, components, styling use, visible materials, and event/persona angle. Do not rely only on shared keywords.',
    keep_cluster_terms: clusterTermsToKeep,
    avoid_overusing_terms: genericTermsToAvoid,
    required_differentiators: buildRequiredDifferentiators(productSignals, primaryAngle),
    nearest_catalog_match: topMatch ? {
      product_slug: topMatch.product_slug,
      title: topMatch.title,
      overlap_pct: topMatch.overlap_pct,
      shared_tokens: topMatch.shared_tokens?.slice(0, 18) || [],
    } : null,
    before_generation_checks: [
      'Verify product facts and visible image truth.',
      'Use keyword role allocation, not keyword stuffing.',
      'Do not copy the nearest catalog match title skeleton.',
      'Keep publish blocked until image ALT truth and final publish gate pass.',
    ],
  };
}

function buildRequiredDifferentiators(productSignals, primaryAngle) {
  const base = [
    'specific silhouette / body part / component set',
    'visible material and color truth',
    'distinct event or persona angle',
    'non-duplicate opening paragraph',
  ];
  if (primaryAngle) base.unshift(primaryAngle);
  return [...new Set([...base, ...productSignals.map((item) => `product signal: ${item}`)])].slice(0, 8);
}

function inferPrimaryAngle(currentDraft, targetSource, clusterTermsToKeep) {
  const title = [currentDraft?.h1, currentDraft?.seo_title, targetSource?.card_title, targetSource?.seo_title].filter(Boolean).join(' ').toLowerCase();
  if (title.includes('shoulder')) return 'own the shoulder armor / shoulder piece angle';
  if (title.includes('harness')) return 'own the harness / body strap angle';
  if (title.includes('mask')) return 'own the mask / face accessory angle';
  if (title.includes('corset')) return 'own the corset / torso armor angle';
  if (clusterTermsToKeep.includes('steampunk')) return 'own the steampunk desert-warrior styling angle';
  return 'own a product-specific visible-detail angle';
}

function pickTerms(tokens, preferred) {
  const tokenSet = new Set(tokens || []);
  return preferred.filter((term) => tokenSet.has(term));
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
    primary_image_url: product.primary_image_url,
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
    'This route tries storefront view fallback v4 -> v3 -> v2 -> v1 before declaring source unavailable.',
    'This route does not treat overlap as automatically bad.',
    'This route creates a differentiation strategy for future SEO generation.',
    'This route does not publish storefront pages.',
    'This route does not mark ready_for_publish.',
    'This route does not call OpenAI.',
    'The result is a pre-generation and pre-publish strategy signal for portfolio governance.',
  ];
}
