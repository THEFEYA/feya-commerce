-- FEYA Commerce / TheFEYA
-- Deterministic Product Truth dictionary review v1
-- Applied to project ysnizcgzhdwdfdkjkhud on 2026-07-12.
--
-- Scope is intentionally narrow: these exact active 0.95-confidence labels
-- describe a bundle/whole-product option and are not physical components.
-- This patch does not infer or add any included component.

begin;

update public.feya_commerce_seo_component_phrase_map_v1
set
  needs_review = false,
  source_note = concat_ws(
    ' | ',
    nullif(source_note, ''),
    '2026-07-12 deterministic review: active 0.95-confidence bundle/whole-product label confirmed as non-component'
  ),
  updated_at = now()
where raw_phrase_norm in ('полный комплект', 'whole product')
  and active_flag is true
  and is_component is false
  and is_bundle_option is true
  and is_composite is false
  and confidence_score >= 0.95
  and needs_review is true;

update public.feya_commerce_seo_component_phrase_components_v1
set
  needs_review = false,
  source_note = concat_ws(
    ' | ',
    nullif(source_note, ''),
    '2026-07-12 deterministic review: active 0.95-confidence bundle/whole-product label confirmed as non-component'
  )
where phrase_component_id in (37, 38)
  and raw_phrase_norm in ('полный комплект', 'whole product')
  and active_flag is true
  and is_component is false
  and is_bundle_option is true
  and is_composite is false
  and confidence_score >= 0.95
  and needs_review is true;

commit;

-- Verified result after application:
-- 224 catalog occurrences were removed from mapping review without creating
-- component truth; review rows dropped from 874 to 650.
