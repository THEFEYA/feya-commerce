-- Catalog-wide sellable-configuration identity repair for the sealed 207-product release.
-- Installs evidence + approval-gated execution only. Applying this migration does not repair data by itself.
begin;

create or replace function public.feya_commerce_release_configuration_target_id_v1(
  p_product_id uuid,
  p_option_mapping_id uuid
) returns uuid
language sql immutable set search_path='' as $$
  select case p_option_mapping_id
    -- Preserve the already-reviewed two-product manual-lane target identities.
    when 'e2792946-b1d4-45e8-8026-cfca80be7778'::uuid then '16832d7d-3d43-4384-a09a-ebe847f46f33'::uuid
    when '5c8ad41e-e5a6-4ded-ab1e-ef376ae59226'::uuid then '017451ec-bb37-4ad9-a307-9a59de3412c0'::uuid
    when '41149ec4-0681-47af-9030-cc6d529321ba'::uuid then '9b90382e-cacc-4f29-b2e3-8c7d71ce1dea'::uuid
    else extensions.uuid_generate_v5(
      '6e0654f2-6f0d-4f30-b226-51deeaab58f4'::uuid,
      p_product_id::text||':'||p_option_mapping_id::text
    )
  end
$$;

create or replace function public.feya_commerce_release_configuration_repair_evidence_v1(
  p_product_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  result jsonb;
begin
  if p_product_ids is null or cardinality(p_product_ids)<1 or cardinality(p_product_ids)>500
    or (select count(distinct x) from unnest(p_product_ids) x)<>cardinality(p_product_ids)
    then raise exception 'release_configuration_repair_request_invalid'; end if;

  with requested as (
    select unnest(p_product_ids) canonical_product_id
  ), rows as (
    select
      r.canonical_product_id,
      p.configuration_price_id,p.sellable_configuration_id,p.option_mapping_id,p.source_price_row_id,
      p.source_amount,p.public_price_amount,p.manual_override_amount,p.source_currency,p.confidence,
      p.fallback_flag,p.sampler_excluded_flag,p.review_status price_review_status,p.price_status,
      c.option_mapping_id current_configuration_mapping_id,c.configuration_name current_configuration_name,
      c.normalized_key current_normalized_key,c.review_status configuration_review_status,
      m.detected_canonical_axis,m.canonical_option_value,m.raw_option_value,m.component_family_id,
      m.sampler_flag,m.non_catalog_flag,
      case when m.detected_canonical_axis='configuration' and p.option_mapping_id is not null
        then public.feya_commerce_release_configuration_target_id_v1(p.canonical_product_id,p.option_mapping_id)
        else null end target_configuration_id,
      target.sellable_configuration_id existing_target_configuration_id,
      target.option_mapping_id existing_target_mapping_id
    from requested r
    left join public.feya_commerce_configuration_prices p
      on p.canonical_product_id=r.canonical_product_id
    left join public.feya_commerce_sellable_configurations c
      on c.canonical_product_id=p.canonical_product_id
     and c.sellable_configuration_id=p.sellable_configuration_id
    left join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id
     and m.option_mapping_id=p.option_mapping_id
    left join public.feya_commerce_sellable_configurations target
      on target.canonical_product_id=p.canonical_product_id
     and target.option_mapping_id=p.option_mapping_id
  ), material as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'canonical_product_id',canonical_product_id,
      'configuration_price_id',configuration_price_id,
      'sellable_configuration_id',sellable_configuration_id,
      'option_mapping_id',option_mapping_id,
      'source_price_row_id',source_price_row_id,
      'source_amount',source_amount,'public_price_amount',public_price_amount,
      'manual_override_amount',manual_override_amount,'source_currency',source_currency,
      'confidence',confidence,'fallback_flag',fallback_flag,'sampler_excluded_flag',sampler_excluded_flag,
      'price_review_status',price_review_status,'price_status',price_status,
      'current_configuration_mapping_id',current_configuration_mapping_id,
      'current_configuration_name',current_configuration_name,'current_normalized_key',current_normalized_key,
      'configuration_review_status',configuration_review_status,
      'detected_canonical_axis',detected_canonical_axis,'canonical_option_value',canonical_option_value,
      'raw_option_value',raw_option_value,'component_family_id',component_family_id,
      'sampler_flag',sampler_flag,'non_catalog_flag',non_catalog_flag,
      'target_configuration_id',target_configuration_id,
      'existing_target_configuration_id',existing_target_configuration_id,
      'existing_target_mapping_id',existing_target_mapping_id
    ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
    from rows
  ), commercial as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'configuration_price_id',configuration_price_id,
      'source_amount',source_amount,'public_price_amount',public_price_amount,
      'manual_override_amount',manual_override_amount,'source_currency',source_currency
    ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
    from rows where configuration_price_id is not null
  )
  select jsonb_build_object(
    'contract_version','release_configuration_binding_repair_v1',
    'requested_product_count',cardinality(p_product_ids),
    'price_row_count',(select count(configuration_price_id) from rows),
    'configuration_axis_rows',(select count(*) from rows where detected_canonical_axis='configuration'),
    'aligned_configuration_rows',(select count(*) from rows where detected_canonical_axis='configuration' and option_mapping_id=current_configuration_mapping_id),
    'rebind_rows',(select count(*) from rows where detected_canonical_axis='configuration' and option_mapping_id is distinct from current_configuration_mapping_id),
    'create_configuration_count',(select count(*) from rows where detected_canonical_axis='configuration' and option_mapping_id is distinct from current_configuration_mapping_id and existing_target_configuration_id is null),
    'color_price_rows',(select count(*) from rows where detected_canonical_axis='color'),
    'color_price_products',(select count(distinct canonical_product_id) from rows where detected_canonical_axis='color'),
    'direct_price_rows',(select count(*) from rows where configuration_price_id is not null and option_mapping_id is null),
    'unsupported_axis_rows',(select count(*) from rows where configuration_price_id is not null and option_mapping_id is not null and detected_canonical_axis not in ('configuration','color')),
    'target_conflicts',(select count(*) from rows where target_configuration_id is not null and existing_target_configuration_id is not null and existing_target_configuration_id<>target_configuration_id),
    'candidate',(
      (select count(configuration_price_id) from rows)>0
      and (select count(*) from rows where configuration_price_id is not null and option_mapping_id is not null and detected_canonical_axis not in ('configuration','color'))=0
      and (select count(*) from rows where target_configuration_id is not null and existing_target_configuration_id is not null and existing_target_configuration_id<>target_configuration_id)=0
      and (select count(*) from rows where detected_canonical_axis='configuration' and option_mapping_id is distinct from current_configuration_mapping_id)>0
    ),
    'already_repaired',(
      (select count(*) from rows where detected_canonical_axis='configuration' and option_mapping_id is distinct from current_configuration_mapping_id)=0
    ),
    'evidence_sha256',encode(extensions.digest(convert_to((select body from material)::text,'UTF8'),'sha256'),'hex'),
    'commercial_values_sha256',encode(extensions.digest(convert_to((select body from commercial)::text,'UTF8'),'sha256'),'hex'),
    'commercial_values_change',false,'payment_enabled',false,'indexing_enabled',false
  ) into result;

  return result;
end $$;

create or replace function public.feya_commerce_execute_release_configuration_repair_v1(
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
  expected_commercial_hash text;
  before_commercial_hash text;
  after_commercial_hash text;
  created_configs integer;
  rebound_prices integer;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'release_configuration_repair_request_required'; end if;

  select * into req
  from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id
  for update;
  if not found then raise exception 'release_configuration_repair_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior
    from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'release_configuration_repair_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'REPAIR_RELEASE_CONFIGURATION_BINDINGS'
    or req.mutation_domain<>'COMMERCE_CONFIGURATION'
    or req.request_status<>'APPROVED'
    or req.approval_hash is null
    or req.approval_hash<>req.request_hash
    or req.approved_by_user_id is null
    then raise exception 'release_configuration_repair_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'release_configuration_binding_repair_v1'
    or req.request_payload_json->>'release_ref'<>'feya-review-207-20260924'
    or jsonb_typeof(req.request_payload_json->'canonical_product_ids')<>'array'
    then raise exception 'release_configuration_repair_payload_invalid'; end if;

  select array_agg((x.v#>>'{}')::uuid order by (x.v#>>'{}')::uuid)
  into product_ids
  from jsonb_array_elements(req.request_payload_json->'canonical_product_ids') x(v);

  if cardinality(product_ids)<>207
    or (req.request_payload_json->>'expected_price_rows')::integer<>856
    or (req.request_payload_json->>'expected_configuration_axis_rows')::integer<>846
    or (req.request_payload_json->>'expected_rebind_rows')::integer<>631
    or (req.request_payload_json->>'expected_create_configurations')::integer<>631
    or (req.request_payload_json->>'expected_color_price_rows')::integer<>9
    or (req.request_payload_json->>'expected_direct_price_rows')::integer<>1
    then raise exception 'release_configuration_repair_payload_invalid'; end if;

  expected_hash:=req.request_payload_json->>'evidence_sha256';
  expected_commercial_hash:=req.request_payload_json->>'commercial_values_sha256';
  if expected_hash is null or expected_hash!~'^[0-9a-f]{64}$'
    or expected_commercial_hash is null or expected_commercial_hash!~'^[0-9a-f]{64}$'
    then raise exception 'release_configuration_repair_payload_invalid'; end if;

  -- No binding rewrite is allowed once downstream immutable commerce identities exist.
  if exists(select 1 from public.feya_commerce_variant_identities_v1 where canonical_product_id=any(product_ids))
    or exists(select 1 from public.feya_commerce_offer_variant_items_v1 where canonical_product_id=any(product_ids))
    or exists(select 1 from public.feya_commerce_quote_receipts_v1 where canonical_product_id=any(product_ids))
    then raise exception 'release_configuration_repair_downstream_state_exists'; end if;

  perform 1 from public.feya_commerce_option_mappings
  where canonical_product_id=any(product_ids)
  order by canonical_product_id,option_mapping_id
  for share;

  perform 1 from public.feya_commerce_configuration_prices
  where canonical_product_id=any(product_ids)
  order by canonical_product_id,configuration_price_id
  for update;

  perform 1 from public.feya_commerce_sellable_configurations
  where canonical_product_id=any(product_ids)
  order by canonical_product_id,sellable_configuration_id
  for update;

  before_evidence:=public.feya_commerce_release_configuration_repair_evidence_v1(product_ids);
  if coalesce((before_evidence->>'candidate')::boolean,false) is not true
    or (before_evidence->>'price_row_count')::integer<>856
    or (before_evidence->>'configuration_axis_rows')::integer<>846
    or (before_evidence->>'rebind_rows')::integer<>631
    or (before_evidence->>'create_configuration_count')::integer<>631
    or (before_evidence->>'color_price_rows')::integer<>9
    or (before_evidence->>'direct_price_rows')::integer<>1
    or before_evidence->>'evidence_sha256'<>expected_hash
    or before_evidence->>'commercial_values_sha256'<>expected_commercial_hash
    then raise exception 'release_configuration_repair_evidence_conflict'; end if;

  before_commercial_hash:=before_evidence->>'commercial_values_sha256';

  update public.feya_growth_execution_requests_v1
  set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'release_configuration_repair_state_conflict'; end if;

  with candidates as (
    select
      p.canonical_product_id,p.option_mapping_id,m.component_family_id,
      coalesce(nullif(btrim(m.canonical_option_value),''),nullif(btrim(m.raw_option_value),''),'Configuration') configuration_name,
      public.feya_commerce_release_configuration_target_id_v1(p.canonical_product_id,p.option_mapping_id) target_id,
      row_number() over(partition by p.canonical_product_id order by p.configuration_price_id) seq
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id
     and m.option_mapping_id=p.option_mapping_id
     and m.detected_canonical_axis='configuration'
     and m.sampler_flag=false and m.non_catalog_flag=false
    left join public.feya_commerce_sellable_configurations c
      on c.canonical_product_id=p.canonical_product_id
     and c.option_mapping_id=p.option_mapping_id
    where p.canonical_product_id=any(product_ids)
      and c.sellable_configuration_id is null
  )
  insert into public.feya_commerce_sellable_configurations(
    sellable_configuration_id,canonical_product_id,option_mapping_id,component_family_id,
    configuration_name,normalized_key,is_default_whole_product,is_sampler,is_public_candidate,
    sort_order,review_status,notes
  )
  select
    target_id,canonical_product_id,option_mapping_id,component_family_id,
    configuration_name,'mapping_'||replace(option_mapping_id::text,'-',''),
    false,false,true,(1000+seq)::integer,'not_reviewed',
    'Catalog-wide deterministic option-mapping split; commercial values unchanged; governance remains separate.'
  from candidates
  order by canonical_product_id,option_mapping_id;
  get diagnostics created_configs=row_count;

  if created_configs<>631 then raise exception 'release_configuration_repair_create_count_conflict'; end if;

  update public.feya_commerce_configuration_prices p
  set sellable_configuration_id=target.sellable_configuration_id,updated_at=now()
  from public.feya_commerce_option_mappings m
  join public.feya_commerce_sellable_configurations target
    on target.canonical_product_id=m.canonical_product_id
   and target.option_mapping_id=m.option_mapping_id
  where p.canonical_product_id=any(product_ids)
    and p.canonical_product_id=m.canonical_product_id
    and p.option_mapping_id=m.option_mapping_id
    and m.detected_canonical_axis='configuration'
    and m.sampler_flag=false and m.non_catalog_flag=false
    and p.sellable_configuration_id is distinct from target.sellable_configuration_id;
  get diagnostics rebound_prices=row_count;

  if rebound_prices<>631 then raise exception 'release_configuration_repair_rebind_count_conflict'; end if;

  after_evidence:=public.feya_commerce_release_configuration_repair_evidence_v1(product_ids);
  after_commercial_hash:=after_evidence->>'commercial_values_sha256';

  if coalesce((after_evidence->>'already_repaired')::boolean,false) is not true
    or (after_evidence->>'rebind_rows')::integer<>0
    or (after_evidence->>'configuration_axis_rows')::integer<>846
    or (after_evidence->>'aligned_configuration_rows')::integer<>846
    or (after_evidence->>'color_price_rows')::integer<>9
    or (after_evidence->>'direct_price_rows')::integer<>1
    then raise exception 'release_configuration_repair_postflight_failed'; end if;

  if before_commercial_hash<>after_commercial_hash or after_commercial_hash<>expected_commercial_hash
    then raise exception 'release_configuration_repair_commercial_value_drift'; end if;

  result:=jsonb_build_object(
    'contract_version','release_configuration_binding_repair_v1',
    'execution_request_id',p_execution_request_id,
    'release_ref','feya-review-207-20260924',
    'product_count',207,'price_rows',856,'configuration_axis_rows',846,
    'created_configurations',created_configs,'rebound_price_rows',rebound_prices,
    'color_price_rows_held',9,'direct_owner_price_rows_preserved',1,
    'commercial_values_unchanged',true,
    'commercial_values_sha256',after_commercial_hash,
    'price_governance_changed',false,'order_creation_enabled',false,
    'payment_enabled',false,'indexing_enabled',false,'replayed',false
  );

  select coalesce(max(attempt_no),0)+1 into attempt
  from public.feya_growth_execution_receipts_v1
  where execution_request_id=p_execution_request_id;

  insert into public.feya_growth_execution_receipts_v1(
    execution_request_id,attempt_no,receipt_status,executor_id,request_hash,
    result_json,postflight_result_json,rollback_result_json,completed_at
  ) values(
    p_execution_request_id,attempt,'SUCCEEDED','release-configuration-repair-v1',req.request_hash,
    result,
    jsonb_build_object(
      'configuration_axis_rows',846,'aligned_configuration_rows',846,
      'commercial_values_unchanged',true,'color_price_rows_held',9,
      'payment_enabled',false,'indexing_enabled',false
    ),
    jsonb_build_object('mode','compensating_rebind_from_execution_evidence','never_delete_audit_history',true),
    now()
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
    'feya_commerce_release_configuration_target_id_v1(uuid,uuid)',
    'feya_commerce_release_configuration_repair_evidence_v1(uuid[])',
    'feya_commerce_execute_release_configuration_repair_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_release_configuration_target_id_v1(uuid,uuid) to service_role;
  grant execute on function public.feya_commerce_release_configuration_repair_evidence_v1(uuid[]) to service_role;
  grant execute on function public.feya_commerce_execute_release_configuration_repair_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
