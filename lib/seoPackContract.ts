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
  agent_input?: SeoAgentInputContract | null;
  agent_output?: SeoAgentOutputContract | null;
  human_review?: {
    status: 'not_reviewed' | 'approved' | 'changes_requested' | 'rejected';
    reviewer?: string | null;
    notes: string[];
    reviewed_at?: string | null;
  } | null;
};

export const SEO_PACK_CONTRACT_GUARDRAILS = [
  'No Supabase writes from the brief screen.',
  'No OpenAI calls from browser code.',
  'No final publish status without human review.',
  'No final publish status without similarity/cannibalization check.',
  'No fake keyword metrics or OpenAI-derived volume/competition/trend numbers.',
  'Product truth outranks raw volume and simple keyword score.',
  'Image alt text must describe visible product facts only.',
  'Commercial intent belongs in FAQ/meta/body/landing unless explicitly approved for title.',
] as const;

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

export function hasBlockingSeoQa(qa: SeoQaContract) {
  return Object.entries(qa).some(([key, value]) => key !== 'notes' && value === 'blocker');
}

export function canSaveSeoPackDraft(contract: SeoPackDraftContract) {
  if (contract.status === 'blocked_by_product_mismatch' || contract.status === 'blocked_by_cannibalization') return false;
  if (contract.metrics_status.status === 'missing') return false;
  if (hasBlockingSeoQa(contract.qa_checks)) return false;
  if (!contract.keyword_roles.primary.length && !contract.keyword_roles.secondary.length) return false;
  return true;
}

export function canMarkSeoPackReadyForPublish(contract: SeoPackDraftContract) {
  if (!canSaveSeoPackDraft(contract)) return false;
  if (contract.human_review?.status !== 'approved') return false;
  if (!contract.similarity_check || contract.similarity_check.status === 'not_checked' || contract.similarity_check.status === 'blocker') return false;
  if (!contract.agent_output || contract.agent_output.status !== 'draft') return false;
  return true;
}
