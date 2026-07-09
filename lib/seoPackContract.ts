export type SeoPackContractVersion = 'seo_pack_v1';
export type SeoAgentInputContractVersion = 'seo_agent_input_v1';
export type SeoAgentOutputContractVersion = 'seo_agent_output_v1';
export type SeoBriefSourceVersion = 'seo_brief_v2_1';

export type SeoKeywordRole =
  | 'primary'
  | 'secondary'
  | 'support'
  | 'image_alt'
  | 'collection'
  | 'faq_commercial'
  | 'hold'
  | 'reject';

export type SeoPackDraftStatus =
  | 'brief_ready'
  | 'draft_generated'
  | 'needs_human_review'
  | 'needs_keyword_review'
  | 'needs_similarity_check'
  | 'needs_image_alt_review'
  | 'blocked_by_product_mismatch'
  | 'blocked_by_cannibalization'
  | 'approved_draft'
  | 'ready_for_publish'
  | 'published'
  | 'archived';

export type SeoQaStatus = 'pass' | 'warning' | 'blocker' | 'not_checked';
export type SeoAgentDraftStatus = 'draft' | 'needs_review' | 'blocked';
export type SeoMetricStatus = 'validated' | 'partial' | 'missing';
export type SeoImageRole = 'primary' | 'detail' | 'lifestyle' | 'unknown';
export type SeoImageAltTruthBasis = 'visible_product_fact' | 'needs_image_review';
export type SeoInternalLinkTargetType = 'collection' | 'related_product' | 'guide';
export type SeoFaqIntent = 'commercial' | 'fit' | 'shipping' | 'materials' | 'styling' | 'care' | 'other';
export type SeoPdpBlockPlacement = 'left_description' | 'right_info_panel' | 'faq_lower' | 'review_only';
export type SeoPdpBlockKey =
  | 'about_this_piece'
  | 'main_description'
  | 'why_youll_love_it'
  | 'ideal_for'
  | 'whats_included'
  | 'sizing_fit'
  | 'production_timing'
  | 'shipping_delivery'
  | 'material'
  | 'care'
  | 'materials_care'
  | 'customization'
  | 'returns_exchanges'
  | 'handmade_variation'
  | 'image_truth_note'
  | 'related_collections';
export type SeoPdpBlockSourceBasis = 'product_fact' | 'brand_policy' | 'visual_truth' | 'needs_human_review';

export type SeoKeywordMetricSnapshot = {
  avg_monthly_searches?: number | null;
  competition?: string | null;
  competition_index?: number | null;
  metric_source?: string | null;
  region?: string | null;
  language?: string | null;
  last_checked?: string | null;
};

export type SeoKeywordRoleItem = SeoKeywordMetricSnapshot & {
  keyword: string;
  keyword_norm: string;
  role: SeoKeywordRole;
  role_reason?: string | null;
  placement?: string | null;
  relevance_score?: number | null;
};

export type SeoKeywordRoleMap = Record<SeoKeywordRole, SeoKeywordRoleItem[]>;

export type SeoProductTruth = {
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  title: string;
  slug: string;
  category?: string | null;
  material?: string | null;
  color?: string | null;
  world?: string | null;
  primary_image_url?: string | null;
  primary_image_alt?: string | null;
  known_components: string[];
  known_non_components: string[];
};

export type SeoManualFocusContract = {
  component?: string | string[] | null;
  material?: string | string[] | null;
  event?: string | string[] | null;
  style?: string | string[] | null;
  persona?: string | string[] | null;
  audience?: string | string[] | null;
  exclude?: string | string[] | null;
  [key: string]: unknown;
};

export type SeoMetricsStatusContract = {
  status: SeoMetricStatus;
  validated_count: number;
  missing_metric_count: number;
  unknown_competition_count?: number;
  note: string;
};

export type SeoQaContract = {
  cliche_phrase: SeoQaStatus;
  long_dash: SeoQaStatus;
  keyword_stuffing: SeoQaStatus;
  product_specificity: SeoQaStatus;
  forbidden_mismatch: SeoQaStatus;
  similarity_cannibalization: SeoQaStatus;
  image_alt_truth: SeoQaStatus;
  commercial_placement: SeoQaStatus;
  validated_metrics: SeoQaStatus;
  notes: string[];
};

export type SeoSimilarityCheckContract = {
  status: SeoQaStatus;
  primary_keyword: string | null;
  competing_products: Array<{
    canonical_product_id: string;
    product_title?: string | null;
    product_slug?: string | null;
    similarity_pct?: number | null;
    shared_tokens?: string[];
  }>;
  shared_tokens: string[];
  risk_reason?: string | null;
  suggested_resolution?: string | null;
};

export type SeoPortfolioDifferentiationContract = {
  contract_version: 'seo_differentiation_strategy_v1';
  source?: 'latest_saved_draft_source_overlap' | 'manual' | 'not_available';
  source_draft_id?: string | null;
  source_draft_status?: string | null;
  source_review_status?: string | null;
  classification?: string | null;
  risk_level?: string | null;
  max_source_catalog_overlap_pct?: number | null;
  draft_vs_source_overlap_pct?: number | null;
  human_decision_needed?: boolean;
  agent_instruction_summary?: string | null;
  recommended_generation_mode?: string | null;
  primary_angle_to_own?: string | null;
  title_strategy?: string | null;
  h1_strategy?: string | null;
  meta_strategy?: string | null;
  body_strategy?: string | null;
  keep_cluster_terms?: string[];
  avoid_overusing_terms?: string[];
  required_differentiators?: string[];
  nearest_catalog_match?: {
    title?: string | null;
    product_slug?: string | null;
    overlap_pct?: number | null;
    shared_tokens?: string[];
  } | null;
  before_generation_checks?: string[];
};

export type SeoVisualTruthContract = {
  observed_product_facts: string[];
  dna_matches: string[];
  open_style_suggestions: string[];
  uncertain_or_missing_facts: string[];
  forbidden_visual_claims: string[];
};

export type SeoPdpContentBlock = {
  block_key: SeoPdpBlockKey;
  placement: SeoPdpBlockPlacement;
  heading: string;
  body: string;
  source_basis: SeoPdpBlockSourceBasis;
  needs_human_review?: boolean;
};

export type SeoAgentInputContract = {
  contract_version: SeoAgentInputContractVersion;
  task: 'draft_product_seo_pack';
  language: 'en-US';
  brand: 'TheFEYA';
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  product: SeoProductTruth;
  manual_focus: SeoManualFocusContract;
  keyword_roles: SeoKeywordRoleMap;
  metrics_status: SeoMetricsStatusContract;
  portfolio_strategy?: SeoPortfolioDifferentiationContract | null;
  qa_contract: {
    must_check: Array<keyof SeoQaContract>;
  };
  blocked_words: {
    product_specific_exclusions: string[];
    global_blacklist_note: string[];
  };
  allowed_output_fields: Array<
    | 'seo_title'
    | 'h1'
    | 'meta_description'
    | 'intro'
    | 'bullet_highlights'
    | 'faq'
    | 'image_alt_candidates'
    | 'internal_linking_hints'
    | 'visual_truth'
    | 'pdp_blocks'
    | 'qa_self_report'
  >;
};

export type SeoAgentOutputContract = {
  contract_version: SeoAgentOutputContractVersion;
  status: SeoAgentDraftStatus;
  seo_title: string | null;
  h1: string | null;
  meta_description: string | null;
  intro: string | null;
  bullet_highlights: string[];
  faq: Array<{
    question: string;
    answer: string;
    intent: SeoFaqIntent;
  }>;
  image_alt_candidates: Array<{
    image_role: SeoImageRole;
    alt_text: string;
    truth_basis: SeoImageAltTruthBasis;
  }>;
  internal_linking_hints: Array<{
    anchor: string;
    target_type: SeoInternalLinkTargetType;
    reason: string;
  }>;
  visual_truth: SeoVisualTruthContract;
  pdp_blocks: SeoPdpContentBlock[];
  qa_self_report: SeoQaContract;
  generation_notes: string[];
};

export type SeoPackDraftContract = {
  pack_version: SeoPackContractVersion;
  source_brief_version: SeoBriefSourceVersion;
  status: SeoPackDraftStatus;
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  source_decision_id?: string | null;
  product_truth: SeoProductTruth;
  manual_focus: SeoManualFocusContract;
  keyword_roles: SeoKeywordRoleMap;
  metrics_status: SeoMetricsStatusContract;
  excluded_words: string[];
  global_blacklist_note: string[];
  qa_checks: SeoQaContract;
  similarity_check?: SeoSimilarityCheckContract | null;
  portfolio_strategy?: SeoPortfolioDifferentiationContract | null;
  agent_input?: SeoAgentInputContract | null;
  agent_output?: SeoAgentOutputContract | null;
  human_review: {
    status: 'not_reviewed' | 'needs_revision' | 'approved';
    reviewer?: string | null;
    notes: string[];
    reviewed_at?: string | null;
  };
};

export function createEmptyKeywordRoleMap(): SeoKeywordRoleMap {
  return {
    primary: [],
    secondary: [],
    support: [],
    image_alt: [],
    collection: [],
    faq_commercial: [],
    hold: [],
    reject: [],
  };
}
