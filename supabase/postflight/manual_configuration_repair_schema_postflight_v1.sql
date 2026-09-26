-- C4.3-E14 manual configuration repair schema postflight: READ ONLY.
-- Run immediately after schema-only apply; repair execution must remain unapproved/unexecuted.

select
  to_regprocedure('public.feya_commerce_manual_configuration_repair_evidence_v1()') is not null as evidence_function_present,
  to_regprocedure('public.feya_commerce_execute_manual_configuration_repair_v1(uuid)') is not null as executor_present,
  has_function_privilege('service_role','public.feya_commerce_manual_configuration_repair_evidence_v1()','EXECUTE') as service_can_read_evidence,
  has_function_privilege('service_role','public.feya_commerce_execute_manual_configuration_repair_v1(uuid)','EXECUTE') as service_can_execute,
  has_function_privilege('anon','public.feya_commerce_execute_manual_configuration_repair_v1(uuid)','EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated','public.feya_commerce_execute_manual_configuration_repair_v1(uuid)','EXECUTE') as authenticated_can_execute;

select item_code,item_state,implementation_state,active_flag,version_no,config_json
from public.feya_growth_registry_items_v1
where registry_type='action_capability'
  and item_code='REPAIR_MANUAL_CONFIGURATION_BINDINGS'
order by version_no desc;

select version,name
from supabase_migrations.schema_migrations
where name='manual_configuration_binding_repair_v1'
order by version desc;
