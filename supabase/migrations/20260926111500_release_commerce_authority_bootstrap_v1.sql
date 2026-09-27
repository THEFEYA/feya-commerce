-- Atomic M1 release authority bootstrap:
-- governed source rows -> stable variants -> active offers -> one real server quote receipt per orderable tuple.
-- No order creation, payment or indexing is enabled.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','BOOTSTRAP_RELEASE_COMMERCE_AUTHORITY','Bootstrap governed release variants/offers/quotes','CPIM',
  'AVAILABLE_WITH_LIMITATIONS','sealed_release_207_only',
  'Creates one stable price-authority variant per governed release price row, activates exact offers, and verifies every tuple through the server quote contract.',
  'Only for feya-review-207-20260924 after all 856 price rows are strict-ready. Color is attached only to the nine source-observed color-price rows; size is not synthesized. Order creation, payment and indexing remain disabled.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"EXECUTION_GATEWAY","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"order_creation":false,"payment":false,"contract_version":"release_commerce_authority_bootstrap_v1"}'::jsonb,
  '{"release_ref":"feya-review-207-20260924","products":207,"price_rows":856,"color_price_rows":9,"size_axis_rows":0}'::jsonb,
  1,true
)
on conflict (registry_type,item_code,version_no) do update set
  item_name=excluded.item_name,owner_role=excluded.owner_role,item_state=excluded.item_state,
  implementation_state=excluded.implementation_state,public_summary=excluded.public_summary,
  limitations_summary=excluded.limitations_summary,config_json=excluded.config_json,
  evidence_json=excluded.evidence_json,active_flag=excluded.active_flag,updated_at=now();

create or replace function public.feya_commerce_release_uuid_v1(p_kind text,p_key text) returns uuid
language sql immutable set search_path='' as $$
  select extensions.uuid_generate_v5(
    '4d8d5de0-3fcb-4fc4-9fe4-aeb6cd4dc632'::uuid,
    btrim(p_kind)||':'||p_key
  )
$$;

create or replace function public.feya_commerce_release_color_label_v1(p_value text) returns text
language sql immutable set search_path='' as $$
  select case
    when lower(coalesce(p_value,'')) in ('черный','чёрный','black') then 'Black'
    when lower(coalesce(p_value,'')) in ('зеленый','зелёный','green') then 'Green'
    when lower(coalesce(p_value,'')) in ('коричневый','brown') then 'Brown'
    else null
  end
$$;

create or replace function public.feya_commerce_release_authority_bootstrap_evidence_v1(
  p_product_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if p_product_ids is null or cardinality(p_product_ids)<>207
    or (select count(distinct x) from unnest(p_product_ids) x)<>207
    then raise exception 'release_authority_bootstrap_scope_invalid'; end if;

  with requested as (
    select unnest(p_product_ids) canonical_product_id
  ), rows as (
    select
      p.canonical_product_id,p.configuration_price_id,p.sellable_configuration_id,p.option_mapping_id,
      p.source_amount,p.public_price_amount,p.manual_override_amount,p.source_currency,p.confidence,
      p.review_status price_review_status,p.price_status,p.fallback_flag,p.sampler_excluded_flag,
      p.updated_at price_updated_at,
      c.review_status configuration_review_status,c.is_public_candidate,c.is_sampler,c.updated_at configuration_updated_at,
      m.detected_canonical_axis,m.raw_option_value,m.canonical_option_value,
      public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)) canonical_color,
      d.do_not_publish_flag,
      public.feya_commerce_currency_minor_exponent_v1(p.source_currency) minor_exponent
    from requested r
    join public.feya_commerce_configuration_prices p on p.canonical_product_id=r.canonical_product_id
    join public.feya_commerce_sellable_configurations c
      on c.canonical_product_id=p.canonical_product_id and c.sellable_configuration_id=p.sellable_configuration_id
    join public.feya_commerce_product_drafts d on d.canonical_product_id=p.canonical_product_id
    left join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id and m.option_mapping_id=p.option_mapping_id
  ), material as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'canonical_product_id',canonical_product_id,
      'configuration_price_id',configuration_price_id,
      'sellable_configuration_id',sellable_configuration_id,
      'option_mapping_id',option_mapping_id,
      'public_price_amount',public_price_amount,
      'manual_override_amount',manual_override_amount,
      'source_currency',source_currency,
      'price_review_status',price_review_status,
      'price_status',price_status,
      'fallback_flag',fallback_flag,
      'configuration_review_status',configuration_review_status,
      'is_public_candidate',is_public_candidate,
      'is_sampler',is_sampler,
      'detected_canonical_axis',detected_canonical_axis,
      'canonical_color',canonical_color,
      'do_not_publish_flag',do_not_publish_flag
    ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
    from rows
  ), commercial as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'configuration_price_id',configuration_price_id,
      'public_price_amount',public_price_amount,
      'manual_override_amount',manual_override_amount,
      'source_currency',source_currency
    ) order by canonical_product_id,configuration_price_id),'[]'::jsonb) body
    from rows
  )
  select jsonb_build_object(
    'contract_version','release_commerce_authority_bootstrap_v1',
    'release_ref','feya-review-207-20260924',
    'product_count',(select count(distinct canonical_product_id) from rows),
    'price_rows',(select count(*) from rows),
    'strict_ready_rows',(select count(*) from rows where
      configuration_review_status='approved' and is_public_candidate=true and is_sampler=false
      and price_review_status='approved' and price_status in ('approved','owner_reviewed')
      and fallback_flag=false and public_price_amount>0 and source_currency~'^[A-Z]{3}$'),
    'color_axis_rows',(select count(*) from rows where detected_canonical_axis='color'),
    'recognized_color_rows',(select count(*) from rows where detected_canonical_axis='color' and canonical_color is not null),
    'size_axis_rows',(select count(*) from rows where detected_canonical_axis='size'),
    'direct_rows',(select count(*) from rows where option_mapping_id is null),
    'held_products',(select count(distinct canonical_product_id) from rows where do_not_publish_flag=true),
    'unsupported_currency_rows',(select count(*) from rows where minor_exponent is null),
    'non_integral_minor_rows',(select count(*) from rows where minor_exponent is not null
      and public_price_amount*power(10::numeric,minor_exponent)<>trunc(public_price_amount*power(10::numeric,minor_exponent))),
    'existing_variant_identities',(select count(*) from public.feya_commerce_variant_identities_v1 where canonical_product_id=any(p_product_ids)),
    'existing_variant_revisions',(select count(*) from public.feya_commerce_variant_revisions_v1 where canonical_product_id=any(p_product_ids)),
    'existing_offer_heads',(select count(*) from public.feya_commerce_offer_heads_v1 where canonical_product_id=any(p_product_ids)),
    'existing_offer_items',(select count(*) from public.feya_commerce_offer_variant_items_v1 where canonical_product_id=any(p_product_ids)),
    'existing_quote_receipts',(select count(*) from public.feya_commerce_quote_receipts_v1 where canonical_product_id=any(p_product_ids)),
    'evidence_sha256',encode(extensions.digest(convert_to((select body from material)::text,'UTF8'),'sha256'),'hex'),
    'commercial_values_sha256',encode(extensions.digest(convert_to((select body from commercial)::text,'UTF8'),'sha256'),'hex'),
    'candidate',(
      (select count(distinct canonical_product_id) from rows)=207
      and (select count(*) from rows)=856
      and (select count(*) from rows where
        configuration_review_status='approved' and is_public_candidate=true and is_sampler=false
        and price_review_status='approved' and price_status in ('approved','owner_reviewed')
        and fallback_flag=false and public_price_amount>0 and source_currency~'^[A-Z]{3}$')=856
      and (select count(*) from rows where detected_canonical_axis='color')=9
      and (select count(*) from rows where detected_canonical_axis='color' and canonical_color is not null)=9
      and (select count(*) from rows where detected_canonical_axis='size')=0
      and (select count(distinct canonical_product_id) from rows where do_not_publish_flag=true)=0
      and (select count(*) from rows where minor_exponent is null)=0
      and (select count(*) from rows where minor_exponent is not null
        and public_price_amount*power(10::numeric,minor_exponent)<>trunc(public_price_amount*power(10::numeric,minor_exponent)))=0
      and (select count(*) from public.feya_commerce_variant_identities_v1 where canonical_product_id=any(p_product_ids))=0
      and (select count(*) from public.feya_commerce_variant_revisions_v1 where canonical_product_id=any(p_product_ids))=0
      and (select count(*) from public.feya_commerce_offer_heads_v1 where canonical_product_id=any(p_product_ids))=0
      and (select count(*) from public.feya_commerce_offer_variant_items_v1 where canonical_product_id=any(p_product_ids))=0
      and (select count(*) from public.feya_commerce_quote_receipts_v1 where canonical_product_id=any(p_product_ids))=0
    ),
    'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false
  ) into result;

  return result;
end $$;

create or replace function public.feya_commerce_build_release_variant_payload_v1(
  p_product_id uuid,
  p_execution_request_id uuid
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  with rows as (
    select
      p.*,c.configuration_name,
      m.detected_canonical_axis,
      public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)) canonical_color,
      case when m.detected_canonical_axis='color'
        then public.feya_commerce_release_uuid_v1('color',p.canonical_product_id::text||':'||
          public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)))
        else null end color_id,
      public.feya_commerce_release_uuid_v1('variant',p.canonical_product_id::text||':'||p.configuration_price_id::text||':'||
        coalesce(case when m.detected_canonical_axis='color'
          then public.feya_commerce_release_uuid_v1('color',p.canonical_product_id::text||':'||
            public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)))::text end,'-')||':-') variant_id,
      public.feya_commerce_release_uuid_v1('variant-quote',p.canonical_product_id::text||':'||p.configuration_price_id::text) quote_id
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_sellable_configurations c
      on c.canonical_product_id=p.canonical_product_id and c.sellable_configuration_id=p.sellable_configuration_id
    left join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id and m.option_mapping_id=p.option_mapping_id
    where p.canonical_product_id=p_product_id
  ), source_bindings as (
    select jsonb_build_object(
      'product_fingerprint',md5(to_jsonb(d)::text),
      'configurations',coalesce((
        select jsonb_agg(jsonb_build_object(
          'configuration_price_id',r.configuration_price_id,
          'sellable_configuration_id',r.sellable_configuration_id,
          'price_fingerprint',md5(to_jsonb(p)::text),
          'configuration_fingerprint',md5(to_jsonb(c)::text)
        ) order by r.configuration_price_id)
        from rows r
        join public.feya_commerce_configuration_prices p on p.configuration_price_id=r.configuration_price_id
        join public.feya_commerce_sellable_configurations c on c.sellable_configuration_id=r.sellable_configuration_id
      ),'[]'::jsonb)
    ) body
    from public.feya_commerce_product_drafts d
    where d.canonical_product_id=p_product_id
  ), colors as (
    select coalesce(jsonb_agg(jsonb_build_object('id',color_id,'label',canonical_color,'state','confirmed')
      order by canonical_color),'[]'::jsonb) body
    from (
      select distinct color_id,canonical_color from rows where color_id is not null and canonical_color is not null
    ) x
  ), snapshot as (
    select jsonb_build_object(
      'canonical_product_id',p_product_id,
      'product_revision',1,
      'pricing_policy_ref','owner-configuration-base-price-20260924-04',
      'configurations',coalesce((
        select jsonb_agg(jsonb_build_object(
          'configuration_price_id',configuration_price_id,
          'sellable_configuration_id',sellable_configuration_id,
          'base_price',jsonb_build_object(
            'quote_id',quote_id,'price_revision',1,'status','unverified','amount_minor',null,
            'currency',source_currency,'evidence_ref','configuration-price:'||configuration_price_id::text
          )
        ) order by configuration_price_id) from rows
      ),'[]'::jsonb),
      'colors',(select body from colors),
      'sizes','[]'::jsonb,
      'variants',coalesce((
        select jsonb_agg(jsonb_build_object(
          'variant_id',variant_id,'configuration_price_id',configuration_price_id,
          'color_id',color_id,'size_id',null,'state','draft',
          'pricing',jsonb_build_object('mode','configuration_base')
        ) order by configuration_price_id) from rows
      ),'[]'::jsonb)
    ) body
  )
  select jsonb_build_object(
    'contract_version','product_variant_draft_v1',
    'request_id',public.feya_commerce_release_uuid_v1('variant-request',p_execution_request_id::text||':'||p_product_id::text),
    'expected_revision',0,
    'source_bindings',(select body from source_bindings),
    'snapshot',(select body from snapshot)
  ) into result;

  if result is null then raise exception 'release_variant_payload_missing'; end if;
  return result;
end $$;

create or replace function public.feya_commerce_execute_release_authority_bootstrap_v1(
  p_execution_request_id uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  product_ids uuid[];
  before_evidence jsonb;
  expected_hash text;
  expected_commercial_hash text;
  actor_ref uuid;
  approval_ref text;
  product_id uuid;
  payload jsonb;
  snapshot jsonb;
  bindings jsonb;
  event_id uuid;
  offer_id uuid;
  quote_result jsonb;
  inserted_attrs integer;
  inserted_variants integer;
  inserted_quotes integer;
  inserted_revisions integer:=0;
  inserted_offers integer;
  inserted_offer_items integer;
  inserted_quote_receipts integer;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'release_authority_bootstrap_request_required'; end if;

  select * into req
  from public.feya_growth_execution_requests_v1
  where execution_request_id=p_execution_request_id
  for update;
  if not found then raise exception 'release_authority_bootstrap_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior
    from public.feya_growth_execution_receipts_v1
    where execution_request_id=p_execution_request_id and receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'release_authority_bootstrap_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'BOOTSTRAP_RELEASE_COMMERCE_AUTHORITY'
    or req.mutation_domain<>'OFFER'
    or not public.feya_fn_execution_request_human_approval_valid_v1(p_execution_request_id)
    then raise exception 'release_authority_bootstrap_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'release_commerce_authority_bootstrap_v1'
    or req.request_payload_json->>'release_ref'<>'feya-review-207-20260924'
    or jsonb_typeof(req.request_payload_json->'canonical_product_ids')<>'array'
    or jsonb_array_length(req.request_payload_json->'canonical_product_ids')<>207
    or (req.request_payload_json->>'expected_products')::integer<>207
    or (req.request_payload_json->>'expected_price_rows')::integer<>856
    or (req.request_payload_json->>'expected_color_rows')::integer<>9
    or (req.request_payload_json->>'expected_size_rows')::integer<>0
    or (req.request_payload_json->>'max_quantity_per_line')::integer<>100
    then raise exception 'release_authority_bootstrap_payload_invalid'; end if;

  select array_agg((x.v#>>'{}')::uuid order by (x.v#>>'{}')::uuid) into product_ids
  from jsonb_array_elements(req.request_payload_json->'canonical_product_ids') x(v);
  if cardinality(product_ids)<>207 or (select count(distinct x) from unnest(product_ids) x)<>207
    then raise exception 'release_authority_bootstrap_payload_invalid'; end if;

  expected_hash:=req.request_payload_json->>'evidence_sha256';
  expected_commercial_hash:=req.request_payload_json->>'commercial_values_sha256';
  if expected_hash is null or expected_hash!~'^[0-9a-f]{64}$'
    or expected_commercial_hash is null or expected_commercial_hash!~'^[0-9a-f]{64}$'
    then raise exception 'release_authority_bootstrap_payload_invalid'; end if;

  before_evidence:=public.feya_commerce_release_authority_bootstrap_evidence_v1(product_ids);
  if coalesce((before_evidence->>'candidate')::boolean,false) is not true
    or before_evidence->>'evidence_sha256'<>expected_hash
    or before_evidence->>'commercial_values_sha256'<>expected_commercial_hash
    or (before_evidence->>'strict_ready_rows')::integer<>856
    then raise exception 'release_authority_bootstrap_evidence_conflict'; end if;

  actor_ref:=req.approved_by_user_id;
  if actor_ref is null then
    select a.external_owner_approval_id into actor_ref
    from public.feya_growth_external_owner_approvals_v1 a
    where a.execution_request_id=p_execution_request_id and a.request_hash=req.request_hash
    order by a.approved_at desc limit 1;
  end if;
  if actor_ref is null then raise exception 'release_authority_bootstrap_actor_missing'; end if;

  approval_ref:=case when req.approved_by_user_id is not null
    then 'human-user:'||req.approved_by_user_id::text||':'||req.request_hash
    else 'external-owner:'||actor_ref::text||':'||req.request_hash end;

  perform 1 from public.feya_commerce_product_drafts
    where canonical_product_id=any(product_ids)
    order by canonical_product_id for share;
  perform 1 from public.feya_commerce_configuration_prices
    where canonical_product_id=any(product_ids)
    order by canonical_product_id,configuration_price_id for share;
  perform 1 from public.feya_commerce_sellable_configurations
    where canonical_product_id=any(product_ids)
    order by canonical_product_id,sellable_configuration_id for share;

  update public.feya_growth_execution_requests_v1
  set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'release_authority_bootstrap_state_conflict'; end if;

  with color_rows as (
    select distinct p.canonical_product_id,
      public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)) label
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id and m.option_mapping_id=p.option_mapping_id
    where p.canonical_product_id=any(product_ids) and m.detected_canonical_axis='color'
  )
  insert into public.feya_commerce_variant_attributes_v1(attribute_id,canonical_product_id,dimension)
  select public.feya_commerce_release_uuid_v1('color',canonical_product_id::text||':'||label),
    canonical_product_id,'color'
  from color_rows;
  get diagnostics inserted_attrs=row_count;
  if inserted_attrs<>9 then raise exception 'release_authority_bootstrap_color_count_conflict'; end if;

  with source_rows as (
    select p.canonical_product_id,p.configuration_price_id,
      case when m.detected_canonical_axis='color'
        then public.feya_commerce_release_uuid_v1('color',p.canonical_product_id::text||':'||
          public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)))
        else null end color_id
    from public.feya_commerce_configuration_prices p
    left join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id and m.option_mapping_id=p.option_mapping_id
    where p.canonical_product_id=any(product_ids)
  )
  insert into public.feya_commerce_variant_identities_v1(
    variant_id,canonical_product_id,configuration_price_id,color_id,size_id
  )
  select public.feya_commerce_release_uuid_v1('variant',canonical_product_id::text||':'||configuration_price_id::text||':'||
      coalesce(color_id::text,'-')||':-'),
    canonical_product_id,configuration_price_id,color_id,null
  from source_rows;
  get diagnostics inserted_variants=row_count;
  if inserted_variants<>856 then raise exception 'release_authority_bootstrap_variant_count_conflict'; end if;

  insert into public.feya_commerce_variant_quotes_v1(
    quote_id,canonical_product_id,configuration_price_id,variant_id,scope_key,price_revision,price
  )
  select
    public.feya_commerce_release_uuid_v1('variant-quote',p.canonical_product_id::text||':'||p.configuration_price_id::text),
    p.canonical_product_id,p.configuration_price_id,null,
    'configuration:'||p.configuration_price_id::text,1,
    jsonb_build_object(
      'quote_id',public.feya_commerce_release_uuid_v1('variant-quote',p.canonical_product_id::text||':'||p.configuration_price_id::text),
      'price_revision',1,'status','unverified','amount_minor',null,
      'currency',p.source_currency,'evidence_ref','configuration-price:'||p.configuration_price_id::text
    )
  from public.feya_commerce_configuration_prices p
  where p.canonical_product_id=any(product_ids);
  get diagnostics inserted_quotes=row_count;
  if inserted_quotes<>856 then raise exception 'release_authority_bootstrap_variant_quote_count_conflict'; end if;

  foreach product_id in array product_ids loop
    payload:=public.feya_commerce_build_release_variant_payload_v1(product_id,p_execution_request_id);
    if not public.feya_commerce_variant_shape_matches_v1(payload,public.feya_commerce_variant_draft_schema_v1())
      then raise exception 'release_authority_bootstrap_variant_shape_invalid:%',product_id; end if;

    snapshot:=payload->'snapshot';
    bindings:=payload->'source_bindings';
    event_id:=public.feya_commerce_release_uuid_v1('change-event',p_execution_request_id::text||':'||product_id::text);

    insert into public.feya_growth_change_events_v1(
      change_event_id,event_code,change_domain,change_type,entity_type,entity_key,
      execution_request_id,version_before_json,version_after_json,source_type,source_ref,
      metadata_json,idempotency_key
    ) values(
      event_id,'VARIANT-BOOTSTRAP-'||replace(product_id::text,'-',''),'OFFER','VARIANT_DRAFT_BOOTSTRAP',
      'PRODUCT',product_id::text,p_execution_request_id,
      jsonb_build_object('product_revision',0),
      jsonb_build_object('product_revision',1,'snapshot_sha256',
        encode(extensions.digest(convert_to(snapshot::text,'UTF8'),'sha256'),'hex')),
      case when req.approved_by_user_id is null then 'external' else 'human' end,
      approval_ref,
      jsonb_build_object('release_ref','feya-review-207-20260924','draft_only',true,'batch_bootstrap',true),
      'variant-bootstrap:feya-review-207-20260924:'||product_id::text
    );

    insert into public.feya_commerce_variant_revisions_v1(
      canonical_product_id,product_revision,request_id,actor_user_id,snapshot,source_bindings,
      snapshot_sha256,execution_request_id,change_event_id
    ) values(
      product_id,1,(payload->>'request_id')::uuid,actor_ref,snapshot,bindings,
      encode(extensions.digest(convert_to(snapshot::text,'UTF8'),'sha256'),'hex'),
      p_execution_request_id,event_id
    );

    insert into public.feya_commerce_variant_heads_v1(canonical_product_id,current_revision)
    values(product_id,1);

    insert into public.feya_commerce_variant_draft_outbox_v1(
      change_event_id,canonical_product_id,product_revision,delivery_state,attempts
    ) values(event_id,product_id,1,'pending',0);

    inserted_revisions:=inserted_revisions+1;
  end loop;

  if inserted_revisions<>207 then raise exception 'release_authority_bootstrap_revision_count_conflict'; end if;

  insert into public.feya_commerce_offer_revisions_v1(
    offer_revision_id,canonical_product_id,offer_revision,product_revision,release_ref,
    approval_ref,status,max_quantity_per_line,snapshot_sha256
  )
  select
    public.feya_commerce_release_uuid_v1('offer-revision','feya-review-207-20260924:'||v.canonical_product_id::text||':1'),
    v.canonical_product_id,1,1,'feya-review-207-20260924',approval_ref,'active',100,v.snapshot_sha256
  from public.feya_commerce_variant_revisions_v1 v
  where v.canonical_product_id=any(product_ids) and v.product_revision=1;
  get diagnostics inserted_offers=row_count;
  if inserted_offers<>207 then raise exception 'release_authority_bootstrap_offer_count_conflict'; end if;

  if exists(
    select 1
    from public.feya_commerce_configuration_prices p
    where p.canonical_product_id=any(product_ids)
      and (
        public.feya_commerce_currency_minor_exponent_v1(p.source_currency) is null
        or p.public_price_amount*power(10::numeric,public.feya_commerce_currency_minor_exponent_v1(p.source_currency))
          <>trunc(p.public_price_amount*power(10::numeric,public.feya_commerce_currency_minor_exponent_v1(p.source_currency)))
      )
  ) then raise exception 'release_authority_bootstrap_minor_amount_invalid'; end if;

  with source_rows as (
    select
      p.*,c.updated_at configuration_updated_at,c.review_status configuration_review_status,
      c.is_public_candidate,c.is_sampler,
      m.detected_canonical_axis,
      case when m.detected_canonical_axis='color'
        then public.feya_commerce_release_uuid_v1('color',p.canonical_product_id::text||':'||
          public.feya_commerce_release_color_label_v1(coalesce(m.canonical_option_value,m.raw_option_value)))
        else null end color_id,
      public.feya_commerce_currency_minor_exponent_v1(p.source_currency) exponent
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_sellable_configurations c
      on c.canonical_product_id=p.canonical_product_id and c.sellable_configuration_id=p.sellable_configuration_id
    left join public.feya_commerce_option_mappings m
      on m.canonical_product_id=p.canonical_product_id and m.option_mapping_id=p.option_mapping_id
    where p.canonical_product_id=any(product_ids)
  )
  insert into public.feya_commerce_offer_variant_items_v1(
    offer_revision_id,canonical_product_id,variant_id,configuration_price_id,color_id,size_id,
    item_status,price_quote_id,price_revision,amount_minor,currency,price_source,price_evidence_ref
  )
  select
    public.feya_commerce_release_uuid_v1('offer-revision','feya-review-207-20260924:'||s.canonical_product_id::text||':1'),
    s.canonical_product_id,
    public.feya_commerce_release_uuid_v1('variant',s.canonical_product_id::text||':'||s.configuration_price_id::text||':'||
      coalesce(s.color_id::text,'-')||':-'),
    s.configuration_price_id,s.color_id,null,'active',
    public.feya_commerce_release_uuid_v1('offer-price',s.canonical_product_id::text||':'||s.configuration_price_id::text),
    1,
    (s.public_price_amount*power(10::numeric,s.exponent))::bigint,
    s.source_currency,'configuration_base',
    'configuration-price:'||s.configuration_price_id::text||':'||
      encode(extensions.digest(convert_to(jsonb_build_object(
        'configuration_price_id',s.configuration_price_id,
        'sellable_configuration_id',s.sellable_configuration_id,
        'public_price_amount',s.public_price_amount,'source_currency',s.source_currency,
        'price_status',s.price_status,'price_review_status',s.review_status,
        'fallback_flag',s.fallback_flag,'configuration_review_status',s.configuration_review_status,
        'is_public_candidate',s.is_public_candidate,'is_sampler',s.is_sampler,
        'price_updated_at',s.updated_at,'configuration_updated_at',s.configuration_updated_at
      )::text,'UTF8'),'sha256'),'hex')
  from source_rows s;
  get diagnostics inserted_offer_items=row_count;
  if inserted_offer_items<>856 then raise exception 'release_authority_bootstrap_offer_item_count_conflict'; end if;

  insert into public.feya_commerce_offer_heads_v1(canonical_product_id,current_offer_revision_id)
  select p,
    public.feya_commerce_release_uuid_v1('offer-revision','feya-review-207-20260924:'||p::text||':1')
  from unnest(product_ids) p;

  for quote_result in
    select jsonb_build_object(
      'request_id',public.feya_commerce_release_uuid_v1('quote-verification','feya-review-207-20260924:'||i.variant_id::text),
      'canonical_product_id',i.canonical_product_id,
      'variant_id',i.variant_id,
      'configuration_price_id',i.configuration_price_id,
      'color_id',i.color_id,
      'size_id',i.size_id,
      'expected_product_revision',1,
      'expected_offer_revision',1,
      'quantity',1
    ) payload
    from public.feya_commerce_offer_variant_items_v1 i
    where i.canonical_product_id=any(product_ids)
    order by i.canonical_product_id,i.variant_id
  loop
    perform public.feya_commerce_create_quote_v1(quote_result);
  end loop;

  select count(*) into inserted_quote_receipts
  from public.feya_commerce_quote_receipts_v1 q
  where q.canonical_product_id=any(product_ids) and q.product_revision=1;
  if inserted_quote_receipts<>856 then raise exception 'release_authority_bootstrap_quote_receipt_count_conflict'; end if;

  if (select count(*) from public.feya_commerce_variant_identities_v1 where canonical_product_id=any(product_ids))<>856
    or (select count(*) from public.feya_commerce_variant_revisions_v1 where canonical_product_id=any(product_ids) and product_revision=1)<>207
    or (select count(*) from public.feya_commerce_offer_heads_v1 where canonical_product_id=any(product_ids))<>207
    or (select count(*) from public.feya_commerce_offer_variant_items_v1 where canonical_product_id=any(product_ids) and item_status='active')<>856
    then raise exception 'release_authority_bootstrap_postflight_failed'; end if;

  result:=jsonb_build_object(
    'contract_version','release_commerce_authority_bootstrap_v1',
    'execution_request_id',p_execution_request_id,'release_ref','feya-review-207-20260924',
    'products',207,'price_rows',856,'variant_attributes',inserted_attrs,
    'variant_identities',inserted_variants,'variant_quotes',inserted_quotes,
    'variant_revisions',inserted_revisions,'active_offers',inserted_offers,
    'active_offer_items',inserted_offer_items,'verified_server_quotes',inserted_quote_receipts,
    'color_price_rows',9,'size_variants_created',0,'cartesian_expansion',false,
    'commercial_values_sha256',expected_commercial_hash,'commercial_values_changed',false,
    'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false,'replayed',false
  );

  select coalesce(max(attempt_no),0)+1 into attempt
  from public.feya_growth_execution_receipts_v1 where execution_request_id=p_execution_request_id;

  insert into public.feya_growth_execution_receipts_v1(
    execution_request_id,attempt_no,receipt_status,executor_id,request_hash,
    result_json,postflight_result_json,rollback_result_json,completed_at
  ) values(
    p_execution_request_id,attempt,'SUCCEEDED','release-commerce-authority-bootstrap-v1',req.request_hash,
    result,
    jsonb_build_object(
      'variant_identities',856,'variant_revisions',207,'active_offers',207,
      'active_offer_items',856,'verified_server_quotes',856,
      'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false
    ),
    jsonb_build_object(
      'mode','compensating_offer_retirement_and_variant_supersession',
      'delete_immutable_history',false,'restore_commercial_values_required',false
    ),now()
  );

  update public.feya_growth_execution_requests_v1
  set request_status='SUCCEEDED',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='EXECUTING';
  if not found then raise exception 'release_authority_bootstrap_state_conflict'; end if;

  return result;
end $$;

do $$
declare p text;
begin
  foreach p in array array[
    'feya_commerce_release_uuid_v1(text,text)',
    'feya_commerce_release_color_label_v1(text)',
    'feya_commerce_release_authority_bootstrap_evidence_v1(uuid[])',
    'feya_commerce_build_release_variant_payload_v1(uuid,uuid)',
    'feya_commerce_execute_release_authority_bootstrap_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_release_authority_bootstrap_evidence_v1(uuid[]) to service_role;
  grant execute on function public.feya_commerce_execute_release_authority_bootstrap_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
