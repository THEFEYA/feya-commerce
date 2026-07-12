// @ts-nocheck
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoCatalogBrief } from '@/lib/seoCatalogBrief';
import { recommendCatalogKeywords } from '@/lib/seoCatalogKeywordRecommendation';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';

const PRODUCT_TRUTH_VIEW = 'feya_commerce_v_seo_product_truth_v1';
const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const SEO_DRAFT_LATEST_VIEW = 'feya_commerce_v_seo_pack_drafts_latest_v1';
const APPROVED_KEYWORD_BANK_VIEW = 'vw_seo_keyword_bank_v1_approved';

const PRODUCT_TRUTH_SELECT = [
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'canonical_color_label',
  'category_label',
  'source_category_label',
  'operator_section_label',
  'world_label',
  'primary_image_url',
  'primary_image_alt',
  'parent_components_json',
  'child_components_json',
  'component_groups_json',
  'needs_component_review_count',
  'has_component_review_risk',
  'focus_text',
  'included_components',
  'optional_configurations',
  'available_variants',
  'known_non_components',
  'unresolved_component_facts',
  'component_evidence',
  'source_description_fragment',
  'source_variations_json',
  'option_price_rows_json',
  'component_review_blockers_json',
].join(',');

const FOCUS_SELECT = [
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'canonical_color_label',
  'category_label',
  'source_category_label',
  'operator_section_label',
  'world_label',
  'primary_image_url',
  'primary_image_alt',
  'parent_components_json',
  'child_components_json',
  'component_groups_json',
  'needs_component_review_count',
  'has_component_review_risk',
  'focus_text',
].join(',');

const DECISION_SELECT = 'canonical_product_id,product_slug,matched_etsy_listing_id,auto_focus_json,manual_focus_json,selected_strategy,selected_keywords_json,decision_status,updated_at,created_at';
const LATEST_DRAFT_SELECT = 'id,canonical_product_id,matched_etsy_listing_id,product_slug,status,review_status,similarity_check_snapshot,qa_self_report,updated_at,created_at';
const APPROVED_KEYWORD_SELECT = [
  'id',
  'keyword',
  'keyword_norm',
  'bank_bucket',
  'review_status',
  'source_clusters',
  'score',
  'avg_monthly_searches',
  'competition',
  'competition_index',
  'region',
  'language',
  'metric_source',
  'page_type',
  'role',
  'last_checked',
  'reason',
  'notes',
].join(',');

const APPROVED_KEYWORD_CACHE_TTL_MS = 5 * 60 * 1000;
let approvedKeywordCache = null;

const COMPONENT_TEXT_KEYS = [
  'normalized_family',
  'component_family',
  'child_component',
  'parent_component',
  'component_code',
  'canonical_component',
  'component_label',
  'component_name',
  'public_label',
  'label',
  'value',
  'name',
];

const COMPONENT_CONTAINER_KEYS = [
  'components',
  'items',
  'children',
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

  const brief = buildSeoCatalogBrief(source.product, source.keywords, source.manualFocus);
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
    let query = serviceClient.from(DECISIONS_TABLE).select(DECISION_SELECT).limit(2000);
    if (productId) query = query.eq('canonical_product_id', productId);
    const result = await query;
    decisionRows = result.data || [];
  }

  decisionRows.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  const decision = decisionRows[0] || null;
  const effectiveProductId = productId || decision?.canonical_product_id || '';

  const productResult = effectiveProductId
    ? await loadProductTruthRow(supabase, effectiveProductId)
    : { product: null, productTruthSource: null, productTruthWarning: null };

  const selectedKeywordRows = Array.isArray(decision?.selected_keywords_json)
    ? decision.selected_keywords_json
    : [];
  const manualFocus = resolveRecommendationFocus(productResult.product, decision);
  let keywordHydration = { rows: selectedKeywordRows, warning: null };
  let keywordRecommendationDiagnostics = null;
  let keywordSelection = {
    mode: 'operator_decision',
    status: 'confirmed',
    evidence_source: APPROVED_KEYWORD_BANK_VIEW,
    confirmation_required: false,
  };

  if (selectedKeywordRows.length) {
    keywordHydration = await hydrateSelectedKeywordsFromApprovedBank(supabase, selectedKeywordRows);
  } else if (productResult.product) {
    const approvedBank = await loadApprovedKeywordBank(supabase);
    const recommendation = recommendCatalogKeywords({
      product: productResult.product,
      approvedKeywords: approvedBank.rows,
      focus: manualFocus,
      selectedStrategy: decision?.selected_strategy,
    });
    keywordHydration = {
      rows: recommendation.keywords,
      warning: approvedBank.warning,
    };
    keywordRecommendationDiagnostics = {
      ...recommendation.diagnostics,
      keyword_bank_view: APPROVED_KEYWORD_BANK_VIEW,
      product_truth_source: productResult.productTruthSource,
    };
    keywordSelection = {
      mode: 'auto_recommendation',
      status: 'needs_human_confirmation',
      evidence_source: APPROVED_KEYWORD_BANK_VIEW,
      confirmation_required: true,
    };
  }

  const keywords = normalizeDecisionKeywords(keywordHydration.rows);

  return {
    product: productResult.product,
    decision,
    keywords,
    manualFocus,
    productTruthSource: productResult.productTruthSource,
    productTruthWarning: productResult.productTruthWarning,
    keywordBankWarning: keywordHydration.warning,
    keywordSelection,
    keywordRecommendationDiagnostics,
    error: null,
  };
}

async function loadApprovedKeywordBank(supabase) {
  const now = Date.now();
  if (approvedKeywordCache?.rows?.length && now - approvedKeywordCache.loadedAt < APPROVED_KEYWORD_CACHE_TTL_MS) {
    return { rows: approvedKeywordCache.rows, warning: null };
  }

  const result = await supabase
    .from(APPROVED_KEYWORD_BANK_VIEW)
    .select(APPROVED_KEYWORD_SELECT)
    .limit(6000);

  if (result.error) {
    return {
      rows: [],
      warning: `Approved Keyword Bank recommendation load failed: ${result.error.message}`,
    };
  }

  approvedKeywordCache = {
    rows: result.data || [],
    loadedAt: now,
  };
  return { rows: approvedKeywordCache.rows, warning: null };
}

function resolveRecommendationFocus(product, decision) {
  const manual = isRecord(decision?.manual_focus_json) ? decision.manual_focus_json : {};
  const automatic = isRecord(decision?.auto_focus_json) ? decision.auto_focus_json : {};
  const derived = {
    component: uniqueStrings([
      ...collectComponentStrings(product?.parent_components_json),
      ...collectComponentStrings(product?.child_components_json),
      ...collectComponentStrings(product?.component_groups_json),
      ...stringArray(product?.included_components),
    ]),
    material: uniqueStrings(stringArray(product?.material)),
    event: uniqueStrings(stringArray(product?.world_label)),
    style: uniqueStrings(stringArray(product?.operator_section_label)),
    persona: [],
    audience: [],
    exclude: [],
  };
  const keys = ['component', 'material', 'event', 'style', 'persona', 'audience', 'exclude'];

  return Object.fromEntries(keys.map((key) => {
    const manualValue = manual[key];
    const automaticValue = automatic[key];
    if (stringArray(manualValue).length) return [key, manualValue];
    if (stringArray(automaticValue).length) return [key, automaticValue];
    return [key, derived[key] || []];
  }));
}

async function hydrateSelectedKeywordsFromApprovedBank(supabase, selectedRows) {
  const selected = Array.isArray(selectedRows) ? selectedRows : [];
  const norms = uniqueStrings(selected.map((row) => normalizeKeyword(row?.keyword_norm || row?.keyword)));
  if (!norms.length) return { rows: selected, warning: null };

  const result = await supabase
    .from(APPROVED_KEYWORD_BANK_VIEW)
    .select(APPROVED_KEYWORD_SELECT)
    .in('keyword_norm', norms)
    .limit(Math.max(100, norms.length * 2));

  if (result.error) {
    return {
      rows: selected,
      warning: `Approved Keyword Bank hydration failed: ${result.error.message}`,
    };
  }

  const approvedByNorm = new Map();
  (result.data || []).forEach((row) => {
    const norm = normalizeKeyword(row?.keyword_norm || row?.keyword);
    if (norm && !approvedByNorm.has(norm)) approvedByNorm.set(norm, row);
  });

  return {
    rows: selected.map((row) => {
      const norm = normalizeKeyword(row?.keyword_norm || row?.keyword);
      const approved = approvedByNorm.get(norm);
      if (!approved) return row;
      return {
        ...row,
        ...approved,
        keyword: approved.keyword || row.keyword || row.keyword_norm,
        keyword_norm: approved.keyword_norm || row.keyword_norm || row.keyword,
        match_score: row.match_score ?? null,
        strategy_rank: row.strategy_rank ?? null,
        approved_keyword_bank: true,
        approved_keyword_bank_view: APPROVED_KEYWORD_BANK_VIEW,
        data_freshness_status: approved.last_checked ? 'validated' : 'missing_last_checked',
      };
    }),
    warning: null,
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
  const evidence = bundle.seoPackDraft?.product_truth?.component_evidence || {};
  return {
    product_id: bundle.product?.canonical_product_id || bundle.seoPackDraft?.canonical_product_id || fallbackProductId || null,
    matched_etsy_listing_id: bundle.product?.matched_etsy_listing_id || bundle.decision?.matched_etsy_listing_id || bundle.seoPackDraft?.matched_etsy_listing_id || null,
    has_decision: Boolean(bundle.decision),
    selected_keyword_count: bundle.keywords?.length || 0,
    selected_keyword_metric_provenance_missing_count: (bundle.keywords || []).filter((item) => item.validation_status !== 'validated').length,
    manual_focus_keys: Object.keys(bundle.manualFocus || {}),
    product_truth_source: bundle.productTruthSource || bundle.seoPackDraft?.product_truth?.product_truth_source || null,
    product_truth_warning: bundle.productTruthWarning || null,
    keyword_bank_warning: bundle.keywordBankWarning || null,
    keyword_selection: bundle.keywordSelection || null,
    keyword_recommendation_diagnostics: bundle.keywordRecommendationDiagnostics || null,
    mapping_layer_sources: stringArray(evidence.mapping_layer_sources),
    phrase_mapping_count: recordArray(evidence.phrase_mappings).length,
    mapping_review_row_count: recordArray(evidence.mapping_review_rows).length,
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
    'This endpoint only exposes an aggregated Product Truth contract for review and protected generation.',
    'Product Truth must aggregate the existing component phrase-map, component-mapping, configuration-derivation, and review layers.',
    'Do not add ad-hoc CASE, substring, or regex component classification in the application or Product Truth view.',
    'An unmapped raw phrase remains a missing_component_phrase_mapping blocker and is never guessed from image, keyword, or title text.',
    'Raw option labels remain in source evidence; mapped component family and configuration meaning remain separate fields.',
    'If a latest saved draft has portfolio/source overlap strategy, it is passed into the future SEO agent input.',
    'Listing Master Product Focus is a blocked diagnostic fallback and cannot prove included components.',
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
    keyword_selection: source.keywordSelection || {
      mode: 'auto_recommendation',
      status: 'needs_human_confirmation',
      evidence_source: APPROVED_KEYWORD_BANK_VIEW,
      confirmation_required: true,
    },
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
  const parentComponents = uniqueMappedValues(collectComponentStrings(product?.parent_components_json));
  const childComponents = uniqueMappedValues(collectComponentStrings(product?.child_components_json));
  const componentGroups = uniqueMappedValues(collectComponentStrings(product?.component_groups_json));

  if (productTruthSource === 'seo_product_truth_v1') {
    const includedComponents = uniqueMappedValues(stringArray(product?.included_components));
    const optionalConfigurations = evidenceArray(product?.optional_configurations);
    const availableVariants = evidenceArray(product?.available_variants);
    const knownNonComponents = evidenceArray(product?.known_non_components);
    const unresolved = evidenceArray(product?.unresolved_component_facts);
    const reviewBlockers = evidenceArray(product?.component_review_blockers_json);
    const sourceVariations = recordArray(product?.source_variations_json);
    const optionPriceRows = recordArray(product?.option_price_rows_json);
    const sourceDescriptionFragment = cleanNullableText(product?.source_description_fragment);

    if (!includedComponents.length) {
      unresolved.push('Canonical Product Truth view returned no confirmed included components.');
    }
    if (!sourceDescriptionFragment && !sourceVariations.length && !optionPriceRows.length) {
      unresolved.push('Canonical Product Truth view returned no source description, variation, or option-price evidence.');
    }

    return {
      included_components: includedComponents,
      optional_configurations: optionalConfigurations,
      available_variants: availableVariants,
      known_non_components: knownNonComponents,
      unresolved_component_facts: uniqueEvidenceValues(unresolved),
      component_review_blockers: uniqueEvidenceValues(reviewBlockers),
      product_truth_source: 'seo_product_truth_v1',
      source_description_fragment: sourceDescriptionFragment,
      source_variations: sourceVariations,
      option_price_rows: optionPriceRows,
      component_evidence: normalizeComponentEvidence(product?.component_evidence, {
        source: 'seo_product_truth_v1',
        mapping_layer_sources: [],
        phrase_mappings: [],
        mapping_review_rows: [],
        parent_components: parentComponents,
        child_components: childComponents,
        component_groups: componentGroups,
        source_variations: sourceVariations,
        option_price_rows: optionPriceRows,
        source_description_fragment: sourceDescriptionFragment,
      }),
    };
  }

  const reviewCount = Number(product?.needs_component_review_count || 0);
  const unresolved = [
    'Canonical SEO Product Truth view is unavailable.',
    'Listing Master Product Focus is diagnostic evidence only and cannot confirm included components or selectable configurations.',
  ];
  const reviewBlockers = [
    'canonical_product_truth_required',
    'product_focus_components_untrusted_without_mapping_contract',
  ];

  if (productTruthWarning) unresolved.push(productTruthWarning);
  if (product?.has_component_review_risk === true || reviewCount > 0) {
    reviewBlockers.push(`component_mapping_review_required${reviewCount > 0 ? `:${reviewCount}` : ''}`);
  }

  return {
    included_components: [],
    optional_configurations: [],
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
      mapping_layer_sources: [],
      phrase_mappings: [],
      mapping_review_rows: [],
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
    mapping_layer_sources: uniqueStrings(stringArray(parsed.mapping_layer_sources || fallback.mapping_layer_sources)),
    phrase_mappings: recordArray(parsed.phrase_mappings || fallback.phrase_mappings),
    mapping_review_rows: recordArray(parsed.mapping_review_rows || fallback.mapping_review_rows),
    parent_components: uniqueMappedValues(stringArray(parsed.parent_components || fallback.parent_components)),
    child_components: uniqueMappedValues(stringArray(parsed.child_components || fallback.child_components)),
    component_groups: uniqueMappedValues(stringArray(parsed.component_groups || fallback.component_groups)),
    source_variations: recordArray(parsed.source_variations || fallback.source_variations),
    option_price_rows: recordArray(parsed.option_price_rows || fallback.option_price_rows),
    source_description_fragment: cleanNullableText(parsed.source_description_fragment || fallback.source_description_fragment),
  };
}

function collectComponentStrings(value, depth = 0) {
  const parsed = parseJsonLike(value);
  if (depth > 4 || parsed == null) return [];
  if (typeof parsed === 'string' || typeof parsed === 'number') return [String(parsed)];
  if (typeof parsed === 'boolean') return [];
  if (Array.isArray(parsed)) return parsed.flatMap((item) => collectComponentStrings(item, depth + 1));
  if (typeof parsed !== 'object') return [];

  for (const key of COMPONENT_TEXT_KEYS) {
    const direct = collectComponentStrings(parsed[key], depth + 1);
    if (direct.length) return direct;
  }

  const nested = COMPONENT_CONTAINER_KEYS.flatMap((key) => collectComponentStrings(parsed[key], depth + 1));
  if (nested.length) return nested;

  return [];
}

function stringArray(value) {
  const parsed = parseJsonLike(value);
  if (parsed == null) return [];
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      if (typeof item === 'string' || typeof item === 'number') return [String(item)];
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      return collectComponentStrings(item);
    });
  }
  if (typeof parsed === 'string' || typeof parsed === 'number') return [String(parsed)];
  if (typeof parsed === 'object') return collectComponentStrings(parsed);
  return [];
}

function evidenceArray(value) {
  const parsed = parseJsonLike(value);
  const rows = Array.isArray(parsed) ? parsed : parsed == null ? [] : [parsed];
  return uniqueEvidenceValues(rows.flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') return [String(item).trim()];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    return [item];
  }));
}

function uniqueEvidenceValues(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      const key = `text:${text.toLowerCase()}`;
      if (!text || seen.has(key)) return;
      seen.add(key);
      result.push(text);
      return;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const key = `object:${stableStringify(value)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  });
  return result;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
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

function uniqueMappedValues(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
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

function cleanNullableText(value) {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
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
  const freshGoogleAdsApi = ['google ads api', 'google ads keyword planner', 'google keyword planner'].includes(source)
    && ['fresh api', 'api connected', 'validated'].includes(freshness);
  const approvedManualImport = ['manual keyword planner import', 'keyword planner csv'].includes(source)
    && ['fresh manual import', 'validated'].includes(freshness);

  return freshManualCsv || freshGoogleAdsApi || approvedManualImport;
}

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase().replace(/[’']/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
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

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
