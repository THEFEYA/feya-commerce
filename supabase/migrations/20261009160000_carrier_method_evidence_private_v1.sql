-- M2 carrier source evidence, service-private, additive. No carrier keys,
-- customer addresses, API calls, public rates or provider payment.
-- PR #92 provides the pure policy gate. Mappings require separate future owner
-- review workflow and observations require authenticated source adapters.
begin;

create table public.feya_commerce_carrier_service_mapping_reviews_v1 (
  mapping_revision_id uuid primary key default gen_random_uuid(),
  carrier text not null check (carrier in ('ukrposhta','nova_post')),
  direction text not null default 'UA_EXPORT' check (direction='UA_EXPORT'),
  shipping_method text not null check (shipping_method in ('standard','express')),
  parcel_class text not null check (parcel_class in ('ordinary','oversize')),
  carrier_service_code text not null
    check (carrier_service_code ~ '^[A-Za-z0-9_-]{2,64}$'),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  business_review_confirmed boolean not null check (business_review_confirmed=true),
  reviewed_at timestamptz not null default transaction_timestamp(),
  public_rates_enabled boolean not null default false check (public_rates_enabled=false),
  payment_enabled boolean not null default false check (payment_enabled=false),
  unique (mapping_revision_id,carrier,shipping_method,parcel_class,carrier_service_code)
);

create table public.feya_commerce_carrier_method_observations_v1 (
  capture_id uuid primary key default gen_random_uuid(),
  source_request_id uuid not null unique,
  mapping_revision_id uuid not null,
  carrier text not null check (carrier in ('ukrposhta','nova_post')),
  direction text not null default 'UA_EXPORT' check (direction='UA_EXPORT'),
  country text not null check (country ~ '^[A-Z]{2}$'),
  postal_prefix text check (postal_prefix is null or postal_prefix ~ '^[A-Z0-9]{1,12}$'),
  shipping_method text not null check (shipping_method in ('standard','express')),
  parcel_class text not null check (parcel_class in ('ordinary','oversize')),
  carrier_service_code text not null
    check (carrier_service_code ~ '^[A-Za-z0-9_-]{2,64}$'),
  carrier_api_result text not null check (carrier_api_result in ('available','unavailable')),
  source_digest_sha256 text not null check (source_digest_sha256 ~ '^[0-9a-f]{64}$'),
  source_adapter_version text not null
    check (source_adapter_version ~ '^[A-Za-z0-9._-]{3,80}$'),
  captured_at timestamptz not null,
  expires_at timestamptz not null,
  ingested_at timestamptz not null default clock_timestamp(),
  payable boolean not null default false check (payable=false),
  public_rates_enabled boolean not null default false check (public_rates_enabled=false),
  payment_enabled boolean not null default false check (payment_enabled=false),
  provider_session_enabled boolean not null default false check (provider_session_enabled=false),
  foreign key (mapping_revision_id,carrier,shipping_method,parcel_class,carrier_service_code)
    references public.feya_commerce_carrier_service_mapping_reviews_v1
    (mapping_revision_id,carrier,shipping_method,parcel_class,carrier_service_code)
    on delete restrict,
  constraint feya_carrier_evidence_age_v1 check (
    expires_at > captured_at
    and expires_at <= captured_at + interval '24 hours'
    and captured_at <= ingested_at + interval '10 seconds'
    and captured_at >= ingested_at - interval '24 hours'
    and expires_at > ingested_at
  )
);

create index feya_carrier_method_country_v1
  on public.feya_commerce_carrier_method_observations_v1
    (country,shipping_method,parcel_class,captured_at desc);
create index feya_carrier_method_expiry_v1
  on public.feya_commerce_carrier_method_observations_v1(expires_at);

create function public.feya_commerce_carrier_evidence_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'carrier_evidence_history_immutable'; end $$;

create trigger feya_carrier_mapping_immutable_v1 before update or delete
  on public.feya_commerce_carrier_service_mapping_reviews_v1
  for each row execute function public.feya_commerce_carrier_evidence_immutable_v1();
create trigger feya_carrier_observation_immutable_v1 before update or delete
  on public.feya_commerce_carrier_method_observations_v1
  for each row execute function public.feya_commerce_carrier_evidence_immutable_v1();

-- The service-only reader returns proof inputs, not an affirmative buyer
-- availability decision. The TS PR #92 gate must independently check freshness,
-- matched postcode, provider conflicts and banned destinations. No public route.
create function public.feya_commerce_carrier_method_context_v1(
  p_country text, p_postal_code text, p_shipping_method text, p_parcel_class text
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_postal text; v_total integer; v_evidence jsonb;
begin
  if p_country is null or p_country !~ '^[A-Z]{2}$'
    or p_postal_code is null or length(p_postal_code)>32
    or p_postal_code !~ '^[A-Za-z0-9 -]*$'
    or p_shipping_method not in ('standard','express')
    or p_parcel_class not in ('ordinary','oversize')
    then raise exception 'carrier_method_context_invalid'; end if;
  v_postal:=upper(regexp_replace(p_postal_code,'[ -]','','g'));

  -- Suspension list is also hard-denied by the current TypeScript calculator.
  -- This private read keeps the same conservative M2 snapshot; future carrier
  -- legal changes must be reviewed rather than silently flipping a route on.
  if p_country = any(array[
    'AF','BS','BY','BF','BI','HT','GY','GN','GQ','YE','IR','KI','KM',
    'MS','NE','PS','SS','RU','SY','SO','SD','TV','KP'
  ]) then
    return jsonb_build_object('contract_version','commerce_carrier_method_context_v1',
      'evidence','[]'::jsonb,'evidence_count',0,'blocked',true,
      'payable',false,'payment_enabled',false,'provider_session_enabled',false);
  end if;

  select count(*) into v_total
  from public.feya_commerce_carrier_method_observations_v1 o
  join public.feya_commerce_carrier_service_mapping_reviews_v1 m
    on m.mapping_revision_id=o.mapping_revision_id
  where o.country=p_country and o.shipping_method=p_shipping_method
    and o.parcel_class=p_parcel_class
    and (o.postal_prefix is null or v_postal like o.postal_prefix||'%')
    and o.expires_at>transaction_timestamp()
    and o.captured_at<=transaction_timestamp()
    and m.business_review_confirmed=true;
  if v_total>200 then
    return jsonb_build_object('contract_version','commerce_carrier_method_context_v1',
      'evidence','[]'::jsonb,'evidence_count',v_total,'blocked',true,
      'reason','evidence_overflow_fail_closed','payable',false,'payment_enabled',false,
      'provider_session_enabled',false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
     'contract_version','commerce_carrier_method_evidence_v1',
     'capture_id',o.capture_id,'source_digest_sha256',o.source_digest_sha256,
     'carrier',o.carrier,'direction',o.direction,'country',o.country,
     'postal_prefix',o.postal_prefix,'method',o.shipping_method,
     'carrier_service_code',o.carrier_service_code,'parcel_class',o.parcel_class,
     'carrier_api_result',o.carrier_api_result,
     'mapping_revision_id',o.mapping_revision_id,'method_mapping_owner_approved',true,
     'captured_at',to_char(o.captured_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
     'expires_at',to_char(o.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) order by o.captured_at desc,o.capture_id), '[]'::jsonb) into v_evidence
  from public.feya_commerce_carrier_method_observations_v1 o
  join public.feya_commerce_carrier_service_mapping_reviews_v1 m
    on m.mapping_revision_id=o.mapping_revision_id
  where o.country=p_country and o.shipping_method=p_shipping_method
    and o.parcel_class=p_parcel_class
    and (o.postal_prefix is null or v_postal like o.postal_prefix||'%')
    and o.expires_at>transaction_timestamp()
    and o.captured_at<=transaction_timestamp()
    and m.business_review_confirmed=true;
  return jsonb_build_object('contract_version','commerce_carrier_method_context_v1',
    'evidence',v_evidence,'evidence_count',v_total,'blocked',false,
    'payable',false,'payment_enabled',false,'provider_session_enabled',false);
end $$;

create function public.feya_commerce_carrier_method_health_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_ok boolean:=true; v_table text; v_role text; v_fn text;
begin
  foreach v_table in array array[
    'feya_commerce_carrier_service_mapping_reviews_v1',
    'feya_commerce_carrier_method_observations_v1'
  ] loop
    if not exists(select 1 from pg_catalog.pg_class c
        where c.oid=('public.'||v_table)::regclass and c.relrowsecurity)
      then v_ok:=false; end if;
    foreach v_role in array array['anon','authenticated'] loop
      if has_table_privilege(v_role,'public.'||v_table,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        then v_ok:=false; end if;
    end loop;
    if not has_table_privilege('service_role','public.'||v_table,'SELECT,INSERT')
      or has_table_privilege('service_role','public.'||v_table,
        'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      then v_ok:=false; end if;
  end loop;
  foreach v_fn in array array[
    'feya_commerce_carrier_method_context_v1(text,text,text,text)',
    'feya_commerce_carrier_method_health_v1()'
  ] loop
    foreach v_role in array array['anon','authenticated'] loop
      if has_function_privilege(v_role,'public.'||v_fn,'EXECUTE')
        then v_ok:=false; end if;
    end loop;
    if not has_function_privilege('service_role','public.'||v_fn,'EXECUTE')
      then v_ok:=false; end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_trigger
       where tgrelid='public.feya_commerce_carrier_method_observations_v1'::regclass
       and tgname='feya_carrier_observation_immutable_v1' and tgenabled='O')
    or not exists(select 1 from pg_catalog.pg_trigger
       where tgrelid='public.feya_commerce_carrier_service_mapping_reviews_v1'::regclass
       and tgname='feya_carrier_mapping_immutable_v1' and tgenabled='O')
    then v_ok:=false; end if;
  return jsonb_build_object('contract_version','commerce_carrier_method_context_v1',
    'private_boundary_ready',v_ok,'carrier_api_connected',false,
    'carrier_mapping_approved_count',(
      select count(*) from public.feya_commerce_carrier_service_mapping_reviews_v1
    ),'observations_count',(
      select count(*) from public.feya_commerce_carrier_method_observations_v1
    ),'public_rates_enabled',false,'payment_enabled',false);
end $$;

alter table public.feya_commerce_carrier_service_mapping_reviews_v1 enable row level security;
alter table public.feya_commerce_carrier_method_observations_v1 enable row level security;

revoke all on public.feya_commerce_carrier_service_mapping_reviews_v1,
  public.feya_commerce_carrier_method_observations_v1 from public,anon,authenticated,service_role;
grant select,insert on public.feya_commerce_carrier_service_mapping_reviews_v1,
  public.feya_commerce_carrier_method_observations_v1 to service_role;

revoke all on function public.feya_commerce_carrier_evidence_immutable_v1(),
  public.feya_commerce_carrier_method_context_v1(text,text,text,text),
  public.feya_commerce_carrier_method_health_v1()
  from public,anon,authenticated,service_role;
grant execute on function public.feya_commerce_carrier_method_context_v1(text,text,text,text),
  public.feya_commerce_carrier_method_health_v1() to service_role;

notify pgrst,'reload schema';
commit;
