-- Phase13 P1: additive, service-role-only fast collection presentation.
-- Does NOT replace any current public read, payment quote or approved release.
-- The legacy v4 CTE expands the full catalog for one collection. Preserve its
-- customer-facing card fields with a pinned snapshot + v2 baseline + a focused
-- Full Set price aggregation. No changed titles, options, source prices or media.

create view public.feya_storefront_collection_cards_fast_v1
with (security_invoker=true) as
with pinned as (
  select s.*
  from public.feya_storefront_product_card_snapshots_v1 s
  join public.feya_storefront_approved_product_bindings_v1 b
    on b.canonical_product_id=s.canonical_product_id
   and b.seo_page_id=s.seo_page_id
   and b.draft_id=s.draft_id
   and b.content_sha256=s.content_sha256
   and b.product_slug_snapshot=s.product_slug
  join public.feya_commerce_seo_pack_drafts_v1 d
    on d.id=s.draft_id
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
   and sp.url_path=b.url_path_snapshot
  join public.feya_commerce_product_drafts pd
    on pd.canonical_product_id=s.canonical_product_id
   and coalesce(pd.do_not_publish_flag,false)=false
  where s.source_release_ref='feya-review-207-20260924'
),
full_sets as (
  select cp.canonical_product_id,
    min(cp.public_price_amount) filter (
      where coalesce(
        nullif(trim(spr.raw_option_value),''),
        nullif(trim(sc.configuration_name),''),
        ''
      ) ~* '(полный[[:space:]]*комплект|full[[:space:]]*set|complete[[:space:]]*set)'
    ) as full_set_display_price_amount
  from public.feya_commerce_configuration_prices cp
  join pinned p on p.canonical_product_id=cp.canonical_product_id
  left join public.feya_commerce_sellable_configurations sc
    on sc.sellable_configuration_id=cp.sellable_configuration_id
  left join public.feya_commerce_source_price_rows spr
    on spr.source_price_row_id=cp.source_price_row_id
  where cp.public_price_amount is not null
    and coalesce(cp.sampler_excluded_flag,false)=false
    and coalesce(cp.fallback_flag,false)=false
    and coalesce(spr.fallback_flag,false)=false
    and coalesce(spr.sampler_non_catalog_flag,false)=false
  group by cp.canonical_product_id
)
select
  v2.canonical_product_id,
  v2.product_slug,
  v2.matched_etsy_listing_id,
  v2.source_url,
  v2.card_title,
  v2.h1,
  v2.seo_title,
  v2.meta_description,
  v2.product_type,
  v2.material,
  v2.color,
  v2.size_mode,
  v2.production_profile,
  v2.shipping_profile,
  v2.handmade_flag,
  v2.styled_imagery_flag,
  p.primary_image_url,
  p.primary_image_alt,
  p.secondary_image_url,
  p.hover_image_url,
  p.video_url,
  p.media_count,
  p.has_video,
  v2.min_price,
  v2.max_price,
  v2.currency,
  fs.full_set_display_price_amount,
  p.category_label,
  p.world_label,
  p.canonical_color_label,
  p.color_options
from pinned p
join public.feya_commerce_v_step7_storefront_products_api_v2 v2
  on v2.canonical_product_id=p.canonical_product_id
 and v2.product_slug=p.product_slug
left join full_sets fs on fs.canonical_product_id=p.canonical_product_id;

comment on view public.feya_storefront_collection_cards_fast_v1 is
 'Service-only 207-card Phase13 collection candidate: unchanged approved identity plus live v2 title/price and exact existing Full Set classification. NOT a public release or payable offer.';

revoke all on public.feya_storefront_collection_cards_fast_v1 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_collection_cards_fast_v1 to service_role;

do $feya_phase13$
declare
  actual_count int;
  actual_distinct int;
  missing_required int;
begin
  select count(*),count(distinct canonical_product_id),
    count(*) filter (
      where not (canonical_product_id is not null
                 and product_slug is not null and card_title is not null
                 and primary_image_url is not null
                 and currency='EUR')
    )
    into actual_count,actual_distinct,missing_required
  from public.feya_storefront_collection_cards_fast_v1;
  if actual_count<>207 or actual_distinct<>207 or missing_required<>0 then
    raise exception 'FEYA_PHASE13_FAST_COLLECTION_READ_INVALID:%/%/%',
      actual_count,actual_distinct,missing_required;
  end if;
end
$feya_phase13$;
