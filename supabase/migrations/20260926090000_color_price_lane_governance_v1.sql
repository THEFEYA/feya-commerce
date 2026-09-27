-- Exact governance for three legacy products whose source price axis is color.
-- Installs evidence + approval-gated execution only. Schema apply does not mutate product/price rows.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','ADOPT_COLOR_PRICE_LANE_GOVERNANCE','Adopt exact color-price lane governance','CPIM',
  'AVAILABLE_WITH_LIMITATIONS','three_product_exact_color_price_lane',
  'Governs the nine source-observed color-priced rows for three legacy leather products without normalizing color prices away.',
  'Requires the catalog-wide configuration binding repair to succeed first. Applies only to the sealed three-product / nine-row evidence set.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"EXECUTION_GATEWAY","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"indexation_mutation":false,"payment":false,"order_creation":false,"contract_version":"color_price_lane_governance_v1"}'::jsonb,
  '{"release_ref":"feya-review-207-20260924","products":3,"price_rows":9,"source_axis":"color","manual_override_rows":0}'::jsonb,
  1,true
)
on conflict (registry_type,item_code,version_no) do update set
  item_name=excluded.item_name,owner_role=excluded.owner_role,item_state=excluded.item_state,
  implementation_state=excluded.implementation_state,public_summary=excluded.public_summary,
  limitations_summary=excluded.limitations_summary,config_json=excluded.config_json,
  evidence_json=excluded.evidence_json,active_flag=excluded.active_flag,updated_at=now();

create or replace function public.feya_commerce_color_price_target_configuration_id_v1(
  p_product_id uuid,p_option_mapping_id uuid
) returns uuid
language sql immutable set search_path='' as $$
  select case p_option_mapping_id
    when '0fdce36a-e9f6-4dd3-823a-48c6c1b289e8'::uuid then '763a7e7b-b6ba-4b4f-a5ea-ce166d751f65'::uuid
    when '6a5eff7d-7fd1-4db6-af00-794859f5ef1c'::uuid then 'b5b9e545-c862-4793-b3d8-c48557db5da7'::uuid
    when '12fa4679-9152-4e77-bd02-4c7f3c59363f'::uuid then '1a194363-9383-4746-9766-5474daab26f0'::uuid
    else extensions.uuid_generate_v5(
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8'::uuid,
      'thefeya:color-price-lane-v1:'||p_product_id::text||':'||p_option_mapping_id::text
    )
  end
$$;

create or replace function public.feya_commerce_color_price_lane_evidence_v1() returns jsonb
language sql security definer set search_path='' as $$
with target_products(id) as (
  values
    ('7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid),
    ('882793f6-15ca-4617-a579-5cd47290ce72'::uuid),
    ('de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid)
), rows as (
  select
    p.canonical_product_id,p.configuration_price_id,p.sellable_configuration_id,p.option_mapping_id,p.source_price_row_id,
    p.source_amount,p.public_price_amount,p.manual_override_amount,p.source_currency,p.confidence,
    p.fallback_flag,p.sampler_excluded_flag,p.review_status price_review_status,p.price_status,
    m.detected_canonical_axis,m.raw_option_name,m.raw_option_value,m.canonical_option_value,
    m.confidence mapping_confidence,m.review_status mapping_review_status,m.sampler_flag,m.non_catalog_flag,
    c.option_mapping_id current_configuration_mapping_id,c.configuration_name current_configuration_name,
    c.review_status configuration_review_status,c.is_public_candidate,c.is_sampler,
    public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id) target_configuration_id,
    case
      when lower(coalesce(m.canonical_option_value,m.raw_option_value,'')) in ('черный','чёрный','black') then 'Black'
      when lower(coalesce(m.canonical_option_value,m.raw_option_value,'')) in ('зеленый','зелёный','green') then 'Green'
      when lower(coalesce(m.canonical_option_value,m.raw_option_value,'')) in ('коричневый','brown') then 'Brown'
      else null
    end canonical_color
  from target_products t
  join public.feya_commerce_configuration_prices p on p.canonical_product_id=t.id
  left join public.feya_commerce_option_mappings m
    on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
  left join public.feya_commerce_sellable_configurations c
    on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
), target_state as (
  select r.*,tc.canonical_product_id target_existing_product_id,tc.option_mapping_id target_existing_mapping_id
  from rows r
  left join public.feya_commerce_sellable_configurations tc
    on tc.sellable_configuration_id=r.target_configuration_id
), material as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'canonical_product_id',canonical_product_id,'configuration_price_id',configuration_price_id,
    'sellable_configuration_id',sellable_configuration_id,'option_mapping_id',option_mapping_id,
    'source_price_row_id',source_price_row_id,'source_amount',source_amount,'public_price_amount',public_price_amount,
    'manual_override_amount',manual_override_amount,'source_currency',source_currency,'confidence',confidence,
    'fallback_flag',fallback_flag,'sampler_excluded_flag',sampler_excluded_flag,
    'price_review_status',price_review_status,'price_status',price_status,
    'detected_canonical_axis',detected_canonical_axis,'raw_option_value',raw_option_value,
    'canonical_option_value',canonical_option_value,'canonical_color',canonical_color,
    'current_configuration_mapping_id',current_configuration_mapping_id,
    'target_configuration_id',target_configuration_id
  ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
  from target_state
), commercial as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',configuration_price_id,'source_amount',source_amount,
    'public_price_amount',public_price_amount,'manual_override_amount',manual_override_amount,
    'source_currency',source_currency
  ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
  from target_state
)
select jsonb_build_object(
  'contract_version','color_price_lane_governance_v1',
  'release_ref','feya-review-207-20260924',
  'product_count',(select count(distinct canonical_product_id) from target_state),
  'price_rows',(select count(*) from target_state),
  'color_axis_rows',(select count(*) from target_state where detected_canonical_axis='color'),
  'exact_source_rows',(select count(*) from target_state
    where source_amount=public_price_amount and manual_override_amount is null and confidence>=95
      and fallback_flag=false and sampler_excluded_flag=false and source_currency='EUR'),
  'recognized_color_rows',(select count(*) from target_state where canonical_color in ('Black','Green','Brown')),
  'target_aligned_rows',(select count(*) from target_state where sellable_configuration_id=target_configuration_id),
  'target_create_rows',(select count(*) from target_state where target_existing_product_id is null),
  'target_conflict_rows',(select count(*) from target_state where target_existing_product_id is not null
    and (target_existing_product_id<>canonical_product_id or target_existing_mapping_id is distinct from option_mapping_id)),
  'strict_ready_rows',(select count(*) from target_state
    where sellable_configuration_id=target_configuration_id
      and configuration_review_status='approved' and is_public_candidate=true and is_sampler=false
      and price_review_status='approved' and price_status in ('approved','owner_reviewed')
      and fallback_flag=false and public_price_amount>0 and source_currency~'^[A-Z]{3}$'),
  'candidate',(
    (select count(distinct canonical_product_id) from target_state)=3
    and (select count(*) from target_state)=9
    and (select count(*) from target_state where detected_canonical_axis='color')=9
    and (select count(*) from target_state
      where source_amount=public_price_amount and manual_override_amount is null and confidence>=95
        and fallback_flag=false and sampler_excluded_flag=false and source_currency='EUR')=9
    and (select count(*) from target_state where canonical_color in ('Black','Green','Brown'))=9
    and (select count(*) from target_state where target_existing_product_id is not null
      and (target_existing_product_id<>canonical_product_id or target_existing_mapping_id is distinct from option_mapping_id))=0
    and (select count(*) from target_state
      where sellable_configuration_id=target_configuration_id
        and configuration_review_status='approved'
        and price_review_status='approved' and price_status in ('approved','owner_reviewed'))<9
  ),
  'already_ready',((select count(*) from target_state
    where sellable_configuration_id=target_configuration_id
      and configuration_review_status='approved' and is_public_candidate=true and is_sampler=false
      and price_review_status='approved' and price_status in ('approved','owner_reviewed')
      and fallback_flag=false and public_price_amount>0 and source_currency~'^[A-Z]{3}$')=9),
  'evidence_sha256',encode(extensions.digest(convert_to((select body from material)::text,'UTF8'),'sha256'),'hex'),
  'commercial_values_sha256',encode(extensions.digest(convert_to((select body from commercial)::text,'UTF8'),'sha256'),'hex'),
  'commercial_values_change',false,'payment_enabled',false,'indexing_enabled',false
);
$$;

create or replace function public.feya_commerce_execute_color_price_lane_governance_v1(
  p_execution_request_id uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  before_evidence jsonb;
  after_evidence jsonb;
  expected_hash text;
  expected_commercial_hash text;
  before_bindings jsonb;
  before_statuses jsonb;
  inserted_configs integer;
  rebound_rows integer;
  approved_configs integer;
  approved_prices integer;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'color_price_lane_request_required'; end if;

  select * into req from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id for update;
  if not found then raise exception 'color_price_lane_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'color_price_lane_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'ADOPT_COLOR_PRICE_LANE_GOVERNANCE'
    or req.mutation_domain<>'COMMERCE_PRICE'
    or req.request_status<>'APPROVED'
    or req.approval_hash is null or req.approval_hash<>req.request_hash
    or req.approved_by_user_id is null
    then raise exception 'color_price_lane_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'color_price_lane_governance_v1'
    or req.request_payload_json->>'release_ref'<>'feya-review-207-20260924'
    or (req.request_payload_json->>'expected_products')::integer<>3
    or (req.request_payload_json->>'expected_price_rows')::integer<>9
    or (req.request_payload_json->>'expected_create_configurations')::integer<>6
    then raise exception 'color_price_lane_payload_invalid'; end if;

  -- This exception lane is downstream of the catalog-wide structural repair.
  if not exists(
    select 1 from public.feya_growth_execution_requests_v1 e
    where e.action_code='REPAIR_RELEASE_CONFIGURATION_BINDINGS'
      and e.request_status='SUCCEEDED'
      and e.target_scope_json->>'entity_key'='feya-review-207-20260924'
  ) then raise exception 'color_price_lane_release_repair_required'; end if;

  -- No color-price binding rewrite after immutable downstream commerce identities exist.
  if exists(select 1 from public.feya_commerce_variant_identities_v1 where canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    ))
    or exists(select 1 from public.feya_commerce_offer_variant_items_v1 where canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    ))
    or exists(select 1 from public.feya_commerce_quote_receipts_v1 where canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    ))
    then raise exception 'color_price_lane_downstream_state_exists'; end if;

  perform 1 from public.feya_commerce_configuration_prices
    where canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    ) order by canonical_product_id,configuration_price_id for update;

  perform 1 from public.feya_commerce_sellable_configurations
    where canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    ) order by canonical_product_id,sellable_configuration_id for update;

  before_evidence:=public.feya_commerce_color_price_lane_evidence_v1();
  expected_hash:=req.request_payload_json->>'evidence_sha256';
  expected_commercial_hash:=req.request_payload_json->>'commercial_values_sha256';
  if coalesce((before_evidence->>'candidate')::boolean,false) is not true
    or before_evidence->>'evidence_sha256'<>expected_hash
    or before_evidence->>'commercial_values_sha256'<>expected_commercial_hash
    or (before_evidence->>'price_rows')::integer<>9
    or (before_evidence->>'color_axis_rows')::integer<>9
    or (before_evidence->>'target_create_rows')::integer<>6
    then raise exception 'color_price_lane_evidence_conflict'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'configuration_price_id',p.configuration_price_id,
    'old_sellable_configuration_id',p.sellable_configuration_id,
    'target_sellable_configuration_id',public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id)
  ) order by p.canonical_product_id,p.configuration_price_id),'[]'::jsonb)
  into before_bindings
  from public.feya_commerce_configuration_prices p
  where p.canonical_product_id in (
    '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
    '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
    'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
  );

  select jsonb_build_object(
    'prices',coalesce((select jsonb_agg(jsonb_build_object(
      'configuration_price_id',p.configuration_price_id,'review_status',p.review_status,'price_status',p.price_status
    ) order by p.configuration_price_id)
    from public.feya_commerce_configuration_prices p where p.canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    )),'[]'::jsonb),
    'configurations',coalesce((select jsonb_agg(jsonb_build_object(
      'sellable_configuration_id',c.sellable_configuration_id,'review_status',c.review_status
    ) order by c.sellable_configuration_id)
    from public.feya_commerce_sellable_configurations c where c.canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    )),'[]'::jsonb)
  ) into before_statuses;

  update public.feya_growth_execution_requests_v1 set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'color_price_lane_state_conflict'; end if;

  with rows as (
    select distinct on(p.canonical_product_id,p.option_mapping_id)
      p.canonical_product_id,p.option_mapping_id,m.component_family_id,
      public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id) target_id,
      case
        when lower(coalesce(m.canonical_option_value,m.raw_option_value,'')) in ('черный','чёрный','black') then 'Black'
        when lower(coalesce(m.canonical_option_value,m.raw_option_value,'')) in ('зеленый','зелёный','green') then 'Green'
        when lower(coalesce(m.canonical_option_value,m.raw_option_value,'')) in ('коричневый','brown') then 'Brown'
        else null
      end color_label
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m
      on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
    left join public.feya_commerce_sellable_configurations existing
      on existing.sellable_configuration_id=public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id)
    where p.canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    )
      and m.detected_canonical_axis='color'
      and existing.sellable_configuration_id is null
    order by p.canonical_product_id,p.option_mapping_id,p.configuration_price_id
  )
  insert into public.feya_commerce_sellable_configurations(
    sellable_configuration_id,canonical_product_id,option_mapping_id,component_family_id,
    configuration_name,normalized_key,is_default_whole_product,is_sampler,is_public_candidate,
    sort_order,review_status,notes
  )
  select target_id,canonical_product_id,option_mapping_id,component_family_id,
    color_label,'color_price_'||replace(option_mapping_id::text,'-',''),
    false,false,true,1000,'not_reviewed',
    'Exact source-observed color-price scope. Color remains explicit in the future variant tuple; commercial amount unchanged.'
  from rows;
  get diagnostics inserted_configs=row_count;
  if inserted_configs<>6 then raise exception 'color_price_lane_create_count_conflict'; end if;

  update public.feya_commerce_configuration_prices p
  set sellable_configuration_id=public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id),
      updated_at=now()
  from public.feya_commerce_option_mappings m
  where p.canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    )
    and m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
    and m.detected_canonical_axis='color'
    and p.sellable_configuration_id is distinct from
      public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id);
  get diagnostics rebound_rows=row_count;
  if rebound_rows<>6 then raise exception 'color_price_lane_rebind_count_conflict'; end if;

  update public.feya_commerce_sellable_configurations c
  set review_status='approved',updated_at=now()
  where c.sellable_configuration_id in (
    select public.feya_commerce_color_price_target_configuration_id_v1(p.canonical_product_id,p.option_mapping_id)
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m
      on m.option_mapping_id=p.option_mapping_id and m.canonical_product_id=p.canonical_product_id
    where p.canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    ) and m.detected_canonical_axis='color'
  ) and c.is_public_candidate=true and c.is_sampler=false;
  get diagnostics approved_configs=row_count;
  if approved_configs<>9 then raise exception 'color_price_lane_configuration_governance_count_conflict'; end if;

  update public.feya_commerce_configuration_prices p
  set review_status='approved',price_status='approved',updated_at=now()
  where p.canonical_product_id in (
      '7cf4ea37-cd11-4203-860c-7eed4ae965ba'::uuid,
      '882793f6-15ca-4617-a579-5cd47290ce72'::uuid,
      'de38a842-37c4-40a7-86b4-393341c4c9aa'::uuid
    )
    and p.manual_override_amount is null
    and p.source_amount=p.public_price_amount and p.source_amount>0
    and p.confidence>=95 and p.fallback_flag=false and p.sampler_excluded_flag=false
    and p.source_currency='EUR';
  get diagnostics approved_prices=row_count;
  if approved_prices<>9 then raise exception 'color_price_lane_price_governance_count_conflict'; end if;

  after_evidence:=public.feya_commerce_color_price_lane_evidence_v1();
  if coalesce((after_evidence->>'already_ready')::boolean,false) is not true
    or (after_evidence->>'strict_ready_rows')::integer<>9
    or after_evidence->>'commercial_values_sha256'<>expected_commercial_hash
    then raise exception 'color_price_lane_postflight_failed'; end if;

  result:=jsonb_build_object(
    'contract_version','color_price_lane_governance_v1',
    'execution_request_id',p_execution_request_id,'release_ref','feya-review-207-20260924',
    'product_count',3,'price_rows',9,'created_configurations',inserted_configs,
    'rebound_price_rows',rebound_rows,'approved_configurations',approved_configs,
    'approved_price_rows',approved_prices,'commercial_values_unchanged',true,
    'variant_color_binding_required',true,'cartesian_expansion_allowed',false,
    'payment_enabled',false,'indexing_enabled',false,'replayed',false
  );

  select coalesce(max(attempt_no),0)+1 into attempt
  from public.feya_growth_execution_receipts_v1 where execution_request_id=p_execution_request_id;

  insert into public.feya_growth_execution_receipts_v1(
    execution_request_id,attempt_no,receipt_status,executor_id,request_hash,
    result_json,postflight_result_json,rollback_result_json,completed_at
  ) values(
    p_execution_request_id,attempt,'SUCCEEDED','color-price-lane-governance-v1',req.request_hash,
    result,
    jsonb_build_object('strict_ready_rows',9,'commercial_values_unchanged',true,
      'variant_color_binding_required',true,'cartesian_expansion_allowed',false,
      'payment_enabled',false,'indexing_enabled',false),
    jsonb_build_object('mode','compensating_color_price_lane_change','bindings',before_bindings,
      'statuses',before_statuses,'delete_created_configurations_automatically',false,
      'commercial_values_unchanged',true),now()
  );

  update public.feya_growth_execution_requests_v1 set request_status='SUCCEEDED',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='EXECUTING';
  if not found then raise exception 'color_price_lane_state_conflict'; end if;

  return result;
end $$;

do $$
declare p text;
begin
  foreach p in array array[
    'feya_commerce_color_price_target_configuration_id_v1(uuid,uuid)',
    'feya_commerce_color_price_lane_evidence_v1()',
    'feya_commerce_execute_color_price_lane_governance_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_color_price_target_configuration_id_v1(uuid,uuid) to service_role;
  grant execute on function public.feya_commerce_color_price_lane_evidence_v1() to service_role;
  grant execute on function public.feya_commerce_execute_color_price_lane_governance_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
