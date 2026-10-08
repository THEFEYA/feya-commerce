-- M2 internal successor: exact approved workspace / destination / immutable merchandise receipts.
-- No public rates, checkout/payment/provider sessions, carrier promises, tax or order creation.
-- Service-only. Country coverage and EUR prices still require separate Human Owner approval.
begin;

create table public.feya_commerce_approved_shipping_quote_receipts_v2 (
  shipping_quote_receipt_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  approval_id uuid not null,
  approval_revision bigint not null,
  workspace_version_id uuid not null,
  workspace_revision bigint not null,
  workspace_snapshot_sha256 text not null check (workspace_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  catalog_sha256 text not null check (catalog_sha256 ~ '^[0-9a-f]{64}$'),
  basket_sha256 text not null check (basket_sha256 ~ '^[0-9a-f]{64}$'),
  destination_sha256 text not null check (destination_sha256 ~ '^[0-9a-f]{64}$'),
  merchandise_quote_receipt_ids uuid[] not null check(cardinality(merchandise_quote_receipt_ids) between 1 and 20),
  destination_country text not null check (destination_country ~ '^[A-Z]{2}$'),
  destination_postal_code text not null check (length(destination_postal_code) <= 32),
  shipping_method text not null check (shipping_method in ('standard','express')),
  currency text not null check (currency='EUR'),
  amount_minor bigint not null check (amount_minor between 0 and 9007199254740991),
  parcel_count integer not null check (parcel_count between 1 and 100),
  details jsonb not null check(jsonb_typeof(details)='object'),
  response jsonb not null check(jsonb_typeof(response)='object'),
  calculated_at timestamptz not null,
  created_at timestamptz not null,
  expires_at timestamptz not null check(expires_at>created_at),
  payable boolean not null default false check(payable=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  provider_session_enabled boolean not null default false check(provider_session_enabled=false),
  foreign key (approval_id, approval_revision) references public.feya_commerce_delivery_approvals_v1(approval_id,revision) on delete restrict,
  foreign key (workspace_version_id, workspace_revision) references public.feya_commerce_delivery_workspace_versions_v1(version_id,revision) on delete restrict
);
create index feya_approved_shipping_quote_workspace_v2 on public.feya_commerce_approved_shipping_quote_receipts_v2
  (workspace_version_id,created_at desc);
create index feya_approved_shipping_quote_expiry_v2 on public.feya_commerce_approved_shipping_quote_receipts_v2(expires_at);

create function public.feya_commerce_approved_shipping_quote_immutable_v2() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'approved_shipping_quote_history_immutable'; end $$;
create trigger feya_approved_shipping_quote_immutable_v2 before update or delete
  on public.feya_commerce_approved_shipping_quote_receipts_v2
  for each row execute function public.feya_commerce_approved_shipping_quote_immutable_v2();

-- One unambiguous request identity, reusable for exact same-key replay even if
-- production calendar time, merchandise, or approval state subsequently changes.
create function public.feya_commerce_normalize_approved_shipping_request_v2(p_request jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare ids uuid[]; id uuid; country text; postal text; method text; request_id uuid;
begin
  if p_request is null or jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>4096
    or (select count(*) from jsonb_object_keys(p_request))<>6
    or exists(select 1 from jsonb_object_keys(p_request) k
      where k<>all(array['contract_version','request_id','quote_receipt_ids','country','postal_code','shipping_method']))
    or p_request->>'contract_version' is distinct from 'commerce_approved_shipping_quote_v2'
    or coalesce(p_request->>'request_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(p_request->'quote_receipt_ids') is distinct from 'array'
    or jsonb_array_length(p_request->'quote_receipt_ids') not between 1 and 20
    or p_request->>'country' is null or p_request->>'country' !~ '^[A-Z]{2}$'
    or p_request->>'postal_code' is null or jsonb_typeof(p_request->'postal_code') <> 'string'
    or length(p_request->>'postal_code')>32 or p_request->>'postal_code' !~ '^[A-Za-z0-9 -]*$'
    or p_request->>'shipping_method' not in ('standard','express')
    then raise exception 'approved_shipping_quote_request_invalid'; end if;
  request_id:=(p_request->>'request_id')::uuid;
  select array_agg(t.id order by t.id) into ids
  from (select (v::text)::uuid id from jsonb_array_elements_text(p_request->'quote_receipt_ids') v) t;
  if ids is null or cardinality(ids)<>(select count(distinct id) from unnest(ids) id)
    then raise exception 'approved_shipping_quote_request_invalid'; end if;
  country:=p_request->>'country';
  postal:=upper(regexp_replace(p_request->>'postal_code','[ -]','','g'));
  method:=p_request->>'shipping_method';
  return jsonb_build_object('contract_version','commerce_approved_shipping_quote_v2','request_id',request_id,
    'quote_receipt_ids',to_jsonb(ids),'country',country,'postal_code',postal,'shipping_method',method);
end $$;

create function public.feya_commerce_lookup_approved_shipping_quote_v2(p_request jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare normalized jsonb; old public.feya_commerce_approved_shipping_quote_receipts_v2;
  request_hash text;
begin
  normalized:=public.feya_commerce_normalize_approved_shipping_request_v2(p_request);
  request_hash:=encode(pg_catalog.sha256(convert_to(normalized::text,'UTF8')),'hex');
  select * into old from public.feya_commerce_approved_shipping_quote_receipts_v2
    where request_id=(normalized->>'request_id')::uuid;
  if not found then return null; end if;
  if old.request_sha256<>request_hash then raise exception 'approved_shipping_quote_request_conflict'; end if;
  return old.response || jsonb_build_object('replayed',true,'expired',old.expires_at<=transaction_timestamp());
end $$;

create function public.feya_commerce_create_approved_shipping_quote_v2(p_request jsonb,p_resolution jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare normalized jsonb; ids uuid[]; old public.feya_commerce_approved_shipping_quote_receipts_v2;
  context jsonb; approval jsonb; v_merchandise jsonb; request_hash text; request_id uuid;
  v_amount bigint; v_parcel_count integer; v_parcel_total numeric; v_parcel_units numeric;
  v_merchandise_units numeric; calc_at timestamptz; created timestamptz;
  expire_at timestamptz; quote_id uuid:=gen_random_uuid(); response jsonb;
begin
  normalized:=public.feya_commerce_normalize_approved_shipping_request_v2(p_request);
  request_id:=(normalized->>'request_id')::uuid;
  select array_agg((v::text)::uuid order by (v::text)::uuid) into ids
    from jsonb_array_elements_text(normalized->'quote_receipt_ids') v;
  request_hash:=encode(pg_catalog.sha256(convert_to(normalized::text,'UTF8')),'hex');

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('feya-approved-shipping-quote-v2:'||request_id::text,0));
  select * into old from public.feya_commerce_approved_shipping_quote_receipts_v2 where request_id=request_id;
  if found then
    if old.request_sha256<>request_hash then raise exception 'approved_shipping_quote_request_conflict'; end if;
    return old.response || jsonb_build_object('replayed',true,'expired',old.expires_at<=transaction_timestamp());
  end if;
  if p_resolution is null or jsonb_typeof(p_resolution)<>'object' or octet_length(p_resolution::text)>131072
    or p_resolution->>'contract_version' is distinct from 'commerce_approved_delivery_resolution_v1'
    or p_resolution->'quote_receipt_ids' is distinct from normalized->'quote_receipt_ids'
    or p_resolution->>'country' is distinct from normalized->>'country'
    or p_resolution->>'postal_code' is distinct from normalized->>'postal_code'
    or p_resolution->>'shipping_method' is distinct from normalized->>'shipping_method'
    or p_resolution->>'currency' is distinct from 'EUR'
    or p_resolution->'persisted' is distinct from 'false'::jsonb
    or p_resolution->'payable' is distinct from 'false'::jsonb
    or p_resolution->'public_rates_enabled' is distinct from 'false'::jsonb
    or p_resolution->'payment_enabled' is distinct from 'false'::jsonb
    or p_resolution->'provider_session_enabled' is distinct from 'false'::jsonb
    or jsonb_typeof(p_resolution->'parcels') is distinct from 'array'
    or jsonb_typeof(p_resolution->'estimated_arrival') is distinct from 'object'
    or coalesce(p_resolution->>'basket_sha256','') !~ '^[0-9a-f]{64}$'
    or coalesce(p_resolution->>'destination_sha256','') !~ '^[0-9a-f]{64}$'
    then raise exception 'approved_shipping_quote_resolution_invalid'; end if;

  -- Shared owner lock: owner draft saves/approvals use an exclusive transaction
  -- lock with this exact key. Reads for different buyer quotes can coexist.
  perform pg_catalog.pg_advisory_xact_lock_shared(734608221815091::bigint);
  -- Lock offer head rows for the merchandise being quoted, so concurrent
  -- new price-head promotion cannot land during this writer transaction.
  perform 1 from public.feya_commerce_offer_heads_v1 h
    join public.feya_commerce_quote_receipts_v1 q on q.canonical_product_id=h.canonical_product_id
    where q.quote_receipt_id=any(ids) for share of h;

  context:=public.feya_commerce_approved_delivery_context_v1(ids);
  approval:=context->'approval';
  v_merchandise:=context->'merchandise';
  if p_resolution->>'approval_id' is distinct from approval->>'approval_id'
    or p_resolution->'approval_revision' is distinct from approval->'revision'
    or p_resolution->>'workspace_version_id' is distinct from approval->>'workspace_version_id'
    or p_resolution->'workspace_revision' is distinct from approval->'workspace_revision'
    or p_resolution->>'snapshot_sha256' is distinct from approval->>'snapshot_sha256'
    or p_resolution->>'catalog_sha256' is distinct from context->>'catalog_sha256'
    or p_resolution->>'scheduling_time_zone' is distinct from (context->'approved_workspace'->'draft'->>'scheduling_time_zone')
    then raise exception 'approved_shipping_quote_authority_changed'; end if;

  if (select count(*) from jsonb_array_elements(v_merchandise) x
      where x->>'currency' <> 'EUR')>0 then
    raise exception 'approved_shipping_quote_currency_mismatch'; end if;
  if jsonb_typeof(p_resolution->'shipping_amount_minor') is distinct from 'number'
    or jsonb_typeof(p_resolution->'parcel_count') is distinct from 'number'
    then raise exception 'approved_shipping_quote_resolution_invalid'; end if;
  v_amount:=(p_resolution->>'shipping_amount_minor')::bigint;
  v_parcel_count:=(p_resolution->>'parcel_count')::integer;
  if v_amount<0 or v_amount>9007199254740991 or v_parcel_count not between 1 and 100
    or jsonb_array_length(p_resolution->'parcels')<>v_parcel_count
    then raise exception 'approved_shipping_quote_amount_invalid'; end if;
  select coalesce(sum((x->>'amount_minor')::numeric),0),coalesce(sum((x->>'quantity')::numeric),0)
    into v_parcel_total,v_parcel_units from jsonb_array_elements(p_resolution->'parcels') x;
  select coalesce(sum((x->>'quantity')::numeric),0) into v_merchandise_units from jsonb_array_elements(v_merchandise) x;
  if v_parcel_total<>v_amount or v_merchandise_units<>v_parcel_units or v_merchandise_units<1
    then raise exception 'approved_shipping_quote_amount_invalid'; end if;
  calc_at:=(p_resolution->>'calculated_at')::timestamptz;
  created:=clock_timestamp();
  if calc_at<created-interval '2 minutes' or calc_at>created+interval '10 seconds'
    then raise exception 'approved_shipping_quote_resolution_stale'; end if;
  expire_at:=created+interval '15 minutes';

  response:=jsonb_build_object('contract_version','commerce_approved_shipping_quote_v2',
    'shipping_quote_receipt_id',quote_id,'request_id',request_id,
    'approval_id',approval->>'approval_id','approval_revision',approval->'revision',
    'workspace_version_id',approval->>'workspace_version_id','workspace_revision',approval->'workspace_revision',
    'catalog_sha256',context->>'catalog_sha256',
    'basket_sha256',p_resolution->>'basket_sha256','destination_sha256',p_resolution->>'destination_sha256',
    'country',normalized->>'country','shipping_method',normalized->>'shipping_method',
    'currency','EUR','amount_minor',v_amount,'parcel_count',v_parcel_count,
    'estimated_arrival',p_resolution->'estimated_arrival','created_at',created,'expires_at',expire_at,
    'start_basis','preview_ready_now','persisted',true,'payable',false,
    'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false,
    'replayed',false,'expired',false);

  insert into public.feya_commerce_approved_shipping_quote_receipts_v2 (
    shipping_quote_receipt_id,request_id,request_sha256,
    approval_id,approval_revision,workspace_version_id,workspace_revision,workspace_snapshot_sha256,
    catalog_sha256,basket_sha256,destination_sha256,merchandise_quote_receipt_ids,
    destination_country,destination_postal_code,shipping_method,currency,amount_minor,parcel_count,
    details,response,calculated_at,created_at,expires_at
  ) values (
    quote_id,request_id,request_hash,
    (approval->>'approval_id')::uuid,(approval->>'revision')::bigint,
    (approval->>'workspace_version_id')::uuid,(approval->>'workspace_revision')::bigint,approval->>'snapshot_sha256',
    context->>'catalog_sha256',p_resolution->>'basket_sha256',p_resolution->>'destination_sha256',ids,
    normalized->>'country',normalized->>'postal_code',normalized->>'shipping_method','EUR',
    v_amount,v_parcel_count,p_resolution,response,calc_at,created,expire_at
  );
  return response;
end $$;

create function public.feya_commerce_approved_shipping_quote_health_v2() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare ok boolean:=true; fn text; role_name text;
begin
  if not exists(select 1 from pg_catalog.pg_class c where c.oid=
    'public.feya_commerce_approved_shipping_quote_receipts_v2'::regclass and c.relrowsecurity)
    then ok:=false; end if;
  foreach role_name in array array['anon','authenticated'] loop
    if has_table_privilege(role_name,'public.feya_commerce_approved_shipping_quote_receipts_v2','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      then ok:=false; end if;
  end loop;
  if not has_table_privilege('service_role','public.feya_commerce_approved_shipping_quote_receipts_v2','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_approved_shipping_quote_receipts_v2','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ok:=false; end if;
  foreach fn in array array[
    'feya_commerce_normalize_approved_shipping_request_v2(jsonb)',
    'feya_commerce_lookup_approved_shipping_quote_v2(jsonb)',
    'feya_commerce_create_approved_shipping_quote_v2(jsonb,jsonb)',
    'feya_commerce_approved_shipping_quote_health_v2()'
  ] loop
    foreach role_name in array array['anon','authenticated'] loop
      if has_function_privilege(role_name,'public.'||fn,'EXECUTE') then ok:=false; end if;
    end loop;
    if not has_function_privilege('service_role','public.'||fn,'EXECUTE') then ok:=false; end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_trigger
     where tgrelid='public.feya_commerce_approved_shipping_quote_receipts_v2'::regclass
       and tgname='feya_approved_shipping_quote_immutable_v2' and tgenabled='O')
     then ok:=false; end if;
  return jsonb_build_object('contract_version','commerce_approved_shipping_quote_v2','ready',ok,
    'payable',false,'public_rates_enabled',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

alter table public.feya_commerce_approved_shipping_quote_receipts_v2 enable row level security;
revoke all on public.feya_commerce_approved_shipping_quote_receipts_v2 from public,anon,authenticated,service_role;
grant select,insert on public.feya_commerce_approved_shipping_quote_receipts_v2 to service_role;
revoke all on function public.feya_commerce_approved_shipping_quote_immutable_v2(),
  public.feya_commerce_normalize_approved_shipping_request_v2(jsonb),
  public.feya_commerce_lookup_approved_shipping_quote_v2(jsonb),
  public.feya_commerce_create_approved_shipping_quote_v2(jsonb,jsonb),
  public.feya_commerce_approved_shipping_quote_health_v2()
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_normalize_approved_shipping_request_v2(jsonb),
  public.feya_commerce_lookup_approved_shipping_quote_v2(jsonb),
  public.feya_commerce_create_approved_shipping_quote_v2(jsonb,jsonb),
  public.feya_commerce_approved_shipping_quote_health_v2()
  to service_role;
notify pgrst,'reload schema';
commit;
