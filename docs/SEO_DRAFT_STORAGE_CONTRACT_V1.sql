-- FEYA Commerce / TheFEYA
-- SEO draft storage contract v1
-- Purpose: reviewable SEO-pack draft storage after SEO Brief / Draft Review stabilizes.
-- Safety: this file is a contract for Supabase SQL Editor review. It is not auto-run by the app.
-- Prefix: public.feya_commerce_

-- ============================================================================
-- 0) Design rules
-- ============================================================================
-- 1. No publish from this layer.
-- 2. No OpenAI call from database.
-- 3. No browser/client direct writes.
-- 4. Drafts are review artifacts, not storefront truth.
-- 5. A product can have many draft versions, but only one latest draft per product is selected by the view.
-- 6. ready_for_publish requires separate future gates: human review + similarity/cannibalization + image ALT truth.
-- 7. Keep source contracts as jsonb snapshots so we can audit what the model/human reviewed.

-- ============================================================================
-- 1) Main draft table
-- ============================================================================
create table if not exists public.feya_commerce_seo_pack_drafts_v1 (
  id uuid primary key default gen_random_uuid(),

  canonical_product_id uuid not null,
  matched_etsy_listing_id text null,
  product_slug text null,

  pack_version text not null default 'seo_pack_v1',
  source_brief_version text not null default 'seo_brief_v2_1',
  output_contract_version text not null default 'seo_agent_output_v1',

  status text not null default 'draft_generated',
  review_status text not null default 'not_reviewed',

  source_mode text not null default 'brief_baseline',
  source_decision_id uuid null,

  seo_title text null,
  h1 text null,
  meta_description text null,
  intro text null,
  bullet_highlights jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  image_alt_candidates jsonb not null default '[]'::jsonb,
  internal_linking_hints jsonb not null default '[]'::jsonb,

  product_truth_snapshot jsonb not null default '{}'::jsonb,
  manual_focus_snapshot jsonb not null default '{}'::jsonb,
  keyword_roles_snapshot jsonb not null default '{}'::jsonb,
  metrics_status_snapshot jsonb not null default '{}'::jsonb,
  qa_self_report jsonb not null default '{}'::jsonb,
  similarity_check_snapshot jsonb null,
  agent_input_snapshot jsonb null,
  agent_output_snapshot jsonb not null default '{}'::jsonb,
  validation_result_snapshot jsonb not null default '{}'::jsonb,

  human_review_notes text null,
  reviewer text null,
  reviewed_at timestamptz null,

  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,

  constraint feya_commerce_seo_pack_drafts_v1_status_chk check (status in (
    'draft_generated',
    'needs_human_review',
    'changes_requested',
    'rejected',
    'approved_draft',
    'needs_similarity_check',
    'needs_image_alt_review',
    'ready_for_publish',
    'published',
    'archived'
  )),
  constraint feya_commerce_seo_pack_drafts_v1_review_status_chk check (review_status in (
    'not_reviewed',
    'approved',
    'changes_requested',
    'rejected'
  )),
  constraint feya_commerce_seo_pack_drafts_v1_source_mode_chk check (source_mode in (
    'brief_baseline',
    'mock_contract',
    'openai_draft',
    'human_edit'
  )),
  constraint feya_commerce_seo_pack_drafts_v1_publish_guard_chk check (
    status <> 'ready_for_publish'
    or (
      review_status = 'approved'
      and reviewed_at is not null
      and similarity_check_snapshot is not null
      and coalesce(similarity_check_snapshot->>'status', '') = 'pass'
      and coalesce(qa_self_report->>'image_alt_truth', '') = 'pass'
    )
  )
);

create index if not exists feya_commerce_seo_pack_drafts_v1_product_idx
  on public.feya_commerce_seo_pack_drafts_v1 (canonical_product_id, created_at desc);

create index if not exists feya_commerce_seo_pack_drafts_v1_status_idx
  on public.feya_commerce_seo_pack_drafts_v1 (status, review_status, created_at desc);

create index if not exists feya_commerce_seo_pack_drafts_v1_slug_idx
  on public.feya_commerce_seo_pack_drafts_v1 (product_slug);

-- ============================================================================
-- 2) Event/audit table
-- ============================================================================
create table if not exists public.feya_commerce_seo_pack_draft_events_v1 (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.feya_commerce_seo_pack_drafts_v1(id) on delete cascade,
  canonical_product_id uuid not null,
  event_type text not null,
  from_status text null,
  to_status text null,
  actor text not null default 'system',
  note text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint feya_commerce_seo_pack_draft_events_v1_event_type_chk check (event_type in (
    'draft_created',
    'draft_updated',
    'validation_checked',
    'human_review_requested',
    'human_approved',
    'changes_requested',
    'rejected',
    'similarity_checked',
    'image_alt_checked',
    'ready_for_publish_marked',
    'archived'
  ))
);

create index if not exists feya_commerce_seo_pack_draft_events_v1_draft_idx
  on public.feya_commerce_seo_pack_draft_events_v1 (draft_id, created_at desc);

create index if not exists feya_commerce_seo_pack_draft_events_v1_product_idx
  on public.feya_commerce_seo_pack_draft_events_v1 (canonical_product_id, created_at desc);

-- Server-only storage boundary. service_role bypasses RLS; no browser role receives
-- table access or an application policy from this contract.
alter table public.feya_commerce_seo_pack_drafts_v1 enable row level security;
alter table public.feya_commerce_seo_pack_draft_events_v1 enable row level security;

revoke all on table public.feya_commerce_seo_pack_drafts_v1 from anon, authenticated;
revoke all on table public.feya_commerce_seo_pack_draft_events_v1 from anon, authenticated;
grant select, insert, update, delete on table public.feya_commerce_seo_pack_drafts_v1 to service_role;
grant select, insert, update, delete on table public.feya_commerce_seo_pack_draft_events_v1 to service_role;

-- ============================================================================
-- 3) Updated-at helper
-- ============================================================================
create or replace function public.feya_commerce_touch_updated_at_v1()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feya_commerce_seo_pack_drafts_v1_touch on public.feya_commerce_seo_pack_drafts_v1;
create trigger trg_feya_commerce_seo_pack_drafts_v1_touch
before update on public.feya_commerce_seo_pack_drafts_v1
for each row execute function public.feya_commerce_touch_updated_at_v1();

-- ============================================================================
-- 4) Read views
-- ============================================================================
create or replace view public.feya_commerce_v_seo_pack_drafts_latest_v1 as
select distinct on (d.canonical_product_id)
  d.*
from public.feya_commerce_seo_pack_drafts_v1 d
where d.archived_at is null
order by d.canonical_product_id, d.created_at desc;

create or replace view public.feya_commerce_v_seo_pack_review_queue_v1 as
select
  d.id,
  d.canonical_product_id,
  d.matched_etsy_listing_id,
  d.product_slug,
  d.status,
  d.review_status,
  d.source_mode,
  d.seo_title,
  d.h1,
  d.meta_description,
  coalesce(d.metrics_status_snapshot->>'status', 'missing') as metrics_status,
  coalesce(d.validation_result_snapshot->>'status', 'not_checked') as validation_status,
  coalesce(d.qa_self_report->>'similarity_cannibalization', 'not_checked') as similarity_status,
  coalesce(d.qa_self_report->>'image_alt_truth', 'not_checked') as image_alt_status,
  d.created_at,
  d.updated_at,
  d.reviewed_at
from public.feya_commerce_seo_pack_drafts_v1 d
where d.archived_at is null
  and d.status in ('draft_generated', 'needs_human_review', 'changes_requested', 'approved_draft', 'needs_similarity_check', 'needs_image_alt_review')
order by d.updated_at desc;

revoke all on table public.feya_commerce_v_seo_pack_drafts_latest_v1 from anon, authenticated;
revoke all on table public.feya_commerce_v_seo_pack_review_queue_v1 from anon, authenticated;
grant select on table public.feya_commerce_v_seo_pack_drafts_latest_v1 to service_role;
grant select on table public.feya_commerce_v_seo_pack_review_queue_v1 to service_role;

-- ============================================================================
-- 5) Future RPC placeholders
-- ============================================================================
-- Do not expose direct client inserts.
-- Future server route should call a service-role-only RPC such as:
--   public.feya_commerce_fn_create_seo_pack_draft_v1(payload jsonb)
-- after app-side validator passes.
-- Keep this placeholder as a contract note until we intentionally enable writes.

-- ============================================================================
-- 6) Smoke checks after SQL review
-- ============================================================================
-- select * from public.feya_commerce_v_seo_pack_drafts_latest_v1 limit 5;
-- select * from public.feya_commerce_v_seo_pack_review_queue_v1 limit 5;
