-- C4.3-E4 production preflight: READ ONLY.
-- Expected against FEYA production BEFORE applying 20260925170000_price_baseline_adoption_v1.sql.

select
  current_database() as database_name,
  to_regprocedure('public.feya_fn_create_execution_request_v1(text,text,jsonb,jsonb,jsonb,jsonb,jsonb,text,uuid,text)') is not null as execution_request_core_present,
  to_regprocedure('public.feya_fn_owner_approve_execution_request_v1(uuid,text,text,uuid,text)') is not null as owner_approval_core_present,
  to_regprocedure('public.feya_commerce_preview_price_baseline_adoption_v1(uuid[])') is null as baseline_preview_not_yet_applied,
  to_regprocedure('public.feya_commerce_execute_price_baseline_adoption_v1(uuid)') is null as baseline_executor_not_yet_applied;

select
  count(*) filter(where manual_override_amount is not null)::int as manual_override_rows,
  count(*) filter(where fallback_flag)::int as fallback_rows,
  count(*) filter(where public_price_amount is null or public_price_amount<=0)::int as missing_or_zero_public_price_rows,
  count(*) filter(where source_currency is null or source_currency!~'^[A-Z]{3}$')::int as invalid_currency_rows
from public.feya_commerce_configuration_prices;

select version,name
from supabase_migrations.schema_migrations
where version in ('20260925170000')
order by version;
