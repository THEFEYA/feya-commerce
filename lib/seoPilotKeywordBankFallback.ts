// @ts-nocheck
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';
const PILOT_LISTING_ID = '4348580005';
const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const KEYWORD_VIEW = 'vw_seo_keyword_bank_v1_for_listing_master';

const PRODUCT_SELECT = [
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

const PILOT_KEYWORD_PRIORITY = [
  'post apocalyptic shoulder armor',
  'warrior shoulder armor',
  'futuristic shoulder armor',
  'gold shoulder armor',
  'futuristic armor costume',
  'burning man shoulder armor',
  'burning man gold armor',
  'apocalyptic warrior costume',
  'post apocalyptic costume',
  'rave armor outfit',
  'gold festival outfit',
  'burning man outfit',
  'burning man festival wear',
  "men's burning man outfit",
];

const MANUAL_FOCUS = {
  component: ['armor', 'shoulders', 'shoulder armor'],
  material: ['leather', 'faux leather', 'vegan leather'],
  event: ['burning man', 'festival', 'rave', 'stage', 'performance'],
  style: ['post apocalyptic', 'warrior', 'futuristic', 'steampunk'],
  persona: ['warrior'],
  audience: ['men'],
  exclude: ['women', 'bodysuit', 'panties', 'garters', 'choker', 'snake', 'neon', 'kids', 'wedding', 'bridal', 'lego'],
};

export async function buildPilotKeywordBankFallbackBundle(productId: string) {
  const id = String(productId || '').trim();
  if (id !== PILOT_PRODUCT_ID) {
    return {
      error: 'Read-only Keyword Bank fallback is restricted to the controlled pilot product.',
      product: null,
      brief: null,
      seoPackDraft: null,
      aiAgentInput: null,
      keywords: [],
      keywordDiagnostics: null,
    };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      error: 'Server-side Supabase access is unavailable.',
      product: null,
      brief: null,
      seoPackDraft: null,
      aiAgentInput: null,
      keywords: [],
      keywordDiagnostics: null,
    };
  }

  const [productResult, keywordResult] = await Promise.all([
    supabase
      .from(FOCUS_VIEW)
      .select(PRODUCT_SELECT)
      .eq('canonical_product_id', PILOT_PRODUCT_ID)
      .limit(1),
    supabase
      .from(KEYWORD_VIEW)
      .select(KEYWORD_SELECT)
      .in('keyword_norm', PILOT_KEYWORD_PRIORITY)
      .limit(100),
  ]);

  if (productResult.error) {
    return failed(`Pilot product read failed: ${productResult.error.message}`);
  }
  if (keywordResult.error) {
    return failed(`Keyword Bank read failed: ${keywordResult.error.message}`);
  }

  const product = (productResult.data || [])[0] || null;
  if (!product) return failed('Pilot product was not found in Product Focus.');

  const allRows = keywordResult.data || [];
  const trustedRows = allRows
    .filter(isTrustedApprovedMetricRow)
    .map(asPilotKeyword)
    .sort((a, b) => keywordPriority(a) - keywordPriority(b) || Number(b.score || 0) - Number(a.score || 0) || Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0));

  const brief = buildSeoPilotBrief(product, trustedRows, MANUAL_FOCUS);
  const usefulRows = brief.candidateKeywords || [];
  const usefulValidated = usefulRows.filter((row) => Number(row.avg_monthly_searches || 0) > 0 && normalize(row.competition) !== 'unknown');

  const diagnostics = {
    mode: 'read_only_canonical_keyword_bank_pilot_fallback',
    keyword_view: KEYWORD_VIEW,
    shortlist_count: PILOT_KEYWORD_PRIORITY.length,
    bank_rows_found: allRows.length,
    trusted_metric_rows: trustedRows.length,
    useful_candidate_rows: usefulRows.length,
    useful_validated_rows: usefulValidated.length,
    selected_keywords: usefulRows.slice(0, 12).map(keywordSummary),
    rejected_keywords: (brief.rejectedKeywords || []).slice(0, 8).map(keywordSummary),
    trust_rule: 'approved Listing Master view + positive volume + known competition + metric_source + last_checked',
    writes_performed: 0,
  };

  if (usefulRows.length < 3 || usefulValidated.length < 3 || brief.status === 'blocked') {
    return {
      error: 'Canonical Keyword Bank did not provide three usable validated pilot keywords.',
      product,
      brief,
      seoPackDraft: null,
      aiAgentInput: null,
      keywords: trustedRows,
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
      known_components: [],
      included_components: [],
      known_non_components: [],
      optional_configurations: [],
      available_variants: [],
      unresolved_component_facts: [
        'Canonical SEO Product Truth view has not been applied.',
        'Pilot composition remains unresolved for One Shoulder and Full Shoulders.',
      ],
      component_review_blockers: [
        'canonical_product_truth_required',
        'missing_component_phrase_mapping: Одно плечо',
        'missing_component_phrase_mapping: Полные плечи',
        'source_configuration_mismatch',
      ],
      product_truth_source: 'listing_master_product_focus_v1',
      source_description_fragment: null,
      source_variations: [],
      option_price_rows: [],
      component_evidence: {
        source: 'listing_master_product_focus_v1',
        mode: 'read_only_keyword_bank_pilot_fallback',
        parent_components: [],
        child_components: [],
        component_groups: [],
        source_variations: [],
        option_price_rows: [],
        source_description_fragment: null,
      },
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
    productTruthSource: 'listing_master_product_focus_v1',
    productTruthWarning: 'Controlled partial draft: canonical Product Truth is not applied, so What’s Included must be suppressed.',
    keywordDiagnostics: diagnostics,
  };
}

function failed(error: string) {
  return {
    error,
    product: null,
    brief: null,
    seoPackDraft: null,
    aiAgentInput: null,
    keywords: [],
    keywordDiagnostics: null,
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

function keywordPriority(row) {
  const word = normalize(row?.keyword_norm || row?.keyword);
  const index = PILOT_KEYWORD_PRIORITY.indexOf(word);
  return index === -1 ? 999 : index;
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

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}
