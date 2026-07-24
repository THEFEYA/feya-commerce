-- Remove the legacy fixed_base-only constraint left under its original name.
-- The replacement RPC and Product Truth v4 support both evidence scopes.

alter table public.feya_commerce_product_component_assertions_v1
  drop constraint if exists feya_commerce_product_component_assertions_presence_scope_check;

alter table public.feya_commerce_product_component_assertions_v1
  drop constraint if exists feya_commerce_product_component_assertions_v1_presence_scope_check;

alter table public.feya_commerce_product_component_assertions_v1
  add constraint feya_commerce_product_component_assertions_v1_presence_scope_check
  check (presence_scope in ('fixed_base', 'canonical_listing'));
