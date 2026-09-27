-- C4.3-E16: exact post-repair governance for the two manual-price-lane products.
-- Unapplied by default. No price amount, offer, order, payment or indexing activation.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','ADOPT_MANUAL_PRICE_LANE_GOVERNANCE','Adopt manual price lane governance','CPIM',
  'AVAILABLE_WITH_LIMITATIONS','two_product_manual_price_lane_only',
  'Approves the exact post-repair sellable configurations and unchanged source-price rows for the two manual-price-lane launch products.',
  'Requires the E12 six-configuration binding repair to be complete. Preserves both owner manual price decisions and every commercial amount.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"EXECUTION_GATEWAY","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"payment":false,"order_creation":false,"contract_version":"manual_price_lane_governance_v1"}'::jsonb,
  '{"release_ref":"feya-review-207-20260924","products":2,"price_rows":6,"manual_override_rows":2,"source_carry_forward_rows":4}'::jsonb,
  1,true
);

create function public.feya_commerce_manual_price_lane_governance_evidence_v1() returns jsonb
language sql security definer set search_path='' as $$
with expected_configs(id) as (
  values
    ('7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid),
    ('16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid),
    ('fcc1bf40-861a-4c6f-aa3c-bc2c7bd8e13e'::uuid),
    ('017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid),
    ('06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid),
    ('9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid)
),
expected_prices(id) as (
  values
    ('aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid),
    ('5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid),
    ('26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid),
    ('25d14147-338b-4ce9-9254-aa41f6333c00'::uuid),
    ('613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid),
    ('48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid)
),
price_rows as (
  select p.*,c.review_status configuration_review_status,c.configuration_name,c.normalized_key,
         c.is_public_candidate,c.is_sampler,c.sort_order
  from public.feya_commerce_configuration_prices p
  join expected_prices e on e.id=p.configuration_price_id
  left join public.feya_commerce_sellable_configurations c
    on c.sellable_configuration_id=p.sellable_configuration_id
   and c.canonical_product_id=p.canonical_product_id
),
config_rows as (
  select c.*
  from public.feya_commerce_sellable_configurations c
  join expected_configs e on e.id=c.sellable_configuration_id
),
material as (
  select jsonb_build_object(
    'prices',coalesce((
      select jsonb_agg(jsonb_build_object(
        'configuration_price_id',configuration_price_id,
        'canonical_product_id',canonical_product_id,
        'sellable_configuration_id',sellable_configuration_id,
        'source_price_row_id',source_price_row_id,
        'option_mapping_id',option_mapping_id,
        'source_amount',source_amount,'public_price_amount',public_price_amount,
        'manual_override_amount',manual_override_amount,'source_currency',source_currency,
        'confidence',confidence,'fallback_flag',fallback_flag,
        'price_review_status',review_status,'price_status',price_status,
        'configuration_review_status',configuration_review_status,
        'configuration_name',configuration_name,'normalized_key',normalized_key,
        'is_public_candidate',is_public_candidate,'is_sampler',is_sampler,'sort_order',sort_order
      ) order by configuration_price_id) from price_rows
    ),'[]'::jsonb),
    'configurations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'sellable_configuration_id',sellable_configuration_id,
        'canonical_product_id',canonical_product_id,
        'option_mapping_id',option_mapping_id,
        'configuration_name',configuration_name,'normalized_key',normalized_key,
        'is_default_whole_product',is_default_whole_product,
        'is_public_candidate',is_public_candidate,'is_sampler',is_sampler,
        'sort_order',sort_order,'review_status',review_status
      ) order by sellable_configuration_id) from config_rows
    ),'[]'::jsonb)
  ) j
),
counts as (
  select
    (select count(*) from price_rows)::int price_count,
    (select count(*) from config_rows)::int config_count,
    (select count(*) from price_rows
      where configuration_review_status='approved'
        and review_status='approved'
        and price_status in ('approved','owner_reviewed')
        and fallback_flag=false
        and public_price_amount>0
        and source_currency~'^[A-Z]{3}$'
        and is_public_candidate=true
        and is_sampler=false
    )::int strict_ready_count
)
select jsonb_build_object(
  'contract_version','manual_price_lane_governance_v1',
  'price_rows',(select price_count from counts),
  'configuration_rows',(select config_count from counts),
  'strict_ready_rows',(select strict_ready_count from counts),
  'candidate',(
    (select price_count from counts)=6
    and (select config_count from counts)=6
    and (select strict_ready_count from counts)<6
  ),
  'already_ready',((select strict_ready_count from counts)=6),
  'evidence_sha256',encode(extensions.digest(convert_to((select j from material)::text,'UTF8'),'sha256'),'hex'),
  'manual_override_rows',2,
  'source_carry_forward_rows',4,
  'commercial_values_change',false,
  'payment_enabled',false,
  'indexing_enabled',false
);
$$;

create function public.feya_commerce_execute_manual_price_lane_governance_v1(p_execution_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  before_evidence jsonb;
  after_evidence jsonb;
  expected_hash text;
  before_values_hash text;
  after_values_hash text;
  attempt integer;
  updated_configs integer;
  updated_prices integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'manual_price_lane_request_required'; end if;

  select * into req
  from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id
  for update;
  if not found then raise exception 'manual_price_lane_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior
    from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'manual_price_lane_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE'
    or req.mutation_domain<>'COMMERCE_PRICE'
    or req.request_status<>'APPROVED'
    or req.approval_hash is null
    or req.approval_hash<>req.request_hash
    or req.approved_by_user_id is null
    then raise exception 'manual_price_lane_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'manual_price_lane_governance_v1'
    or req.request_payload_json->>'release_ref'<>'feya-review-207-20260924'
    or (req.request_payload_json->>'expected_price_rows')::integer<>6
    or (req.request_payload_json->>'expected_configuration_rows')::integer<>6
    then raise exception 'manual_price_lane_payload_invalid'; end if;

  expected_hash:=req.request_payload_json->>'evidence_sha256';
  if expected_hash is null or expected_hash!~'^[0-9a-f]{64}$'
    then raise exception 'manual_price_lane_payload_invalid'; end if;

  perform 1 from public.feya_commerce_configuration_prices
  where configuration_price_id in (
    'aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid,
    '5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid,
    '26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid,
    '25d14147-338b-4ce9-9254-aa41f6333c00'::uuid,
    '613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid,
    '48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid
  )
  order by configuration_price_id
  for update;

  perform 1 from public.feya_commerce_sellable_configurations
  where sellable_configuration_id in (
    '7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid,
    '16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid,
    'fcc1bf40-861a-4c6f-aa3c-bc2c7bd8e13e'::uuid,
    '017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid,
    '06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid,
    '9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid
  )
  order by sellable_configuration_id
  for update;

  before_evidence:=public.feya_commerce_manual_price_lane_governance_evidence_v1();
  if (before_evidence->>'price_rows')::integer<>6
    or (before_evidence->>'configuration_rows')::integer<>6
    or coalesce((before_evidence->>'candidate')::boolean,false) is not true
    or before_evidence->>'evidence_sha256'<>expected_hash
    then raise exception 'manual_price_lane_evidence_conflict'; end if;

  -- Exact owner/manual price facts must already be present and are preserved, not rewritten.
  if not exists(
    select 1 from public.feya_commerce_configuration_prices
    where configuration_price_id='26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid
      and public_price_amount=460.44 and manual_override_amount=460.44
      and review_status='approved' and price_status='approved'
  ) then raise exception 'manual_price_lane_owner_price_drift'; end if;

  if not exists(
    select 1 from public.feya_commerce_configuration_prices
    where configuration_price_id='48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid
      and source_amount=164.06 and public_price_amount=260.00 and manual_override_amount=260.00
      and review_status='approved' and price_status='owner_reviewed'
  ) then raise exception 'manual_price_lane_owner_price_drift'; end if;

  -- Four unchanged source rows must still equal their public prices.
  if (select count(*) from public.feya_commerce_configuration_prices
      where configuration_price_id in (
        'aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid,
        '5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid,
        '25d14147-338b-4ce9-9254-aa41f6333c00'::uuid,
        '613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid
      )
        and source_amount=public_price_amount
        and manual_override_amount is null
        and confidence>=95
        and fallback_flag=false
        and source_currency='EUR'
      )<>4 then raise exception 'manual_price_lane_source_price_drift'; end if;

  select encode(extensions.digest(convert_to(coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,
    'sellable_configuration_id',sellable_configuration_id,
    'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency
  ) order by configuration_price_id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex')
  into before_values_hash
  from public.feya_commerce_configuration_prices
  where configuration_price_id in (
    'aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid,
    '5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid,
    '26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid,
    '25d14147-338b-4ce9-9254-aa41f6333c00'::uuid,
    '613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid,
    '48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid
  );

  update public.feya_growth_execution_requests_v1
  set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'manual_price_lane_state_conflict'; end if;

  update public.feya_commerce_sellable_configurations
  set review_status='approved',updated_at=now()
  where sellable_configuration_id in (
    '7f0afd2b-8dbd-41a8-a1de-424404d80b95'::uuid,
    '16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid,
    'fcc1bf40-861a-4c6f-aa3c-bc2c7bd8e13e'::uuid,
    '017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid,
    '06f7f6ac-b9a2-477a-b0cb-836017cf7e13'::uuid,
    '9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid
  )
    and review_status in ('not_reviewed','approved');
  get diagnostics updated_configs=row_count;

  update public.feya_commerce_configuration_prices
  set review_status='approved',price_status='approved',updated_at=now()
  where configuration_price_id in (
    'aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid,
    '5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid,
    '25d14147-338b-4ce9-9254-aa41f6333c00'::uuid,
    '613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid
  )
    and source_amount=public_price_amount
    and manual_override_amount is null
    and review_status in ('not_reviewed','approved')
    and price_status in ('draft','approved');
  get diagnostics updated_prices=row_count;

  select encode(extensions.digest(convert_to(coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,
    'sellable_configuration_id',sellable_configuration_id,
    'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency
  ) order by configuration_price_id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex')
  into after_values_hash
  from public.feya_commerce_configuration_prices
  where configuration_price_id in (
    'aefa2c61-c430-4675-9964-9cd1e3f1658e'::uuid,
    '5074ad3c-af6a-4cf7-9624-ce351ee9cafc'::uuid,
    '26274d0c-81c9-44e6-9ce7-c3056c62040c'::uuid,
    '25d14147-338b-4ce9-9254-aa41f6333c00'::uuid,
    '613d93e8-5499-471e-a0e2-e4977d5e2b60'::uuid,
    '48f92e5d-bff1-47ec-89f8-b026b77e3cb9'::uuid
  );

  if before_values_hash<>after_values_hash then
    raise exception 'manual_price_lane_commercial_value_drift';
  end if;

  after_evidence:=public.feya_commerce_manual_price_lane_governance_evidence_v1();
  if (after_evidence->>'strict_ready_rows')::integer<>6
    or coalesce((after_evidence->>'already_ready')::boolean,false) is not true
    then raise exception 'manual_price_lane_postflight_failed'; end if;

  result:=jsonb_build_object(
    'contract_version','manual_price_lane_governance_v1',
    'execution_request_id',p_execution_request_id,
    'release_ref','feya-review-207-20260924',
    'before_evidence_sha256',expected_hash,
    'price_rows',6,'configuration_rows',6,
    'strict_ready_rows',6,
    'updated_source_price_rows',updated_prices,
    'updated_configuration_rows',updated_configs,
    'manual_override_rows_preserved',2,
    'commercial_values_unchanged',true,
    'offer_promotion_enabled',false,'order_creation_enabled',false,
    'payment_enabled',false,'indexing_enabled',false,
    'target_version_refs_after',jsonb_build_object(
      'manual_price_lane_governance','approved',
      'commercial_values_hash',after_values_hash,
      'strict_ready_rows',6
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
    p_execution_request_id,attempt,'SUCCEEDED','manual-price-lane-governance-v1',req.request_hash,
    result,
    jsonb_build_object('strict_ready_rows',6,'commercial_values_unchanged',true,'payment_enabled',false,'indexing_enabled',false),
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
    'feya_commerce_manual_price_lane_governance_evidence_v1()',
    'feya_commerce_execute_manual_price_lane_governance_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_manual_price_lane_governance_evidence_v1() to service_role;
  grant execute on function public.feya_commerce_execute_manual_price_lane_governance_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
