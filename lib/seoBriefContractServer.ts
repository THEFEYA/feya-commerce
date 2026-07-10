// @ts-nocheck
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';

const PRODUCT_TRUTH_VIEW = 'feya_commerce_v_seo_product_truth_v1';
const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const SEO_DRAFT_LATEST_VIEW = 'feya_commerce_v_seo_pack_drafts_latest_v1';
const PRODUCT_TRUTH_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,category_label,source_category_label,operator_section_label,world_label,primary_image_url,primary_image_alt,parent_components_json,child_components_json,component_groups_json,needs_component_review_count,has_component_review_risk,focus_text,included_components,optional_configurations,available_variants,known_non_components,unresolved_component_facts,component_evidence,source_description_fragment,source_variations_json,option_price_rows_json,component_review_blockers_json';
const FOCUS_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,category_label,source_category_label,operator_section_label,world_label,primary_image_url,primary_image_alt,parent_components_json,child_components_json,component_groups_json,needs_component_review_count,has_component_review_risk,focus_text';
const DECISION_SELECT = 'canonical_product_id,product_slug,matched_etsy_listing_id,auto_focus_json,manual_focus_json,selected_strategy,selected_keywords_json,decision_status,updated_at,created_at';
const LATEST_DRAFT_SELECT = 'id,canonical_product_id,matched_etsy_listing_id,product_slug,status,review_status,similarity_check_snapshot,qa_self_report,updated_at,created_at';

const COMPONENT_TEXT_KEYS = [
  'public_label',
  'label',
  'component_label',
  'component_name',
  'component_code',
  'component_family',
  'canonical_component',
  'name',
  'title',
  'value',
];
const COMPONENT_CONTAINER_KEYS = [
  'components',
  'items',
  'children',
  'options',
  'configurations',
  'values',
  'parts',
  'members',
  'groups',
];

export async function buildSeoBriefContractBundle(productId: string) {
  const source = await loadSeoBriefSource(productId);
  if (source.error || !source.product) {
    return {
      ...source,
      brief: null,
      seoPackDraft: null,
      aiAgentInput: null,
      latestSavedDraftContext: null,
      portfolioStrategy: null,
    };
  }

  const brief = buildSeoPilotBrief(source.product, source.keywords, source.manualFocus);
  const identityDraft = attachProductIdentity(buildSeoPackDraftContractFromBrief(brief), source);
  const latestSavedDraftContext = await loadLatestSavedSeoDraftContext(identityDraft.canonical_product_id);
  const portfolioStrategy = extractPortfolioStrategy(latestSavedDraftContext);
  const seoPackDraft = {
    ...identityDraft,
    portfolio_strategy: portfolioStrategy,
  };
  const aiAgentInput = buildSeoAgentInputFromDraft(seoPackDraft, { portfolio_strategy: portfolioStrategy });

  return {
    ...source,
    brief,
    seoPackDraft,
    aiAgentInput,
    latestSavedDraftContext,
    portfolioStrategy,
  };
}

export async function loadSeoBriefSource(productId: string) {
  const serviceClient = getSupabaseServiceClient();
  const supabase = serviceClient || getSupabaseReadClient();
  if (!supabase) {
    return {
      product: null,
      decision: null,
      keywords: [],
      manualFocus: {},
      productTruthSource: null,
      productTruthWarning: null,
      error: getMissingSupabaseEnvMessage(),
    };
  }

  let decisionRows = [];
  if (serviceClient) {
    let q = serviceClient.from(DECISIONS_TABLE).select(DECISION_SELECT).limit(2000);
    if (productId) q = q.eq('canonical_product_id', productId);
    const result = await q;
    decisionRows = result.data || [];
  }

  decisionRows.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  const decision = decisionRows[0] || null;
  const effectiveProductId = productId || decision?.canonical_product_id || '';

  const productResult = effectiveProductId
    ? await loadProductTruthRow(supabase, effectiveProductId)
    : { product: null, productTruthSource: null, productTruthWarning: null };

  const keywords = normalizeDecisionKeywords(decision?.selected_keywords_json || []);
  const manualFocus = decision?.manual_focus_json && typeof decision.manual_focus_json === 'object' ? decision.manual_focus_json : {};
  return {
    product: productResult.product,
    decision,
    keywords,
    manualFocus,
    productTruthSource: productResult.productTruthSource,
    productTruthWarning: productResult.productTruthWarning,
    error: null,
  };
}

async function loadProductTruthRow(supabase, productId) {
  const canonicalResult = await supabase
    .from(PRODUCT_TRUTH_VIEW)
    .select(PRODUCT_TRUTH_SELECT)
    .eq('canonical_product_id', productId)
    .limit(1);
  const canonicalProduct = (canonicalResult.data || [])[0] || null;

  if (!canonicalResult.error && canonicalProduct) {
    return {
      product: canonicalProduct,
      productTruthSource: 'seo_product_truth_v1',
      productTruthWarning: null,
    };
  }

  const fallbackResult = await supabase
    .from(FOCUS_VIEW)
    .select(FOCUS_SELECT)
    .eq('canonical_product_id', productId)
    .limit(1);
  const fallbackProduct = (fallbackResult.data || [])[0] || null;
  const canonicalReason = canonicalResult.error?.message
    || (canonicalProduct ? null : `No row found in ${PRODUCT_TRUTH_VIEW}.`)
    || `Canonical Product Truth view ${PRODUCT_TRUTH_VIEW} is unavailable.`;

  return {
    product: fallbackProduct,
    productTruthSource: fallbackProduct ? 'listing_master_product_focus_v1' : null,
    productTruthWarning: canonicalReason,
  };
}

export async function loadLatestSavedSeoDraftContext(productId: string) {
  const serviceClient = getSupabaseServiceClient();
  const supabase = serviceClient || getSupabaseReadClient();
  if (!supabase || !productId) return null;

  const result = await supabase
    .from(SEO_DRAFT_LATEST_VIEW)
    .select(LATEST_DRAFT_SELECT)
    .eq('canonical_product_id', productId)
    .limit(1);

  if (result.error) {
    return {
      error: result.error.message,
      canonical_product_id: productId,
    };
  }

  return (result.data || [])[0] || null;
}

export function buildSeoBriefSourceSummary(bundle, fallbackProductId = '') {
  return {
    product_id: bundle.product?.canonical_product_id || bundle.seoPackDraft?.canonical_product_id || fallbackProductId || null,
    matched_etsy_listing_id: bundle.product?.matched_etsy_listing_id || bundle.decision?.matched_etsy_listing_id || bundle.seoPackDraft?.matched_etsy_listing_id || null,
    has_decision: Boolean(bundle.decision),
    selected_keyword_count: bundle.keywords?.length || 0,
    manual_focus_keys: Object.keys(bundle.manualFocus || {}),
    product_truth_source: bundle.productTruthSource || bundle.seoPackDraft?.product_truth?.product_truth_source || null,
    product_truth_warning: bundle.productTruthWarning || null,
    has_source_description_fragment: Boolean(bundle.seoPackDraft?.product_truth?.source_description_fragment),
    source_variation_count: bundle.seoPackDraft?.product_truth?.source_variations?.length || 0,
    option_price_row_count: bundle.seoPackDraft?.product_truth?.option_price_rows?.length || 0,
    component_review_blocker_count: bundle.seoPackDraft?.product_truth?.component_review_blockers?.length || 0,
    has_latest_saved_draft: Boolean(bundle.latestSavedDraftContext?.id),
    has_portfolio_strategy: Boolean(bundle.portfolioStrategy),
  };
}

export function readOnlyContractGuardrails() {
  return [
    'No OpenAI call in this route.',
    'No Supabase write in this route.',
    'No product mutation in this route.',
    'No publish action in this route.',
    'This endpoint only exposes the normalized contract for review and future protected generation.',
    'If a latest saved draft has portfolio/source overlap strategy, it is passed into the future SEO agent input.',
    'Component truth comes from the versioned SEO Product Truth contract, never from keyword text.',
    'Listing Master Product Focus is a blocked fallback until source variations, prices, description evidence, and component review blockers are reconciled.',
    'A metric value inside selected_keywords_json is not trusted without approved source and freshness evidence.',
  ];
}

function attachProductIdentity(contract, source) {
  const canonicalProductId = source.product?.canonical_product_id || source.decision?.canonical_product_id || '';
  const matchedEtsyListingId = source.product?.matched_etsy_listing_id || source.decision?.matched_etsy_listing_id || null;
  const componentTruth = buildComponentTruth(source.product, source.productTruthSource, source.productTruthWarning);

  return {
    ...contract,
    canonical_product_id: canonicalProductId,
    matched_etsy_listing_id: matchedEtsyListingId,
    product_truth: {
      ...contract.product_truth,
      canonical_product_id: canonicalProductId,
      matched_etsy_listing_id: matchedEtsyListingId,
      primary_image_url: source.product?.primary_image_url || contract.product_truth.primary_image_url || null,
      primary_image_alt: source.product?.primary_image_alt || contract.product_truth.primary_image_alt || null,
      known_components: componentTruth.included_components,
      known_non_components: componentTruth.known_non_components,
      included_components: componentTruth.included_components,
      optional_configurations: componentTruth.optional_configurations,
      available_variants: componentTruth.available_variants,
      unresolved_component_facts: componentTruth.unresolved_component_facts,
      component_review_blockers: componentTruth.component_review_blockers,
      product_truth_source: componentTruth.product_truth_source,
      source_description_fragment: componentTruth.source_description_fragment,
      source_variations: componentTruth.source_variations,
      option_price_rows: componentTruth.option_price_rows,
      component_evidence: componentTruth.component_evidence,
    },
  };
}

function buildComponentTruth(product, productTruthSource, productTruthWarning) {
  const parentComponents = uniqueComponents(collectComponentStrings(product?.parent_components_json));
  const childComponents = uniqueComponents(collectComponentStrings(product?.child_components_json));
  const componentGroups = uniqueComponents(collectComponentStrings(product?.component_groups_json));

  if (productTruthSource === 'seo_product_truth_v1') {
    const includedComponents = uniqueComponents(stringArray(product?.included_components));
    const optionalConfigurations = uniqueComponents(stringArray(product?.optional_configurations));
    const availableVariants = uniqueComponents(stringArray(product?.available_variants));
    const knownNonComponents = uniqueComponents(stringArray(product?.known_non_components));
    const unresolved = uniqueStrings(stringArray(product?.unresolved_component_facts));
    const reviewBlockers = uniqueStrings(stringArray(product?.component_review_blockers_json));
    const sourceVariations = recordArray(product?.source_variations_json);
    const optionPriceRows = recordArray(product?.option_price_rows_json);
    const sourceDescriptionFragment = cleanNullableText(product?.source_description_fragment);

    if (!includedComponents.length) unresolved.push('Canonical Product Truth view returned no confirmed included components.');
    if (!sourceDescriptionFragment && !sourceVariations.length && !optionPriceRows.length) {
      unresolved.push('Canonical Product Truth view returned no source description, variation, or option-price evidence.');
    }

    return {
      included_components: uniqueComponents(includedComponents),
      optional_configurations: optionalConfigurations,
      available_variants: availableVariants,
      known_non_components: knownNonComponents,
      unresolved_component_facts: uniqueStrings(unresolved),
      component_review_blockers: uniqueStrings(reviewBlockers),
      product_truth_source: 'seo_product_truth_v1',
      source_description_fragment: sourceDescriptionFragment,
      source_variations: sourceVariations,
      option_price_rows: optionPriceRows,
      component_evidence: normalizeComponentEvidence(product?.component_evidence, {
        source: 'seo_product_truth_v1',
        parent_components: parentComponents,
        child_components: childComponents,
        component_groups: componentGroups,
        source_variations: sourceVariations,
        option_price_rows: optionPriceRows,
        source_description_fragment: sourceDescriptionFragment,
      }),
    };
  }

  const includedComponents = uniqueComponents(parentComponents.length ? parentComponents : childComponents);
  const optionalConfigurations = uniqueComponents(componentGroups.filter((item) => !includedComponents.includes(item)));
  const reviewCount = Number(product?.needs_component_review_count || 0);
  const hasReviewRisk = product?.has_component_review_risk === true || reviewCount > 0;
  const unresolved = [];
  const reviewBlockers = [];

  if (!includedComponents.length) {
    unresolved.push('No confirmed included components were found in parent_components_json or child_components_json.');
  }
  unresolved.push('Canonical SEO Product Truth view is unavailable; Product Focus alone cannot prove variations, prices, or source-description alignment.');
  if (productTruthWarning) unresolved.push(productTruthWarning);
  if (hasReviewRisk) {
    reviewBlockers.push(`Component mapping requires human review${reviewCount > 0 ? ` for ${reviewCount} item(s)` : ''}.`);
  }

  return {
    included_components: includedComponents,
    optional_configurations: optionalConfigurations,
    available_variants: [],
    known_non_components: [],
    unresolved_component_facts: uniqueStrings(unresolved),
    component_review_blockers: uniqueStrings(reviewBlockers),
    product_truth_source: 'listing_master_product_focus_v1',
    source_description_fragment: null,
    source_variations: [],
    option_price_rows: [],
    component_evidence: {
      source: 'listing_master_product_focus_v1',
      parent_components: parentComponents,
      child_components: childComponents,
      component_groups: componentGroups,
      source_variations: [],
      option_price_rows: [],
      source_description_fragment: null,
    },
  };
}

function normalizeComponentEvidence(value, fallback) {
  const parsed = parseJsonLike(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
  return {
    ...fallback,
    ...parsed,
    source: 'seo_product_truth_v1',
    parent_components: uniqueComponents(stringArray(parsed.parent_components || fallback.parent_components)),
    child_components: uniqueComponents(stringArray(parsed.child_components || fallback.child_components)),
    component_groups: uniqueComponents(stringArray(parsed.component_groups || fallback.component_groups)),
    source_variations: recordArray(parsed.source_variations || fallback.source_variations),
    option_price_rows: recordArray(parsed.option_price_rows || fallback.option_price_rows),
    source_description_fragment: cleanNullableText(parsed.source_description_fragment || fallback.source_description_fragment),
  };
}

function collectComponentStrings(value, depth = 0) {
  const parsed = parseJsonLike(value);
  if (depth > 4 || parsed == null) return [];
  if (typeof parsed === 'string') return [parsed];
  if (typeof parsed === 'number' || typeof parsed === 'boolean') return [];
  if (Array.isArray(parsed)) return parsed.flatMap((item) => collectComponentStrings(item, depth + 1));
  if (typeof parsed !== 'object') return [];

  const direct = COMPONENT_TEXT_KEYS.flatMap((key) => collectComponentStrings(parsed[key], depth + 1));
  const nested = COMPONENT_CONTAINER_KEYS.flatMap((key) => collectComponentStrings(parsed[key], depth + 1));
  if (direct.length || nested.length) return [...direct, ...nested];

  return Object.entries(parsed).flatMap(([key, item]) => {
    if (!/(component|part|piece|label|name)/i.test(key)) return [];
    return collectComponentStrings(item, depth + 1);
  });
}

function stringArray(value) {
  const parsed = parseJsonLike(value);
  if (parsed == null) return [];
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      if (typeof item === 'string' || typeof item === 'number') return [String(item)];
      if (!item || typeof item !== 'object') return [];
      return collectComponentStrings(item);
    });
  }
  if (typeof parsed === 'string' || typeof parsed === 'number') return [String(parsed)];
  if (typeof parsed === 'object') return collectComponentStrings(parsed);
  return [];
}

function recordArray(value) {
  const parsed = parseJsonLike(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function parseJsonLike(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return null;
  if (!text.startsWith('[') && !text.startsWith('{')) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function uniqueComponents(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = normalizeComponent(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const text = String(value || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

function normalizeComponent(value) {
  const text = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (/\bskirt\b/i.test(text)) return 'skirt';
  if (/\bshoulders?\b/i.test(text)) return 'shoulder';
  if (/\btops?\b/i.test(text)) return 'top';
  return text;
}

function cleanNullableText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function extractPortfolioStrategy(latestSavedDraftContext) {
  const raw = latestSavedDraftContext?.similarity_check_snapshot?.source_catalog_overlap_snapshot?.differentiation_strategy;
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    contract_version: 'seo_differentiation_strategy_v1',
    source: 'latest_saved_draft_source_overlap',
    source_draft_id: latestSavedDraftContext?.id || null,
    source_draft_status: latestSavedDraftContext?.status || null,
    source_review_status: latestSavedDraftContext?.review_status || null,
  };
}

function normalizeDecisionKeywords(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => {
    const trustedMetric = hasTrustedMetricSnapshot(row);
    return {
      ...row,
      keyword: row.keyword || row.keyword_norm,
      keyword_norm: row.keyword_norm || row.keyword,
      priority_tier: 'tier_1',
      validation_status: trustedMetric ? 'validated' : 'queued',
      avg_monthly_searches: trustedMetric ? toPositiveNumber(row.avg_monthly_searches) : null,
      competition: trustedMetric ? String(row.competition || '').trim() || null : null,
      competition_index: trustedMetric ? toNullableNumber(row.competition_index) : null,
      metric_source: trustedMetric ? metricSource(row) : null,
      cleanup_pipeline_status: trustedMetric ? metricFreshness(row) : 'needs_validated_metric_snapshot',
      should_validate_api: !trustedMetric,
      should_hold: row.should_hold === true || !trustedMetric,
    };
  });
}

function hasTrustedMetricSnapshot(row) {
  const volume = toPositiveNumber(row?.avg_monthly_searches);
  const competition = normalizeToken(row?.competition);
  const source = normalizeToken(metricSource(row));
  const freshness = normalizeToken(metricFreshness(row));

  if (!volume || !competition || competition === 'unknown') return false;
  if (freshness === 'api not connected' || freshness === 'api_not_connected') return false;

  const freshManualCsv = source === 'google ads csv' && freshness === 'fresh manual import';
  const freshGoogleAdsApi = ['google ads api', 'google ads keyword planner'].includes(source)
    && ['fresh api', 'api connected', 'validated'].includes(freshness);
  const approvedManualImport = ['manual keyword planner import', 'keyword planner csv'].includes(source)
    && ['fresh manual import', 'validated'].includes(freshness);

  return freshManualCsv || freshGoogleAdsApi || approvedManualImport;
}

function metricSource(row) {
  return row?.metric_source || row?.source_api || row?.validation_source || row?.source || '';
}

function metricFreshness(row) {
  return row?.data_freshness_status || row?.metric_freshness_status || row?.freshness_status || '';
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function toNullableNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
