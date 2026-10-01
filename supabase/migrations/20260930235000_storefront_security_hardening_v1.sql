-- Defense-in-depth hardening for storefront read-model and invalidation relations.

alter table public.feya_storefront_approved_product_bindings_v1 enable row level security;
alter table public.feya_storefront_product_card_snapshots_v1 enable row level security;
alter table public.feya_storefront_cache_invalidations_v1 enable row level security;

revoke all on public.feya_storefront_approved_product_bindings_v1 from service_role;
grant select on public.feya_storefront_approved_product_bindings_v1 to service_role;

revoke all on public.feya_storefront_product_card_snapshots_v1 from service_role;
grant select on public.feya_storefront_product_card_snapshots_v1 to service_role;

revoke all on public.feya_storefront_cache_invalidations_v1 from service_role;
grant select,insert,update on public.feya_storefront_cache_invalidations_v1 to service_role;

alter view public.feya_storefront_product_cards_v1 set (security_invoker=true);
revoke all on public.feya_storefront_product_cards_v1 from service_role;
grant select on public.feya_storefront_product_cards_v1 to service_role;
