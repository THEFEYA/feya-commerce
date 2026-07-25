-- FEYA Commerce Product Truth v4
--
-- A human-confirmed canonical_listing composition is sufficient evidence for
-- the SEO page entity. Import/mapping defects that belong to individual
-- sellable configurations remain auditable in variant_review_facts, but they
-- no longer block keyword selection or copy generation for the whole listing.

create or replace view public.feya_commerce_v_seo_product_truth_v4
with (security_invoker = on)
as
with classified as (
  select
    v3.*,
    jsonb_array_length(
      coalesce(v3.component_evidence -> 'listing_composition_assertions', '[]'::jsonb)
    ) > 0 as has_confirmed_listing_composition,
    coalesce(
      (
        select jsonb_agg(fact order by ordinal_position)
        from jsonb_array_elements(coalesce(v3.unresolved_component_facts, '[]'::jsonb))
          with ordinality as facts(fact, ordinal_position)
        where not (
          jsonb_array_length(
            coalesce(v3.component_evidence -> 'listing_composition_assertions', '[]'::jsonb)
          ) > 0
          and (
            fact ->> 'option_mapping_id' is not null
            or fact ->> 'fact_type' = 'component_not_unconditional_across_configurations'
          )
        )
      ),
      '[]'::jsonb
    ) as seo_unresolved_component_facts,
    coalesce(
      (
        select jsonb_agg(blocker order by ordinal_position)
        from jsonb_array_elements(coalesce(v3.component_review_blockers_json, '[]'::jsonb))
          with ordinality as blockers(blocker, ordinal_position)
        where not (
          jsonb_array_length(
            coalesce(v3.component_evidence -> 'listing_composition_assertions', '[]'::jsonb)
          ) > 0
          and (
            blocker ->> 'option_mapping_id' is not null
            or blocker ->> 'reason' = 'component_not_unconditional_across_configurations'
          )
        )
      ),
      '[]'::jsonb
    ) as seo_component_review_blockers,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'source', 'listing_composition_variant_audit',
            'evidence', fact
          )
          order by ordinal_position
        )
        from jsonb_array_elements(coalesce(v3.unresolved_component_facts, '[]'::jsonb))
          with ordinality as facts(fact, ordinal_position)
        where jsonb_array_length(
            coalesce(v3.component_evidence -> 'listing_composition_assertions', '[]'::jsonb)
          ) > 0
          and (
            fact ->> 'option_mapping_id' is not null
            or fact ->> 'fact_type' = 'component_not_unconditional_across_configurations'
          )
      ),
      '[]'::jsonb
    ) || coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'source', 'listing_composition_variant_audit',
            'evidence', blocker
          )
          order by ordinal_position
        )
        from jsonb_array_elements(coalesce(v3.component_review_blockers_json, '[]'::jsonb))
          with ordinality as blockers(blocker, ordinal_position)
        where jsonb_array_length(
            coalesce(v3.component_evidence -> 'listing_composition_assertions', '[]'::jsonb)
          ) > 0
          and (
            blocker ->> 'option_mapping_id' is not null
            or blocker ->> 'reason' = 'component_not_unconditional_across_configurations'
          )
      ),
      '[]'::jsonb
    ) as moved_variant_review_facts
  from public.feya_commerce_v_seo_product_truth_v3 v3
)
select
  c.canonical_product_id,
  c.matched_etsy_listing_id,
  c.product_slug,
  c.card_title,
  c.h1,
  c.seo_title,
  c.meta_description,
  c.product_type,
  c.material,
  c.color,
  c.canonical_color_label,
  c.category_label,
  c.source_category_label,
  c.operator_section_label,
  c.world_label,
  c.primary_image_url,
  c.primary_image_alt,
  c.parent_components_json,
  c.child_components_json,
  c.component_groups_json,
  jsonb_array_length(c.seo_component_review_blockers) as needs_component_review_count,
  (
    jsonb_array_length(c.seo_component_review_blockers) > 0
    or jsonb_array_length(c.seo_unresolved_component_facts) > 0
  ) as has_component_review_risk,
  c.focus_text,
  c.included_components,
  c.optional_configurations,
  c.available_variants,
  c.known_non_components,
  c.seo_unresolved_component_facts as unresolved_component_facts,
  c.seo_component_review_blockers as component_review_blockers_json,
  coalesce(c.component_evidence, '{}'::jsonb) || jsonb_build_object(
    'product_truth_contract_version', 'v4',
    'seo_listing_composition_confirmed', c.has_confirmed_listing_composition,
    'variant_review_facts', coalesce(c.variant_review_facts, '[]'::jsonb)
      || c.moved_variant_review_facts,
    'seo_gate_policy', jsonb_build_object(
      'canonical_listing_confirmation', 'satisfies SEO page-entity composition',
      'sellable_configuration_review', 'auditable separately and never promoted to product copy'
    )
  ) as component_evidence,
  c.source_description_fragment,
  c.source_variations_json,
  c.option_price_rows_json,
  coalesce(c.variant_review_facts, '[]'::jsonb)
    || c.moved_variant_review_facts as variant_review_facts
from classified c;

comment on view public.feya_commerce_v_seo_product_truth_v4 is
  'Canonical Product Truth v4: human-confirmed listing composition gates SEO while configuration-level import defects remain separately auditable.';

revoke all on public.feya_commerce_v_seo_product_truth_v4 from public;
revoke all on public.feya_commerce_v_seo_product_truth_v4 from anon;
revoke all on public.feya_commerce_v_seo_product_truth_v4 from authenticated;
revoke all on public.feya_commerce_v_seo_product_truth_v4 from service_role;
grant select on public.feya_commerce_v_seo_product_truth_v4 to service_role;
