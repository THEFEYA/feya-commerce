// @ts-nocheck
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';

const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const SEO_DRAFT_LATEST_VIEW = 'feya_commerce_v_seo_pack_drafts_latest_v1';
const PRODUCT_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,category_label,source_category_label,operator_section_label,world_label,primary_image_url,primary_image_alt,parent_components_json,child_components_json,component_groups_json,needs_component_review_count,has_component_review_risk,focus_text';
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
  if (!supabase) return { product: null, decision: null, keywords: [], manualFocus: {}, error: getMissingSupabaseEnvMessage() };

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

  let product = null;
  if (effectiveProductId) {
    const productResult = await supabase.from(FOCUS_VIEW).select(PRODUCT_SELECT).eq('canonical_product_id', effectiveProductId).limit(1);
    product = (productResult.data || [])[0] || null;
  }

  const keywords = normalizeDecisionKeywords(decision?.selected_keywords_json || []);
  const manualFocus = decision?.manual_focus_json && typeof decision.manual_focus_json === 'object' ? decision.manual_focus_json : {};
  return { product, decision, keywords, manualFocus, error: null };
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
    'Component truth comes from Product Focus component evidence, never from keyword text.',
  ];
}

function attachProductIdentity(contract, source) {
  const canonicalProductId = source.product?.canonical_product_id || source.decision?.canonical_product_id || '';
  const matchedEtsyListingId = source.product?.matched_etsy_listing_id || source.decision?.matched_etsy_listing_id || null;
  const componentTruth = buildComponentTruth(source.product);

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
      included_components: componentTruth.included_components,
      optional_configurations: componentTruth.optional_configurations,
      available_variants: componentTruth.available_variants,
      unresolved_component_facts: componentTruth.unresolved_component_facts,
      component_evidence: componentTruth.component_evidence,
    },
  };
}

function buildComponentTruth(product) {
  const parentComponents = uniqueComponents(collectComponentStrings(product?.parent_components_json));
  const childComponents = uniqueComponents(collectComponentStrings(product?.child_components_json));
  const componentGroups = uniqueComponents(collectComponentStrings(product?.component_groups_json));
  const includedComponents = uniqueComponents(parentComponents.length ? parentComponents : childComponents);
  const optionalConfigurations = uniqueComponents(componentGroups.filter((item) => !includedComponents.includes(item)));
  const reviewCount = Number(product?.needs_component_review_count || 0);
  const hasReviewRisk = product?.has_component_review_risk === true || reviewCount > 0;
  const unresolved = [];

  if (!includedComponents.length) {
    unresolved.push('No confirmed included components were found in parent_components_json or child_components_json.');
  }
  if (hasReviewRisk) {
    unresolved.push(`Component mapping requires human review${reviewCount > 0 ? ` for ${reviewCount} item(s)` : ''}.`);
  }

  return {
    included_components: includedComponents,
    optional_configurations: optionalConfigurations,
    available_variants: [],
    unresolved_component_facts: unresolved,
    component_evidence: {
      source: 'listing_master_product_focus_v1',
      parent_components: parentComponents,
      child_components: childComponents,
      component_groups: componentGroups,
    },
  };
}

function collectComponentStrings(value, depth = 0) {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'number' || typeof value === 'boolean') return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectComponentStrings(item, depth + 1));
  if (typeof value !== 'object') return [];

  const direct = COMPONENT_TEXT_KEYS.flatMap((key) => collectComponentStrings(value[key], depth + 1));
  const nested = COMPONENT_CONTAINER_KEYS.flatMap((key) => collectComponentStrings(value[key], depth + 1));
  if (direct.length || nested.length) return [...direct, ...nested];

  return Object.entries(value).flatMap(([key, item]) => {
    if (!/(component|part|piece|label|name)/i.test(key)) return [];
    return collectComponentStrings(item, depth + 1);
  });
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

function normalizeComponent(value) {
  const text = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (/\bskirt\b/i.test(text)) return 'skirt';
  return text;
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
  return rows.map((row) => ({
    ...row,
    keyword: row.keyword || row.keyword_norm,
    keyword_norm: row.keyword_norm || row.keyword,
    priority_tier: 'tier_1',
    validation_status: row.avg_monthly_searches && String(row.competition || '').toUpperCase() !== 'UNKNOWN' ? 'validated' : 'queued',
    cleanup_pipeline_status: 'from_listing_master_decision',
    should_validate_api: false,
    should_hold: false,
  }));
}
