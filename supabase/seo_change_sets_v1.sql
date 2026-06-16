-- FEYA Commerce SEO Change Sets v1
-- Status: draft for Supabase SQL editor review
-- This migration creates an internal-only storage layer for pending SEO field changes.
-- It does not publish SEO content, update products, update sitemap, update feeds, or enable indexation.

create table if not exists public.feya_commerce_seo_change_sets (
  change_set_id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  canonical_product_id text null,
  source_event_id uuid null,
  source_route text not null default '/admin/seo-apply',
  target_field text not null check (target_field in (
    'seo_title',
    'meta_description',
    'h1',
    'primary_image_alt',
    'collection_hint',
    'description_outline'
  )),
  current_value text null,
  proposed_value text not null,
  reason text null,
  rule_pack_version text not null default 'manual_v1',
  template_pack_version text not null default 'template_v1',
  status text not null default 'pending' check (status in (
    'pending',
    'approved',
    'rejected',
    'applied',
    'superseded'
  )),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  applied_at timestamptz null
);

create index if not exists feya_commerce_seo_change_sets_product_slug_idx
  on public.feya_commerce_seo_change_sets(product_slug);

create index if not exists feya_commerce_seo_change_sets_status_idx
  on public.feya_commerce_seo_change_sets(status);

create or replace view public.feya_commerce_v_admin_seo_change_sets_v1 as
select
  change_set_id,
  product_slug,
  canonical_product_id,
  source_event_id,
  source_route,
  target_field,
  current_value,
  proposed_value,
  reason,
  rule_pack_version,
  template_pack_version,
  status,
  created_at,
  reviewed_at,
  applied_at
from public.feya_commerce_seo_change_sets;

alter table public.feya_commerce_seo_change_sets enable row level security;

revoke all on public.feya_commerce_seo_change_sets from anon;
revoke all on public.feya_commerce_seo_change_sets from authenticated;
revoke all on public.feya_commerce_v_admin_seo_change_sets_v1 from anon;
revoke all on public.feya_commerce_v_admin_seo_change_sets_v1 from authenticated;

comment on table public.feya_commerce_seo_change_sets is
  'Internal-only pending SEO field change sets. Does not publish SEO content or affect sitemap/feed/indexation by itself.';

comment on view public.feya_commerce_v_admin_seo_change_sets_v1 is
  'Internal admin view for SEO change set review queues.';
