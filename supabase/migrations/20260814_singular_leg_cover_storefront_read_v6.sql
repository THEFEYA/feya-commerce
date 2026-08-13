-- Follow-up to v5: PostgreSQL's old `чехл...` pattern does not match the
-- singular Russian form `чехол`. v6 recognizes all чехол/чехла/чехлы forms,
-- then rebuilds every Full Set from the complete canonical current selector.

create or replace view public.feya_commerce_v_step7_storefront_products_api_v6 as
with expanded as (
  select
    v5.canonical_product_id,
    cfg.ordinality,
    cfg.value as configuration,
    lower(btrim(coalesce(spr.raw_option_value, ''))) as raw_label_norm
  from public.feya_commerce_v_step7_storefront_products_api_v5 v5
  cross join lateral jsonb_array_elements(coalesce(v5.configurations, '[]'::jsonb))
    with ordinality as cfg(value, ordinality)
  left join public.feya_commerce_configuration_prices cp
    on cp.configuration_price_id::text = cfg.value ->> 'configuration_id'
  left join public.feya_commerce_source_price_rows spr
    on spr.source_price_row_id = cp.source_price_row_id
), canonicalized as (
  select
    expanded.*,
    coalesce((configuration ->> 'is_full_set')::boolean, false) as is_full_set,
    coalesce((configuration ->> 'is_bundle')::boolean, false) as is_bundle,
    case
      when not coalesce((configuration ->> 'is_full_set')::boolean, false)
        and not coalesce((configuration ->> 'is_bundle')::boolean, false)
        and raw_label_norm ~ '(чех.*(ног|нож)|leg[[:space:]]*covers?)'
        and raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)'
        then 'Single Leg Cover'
      when not coalesce((configuration ->> 'is_full_set')::boolean, false)
        and not coalesce((configuration ->> 'is_bundle')::boolean, false)
        and raw_label_norm ~ '(чех.*(ног|нож)|leg[[:space:]]*covers?)'
        and raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)'
        then 'Pair of Leg Covers'
      else configuration ->> 'public_label'
    end as public_label_v6,
    case
      when not coalesce((configuration ->> 'is_full_set')::boolean, false)
        and not coalesce((configuration ->> 'is_bundle')::boolean, false)
        and raw_label_norm ~ '(чех.*(ног|нож)|leg[[:space:]]*covers?)'
        then 'legs'
      else configuration ->> 'component_code'
    end as component_code_v6,
    case
      when not coalesce((configuration ->> 'is_full_set')::boolean, false)
        and not coalesce((configuration ->> 'is_bundle')::boolean, false)
        and raw_label_norm ~ '(чех.*(ног|нож)|leg[[:space:]]*covers?)'
        then 'Legs'
      else configuration ->> 'component_family'
    end as component_family_v6,
    (
      not coalesce((configuration ->> 'is_full_set')::boolean, false)
      and not coalesce((configuration ->> 'is_bundle')::boolean, false)
      and raw_label_norm ~ '(чех.*(ног|нож)|leg[[:space:]]*covers?)'
    ) as fixed_leg_axis
  from expanded
), atomic_axis_rows as (
  select
    canonical_product_id,
    component_code_v6 as component_code,
    min(ordinality) as first_ordinality,
    (array_agg(public_label_v6 order by ordinality))[1] as default_label
  from canonicalized
  where not is_full_set
    and not is_bundle
    and nullif(btrim(coalesce(component_code_v6, '')), '') is not null
  group by canonical_product_id, component_code_v6
), patched_configurations as (
  select
    c.canonical_product_id,
    c.ordinality,
    c.configuration || jsonb_build_object(
      'public_label', case
        when c.is_full_set
          and c.raw_label_norm ~ '(^|[^0-9])1[[:space:]]+.*(ног|нож|leg)'
          then 'Full Set — 1 Leg Cover'
        when c.is_full_set
          and c.raw_label_norm ~ '(^|[^0-9])2[[:space:]]+.*(ног|нож|leg)'
          then 'Full Set — 2 Leg Covers'
        else c.public_label_v6
      end,
      'component_code', c.component_code_v6,
      'component_family', c.component_family_v6,
      'needs_label_review', case
        when c.fixed_leg_axis then false
        else coalesce((c.configuration ->> 'needs_label_review')::boolean, false)
      end,
      'bundle_component_codes', case
        when c.is_full_set then coalesce((
          select jsonb_agg(a.component_code order by a.first_ordinality)
          from atomic_axis_rows a
          where a.canonical_product_id = c.canonical_product_id
        ), '[]'::jsonb)
        else coalesce(c.configuration -> 'bundle_component_codes', '[]'::jsonb)
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
    null::public.feya_commerce_v_step7_storefront_products_api_v5,
    to_jsonb(v5) || jsonb_build_object(
      'configurations', coalesce(agg.configurations, v5.configurations, '[]'::jsonb)
    )
  )
).*
from public.feya_commerce_v_step7_storefront_products_api_v5 v5
left join configurations_agg agg
  on agg.canonical_product_id = v5.canonical_product_id;

comment on view public.feya_commerce_v_step7_storefront_products_api_v6 is
  'Admin/SEO read contract with canonical arms/legs axes and Russian singular/plural leg-cover handling.';

create or replace function public.feya_commerce_get_step7_storefront_products_api_v6(
  p_canonical_product_id uuid
)
returns setof public.feya_commerce_v_step7_storefront_products_api_v6
language sql
stable
security definer
set search_path = public
as $function$
  select *
  from public.feya_commerce_v_step7_storefront_products_api_v6
  where canonical_product_id = p_canonical_product_id
$function$;

revoke all on function public.feya_commerce_get_step7_storefront_products_api_v6(uuid)
  from public, anon, authenticated;
grant execute on function public.feya_commerce_get_step7_storefront_products_api_v6(uuid)
  to service_role;

notify pgrst, 'reload schema';
