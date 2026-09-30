-- Additive audit ledger for storefront cache invalidation requests.
-- No cache is enabled by this migration.

create table if not exists public.feya_storefront_cache_invalidations_v1 (
  invalidation_id uuid primary key,
  request_key text not null unique,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  tags_json jsonb not null,
  paths_json jsonb not null,
  source_type text not null,
  source_ref text,
  delivery_mode text not null,
  delivery_status text not null,
  error_code text,
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint feya_storefront_cache_invalidations_event_ck check (
    event_type in (
      'product_changed','product_media_changed','product_slug_changed','product_unpublished',
      'collection_membership_changed','collection_content_changed','landing_page_changed',
      'policy_changed','home_content_changed','global_content_changed'
    )
  ),
  constraint feya_storefront_cache_invalidations_entity_ck check (
    entity_type in ('product','collection','page','policy','home','global')
  ),
  constraint feya_storefront_cache_invalidations_source_ck check (
    source_type in ('internal_api','admin_server_action')
  ),
  constraint feya_storefront_cache_invalidations_delivery_ck check (
    delivery_mode in ('revalidate_tag_max','update_tag')
  ),
  constraint feya_storefront_cache_invalidations_status_ck check (
    delivery_status in ('accepted','delivered','failed')
  ),
  constraint feya_storefront_cache_invalidations_tags_array_ck check (jsonb_typeof(tags_json)='array'),
  constraint feya_storefront_cache_invalidations_paths_array_ck check (jsonb_typeof(paths_json)='array')
);

create index if not exists feya_storefront_cache_invalidations_requested_idx
  on public.feya_storefront_cache_invalidations_v1(requested_at desc);

create index if not exists feya_storefront_cache_invalidations_entity_idx
  on public.feya_storefront_cache_invalidations_v1(entity_type,entity_id,requested_at desc);

revoke all on public.feya_storefront_cache_invalidations_v1 from public,anon,authenticated;
grant select,insert,update on public.feya_storefront_cache_invalidations_v1 to service_role;

comment on table public.feya_storefront_cache_invalidations_v1 is
  'Audit ledger for storefront cache invalidation. Does not itself enable caching.';
