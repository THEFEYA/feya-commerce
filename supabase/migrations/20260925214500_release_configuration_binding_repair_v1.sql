-- Catalog-wide repair of release price-row -> sellable-configuration identity bindings.
-- Installs evidence and approval-gated execution only. Schema apply does NOT rebind any price row.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','REPAIR_RELEASE_CONFIGURATION_BINDINGS','Repair release configuration bindings','CPIM',
  'AVAILABLE_WITH_LIMITATIONS','release_207_configuration_axis_only',
  'Repairs exact configuration-axis price rows whose source option mapping and sellable configuration identity disagree.',
  'Does not alter prices, currencies or owner overrides. Color-priced products remain a separate hold lane.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"EXECUTION_GATEWAY","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"indexation_mutation":false,"payment":false,"order_creation":false,"contract_version":"release_configuration_binding_repair_v1"}'::jsonb,
  '{"release_ref":"feya-review-207-20260924","release_products":207,"price_rows":856,"configuration_axis_rows":846,"expected_rebind_rows":631,"color_price_axis_rows":9}'::jsonb,
  1,true
)
on conflict (registry_type,item_code,version_no) do update set
  item_name=excluded.item_name,owner_role=excluded.owner_role,item_state=excluded.item_state,
  implementation_state=excluded.implementation_state,public_summary=excluded.public_summary,
  limitations_summary=excluded.limitations_summary,config_json=excluded.config_json,
  evidence_json=excluded.evidence_json,active_flag=excluded.active_flag,updated_at=now();

create or replace function public.feya_commerce_binding_target_configuration_id_v1(
  p_canonical_product_id uuid,p_option_mapping_id uuid
) returns uuid
language sql immutable set search_path='' as $$
select case p_option_mapping_id
  when 'e2792946-b1d4-45e8-8026-cfca80be7778'::uuid then '16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid
  when '5c8ad41e-e5a6-4ded-ab1e-ef376ae59226'::uuid then '017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid
  when '41149ec4-0681-47af-9030-cc6d529321ba'::uuid then '9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid
  else extensions.uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'thefeya:release-config-binding-v1:'||p_canonical_product_id::text||':'||p_option_mapping_id::text
  )
end
$$;

create or replace function public.feya_commerce_release_configuration_binding_evidence_v1(
  p_product_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if p_product_ids is null or cardinality(p_product_ids)<>207
    or (select count(distinct x) from unnest(p_product_ids) x)<>207
    then raise exception 'release_configuration_binding_scope_invalid'; end if;

  with requested as (
    select unnest(p_product_ids) canonical_product_id
  ), rows as (
    select r.canonical_product_id,p.configuration_price_id,p.sellable_configuration_id,p.option_mapping_id,
      p.source_price_row_id,p.source_amount,p.public_price_amount,p.manual_override_amount,p.source_currency,
      p.confidence,p.fallback_flag,p.review_status price_review_status,p.price_status,
      m.detected_canonical_axis,m.raw_option_name,m.raw_option_value,m.canonical_option_value,
      m.component_family_id,m.sampler_flag mapping_sampler,m.non_catalog_flag mapping_non_catalog,
      c.option_mapping_id configuration_option_mapping_id,c.configuration_name,c.normalized_key,
      c.review_status configuration_review_status,c.is_public_candidate,c.is_sampler,c.sort_order,
      public.feya_commerce_binding_target_configuration_id_v1(r.canonical_product_id,p.option_mapping_id) target_configuration_id
    from requested r
    left join public.feya_commerce_configuration_prices p on p.canonical_product_id=r.canonical_product_id
    left join public.feya_commerce_option_mappings m
      on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
    left join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
  ), classified as (
    select *,
      (detected_canonical_axis='configuration') configuration_axis,
      (detected_canonical_axis='color') color_axis,
      (option_mapping_id is null and manual_override_amount is not null) direct_owner_row,
      (detected_canonical_axis='configuration' and option_mapping_id is not null
        and option_mapping_id is distinct from configuration_option_mapping_id) requires_rebind
    from rows
  ), target_check as (
    select x.*,
      t.canonical_product_id target_existing_product_id,
      t.option_mapping_id target_existing_mapping_id,
      t.normalized_key target_existing_normalized_key
    from classified x
    left join public.feya_commerce_sellable_configurations t
      on t.sellable_configuration_id=x.target_configuration_id
  ), material as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'canonical_product_id',canonical_product_id,'configuration_price_id',configuration_price_id,
      'sellable_configuration_id',sellable_configuration_id,'option_mapping_id',option_mapping_id,
      'configuration_option_mapping_id',configuration_option_mapping_id,'detected_canonical_axis',detected_canonical_axis,
      'raw_option_value',raw_option_value,'canonical_option_value',canonical_option_value,
      'source_amount',source_amount,'public_price_amount',public_price_amount,'manual_override_amount',manual_override_amount,
      'source_currency',source_currency,'price_review_status',price_review_status,'price_status',price_status,
      'requires_rebind',requires_rebind,'target_configuration_id',target_configuration_id
    ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
    from target_check
  )
  select jsonb_build_object(
    'contract_version','release_configuration_binding_repair_v1',
    'release_ref','feya-review-207-20260924',
    'release_product_count',cardinality(p_product_ids),
    'price_row_count',(select count(configuration_price_id) from target_check),
    'configuration_axis_rows',(select count(*) from target_check where configuration_axis),
    'aligned_configuration_rows',(select count(*) from target_check where configuration_axis and not requires_rebind),
    'rebind_rows',(select count(*) from target_check where requires_rebind),
    'create_configuration_rows',(select count(*) from target_check where requires_rebind and target_existing_product_id is null),
    'target_collision_rows',(select count(*) from target_check where requires_rebind and target_existing_product_id is not null
       and (target_existing_product_id<>canonical_product_id or target_existing_mapping_id is distinct from option_mapping_id)),
    'color_price_axis_rows',(select count(*) from target_check where color_axis),
    'color_price_product_count',(select count(distinct canonical_product_id) from target_check where color_axis),
    'direct_owner_rows',(select count(*) from target_check where direct_owner_row),
    'unsupported_axis_rows',(select count(*) from target_check
       where configuration_price_id is not null and not configuration_axis and not color_axis and not direct_owner_row),
    'missing_mapping_rows',(select count(*) from target_check where configuration_price_id is not null and option_mapping_id is null and not direct_owner_row),
    'candidate',(
      (select count(configuration_price_id) from target_check)=856
      and (select count(*) from target_check where configuration_axis)=846
      and (select count(*) from target_check where requires_rebind)=631
      and (select count(*) from target_check where requires_rebind and target_existing_product_id is null)=631
      and (select count(*) from target_check where requires_rebind and target_existing_product_id is not null
           and (target_existing_product_id<>canonical_product_id or target_existing_mapping_id is distinct from option_mapping_id))=0
      and (select count(*) from target_check where color_axis)=9
      and (select count(*) from target_check where direct_owner_row)=1
      and (select count(*) from target_check
           where configuration_price_id is not null and not configuration_axis and not color_axis and not direct_owner_row)=0
      and (select count(*) from target_check where configuration_price_id is not null and option_mapping_id is null and not direct_owner_row)=0
    ),
    'already_repaired',(
      (select count(configuration_price_id) from target_check)=856
      and (select count(*) from target_check where configuration_axis)=846
      and (select count(*) from target_check where requires_rebind)=0
      and (select count(*) from target_check where color_axis)=9
      and (select count(*) from target_check where direct_owner_row)=1
    ),
    'evidence_sha256',encode(extensions.digest(convert_to((select body from material)::text,'UTF8'),'sha256'),'hex'),
    'commercial_values_change',false,'payment_enabled',false,'indexing_enabled',false
  ) into result;
  return result;
end $$;

create or replace function public.feya_commerce_execute_release_configuration_binding_repair_v1(
  p_execution_request_id uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  product_ids uuid[];
  before_evidence jsonb;
  after_evidence jsonb;
  expected_hash text;
  before_values_hash text;
  after_values_hash text;
  rollback_bindings jsonb;
  created_configuration_ids jsonb;
  inserted_configs integer;
  rebound_rows integer;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'release_configuration_binding_request_required'; end if;

  select * into req from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id for update;
  if not found then raise exception 'release_configuration_binding_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'release_configuration_binding_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'REPAIR_RELEASE_CONFIGURATION_BINDINGS'
    or req.mutation_domain<>'COMMERCE_CONFIGURATION'
    or req.request_status<>'APPROVED'
    or req.approval_hash is null or req.approval_hash<>req.request_hash
    or req.approved_by_user_id is null
    then raise exception 'release_configuration_binding_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'release_configuration_binding_repair_v1'
    or req.request_payload_json->>'release_ref'<>'feya-review-207-20260924'
    or jsonb_typeof(req.request_payload_json->'canonical_product_ids')<>'array'
    or jsonb_array_length(req.request_payload_json->'canonical_product_ids')<>207
    or (req.request_payload_json->>'expected_price_rows')::integer<>856
    or (req.request_payload_json->>'expected_configuration_axis_rows')::integer<>846
    or (req.request_payload_json->>'expected_rebind_rows')::integer<>631
    or (req.request_payload_json->>'expected_create_configurations')::integer<>631
    then raise exception 'release_configuration_binding_payload_invalid'; end if;

  select array_agg((x.v#>>'{}')::uuid order by (x.v#>>'{}')::uuid) into product_ids
  from jsonb_array_elements(req.request_payload_json->'canonical_product_ids') x(v);
  if cardinality(product_ids)<>207 or (select count(distinct x) from unnest(product_ids) x)<>207
    then raise exception 'release_configuration_binding_payload_invalid'; end if;

  expected_hash:=req.request_payload_json->>'evidence_sha256';
  if expected_hash is null or expected_hash!~'^[0-9a-f]{64}$'
    then raise exception 'release_configuration_binding_payload_invalid'; end if;

  perform 1 from public.feya_commerce_configuration_prices
    where canonical_product_id=any(product_ids)
    order by canonical_product_id,configuration_price_id for update;
  perform 1 from public.feya_commerce_sellable_configurations
    where canonical_product_id=any(product_ids)
    order by canonical_product_id,sellable_configuration_id for update;

  before_evidence:=public.feya_commerce_release_configuration_binding_evidence_v1(product_ids);
  if coalesce((before_evidence->>'candidate')::boolean,false) is not true
    or before_evidence->>'evidence_sha256'<>expected_hash
    then raise exception 'release_configuration_binding_evidence_conflict'; end if;

  select encode(extensions.digest(convert_to(coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,'canonical_product_id',canonical_product_id,
    'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency,
    'confidence',confidence,'fallback_flag',fallback_flag,'sampler_excluded_flag',sampler_excluded_flag,
    'review_status',review_status,'price_status',price_status
  ) order by canonical_product_id,configuration_price_id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex')
  into before_values_hash
  from public.feya_commerce_configuration_prices where canonical_product_id=any(product_ids);

  select coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',p.configuration_price_id,
    'canonical_product_id',p.canonical_product_id,
    'option_mapping_id',p.option_mapping_id,
    'old_sellable_configuration_id',p.sellable_configuration_id,
    'target_sellable_configuration_id',public.feya_commerce_binding_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id)
  ) order by p.canonical_product_id,p.configuration_price_id),'[]'::jsonb)
  into rollback_bindings
  from public.feya_commerce_configuration_prices p
  join public.feya_commerce_option_mappings m
    on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
  left join public.feya_commerce_sellable_configurations c
    on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
  where p.canonical_product_id=any(product_ids)
    and m.detected_canonical_axis='configuration'
    and p.option_mapping_id is distinct from c.option_mapping_id;

  if jsonb_array_length(rollback_bindings)<>631 then
    raise exception 'release_configuration_binding_rollback_capture_conflict';
  end if;

  update public.feya_growth_execution_requests_v1 set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'release_configuration_binding_state_conflict'; end if;

  with repair_rows as (
    select p.canonical_product_id,p.configuration_price_id,p.option_mapping_id,
      p.sellable_configuration_id old_configuration_id,m.component_family_id,
      coalesce(nullif(btrim(m.canonical_option_value),''),nullif(btrim(m.raw_option_value),''),'Configuration') configuration_name,
      m.canonical_option_value,m.raw_option_value,m.sampler_flag,m.non_catalog_flag,
      c.sort_order,
      public.feya_commerce_binding_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id) target_configuration_id
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m
      on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
    left join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
    where p.canonical_product_id=any(product_ids)
      and m.detected_canonical_axis='configuration'
      and p.option_mapping_id is distinct from c.option_mapping_id
  ), distinct_targets as (
    select distinct on(canonical_product_id,option_mapping_id)
      canonical_product_id,option_mapping_id,component_family_id,configuration_name,
      canonical_option_value,raw_option_value,sampler_flag,non_catalog_flag,sort_order,target_configuration_id
    from repair_rows order by canonical_product_id,option_mapping_id,configuration_price_id
  )
  insert into public.feya_commerce_sellable_configurations(
    sellable_configuration_id,canonical_product_id,option_mapping_id,component_family_id,
    configuration_name,normalized_key,is_default_whole_product,is_sampler,is_public_candidate,
    sort_order,review_status,notes
  )
  select target_configuration_id,canonical_product_id,option_mapping_id,component_family_id,
    configuration_name,
    'binding_'||replace(option_mapping_id::text,'-',''),
    coalesce(canonical_option_value,raw_option_value,'')~*'(полный[[:space:]]*комплект|full[[:space:]]*set|complete[[:space:]]*set)',
    coalesce(sampler_flag,false),
    not coalesce(sampler_flag,false) and not coalesce(non_catalog_flag,false),
    coalesce(sort_order,1000),
    'not_reviewed',
    'Catalog-wide deterministic configuration identity repair v1; price/currency/owner overrides unchanged.'
  from distinct_targets
  on conflict (sellable_configuration_id) do nothing;
  get diagnostics inserted_configs=row_count;
  if inserted_configs<>631 then raise exception 'release_configuration_binding_insert_count_conflict'; end if;

  select coalesce(jsonb_agg((x->>'target_sellable_configuration_id')::uuid order by (x->>'target_sellable_configuration_id')::uuid),'[]'::jsonb)
  into created_configuration_ids
  from jsonb_array_elements(rollback_bindings) x;

  with repair_rows as (
    select p.configuration_price_id,
      public.feya_commerce_binding_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id) target_configuration_id
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m
      on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
    left join public.feya_commerce_sellable_configurations oldc
      on oldc.sellable_configuration_id=p.sellable_configuration_id and oldc.canonical_product_id=p.canonical_product_id
    where p.canonical_product_id=any(product_ids)
      and m.detected_canonical_axis='configuration'
      and p.option_mapping_id is distinct from oldc.option_mapping_id
  )
  update public.feya_commerce_configuration_prices p
    set sellable_configuration_id=r.target_configuration_id,updated_at=now()
  from repair_rows r
  where p.configuration_price_id=r.configuration_price_id;
  get diagnostics rebound_rows=row_count;
  if rebound_rows<>631 then raise exception 'release_configuration_binding_rebind_count_conflict'; end if;

  select encode(extensions.digest(convert_to(coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,'canonical_product_id',canonical_product_id,
    'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency,
    'confidence',confidence,'fallback_flag',fallback_flag,'sampler_excluded_flag',sampler_excluded_flag,
    'review_status',review_status,'price_status',price_status
  ) order by canonical_product_id,configuration_price_id),'[]'::jsonb)::text,'UTF8'),'sha256'),'hex')
  into after_values_hash
  from public.feya_commerce_configuration_prices where canonical_product_id=any(product_ids);

  if before_values_hash<>after_values_hash then raise exception 'release_configuration_binding_commercial_value_drift'; end if;

  after_evidence:=public.feya_commerce_release_configuration_binding_evidence_v1(product_ids);
  if coalesce((after_evidence->>'already_repaired')::boolean,false) is not true
    or (after_evidence->>'configuration_axis_rows')::integer<>846
    or (after_evidence->>'rebind_rows')::integer<>0
    or (after_evidence->>'color_price_axis_rows')::integer<>9
    or (after_evidence->>'direct_owner_rows')::integer<>1
    then raise exception 'release_configuration_binding_postflight_failed'; end if;

  result:=jsonb_build_object(
    'contract_version','release_configuration_binding_repair_v1',
    'execution_request_id',p_execution_request_id,'release_ref','feya-review-207-20260924',
    'before_evidence_sha256',expected_hash,'release_products',207,'price_rows',856,
    'configuration_axis_rows',846,'created_configurations',inserted_configs,'rebound_price_rows',rebound_rows,
    'color_price_axis_rows_held',9,'direct_owner_rows_preserved',1,
    'commercial_values_unchanged',true,'payment_enabled',false,'indexing_enabled',false,'replayed',false
  );

  select coalesce(max(attempt_no),0)+1 into attempt
  from public.feya_growth_execution_receipts_v1 where execution_request_id=p_execution_request_id;

  insert into public.feya_growth_execution_receipts_v1(
    execution_request_id,attempt_no,receipt_status,executor_id,request_hash,
    result_json,postflight_result_json,rollback_result_json,completed_at
  ) values(
    p_execution_request_id,attempt,'SUCCEEDED','release-configuration-binding-repair-v1',req.request_hash,
    result,
    jsonb_build_object('aligned_configuration_rows',846,'rebind_rows',0,'commercial_values_unchanged',true,
      'color_price_axis_rows_held',9,'payment_enabled',false,'indexing_enabled',false),
    jsonb_build_object(
      'mode','restore_sellable_configuration_bindings',
      'binding_count',jsonb_array_length(rollback_bindings),
      'bindings',rollback_bindings,
      'created_configuration_ids',created_configuration_ids,
      'commercial_values_unchanged',true,
      'delete_created_configurations_automatically',false
    ),now()
  );

  update public.feya_growth_execution_requests_v1 set request_status='SUCCEEDED',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='EXECUTING';
  if not found then raise exception 'release_configuration_binding_state_conflict'; end if;

  return result;
end $$;

do $$
declare p text;
begin
  foreach p in array array[
    'feya_commerce_binding_target_configuration_id_v1(uuid,uuid)',
    'feya_commerce_release_configuration_binding_evidence_v1(uuid[])',
    'feya_commerce_execute_release_configuration_binding_repair_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_binding_target_configuration_id_v1(uuid,uuid) to service_role;
  grant execute on function public.feya_commerce_release_configuration_binding_evidence_v1(uuid[]) to service_role;
  grant execute on function public.feya_commerce_execute_release_configuration_binding_repair_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
