// @ts-nocheck
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';
const PILOT_LISTING_ID = '4348580005';
const PRODUCT_TRUTH_VIEW = 'feya_commerce_v_seo_product_truth_v1';
const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const KEYWORD_VIEW = 'vw_seo_keyword_bank_v1_for_listing_master';

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

const KEYWORD_SELECT = [
  'keyword',
  'keyword_norm',
  'bank_bucket',
  'review_status',
  'score',
  'avg_monthly_searches',
  'competition',
  'competition_index',
  'low_bid',
  'high_bid',
  'region',
  'language',
  'metric_source',
  'page_type',
  'role',
  'role_label',
  'last_checked',
  'reason',
  'notes',
  'source_files',
].join(',');

const MANUAL_FOCUS = {
  component: ['armor', 'shoulders', 'shoulder armor'],
  material: ['leather', 'faux leather', 'vegan leather'],
  event: ['burning man', 'festival', 'rave', 'stage', 'performance'],
  style: ['post apocalyptic', 'warrior', 'futuristic', 'steampunk'],
  persona: ['warrior'],
  audience: ['men'],
  exclude: ['women', 'bodysuit', 'panties', 'garters', 'choker', 'snake', 'neon', 'kids', 'wedding', 'bridal', 'lego'],
};

const LABEL_KEYS = [
  'normalized_family',
  'component_family',
  'component_family_code',
  'component_code',
  'canonical_component',
  'component_label',
  'component_name',
  'configuration_label',
  'public_label',
  'source_raw_value',
  'raw_value',
  'label',
  'value',
  'name',
];

export async function buildPilotKeywordBankAutoBundle(productId: string) {
  const id = String(productId || '').trim();
  if (id !== PILOT_PRODUCT_ID) return failed('Controlled Keyword Bank preparation is restricted to the first pilot product.');

  const supabase = getSupabaseServiceClient();
  if (!supabase) return failed('Server-side Supabase access is unavailable.');

  const [canonicalResult, focusResult, approvedKeywordResult] = await Promise.all([
    supabase
      .from(PRODUCT_TRUTH_VIEW)
      .select(PRODUCT_TRUTH_SELECT)
      .eq('canonical_product_id', PILOT_PRODUCT_ID)
      .limit(1),
    supabase
      .from(FOCUS_VIEW)
      .select(FOCUS_SELECT)
      .eq('canonical_product_id', PILOT_PRODUCT_ID)
      .limit(1),
    supabase
      .from(KEYWORD_VIEW)
      .select(KEYWORD_SELECT)
      .eq('review_status', 'approved_draft')
      .in('bank_bucket', ['product', 'product_or_alt'])
      .limit(5000),
  ]);

  const canonicalProduct = !canonicalResult.error ? (canonicalResult.data || [])[0] || null : null;
  const focusProduct = !focusResult.error ? (focusResult.data || [])[0] || null : null;
  const product = canonicalProduct || focusProduct;
  const productTruthSource = canonicalProduct ? 'seo_product_truth_v1' : 'listing_master_product_focus_v1';
  const productTruthWarning = canonicalProduct
    ? null
    : canonicalResult.error?.message || `No pilot row found in ${PRODUCT_TRUTH_VIEW}.`;

  if (!product) {
    return failed(`Pilot product read failed: ${focusResult.error?.message || productTruthWarning || 'product not found'}`);
  }

  let keywordRows = approvedKeywordResult.error ? [] : approvedKeywordResult.data || [];
  const keywordWarnings = [];
  if (approvedKeywordResult.error) keywordWarnings.push(`approved_keyword_query_failed: ${approvedKeywordResult.error.message}`);

  // Compatibility fallback for older view values or partially migrated Keyword Bank rows.
  if (!keywordRows.length) {
    const termQueries = await Promise.all([
      supabase.from(KEYWORD_VIEW).select(KEYWORD_SELECT).ilike('keyword_norm', '%shoulder%').limit(1200),
      supabase.from(KEYWORD_VIEW).select(KEYWORD_SELECT).ilike('keyword_norm', '%armor%').limit(1200),
      supabase.from(KEYWORD_VIEW).select(KEYWORD_SELECT).or('keyword_norm.ilike.%burning man%,keyword_norm.ilike.%festival%,keyword_norm.ilike.%rave%').limit(1200),
      supabase.from(KEYWORD_VIEW).select(KEYWORD_SELECT).or('keyword_norm.ilike.%warrior%,keyword_norm.ilike.%futuristic%,keyword_norm.ilike.%post apocalyptic%,keyword_norm.ilike.%gold%').limit(1200),
    ]);
    keywordRows = termQueries.flatMap((result) => result.error ? [] : result.data || []);
    termQueries.filter((result) => result.error).forEach((result) => keywordWarnings.push(`keyword_term_query_failed: ${result.error.message}`));
  }

  const allRows = uniqueRows(keywordRows);
  const trustedRows = allRows
    .filter(isTrustedApprovedMetricRow)
    .map(asPilotKeyword)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0));

  const brief = buildSeoPilotBrief(product, trustedRows, MANUAL_FOCUS);
  const usefulRows = brief.candidateKeywords || [];
  const usefulValidated = usefulRows.filter(hasUsableMetric);
  const componentTruth = canonicalProduct
    ? buildCanonicalComponentTruth(canonicalProduct)
    : buildFallbackComponentTruth(focusProduct, productTruthWarning);

  const diagnostics = {
    mode: canonicalProduct
      ? 'canonical_product_truth_plus_approved_keyword_bank_auto_match'
      : 'product_focus_plus_approved_keyword_bank_auto_match',
    keyword_view: KEYWORD_VIEW,
    product_truth_view: PRODUCT_TRUTH_VIEW,
    product_truth_source: productTruthSource,
    product_truth_warning: productTruthWarning,
    approved_bank_rows_loaded: allRows.length,
    trusted_metric_rows: trustedRows.length,
    useful_candidate_rows: usefulRows.length,
    useful_validated_rows: usefulValidated.length,
    selected_keywords: usefulRows.slice(0, 16).map(keywordSummary),
    rejected_keywords: (brief.rejectedKeywords || []).slice(0, 12).map(keywordSummary),
    included_component_count: componentTruth.included_components.length,
    optional_configuration_count: componentTruth.optional_configurations.length,
    available_variant_count: componentTruth.available_variants.length,
    unresolved_component_fact_count: componentTruth.unresolved_component_facts.length,
    component_review_blocker_count: componentTruth.component_review_blockers.length,
    source_variation_count: componentTruth.source_variations.length,
    option_price_row_count: componentTruth.option_price_rows.length,
    warnings: keywordWarnings,
    trust_rule: 'review_status approved_draft + product/product_or_alt bucket + positive volume + known competition + metric_source + last_checked',
    writes_performed: 0,
  };

  if (usefulRows.length < 3 || usefulValidated.length < 3 || brief.status === 'blocked') {
    return {
      error: `Pilot preparation found ${usefulValidated.length} usable validated product keywords; at least 3 are required for the first controlled draft.`,
      product,
      decision: null,
      brief,
      seoPackDraft: null,
      aiAgentInput: null,
      keywords: trustedRows,
      manualFocus: MANUAL_FOCUS,
      latestSavedDraftContext: null,
      portfolioStrategy: null,
      productTruthSource,
      productTruthWarning,
      keywordDiagnostics: diagnostics,
    };
  }

  const baseDraft = buildSeoPackDraftContractFromBrief(brief);
  const seoPackDraft = {
    ...baseDraft,
    canonical_product_id: PILOT_PRODUCT_ID,
    matched_etsy_listing_id: product.matched_etsy_listing_id || PILOT_LISTING_ID,
    product_slug: product.product_slug || baseDraft.product_slug,
    status: baseDraft.status,
    keyword_selection: {
      mode: 'auto_recommendation',
      status: 'needs_human_confirmation',
      evidence_source: KEYWORD_VIEW,
      confirmation_required: true,
    },
    portfolio_strategy: null,
    product_truth: {
      ...baseDraft.product_truth,
      canonical_product_id: PILOT_PRODUCT_ID,
      matched_etsy_listing_id: product.matched_etsy_listing_id || PILOT_LISTING_ID,
      title: product.card_title || product.h1 || baseDraft.product_truth?.title,
      slug: product.product_slug || baseDraft.product_truth?.slug,
      category: product.category_label || product.product_type || baseDraft.product_truth?.category,
      material: product.material || baseDraft.product_truth?.material || null,
      color: product.canonical_color_label || product.color || baseDraft.product_truth?.color || null,
      world: product.world_label || baseDraft.product_truth?.world || null,
      primary_image_url: product.primary_image_url || null,
      primary_image_alt: product.primary_image_alt || null,
      known_components: componentTruth.included_components,
      included_components: componentTruth.included_components,
      known_non_components: componentTruth.known_non_components,
      optional_configurations: componentTruth.optional_configurations,
      available_variants: componentTruth.available_variants,
      unresolved_component_facts: componentTruth.unresolved_component_facts,
      component_review_blockers: componentTruth.component_review_blockers,
      product_truth_source: productTruthSource,
      source_description_fragment: componentTruth.source_description_fragment,
      source_variations: componentTruth.source_variations,
      option_price_rows: componentTruth.option_price_rows,
      component_evidence: componentTruth.component_evidence,
    },
  };

  const aiAgentInput = buildSeoAgentInputFromDraft(seoPackDraft, { portfolio_strategy: null });

  return {
    error: null,
    product,
    decision: null,
    keywords: trustedRows,
    manualFocus: MANUAL_FOCUS,
    brief,
    seoPackDraft,
    aiAgentInput,
    latestSavedDraftContext: null,
    portfolioStrategy: null,
    productTruthSource,
    productTruthWarning,
    keywordDiagnostics: diagnostics,
  };
}

function buildCanonicalComponentTruth(product) {
  const includedComponents = collectLabels(product?.included_components);
  const optionalConfigurations = collectLabels(product?.optional_configurations);
  const availableVariants = collectLabels(product?.available_variants);
  const knownNonComponents = collectLabels(product?.known_non_components);
  const unresolvedFacts = collectMessages(product?.unresolved_component_facts);
  const componentReviewBlockers = collectMessages(product?.component_review_blockers_json);
  const sourceVariations = recordArray(product?.source_variations_json);
  const optionPriceRows = recordArray(product?.option_price_rows_json);
  const sourceDescriptionFragment = cleanText(product?.source_description_fragment);

  if (!includedComponents.length) {
    unresolvedFacts.push('Canonical Product Truth has no confirmed unconditional included component for this pilot yet.');
  }

  return {
    included_components: unique(includedComponents),
    optional_configurations: unique(optionalConfigurations),
    available_variants: unique(availableVariants),
    known_non_components: unique(knownNonComponents),
    unresolved_component_facts: unique(unresolvedFacts),
    component_review_blockers: unique(componentReviewBlockers),
    source_description_fragment: sourceDescriptionFragment,
    source_variations: sourceVariations,
    option_price_rows: optionPriceRows,
    component_evidence: isRecord(product?.component_evidence)
      ? product.component_evidence
      : {
          source: 'seo_product_truth_v1',
          parent_components: collectLabels(product?.parent_components_json),
          child_components: collectLabels(product?.child_components_json),
          component_groups: collectLabels(product?.component_groups_json),
          source_variations: sourceVariations,
          option_price_rows: optionPriceRows,
          source_description_fragment: sourceDescriptionFragment,
        },
  };
}

function buildFallbackComponentTruth(product, productTruthWarning) {
  const reviewCount = Number(product?.needs_component_review_count || 0);
  return {
    included_components: [],
    optional_configurations: [],
    available_variants: [],
    known_non_components: [],
    unresolved_component_facts: unique([
      'Canonical SEO Product Truth view has not been applied.',
      'Pilot composition remains unresolved for One Shoulder and Full Shoulders.',
      productTruthWarning,
    ]),
    component_review_blockers: unique([
      'canonical_product_truth_required',
      'missing_component_phrase_mapping: Одно плечо',
      'missing_component_phrase_mapping: Полные плечи',
      'source_configuration_mismatch',
      reviewCount > 0 ? `component_mapping_review_required:${reviewCount}` : null,
    ]),
    source_description_fragment: null,
    source_variations: [],
    option_price_rows: [],
    component_evidence: {
      source: 'listing_master_product_focus_v1',
      mode: 'read_only_keyword_bank_auto_match',
      parent_components: collectLabels(product?.parent_components_json),
      child_components: collectLabels(product?.child_components_json),
      component_groups: collectLabels(product?.component_groups_json),
      source_variations: [],
      option_price_rows: [],
      source_description_fragment: null,
    },
  };
}

function isTrustedApprovedMetricRow(row) {
  const volume = Number(row?.avg_monthly_searches);
  const competition = normalize(row?.competition);
  const source = normalize(row?.metric_source);
  const checked = String(row?.last_checked || '').trim();
  const review = normalize(row?.review_status);
  const bucket = normalize(row?.bank_bucket);

  return review === 'approved draft'
    && ['product', 'product or alt'].includes(bucket)
    && Number.isFinite(volume)
    && volume > 0
    && Boolean(competition)
    && competition !== 'unknown'
    && Boolean(source)
    && Boolean(checked);
}

function asPilotKeyword(row) {
  return {
    ...row,
    keyword: row.keyword || row.keyword_norm,
    keyword_norm: normalize(row.keyword_norm || row.keyword),
    priority_tier: 'tier_1',
    validation_status: 'validated',
    cleanup_pipeline_status: 'validated_keyword_bank_snapshot',
    should_validate_api: false,
    should_hold: false,
    metric_source: row.metric_source,
    data_freshness_status: 'validated',
  };
}

function hasUsableMetric(row) {
  const volume = Number(row?.avg_monthly_searches);
  const competition = normalize(row?.competition);
  return Number.isFinite(volume) && volume > 0 && Boolean(competition) && competition !== 'unknown';
}

function keywordSummary(row) {
  return {
    keyword: row?.keyword || row?.keyword_norm || null,
    role: row?.pilot_role || null,
    relevance_score: row?.pilot_relevance_score ?? null,
    avg_monthly_searches: row?.avg_monthly_searches ?? null,
    competition: row?.competition ?? null,
    metric_source: row?.metric_source ?? null,
    last_checked: row?.last_checked ?? null,
  };
}

function uniqueRows(rows) {
  const seen = new Set();
  return (rows || []).filter((row) => {
    const key = normalize(row?.keyword_norm || row?.keyword);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectLabels(value) {
  const labels = [];
  walk(value, (item) => {
    if (typeof item === 'string') {
      const clean = cleanText(item);
      if (clean) labels.push(clean);
      return;
    }
    if (!isRecord(item)) return;
    for (const key of LABEL_KEYS) {
      const clean = cleanText(item[key]);
      if (clean) {
        labels.push(clean);
        break;
      }
    }
  });
  return unique(labels);
}

function collectMessages(value) {
  const messages = [];
  walk(value, (item) => {
    if (typeof item === 'string') {
      const clean = cleanText(item);
      if (clean) messages.push(clean);
      return;
    }
    if (!isRecord(item)) return;
    const code = cleanText(item.code || item.blocker_code || item.status);
    const raw = cleanText(item.raw_phrase || item.source_raw_value || item.raw_value);
    const message = cleanText(item.message || item.reason || item.detail);
    const joined = [code, raw, message].filter(Boolean).join(': ');
    if (joined) messages.push(joined);
  });
  return unique(messages);
}

function recordArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function walk(value, visit) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
    return;
  }
  visit(value);
}

function cleanText(value) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return text || null;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function failed(error: string) {
  return {
    error,
    product: null,
    decision: null,
    brief: null,
    seoPackDraft: null,
    aiAgentInput: null,
    keywords: [],
    manualFocus: MANUAL_FOCUS,
    latestSavedDraftContext: null,
    portfolioStrategy: null,
    productTruthSource: null,
    productTruthWarning: null,
    keywordDiagnostics: null,
  };
}
