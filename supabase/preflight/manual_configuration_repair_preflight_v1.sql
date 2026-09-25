-- C4.3-E14 manual configuration repair production preflight: READ ONLY.

select
  to_regprocedure('public.feya_commerce_manual_configuration_repair_evidence_v1()') is null as evidence_function_absent,
  to_regprocedure('public.feya_commerce_execute_manual_configuration_repair_v1(uuid)') is null as executor_absent,
  exists(select 1 from supabase_migrations.schema_migrations where name='manual_configuration_binding_repair_v1') as migration_present,
  (select count(*) from public.feya_growth_registry_items_v1
    where registry_type='action_capability'
      and item_code='REPAIR_MANUAL_CONFIGURATION_BINDINGS'
      and active_flag)::int as active_capability_rows;

select canonical_product_id,count(*)::int as configuration_rows
from public.feya_commerce_sellable_configurations
where canonical_product_id in (
  '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
  '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
)
group by canonical_product_id
order by canonical_product_id;

select count(*)::int as proposed_identity_conflicts
from public.feya_commerce_sellable_configurations
where sellable_configuration_id in (
  '16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid,
  '017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid,
  '9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid
)
or (
  canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  )
  and normalized_key in ('female_outfit','skirt','full_set')
);
