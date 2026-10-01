-- C4.3-E2: exact clean-source price baseline adoption through Execution Gateway.
-- Unapplied by default. No offer publication, order creation, payment or indexing activation.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','ADOPT_SOURCE_PRICE_BASELINE','Adopt source price baseline','CPIM',
  'AVAILABLE_WITH_LIMITATIONS','internal_price_baseline_adoption_only',
  'Approve unchanged high-confidence source prices and their sellable configurations as the commerce baseline.',
  'Only exact source=public rows with source provenance, confidence >=95, no fallback and no manual override are eligible. No offer, order, payment or index activation.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"EXECUTION_GATEWAY","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"order_creation":false,"payment":false,"contract_version":"commerce_price_baseline_adoption_v1"}'::jsonb,
  '{"source":"C4_3_E1_Price_Baseline_Audit_20260925.md","release_ref":"feya-review-207-20260924","manual_override_policy":"separate_owner_review"}'::jsonb,
  1,true
);

create function public.feya_commerce_preview_price_baseline_adoption_v1(p_product_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  evidence jsonb;
  evidence_sha text;
  candidates jsonb;
  ready_ids jsonb;
  hold_ids jsonb;
  candidate_rows integer;
begin
  if p_product_ids is null or cardinality(p_product_ids)<1 or cardinality(p_product_ids)>500
    then raise exception 'price_baseline_preview_request_invalid'; end if;
  if (select count(distinct x) from unnest(p_product_ids) x)<>cardinality(p_product_ids)
    then raise exception 'price_baseline_preview_request_invalid'; end if;

  with requested as (
    select unnest(p_product_ids) canonical_product_id
  ),
  rows as (
    select
      r.canonical_product_id,
      p.configuration_price_id,p.sellable_configuration_id,p.option_mapping_id,p.source_price_row_id,
      p.source_amount,p.public_price_amount,p.manual_override_amount,p.source_currency,p.confidence,p.fallback_flag,
      p.review_status as price_review_status,p.price_status,p.updated_at as price_updated_at,
      c.review_status as configuration_review_status,c.is_public_candidate,c.is_sampler,c.updated_at as configuration_updated_at,
      (
        p.configuration_price_id is not null
        and p.sellable_configuration_id is not null
        and p.option_mapping_id is not null
        and p.source_price_row_id is not null
        and p.manual_override_amount is null
        and p.source_amount is not null and p.source_amount>0
        and p.public_price_amount=p.source_amount
        and p.confidence is not null and p.confidence>=95
        and p.fallback_flag is false
        and p.source_currency is not null and p.source_currency~'^[A-Z]{3}$'
        and c.is_public_candidate is true and c.is_sampler is false
        and c.review_status in ('not_reviewed','approved')
        and p.review_status in ('not_reviewed','approved')
        and p.price_status in ('draft','approved')
      ) clean_row,
      (
        c.review_status='approved'
        and p.review_status='approved'
        and p.price_status='approved'
      ) ready_row
    from requested r
    left join public.feya_commerce_configuration_prices p on p.canonical_product_id=r.canonical_product_id
    left join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
  ),
  products as (
    select canonical_product_id,count(configuration_price_id) price_rows,
      bool_and(clean_row) clean_product,bool_and(ready_row) ready_product
    from rows group by canonical_product_id
  ),
  candidate_products as (
    select canonical_product_id from products where price_rows>0 and clean_product and not ready_product
  ),
  ready_products as (
    select canonical_product_id from products where price_rows>0 and clean_product and ready_product
  ),
  hold_products as (
    select canonical_product_id from products where not (price_rows>0 and clean_product)
  ),
  candidate_evidence as (
    select jsonb_build_object(
      'canonical_product_id',r.canonical_product_id,
      'configuration_price_id',r.configuration_price_id,
      'sellable_configuration_id',r.sellable_configuration_id,
      'option_mapping_id',r.option_mapping_id,
      'source_price_row_id',r.source_price_row_id,
      'source_amount',r.source_amount,'public_price_amount',r.public_price_amount,
      'source_currency',r.source_currency,'confidence',r.confidence,'fallback_flag',r.fallback_flag,
      'price_review_status',r.price_review_status,'price_status',r.price_status,
      'configuration_review_status',r.configuration_review_status,
      'is_public_candidate',r.is_public_candidate,'is_sampler',r.is_sampler,
      'price_updated_at',r.price_updated_at,'configuration_updated_at',r.configuration_updated_at
    ) row_json,r.canonical_product_id,r.configuration_price_id
    from rows r join candidate_products c using(canonical_product_id)
  )
  select
    coalesce((select jsonb_agg(row_json order by canonical_product_id,configuration_price_id) from candidate_evidence),'[]'::jsonb),
    coalesce((select jsonb_agg(canonical_product_id order by canonical_product_id) from candidate_products),'[]'::jsonb),
    coalesce((select jsonb_agg(canonical_product_id order by canonical_product_id) from ready_products),'[]'::jsonb),
    coalesce((select jsonb_agg(canonical_product_id order by canonical_product_id) from hold_products),'[]'::jsonb),
    coalesce((select count(*) from candidate_evidence),0)
  into evidence,candidates,ready_ids,hold_ids,candidate_rows;

  evidence_sha:=encode(extensions.digest(convert_to(evidence::text,'UTF8'),'sha256'),'hex');

  return jsonb_build_object(
    'contract_version','commerce_price_baseline_adoption_v1',
    'requested_product_count',cardinality(p_product_ids),
    'candidate_product_count',jsonb_array_length(candidates),
    'candidate_price_row_count',candidate_rows,
    'already_ready_product_count',jsonb_array_length(ready_ids),
    'hold_product_count',jsonb_array_length(hold_ids),
    'candidate_product_ids',candidates,
    'already_ready_product_ids',ready_ids,
    'hold_product_ids',hold_ids,
    'evidence_sha256',evidence_sha,
    'manual_overrides_included',false,
    'offer_promotion_enabled',false,'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false
  );
end $$;

create function public.feya_commerce_execute_price_baseline_adoption_v1(p_execution_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  product_ids uuid[];
  preview jsonb;
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
    and c.review_status in ('not_reviewed','approved');
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
    and p.price_status in ('draft','approved');
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
    'feya_commerce_preview_price_baseline_adoption_v1(uuid[])',
    'feya_commerce_execute_price_baseline_adoption_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_preview_price_baseline_adoption_v1(uuid[]) to service_role;
  grant execute on function public.feya_commerce_execute_price_baseline_adoption_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
