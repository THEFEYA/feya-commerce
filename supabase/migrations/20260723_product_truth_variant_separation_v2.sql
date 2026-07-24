-- FEYA Commerce Product Truth v2
--
-- Purpose:
-- 1. Keep size/color/not_product_axis review evidence auditable without treating
--    it as unresolved product composition.
-- 2. Add one explicit, human-reviewed authority for a component that is always
--    included with the product.
-- 3. Preserve the applied v1 view for comparison and rollback.

create table if not exists public.feya_commerce_product_component_assertions_v1 (
  product_component_assertion_id uuid primary key default gen_random_uuid(),
  canonical_product_id uuid not null
    references public.feya_commerce_product_drafts(canonical_product_id)
    on delete cascade,
  component_family_id uuid not null
    references public.feya_commerce_component_families(component_family_id),
  presence_scope text not null default 'fixed_base'
    check (presence_scope in ('fixed_base')),
  evidence_source text not null default 'manual_admin_review'
    check (evidence_source in ('manual_admin_review')),
  evidence_json jsonb not null default '{}'::jsonb,
  review_status text not null default 'not_reviewed'
    check (review_status in ('not_reviewed', 'needs_review', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  active_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_product_id, component_family_id, presence_scope),
  check (
    review_status <> 'approved'
    or (active_flag is true and reviewed_at is not null and nullif(btrim(reviewed_by), '') is not null)
  )
);

comment on table public.feya_commerce_product_component_assertions_v1 is
  'Explicit human-reviewed fixed product composition. Focus chips, keywords, source titles and images may support review but never create an approved assertion automatically.';

create index if not exists feya_commerce_product_component_assertions_v1_product_idx
  on public.feya_commerce_product_component_assertions_v1(canonical_product_id)
  where active_flag is true;

alter table public.feya_commerce_product_component_assertions_v1 enable row level security;
revoke all on public.feya_commerce_product_component_assertions_v1 from public;
revoke all on public.feya_commerce_product_component_assertions_v1 from anon;
revoke all on public.feya_commerce_product_component_assertions_v1 from authenticated;
grant all on public.feya_commerce_product_component_assertions_v1 to service_role;

create or replace view public.feya_commerce_v_seo_product_truth_v2
with (security_invoker = on)
as
with approved_assertion_rows as (
  select
    a.canonical_product_id,
    a.product_component_assertion_id,
    a.component_family_id,
    cf.canonical_name as component_family,
    cf.normalized_name as normalized_component_family,
    a.presence_scope,
    a.evidence_source,
    a.evidence_json,
    a.review_status,
    a.reviewed_at,
    a.reviewed_by,
    a.review_note
  from public.feya_commerce_product_component_assertions_v1 a
  join public.feya_commerce_component_families cf
    on cf.component_family_id = a.component_family_id
  where a.active_flag is true
    and a.review_status = 'approved'
    and a.presence_scope = 'fixed_base'
),
approved_assertion_agg as (
  select
    aar.canonical_product_id,
    jsonb_agg(
      jsonb_build_object(
        'product_component_assertion_id', aar.product_component_assertion_id,
        'component_family_id', aar.component_family_id,
        'component_family', aar.component_family,
        'normalized_component_family', aar.normalized_component_family,
        'presence_scope', aar.presence_scope,
        'evidence_source', aar.evidence_source,
        'evidence_json', aar.evidence_json,
        'review_status', aar.review_status,
        'reviewed_at', aar.reviewed_at,
        'reviewed_by', aar.reviewed_by,
        'review_note', aar.review_note
      )
      order by aar.component_family
    ) as fixed_base_assertions
  from approved_assertion_rows aar
  group by aar.canonical_product_id
),
base as (
  select
    v1.*,
    coalesce(aaa.fixed_base_assertions, '[]'::jsonb) as fixed_base_assertions
  from public.feya_commerce_v_seo_product_truth_v1 v1
  left join approved_assertion_agg aaa
    on aaa.canonical_product_id = v1.canonical_product_id
),
normalized as (
  select
    b.*,
    coalesce(included.included_components, '[]'::jsonb) as normalized_included_components,
    coalesce(unresolved.component_facts, '[]'::jsonb) as normalized_unresolved_component_facts,
    coalesce(blockers.component_blockers, '[]'::jsonb) as normalized_component_review_blockers,
    coalesce(blockers.variant_facts, '[]'::jsonb)
      || coalesce(unresolved.variant_facts, '[]'::jsonb) as variant_review_facts
  from base b
  left join lateral (
    select jsonb_agg(to_jsonb(component_family) order by component_family) as included_components
    from (
      select distinct existing_component.component_family
      from jsonb_array_elements_text(coalesce(b.included_components, '[]'::jsonb))
        as existing_component(component_family)
      union
      select distinct assertion_item ->> 'component_family'
      from jsonb_array_elements(coalesce(b.fixed_base_assertions, '[]'::jsonb)) assertion_item
      where nullif(btrim(assertion_item ->> 'component_family'), '') is not null
    ) names
  ) included on true
  left join lateral (
    select
      coalesce(
        jsonb_agg(fact_json order by ordinal_position)
          filter (where keep_as_component_fact),
        '[]'::jsonb
      ) as component_facts,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'source', 'unresolved_component_facts',
            'detected_canonical_axis', detected_canonical_axis,
            'evidence', fact_json
          )
          order by ordinal_position
        ) filter (where is_non_component_variant_fact),
        '[]'::jsonb
      ) as variant_facts
    from (
      select
        facts.fact_json,
        facts.ordinal_position,
        om.detected_canonical_axis,
        (
          facts.fact_json ->> 'option_mapping_id' is not null
          and om.option_mapping_id is not null
          and om.detected_canonical_axis in ('size', 'color', 'not_product_axis')
        ) as is_non_component_variant_fact,
        case
          when facts.fact_json ->> 'option_mapping_id' is not null
            and om.option_mapping_id is not null
            and om.detected_canonical_axis in ('size', 'color', 'not_product_axis')
            then false
          when facts.fact_json ->> 'fact_type' = 'component_not_unconditional_across_configurations'
            and exists (
              select 1
              from approved_assertion_rows aar
              where aar.canonical_product_id = b.canonical_product_id
                and lower(aar.component_family) = lower(facts.fact_json ->> 'component_family')
            )
            then false
          else true
        end as keep_as_component_fact
      from jsonb_array_elements(coalesce(b.unresolved_component_facts, '[]'::jsonb))
        with ordinality as facts(fact_json, ordinal_position)
      left join public.feya_commerce_option_mappings om
        on om.option_mapping_id::text = facts.fact_json ->> 'option_mapping_id'
    ) classified
  ) unresolved on true
  left join lateral (
    select
      coalesce(
        jsonb_agg(blocker_json order by ordinal_position)
          filter (where keep_as_component_blocker),
        '[]'::jsonb
      ) as component_blockers,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'source', 'component_review_blockers_json',
            'detected_canonical_axis', detected_canonical_axis,
            'evidence', blocker_json
          )
          order by ordinal_position
        ) filter (where is_non_component_variant_fact),
        '[]'::jsonb
      ) as variant_facts
    from (
      select
        blockers.blocker_json,
        blockers.ordinal_position,
        om.detected_canonical_axis,
        (
          blockers.blocker_json ->> 'option_mapping_id' is not null
          and om.option_mapping_id is not null
          and om.detected_canonical_axis in ('size', 'color', 'not_product_axis')
        ) as is_non_component_variant_fact,
        case
          when blockers.blocker_json ->> 'option_mapping_id' is not null
            and om.option_mapping_id is not null
            and om.detected_canonical_axis in ('size', 'color', 'not_product_axis')
            then false
          when blockers.blocker_json ->> 'reason' = 'product_focus_components_empty'
            and jsonb_array_length(b.fixed_base_assertions) > 0
            then false
          when blockers.blocker_json ->> 'reason' = 'component_not_unconditional_across_configurations'
            and exists (
              select 1
              from approved_assertion_rows aar
              where aar.canonical_product_id = b.canonical_product_id
                and lower(aar.component_family) = lower(blockers.blocker_json ->> 'component_family')
            )
            then false
          else true
        end as keep_as_component_blocker
      from jsonb_array_elements(coalesce(b.component_review_blockers_json, '[]'::jsonb))
        with ordinality as blockers(blocker_json, ordinal_position)
      left join public.feya_commerce_option_mappings om
        on om.option_mapping_id::text = blockers.blocker_json ->> 'option_mapping_id'
    ) classified
  ) blockers on true
)
select
  n.canonical_product_id,
  n.matched_etsy_listing_id,
  n.product_slug,
  n.card_title,
  n.h1,
  n.seo_title,
  n.meta_description,
  n.product_type,
  n.material,
  n.color,
  n.canonical_color_label,
  n.category_label,
  n.source_category_label,
  n.operator_section_label,
  n.world_label,
  n.primary_image_url,
  n.primary_image_alt,
  n.parent_components_json,
  n.child_components_json,
  n.component_groups_json,
  jsonb_array_length(n.normalized_component_review_blockers) as needs_component_review_count,
  (
    jsonb_array_length(n.normalized_component_review_blockers) > 0
    or jsonb_array_length(n.normalized_unresolved_component_facts) > 0
  ) as has_component_review_risk,
  n.focus_text,
  n.normalized_included_components as included_components,
  n.optional_configurations,
  n.available_variants,
  n.known_non_components,
  n.normalized_unresolved_component_facts as unresolved_component_facts,
  n.normalized_component_review_blockers as component_review_blockers_json,
  coalesce(n.component_evidence, '{}'::jsonb) || jsonb_build_object(
    'product_truth_contract_version', 'v2',
    'fixed_base_evidence_available', jsonb_array_length(n.fixed_base_assertions) > 0,
    'fixed_base_assertions', n.fixed_base_assertions,
    'variant_review_facts', n.variant_review_facts,
    'variant_component_separation_policy', jsonb_build_object(
      'non_component_axes', jsonb_build_array('size', 'color', 'not_product_axis'),
      'unknown_axis_policy', 'fail_closed_as_component_review'
    )
  ) as component_evidence,
  n.source_description_fragment,
  n.source_variations_json,
  n.option_price_rows_json,
  n.variant_review_facts
from normalized n;

comment on view public.feya_commerce_v_seo_product_truth_v2 is
  'Canonical Product Truth v2: v1 evidence plus explicit fixed-base assertions and separation of size/color review from composition blockers.';

revoke all on public.feya_commerce_v_seo_product_truth_v2 from public;
revoke all on public.feya_commerce_v_seo_product_truth_v2 from anon;
revoke all on public.feya_commerce_v_seo_product_truth_v2 from authenticated;
revoke all on public.feya_commerce_v_seo_product_truth_v2 from service_role;
grant select on public.feya_commerce_v_seo_product_truth_v2 to service_role;
