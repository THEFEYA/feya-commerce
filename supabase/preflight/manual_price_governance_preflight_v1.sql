-- C4.3-E18 manual price governance production preflight: READ ONLY.

select
  to_regprocedure('public.feya_commerce_manual_price_lane_governance_evidence_v1()') is null as evidence_function_absent,
  to_regprocedure('public.feya_commerce_execute_manual_price_lane_governance_v1(uuid)') is null as executor_absent,
  exists(select 1 from supabase_migrations.schema_migrations where name='manual_price_lane_governance_v1') as migration_present,
  (select count(*) from public.feya_growth_registry_items_v1
    where registry_type='action_capability'
      and item_code='ADOPT_MANUAL_PRICE_LANE_GOVERNANCE'
      and active_flag)::int as active_capability_rows;

select
  request_status,approval_hash,approved_by_user_id,
  (select count(*) from public.feya_growth_execution_receipts_v1 r
    where r.execution_request_id=e.execution_request_id)::int as receipt_rows
from public.feya_growth_execution_requests_v1 e
where execution_request_id='3181a279-3f98-4faf-874f-788d20d8731a'::uuid;

select public.feya_commerce_manual_configuration_repair_evidence_v1() as current_manual_repair_evidence;
