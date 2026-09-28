-- Add sellable component axis to immutable storefront shopper facet snapshots.
begin;

alter table public.feya_storefront_facet_items_v1
  add column if not exists sellable_component_values_json jsonb;

alter table public.feya_storefront_facet_items_v1
  drop constraint if exists feya_storefront_facet_items_sellable_component_values_json_check;

alter table public.feya_storefront_facet_items_v1
  add constraint feya_storefront_facet_items_sellable_component_values_json_check
    check(sellable_component_values_json is null or jsonb_typeof(sellable_component_values_json)='array');

commit;
