-- Phase13 P1 collection additive source; DO NOT swap public reader in this PR.
-- Live parity checked for all 207 owner-approved records and all 31 source fields.
-- Frozen public collection H1/card titles stay sourced from the original Product
-- Draft. Shop/PDP pinned approved SEO content is not force-applied to collections.
-- Search Release v12 18 index owners / 207 PDP noindex, V13 UI and payments stay fixed.
create view public.feya_storefront_collection_cards_fast_v2
with (security_invoker=true) as
with full_sets as (
 select cp.canonical_product_id,
  min(cp.public_price_amount) filter (
    where coalesce(nullif(trim(both from spr.raw_option_value),''),
                   nullif(trim(both from sc.configuration_name),''),
                   '') ~* '(полный[[:space:]]*комплект|full[[:space:]]*set|complete[[:space:]]*set)'
  ) as full_set_display_price_amount
 from public.feya_commerce_configuration_prices cp
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
select v.canonical_product_id,v.product_slug,
 pd.matched_etsy_listing_id,pd.source_url,
 pd.card_title,pd.h1,pd.seo_title,pd.meta_description,
 v.product_type,v.material,v.color,
 pd.size_mode,pd.production_profile,pd.shipping_profile,
 pd.handmade_flag,pd.styled_imagery_flag,
 v.primary_image_url,v.primary_image_alt,v.secondary_image_url,v.hover_image_url,
 v.video_url,v.media_count,v.has_video,
 v.min_price,v.max_price,v.currency,
 fs.full_set_display_price_amount,
 v.category_label,v.world_label,v.canonical_color_label,v.color_options
from public.feya_storefront_product_cards_fast_v3 v
join public.feya_commerce_product_drafts pd
  on pd.canonical_product_id=v.canonical_product_id
left join full_sets fs
  on fs.canonical_product_id=v.canonical_product_id;

comment on view public.feya_storefront_collection_cards_fast_v2 is
 'Phase13 service-only collection V2 preserving exact 31 original collection card fields, dynamic current product draft labels and original Full Set price, with fast v3 approved media. No public reader cutover.';

revoke all on public.feya_storefront_collection_cards_fast_v2 from public,anon,authenticated,service_role;
grant select on public.feya_storefront_collection_cards_fast_v2 to service_role;

do $feya_p13_collection_v2$
declare
 old_count integer; new_count integer; new_unique integer;
 v2_only integer; old_only integer;
begin
 select count(*) into old_count from public.feya_storefront_collection_cards_fast_v1;
 select count(*) into new_count from public.feya_storefront_collection_cards_fast_v2;
 select count(distinct canonical_product_id) into new_unique from public.feya_storefront_collection_cards_fast_v2;
 if old_count<>207 or new_count<>207 or new_unique<>207 then
  raise exception 'FEYA_PHASE13_COLLECTION_V2_COUNT_PARITY_FAILED:%/%/%',old_count,new_count,new_unique;
 end if;
 select count(*) into v2_only from (
  select to_jsonb(v2) payload from public.feya_storefront_collection_cards_fast_v2 v2
  except
  select to_jsonb(v1) from public.feya_storefront_collection_cards_fast_v1 v1
 ) diff;
 select count(*) into old_only from (
  select to_jsonb(v1) payload from public.feya_storefront_collection_cards_fast_v1 v1
  except
  select to_jsonb(v2) from public.feya_storefront_collection_cards_fast_v2 v2
 ) diff;
 if v2_only<>0 or old_only<>0 then
  raise exception 'FEYA_PHASE13_COLLECTION_V2_FIELD_PARITY_FAILED:%/%',v2_only,old_only;
 end if;
 if has_table_privilege('anon','public.feya_storefront_collection_cards_fast_v2','select')
    or has_table_privilege('authenticated','public.feya_storefront_collection_cards_fast_v2','select')
    or not has_table_privilege('service_role','public.feya_storefront_collection_cards_fast_v2','select')
    or exists (
      select 1 from pg_class c
      cross join lateral aclexplode(c.relacl) a
      where c.oid='public.feya_storefront_collection_cards_fast_v2'::regclass
        and a.grantee=0 and a.privilege_type='SELECT'
    )
 then raise exception 'FEYA_PHASE13_COLLECTION_V2_ACL_FAILED';end if;
end
$feya_p13_collection_v2$;
