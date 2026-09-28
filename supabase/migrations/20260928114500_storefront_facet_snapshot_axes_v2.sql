-- Extend immutable storefront shopper-facet snapshot storage with owner-approved component/audience/material axes.
begin;

alter table public.feya_storefront_facet_items_v1
  add column if not exists component_values_json jsonb,
  add column if not exists audience_values_json jsonb,
  add column if not exists material_values_json jsonb;

alter table public.feya_storefront_facet_items_v1
  drop constraint if exists feya_storefront_facet_items_component_values_json_check,
  drop constraint if exists feya_storefront_facet_items_audience_values_json_check,
  drop constraint if exists feya_storefront_facet_items_material_values_json_check;

alter table public.feya_storefront_facet_items_v1
  add constraint feya_storefront_facet_items_component_values_json_check
    check(component_values_json is null or jsonb_typeof(component_values_json)='array'),
  add constraint feya_storefront_facet_items_audience_values_json_check
    check(audience_values_json is null or jsonb_typeof(audience_values_json)='array'),
  add constraint feya_storefront_facet_items_material_values_json_check
    check(material_values_json is null or jsonb_typeof(material_values_json)='array');

commit;
