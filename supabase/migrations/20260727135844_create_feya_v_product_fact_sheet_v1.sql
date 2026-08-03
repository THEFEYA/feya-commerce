-- FEYA fact sheet view v1 (read-only, add-only, reversible with: drop view public.feya_v_product_fact_sheet_v1)
-- Purpose: give the SEO generation pipeline confirmed buyer-facing facts extracted
-- deterministically from the seller's OWN Etsy listing text + human component assertions.
-- This view does NOT invent facts and does NOT modify any data.
create view public.feya_v_product_fact_sheet_v1 as
select
  pd.canonical_product_id,
  pd.matched_etsy_listing_id,
  pd.card_title,
  pd.product_type,
  pd.material            as canonical_material,
  pd.color               as canonical_color,
  pd.handmade_flag,
  sl.raw_title,
  sl.raw_materials,
  sl.raw_variation_1_name,
  sl.raw_variation_1_values,
  sl.raw_variation_2_name,
  sl.raw_variation_2_values,
  nullif(btrim(split_part(split_part(sl.raw_description, 'KIT INCLUDES:', 2), E'\n\n', 1)), '') as raw_kit_includes_section,
  -- deterministic fact flags found in the seller's own listing text (candidates; still subject to guardrails/QA)
  (sl.raw_description ilike '%adjustable strap%')                                              as fact_adjustable_straps,
  (sl.raw_description ilike '%lightweight%')                                                   as fact_lightweight,
  (sl.raw_description ilike '%handmade%')                                                      as fact_handmade,
  (sl.raw_description ilike '%custom siz%' or sl.raw_description ilike '%custom measurement%') as fact_custom_sizing,
  (sl.raw_description ilike '%engrav%')                                                        as fact_engraving_option,
  (sl.raw_description ilike '%rush order%')                                                    as fact_rush_orders,
  (sl.raw_description ilike '%gift packag%' or sl.raw_description ilike '%gift option%')       as fact_gift_packaging,
  (sl.raw_description ilike '%buy the whole set or separately%')                               as fact_pieces_sold_separately,
  sl.raw_description,
  (
    select jsonb_agg(to_jsonb(a) - 'evidence_json')
    from public.feya_commerce_product_component_assertions_v1 a
    where a.canonical_product_id = pd.canonical_product_id
      and a.active_flag = true
  ) as component_assertions
from public.feya_commerce_product_drafts pd
left join public.feya_commerce_source_listings sl
  on sl.source_listing_id = pd.primary_source_listing_id;

comment on view public.feya_v_product_fact_sheet_v1 is
  'FEYA Human Copy v1: read-only per-product fact sheet assembled from the seller''s own Etsy source text, canonical draft fields and active component assertions. Fact flags are deterministic candidates for the SEO agent input; they are not auto-published and must pass existing guardrails/QA. Safe to drop.';
