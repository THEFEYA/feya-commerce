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
