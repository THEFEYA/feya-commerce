export type SeoMetricSourceKind =
  | 'google_ads_api'
  | 'google_ads_manual_csv'
  | 'dataforseo_api'
  | 'erank_export'
  | 'google_trends_manual'
  | 'search_console_later'
  | 'manual_seed'
  | 'old_etsy_signal'
  | 'unvalidated';

export type SeoMetricSourceConfidence = 'high' | 'medium' | 'low' | 'seed_only' | 'unknown';

export type SeoMetricValidationBatchStatus =
  | 'draft'
  | 'queued'
  | 'ready_for_fetch'
  | 'fetching'
  | 'fetched'
  | 'needs_manual_import'
  | 'needs_human_review'
  | 'failed'
  | 'approved_for_scoring';

export type SeoKeywordMetricSnapshotV1 = {
  keyword: string;
  normalized_keyword: string;
  source_kind: SeoMetricSourceKind;
  source_confidence: SeoMetricSourceConfidence;
  source_label: string;
  region: string | null;
  language: string | null;
  captured_at: string | null;
  avg_monthly_searches: number | null;
  competition_index: number | null;
  low_top_of_page_bid: number | null;
  high_top_of_page_bid: number | null;
  currency: string | null;
  trend_note: string | null;
  raw_source_ref: string | null;
};

export type SeoMetricValidationBatchV1 = {
  batch_id: string;
  status: SeoMetricValidationBatchStatus;
  source_kind: SeoMetricSourceKind;
  region: string | null;
  language: string | null;
  keyword_count: number;
  created_at: string | null;
  processed_at: string | null;
  warnings: string[];
};

export type SeoMetricValidationDecisionV1 = {
  keyword: string;
  normalized_keyword: string;
  decision: 'use_for_scoring' | 'needs_more_data' | 'manual_review' | 'hold' | 'reject';
  reason: string;
  allowed_for_product_title: boolean;
  allowed_for_collection: boolean;
  allowed_for_image_alt: boolean;
  allowed_for_content_body: boolean;
  metric_snapshot: SeoKeywordMetricSnapshotV1 | null;
  warnings: string[];
};

export type SeoKeywordScoringReadinessV1 = {
  keyword: string;
  normalized_keyword: string;
  can_score: boolean;
  missing_requirements: string[];
  metric_sources: SeoMetricSourceKind[];
  best_available_metric: SeoKeywordMetricSnapshotV1 | null;
};

export const HIGH_TRUST_METRIC_SOURCES: SeoMetricSourceKind[] = [
  'google_ads_api',
  'google_ads_manual_csv',
  'dataforseo_api',
] as const;

export const MEDIUM_TRUST_METRIC_SOURCES: SeoMetricSourceKind[] = [
  'erank_export',
  'google_trends_manual',
  'search_console_later',
] as const;

export const SEED_ONLY_METRIC_SOURCES: SeoMetricSourceKind[] = [
  'manual_seed',
  'old_etsy_signal',
  'unvalidated',
] as const;

export function isMetricSourceAllowedForScoring(sourceKind: SeoMetricSourceKind) {
  return HIGH_TRUST_METRIC_SOURCES.includes(sourceKind) || MEDIUM_TRUST_METRIC_SOURCES.includes(sourceKind);
}

export function isMetricSnapshotUsableForScoring(snapshot: SeoKeywordMetricSnapshotV1 | null) {
  if (!snapshot) return false;
  if (!isMetricSourceAllowedForScoring(snapshot.source_kind)) return false;
  return snapshot.avg_monthly_searches !== null || snapshot.competition_index !== null || snapshot.trend_note !== null;
}

export const SEO_METRIC_VALIDATION_GUARDRAILS = [
  'Do not use OpenAI as a metric source for search volume, competition, CTR, bids, trend, or seasonality.',
  'A keyword can be cleaned or categorized without metrics, but it cannot be finally scored without metric provenance.',
  'Manual imports are allowed only when the source label, region, language, and capture date are preserved.',
  'Old Etsy signals may seed hypotheses but must not be treated as current Google demand.',
  'Image alt keywords must describe visible product facts even when metrics are strong.',
  'High-volume collection keywords must not be forced into product titles when product DNA fit is weak.',
] as const;
