export type SeoPublishReadinessStatus =
  | 'draft'
  | 'needs_product_facts'
  | 'needs_keyword_metrics'
  | 'needs_human_review'
  | 'blocked_by_component_mismatch'
  | 'blocked_by_cannibalization'
  | 'ready_for_preview'
  | 'ready_for_indexing';

export type SeoPageType = 'product' | 'collection' | 'image_alt' | 'faq' | 'supporting_content';

export type KeywordMetricSource =
  | 'google_ads_api'
  | 'google_ads_manual_export'
  | 'dataforseo_api'
  | 'erank_export'
  | 'google_trends_manual'
  | 'search_console_later'
  | 'manual_seed'
  | 'old_etsy_signal'
  | 'unvalidated';

export type KeywordValidationStatus =
  | 'queued'
  | 'validated'
  | 'manual_review'
  | 'hold'
  | 'rejected'
  | 'metric_source_unavailable';

export type KeywordIntent =
  | 'transactional'
  | 'commercial'
  | 'informational'
  | 'image_alt'
  | 'collection_discovery'
  | 'unclear';

export type KeywordScoreBreakdown = {
  product_dna_relevance: number | null;
  buyer_intent: number | null;
  search_volume_opportunity: number | null;
  competition_opportunity: number | null;
  trend_or_seasonality: number | null;
  region_fit: number | null;
  page_type_fit: number | null;
  commercial_clarity: number | null;
  anti_cannibalization: number | null;
  component_accuracy: number | null;
};

export type KeywordCandidateV1 = {
  keyword_id?: string | null;
  keyword: string;
  normalized_keyword: string;
  cleaned_keyword?: string | null;
  page_type: SeoPageType;
  intent: KeywordIntent;
  metric_source: KeywordMetricSource;
  validation_status: KeywordValidationStatus;
  avg_monthly_searches?: number | null;
  competition_index?: number | null;
  bid_low?: number | null;
  bid_high?: number | null;
  region?: string | null;
  language?: string | null;
  score_total?: number | null;
  score_breakdown?: KeywordScoreBreakdown | null;
  warnings: string[];
  reason?: string | null;
};

export type KeywordBucketAssignment = {
  primary_keyword: KeywordCandidateV1 | null;
  secondary_keywords: KeywordCandidateV1[];
  long_tail_keywords: KeywordCandidateV1[];
  image_seo_keywords: KeywordCandidateV1[];
  collection_keywords: KeywordCandidateV1[];
  excluded_keywords: Array<{
    keyword: string;
    reason: string;
  }>;
  warnings: string[];
};

export type ContentQaSeverity = 'info' | 'warning' | 'error' | 'blocker';

export type ContentQaIssueCode =
  | 'missing_product_fact'
  | 'component_mismatch'
  | 'wrong_product_type'
  | 'keyword_stuffing'
  | 'thin_content'
  | 'water_or_generic_copy'
  | 'ai_sounding_copy'
  | 'duplicate_or_near_duplicate'
  | 'unsupported_claim'
  | 'policy_risk'
  | 'image_text_mismatch'
  | 'schema_mismatch'
  | 'cannibalization_risk';

export type ContentQaIssue = {
  code: ContentQaIssueCode;
  severity: ContentQaSeverity;
  message: string;
  affected_field?: string | null;
  suggestion?: string | null;
};

export type ContentQaResult = {
  status: 'pass' | 'needs_review' | 'blocked';
  issues: ContentQaIssue[];
  keyword_density_warnings: string[];
  uniqueness_warnings: string[];
  human_tone_warnings: string[];
};

export type ImageRole = 'primary_product' | 'detail' | 'lifestyle' | 'ai_assisted_lifestyle' | 'size_or_component_guide' | 'unknown';

export type ImageSeoCheckResult = {
  image_id?: string | null;
  image_url?: string | null;
  role: ImageRole;
  alt_text: string | null;
  recommended_filename: string | null;
  visible_product_match: 'match' | 'partial' | 'mismatch' | 'unknown';
  quality_status: 'good' | 'needs_review' | 'poor' | 'unknown';
  misleading_ai_risk: boolean;
  warnings: string[];
};

export type CannibalizationWarning = {
  risk_level: 'none' | 'low' | 'medium' | 'high';
  target_keyword: string;
  competing_product_ids: string[];
  reason: string;
  suggested_resolution?: string | null;
};

export type StructuredDataReadiness = {
  product_ready: boolean;
  product_group_ready: boolean;
  offer_ready: boolean;
  image_ready: boolean;
  breadcrumb_ready: boolean;
  missing_fields: string[];
  mismatch_warnings: string[];
};

export type SeoContentPackV1 = {
  version: 'seo_content_pack_v1';
  canonical_product_id: string;
  product_slug: string;
  source_listing_id?: string | null;
  status: SeoPublishReadinessStatus;
  page_type: Extract<SeoPageType, 'product'>;
  seo_title: string | null;
  h1: string | null;
  meta_title: string | null;
  meta_description: string | null;
  product_intro: string | null;
  short_mobile_description: string | null;
  full_description: string | null;
  bullet_highlights: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  keyword_assignment: KeywordBucketAssignment;
  image_seo: ImageSeoCheckResult[];
  internal_links: Array<{
    label: string;
    href: string;
    reason: string;
  }>;
  related_products: Array<{
    canonical_product_id: string;
    reason: string;
  }>;
  structured_data_readiness: StructuredDataReadiness;
  cannibalization_warnings: CannibalizationWarning[];
  qa: ContentQaResult;
  generation_notes: string[];
  created_from_metric_sources: KeywordMetricSource[];
};

export const SEO_CONTENT_ENGINE_GUARDRAILS = [
  'Do not invent search volume, competition, CTR, bids, trend, or seasonality metrics.',
  'Do not choose the highest-volume keyword automatically.',
  'Do not imply product components that are not included in the product/configuration facts.',
  'Do not use raw Etsy listings as final product truth.',
  'Do not expose raw source tables in public frontend code.',
  'Do not write generated SEO content directly into public product data without review status.',
  'Keep image alt text descriptive and accurate; do not stuff keywords into alt text.',
  'Mark every metric with a clear source: API, manual export, external adapter, old Etsy signal, or unvalidated.',
] as const;
