-- FEYA Commerce SEO Content Intelligence Engine v1
-- Add-only foundation for pre-indexation SEO content preparation.
-- External services are signal sources, not the system core.

create table if not exists public.feya_seo_source_connections_v1 (
  source_code text primary key,
  source_name text not null,
  source_type text not null default 'keyword_signal',
  connection_status text not null default 'manual_only',
  priority_level smallint not null default 50,
  notes text,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feya_seo_source_connections_v1 (source_code, source_name, source_type, connection_status, priority_level, notes)
values
  ('product_dna', 'Existing Product DNA / Passports', 'internal_truth', 'connected', 10, 'Core meaning layer. Product facts, components, style, material, context and brand rules.'),
  ('manual_seed', 'Manual Keyword Seeds', 'keyword_signal', 'manual_only', 20, 'Human-approved seed keywords from internal research or admin input.'),
  ('old_etsy_data', 'Old Etsy Organic / Listing Data', 'marketplace_signal', 'manual_import', 30, 'Historical Etsy title, tags, organic query and cluster signals when imported.'),
  ('google_ads_keyword_planner', 'Google Ads Keyword Planning', 'keyword_metrics', 'planned', 40, 'Primary future keyword metrics source: search volume, competition, bid ranges and geo/language metrics. No ad campaign required.'),
  ('google_trends', 'Google Trends', 'trend_signal', 'optional_later', 60, 'Optional seasonality source. Do not block MVP if API/access is unavailable.'),
  ('erank', 'eRank', 'marketplace_signal', 'manual_import', 70, 'Optional marketplace validation. Use exports/imports unless official API access is available.'),
  ('search_console', 'Google Search Console', 'feedback_loop', 'later_after_indexation', 90, 'Second-stage feedback loop after the site has impressions/click data.'),
  ('dataforseo', 'DataForSEO', 'keyword_metrics', 'paid_later', 100, 'Fallback paid data layer if Google Ads/exports are not enough.')
on conflict (source_code) do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  connection_status = excluded.connection_status,
  priority_level = excluded.priority_level,
  notes = excluded.notes,
  updated_at = now();

create table if not exists public.feya_keyword_candidates_v1 (
  keyword_candidate_id bigserial primary key,
  canonical_product_id text,
  product_slug text,
  collection_slug text,
  page_type text not null default 'product',
  keyword text not null,
  normalized_keyword text generated always as (lower(regexp_replace(keyword, '\s+', ' ', 'g'))) stored,
  source_code text not null references public.feya_seo_source_connections_v1(source_code),
  source_status text not null default 'active',
  country_code text not null default 'US',
  language_code text not null default 'en',
  search_volume integer,
  competition_level text,
  competition_index numeric(6,2),
  low_top_of_page_bid numeric(12,4),
  high_top_of_page_bid numeric(12,4),
  trend_score numeric(6,2),
  seasonality_score numeric(6,2),
  buyer_intent_score numeric(6,2),
  dna_relevance_score numeric(6,2),
  region_fit_score numeric(6,2),
  anti_cannibalization_score numeric(6,2),
  final_score numeric(6,2),
  bucket text not null default 'candidate',
  placement text,
  is_excluded boolean not null default false,
  exclusion_reason text,
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  refreshed_at timestamptz
);

create index if not exists idx_feya_keyword_candidates_product on public.feya_keyword_candidates_v1 (canonical_product_id, product_slug);
create index if not exists idx_feya_keyword_candidates_collection on public.feya_keyword_candidates_v1 (collection_slug, page_type);
create index if not exists idx_feya_keyword_candidates_source on public.feya_keyword_candidates_v1 (source_code, source_status);
create index if not exists idx_feya_keyword_candidates_score on public.feya_keyword_candidates_v1 (final_score desc nulls last);
create unique index if not exists uq_feya_keyword_candidates_scope_keyword on public.feya_keyword_candidates_v1 (coalesce(canonical_product_id, ''), coalesce(collection_slug, ''), page_type, normalized_keyword, source_code, country_code, language_code);

create table if not exists public.feya_seo_briefs_v1 (
  seo_brief_id bigserial primary key,
  canonical_product_id text,
  product_slug text,
  collection_slug text,
  page_type text not null default 'product',
  page_angle text,
  primary_keyword text,
  secondary_keywords_json jsonb not null default '[]'::jsonb,
  long_tail_keywords_json jsonb not null default '[]'::jsonb,
  image_keywords_json jsonb not null default '[]'::jsonb,
  excluded_keywords_json jsonb not null default '[]'::jsonb,
  target_country_codes_json jsonb not null default '["US","GB","CA","AU"]'::jsonb,
  target_language_code text not null default 'en',
  target_customer text,
  season_context text,
  event_context text,
  brief_status text not null default 'draft',
  strategy_notes text,
  source_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists idx_feya_seo_briefs_product on public.feya_seo_briefs_v1 (canonical_product_id, product_slug, brief_status);
create index if not exists idx_feya_seo_briefs_collection on public.feya_seo_briefs_v1 (collection_slug, page_type, brief_status);

create table if not exists public.feya_seo_content_assets_v1 (
  content_asset_id bigserial primary key,
  seo_brief_id bigint references public.feya_seo_briefs_v1(seo_brief_id) on delete set null,
  canonical_product_id text,
  product_slug text,
  collection_slug text,
  page_type text not null default 'product',
  version_number integer not null default 1,
  asset_status text not null default 'draft',
  seo_title text,
  h1 text,
  meta_title text,
  meta_description text,
  slug_suggestion text,
  product_intro text,
  short_mobile_description text,
  full_description text,
  bullet_highlights_json jsonb not null default '[]'::jsonb,
  faq_json jsonb not null default '[]'::jsonb,
  image_alt_json jsonb not null default '[]'::jsonb,
  image_filename_json jsonb not null default '[]'::jsonb,
  internal_links_json jsonb not null default '[]'::jsonb,
  schema_json jsonb not null default '{}'::jsonb,
  generated_by text not null default 'rule_based',
  prompt_version text,
  rules_version text,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists idx_feya_seo_content_assets_product on public.feya_seo_content_assets_v1 (canonical_product_id, product_slug, asset_status);
create index if not exists idx_feya_seo_content_assets_collection on public.feya_seo_content_assets_v1 (collection_slug, page_type, asset_status);
create index if not exists idx_feya_seo_content_assets_brief on public.feya_seo_content_assets_v1 (seo_brief_id);

create table if not exists public.feya_seo_quality_checks_v1 (
  quality_check_id bigserial primary key,
  content_asset_id bigint not null references public.feya_seo_content_assets_v1(content_asset_id) on delete cascade,
  water_score numeric(6,2),
  keyword_density_score numeric(6,2),
  human_style_score numeric(6,2),
  duplicate_phrase_score numeric(6,2),
  cannibalization_score numeric(6,2),
  mobile_readability_score numeric(6,2),
  product_specificity_score numeric(6,2),
  buyer_clarity_score numeric(6,2),
  long_dash_count integer not null default 0,
  cliche_count integer not null default 0,
  repeated_phrase_count integer not null default 0,
  missing_facts_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  approved boolean not null default false,
  check_status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index if not exists idx_feya_seo_quality_checks_asset on public.feya_seo_quality_checks_v1 (content_asset_id, created_at desc);
create index if not exists idx_feya_seo_quality_checks_status on public.feya_seo_quality_checks_v1 (check_status, approved);

create table if not exists public.feya_seo_generation_runs_v1 (
  generation_run_id bigserial primary key,
  canonical_product_id text,
  product_slug text,
  collection_slug text,
  page_type text not null default 'product',
  run_type text not null default 'seo_content_draft',
  run_status text not null default 'created',
  source_data_snapshot_json jsonb not null default '{}'::jsonb,
  input_brief_json jsonb not null default '{}'::jsonb,
  prompt_version text,
  rules_version text,
  model_name text,
  output_asset_id bigint references public.feya_seo_content_assets_v1(content_asset_id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_feya_seo_generation_runs_product on public.feya_seo_generation_runs_v1 (canonical_product_id, product_slug, created_at desc);
create index if not exists idx_feya_seo_generation_runs_status on public.feya_seo_generation_runs_v1 (run_type, run_status);

create table if not exists public.feya_seo_cannibalization_map_v1 (
  cannibalization_id bigserial primary key,
  page_a_type text not null default 'product',
  page_a_key text not null,
  page_b_type text not null default 'product',
  page_b_key text not null,
  shared_keywords_json jsonb not null default '[]'::jsonb,
  similarity_score numeric(6,2),
  conflict_level text not null default 'unknown',
  recommendation text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_feya_seo_cannibalization_a on public.feya_seo_cannibalization_map_v1 (page_a_type, page_a_key);
create index if not exists idx_feya_seo_cannibalization_b on public.feya_seo_cannibalization_map_v1 (page_b_type, page_b_key);
create index if not exists idx_feya_seo_cannibalization_conflict on public.feya_seo_cannibalization_map_v1 (conflict_level, similarity_score desc nulls last);

create or replace view public.feya_commerce_v_seo_content_engine_status_v1 as
select
  coalesce(b.canonical_product_id, a.canonical_product_id) as canonical_product_id,
  coalesce(b.product_slug, a.product_slug) as product_slug,
  coalesce(b.collection_slug, a.collection_slug) as collection_slug,
  coalesce(b.page_type, a.page_type) as page_type,
  b.seo_brief_id,
  b.brief_status,
  b.primary_keyword,
  a.content_asset_id,
  a.asset_status,
  a.version_number,
  q.quality_check_id,
  q.check_status,
  q.approved as qa_approved,
  q.human_style_score,
  q.keyword_density_score,
  q.cannibalization_score,
  a.updated_at as content_updated_at,
  b.updated_at as brief_updated_at
from public.feya_seo_briefs_v1 b
full outer join public.feya_seo_content_assets_v1 a
  on a.seo_brief_id = b.seo_brief_id
left join lateral (
  select qc.*
  from public.feya_seo_quality_checks_v1 qc
  where qc.content_asset_id = a.content_asset_id
  order by qc.created_at desc
  limit 1
) q on true;

comment on table public.feya_keyword_candidates_v1 is 'Normalized keyword candidate pool from internal and external signal adapters for pre-indexation SEO preparation.';
comment on table public.feya_seo_briefs_v1 is 'Approved or draft SEO strategy per product or collection page before content generation.';
comment on table public.feya_seo_content_assets_v1 is 'Generated or rule-based SEO content packs awaiting QA/approval before publishing/export.';
comment on table public.feya_seo_quality_checks_v1 is 'Humanizer, SEO QA and anti-cannibalization results for content assets.';
comment on table public.feya_seo_generation_runs_v1 is 'Audit trail for every generation/scoring/content run.';
