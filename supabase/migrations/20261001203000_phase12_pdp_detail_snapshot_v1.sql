-- Phase 12 production hardening: materialize the exact 207-product PDP payload.
-- The prior view is semantically correct but expensive under concurrent crawler/PDP reads.
-- This migration captures the already-approved corpus once, then keeps only lightweight
-- governance joins on each request. It does not change index state, pricing, checkout or UI.

begin;

set local statement_timeout='120s';

create table if not exists public.feya_storefront_product_detail_snapshots_v1(
  canonical_product_id uuid primary key,
  seo_page_id uuid not null unique,
  source_draft_id uuid not null unique,
  approved_content_sha256 text not null check(approved_content_sha256~'^[0-9a-f]{64}$'),
  source_release_ref text not null,
  url_path_snapshot text not null unique,
  product_slug text not null unique,
  product_json jsonb not null check(jsonb_typeof(product_json)='object'),
  created_at timestamptz not null default now(),
  check(source_release_ref='feya-review-207-20260924')
);

insert into public.feya_storefront_product_detail_snapshots_v1(
  canonical_product_id,seo_page_id,source_draft_id,approved_content_sha256,
  source_release_ref,url_path_snapshot,product_slug,product_json
)
select
  canonical_product_id,seo_page_id,source_draft_id,approved_content_sha256,
  source_release_ref,url_path_snapshot,product_slug,product_json
from public.feya_storefront_product_details_v1
on conflict (canonical_product_id) do update set
  seo_page_id=excluded.seo_page_id,
  source_draft_id=excluded.source_draft_id,
  approved_content_sha256=excluded.approved_content_sha256,
  source_release_ref=excluded.source_release_ref,
  url_path_snapshot=excluded.url_path_snapshot,
  product_slug=excluded.product_slug,
  product_json=excluded.product_json;

do $$
declare
  v_count integer;
  v_distinct integer;
  v_missing_gallery integer;
  v_missing_configs integer;
begin
  select
    count(*),
    count(distinct canonical_product_id),
    count(*) filter (
      where coalesce(jsonb_array_length(coalesce(product_json->'media_gallery','[]'::jsonb)),0)=0
    ),
    count(*) filter (
      where coalesce(jsonb_array_length(coalesce(product_json->'configurations','[]'::jsonb)),0)=0
    )
  into v_count,v_distinct,v_missing_gallery,v_missing_configs
  from public.feya_storefront_product_detail_snapshots_v1;

  if v_count<>207 or v_distinct<>207 then
    raise exception 'FEYA_DETAIL_SNAPSHOT_COUNT_MISMATCH:%/%',v_count,v_distinct;
  end if;
  if v_missing_gallery<>0 then
    raise exception 'FEYA_DETAIL_SNAPSHOT_MISSING_GALLERY:%',v_missing_gallery;
  end if;
  if v_missing_configs<>0 then
    raise exception 'FEYA_DETAIL_SNAPSHOT_MISSING_CONFIGURATIONS:%',v_missing_configs;
  end if;
end $$;

create or replace view public.feya_storefront_product_details_v1
with (security_invoker=true) as
select
  s.canonical_product_id,
  s.seo_page_id,
  s.source_draft_id,
  s.approved_content_sha256,
  s.source_release_ref,
  s.url_path_snapshot,
  s.product_slug,
  s.product_json
from public.feya_storefront_product_detail_snapshots_v1 s
join public.feya_storefront_approved_product_bindings_v1 b
  on b.canonical_product_id=s.canonical_product_id
 and b.seo_page_id=s.seo_page_id
 and b.draft_id=s.source_draft_id
 and b.content_sha256=s.approved_content_sha256
 and b.source_release_ref=s.source_release_ref
 and b.url_path_snapshot=s.url_path_snapshot
 and b.product_slug_snapshot=s.product_slug
join public.feya_commerce_seo_pack_drafts_v1 d
  on d.id=s.source_draft_id
 and d.canonical_product_id=s.canonical_product_id
 and d.status='approved_draft'
 and d.review_status='approved'
 and d.archived_at is null
 and d.updated_at=b.draft_updated_at_snapshot
join public.feya_commerce_seo_pages_v1 sp
  on sp.seo_page_id=s.seo_page_id
 and sp.canonical_product_id=s.canonical_product_id
 and sp.page_type='product'
 and sp.portfolio_status='active'
 and sp.lifecycle_state not in ('retired','archived','deleted')
 and sp.url_path=s.url_path_snapshot
join public.feya_commerce_product_drafts pd
  on pd.canonical_product_id=s.canonical_product_id
 and coalesce(pd.do_not_publish_flag,false)=false
where s.source_release_ref='feya-review-207-20260924';

comment on table public.feya_storefront_product_detail_snapshots_v1 is
  'Immutable materialized PDP payload for the exact 207-product owner-approved storefront corpus. Runtime governance remains fail-closed through feya_storefront_product_details_v1.';

comment on view public.feya_storefront_product_details_v1 is
  'Server-only governed PDP reader over the immutable 207-product detail snapshot; approval/path/hold drift removes rows without rebuilding heavyweight commerce/media views.';

revoke all on public.feya_storefront_product_detail_snapshots_v1 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_product_detail_snapshots_v1 to service_role;

revoke all on public.feya_storefront_product_details_v1 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_product_details_v1 to service_role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.feya_storefront_product_details_v1;
  if v_count<>207 then
    raise exception 'FEYA_GOVERNED_DETAIL_VIEW_COUNT_MISMATCH:%',v_count;
  end if;
end $$;

notify pgrst,'reload schema';

commit;
