-- Operational disable for C4.3-D offer promotion. Preserve immutable offer history and receipts.
begin;
revoke execute on function public.feya_commerce_promote_offer_v1(uuid,jsonb) from service_role;
update public.feya_growth_registry_items_v1
  set active_flag=false,updated_at=now()
  where registry_type='action_capability' and item_code='PROMOTE_PRODUCT_OFFER' and version_no=1;
commit;
notify pgrst,'reload schema';
