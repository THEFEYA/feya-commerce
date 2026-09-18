create or replace function public.feya_commerce_get_step7_storefront_products_api_v7(p_canonical_product_id uuid)
returns setof public.feya_commerce_v_step7_storefront_products_api_v4
language sql
stable
security definer
set search_path to 'public'
set jit to 'off'
as $function$
with base as (
  select *
  from public.feya_commerce_get_step7_storefront_products_api_v4(p_canonical_product_id)
), expanded as (
  select
    base.canonical_product_id,
    cfg.ordinality,
    cfg.value as configuration,
    lower(btrim(coalesce(spr.raw_option_value, ''))) as raw_label_norm
  from base
  cross join lateral jsonb_array_elements(coalesce(base.configurations, '[]'::jsonb))
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
        or raw_label_norm ~ '(чех.*(ног|нож)|брон.*(ног|нож)|подвяз|бедр|голен|leg|thigh|shin|garter)'
      )
    ) as is_leg_axis
  from expanded
), canonicalized as (
  select
    classified.*,
    case
      when is_full_set and raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)' then 'Full Set — 1 Leg Cover'
      when is_full_set and raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)' then 'Full Set — 2 Leg Covers'
      when is_leg_axis and raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)' then 'Single Leg Cover'
      when is_leg_axis and raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)' then 'Pair of Leg Covers'
      when is_leg_axis and coalesce(configuration ->> 'public_label', '') = 'Option' then 'Leg Covers'
      when is_arm_axis and raw_label_norm ~ '(передн.*конеч|forearm|front[[:space:]]+limb)' then 'Forearm Covers'
      when is_arm_axis and coalesce(configuration ->> 'public_label', '') = 'Option' then 'Arm Pieces'
      else configuration ->> 'public_label'
    end as public_label_v7,
    case
      when is_arm_axis then 'arms'
      when is_leg_axis then 'legs'
      else configuration ->> 'component_code'
    end as component_code_v7,
    case
      when is_arm_axis then 'Arms'
      when is_leg_axis then 'Legs'
      else configuration ->> 'component_family'
    end as component_family_v7
  from classified
), axis_candidates as (
  select
    canonical_product_id,
    component_code_v7 as component_code,
    ordinality * 1000 as sort_key,
    public_label_v7 as default_label
  from canonicalized
  where not is_full_set
    and not is_bundle
    and nullif(btrim(coalesce(component_code_v7, '')), '') is not null

  union all

  select
    c.canonical_product_id,
    case
      when lower(code.value) = any (
        array['arms', 'arm_set', 'bracelet', 'bracelets', 'cuff', 'cuffs', 'glove', 'gloves', 'bracer', 'bracers', 'forearm', 'forearm_bracers']
      ) then 'arms'
      when lower(code.value) = any (
        array['legs', 'leg', 'leg_cover', 'leg_covers', 'leg_armor', 'garter', 'garters', 'thigh', 'thighs', 'shin', 'shins']
      ) then 'legs'
      else lower(code.value)
    end as component_code,
    c.ordinality * 1000 + code.ordinality as sort_key,
    case
      when lower(code.value) = any (
        array['arms', 'arm_set', 'bracelet', 'bracelets', 'cuff', 'cuffs', 'glove', 'gloves', 'bracer', 'bracers', 'forearm', 'forearm_bracers']
      ) then 'Arm Pieces'
      when lower(code.value) = any (
        array['legs', 'leg', 'leg_cover', 'leg_covers', 'leg_armor', 'garter', 'garters', 'thigh', 'thighs', 'shin', 'shins']
      ) then 'Leg Covers'
      when lower(code.value) = 'shoulders' then 'Shoulders'
      when lower(code.value) = 'top' then 'Top'
      when lower(code.value) = 'skirt' then 'Skirt'
      when lower(code.value) = 'panties' then 'Panties'
      when lower(code.value) = 'choker' then 'Choker'
      when lower(code.value) = 'headpiece' then 'Headpiece'
      when lower(code.value) = 'horns' then 'Horns'
      when lower(code.value) = 'bodysuit' then 'Bodysuit'
      when lower(code.value) = 'wings' then 'Wings'
      when lower(code.value) = 'tail' then 'Tail'
      when lower(code.value) = 'spine' then 'Spine'
      when lower(code.value) = 'belt' then 'Belt'
      when lower(code.value) = 'corset' then 'Corset'
      when lower(code.value) = 'mask' then 'Mask'
      when lower(code.value) = 'harness' then 'Harness'
      else initcap(replace(lower(code.value), '_', ' '))
    end as default_label
  from canonicalized c
  cross join lateral jsonb_array_elements_text(
    coalesce(c.configuration -> 'bundle_component_codes', '[]'::jsonb)
  ) with ordinality as code(value, ordinality)
  where not c.is_full_set
    and c.is_bundle
    and nullif(btrim(code.value), '') is not null
), atomic_axis_rows as (
  select
    canonical_product_id,
    component_code,
    min(sort_key) as first_ordinality,
    (array_agg(default_label order by sort_key))[1] as default_label
  from axis_candidates
  where nullif(btrim(coalesce(component_code, '')), '') is not null
  group by canonical_product_id, component_code
), patched_configurations as (
  select
    c.canonical_product_id,
    c.ordinality,
    c.configuration || jsonb_build_object(
      'public_label', c.public_label_v7,
      'component_code', c.component_code_v7,
      'component_family', c.component_family_v7,
      'needs_label_review', case
        when c.is_arm_axis or c.is_leg_axis then false
        else coalesce((c.configuration ->> 'needs_label_review')::boolean, false)
      end,
      'bundle_component_codes', case
        when c.is_full_set then coalesce((
          select jsonb_agg(a.component_code order by a.first_ordinality)
          from atomic_axis_rows a
          where a.canonical_product_id = c.canonical_product_id
        ), '[]'::jsonb)
        else coalesce((
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
              coalesce(c.configuration -> 'bundle_component_codes', '[]'::jsonb)
            ) as code(value)
            where nullif(btrim(code.value), '') is not null
          ) mapped
        ), '[]'::jsonb)
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
        else coalesce(c.configuration -> 'bundle_component_labels', '[]'::jsonb)
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
    to_jsonb(base) || jsonb_build_object(
      'configurations', coalesce(agg.configurations, base.configurations, '[]'::jsonb)
    )
  )
).*
from base
left join configurations_agg agg
  on agg.canonical_product_id = base.canonical_product_id
$function$;
