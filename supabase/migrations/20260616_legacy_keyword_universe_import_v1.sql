-- Legacy keyword universe import tables v1
-- Staging layer for old v3.3 keyword master, DNA clusters and event keyword packs.

create table if not exists public.feya_legacy_keyword_master_v33 (
  legacy_keyword_id bigserial primary key,
  keyword_raw text,
  keyword text not null,
  keyword_norm text not null,
  lang text,
  event_type text,
  intent_stage text,
  product_tag_primary text,
  material_tag text,
  style_tag text,
  tier text,
  intent_weight numeric,
  avg_searches_mean numeric,
  competition_median numeric,
  ctr_median numeric,
  demand_score numeric,
  market_score numeric,
  dna_part text,
  dna_material text,
  dna_context_primary text,
  dna_context_secondary text,
  dna_persona text,
  dna_cluster_key text,
  risk_level text,
  topic_status text,
  global_status text,
  negative_flag numeric,
  adult_flag numeric,
  geo_tags text,
  geo_priority numeric,
  season_tags text,
  season_relevance_now numeric,
  b2b_flag numeric,
  b2b_priority_score numeric,
  priority_score_v33 numeric,
  compat_acrylic_top text,
  compat_top text,
  compat_harness_leather text,
  compat_dress text,
  compat_headpieces text,
  compat_shoulders text,
  compat_bodysuits text,
  compat_skirt text,
  compat_panties text,
  compat_sets text,
  compat_arms text,
  compat_legs text,
  compat_corset text,
  compat_masks text,
  all_compat_forbidden numeric,
  imported_at timestamptz not null default now()
);

create index if not exists idx_feya_legacy_keyword_master_v33_keyword on public.feya_legacy_keyword_master_v33(keyword_norm);
create index if not exists idx_feya_legacy_keyword_master_v33_status on public.feya_legacy_keyword_master_v33(topic_status, global_status, risk_level);
create index if not exists idx_feya_legacy_keyword_master_v33_dna on public.feya_legacy_keyword_master_v33(dna_part, dna_material, dna_context_primary, dna_context_secondary, dna_persona);
create index if not exists idx_feya_legacy_keyword_master_v33_event on public.feya_legacy_keyword_master_v33(event_type);

create table if not exists public.feya_legacy_dna_clusters_v33 (
  dna_cluster_key text primary key,
  dna_part text,
  dna_material text,
  dna_context_primary text,
  dna_context_secondary text,
  dna_persona text,
  keywords numeric,
  avg_priority numeric,
  avg_intent numeric,
  share_b2b numeric,
  share_forbidden numeric,
  imported_at timestamptz not null default now()
);

create table if not exists public.feya_event_keyword_packs_v33 (
  event_pack_keyword_id bigserial primary key,
  event_type text not null,
  pack_rank integer not null,
  keyword text not null,
  keyword_norm text not null,
  imported_at timestamptz not null default now()
);

create index if not exists idx_feya_event_keyword_packs_v33_event on public.feya_event_keyword_packs_v33(event_type, pack_rank);
create index if not exists idx_feya_event_keyword_packs_v33_keyword on public.feya_event_keyword_packs_v33(keyword_norm);

create table if not exists public.feya_event_types_v1 (
  event_type_code text primary key,
  event_type_name text not null,
  active_flag integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.feya_event_signal_types_v1 (
  signal_type_code text primary key,
  signal_type_name text not null,
  default_signal_boost integer not null default 0,
  active_flag integer not null default 1,
  created_at timestamptz not null default now()
);

create or replace view public.feya_commerce_v_keyword_universe_status_v1 as
select 'legacy_keyword_master_v33'::text as source_table, count(*)::integer as rows_count, count(distinct keyword_norm)::integer as unique_keywords from public.feya_legacy_keyword_master_v33
union all
select 'legacy_dna_clusters_v33'::text, count(*)::integer, count(distinct dna_cluster_key)::integer from public.feya_legacy_dna_clusters_v33
union all
select 'event_keyword_packs_v33'::text, count(*)::integer, count(distinct keyword_norm)::integer from public.feya_event_keyword_packs_v33
union all
select 'event_types_v1'::text, count(*)::integer, count(*)::integer from public.feya_event_types_v1
union all
select 'event_signal_types_v1'::text, count(*)::integer, count(*)::integer from public.feya_event_signal_types_v1;
