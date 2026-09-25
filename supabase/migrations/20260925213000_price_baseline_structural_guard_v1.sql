-- Fail closed on collapsed configuration identities before any clean-source baseline adoption.
-- Schema/function hardening only: no product/configuration/price row mutation.
begin;

create or replace function public.feya_commerce_price_baseline_structure_health_v1(p_product_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if p_product_ids is null or cardinality(p_product_ids)<1 or cardinality(p_product_ids)>500
    or (select count(distinct x) from unnest(p_product_ids) x)<>cardinality(p_product_ids)
    then raise exception 'price_baseline_structure_request_invalid'; end if;

  with requested as (
    select unnest(p_product_ids) canonical_product_id
  ), rows as (
    select r.canonical_product_id,p.configuration_price_id,p.sellable_configuration_id,p.option_mapping_id,
           c.option_mapping_id configuration_option_mapping_id,
           m.detected_canonical_axis,m.sampler_flag mapping_sampler,m.non_catalog_flag mapping_non_catalog,
           coalesce((
             p.configuration_price_id is not null
             and p.sellable_configuration_id is not null
             and p.option_mapping_id is not null
             and c.sellable_configuration_id is not null
             and c.option_mapping_id is not null
             and c.option_mapping_id=p.option_mapping_id
             and m.option_mapping_id=p.option_mapping_id
             and m.canonical_product_id=p.canonical_product_id
             and m.detected_canonical_axis='configuration'
             and m.sampler_flag is false and m.non_catalog_flag is false
           ),false) structure_ready
    from requested r
    left join public.feya_commerce_configuration_prices p on p.canonical_product_id=r.canonical_product_id
    left join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
    left join public.feya_commerce_option_mappings m
      on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
  ), products as (
    select canonical_product_id,count(configuration_price_id) price_rows,bool_and(structure_ready) ready
    from rows group by canonical_product_id
  ), evidence as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'canonical_product_id',canonical_product_id,'configuration_price_id',configuration_price_id,
      'sellable_configuration_id',sellable_configuration_id,'option_mapping_id',option_mapping_id,
      'configuration_option_mapping_id',configuration_option_mapping_id,
      'detected_canonical_axis',detected_canonical_axis,'structure_ready',structure_ready
    ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
    from rows
  )
  select jsonb_build_object(
    'contract_version','price_baseline_structural_guard_v1',
    'requested_product_count',cardinality(p_product_ids),
    'price_row_count',(select count(configuration_price_id) from rows),
    'ready_row_count',(select count(*) from rows where structure_ready),
    'mapping_mismatch_rows',(select count(*) from rows where configuration_price_id is not null and option_mapping_id is distinct from configuration_option_mapping_id),
    'non_configuration_axis_rows',(select count(*) from rows where configuration_price_id is not null and detected_canonical_axis is distinct from 'configuration'),
    'missing_mapping_rows',(select count(*) from rows where configuration_price_id is not null and option_mapping_id is null),
    'hold_product_count',(select count(*) from products where price_rows=0 or not ready),
    'ready',((select count(*) from products where price_rows=0 or not ready)=0),
    'evidence_sha256',encode(extensions.digest(convert_to((select body from evidence)::text,'UTF8'),'sha256'),'hex'),
    'commercial_values_changed',false
  ) into result;
  return result;
end $$;


create or replace function public.feya_commerce_execute_price_baseline_adoption_v1(p_execution_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  product_ids uuid[];
  preview jsonb;
  structural_health jsonb;
  expected_hash text;
  expected_rows integer;
  updated_prices integer;
  updated_configs integer;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'price_baseline_execution_request_required'; end if;

  select * into req from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id for update;
  if not found then raise exception 'price_baseline_execution_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'price_baseline_execution_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'ADOPT_SOURCE_PRICE_BASELINE'
    or req.request_status<>'APPROVED'
    or req.approval_hash is null or req.approval_hash<>req.request_hash
    or req.approved_by_user_id is null
    then raise exception 'price_baseline_execution_not_approved'; end if;

  if jsonb_typeof(req.request_payload_json->'canonical_product_ids')<>'array'
    or jsonb_array_length(req.request_payload_json->'canonical_product_ids')<1
    then raise exception 'price_baseline_execution_payload_invalid'; end if;

  select array_agg((x.v#>>'{}')::uuid order by (x.v#>>'{}')::uuid)
  into product_ids
  from jsonb_array_elements(req.request_payload_json->'canonical_product_ids') x(v);

  structural_health:=public.feya_commerce_price_baseline_structure_health_v1(product_ids);
  if coalesce((structural_health->>'ready')::boolean,false) is not true
    then raise exception 'price_baseline_structure_not_ready'; end if;

  expected_hash:=req.request_payload_json->>'evidence_sha256';
  expected_rows:=(req.request_payload_json->>'price_row_count')::integer;
  preview:=public.feya_commerce_preview_price_baseline_adoption_v1(product_ids);

  if (preview->>'candidate_product_count')::integer<>cardinality(product_ids)
    or (preview->>'hold_product_count')::integer<>0
    or (preview->>'already_ready_product_count')::integer<>0
    or preview->>'evidence_sha256'<>expected_hash
    or (preview->>'candidate_price_row_count')::integer<>expected_rows
    then raise exception 'price_baseline_execution_evidence_conflict'; end if;

  update public.feya_growth_execution_requests_v1
    set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'price_baseline_execution_state_conflict'; end if;

  update public.feya_commerce_sellable_configurations c
    set review_status='approved',updated_at=now()
  where c.canonical_product_id=any(product_ids)
    and c.is_public_candidate is true and c.is_sampler is false
    and c.review_status in ('not_reviewed','approved')
    and exists(
      select 1
      from public.feya_commerce_configuration_prices p
      join public.feya_commerce_option_mappings m
        on m.option_mapping_id=p.option_mapping_id
       and m.canonical_product_id=p.canonical_product_id
       and m.detected_canonical_axis='configuration'
       and m.sampler_flag is false and m.non_catalog_flag is false
      where p.canonical_product_id=c.canonical_product_id
        and p.sellable_configuration_id=c.sellable_configuration_id
        and p.option_mapping_id=c.option_mapping_id
    );
  get diagnostics updated_configs=row_count;

  update public.feya_commerce_configuration_prices p
    set review_status='approved',price_status='approved',updated_at=now()
  where p.canonical_product_id=any(product_ids)
    and p.option_mapping_id is not null and p.source_price_row_id is not null
    and p.manual_override_amount is null
    and p.source_amount is not null and p.source_amount>0
    and p.public_price_amount=p.source_amount
    and p.confidence>=95 and p.fallback_flag is false
    and p.source_currency~'^[A-Z]{3}$'
    and p.review_status in ('not_reviewed','approved')
    and p.price_status in ('draft','approved')
    and exists(
      select 1
      from public.feya_commerce_sellable_configurations c
      join public.feya_commerce_option_mappings m
        on m.option_mapping_id=p.option_mapping_id
       and m.canonical_product_id=p.canonical_product_id
       and m.detected_canonical_axis='configuration'
       and m.sampler_flag is false and m.non_catalog_flag is false
      where c.sellable_configuration_id=p.sellable_configuration_id
        and c.canonical_product_id=p.canonical_product_id
        and c.option_mapping_id=p.option_mapping_id
        and c.is_public_candidate=true and c.is_sampler=false
    );
  get diagnostics updated_prices=row_count;

  if updated_prices<>expected_rows then raise exception 'price_baseline_execution_row_count_conflict'; end if;

  result:=jsonb_build_object(
    'contract_version','commerce_price_baseline_adoption_v1',
    'execution_request_id',p_execution_request_id,
    'release_ref',req.request_payload_json->>'release_ref',
    'evidence_sha256',expected_hash,
    'product_count',cardinality(product_ids),
    'price_row_count',expected_rows,
    'updated_price_rows',updated_prices,'updated_configuration_rows',updated_configs,
    'manual_overrides_included',false,
    'offer_promotion_enabled',false,'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false,
    'target_version_refs_after',jsonb_build_object(
      'price_baseline_evidence_sha256',expected_hash,
      'price_review_status','approved','price_status','approved','configuration_review_status','approved'
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
    p_execution_request_id,attempt,'SUCCEEDED','price-baseline-adoption-v1',req.request_hash,
    result,
    jsonb_build_object('exact_row_count',updated_prices,'evidence_sha256',expected_hash,'payment_enabled',false,'indexing_enabled',false),
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
    'feya_commerce_price_baseline_structure_health_v1(uuid[])',
    'feya_commerce_execute_price_baseline_adoption_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_price_baseline_structure_health_v1(uuid[]) to service_role;
  grant execute on function public.feya_commerce_execute_price_baseline_adoption_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
