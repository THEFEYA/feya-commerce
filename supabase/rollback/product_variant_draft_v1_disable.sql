-- Operational containment, NOT a destructive down migration.
-- First disable FEYA_PRODUCT_VARIANT_DRAFT_ENABLED and drain in-flight requests.
-- Preserve every source row, revision, quote, receipt, event and pending outbox entry.
begin;
update public.feya_growth_registry_items_v1
set active_flag=false, updated_at=now()
where registry_type='action_capability' and item_code='SAVE_PRODUCT_VARIANT_DRAFT' and version_no=1;
revoke execute on function public.feya_commerce_variant_draft_health_v1(),
  public.feya_commerce_read_variant_draft_v1(uuid),
  public.feya_commerce_save_variant_draft_v1(uuid,jsonb) from service_role;
notify pgrst,'reload schema';
commit;
