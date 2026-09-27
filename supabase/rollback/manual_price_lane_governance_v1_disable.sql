begin;
revoke execute on function public.feya_commerce_execute_manual_price_lane_governance_v1(uuid) from service_role;
update public.feya_growth_registry_items_v1
set active_flag=false,updated_at=now()
where registry_type='action_capability'
  and item_code='ADOPT_MANUAL_PRICE_LANE_GOVERNANCE'
  and version_no=1;
commit;
notify pgrst,'reload schema';
