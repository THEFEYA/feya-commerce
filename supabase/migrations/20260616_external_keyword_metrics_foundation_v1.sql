-- External Keyword Metrics Foundation v1
-- Add-only layer for Google Ads Keyword Planner, eRank CSV, Etsy history, Trends/manual signals, and paid API fallbacks.

create extension if not exists pgcrypto;

create table if not exists public.feya_keyword_import_batches_v1 (
  import_batch_id uuid primary key default gen_random_uuid(),
  source_code text not null,
  source_name text,
  source_kind text not null default 'manual_import',
  source_file_name text,
  country_code text not null default 'US',
  language_code text not null default 'en',
  import_status text not null default 'draft',
  imported_rows integer not null default 0,
  accepted_rows integer not null default 0,
  rejected_rows integer not null default 0,
  notes text,
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  imported_at timestamptz
);

create table if not exists public.feya_keyword_metrics_v1 (
  keyword_metric_id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.feya_keyword_import_batches_v1(import_batch_id) on delete set null,
  source_code text not null,
  keyword text not null,
  normalized_keyword text generated always as (lower(trim(keyword))) stored,
  country_code text not null default 'US',
  language_code text not null default 'en',
  page_type text,
  strategy_code text,
  event_code text,
  avg_monthly_searches integer,
  competition_level text,
  competition_index numeric(10,4),
  low_top_of_page_bid_micros bigint,
  high_top_of_page_bid_micros bigint,
  trend_score numeric(10,4),
  seasonality_score numeric(10,4),
  buyer_intent_score numeric(10,4),
  event_fit_score numeric(10,4),
  visual_fit_score numeric(10,4),
  raw_row_json jsonb not null default '{}'::jsonb,
  observed_month date,
  created_at timestamptz not null default now()
);

create index if not exists idx_feya_keyword_metrics_v1_keyword on public.feya_keyword_metrics_v1(normalized_keyword);
create index if not exists idx_feya_keyword_metrics_v1_source on public.feya_keyword_metrics_v1(source_code);
create index if not exists idx_feya_keyword_metrics_v1_geo on public.feya_keyword_metrics_v1(country_code, language_code);
create index if not exists idx_feya_keyword_metrics_v1_strategy on public.feya_keyword_metrics_v1(strategy_code);
create index if not exists idx_feya_keyword_metrics_v1_event on public.feya_keyword_metrics_v1(event_code);

create table if not exists public.feya_keyword_event_signals_v1 (
  keyword_event_signal_id uuid primary key default gen_random_uuid(),
  event_code text not null,
  event_name text not null,
  keyword text not null,
  normalized_keyword text generated always as (lower(trim(keyword))) stored,
  country_code text not null default 'US',
  language_code text not null default 'en',
  peak_months integer[] not null default '{}'::integer[],
  season_start_month integer,
  season_end_month integer,
  event_relevance_score numeric(10,4) not null default 50,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feya_keyword_event_signals_v1_keyword on public.feya_keyword_event_signals_v1(normalized_keyword);
create index if not exists idx_feya_keyword_event_signals_v1_event on public.feya_keyword_event_signals_v1(event_code);

create or replace view public.feya_commerce_v_external_keyword_metrics_status_v1 as
select
  source_code,
  country_code,
  language_code,
  count(*)::integer as metric_rows,
  count(distinct normalized_keyword)::integer as unique_keywords,
  max(created_at) as last_metric_at,
  max(observed_month) as last_observed_month,
  avg(avg_monthly_searches)::numeric(12,2) as avg_monthly_searches_avg,
  avg(competition_index)::numeric(12,4) as competition_index_avg
from public.feya_keyword_metrics_v1
group by source_code, country_code, language_code;

create or replace view public.feya_commerce_v_keyword_metrics_latest_v1 as
select distinct on (normalized_keyword, country_code, language_code, source_code)
  keyword_metric_id,
  import_batch_id,
  source_code,
  keyword,
  normalized_keyword,
  country_code,
  language_code,
  page_type,
  strategy_code,
  event_code,
  avg_monthly_searches,
  competition_level,
  competition_index,
  trend_score,
  seasonality_score,
  buyer_intent_score,
  event_fit_score,
  visual_fit_score,
  observed_month,
  created_at
from public.feya_keyword_metrics_v1
order by normalized_keyword, country_code, language_code, source_code, observed_month desc nulls last, created_at desc;

insert into public.feya_keyword_event_signals_v1 (event_code, event_name, keyword, peak_months, season_start_month, season_end_month, event_relevance_score, notes)
values
  ('burning_man', 'Burning Man', 'burning man outfit', array[7,8], 5, 8, 95, 'Desert festival and art event styling.'),
  ('halloween', 'Halloween', 'halloween costume', array[9,10], 8, 10, 95, 'Costume demand peak before Halloween.'),
  ('festival_rave', 'Festival / Rave', 'festival outfit', array[4,5,6,7,8], 3, 8, 90, 'General festival and rave season.'),
  ('stage_performance', 'Stage Performance', 'stage outfit', array[1,2,3,4,5,6,7,8,9,10,11,12], 1, 12, 85, 'Evergreen performer/stagewear demand.'),
  ('cosplay', 'Cosplay', 'cosplay costume', array[5,6,7,8,9,10], 4, 10, 80, 'Convention and cosplay demand.')
on conflict do nothing;
