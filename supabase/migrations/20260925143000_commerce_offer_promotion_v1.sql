-- C4.3-D controlled offer promotion. Unapplied by default; payment/order/indexing remain disabled.
-- Depends on:
--   20260924173914_product_variant_draft_atomic_v1.sql
--   20260925123000_commerce_quote_receipt_v1.sql
begin;

create table public.feya_commerce_offer_promotion_receipts_v1(
  request_id uuid primary key,
  actor_user_id uuid not null,
  canonical_product_id uuid not null references public.feya_commerce_product_drafts(canonical_product_id) on delete restrict,
  offer_revision_id uuid not null,
  offer_revision bigint not null check(offer_revision>0 and offer_revision<=9007199254740991),
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  execution_request_id uuid not null references public.feya_growth_execution_requests_v1(execution_request_id) on delete restrict,
  change_event_id uuid not null references public.feya_growth_change_events_v1(change_event_id) on delete restrict,
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  foreign key(offer_revision_id,canonical_product_id)
    references public.feya_commerce_offer_revisions_v1(offer_revision_id,canonical_product_id) on delete restrict
);
create index feya_offer_promotion_receipt_offer_idx on public.feya_commerce_offer_promotion_receipts_v1(offer_revision_id);
create index feya_offer_promotion_receipt_execution_idx on public.feya_commerce_offer_promotion_receipts_v1(execution_request_id);

create table public.feya_commerce_offer_promotion_outbox_v1(
  change_event_id uuid primary key references public.feya_growth_change_events_v1(change_event_id) on delete restrict,
  canonical_product_id uuid not null,
  offer_revision_id uuid not null,
  offer_revision bigint not null check(offer_revision>0 and offer_revision<=9007199254740991),
  delivery_state text not null default 'pending' check(delivery_state in ('pending','processing','delivered')),
  attempts integer not null default 0 check(attempts>=0),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  foreign key(offer_revision_id,canonical_product_id)
    references public.feya_commerce_offer_revisions_v1(offer_revision_id,canonical_product_id) on delete restrict
);
create index feya_offer_promotion_outbox_pending_idx on public.feya_commerce_offer_promotion_outbox_v1(created_at)
  where delivery_state='pending';

create function public.feya_commerce_offer_promotion_immutable_v1() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'offer_promotion_history_is_immutable'; end $$;
create trigger feya_offer_promotion_receipt_immutable before update or delete on public.feya_commerce_offer_promotion_receipts_v1
  for each row execute function public.feya_commerce_offer_promotion_immutable_v1();

create function public.feya_commerce_currency_minor_exponent_v1(p_currency text) returns integer
language sql immutable set search_path='' as $$
  select case p_currency
    when 'EUR' then 2 when 'USD' then 2 when 'GBP' then 2
    when 'AUD' then 2 when 'CAD' then 2 when 'CNY' then 2
    when 'JPY' then 0 else null end
$$;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,public_summary,limitations_summary,
  config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability','PROMOTE_PRODUCT_OFFER','Promote product offer','CPIM','AVAILABLE_WITH_LIMITATIONS','internal_offer_promotion_only',
  'Promote an exact reviewed product variant set into one immutable commerce offer revision.',
  'Requires authenticated human approval, current variant revision, reviewed exact configuration prices and current release membership at the application boundary. Does not create orders, payments or indexing permission.',
  '{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"SERVER_RPC","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"order_creation":false,"payment":false,"contract_version":"commerce_offer_promotion_v1"}'::jsonb,
  '{"source":"C4_3_Quote_Readiness_20260925.md","pricing_policy":"owner-configuration-base-price-20260924-04","requires":"exact_reviewed_configuration_price"}'::jsonb,
  1,true
);

create function public.feya_commerce_offer_promotion_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare r text; ready boolean:=true; p record;
begin
  if not coalesce((public.feya_commerce_quote_health_v1()->>'ready')::boolean,false) then ready:=false; end if;

  foreach r in array array['anon','authenticated'] loop
    if has_table_privilege(r,'public.feya_commerce_offer_promotion_receipts_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or has_table_privilege(r,'public.feya_commerce_offer_promotion_outbox_v1','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or has_function_privilege(r,'public.feya_commerce_promote_offer_v1(uuid,jsonb)','EXECUTE')
      or has_function_privilege(r,'public.feya_commerce_offer_promotion_health_v1()','EXECUTE') then ready:=false; end if;
  end loop;

  if not has_function_privilege('service_role','public.feya_commerce_promote_offer_v1(uuid,jsonb)','EXECUTE')
    or not has_function_privilege('service_role','public.feya_commerce_offer_promotion_health_v1()','EXECUTE')
    or has_table_privilege('service_role','public.feya_commerce_offer_revisions_v1','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    or has_table_privilege('service_role','public.feya_commerce_offer_variant_items_v1','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    or has_table_privilege('service_role','public.feya_commerce_offer_heads_v1','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then ready:=false; end if;

  select f.prosecdef,coalesce(f.proconfig@>array['search_path=""'],false) as path_ok
    into p from pg_catalog.pg_proc f where f.oid=to_regprocedure('public.feya_commerce_promote_offer_v1(uuid,jsonb)');
  if not found or not p.prosecdef or not p.path_ok then ready:=false; end if;

  if not exists(select 1 from public.feya_growth_registry_items_v1
      where registry_type='action_capability' and item_code='PROMOTE_PRODUCT_OFFER' and version_no=1 and active_flag
        and item_state='AVAILABLE_WITH_LIMITATIONS' and implementation_state='internal_offer_promotion_only'
        and config_json='{"action_class":"EXECUTABLE_WITH_APPROVAL","executor_type":"SERVER_RPC","approval_class":"HUMAN_REQUIRED","production_mutation":true,"canonical_seo_mutation":false,"security_mutation":false,"indexation_mutation":false,"order_creation":false,"payment":false,"contract_version":"commerce_offer_promotion_v1"}'::jsonb)
    or (select count(*) from public.feya_growth_registry_items_v1
      where registry_type='action_capability' and item_code='PROMOTE_PRODUCT_OFFER' and active_flag)<>1 then ready:=false; end if;

  return jsonb_build_object(
    'contract_version','commerce_offer_promotion_v1','ready',ready,
    'direct_offer_table_write_enabled',false,'promotion_rpc_enabled',ready,
    'quote_enabled_after_promotion',true,'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false
  );
end $$;

create function public.feya_commerce_promote_offer_v1(p_actor_user_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare
  request_id uuid; product_id uuid; expected_variant_revision bigint; expected_offer_revision bigint;
  release_ref text; max_quantity integer; payload_hash text; variant_snapshot jsonb; variant_snapshot_sha text;
  current_variant_revision bigint; current_offer_id uuid; current_offer_revision bigint:=0; new_offer_revision bigint;
  new_offer_id uuid:=gen_random_uuid(); event_id uuid:=gen_random_uuid(); response jsonb; items jsonb:='[]'::jsonb;
  v jsonb; cfg jsonb; variant_text text; config_id uuid; sellable_id uuid; color_id uuid; size_id uuid;
  source_row record; exponent integer; amount_minor numeric; evidence_hash text; evidence_ref text;
  prior record; price_quote_id uuid; price_revision bigint; item jsonb; count_ids integer;
  receipt public.feya_commerce_offer_promotion_receipts_v1%rowtype;
  product_row public.feya_commerce_product_drafts%rowtype; execution_row record; approved_hash text;
  k text;
begin
  if p_actor_user_id is null or not exists(select 1 from auth.users u where u.id=p_actor_user_id)
    then raise exception 'offer_promotion_actor_required'; end if;
  if not coalesce((public.feya_commerce_offer_promotion_health_v1()->>'ready')::boolean,false)
    then raise exception 'offer_promotion_contract_not_ready'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>131072
    or (select count(*) from jsonb_object_keys(p_payload))<>8 then raise exception 'offer_promotion_request_invalid'; end if;
  foreach k in array array[
    'contract_version','request_id','canonical_product_id','expected_variant_revision',
    'expected_offer_revision','release_ref','max_quantity_per_line','variant_ids'
  ] loop
    if not p_payload ? k then raise exception 'offer_promotion_request_invalid'; end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(p_payload) x(k) where x.k<>all(array[
    'contract_version','request_id','canonical_product_id','expected_variant_revision',
    'expected_offer_revision','release_ref','max_quantity_per_line','variant_ids'
  ])) then raise exception 'offer_promotion_request_invalid'; end if;
  if p_payload->>'contract_version'<>'commerce_offer_promotion_v1'
    or jsonb_typeof(p_payload->'request_id')<>'string'
    or jsonb_typeof(p_payload->'canonical_product_id')<>'string'
    or not ((p_payload->>'request_id')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or not ((p_payload->>'canonical_product_id')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    then raise exception 'offer_promotion_request_invalid'; end if;
  foreach k in array array['expected_variant_revision','expected_offer_revision','max_quantity_per_line'] loop
    if jsonb_typeof(p_payload->k)<>'number'
      or (p_payload->>k)::numeric<>trunc((p_payload->>k)::numeric)
      then raise exception 'offer_promotion_request_invalid'; end if;
    if k='expected_offer_revision' then
      if (p_payload->>k)::numeric<0 or (p_payload->>k)::numeric>9007199254740991
        then raise exception 'offer_promotion_request_invalid'; end if;
    elsif k='max_quantity_per_line' then
      if (p_payload->>k)::numeric<1 or (p_payload->>k)::numeric>1000
        then raise exception 'offer_promotion_request_invalid'; end if;
    else
      if (p_payload->>k)::numeric<1 or (p_payload->>k)::numeric>9007199254740991
        then raise exception 'offer_promotion_request_invalid'; end if;
    end if;
  end loop;
  if jsonb_typeof(p_payload->'release_ref')<>'string' or length(btrim(p_payload->>'release_ref')) not between 1 and 200
    or jsonb_typeof(p_payload->'variant_ids')<>'array'
    or jsonb_array_length(p_payload->'variant_ids')<1 or jsonb_array_length(p_payload->'variant_ids')>512
    then raise exception 'offer_promotion_request_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'variant_ids') x(v)
      where jsonb_typeof(x.v)<>'string' or not ((x.v#>>'{}')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
    then raise exception 'offer_promotion_request_invalid'; end if;
  select count(distinct x.v#>>'{}') into count_ids from jsonb_array_elements(p_payload->'variant_ids') x(v);
  if count_ids<>jsonb_array_length(p_payload->'variant_ids') then raise exception 'offer_promotion_request_invalid'; end if;

  request_id:=(p_payload->>'request_id')::uuid;
  product_id:=(p_payload->>'canonical_product_id')::uuid;
  expected_variant_revision:=(p_payload->>'expected_variant_revision')::bigint;
  expected_offer_revision:=(p_payload->>'expected_offer_revision')::bigint;
  release_ref:=btrim(p_payload->>'release_ref');
  max_quantity:=(p_payload->>'max_quantity_per_line')::integer;
  payload_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');

  perform pg_advisory_xact_lock(hashtextextended('offer-promotion-request:'||request_id::text,0));
  select * into receipt from public.feya_commerce_offer_promotion_receipts_v1 r where r.request_id=request_id;
  if found then
    if receipt.actor_user_id<>p_actor_user_id or receipt.request_sha256<>payload_hash or receipt.canonical_product_id<>product_id
      then raise exception 'offer_promotion_request_conflict'; end if;
    return receipt.response||'{"replayed":true}'::jsonb;
  end if;

  select * into product_row from public.feya_commerce_product_drafts p where p.canonical_product_id=product_id for share;
  if not found then raise exception 'offer_promotion_product_not_found'; end if;
  if product_row.do_not_publish_flag then raise exception 'offer_promotion_product_held'; end if;

  select h.current_revision into current_variant_revision
    from public.feya_commerce_variant_heads_v1 h where h.canonical_product_id=product_id for update;
  if not found then raise exception 'offer_promotion_variant_revision_not_found'; end if;
  if current_variant_revision<>expected_variant_revision then raise exception 'offer_promotion_variant_revision_conflict'; end if;
  select r.snapshot,r.snapshot_sha256 into variant_snapshot,variant_snapshot_sha
    from public.feya_commerce_variant_revisions_v1 r
    where r.canonical_product_id=product_id and r.product_revision=current_variant_revision;
  if not found or variant_snapshot is null then raise exception 'offer_promotion_variant_revision_not_found'; end if;

  select h.current_offer_revision_id into current_offer_id
    from public.feya_commerce_offer_heads_v1 h where h.canonical_product_id=product_id for update;
  if found then
    select o.offer_revision into current_offer_revision from public.feya_commerce_offer_revisions_v1 o
      where o.offer_revision_id=current_offer_id and o.canonical_product_id=product_id;
    if not found then raise exception 'offer_promotion_offer_head_invalid'; end if;
  else
    current_offer_revision:=0;
  end if;
  if current_offer_revision<>expected_offer_revision then raise exception 'offer_promotion_offer_revision_conflict'; end if;
  new_offer_revision:=current_offer_revision+1;

  for variant_text in
    select x.v#>>'{}' from jsonb_array_elements(p_payload->'variant_ids') x(v) order by x.v#>>'{}'
  loop
    select x.value into v from jsonb_array_elements(variant_snapshot->'variants') x
      where x.value->>'variant_id'=variant_text;
    if not found then raise exception 'offer_promotion_variant_not_found'; end if;
    if v->>'state'<>'draft' then raise exception 'offer_promotion_variant_not_promotable'; end if;
    if v#>>'{pricing,mode}'<>'configuration_base' then raise exception 'offer_promotion_exception_price_not_ready'; end if;

    config_id:=(v->>'configuration_price_id')::uuid;
    color_id:=case when v->>'color_id' is null then null else (v->>'color_id')::uuid end;
    size_id:=case when v->>'size_id' is null then null else (v->>'size_id')::uuid end;

    select x.value into cfg from jsonb_array_elements(variant_snapshot->'configurations') x
      where x.value->>'configuration_price_id'=config_id::text;
    if not found then raise exception 'offer_promotion_configuration_not_found'; end if;
    sellable_id:=(cfg->>'sellable_configuration_id')::uuid;

    if color_id is not null and not exists(select 1 from jsonb_array_elements(variant_snapshot->'colors') x
      where x.value->>'id'=color_id::text and x.value->>'state'='confirmed') then raise exception 'offer_promotion_attribute_not_confirmed'; end if;
    if size_id is not null and not exists(select 1 from jsonb_array_elements(variant_snapshot->'sizes') x
      where x.value->>'id'=size_id::text and x.value->>'state'='confirmed') then raise exception 'offer_promotion_attribute_not_confirmed'; end if;

    if not exists(select 1 from public.feya_commerce_variant_identities_v1 i
      where i.variant_id=variant_text::uuid and i.canonical_product_id=product_id and i.configuration_price_id=config_id
        and i.color_id is not distinct from color_id and i.size_id is not distinct from size_id)
      then raise exception 'offer_promotion_variant_identity_conflict'; end if;

    select
      p.public_price_amount,p.source_currency,p.price_status,p.review_status as price_review_status,p.fallback_flag,
      p.updated_at as price_updated_at,c.review_status as configuration_review_status,c.is_public_candidate,c.is_sampler,
      c.updated_at as configuration_updated_at
    into source_row
    from public.feya_commerce_configuration_prices p
    join public.feya_commerce_sellable_configurations c
      on c.sellable_configuration_id=p.sellable_configuration_id and c.canonical_product_id=p.canonical_product_id
    where p.configuration_price_id=config_id and p.canonical_product_id=product_id
      and p.sellable_configuration_id=sellable_id
    for share of p,c;
    if not found then raise exception 'offer_promotion_configuration_not_found'; end if;

    if source_row.configuration_review_status<>'approved' then raise exception 'offer_promotion_configuration_not_approved'; end if;
    if source_row.is_public_candidate is distinct from true then raise exception 'offer_promotion_configuration_not_public'; end if;
    if source_row.is_sampler is true then raise exception 'offer_promotion_sampler_not_orderable'; end if;
    if source_row.price_review_status<>'approved' then raise exception 'offer_promotion_price_not_approved'; end if;
    if source_row.price_status not in ('approved','owner_reviewed') then raise exception 'offer_promotion_price_not_exact'; end if;
    if source_row.fallback_flag is distinct from false then raise exception 'offer_promotion_fallback_price_forbidden'; end if;
    if source_row.public_price_amount is null or source_row.public_price_amount<=0 then raise exception 'offer_promotion_public_price_invalid'; end if;
    if source_row.source_currency is null or source_row.source_currency!~'^[A-Z]{3}$' then raise exception 'offer_promotion_currency_invalid'; end if;

    exponent:=public.feya_commerce_currency_minor_exponent_v1(source_row.source_currency);
    if exponent is null then raise exception 'offer_promotion_currency_unsupported'; end if;
    amount_minor:=source_row.public_price_amount*power(10::numeric,exponent);
    if amount_minor<>trunc(amount_minor) or amount_minor<1 or amount_minor>9007199254740991
      then raise exception 'offer_promotion_public_price_invalid'; end if;

    evidence_hash:=encode(sha256(convert_to(
      jsonb_build_object(
        'configuration_price_id',config_id,'sellable_configuration_id',sellable_id,
        'public_price_amount',source_row.public_price_amount,'source_currency',source_row.source_currency,
        'price_status',source_row.price_status,'price_review_status',source_row.price_review_status,
        'fallback_flag',source_row.fallback_flag,'configuration_review_status',source_row.configuration_review_status,
        'is_public_candidate',source_row.is_public_candidate,'is_sampler',source_row.is_sampler,
        'price_updated_at',source_row.price_updated_at,'configuration_updated_at',source_row.configuration_updated_at
      )::text,'UTF8')),'hex');
    evidence_ref:='configuration-price:'||config_id::text||':'||evidence_hash;

    select i.price_quote_id,i.price_revision,i.amount_minor,i.currency,i.price_source,i.price_evidence_ref
      into prior
    from public.feya_commerce_offer_variant_items_v1 i
    join public.feya_commerce_offer_revisions_v1 o on o.offer_revision_id=i.offer_revision_id
    where i.canonical_product_id=product_id and i.variant_id=variant_text::uuid
    order by o.offer_revision desc limit 1;

    if found and prior.amount_minor=amount_minor::bigint and prior.currency=source_row.source_currency
      and prior.price_source='configuration_base' and prior.price_evidence_ref=evidence_ref then
      price_quote_id:=prior.price_quote_id; price_revision:=prior.price_revision;
    else
      price_quote_id:=gen_random_uuid(); price_revision:=coalesce(prior.price_revision,0)+1;
    end if;

    item:=jsonb_build_object(
      'variant_id',variant_text::uuid,'configuration_price_id',config_id,'color_id',color_id,'size_id',size_id,
      'price_quote_id',price_quote_id,'price_revision',price_revision,'amount_minor',amount_minor::bigint,
      'currency',source_row.source_currency,'price_source','configuration_base','price_evidence_ref',evidence_ref
    );
    items:=items||jsonb_build_array(item);
  end loop;

  select * into execution_row from public.feya_fn_create_execution_request_v1(
    'PROMOTE_PRODUCT_OFFER','OFFER',jsonb_build_object('canonical_product_id',product_id),
    jsonb_build_object('variant_revision',expected_variant_revision,'offer_revision',expected_offer_revision,'release_ref',release_ref),
    jsonb_build_object(
      'contract_version','commerce_offer_promotion_v1','request_id',request_id,
      'variant_ids',p_payload->'variant_ids','max_quantity_per_line',max_quantity,
      'variant_snapshot_sha256',variant_snapshot_sha,'verified_items',items
    ),
    jsonb_build_object('mode','move_offer_head_to_previous_revision','previous_offer_revision_id',current_offer_id,'never_delete_history',true),
    jsonb_build_object('expected_offer_revision',new_offer_revision,'order_creation_enabled',false,'payment_enabled',false),
    'human',p_actor_user_id,'offer-promotion:'||request_id::text
  );
  if not execution_row.created_new or execution_row.request_status<>'APPROVAL_REQUIRED' then raise exception 'offer_promotion_execution_conflict'; end if;
  perform public.feya_fn_approve_execution_request_v1(
    execution_row.execution_request_id,'APPROVAL_REQUIRED',p_actor_user_id,
    'Authenticated human approved exact commerce offer promotion for this payload hash; no order, payment or indexing approval.'
  );
  select e.approval_hash into approved_hash from public.feya_growth_execution_requests_v1 e
    where e.execution_request_id=execution_row.execution_request_id and e.request_status='APPROVED'
      and e.approved_by_user_id=p_actor_user_id and e.approval_hash=e.request_hash;
  if not found or approved_hash is null then raise exception 'offer_promotion_execution_conflict'; end if;

  insert into public.feya_commerce_offer_revisions_v1(
    offer_revision_id,canonical_product_id,offer_revision,product_revision,release_ref,approval_ref,status,max_quantity_per_line,snapshot_sha256
  ) values(
    new_offer_id,product_id,new_offer_revision,expected_variant_revision,release_ref,
    'execution:'||execution_row.execution_request_id::text||':'||approved_hash,'active',max_quantity,variant_snapshot_sha
  );

  for item in select value from jsonb_array_elements(items) loop
    insert into public.feya_commerce_offer_variant_items_v1(
      offer_revision_id,canonical_product_id,variant_id,configuration_price_id,color_id,size_id,item_status,
      price_quote_id,price_revision,amount_minor,currency,price_source,price_evidence_ref
    ) values(
      new_offer_id,product_id,(item->>'variant_id')::uuid,(item->>'configuration_price_id')::uuid,
      (item->>'color_id')::uuid,(item->>'size_id')::uuid,'active',(item->>'price_quote_id')::uuid,
      (item->>'price_revision')::bigint,(item->>'amount_minor')::bigint,item->>'currency',
      item->>'price_source',item->>'price_evidence_ref'
    );
  end loop;

  insert into public.feya_commerce_offer_heads_v1(canonical_product_id,current_offer_revision_id)
    values(product_id,new_offer_id)
    on conflict(canonical_product_id) do update
      set current_offer_revision_id=excluded.current_offer_revision_id,updated_at=now();

  update public.feya_growth_execution_requests_v1
    set request_status='SUCCEEDED',updated_at=now()
    where execution_request_id=execution_row.execution_request_id and request_status='APPROVED' and approval_hash=request_hash;
  if not found then raise exception 'offer_promotion_execution_conflict'; end if;

  insert into public.feya_growth_change_events_v1(
    change_event_id,event_code,change_domain,change_type,entity_type,entity_key,execution_request_id,
    version_before_json,version_after_json,source_type,source_ref,metadata_json,idempotency_key
  ) values(
    event_id,'OFFER-PROMOTION-'||request_id::text,'OFFER','OFFER_REVISION_PROMOTED','canonical_product',product_id::text,
    execution_row.execution_request_id,
    jsonb_build_object('offer_revision',expected_offer_revision,'offer_revision_id',current_offer_id),
    jsonb_build_object('offer_revision',new_offer_revision,'offer_revision_id',new_offer_id,'variant_revision',expected_variant_revision),
    'human','Commerce offer promotion',
    jsonb_build_object('actor_user_id',p_actor_user_id,'release_ref',release_ref,'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false),
    'offer-promotion:'||request_id::text
  );

  response:=jsonb_build_object(
    'contract_version','commerce_offer_promotion_v1','request_id',request_id,'canonical_product_id',product_id,
    'variant_revision',expected_variant_revision,'offer_revision_id',new_offer_id,'offer_revision',new_offer_revision,
    'release_ref',release_ref,'variant_count',jsonb_array_length(items),'execution_request_id',execution_row.execution_request_id,
    'change_event_id',event_id,'request_hash',approved_hash,'quote_ready',true,
    'order_creation_enabled',false,'payment_enabled',false,'indexing_enabled',false,'replayed',false
  );

  insert into public.feya_commerce_offer_promotion_receipts_v1(
    request_id,actor_user_id,canonical_product_id,offer_revision_id,offer_revision,request_sha256,
    execution_request_id,change_event_id,response
  ) values(
    request_id,p_actor_user_id,product_id,new_offer_id,new_offer_revision,payload_hash,
    execution_row.execution_request_id,event_id,response
  );
  insert into public.feya_commerce_offer_promotion_outbox_v1(
    change_event_id,canonical_product_id,offer_revision_id,offer_revision
  ) values(event_id,product_id,new_offer_id,new_offer_revision);

  return response;
end $$;

do $$
declare t text; p text;
begin
  foreach t in array array['feya_commerce_offer_promotion_receipts_v1','feya_commerce_offer_promotion_outbox_v1'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  end loop;
  grant select on public.feya_commerce_offer_promotion_receipts_v1,public.feya_commerce_offer_promotion_outbox_v1 to service_role;
  grant update on public.feya_commerce_offer_promotion_outbox_v1 to service_role;

  foreach p in array array[
    'feya_commerce_offer_promotion_health_v1()',
    'feya_commerce_promote_offer_v1(uuid,jsonb)',
    'feya_commerce_offer_promotion_immutable_v1()',
    'feya_commerce_currency_minor_exponent_v1(text)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_commerce_offer_promotion_health_v1() to service_role;
  grant execute on function public.feya_commerce_promote_offer_v1(uuid,jsonb) to service_role;
  grant execute on function public.feya_commerce_currency_minor_exponent_v1(text) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
