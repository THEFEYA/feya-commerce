-- Canonical limb axes for Listing Master and SEO generation.
--
-- Exact purchase labels remain distinct (for example one versus two leg
-- covers), while every arm-region option maps to the `arms` SEO axis and
-- every leg-region option maps to `legs`. The public storefront continues to
-- read v4; v5 is an admin/SEO read contract.

insert into public.feya_commerce_component_families (
  canonical_name,
  normalized_name,
  component_group,
  public_sort_order,
  active_flag,
  is_default_whole_product,
  notes
)
values
  (
    'Arms',
    'arms',
    'Arms',
    100,
    true,
    false,
    'Canonical SEO/Product Truth axis for any arm-region piece; exact leaf wording remains configuration provenance.'
  ),
  (
    'Legs',
    'legs',
    'Legs',
    140,
    true,
    false,
    'Canonical SEO/Product Truth axis for any leg-region piece; quantity remains configuration provenance.'
  )
on conflict do nothing;

create or replace view public.feya_commerce_v_step7_storefront_products_api_v5 as
with expanded as (
  select
    v4.canonical_product_id,
    cfg.ordinality,
    cfg.value as configuration,
    lower(btrim(coalesce(spr.raw_option_value, ''))) as raw_label_norm
  from public.feya_commerce_v_step7_storefront_products_api_v4 v4
  cross join lateral jsonb_array_elements(coalesce(v4.configurations, '[]'::jsonb))
    with ordinality as cfg(value, ordinality)
  left join public.feya_commerce_configuration_prices cp
    on cp.configuration_price_id::text = cfg.value ->> 'configuration_id'
  left join public.feya_commerce_source_price_rows spr
    on spr.source_price_row_id = cp.source_price_row_id
), classified as (
  select
    expanded.*,
    coalesce((configuration ->> 'is_full_set')::boolean, false) as is_full_set,
    coalesce((configuration ->> 'is_bundle')::boolean, false) as is_bundle,
    (
      not coalesce((configuration ->> 'is_full_set')::boolean, false)
      and not coalesce((configuration ->> 'is_bundle')::boolean, false)
      and (
        lower(coalesce(configuration ->> 'component_code', '')) = any (
          array[
            'arms', 'arm_set', 'bracelet', 'bracelets', 'cuff', 'cuffs',
            'glove', 'gloves', 'bracer', 'bracers', 'forearm', 'forearm_bracers'
          ]
        )
        or lower(coalesce(configuration ->> 'component_family', '')) = 'arms'
        or raw_label_norm ~ '(передн.*конеч|рук|наруч|браслет|перчат|бицеп|forearm|front[[:space:]]+limb|arm|bicep|bracer|bracelet|cuff|glove)'
      )
    ) as is_arm_axis,
    (
      not coalesce((configuration ->> 'is_full_set')::boolean, false)
      and not coalesce((configuration ->> 'is_bundle')::boolean, false)
      and (
        lower(coalesce(configuration ->> 'component_code', '')) = any (
          array[
            'legs', 'leg', 'leg_cover', 'leg_covers', 'leg_armor',
            'garter', 'garters', 'thigh', 'thighs', 'shin', 'shins'
          ]
        )
        or lower(coalesce(configuration ->> 'component_family', '')) = 'legs'
        or raw_label_norm ~ '(чехл.*(ног|нож)|брон.*(ног|нож)|подвяз|бедр|голен|leg|thigh|shin|garter)'
      )
    ) as is_leg_axis
  from expanded
), canonicalized as (
  select
    classified.*,
    case
      when is_full_set and raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)'
        then 'Full Set — 1 Leg Cover'
      when is_full_set and raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)'
        then 'Full Set — 2 Leg Covers'
      when is_leg_axis and raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)'
        then 'Single Leg Cover'
      when is_leg_axis and raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)'
        then 'Pair of Leg Covers'
      when is_leg_axis and coalesce(configuration ->> 'public_label', '') = 'Option'
        then 'Leg Covers'
      when is_arm_axis and raw_label_norm ~ '(передн.*конеч|forearm|front[[:space:]]+limb)'
        then 'Forearm Covers'
      when is_arm_axis and coalesce(configuration ->> 'public_label', '') = 'Option'
        then 'Arm Pieces'
      else configuration ->> 'public_label'
    end as public_label_v5,
    case
      when is_arm_axis then 'arms'
      when is_leg_axis then 'legs'
      else configuration ->> 'component_code'
    end as component_code_v5,
    case
      when is_arm_axis then 'Arms'
      when is_leg_axis then 'Legs'
      else configuration ->> 'component_family'
    end as component_family_v5,
    coalesce((
      select jsonb_agg(mapped.code order by mapped.code)
      from (
        select distinct
          case
            when lower(code.value) = any (
              array['arms', 'arm_set', 'bracelet', 'bracelets', 'cuff', 'cuffs', 'glove', 'gloves', 'bracer', 'bracers', 'forearm', 'forearm_bracers']
            ) then 'arms'
            when lower(code.value) = any (
              array['legs', 'leg', 'leg_cover', 'leg_covers', 'leg_armor', 'garter', 'garters', 'thigh', 'thighs', 'shin', 'shins']
            ) then 'legs'
            else lower(code.value)
          end as code
        from jsonb_array_elements_text(
          coalesce(configuration -> 'bundle_component_codes', '[]'::jsonb)
        ) as code(value)
        where nullif(btrim(code.value), '') is not null
      ) mapped
    ), '[]'::jsonb) as explicit_bundle_codes_v5
  from classified
), atomic_axis_rows as (
  select
    canonical_product_id,
    component_code_v5 as component_code,
    min(ordinality) as first_ordinality,
    (array_agg(public_label_v5 order by ordinality))[1] as default_label
  from canonicalized
  where not is_full_set
    and not is_bundle
    and nullif(btrim(coalesce(component_code_v5, '')), '') is not null
  group by canonical_product_id, component_code_v5
), patched_configurations as (
  select
    c.canonical_product_id,
    c.ordinality,
    c.configuration || jsonb_build_object(
      'public_label', c.public_label_v5,
      'component_code', c.component_code_v5,
      'component_family', c.component_family_v5,
      'needs_label_review', case
        when c.is_arm_axis or c.is_leg_axis then false
        else coalesce((c.configuration ->> 'needs_label_review')::boolean, false)
      end,
      'bundle_component_codes', case
        when c.is_full_set and c.explicit_bundle_codes_v5 = '[]'::jsonb then coalesce((
          select jsonb_agg(a.component_code order by a.first_ordinality)
          from atomic_axis_rows a
          where a.canonical_product_id = c.canonical_product_id
        ), '[]'::jsonb)
        else c.explicit_bundle_codes_v5
      end,
      'bundle_component_labels', case
        when c.is_full_set then coalesce((
          select jsonb_agg(
            case
              when a.component_code = 'legs'
                and c.raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)'
                then 'Single Leg Cover'
              when a.component_code = 'legs'
                and c.raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)'
                then 'Pair of Leg Covers'
              else a.default_label
            end
            order by a.first_ordinality
          )
          from atomic_axis_rows a
          where a.canonical_product_id = c.canonical_product_id
        ), '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as configuration
  from canonicalized c
), configurations_agg as (
  select
    canonical_product_id,
    jsonb_agg(configuration order by ordinality) as configurations
  from patched_configurations
  group by canonical_product_id
)
select (
  jsonb_populate_record(
    null::public.feya_commerce_v_step7_storefront_products_api_v4,
    to_jsonb(v4) || jsonb_build_object(
      'configurations', coalesce(agg.configurations, v4.configurations, '[]'::jsonb)
    )
  )
).*
from public.feya_commerce_v_step7_storefront_products_api_v4 v4
left join configurations_agg agg
  on agg.canonical_product_id = v4.canonical_product_id;

comment on view public.feya_commerce_v_step7_storefront_products_api_v5 is
  'Admin/SEO read contract: exact selector labels plus canonical arms/legs axes; public storefront remains on v4.';

create or replace function public.feya_commerce_get_step7_storefront_products_api_v5(
  p_canonical_product_id uuid
)
returns setof public.feya_commerce_v_step7_storefront_products_api_v5
language sql
stable
security definer
set search_path = public
as $function$
  select *
  from public.feya_commerce_v_step7_storefront_products_api_v5
  where canonical_product_id = p_canonical_product_id
$function$;

revoke all on function public.feya_commerce_get_step7_storefront_products_api_v5(uuid)
  from public, anon, authenticated;
grant execute on function public.feya_commerce_get_step7_storefront_products_api_v5(uuid)
  to service_role;

notify pgrst, 'reload schema';
