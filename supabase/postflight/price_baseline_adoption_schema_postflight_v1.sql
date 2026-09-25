-- C4.3-E4 schema postflight: READ ONLY.
-- Run immediately AFTER applying only 20260925170000_price_baseline_adoption_v1.sql,
-- while FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED is still false.

select
  to_regprocedure('public.feya_commerce_preview_price_baseline_adoption_v1(uuid[])') is not null as preview_present,
  to_regprocedure('public.feya_commerce_execute_price_baseline_adoption_v1(uuid)') is not null as executor_present,
  has_function_privilege('service_role','public.feya_commerce_preview_price_baseline_adoption_v1(uuid[])','EXECUTE') as service_can_preview,
  has_function_privilege('service_role','public.feya_commerce_execute_price_baseline_adoption_v1(uuid)','EXECUTE') as service_can_execute,
  has_function_privilege('anon','public.feya_commerce_execute_price_baseline_adoption_v1(uuid)','EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated','public.feya_commerce_execute_price_baseline_adoption_v1(uuid)','EXECUTE') as authenticated_can_execute;

select item_code,item_state,implementation_state,active_flag,config_json
from public.feya_growth_registry_items_v1
where registry_type='action_capability'
  and item_code='ADOPT_SOURCE_PRICE_BASELINE'
order by version_no desc;

select version,name
from supabase_migrations.schema_migrations
where version='20260925170000';
