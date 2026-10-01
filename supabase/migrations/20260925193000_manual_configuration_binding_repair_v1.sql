-- C4.3-E12: exact two-product sellable configuration identity repair.
-- Unapplied by default. Price amounts/review states are not changed.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','REPAIR_MANUAL_CONFIGURATION_BINDINGS','Repair manual-lane configuration identities','CPIM',
  'AVAILABLE_WITH_LIMITATIONS','two_product_configuration_identity_repair_only',
  'Separates six already-known price rows into the exact source-backed sellable configurations for two held launch products.',
  'No price amount, price review, offer, order, payment or indexing mutation. Exact two-product evidence and human approval required.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"EXECUTION_GATEWAY","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"payment":false,"order_creation":false,"contract_version":"manual_configuration_binding_repair_v1"}'::jsonb,
  '{"source":"C4_3_E11_Pending_Request_And_Manual_Lane_Repair_20260925.md","expected_price_rows":6,"expected_existing_configurations":3,"expected_target_configurations":6}'::jsonb,
  1,true
);

create function public.feya_commerce_manual_configuration_repair_evidence_v1() returns jsonb
language sql security definer set search_path='' as $$
with price_evidence as (
  select jsonb_agg(
    jsonb_build_object(
      'canonical_product_id',p.canonical_product_id,
      'configuration_price_id',p.configuration_price_id,
      'sellable_configuration_id',p.sellable_configuration_id,
      'option_mapping_id',p.option_mapping_id,
      'source_price_row_id',p.source_price_row_id,
      'source_amount',p.source_amount,
      'public_price_amount',p.public_price_amount,
      'manual_override_amount',p.manual_override_amount,
      'source_currency',p.source_currency,
      'confidence',p.confidence,
      'fallback_flag',p.fallback_flag,
      'review_status',p.review_status,
      'price_status',p.price_status,
      'raw_option_value',m.raw_option_value,
      'canonical_option_value',m.canonical_option_value
    )
    order by p.canonical_product_id,p.configuration_price_id
  ) as j
  from public.feya_commerce_configuration_prices p
  left join public.feya_commerce_option_mappings m on m.option_mapping_id=p.option_mapping_id
  where p.canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  )
),
config_evidence as (
  select jsonb_agg(
    jsonb_build_object(
      'canonical_product_id',canonical_product_id,
      'sellable_configuration_id',sellable_configuration_id,
      'option_mapping_id',option_mapping_id,
      'configuration_name',configuration_name,
      'normalized_key',normalized_key,
      'is_default_whole_product',is_default_whole_product,
      'is_public_candidate',is_public_candidate,
      'is_sampler',is_sampler,
      'sort_order',sort_order,
      'review_status',review_status
    )
    order by canonical_product_id,sellable_configuration_id
  ) as j
  from public.feya_commerce_sellable_configurations
  where canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  )
),
combined as (
  select jsonb_build_object(
    'prices',coalesce((select j from price_evidence),'[]'::jsonb),
    'configurations',coalesce((select j from config_evidence),'[]'::jsonb)
  ) j
)
select jsonb_build_object(
  'contract_version','manual_configuration_binding_repair_v1',
  'price_rows',jsonb_array_length((select j->'prices' from combined)),
  'configuration_rows',jsonb_array_length((select j->'configurations' from combined)),
  'evidence_sha256',encode(extensions.digest(convert_to((select j from combined)::text,'UTF8'),'sha256'),'hex'),
  'commercial_values_change',false,
  'price_review_status_change',false,
  'payment_enabled',false,
  'indexing_enabled',false
);
$$;

create function public.feya_commerce_execute_manual_configuration_repair_v1(p_execution_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  before_evidence jsonb;
  expected_hash text;
  before_values_hash text;
  after_values_hash text;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'manual_configuration_repair_request_required'; end if;

  select * into req
  from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id
  for update;
  if not found then raise exception 'manual_configuration_repair_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior
    from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'manual_configuration_repair_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'REPAIR_MANUAL_CONFIGURATION_BINDINGS'
    or req.mutation_domain<>'COMMERCE_CONFIGURATION'
    or req.request_status<>'APPROVED'
    or req.approval_hash is null
    or req.approval_hash<>req.request_hash
    or req.approved_by_user_id is null
    then raise exception 'manual_configuration_repair_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'manual_configuration_binding_repair_v1'
    or req.request_payload_json->>'release_ref'<>'feya-review-207-20260924'
    or (req.request_payload_json->>'expected_price_rows')::integer<>6
    or (req.request_payload_json->>'expected_target_configurations')::integer<>6
    then raise exception 'manual_configuration_repair_payload_invalid'; end if;

  expected_hash:=req.request_payload_json->>'evidence_sha256';
  if expected_hash is null or expected_hash!~'^[0-9a-f]{64}$'
    then raise exception 'manual_configuration_repair_payload_invalid'; end if;

  perform 1 from public.feya_commerce_configuration_prices
  where canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  )
  order by canonical_product_id,configuration_price_id
  for update;

  perform 1 from public.feya_commerce_sellable_configurations
  where canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  )
  order by canonical_product_id,sellable_configuration_id
  for update;

  before_evidence:=public.feya_commerce_manual_configuration_repair_evidence_v1();
  if (before_evidence->>'price_rows')::integer<>6
    or (before_evidence->>'configuration_rows')::integer<>3
    or before_evidence->>'evidence_sha256'<>expected_hash
    then raise exception 'manual_configuration_repair_evidence_conflict'; end if;

  -- Exact current row semantics: fail closed if any source option/amount/binding drifted.
  if not exists(
    select 1 from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m on m.option_mapping_id=p.option_mapping_id
    where p.configuration_price_id='aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid
      and p.canonical_product_id='057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid
      and p.sellable_configuration_id='7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid
      and m.option_mapping_id='df5c0538-4de2-48a2-9df8-76ffac6bc509'::uuid
      and m.raw_option_value='Мужская одежда'
      and p.source_amount=183.44 and p.public_price_amount=183.44 and p.manual_override_amount is null
  ) then raise exception 'manual_configuration_repair_contract_drift'; end if;

  if not exists(
    select 1 from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m on m.option_mapping_id=p.option_mapping_id
    where p.configuration_price_id='5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid
      and p.canonical_product_id='057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid
      and p.sellable_configuration_id='7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid
      and m.option_mapping_id='e2792946-b1d4-45e8-8026-cfca80be7778'::uuid
      and m.raw_option_value='Женский наряд'
      and p.source_amount=327.00 and p.public_price_amount=327.00 and p.manual_override_amount is null
  ) then raise exception 'manual_configuration_repair_contract_drift'; end if;

  if not exists(
    select 1 from public.feya_commerce_configuration_prices p
    where p.configuration_price_id='26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid
      and p.canonical_product_id='057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid
      and p.sellable_configuration_id='fcc1bf40-861a-4c6f-aa3c-bc2c7bd8e13e'::uuid
      and p.source_amount is null and p.public_price_amount=460.44 and p.manual_override_amount=460.44
      and p.review_status='approved' and p.price_status='approved'
  ) then raise exception 'manual_configuration_repair_contract_drift'; end if;

  if not exists(
    select 1 from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m on m.option_mapping_id=p.option_mapping_id
    where p.configuration_price_id='25d14147-338b-4ce9-9254-aa41f6333c00'::uuid
      and p.canonical_product_id='5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
      and p.sellable_configuration_id='06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid
      and m.option_mapping_id='5c8ad41e-e5a6-4ded-ab1e-ef376ae59226'::uuid
      and m.raw_option_value='Юбка'
      and p.source_amount=135.10 and p.public_price_amount=135.10 and p.manual_override_amount is null
  ) then raise exception 'manual_configuration_repair_contract_drift'; end if;

  if not exists(
    select 1 from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m on m.option_mapping_id=p.option_mapping_id
    where p.configuration_price_id='613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid
      and p.canonical_product_id='5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
      and p.sellable_configuration_id='06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid
      and m.option_mapping_id='1aa8d040-1155-493b-ab71-71b4e49a5e61'::uuid
      and m.raw_option_value='Верх и плечи'
      and p.source_amount=154.41 and p.public_price_amount=154.41 and p.manual_override_amount is null
  ) then raise exception 'manual_configuration_repair_contract_drift'; end if;

  if not exists(
    select 1 from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m on m.option_mapping_id=p.option_mapping_id
    where p.configuration_price_id='48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid
      and p.canonical_product_id='5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
      and p.sellable_configuration_id='06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid
      and m.option_mapping_id='41149ec4-0681-47af-9030-cc6d529321ba'::uuid
      and m.raw_option_value='Полный комплект'
      and p.source_amount=164.06 and p.public_price_amount=260.00 and p.manual_override_amount=260.00
      and p.review_status='approved' and p.price_status='owner_reviewed'
  ) then raise exception 'manual_configuration_repair_contract_drift'; end if;

  select encode(extensions.digest(convert_to(coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,
    'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency,
    'review_status',review_status,'price_status',price_status
  ) order by configuration_price_id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex')
  into before_values_hash
  from public.feya_commerce_configuration_prices
  where canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  );

  update public.feya_growth_execution_requests_v1
  set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'manual_configuration_repair_state_conflict'; end if;

  update public.feya_commerce_sellable_configurations
  set configuration_name='Male Outfit',normalized_key='male_outfit',sort_order=1,updated_at=now()
  where sellable_configuration_id='7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid
    and canonical_product_id='057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid;

  insert into public.feya_commerce_sellable_configurations(
    sellable_configuration_id,canonical_product_id,option_mapping_id,configuration_name,normalized_key,
    is_default_whole_product,is_sampler,is_public_candidate,sort_order,review_status,notes
  ) values(
    '16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid,
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    'e2792946-b1d4-45e8-8026-cfca80be7778'::uuid,
    'Female Outfit','female_outfit',false,false,true,2,'not_reviewed',
    'Deterministic split from source option mapping; governance approval remains separate.'
  );

  update public.feya_commerce_configuration_prices
  set sellable_configuration_id='16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid,updated_at=now()
  where configuration_price_id='5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid;

  update public.feya_commerce_sellable_configurations
  set configuration_name='Top + Shoulders',normalized_key='top_shoulders',sort_order=2,updated_at=now()
  where sellable_configuration_id='06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid
    and canonical_product_id='5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid;

  insert into public.feya_commerce_sellable_configurations(
    sellable_configuration_id,canonical_product_id,option_mapping_id,configuration_name,normalized_key,
    is_default_whole_product,is_sampler,is_public_candidate,sort_order,review_status,notes
  ) values
  (
    '017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid,
    '5c8ad41e-e5a6-4ded-ab1e-ef376ae59226'::uuid,
    'Skirt','skirt',false,false,true,1,'not_reviewed',
    'Deterministic split from source option mapping; governance approval remains separate.'
  ),
  (
    '9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid,
    '41149ec4-0681-47af-9030-cc6d529321ba'::uuid,
    'Full Set','full_set',true,false,true,3,'not_reviewed',
    'Deterministic split from source option mapping; owner price override remains unchanged.'
  );

  update public.feya_commerce_configuration_prices
  set sellable_configuration_id='017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid,updated_at=now()
  where configuration_price_id='25d14147-338b-4ce9-9254-aa41f6333c00'::uuid;

  update public.feya_commerce_configuration_prices
  set sellable_configuration_id='9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid,updated_at=now()
  where configuration_price_id='48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid;

  select encode(extensions.digest(convert_to(coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,
    'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency,
    'review_status',review_status,'price_status',price_status
  ) order by configuration_price_id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex')
  into after_values_hash
  from public.feya_commerce_configuration_prices
  where canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  );

  if before_values_hash<>after_values_hash then
    raise exception 'manual_configuration_repair_commercial_value_drift';
  end if;

  if (select count(*) from public.feya_commerce_sellable_configurations where canonical_product_id in (
    '057fbd51-52f5-4404-b126-e5d75b8599f4'::uuid,
    '5602d557-9d98-454b-bc98-9b9ea84b442f'::uuid
  ))<>6 then raise exception 'manual_configuration_repair_postflight_failed'; end if;

  if exists(
    select 1 from (
      values
        ('aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid,'7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid),
        ('5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid,'16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid),
        ('26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid,'fcc1bf40-861a-4c6f-aa3c-bc2c7bd8e13e'::uuid),
        ('25d14147-338b-4ce9-9254-aa41f6333c00'::uuid,'017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid),
        ('613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid,'06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid),
        ('48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid,'9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid)
    ) expected(configuration_price_id,sellable_configuration_id)
    left join public.feya_commerce_configuration_prices p using(configuration_price_id)
    where p.sellable_configuration_id is distinct from expected.sellable_configuration_id
  ) then raise exception 'manual_configuration_repair_postflight_failed'; end if;

  result:=jsonb_build_object(
    'contract_version','manual_configuration_binding_repair_v1',
    'execution_request_id',p_execution_request_id,
    'release_ref','feya-review-207-20260924',
    'before_evidence_sha256',expected_hash,
    'price_rows',6,
    'configuration_rows_before',3,
    'configuration_rows_after',6,
    'new_configurations',3,
    'commercial_values_unchanged',true,
    'price_review_status_change',false,
    'payment_enabled',false,'indexing_enabled',false,
    'target_version_refs_after',jsonb_build_object(
      'manual_configuration_binding_repair','applied',
      'commercial_values_hash',after_values_hash
    ),
    'replayed',false
  );

  select coalesce(max(attempt_no),0)+1 into attempt
  from public.feya_growth_execution_receipts_v1
  where execution_request_id=p_execution_request_id;

  insert into public.feya_growth_execution_receipts_v1(
    execution_request_id,attempt_no,receipt_status,executor_id,request_hash,
    result_json,postflight_result_json,rollback_result_json,completed_at
  ) values(
    p_execution_request_id,attempt,'SUCCEEDED','manual-configuration-repair-v1',req.request_hash,
    result,
    jsonb_build_object('price_rows',6,'configuration_rows_after',6,'commercial_values_unchanged',true,'payment_enabled',false,'indexing_enabled',false),
    '{}'::jsonb,now()
  );

  update public.feya_growth_execution_requests_v1
  set request_status='SUCCEEDED',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='EXECUTING';

  return result;
end $$;

do $$
declare p text;
begin
  foreach p in array array[
    'feya_commerce_manual_configuration_repair_evidence_v1()',
    'feya_commerce_execute_manual_configuration_repair_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_manual_configuration_repair_evidence_v1() to service_role;
  grant execute on function public.feya_commerce_execute_manual_configuration_repair_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
