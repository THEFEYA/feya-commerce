-- M2 commerce authority: server-owned shipping quote foundation.
-- No shipping price is invented here. The schema is installed with zero active rates.
-- A future Human Owner/provider approval must materialize an exact rate version before
-- any shipping quote can be created. Order/payment/provider-session creation remain OFF.

begin;

create table public.feya_commerce_shipping_rate_versions_v1(
  shipping_rate_version_id uuid primary key default gen_random_uuid(),
  shipping_method text not null check(shipping_method in ('standard','express')),
  currency text not null check(currency~'^[A-Z]{3}$'),
  destination_scope text not null default 'GLOBAL' check(destination_scope='GLOBAL'),
  version_no bigint not null check(version_no>0 and version_no<=9007199254740991),
  amount_minor bigint not null check(amount_minor>=0 and amount_minor<=9007199254740991),
  authority_type text not null check(authority_type in ('HUMAN_OWNER','PROVIDER')),
  authority_ref text not null check(length(btrim(authority_ref)) between 1 and 500),
  status text not null check(status in ('draft','active','retired')),
  snapshot_sha256 text not null check(snapshot_sha256~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(shipping_method,currency,destination_scope,version_no),
  unique(shipping_rate_version_id,shipping_method,currency,destination_scope)
);

create table public.feya_commerce_shipping_rate_heads_v1(
  shipping_method text not null,
  currency text not null,
  destination_scope text not null default 'GLOBAL',
  current_shipping_rate_version_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key(shipping_method,currency,destination_scope),
  foreign key(current_shipping_rate_version_id,shipping_method,currency,destination_scope)
    references public.feya_commerce_shipping_rate_versions_v1(
      shipping_rate_version_id,shipping_method,currency,destination_scope
    ) on delete restrict
);

create table public.feya_commerce_shipping_quote_receipts_v1(
  shipping_quote_receipt_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  order_intent_id uuid not null references public.feya_commerce_order_intents_v1(order_intent_id) on delete restrict,
  shipping_rate_version_id uuid not null references public.feya_commerce_shipping_rate_versions_v1(shipping_rate_version_id) on delete restrict,
  shipping_method text not null check(shipping_method in ('standard','express')),
  currency text not null check(currency~'^[A-Z]{3}$'),
  destination_scope text not null check(destination_scope='GLOBAL'),
  amount_minor bigint not null check(amount_minor>=0 and amount_minor<=9007199254740991),
  authority_type text not null check(authority_type in ('HUMAN_OWNER','PROVIDER')),
  authority_ref text not null,
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index feya_shipping_quote_intent_idx
  on public.feya_commerce_shipping_quote_receipts_v1(order_intent_id,created_at desc);

create function public.feya_commerce_shipping_history_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'commerce_shipping_history_is_immutable';
end $$;

create trigger feya_shipping_rate_version_immutable
  before update or delete on public.feya_commerce_shipping_rate_versions_v1
  for each row execute function public.feya_commerce_shipping_history_immutable_v1();

create trigger feya_shipping_quote_immutable
  before update or delete on public.feya_commerce_shipping_quote_receipts_v1
  for each row execute function public.feya_commerce_shipping_history_immutable_v1();

create function public.feya_commerce_shipping_quote_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare
  t text;
  r text;
  ready boolean:=true;
  active_standard integer:=0;
  active_express integer:=0;
begin
  foreach t in array array[
    'feya_commerce_shipping_rate_versions_v1',
    'feya_commerce_shipping_rate_heads_v1',
    'feya_commerce_shipping_quote_receipts_v1'
  ] loop
    if not exists(
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity
    ) then ready:=false; end if;
    foreach r in array array['anon','authenticated'] loop
      if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        then ready:=false; end if;
    end loop;
  end loop;

  if not has_table_privilege('service_role','public.feya_commerce_shipping_rate_versions_v1','SELECT')
    or has_table_privilege('service_role','public.feya_commerce_shipping_rate_versions_v1','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;
  if not has_table_privilege('service_role','public.feya_commerce_shipping_rate_heads_v1','SELECT')
    or has_table_privilege('service_role','public.feya_commerce_shipping_rate_heads_v1','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;
  if not has_table_privilege('service_role','public.feya_commerce_shipping_quote_receipts_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_shipping_quote_receipts_v1','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;

  select count(*) into active_standard
  from public.feya_commerce_shipping_rate_heads_v1 h
  join public.feya_commerce_shipping_rate_versions_v1 v
    on v.shipping_rate_version_id=h.current_shipping_rate_version_id
   and v.status='active'
   and v.shipping_method='standard'
   and v.currency='EUR'
   and v.destination_scope='GLOBAL';

  select count(*) into active_express
  from public.feya_commerce_shipping_rate_heads_v1 h
  join public.feya_commerce_shipping_rate_versions_v1 v
    on v.shipping_rate_version_id=h.current_shipping_rate_version_id
   and v.status='active'
   and v.shipping_method='express'
   and v.currency='EUR'
   and v.destination_scope='GLOBAL';

  return jsonb_build_object(
    'contract_version','commerce_shipping_quote_v1',
    'schema_ready',ready,
    'shipping_authority_ready',ready and active_standard=1 and active_express=1,
    'currency','EUR',
    'destination_scope','GLOBAL',
    'active_standard_rate_count',active_standard,
    'active_express_rate_count',active_express,
    'client_amounts_accepted',false,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false
  );
end $$;

create function public.feya_commerce_create_shipping_quote_v1(p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  v_request_id uuid;
  v_order_intent_id uuid;
  v_method text;
  v_hash text;
  v_intent public.feya_commerce_order_intents_v1%rowtype;
  v_rate public.feya_commerce_shipping_rate_versions_v1%rowtype;
  v_existing public.feya_commerce_shipping_quote_receipts_v1%rowtype;
  v_quote_id uuid:=gen_random_uuid();
  v_response jsonb;
  k text;
begin
  if not coalesce((public.feya_commerce_shipping_quote_health_v1()->>'schema_ready')::boolean,false)
    then raise exception 'shipping_quote_contract_not_ready'; end if;

  if p_payload is null
    or jsonb_typeof(p_payload)<>'object'
    or octet_length(p_payload::text)>16384
    or (select count(*) from jsonb_object_keys(p_payload))<>4
    then raise exception 'shipping_quote_request_invalid'; end if;

  foreach k in array array['contract_version','request_id','order_intent_id','shipping_method'] loop
    if not p_payload ? k then raise exception 'shipping_quote_request_invalid'; end if;
  end loop;
  if exists(
    select 1 from jsonb_object_keys(p_payload) x(k)
    where x.k<>all(array['contract_version','request_id','order_intent_id','shipping_method'])
  ) then raise exception 'shipping_quote_request_invalid'; end if;

  if p_payload->>'contract_version'<>'commerce_shipping_quote_v1'
    then raise exception 'shipping_quote_request_invalid'; end if;
  if jsonb_typeof(p_payload->'request_id')<>'string'
    or not ((p_payload->>'request_id')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or jsonb_typeof(p_payload->'order_intent_id')<>'string'
    or not ((p_payload->>'order_intent_id')~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or p_payload->>'shipping_method' not in ('standard','express')
    then raise exception 'shipping_quote_request_invalid'; end if;

  v_request_id:=(p_payload->>'request_id')::uuid;
  v_order_intent_id:=(p_payload->>'order_intent_id')::uuid;
  v_method:=p_payload->>'shipping_method';
  v_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');

  perform pg_advisory_xact_lock(hashtextextended('commerce-shipping-quote:'||v_request_id::text,0));

  select * into v_existing
  from public.feya_commerce_shipping_quote_receipts_v1 q
  where q.request_id=v_request_id;
  if found then
    if v_existing.request_sha256<>v_hash then raise exception 'shipping_quote_request_conflict'; end if;
    return v_existing.response||'{"replayed":true}'::jsonb;
  end if;

  select * into v_intent
  from public.feya_commerce_order_intents_v1 i
  where i.order_intent_id=v_order_intent_id;
  if not found then raise exception 'shipping_quote_order_intent_not_found'; end if;
  if v_intent.intent_status<>'quote_bound_shipping_pending'
    then raise exception 'shipping_quote_order_intent_state_invalid'; end if;
  if v_intent.shipping_method<>v_method
    then raise exception 'shipping_quote_method_conflict'; end if;

  select v.* into v_rate
  from public.feya_commerce_shipping_rate_heads_v1 h
  join public.feya_commerce_shipping_rate_versions_v1 v
    on v.shipping_rate_version_id=h.current_shipping_rate_version_id
  where h.shipping_method=v_method
    and h.currency=v_intent.currency
    and h.destination_scope='GLOBAL'
    and v.status='active'
    and v.destination_scope='GLOBAL';

  if not found then raise exception 'shipping_quote_rate_not_configured'; end if;

  v_response:=jsonb_build_object(
    'contract_version','commerce_shipping_quote_v1',
    'shipping_quote_receipt_id',v_quote_id,
    'request_id',v_request_id,
    'order_intent_id',v_order_intent_id,
    'shipping_rate_version_id',v_rate.shipping_rate_version_id,
    'shipping_method',v_method,
    'currency',v_intent.currency,
    'destination_scope','GLOBAL',
    'amount_minor',v_rate.amount_minor,
    'authority_type',v_rate.authority_type,
    'authority_ref',v_rate.authority_ref,
    'expires_at',null,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false,
    'replayed',false
  );

  insert into public.feya_commerce_shipping_quote_receipts_v1(
    shipping_quote_receipt_id,request_id,request_sha256,order_intent_id,shipping_rate_version_id,
    shipping_method,currency,destination_scope,amount_minor,authority_type,authority_ref,response
  ) values(
    v_quote_id,v_request_id,v_hash,v_order_intent_id,v_rate.shipping_rate_version_id,
    v_method,v_intent.currency,'GLOBAL',v_rate.amount_minor,v_rate.authority_type,v_rate.authority_ref,v_response
  );

  return v_response;
end $$;

do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'feya_commerce_shipping_rate_versions_v1',
    'feya_commerce_shipping_rate_heads_v1',
    'feya_commerce_shipping_quote_receipts_v1'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  end loop;

  grant select on public.feya_commerce_shipping_rate_versions_v1,public.feya_commerce_shipping_rate_heads_v1
    to service_role;
  grant select,insert on public.feya_commerce_shipping_quote_receipts_v1 to service_role;

  foreach p in array array[
    'feya_commerce_shipping_history_immutable_v1()',
    'feya_commerce_shipping_quote_health_v1()',
    'feya_commerce_create_shipping_quote_v1(jsonb)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
