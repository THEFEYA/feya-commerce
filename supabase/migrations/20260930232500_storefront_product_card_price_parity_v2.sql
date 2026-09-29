-- Correct card price projection to match lib/storefront.ts exactly enough for the
-- approved release: dedupe configurations by normalized label using the highest price,
-- then prefer a full-set label/flag; otherwise use the highest remaining configuration.

create or replace view public.feya_storefront_product_cards_v1 as
with membership_labeled as (
  select
    mi.canonical_product_id,
    case p.url_path
      when '/collections/shoulder-armor' then 'SHOULDER_ARMOR'
      when '/collections/festival-outfits' then 'FESTIVAL_OUTFITS'
      when '/collections/rave-outfits' then 'RAVE_OUTFITS'
      when '/collections/burning-man-looks' then 'BURNING_MAN_OUTFITS'
      when '/collections/stage-outfits' then 'PERFORMANCE_COSTUMES'
      when '/collections/bodysuits' then 'COSTUME_BODYSUITS'
      when '/collections/costume-masks' then 'COSTUME_MASKS'
      when '/collections/costume-headpieces' then 'COSTUME_HEADPIECES'
      when '/collections/festival-skirts' then 'FESTIVAL_SKIRTS'
      when '/collections/costume-belts' then 'COSTUME_BELTS'
      else null
    end as membership_code
  from public.feya_search_membership_items_v1 mi
  join public.feya_search_membership_snapshots_v1 ms
    on ms.membership_snapshot_id=mi.membership_snapshot_id
  join public.feya_commerce_seo_pages_v1 p
    on p.seo_page_id=ms.seo_page_id
  where ms.source_revision='feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926'
    and mi.eligibility_status='eligible'
    and mi.orderability_status='confirmed'
),
membership_codes as (
  select canonical_product_id,
         array_agg(distinct membership_code order by membership_code)
           filter (where membership_code is not null) as membership_codes
  from membership_labeled
  group by canonical_product_id
),
facet_meta as (
  select facet_snapshot_id,facet_contract_version,snapshot_hash,product_count
  from public.feya_storefront_facet_snapshots_v1
  where snapshot_code='feya-n7-20260928-v3'
    and snapshot_status='PREVIEW'
),
base as (
  select
    b.canonical_product_id,
    b.seo_page_id,
    b.draft_id as source_draft_id,
    b.content_sha256 as approved_content_sha256,
    b.source_release_ref,
    p.product_slug,
    d.h1 as card_title,
    d.h1,
    d.seo_title,
    d.meta_description,
    p.product_type,
    p.material,
    p.color,
    p.currency,
    p.primary_image_url,
    p.primary_image_alt,
    p.secondary_image_url,
    p.hover_image_url,
    p.video_url,
    p.has_video,
    p.media_count,
    p.min_price,
    p.max_price,
    p.full_set_display_price_amount,
    p.category_label,
    p.world_label,
    p.canonical_color_label,
    p.color_options,
    p.configurations,
    fi.parent_components_json,
    fi.child_components_json,
    fi.component_groups_json,
    fi.component_values_json,
    fi.sellable_component_values_json,
    fi.event_values_json,
    fi.style_values_json,
    fi.persona_values_json,
    fi.audience_values_json,
    fi.material_values_json,
    fm.facet_contract_version,
    fm.snapshot_hash as facet_snapshot_hash,
    coalesce(mc.membership_codes, array[]::text[]) as membership_codes
  from public.feya_storefront_approved_product_bindings_v1 b
  join public.feya_commerce_v_step7_storefront_products_api_v4 p
    on p.canonical_product_id=b.canonical_product_id
   and p.product_slug=b.product_slug_snapshot
  join public.feya_commerce_seo_pack_drafts_v1 d
    on d.id=b.draft_id
   and d.canonical_product_id=b.canonical_product_id
   and d.status='approved_draft'
   and d.review_status='approved'
   and d.archived_at is null
  cross join facet_meta fm
  join public.feya_storefront_facet_items_v1 fi
    on fi.facet_snapshot_id=fm.facet_snapshot_id
   and fi.canonical_product_id=b.canonical_product_id
  left join membership_codes mc
    on mc.canonical_product_id=b.canonical_product_id
)
select
  b.canonical_product_id,
  b.seo_page_id,
  b.source_draft_id,
  b.approved_content_sha256,
  b.source_release_ref,
  b.product_slug,
  b.card_title,
  b.h1,
  b.seo_title,
  b.meta_description,
  b.product_type,
  b.material,
  b.color,
  b.currency,
  b.primary_image_url,
  b.primary_image_alt,
  b.secondary_image_url,
  b.hover_image_url,
  b.video_url,
  b.has_video,
  b.media_count,
  b.min_price,
  b.max_price,
  price.card_display_price_amount,
  b.category_label,
  b.world_label,
  b.canonical_color_label,
  b.color_options,
  b.parent_components_json,
  b.child_components_json,
  b.component_groups_json,
  b.component_values_json,
  b.sellable_component_values_json,
  b.event_values_json,
  b.style_values_json,
  b.persona_values_json,
  b.audience_values_json,
  b.material_values_json,
  b.membership_codes,
  b.facet_contract_version,
  b.facet_snapshot_hash
from base b
left join lateral (
  with config_rows as (
    select
      coalesce(e->>'public_label',e->>'configuration_label',e->>'configuration_name',
               e->>'option_value',e->>'title',e->>'label','') as label_text,
      regexp_replace(
        lower(coalesce(e->>'public_label',e->>'configuration_label',e->>'configuration_name',
                       e->>'option_value',e->>'title',e->>'label','')),
        '[^a-z0-9]+',' ','g'
      ) as label_norm,
      coalesce(nullif(e->>'sort_order','')::integer,0) as sort_order,
      coalesce(nullif(e->>'is_full_set','')::boolean,false) as is_full_set,
      coalesce(
        nullif(e->>'display_price_amount','')::numeric,
        nullif(e->>'sale_price_amount','')::numeric,
        nullif(e->>'base_price_amount','')::numeric,
        nullif(e->>'price_amount','')::numeric,
        nullif(e->>'price','')::numeric,
        nullif(e->>'amount','')::numeric,
        nullif(e->>'min_price','')::numeric,
        nullif(e->>'max_price','')::numeric
      ) as option_price
    from jsonb_array_elements(coalesce(b.configurations,'[]'::jsonb)) e
  ),
  dedup as (
    select distinct on (label_norm)
      label_text,label_norm,sort_order,is_full_set,option_price
    from config_rows
    order by label_norm,option_price desc nulls last
  ),
  chosen as (
    select option_price
    from dedup
    where is_full_set
       or lower(label_text) ~ '(full[[:space:]]*set|complete[[:space:]]*set|complete[[:space:]]*look)'
    order by sort_order,option_price asc nulls last
    limit 1
  )
  select coalesce(
    (select option_price from chosen),
    (select max(option_price) from dedup),
    b.full_set_display_price_amount,
    b.max_price,
    b.min_price
  ) as card_display_price_amount
) price on true;

revoke all on public.feya_storefront_product_cards_v1 from public, anon, authenticated;
grant select on public.feya_storefront_product_cards_v1 to service_role;

do $$
declare
  v_count integer;
  v_missing_price integer;
begin
  select count(*),count(*) filter(where card_display_price_amount is null)
  into v_count,v_missing_price
  from public.feya_storefront_product_cards_v1;
  if v_count<>207 then raise exception 'FEYA_CARD_READ_MODEL_COUNT_MISMATCH:%',v_count; end if;
  if v_missing_price<>0 then raise exception 'FEYA_CARD_READ_MODEL_MISSING_PRICE:%',v_missing_price; end if;
end $$;
