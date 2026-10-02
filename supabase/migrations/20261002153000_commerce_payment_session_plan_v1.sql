-- M2 provider-neutral payment-session planning boundary.
-- Depends on commerce_checkout_snapshot_v1.
--
-- No payment provider row is seeded. No external HTTP call occurs in Postgres.
-- The plan may only be materialized after an explicitly confirmed provider version
-- is installed, and it still does not create a provider session or payment.

begin;

create table public.feya_commerce_payment_provider_versions_v1(
  payment_provider_version_id uuid primary key default gen_random_uuid(),
  provider_code text not null check(provider_code~'^[a-z0-9][a-z0-9_-]{1,63}$'),
  version_no bigint not null check(version_no>0 and version_no<=9007199254740991),
  adapter_mode text not null check(adapter_mode in ('hosted_link','api')),
  transaction_party_code text not null check(length(btrim(transaction_party_code)) between 1 and 100),
  public_role_description text not null check(length(btrim(public_role_description)) between 1 and 500),
  role_confirmed boolean not null check(role_confirmed=true),
  authority_type text not null check(authority_type in ('HUMAN_OWNER','PROVIDER')),
  authority_ref text not null check(length(btrim(authority_ref)) between 1 and 500),
  api_version text,
  status text not null check(status in ('draft','active','retired')),
  snapshot_sha256 text not null check(snapshot_sha256~'^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(provider_code,version_no),
  unique(payment_provider_version_id,provider_code)
);

create table public.feya_commerce_payment_provider_heads_v1(
  provider_code text primary key,
  current_payment_provider_version_id uuid not null,
  updated_at timestamptz not null default now(),
  foreign key(current_payment_provider_version_id,provider_code)
    references public.feya_commerce_payment_provider_versions_v1(payment_provider_version_id,provider_code)
    on delete restrict
);

create table public.feya_commerce_payment_session_plans_v1(
  payment_session_plan_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  checkout_snapshot_id uuid not null unique references public.feya_commerce_checkout_snapshots_v1(checkout_snapshot_id) on delete restrict,
  payment_provider_version_id uuid not null references public.feya_commerce_payment_provider_versions_v1(payment_provider_version_id) on delete restrict,
  provider_code text not null,
  adapter_mode text not null check(adapter_mode in ('hosted_link','api')),
  transaction_party_code text not null,
  currency text not null check(currency~'^[A-Z]{3}$'),
  amount_minor bigint not null check(amount_minor>0 and amount_minor<=9007199254740991),
  plan_status text not null default 'adapter_pending'
    check(plan_status in ('adapter_pending','cancelled','consumed')),
  provider_session_created boolean not null default false check(provider_session_created=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  order_creation_enabled boolean not null default false check(order_creation_enabled=false),
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  foreign key(payment_provider_version_id,provider_code)
    references public.feya_commerce_payment_provider_versions_v1(payment_provider_version_id,provider_code)
    on delete restrict
);

create function public.feya_commerce_payment_session_history_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'commerce_payment_session_plan_history_is_immutable';
end $$;

create trigger feya_payment_provider_version_immutable
  before update or delete on public.feya_commerce_payment_provider_versions_v1
  for each row execute function public.feya_commerce_payment_session_history_immutable_v1();

create trigger feya_payment_session_plan_immutable
  before update or delete on public.feya_commerce_payment_session_plans_v1
  for each row execute function public.feya_commerce_payment_session_history_immutable_v1();

create function public.feya_commerce_payment_session_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare
  ready boolean:=true;
  r text;
  active_provider_count integer:=0;
begin
  if to_regclass('public.feya_commerce_checkout_snapshots_v1') is null then ready:=false; end if;

  if not exists(
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='feya_commerce_payment_provider_versions_v1'
      and c.relrowsecurity
  ) then ready:=false; end if;

  if not exists(
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='feya_commerce_payment_provider_heads_v1'
      and c.relrowsecurity
  ) then ready:=false; end if;

  if not exists(
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='feya_commerce_payment_session_plans_v1'
      and c.relrowsecurity
  ) then ready:=false; end if;

  foreach r in array array['anon','authenticated'] loop
    if has_table_privilege(r,'public.feya_commerce_payment_provider_versions_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or has_table_privilege(r,'public.feya_commerce_payment_provider_heads_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or has_table_privilege(r,'public.feya_commerce_payment_session_plans_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      then ready:=false; end if;
  end loop;

  if not has_table_privilege('service_role','public.feya_commerce_payment_provider_versions_v1','SELECT')
    or has_table_privilege('service_role','public.feya_commerce_payment_provider_versions_v1',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;
  if not has_table_privilege('service_role','public.feya_commerce_payment_provider_heads_v1','SELECT')
    or has_table_privilege('service_role','public.feya_commerce_payment_provider_heads_v1',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;
  if not has_table_privilege('service_role','public.feya_commerce_payment_session_plans_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_payment_session_plans_v1',
      'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;

  select count(*) into active_provider_count
  from public.feya_commerce_payment_provider_heads_v1 h
  join public.feya_commerce_payment_provider_versions_v1 v
    on v.payment_provider_version_id=h.current_payment_provider_version_id
   and v.provider_code=h.provider_code
   and v.status='active'
   and v.role_confirmed=true;

  return jsonb_build_object(
    'contract_version','commerce_payment_session_plan_v1',
    'schema_ready',ready,
    'provider_authority_ready',ready and active_provider_count=1,
    'active_provider_count',active_provider_count,
    'client_amounts_accepted',false,
    'provider_session_created',false,
    'payment_enabled',false,
    'order_creation_enabled',false
  );
end $$;

create function public.feya_commerce_prepare_payment_session_v1(p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  v_request_id uuid;
  v_checkout_snapshot_id uuid;
  v_hash text;
  v_checkout public.feya_commerce_checkout_snapshots_v1%rowtype;
  v_provider public.feya_commerce_payment_provider_versions_v1%rowtype;
  v_existing public.feya_commerce_payment_session_plans_v1%rowtype;
  v_plan_id uuid:=gen_random_uuid();
  v_response jsonb;
  k text;
begin
  if not coalesce((public.feya_commerce_payment_session_health_v1()->>'schema_ready')::boolean,false)
    then raise exception 'payment_session_contract_not_ready'; end if;

  if p_payload is null
    or jsonb_typeof(p_payload)<>'object'
    or octet_length(p_payload::text)>16384
    or (select count(*) from jsonb_object_keys(p_payload))<>3
    then raise exception 'payment_session_request_invalid'; end if;

  foreach k in array array['contract_version','request_id','checkout_snapshot_id'] loop
    if not p_payload ? k then raise exception 'payment_session_request_invalid'; end if;
  end loop;
  if exists(
    select 1 from jsonb_object_keys(p_payload) x(k)
    where x.k<>all(array['contract_version','request_id','checkout_snapshot_id'])
  ) then raise exception 'payment_session_request_invalid'; end if;

  if p_payload->>'contract_version'<>'commerce_payment_session_plan_v1'
    then raise exception 'payment_session_request_invalid'; end if;

  foreach k in array array['request_id','checkout_snapshot_id'] loop
    if jsonb_typeof(p_payload->k)<>'string'
      or not ((p_payload->>k)~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      then raise exception 'payment_session_request_invalid'; end if;
  end loop;

  v_request_id:=(p_payload->>'request_id')::uuid;
  v_checkout_snapshot_id:=(p_payload->>'checkout_snapshot_id')::uuid;
  v_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');

  perform pg_advisory_xact_lock(hashtextextended('commerce-payment-session-plan:'||v_request_id::text,0));

  select * into v_existing
  from public.feya_commerce_payment_session_plans_v1 p
  where p.request_id=v_request_id;
  if found then
    if v_existing.request_sha256<>v_hash then raise exception 'payment_session_request_conflict'; end if;
    return v_existing.response||'{"replayed":true}'::jsonb;
  end if;

  select * into v_checkout
  from public.feya_commerce_checkout_snapshots_v1 c
  where c.checkout_snapshot_id=v_checkout_snapshot_id;
  if not found then raise exception 'payment_session_checkout_snapshot_not_found'; end if;
  if v_checkout.checkout_status<>'provider_pending'
    then raise exception 'payment_session_checkout_state_invalid'; end if;
  if v_checkout.order_creation_enabled or v_checkout.payment_enabled or v_checkout.provider_session_enabled
    then raise exception 'payment_session_checkout_boundary_invalid'; end if;

  select v.* into v_provider
  from public.feya_commerce_payment_provider_heads_v1 h
  join public.feya_commerce_payment_provider_versions_v1 v
    on v.payment_provider_version_id=h.current_payment_provider_version_id
   and v.provider_code=h.provider_code
  where v.status='active' and v.role_confirmed=true;

  if not found then raise exception 'payment_session_provider_not_configured'; end if;
  if (select count(*) from public.feya_commerce_payment_provider_heads_v1 h
      join public.feya_commerce_payment_provider_versions_v1 v
        on v.payment_provider_version_id=h.current_payment_provider_version_id
       and v.provider_code=h.provider_code
       and v.status='active'
       and v.role_confirmed=true)<>1
    then raise exception 'payment_session_provider_ambiguous'; end if;

  v_response:=jsonb_build_object(
    'contract_version','commerce_payment_session_plan_v1',
    'payment_session_plan_id',v_plan_id,
    'request_id',v_request_id,
    'checkout_snapshot_id',v_checkout_snapshot_id,
    'payment_provider_version_id',v_provider.payment_provider_version_id,
    'provider_code',v_provider.provider_code,
    'adapter_mode',v_provider.adapter_mode,
    'transaction_party_code',v_provider.transaction_party_code,
    'public_role_description',v_provider.public_role_description,
    'currency',v_checkout.currency,
    'amount_minor',v_checkout.total_amount_minor,
    'plan_status','adapter_pending',
    'provider_session_created',false,
    'payment_enabled',false,
    'order_creation_enabled',false,
    'replayed',false
  );

  insert into public.feya_commerce_payment_session_plans_v1(
    payment_session_plan_id,request_id,request_sha256,checkout_snapshot_id,payment_provider_version_id,
    provider_code,adapter_mode,transaction_party_code,currency,amount_minor,response
  ) values(
    v_plan_id,v_request_id,v_hash,v_checkout_snapshot_id,v_provider.payment_provider_version_id,
    v_provider.provider_code,v_provider.adapter_mode,v_provider.transaction_party_code,
    v_checkout.currency,v_checkout.total_amount_minor,v_response
  );

  return v_response;
end $$;

do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'feya_commerce_payment_provider_versions_v1',
    'feya_commerce_payment_provider_heads_v1',
    'feya_commerce_payment_session_plans_v1'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  end loop;

  grant select on public.feya_commerce_payment_provider_versions_v1,public.feya_commerce_payment_provider_heads_v1
    to service_role;
  grant select,insert on public.feya_commerce_payment_session_plans_v1 to service_role;

  foreach p in array array[
    'feya_commerce_payment_session_history_immutable_v1()',
    'feya_commerce_payment_session_health_v1()',
    'feya_commerce_prepare_payment_session_v1(jsonb)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
