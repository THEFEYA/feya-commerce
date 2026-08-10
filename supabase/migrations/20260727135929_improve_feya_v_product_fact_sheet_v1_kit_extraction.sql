-- v1.1: broader deterministic extraction of the "what's in the kit" section
-- (KIT INCLUDES / SET INCLUDES / WHAT'S INCLUDED / INCLUDED:) + case-insensitive matching.
-- Still read-only; safe to drop.
create or replace view public.feya_v_product_fact_sheet_v1 as
with base as (
  select
    pd.canonical_product_id,
    pd.matched_etsy_listing_id,
    pd.card_title,
    pd.product_type,
    pd.material     as canonical_material,
    pd.color        as canonical_color,
    pd.handmade_flag,
    sl.raw_title,
    sl.raw_materials,
    sl.raw_variation_1_name,
    sl.raw_variation_1_values,
    sl.raw_variation_2_name,
    sl.raw_variation_2_values,
    sl.raw_description,
    (regexp_match(
       sl.raw_description,
       '(?:KIT INCLUDES|SET INCLUDES|WHAT''S INCLUDED|WHAT IS INCLUDED|INCLUDED):?\s*\n?(.*?)(\n\s*\n|$)',
       'is'
     ))[1] as kit_section_raw
  from public.feya_commerce_product_drafts pd
  left join public.feya_commerce_source_listings sl
    on sl.source_listing_id = pd.primary_source_listing_id
)
select
  b.canonical_product_id,
  b.matched_etsy_listing_id,
  b.card_title,
  b.product_type,
  b.canonical_material,
  b.canonical_color,
  b.handmade_flag,
  b.raw_title,
  b.raw_materials,
  b.raw_variation_1_name,
  b.raw_variation_1_values,
  b.raw_variation_2_name,
  b.raw_variation_2_values,
  nullif(btrim(b.kit_section_raw), '') as raw_kit_includes_section,
  (b.raw_description ilike '%adjustable strap%')                                             as fact_adjustable_straps,
  (b.raw_description ilike '%lightweight%')                                                  as fact_lightweight,
  (b.raw_description ilike '%handmade%')                                                     as fact_handmade,
  (b.raw_description ilike '%custom siz%' or b.raw_description ilike '%custom measurement%') as fact_custom_sizing,
  (b.raw_description ilike '%engrav%')                                                       as fact_engraving_option,
  (b.raw_description ilike '%rush order%')                                                   as fact_rush_orders,
  (b.raw_description ilike '%gift packag%' or b.raw_description ilike '%gift option%')       as fact_gift_packaging,
  (b.raw_description ilike '%buy the whole set or separately%'
   or b.raw_description ilike '%sold separately%')                                           as fact_pieces_sold_separately,
  b.raw_description,
  (
    select jsonb_agg(to_jsonb(a) - 'evidence_json')
    from public.feya_commerce_product_component_assertions_v1 a
    where a.canonical_product_id = b.canonical_product_id
      and a.active_flag = true
  ) as component_assertions
from base b;

comment on view public.feya_v_product_fact_sheet_v1 is
  'FEYA Human Copy v1.1: read-only per-product fact sheet assembled from the seller''s own Etsy source text, canonical draft fields and active component assertions. Fact flags and kit-section extraction are deterministic candidates for the SEO agent input; not auto-published, must pass existing guardrails/QA. Safe to drop.';
