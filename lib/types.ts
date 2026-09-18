export type StorefrontConfiguration = {
  configuration_id?: string | null;
  configuration_label?: string | null;
  configuration_name?: string | null;
  option_name?: string | null;
  option_value?: string | null;
  raw_option_value?: string | null;
  title?: string | null;
  label?: string | null;
  price_amount?: number | null;
  price?: number | null;
  amount?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  currency?: string | null;
  has_fallback_price?: boolean | null;
  components?: unknown;
  selected_options?: unknown;
  [key: string]: unknown;
};

export type StorefrontProduct = {
  canonical_product_id: string;
  product_slug: string | null;
  matched_etsy_listing_id: string | null;
  source_url: string | null;
  card_title: string | null;
  h1: string | null;
  seo_title: string | null;
  meta_description: string | null;
  product_type: string | null;
  material: string | null;
  color: string | null;
  size_mode: string | null;
  production_profile: string | null;
  shipping_profile: string | null;
  handmade_flag: boolean | null;
  styled_imagery_flag: boolean | null;
  primary_image_url: string | null;
  primary_image_alt: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
  has_fallback_price: boolean | null;
  has_sampler_excluded_price: boolean | null;
  public_configuration_count: number | null;
  public_price_row_count: number | null;
  configurations: unknown;
  storefront_candidate_flag: boolean | null;
};

export type ReviewQueueSummary = {
  queue_code?: string | null;
  queue_name?: string | null;
  status?: string | null;
  review_queue?: string | null;
  item_count?: number | null;
  count?: number | null;
  row_count?: number | null;
  total?: number | null;
  priority?: number | null;
  description?: string | null;
  [key: string]: unknown;
};

export type AdminCatalogRow = {
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  etsy_listing_id?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  h1?: string | null;
  source_title?: string | null;
  raw_title?: string | null;
  readiness_status?: string | null;
  readiness_label?: string | null;
  status?: string | null;
  publish_status?: string | null;
  storefront_status?: string | null;
  publication_status?: string | null;
  next_action?: string | null;
  notes?: string | null;
  review_reason?: string | null;
  blocker_reason?: string | null;
  do_not_publish_flag?: boolean | null;
  [key: string]: unknown;
};


export type SeoKeywordCleanupReportRow = {
  keyword?: string | null;
  keyword_norm?: string | null;
  priority_tier?: string | null;
  queue_suggested_page_level?: string | null;
  queue_keyword_axis?: string | null;
  queue_keyword_pattern?: string | null;
  validation_status?: string | null;
  cleanup_pipeline_status?: string | null;
  cleaned_keyword?: string | null;
  suggested_keyword?: string | null;
  should_validate_api?: boolean | null;
  should_hold?: boolean | null;
  needs_ai_cleanup?: boolean | null;
  needs_human_review?: boolean | null;
  ready_for_metric_validation?: boolean | null;
  warning_flags?: string[] | string | null;
  [key: string]: unknown;
};


export type ProductBuilderPrice = {
  configuration_price_id?: string | null;
  source_amount?: number | null;
  source_currency?: string | null;
  public_price_amount?: number | null;
  manual_override_amount?: number | null;
  confidence?: number | null;
  fallback_flag?: boolean | null;
  sampler_excluded_flag?: boolean | null;
  review_status?: string | null;
  price_status?: string | null;
  [key: string]: unknown;
};

export type ProductBuilderConfiguration = {
  sellable_configuration_id?: string | null;
  configuration_name?: string | null;
  normalized_key?: string | null;
  is_default_whole_product?: boolean | null;
  is_sampler?: boolean | null;
  is_public_candidate?: boolean | null;
  sort_order?: number | null;
  review_status?: string | null;
  prices?: ProductBuilderPrice[] | null;
  [key: string]: unknown;
};

export type ProductBuilderMediaItem = {
  media_draft_id?: string | null;
  source_image_url?: string | null;
  source_image_order?: number | null;
  assigned_role?: string | null;
  role_confidence?: number | null;
  alt_text_draft?: string | null;
  ai_styled_image_flag?: boolean | null;
  use_publicly_flag?: boolean | null;
  readiness_status?: string | null;
  review_status?: string | null;
  [key: string]: unknown;
};

export type ProductBuilderContentItem = {
  content_draft_id?: string | null;
  content_language?: string | null;
  site_title?: string | null;
  card_title?: string | null;
  h1?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  snippet_status?: string | null;
  ai_content_status?: string | null;
  review_status?: string | null;
  [key: string]: unknown;
};

export type ProductBuilderMatchItem = {
  listing_match_id?: string | null;
  source_listing_id?: string | null;
  source_price_row_id?: string | null;
  match_status?: string | null;
  match_confidence?: number | null;
  review_status?: string | null;
  do_not_import_flag?: boolean | null;
  notes?: string | null;
  [key: string]: unknown;
};

export type AdminProductBuilderDetail = {
  canonical_product_id: string;
  source_shop_code?: string | null;
  primary_source_listing_id?: string | null;
  matched_etsy_listing_id?: string | null;
  source_url?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  h1?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  product_type?: string | null;
  material?: string | null;
  color?: string | null;
  size_mode?: string | null;
  production_profile?: string | null;
  shipping_profile?: string | null;
  handmade_flag?: boolean | null;
  styled_imagery_flag?: boolean | null;
  publish_status?: string | null;
  readiness_status?: string | null;
  do_not_publish_flag?: boolean | null;
  notes?: string | null;
  configurations?: ProductBuilderConfiguration[] | null;
  media_items?: ProductBuilderMediaItem[] | null;
  content_items?: ProductBuilderContentItem[] | null;
  match_items?: ProductBuilderMatchItem[] | null;
  [key: string]: unknown;
};


export type SeoBriefReadiness = {
  canonical_product_id: string;
  seo_brief_readiness_status?: string | null;
  seo_brief_priority_order?: number | null;
  media_count?: number | null;
  public_media_count?: number | null;
  alt_text_count?: number | null;
  filename_suggestion_count?: number | null;
  sellable_configuration_count?: number | null;
  public_configuration_count?: number | null;
  content_draft_count?: number | null;
  content_seo_title_count?: number | null;
  content_meta_count?: number | null;
  content_full_description_count?: number | null;
  [key: string]: unknown;
};


export type SeoPagePortfolioRow = {
  seo_page_id: string;
  canonical_product_id?: string | null;
  page_type?: string | null;
  url_path?: string | null;
  canonical_url?: string | null;
  market_code?: string | null;
  locale?: string | null;
  lifecycle_state?: string | null;
  indexation_intent?: string | null;
  portfolio_status?: string | null;
  protected_winner_flag?: boolean | null;
  card_title?: string | null;
  h1?: string | null;
  product_type?: string | null;
  material?: string | null;
  color?: string | null;
  ownership_count?: number | null;
  primary_ownership_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};


export type QueryClusterReviewRow = {
  keyword_id: number;
  source_keyword?: string | null;
  keyword_norm?: string | null;
  semantic_keyword_candidate?: string | null;
  keyword_axis?: string | null;
  keyword_pattern?: string | null;
  suggested_page_level?: string | null;
  priority_tier?: string | null;
  validation_priority?: string | null;
  keyword_master_validation_status?: string | null;
  requires_api_validation?: boolean | null;
  product_count?: number | null;
  cleanup_id?: number | null;
  ai_intent?: string | null;
  ai_rewrite_status?: string | null;
  cleanup_review_status?: string | null;
  should_validate_api?: boolean | null;
  should_use_for_product?: boolean | null;
  should_use_for_collection?: boolean | null;
  should_use_for_image_alt?: boolean | null;
  should_hold?: boolean | null;
  warning_flags?: unknown;
  avg_monthly_searches?: number | null;
  competition?: string | null;
  competition_index?: number | null;
  latest_metric_fetched_at?: string | null;
  metric_data_freshness_status?: string | null;
  cluster_membership_count?: number | null;
  cluster_queue_status?: string | null;
  clustering_lane?: string | null;
  [key: string]: unknown;
};


export type GrowthCapabilityStatusRow = {
  capability_code: string;
  capability_name?: string | null;
  owner_role?: string | null;
  capability_state?: string | null;
  implementation_state?: string | null;
  public_summary?: string | null;
  limitations_summary?: string | null;
  version_no?: number | null;
  updated_at?: string | null;
  [key: string]: unknown;
};


export type ContentQaShadowRow = {
  draft_id: string;
  canonical_product_id: string;
  product_slug?: string | null;
  card_title?: string | null;
  draft_status?: string | null;
  human_review_status?: string | null;
  source_mode?: string | null;
  pack_version?: string | null;
  source_brief_version?: string | null;
  output_contract_version?: string | null;
  metrics_status?: string | null;
  validation_status?: string | null;
  similarity_status?: string | null;
  image_alt_truth_status?: string | null;
  cqa_status?: string | null;
  cqa_policy_version?: string | null;
  cqa_reviewed_at?: string | null;
  approval_blocker_count?: number | null;
  product_truth_blocker_count?: number | null;
  cqa_shadow_state?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};


export type BusinessTruthStatusRow = {
  truth_code: string;
  truth_type?: string | null;
  scope_type?: string | null;
  scope_key?: string | null;
  locale?: string | null;
  public_copy?: string | null;
  status?: string | null;
  version_no?: number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};


export type ContentBriefCompilerStatusRow = {
  brief_queue_id: string;
  canonical_product_id: string;
  compiler_version?: string | null;
  compiler_status?: string | null;
  can_generate_shadow?: boolean | null;
  can_produce_canonical_brief?: boolean | null;
  generation_gate_status?: string | null;
  safe_generation_status?: string | null;
  product_fact_quality_status?: string | null;
  plan_status?: string | null;
  primary_keyword?: string | null;
  page_goal_code?: string | null;
  primary_axis_code?: string | null;
  primary_term_code?: string | null;
  seo_page_id?: string | null;
  url_path?: string | null;
  page_lifecycle_state?: string | null;
  indexation_intent?: string | null;
  protected_winner_flag?: boolean | null;
  ownership_count?: number | null;
  primary_ownership_count?: number | null;
  business_truth_count?: number | null;
  content_policy_version?: number | null;
  [key: string]: unknown;
};


export type GrowthMetricRegistryRow = {
  metric_code: string;
  metric_name?: string | null;
  owner_role?: string | null;
  metric_state?: string | null;
  implementation_state?: string | null;
  public_summary?: string | null;
  limitations_summary?: string | null;
  measurement_surface?: string | null;
  authority_source?: string | null;
  unit?: string | null;
  direction?: string | null;
  version_no?: number | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type GrowthOperationalMetricRow = {
  metric_code: string;
  metric_value?: string | number | null;
  unit?: string | null;
  measured_at?: string | null;
  [key: string]: unknown;
};

export type GrowthActionCapabilityRow = {
  action_code: string;
  action_name?: string | null;
  owner_role?: string | null;
  action_state?: string | null;
  implementation_state?: string | null;
  public_summary?: string | null;
  limitations_summary?: string | null;
  action_class?: string | null;
  executor_type?: string | null;
  approval_class?: string | null;
  production_mutation?: boolean | null;
  dry_run_default?: boolean | null;
  version_no?: number | null;
  updated_at?: string | null;
  [key: string]: unknown;
};


export type LaunchReadinessGateRow = {
  readiness_scope: string;
  gate_code: string;
  gate_name?: string | null;
  gate_status?: string | null;
  is_blocker?: boolean | null;
  summary?: string | null;
  next_action?: string | null;
  owner_role?: string | null;
  evidence_json?: unknown;
  [key: string]: unknown;
};

export type LaunchReadinessSummaryRow = {
  readiness_scope: string;
  scope_status?: string | null;
  gate_count?: number | null;
  pass_count?: number | null;
  warn_count?: number | null;
  blocked_count?: number | null;
  blocking_count?: number | null;
  [key: string]: unknown;
};


export type GrowthSignalCandidateRow = {
  signal_fingerprint: string;
  signal_code: string;
  signal_type?: string | null;
  signal_scope?: string | null;
  accountable_domain?: string | null;
  priority?: string | null;
  materiality_score?: number | string | null;
  maturity_state?: string | null;
  signal_state?: string | null;
  case_admission_recommendation?: string | null;
  title?: string | null;
  summary?: string | null;
  next_action?: string | null;
  entity_scope_json?: unknown;
  evidence_json?: unknown;
  generated_at?: string | null;
  [key: string]: unknown;
};


export type CaseAdmissionPreviewRow = {
  signal_fingerprint: string;
  signal_code?: string | null;
  existing_case_id?: string | null;
  existing_case_code?: string | null;
  existing_case_status?: string | null;
  admission_decision?: string | null;
  admission_reason?: string | null;
  [key: string]: unknown;
};


export type KeywordCleanupReviewStatusRow = {
  cleanup_id: number;
  keyword_id?: number | null;
  keyword_norm?: string | null;
  original_keyword?: string | null;
  cleaned_keyword?: string | null;
  suggested_keyword?: string | null;
  effective_keyword?: string | null;
  keyword_axis?: string | null;
  keyword_pattern?: string | null;
  suggested_page_level?: string | null;
  ai_intent?: string | null;
  warning_flags?: unknown;
  normalization_only?: boolean | null;
  review_risk?: string | null;
  review_lane?: string | null;
  review_status?: string | null;
  approved_keyword?: string | null;
  approved_at?: string | null;
  recommendation_id?: string | null;
  recommendation?: string | null;
  recommended_keyword?: string | null;
  recommended_page_level?: string | null;
  recommended_intent?: string | null;
  issues_json?: unknown;
  recommendation_reason?: string | null;
  review_model_name?: string | null;
  review_prompt_version?: string | null;
  recommendation_created_at?: string | null;
  [key: string]: unknown;
};


export type QueryClusterProposalCandidateRow = {
  cleanup_id: number;
  keyword_id?: number | null;
  keyword_norm?: string | null;
  approved_keyword?: string | null;
  approved_keyword_norm?: string | null;
  keyword_axis?: string | null;
  keyword_pattern?: string | null;
  suggested_page_level?: string | null;
  ai_intent?: string | null;
  approved_at?: string | null;
  active_membership_count?: number | null;
  avg_monthly_searches?: number | null;
  competition?: string | null;
  competition_index?: number | null;
  metric_fetched_at?: string | null;
  metric_freshness_status?: string | null;
  proposal_candidate_status?: string | null;
  [key: string]: unknown;
};

export type QueryClusterProposalRow = {
  proposal_id: string;
  proposal_code?: string | null;
  cluster_label?: string | null;
  normalized_intent?: string | null;
  intent_type?: string | null;
  language_code?: string | null;
  market_scope?: string | null;
  proposed_members_json?: unknown;
  proposed_member_count?: number | null;
  rationale?: string | null;
  proposal_status?: string | null;
  model_name?: string | null;
  prompt_version?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  applied_query_cluster_id?: string | null;
  applied_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};


export type PageOwnershipCandidateClusterRow = {
  query_cluster_id: string;
  cluster_code?: string | null;
  cluster_label?: string | null;
  normalized_intent?: string | null;
  intent_type?: string | null;
  language_code?: string | null;
  market_scope?: string | null;
  cluster_status?: string | null;
  member_count?: number | null;
  primary_owner_count?: number | null;
  ownership_candidate_status?: string | null;
  [key: string]: unknown;
};

export type PageOwnershipProposalRow = {
  proposal_id: string;
  query_cluster_id?: string | null;
  cluster_code?: string | null;
  cluster_label?: string | null;
  normalized_intent?: string | null;
  seo_page_id?: string | null;
  url_path?: string | null;
  card_title?: string | null;
  ownership_role?: string | null;
  market_code?: string | null;
  locale?: string | null;
  rationale?: string | null;
  proposal_status?: string | null;
  model_name?: string | null;
  prompt_version?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  applied_page_query_ownership_id?: string | null;
  applied_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};
