import { classifySeoProductPresentation, hasWholeProductScope } from './seoProductPresentation.ts';

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

export type SeoProductTruthSource = 'seo_product_truth_v1' | 'listing_master_product_focus_v1';
export type SeoSourceEvidenceRow = Record<string, unknown>;
export type SeoSourceEvidenceValue = string | SeoSourceEvidenceRow;

export type SeoComponentEvidence = {
  source: SeoProductTruthSource;
  parent_components: string[];
  child_components: string[];
  component_groups: string[];
  source_variations?: SeoSourceEvidenceRow[];
  option_price_rows?: SeoSourceEvidenceRow[];
  source_description_fragment?: string | null;
};

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
  known_non_components: SeoSourceEvidenceValue[];
  included_components?: string[];
  optional_configurations?: SeoSourceEvidenceValue[];
  available_variants?: SeoSourceEvidenceValue[];
  unresolved_component_facts?: SeoSourceEvidenceValue[];
  component_review_blockers?: SeoSourceEvidenceValue[];
  product_truth_source?: SeoProductTruthSource;
  source_description_fragment?: string | null;
  source_variations?: SeoSourceEvidenceRow[];
  option_price_rows?: SeoSourceEvidenceRow[];
  component_evidence?: SeoComponentEvidence | null;
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
  keyword_selection?: SeoPackDraftContract['keyword_selection'];
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
  keyword_selection?: {
    mode: 'operator_decision' | 'auto_recommendation';
    status: 'confirmed' | 'needs_human_confirmation';
    evidence_source: string;
    confirmation_required: boolean;
  } | null;
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

export function getSeoPackApprovalBlockers(draft: SeoPackDraftContract | null | undefined): string[] {
  if (!draft) return ['missing_seo_pack_draft'];

  const blockers: string[] = [];
  const truth = draft.product_truth;
  const componentFacts = uniqueNonEmpty([
    ...(truth?.included_components || []),
    ...(truth?.known_components || []),
  ]);
  const usefulKeywords = [
    ...(draft.keyword_roles?.primary || []),
    ...(draft.keyword_roles?.secondary || []),
  ].filter((item) => Boolean(item?.keyword || item?.keyword_norm));
  const hasSourceEvidence = Boolean(truth?.source_description_fragment?.trim())
    || Boolean(truth?.source_variations?.length)
    || Boolean(truth?.option_price_rows?.length);

  if (!draft.canonical_product_id) blockers.push('missing_canonical_product_id');
  if (draft.keyword_selection?.status !== 'confirmed') blockers.push('keyword_selection_not_human_confirmed');
  if (!truth?.title?.trim()) blockers.push('missing_product_title');
  if (!truth?.slug?.trim()) blockers.push('missing_product_slug');
  if (truth?.product_truth_source !== 'seo_product_truth_v1') blockers.push('missing_canonical_product_truth_contract');
  if (!componentFacts.length) blockers.push('missing_confirmed_component_truth');
  if ((truth?.unresolved_component_facts || []).length) blockers.push('unresolved_component_truth');
  if ((truth?.component_review_blockers || []).length) blockers.push('component_review_blockers_present');
  if (!hasSourceEvidence) blockers.push('missing_source_configuration_evidence');
  if (!usefulKeywords.length) blockers.push('missing_primary_or_secondary_keyword');
  blockers.push(...getSeoKeywordSelectionBlockers(draft));
  if ((draft.metrics_status?.validated_count || 0) < 1) blockers.push('missing_validated_keyword_metric');
  if (String(draft.status || '').startsWith('blocked_')) blockers.push(`draft_status_${draft.status}`);

  Object.entries(draft.qa_checks || {}).forEach(([key, value]) => {
    if (key !== 'notes' && value === 'blocker') blockers.push(`qa_blocker_${key}`);
  });

  return uniqueNonEmpty(blockers);
}

/** @deprecated Use getSeoPackApprovalBlockers for new code. */
export function getSeoPackDraftSaveBlockers(draft: SeoPackDraftContract | null | undefined): string[] {
  return getSeoPackApprovalBlockers(draft);
}

/**
 * Minimum evidence gate for storing a review artifact.
 *
 * A review draft may preserve unresolved composition facts after the operator
 * confirms the keyword decision. Those composition facts
 * facts remain hard blockers in getSeoPackApprovalBlockers and therefore
 * cannot pass Approval or Apply.
 */
export function getSeoPackReviewDraftStorageBlockers(draft: SeoPackDraftContract | null | undefined): string[] {
  if (!draft) return ['missing_seo_pack_draft'];

  const blockers: string[] = [];
  const truth = draft.product_truth;
  const usefulKeywords = [
    ...(draft.keyword_roles?.primary || []),
    ...(draft.keyword_roles?.secondary || []),
  ].filter((item) => Boolean(item?.keyword || item?.keyword_norm));
  const hasSourceEvidence = Boolean(truth?.source_description_fragment?.trim())
    || Boolean(truth?.source_variations?.length)
    || Boolean(truth?.option_price_rows?.length);

  if (!draft.canonical_product_id) blockers.push('missing_canonical_product_id');
  if (draft.keyword_selection?.status !== 'confirmed') blockers.push('keyword_selection_not_human_confirmed');
  if (!truth?.title?.trim()) blockers.push('missing_product_title');
  if (!truth?.slug?.trim()) blockers.push('missing_product_slug');
  if (truth?.product_truth_source !== 'seo_product_truth_v1') blockers.push('missing_canonical_product_truth_contract');
  if (!hasSourceEvidence) blockers.push('missing_source_configuration_evidence');
  if (!usefulKeywords.length) blockers.push('missing_primary_or_secondary_keyword');
  blockers.push(...getSeoKeywordSelectionBlockers(draft));
  if ((draft.metrics_status?.validated_count || 0) < 1) blockers.push('missing_validated_keyword_metric');
  if (String(draft.status || '').startsWith('blocked_')) blockers.push(`draft_status_${draft.status}`);

  Object.entries(draft.qa_checks || {}).forEach(([key, value]) => {
    if (key !== 'notes' && value === 'blocker') blockers.push(`qa_blocker_${key}`);
  });

  return uniqueNonEmpty(blockers);
}

export function canSaveSeoPackDraft(draft: SeoPackDraftContract | null | undefined): boolean {
  return getSeoPackReviewDraftStorageBlockers(draft).length === 0;
}

/**
 * Rejects an operator decision that narrows a confirmed multi-piece product to
 * one component. Component queries remain useful Secondary evidence, but the
 * Primary must describe the complete product a customer can buy.
 */
export function getSeoKeywordSelectionBlockers(
  draft: SeoPackDraftContract | null | undefined,
): string[] {
  if (!draft) return [];
  const presentation = classifySeoProductPresentation(draft.product_truth);
  if (!presentation.requires_whole_product_entity) return [];

  const primaryRows = Array.isArray(draft.keyword_roles?.primary)
    ? draft.keyword_roles.primary
    : [];
  if (primaryRows.length !== 1) return [];
  const primary = primaryRows[0]?.keyword || primaryRows[0]?.keyword_norm || '';
  return hasWholeProductScope(primary, presentation.components)
    ? []
    : ['primary_keyword_scope_mismatch_for_multi_component_product'];
}

function uniqueNonEmpty(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });

  return result;
}
