-- TheFEYA payments v1: Seller Online (PayPal) provider installation, paid orders,
-- verified provider transactions and webhook/IPN event de-duplication.
--
-- Security model
--  * No table is readable or writable by anon/authenticated/service_role directly.
--    The Next.js server (service_role) may only call the SECURITY DEFINER functions
--    below, each of which validates its input and enforces the state machine.
--  * Provider secrets (PayPal REST client id/secret, Seller Online store key) live in
--    Supabase Vault. They are returned only by feya_pay_provider_runtime_v1(), which
--    only service_role may execute; no browser-facing status ever contains them.
--  * Payments can be ACTIVE only when the current provider configuration passed every
--    verification step AND a real LIVE test payment was captured and verified for that
--    exact configuration version. This is enforced by a CHECK constraint, so neither a
--    bug nor a forged request can switch checkout on early.
--  * Money is integer euro cents. A provider capture marks an order paid only when the
--    amount, currency, payee account, invoice and custom reference match exactly.
begin;

-- ---------------------------------------------------------------------------
-- Access grants: one-link invitations (Seller Online technician) and owner links.
-- Only SHA-256 of the token is stored.
-- ---------------------------------------------------------------------------
create table public.feya_pay_access_grants_v1(
  grant_id uuid primary key default gen_random_uuid(),
  token_sha256 text not null unique check(token_sha256 ~ '^[0-9a-f]{64}$'),
  role text not null check(role in ('technician','owner')),
  label text not null default '' check(length(label)<=120),
  created_by text not null default 'system' check(length(created_by) between 1 and 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  check(expires_at>created_at)
);

-- ---------------------------------------------------------------------------
-- Provider installation (singleton). Seller Online receives the money in its
-- PayPal account; TheFEYA identifies itself with the Seller Online store key.
-- ---------------------------------------------------------------------------
create table public.feya_pay_provider_v1(
  id smallint primary key default 1 check(id=1),
  provider_code text not null default 'seller_online' check(provider_code='seller_online'),
  engine text not null default 'paypal_checkout'
    check(engine in ('paypal_checkout','paypal_standard')),
  environment text not null default 'live' check(environment in ('sandbox','live')),
  credential_source text not null default 'none'
    check(credential_source in ('none','installer','platform')),
  client_id_vault_id uuid,
  client_secret_vault_id uuid,
  client_id_hint text check(client_id_hint is null or length(client_id_hint)<=12),
  payee_email text check(payee_email is null or (
    length(payee_email)<=254 and payee_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
  store_key_vault_id uuid,
  store_key_hint text check(store_key_hint is null or length(store_key_hint)<=12),
  config_version bigint not null default 1 check(config_version>0),
  credentials_verified_version bigint,
  credentials_verified_at timestamptz,
  payee_verified_version bigint,
  payee_verified_at timestamptz,
  payee_merchant_id text check(payee_merchant_id is null or payee_merchant_id ~ '^[A-Za-z0-9]{1,32}$'),
  webhook_id text check(webhook_id is null or webhook_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  webhook_verified_version bigint,
  webhook_verified_at timestamptz,
  webhook_last_event_at timestamptz,
  test_order_id uuid,
  test_verified_version bigint,
  test_environment text check(test_environment is null or test_environment in ('sandbox','live')),
  test_paid_at timestamptz,
  active boolean not null default false,
  activated_at timestamptz,
  activated_by text,
  paused_at timestamptz,
  paused_by text,
  last_error text check(last_error is null or length(last_error)<=500),
  updated_at timestamptz not null default now(),
  updated_by text,
  -- The single most important invariant of this migration.
  constraint feya_pay_provider_active_requires_verified_live_test check(
    not active or (
      environment='live'
      and test_environment='live'
      and test_verified_version=config_version
      and store_key_vault_id is not null
      and payee_email is not null
      and (
        engine='paypal_standard'
        or (credential_source in ('installer','platform')
            and credentials_verified_version=config_version
            and payee_verified_version=config_version
            and webhook_verified_version=config_version
            and webhook_id is not null)
      )
    )
  )
);
insert into public.feya_pay_provider_v1(id) values(1);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.feya_pay_order_number_seq_v1 start with 100001 minvalue 100001;

create table public.feya_pay_orders_v1(
  order_id uuid primary key default gen_random_uuid(),
  order_number text not null unique check(order_number ~ '^FEYA-[0-9]{6,9}$'),
  kind text not null check(kind in ('customer','test')),
  status text not null default 'pending_payment' check(status in (
    'pending_payment','payment_pending','paid','payment_failed','cancelled',
    'refunded','partially_refunded','reversed','needs_review')),
  engine text not null check(engine in ('paypal_checkout','paypal_standard')),
  environment text not null check(environment in ('sandbox','live')),
  config_version bigint not null check(config_version>0),
  currency text not null default 'EUR' check(currency='EUR'),
  merchandise_minor bigint not null check(merchandise_minor>=0),
  extras_minor bigint not null default 0 check(extras_minor>=0),
  shipping_minor bigint not null default 0 check(shipping_minor>=0),
  remote_minor bigint not null default 0 check(remote_minor>=0),
  handling_minor bigint not null default 0 check(handling_minor>=0),
  tax_minor bigint not null default 0 check(tax_minor=0),
  total_minor bigint not null check(total_minor between 100 and 100000000),
  check(total_minor=merchandise_minor+extras_minor+shipping_minor+remote_minor+handling_minor+tax_minor),
  item_quantity integer not null check(item_quantity between 1 and 400),
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  snapshot_sha256 text not null check(snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  buyer_email text check(buyer_email is null or length(buyer_email)<=320),
  buyer_name text check(buyer_name is null or length(buyer_name)<=201),
  country_code text check(country_code is null or country_code ~ '^[A-Z]{2}$'),
  expected_payee_email text check(expected_payee_email is null or length(expected_payee_email)<=254),
  expected_payee_merchant_id text check(expected_payee_merchant_id is null or expected_payee_merchant_id ~ '^[A-Za-z0-9]{1,32}$'),
  custom_id text not null check(length(custom_id) between 1 and 127),
  invoice_id text not null unique check(length(invoice_id) between 1 and 127),
  idempotency_key uuid not null unique,
  request_sha256 text not null check(request_sha256 ~ '^[0-9a-f]{64}$'),
  client_ip_sha256 text check(client_ip_sha256 is null or client_ip_sha256 ~ '^[0-9a-f]{64}$'),
  access_token_sha256 text not null unique check(access_token_sha256 ~ '^[0-9a-f]{64}$'),
  provider_order_id text unique check(provider_order_id is null or provider_order_id ~ '^[A-Za-z0-9-]{6,64}$'),
  capture_id text check(capture_id is null or capture_id ~ '^[A-Za-z0-9-]{6,64}$'),
  paid_minor bigint check(paid_minor is null or paid_minor>0),
  refunded_minor bigint not null default 0 check(refunded_minor>=0),
  review_reason text check(review_reason is null or length(review_reason)<=300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  check(kind='test' or (buyer_email is not null and buyer_name is not null and country_code is not null)),
  check(status<>'paid' or (paid_minor=total_minor and paid_at is not null and capture_id is not null))
);
create index feya_pay_orders_created_v1 on public.feya_pay_orders_v1(created_at desc);
create index feya_pay_orders_status_v1 on public.feya_pay_orders_v1(status,created_at desc);
create index feya_pay_orders_ip_v1 on public.feya_pay_orders_v1(client_ip_sha256,created_at desc);

-- ---------------------------------------------------------------------------
-- Provider transactions (captures, refunds, reversals) - verified facts only.
-- ---------------------------------------------------------------------------
create table public.feya_pay_transactions_v1(
  transaction_id uuid primary key default gen_random_uuid(),
  order_id uuid references public.feya_pay_orders_v1(order_id) on delete restrict,
  environment text not null check(environment in ('sandbox','live')),
  kind text not null check(kind in ('capture','refund','reversal')),
  provider_txn_id text not null check(provider_txn_id ~ '^[A-Za-z0-9-]{6,64}$'),
  parent_txn_id text check(parent_txn_id is null or parent_txn_id ~ '^[A-Za-z0-9-]{6,64}$'),
  status text not null check(length(status) between 1 and 40),
  amount_minor bigint not null check(amount_minor>=0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  payee_email text check(payee_email is null or length(payee_email)<=254),
  payee_merchant_id text check(payee_merchant_id is null or length(payee_merchant_id)<=32),
  matched boolean not null,
  mismatch_reason text check(mismatch_reason is null or length(mismatch_reason)<=300),
  source text not null check(source in ('capture_api','order_api','webhook','ipn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(environment,kind,provider_txn_id)
);
create index feya_pay_transactions_order_v1 on public.feya_pay_transactions_v1(order_id,created_at);

-- ---------------------------------------------------------------------------
-- Inbound provider events (webhooks / IPN) - de-duplication ledger.
-- ---------------------------------------------------------------------------
create table public.feya_pay_events_v1(
  event_key text primary key check(event_key ~ '^[a-z_]{3,20}:[A-Za-z0-9:_.-]{6,160}$'),
  source text not null check(source in ('paypal_webhook','paypal_ipn')),
  event_type text not null check(length(event_type) between 1 and 80),
  verified boolean not null,
  order_id uuid,
  outcome text check(outcome is null or length(outcome)<=80),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Audit of installation / activation actions (no secrets).
-- ---------------------------------------------------------------------------
create table public.feya_pay_audit_v1(
  audit_id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_role text not null check(actor_role in ('technician','owner','system','buyer','provider')),
  actor text not null check(length(actor) between 1 and 200),
  action text not null check(length(action) between 1 and 80),
  details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object')
);
create index feya_pay_audit_at_v1 on public.feya_pay_audit_v1(at desc);

alter table public.feya_pay_access_grants_v1 enable row level security;
alter table public.feya_pay_provider_v1 enable row level security;
alter table public.feya_pay_orders_v1 enable row level security;
alter table public.feya_pay_transactions_v1 enable row level security;
alter table public.feya_pay_events_v1 enable row level security;
alter table public.feya_pay_audit_v1 enable row level security;
revoke all on public.feya_pay_access_grants_v1, public.feya_pay_provider_v1,
  public.feya_pay_orders_v1, public.feya_pay_transactions_v1,
  public.feya_pay_events_v1, public.feya_pay_audit_v1
  from public, anon, authenticated, service_role;
revoke all on sequence public.feya_pay_order_number_seq_v1 from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.feya_pay_hint_v1(p_value text) returns text
language sql immutable set search_path='' as $$
  select case when p_value is null or length(p_value)<8 then null
    else '…'||right(p_value,4) end
$$;

create function public.feya_pay_audit_write_v1(p_role text,p_actor text,p_action text,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.feya_pay_audit_v1(actor_role,actor,action,details)
  values(p_role,left(coalesce(nullif(btrim(p_actor),''),'unknown'),200),p_action,coalesce(p_details,'{}'::jsonb));
end $$;

create function public.feya_pay_vault_put_v1(p_existing uuid,p_value text,p_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_existing is null then
    select vault.create_secret(p_value,
      p_name||'_'||replace(gen_random_uuid()::text,'-',''),
      'TheFEYA payments provider secret (installation panel)') into v_id;
    return v_id;
  end if;
  perform vault.update_secret(p_existing,p_value);
  return p_existing;
end $$;

create function public.feya_pay_vault_get_v1(p_id uuid)
returns text language sql stable security definer set search_path='' as $$
  select d.decrypted_secret from vault.decrypted_secrets d where p_id is not null and d.id=p_id
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
create function public.feya_pay_grant_mint_v1(p_role text,p_label text,p_ttl_hours integer,p_created_by text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_token text; v_expires timestamptz;
begin
  if p_role not in ('technician','owner') then raise exception 'feya_pay_grant_role_invalid'; end if;
  if p_ttl_hours is null or p_ttl_hours<1 or p_ttl_hours>24*90 then raise exception 'feya_pay_grant_ttl_invalid'; end if;
  -- 2 x UUIDv4 = 244 random bits. Only the SHA-256 is persisted.
  v_token := replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  v_expires := now()+make_interval(hours=>p_ttl_hours);
  insert into public.feya_pay_access_grants_v1(token_sha256,role,label,created_by,expires_at)
  values(encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_role,
    left(coalesce(p_label,''),120),left(coalesce(nullif(btrim(p_created_by),''),'system'),200),v_expires);
  perform public.feya_pay_audit_write_v1(case when p_role='owner' then 'system' else 'owner' end,
    coalesce(p_created_by,'system'),'grant_minted',
    jsonb_build_object('role',p_role,'label',left(coalesce(p_label,''),120),'expires_at',v_expires));
  return jsonb_build_object('ok',true,'token',v_token,'role',p_role,'expires_at',v_expires);
end $$;

create function public.feya_pay_grant_resolve_v1(p_token_sha256 text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare g public.feya_pay_access_grants_v1%rowtype;
begin
  if p_token_sha256 is null or p_token_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'code','invalid_access');
  end if;
  select * into g from public.feya_pay_access_grants_v1
   where token_sha256=p_token_sha256 and revoked_at is null and expires_at>now();
  if not found then return jsonb_build_object('ok',false,'code','invalid_access'); end if;
  update public.feya_pay_access_grants_v1 set last_used_at=now()
   where grant_id=g.grant_id and (last_used_at is null or last_used_at<now()-interval '1 minute');
  return jsonb_build_object('ok',true,'grant_id',g.grant_id,'role',g.role,'label',g.label,'expires_at',g.expires_at);
end $$;

create function public.feya_pay_grants_list_v1()
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'grant_id',g.grant_id,'role',g.role,'label',g.label,'created_by',g.created_by,
    'created_at',g.created_at,'expires_at',g.expires_at,'revoked_at',g.revoked_at,
    'last_used_at',g.last_used_at,
    'active',g.revoked_at is null and g.expires_at>now()) order by g.created_at desc),'[]'::jsonb)
  from (select * from public.feya_pay_access_grants_v1 order by created_at desc limit 50) g
$$;

create function public.feya_pay_grant_revoke_v1(p_grant_id uuid,p_actor text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  update public.feya_pay_access_grants_v1 set revoked_at=now()
   where grant_id=p_grant_id and revoked_at is null;
  perform public.feya_pay_audit_write_v1('owner',coalesce(p_actor,'owner'),'grant_revoked',
    jsonb_build_object('grant_id',p_grant_id));
  return jsonb_build_object('ok',found);
end $$;

-- ---------------------------------------------------------------------------
-- Provider status (safe for the installation panel and owner console)
-- ---------------------------------------------------------------------------
create function public.feya_pay_provider_status_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.feya_pay_provider_v1%rowtype; v_cur bigint;
begin
  select * into p from public.feya_pay_provider_v1 where id=1;
  v_cur := p.config_version;
  return jsonb_build_object(
    'ok',true,
    'provider','seller_online',
    'engine',p.engine,
    'environment',p.environment,
    'credential_source',p.credential_source,
    'client_id_hint',p.client_id_hint,
    'payee_email',p.payee_email,
    'store_key_set',p.store_key_vault_id is not null,
    'store_key_hint',p.store_key_hint,
    'config_version',v_cur,
    'checks',jsonb_build_object(
      'credentials',coalesce(p.credentials_verified_version=v_cur,false),
      'credentials_at',case when p.credentials_verified_version=v_cur then p.credentials_verified_at end,
      'payee',coalesce(p.payee_verified_version=v_cur,false),
      'payee_at',case when p.payee_verified_version=v_cur then p.payee_verified_at end,
      'payee_merchant_id',case when p.payee_verified_version=v_cur then p.payee_merchant_id end,
      'webhook',coalesce(p.webhook_verified_version=v_cur and p.webhook_id is not null,false),
      'webhook_at',case when p.webhook_verified_version=v_cur then p.webhook_verified_at end,
      'webhook_last_event_at',p.webhook_last_event_at,
      'test_payment',coalesce(p.test_verified_version=v_cur,false),
      'test_environment',case when p.test_verified_version=v_cur then p.test_environment end,
      'test_paid_at',case when p.test_verified_version=v_cur then p.test_paid_at end),
    'active',p.active,
    'activated_at',p.activated_at,
    'activated_by',p.activated_by,
    'paused_at',p.paused_at,
    'last_error',p.last_error,
    'updated_at',p.updated_at,
    'updated_by',p.updated_by,
    'paid_orders',(select count(*) from public.feya_pay_orders_v1 o where o.kind='customer' and o.status='paid'),
    'pending_orders',(select count(*) from public.feya_pay_orders_v1 o where o.kind='customer'
      and o.status in ('pending_payment','payment_pending'))
  );
end $$;

-- Public, cache-friendly: is checkout available for buyers right now?
create function public.feya_pay_public_state_v1()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('ok',true,'active',p.active,'engine',p.engine,
    'environment',p.environment,'config_version',p.config_version)
  from public.feya_pay_provider_v1 p where p.id=1
$$;

-- ---------------------------------------------------------------------------
-- Save provider configuration. Any change creates a new configuration version,
-- invalidates every verification for the previous version and pauses payments.
-- ---------------------------------------------------------------------------
create function public.feya_pay_provider_save_v1(p_payload jsonb,p_actor text,p_actor_role text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  p public.feya_pay_provider_v1%rowtype;
  allowed constant text[] := array['engine','environment','client_id','client_secret',
    'payee_email','store_key','clear_credentials','use_platform_credentials'];
  k text; v text; changed boolean := false; was_active boolean;
  v_engine text; v_env text; v_email text;
begin
  if p_actor_role not in ('technician','owner') then raise exception 'feya_pay_actor_invalid'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8000 then
    raise exception 'feya_pay_payload_invalid';
  end if;
  for k in select jsonb_object_keys(p_payload) loop
    if not (k = any(allowed)) then raise exception 'feya_pay_payload_invalid'; end if;
  end loop;
  for k, v in select key, value from jsonb_each_text(p_payload) loop
    if v is not null and (length(v)>600 or v ~ '[[:cntrl:]]') then raise exception 'feya_pay_field_invalid'; end if;
  end loop;

  select * into p from public.feya_pay_provider_v1 where id=1 for update;
  was_active := p.active;

  v_engine := nullif(btrim(coalesce(p_payload->>'engine','')),'');
  if v_engine is not null then
    if v_engine not in ('paypal_checkout','paypal_standard') then raise exception 'feya_pay_engine_invalid'; end if;
    if v_engine<>p.engine then p.engine:=v_engine; changed:=true; end if;
  end if;
  v_env := nullif(btrim(coalesce(p_payload->>'environment','')),'');
  if v_env is not null then
    if v_env not in ('sandbox','live') then raise exception 'feya_pay_environment_invalid'; end if;
    if v_env<>p.environment then p.environment:=v_env; changed:=true; end if;
  end if;

  if coalesce((p_payload->>'clear_credentials')::boolean,false) then
    if p.credential_source<>'none' then changed:=true; end if;
    p.credential_source:='none'; p.client_id_hint:=null;
    if p.client_id_vault_id is not null then perform vault.update_secret(p.client_id_vault_id,'-'); end if;
    if p.client_secret_vault_id is not null then perform vault.update_secret(p.client_secret_vault_id,'-'); end if;
  end if;
  if coalesce((p_payload->>'use_platform_credentials')::boolean,false) then
    if p.credential_source<>'platform' then p.credential_source:='platform'; p.client_id_hint:=null; changed:=true; end if;
  end if;

  v := nullif(btrim(coalesce(p_payload->>'client_id','')),'');
  if v is not null then
    if v !~ '^[A-Za-z0-9_-]{20,128}$' then raise exception 'feya_pay_client_id_invalid'; end if;
    p.client_id_vault_id := public.feya_pay_vault_put_v1(p.client_id_vault_id,v,'feya_pay_paypal_client_id');
    p.client_id_hint := public.feya_pay_hint_v1(v);
    p.credential_source := 'installer'; changed:=true;
  end if;
  v := nullif(btrim(coalesce(p_payload->>'client_secret','')),'');
  if v is not null then
    if v !~ '^[A-Za-z0-9_-]{20,160}$' then raise exception 'feya_pay_client_secret_invalid'; end if;
    p.client_secret_vault_id := public.feya_pay_vault_put_v1(p.client_secret_vault_id,v,'feya_pay_paypal_client_secret');
    p.credential_source := 'installer'; changed:=true;
  end if;
  v_email := nullif(lower(btrim(coalesce(p_payload->>'payee_email',''))),'');
  if v_email is not null then
    if length(v_email)>254 or v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
      raise exception 'feya_pay_payee_email_invalid';
    end if;
    if v_email is distinct from p.payee_email then p.payee_email:=v_email; changed:=true; end if;
  end if;
  v := nullif(btrim(coalesce(p_payload->>'store_key','')),'');
  if v is not null then
    if v !~ '^[A-Za-z0-9_-]{8,80}$' then raise exception 'feya_pay_store_key_invalid'; end if;
    p.store_key_vault_id := public.feya_pay_vault_put_v1(p.store_key_vault_id,v,'feya_pay_seller_online_store_key');
    p.store_key_hint := public.feya_pay_hint_v1(v);
    changed:=true;
  end if;

  if p.credential_source='installer' and (p.client_id_vault_id is null or p.client_secret_vault_id is null) then
    -- Both halves of a REST credential must be supplied together the first time.
    raise exception 'feya_pay_credentials_incomplete';
  end if;

  if changed then
    update public.feya_pay_provider_v1 set
      engine=p.engine, environment=p.environment, credential_source=p.credential_source,
      client_id_vault_id=p.client_id_vault_id, client_secret_vault_id=p.client_secret_vault_id,
      client_id_hint=p.client_id_hint, payee_email=p.payee_email,
      store_key_vault_id=p.store_key_vault_id, store_key_hint=p.store_key_hint,
      config_version=p.config_version+1,
      active=false,
      paused_at=case when was_active then now() else paused_at end,
      paused_by=case when was_active then 'configuration_changed' else paused_by end,
      last_error=null, updated_at=now(), updated_by=left(coalesce(p_actor,p_actor_role),200)
    where id=1;
    perform public.feya_pay_audit_write_v1(p_actor_role,coalesce(p_actor,p_actor_role),'provider_configured',
      jsonb_build_object('engine',p.engine,'environment',p.environment,
        'credential_source',p.credential_source,'payee_email',p.payee_email,
        'store_key_set',p.store_key_vault_id is not null,'config_version',p.config_version+1,
        'paused_active_payments',was_active));
  end if;
  return public.feya_pay_provider_status_v1()||jsonb_build_object('changed',changed);
end $$;

-- Server-only runtime view WITH decrypted secrets.
create function public.feya_pay_provider_runtime_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.feya_pay_provider_v1%rowtype;
begin
  select * into p from public.feya_pay_provider_v1 where id=1;
  return jsonb_build_object(
    'ok',true,'engine',p.engine,'environment',p.environment,
    'credential_source',p.credential_source,
    'client_id',case when p.credential_source='installer' then public.feya_pay_vault_get_v1(p.client_id_vault_id) end,
    'client_secret',case when p.credential_source='installer' then public.feya_pay_vault_get_v1(p.client_secret_vault_id) end,
    'payee_email',p.payee_email,
    'payee_merchant_id',p.payee_merchant_id,
    'store_key',public.feya_pay_vault_get_v1(p.store_key_vault_id),
    'webhook_id',p.webhook_id,
    'config_version',p.config_version,
    'active',p.active
  );
end $$;

-- Record the outcome of an automatic installation check for an exact config version.
create function public.feya_pay_provider_record_check_v1(
  p_config_version bigint,p_check text,p_ok boolean,p_details jsonb,p_actor text,p_actor_role text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare p public.feya_pay_provider_v1%rowtype; v_err text;
begin
  if p_check not in ('credentials','payee','webhook','webhook_event') then raise exception 'feya_pay_check_invalid'; end if;
  select * into p from public.feya_pay_provider_v1 where id=1 for update;
  if p_check='webhook_event' then
    update public.feya_pay_provider_v1 set webhook_last_event_at=now() where id=1;
    return jsonb_build_object('ok',true);
  end if;
  if p_config_version is distinct from p.config_version then
    return jsonb_build_object('ok',false,'code','configuration_changed');
  end if;
  v_err := left(coalesce(p_details->>'error',''),500);
  if p_check='credentials' then
    update public.feya_pay_provider_v1 set
      credentials_verified_version=case when p_ok then p_config_version end,
      credentials_verified_at=case when p_ok then now() end,
      last_error=case when p_ok then null else nullif(v_err,'') end
    where id=1;
  elsif p_check='payee' then
    if p_ok and (p_details->>'payee_merchant_id') is not null
       and (p_details->>'payee_merchant_id') !~ '^[A-Za-z0-9]{1,32}$' then
      raise exception 'feya_pay_merchant_id_invalid';
    end if;
    update public.feya_pay_provider_v1 set
      payee_verified_version=case when p_ok then p_config_version end,
      payee_verified_at=case when p_ok then now() end,
      payee_merchant_id=case when p_ok then nullif(p_details->>'payee_merchant_id','') end,
      last_error=case when p_ok then null else nullif(v_err,'') end
    where id=1;
  else
    if p_ok and coalesce(p_details->>'webhook_id','') !~ '^[A-Za-z0-9_-]{1,64}$' then
      raise exception 'feya_pay_webhook_id_invalid';
    end if;
    update public.feya_pay_provider_v1 set
      webhook_id=case when p_ok then p_details->>'webhook_id' else webhook_id end,
      webhook_verified_version=case when p_ok then p_config_version end,
      webhook_verified_at=case when p_ok then now() end,
      last_error=case when p_ok then null else nullif(v_err,'') end
    where id=1;
  end if;
  perform public.feya_pay_audit_write_v1(p_actor_role,coalesce(p_actor,p_actor_role),'check_'||p_check,
    jsonb_build_object('ok',p_ok,'config_version',p_config_version,'error',nullif(v_err,'')));
  return jsonb_build_object('ok',true);
end $$;

create function public.feya_pay_provider_set_active_v1(p_active boolean,p_actor text,p_actor_role text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare p public.feya_pay_provider_v1%rowtype;
begin
  if p_actor_role not in ('technician','owner') then raise exception 'feya_pay_actor_invalid'; end if;
  select * into p from public.feya_pay_provider_v1 where id=1 for update;
  if p_active then
    if p.environment<>'live' then return public.feya_pay_provider_status_v1()||'{"ok":false,"code":"live_environment_required"}'::jsonb; end if;
    if p.test_verified_version is distinct from p.config_version or p.test_environment is distinct from 'live' then
      return public.feya_pay_provider_status_v1()||'{"ok":false,"code":"live_test_payment_required"}'::jsonb;
    end if;
    begin
      update public.feya_pay_provider_v1 set active=true,activated_at=now(),
        activated_by=left(coalesce(p_actor,p_actor_role),200),paused_at=null,paused_by=null,updated_at=now()
      where id=1;
    exception when check_violation then
      return public.feya_pay_provider_status_v1()||'{"ok":false,"code":"verification_incomplete"}'::jsonb;
    end;
  else
    update public.feya_pay_provider_v1 set active=false,paused_at=now(),
      paused_by=left(coalesce(p_actor,p_actor_role),200),updated_at=now()
    where id=1;
  end if;
  perform public.feya_pay_audit_write_v1(p_actor_role,coalesce(p_actor,p_actor_role),
    case when p_active then 'payments_activated' else 'payments_paused' end,
    jsonb_build_object('config_version',p.config_version));
  return public.feya_pay_provider_status_v1();
end $$;

-- ---------------------------------------------------------------------------
-- Order creation. The Next.js server computes prices from the published product
-- read model; this function re-validates the arithmetic and the provider state.
-- ---------------------------------------------------------------------------
create function public.feya_pay_order_create_v1(p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  p public.feya_pay_provider_v1%rowtype;
  o public.feya_pay_orders_v1%rowtype;
  v_kind text; v_key uuid; v_req text; v_lines jsonb; v_extras jsonb; line jsonb;
  v_merch bigint := 0; v_extra bigint := 0; v_qty integer := 0; v_unit bigint; v_q integer;
  v_number text; v_recent integer; v_ip text;
  required constant text[] := array['idempotency_key','request_sha256','kind','engine','environment',
    'config_version','amounts','snapshot','snapshot_sha256','access_token_sha256'];
  k text;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>120000 then
    raise exception 'feya_pay_order_payload_invalid';
  end if;
  foreach k in array required loop
    if not (p_payload ? k) then raise exception 'feya_pay_order_payload_invalid'; end if;
  end loop;
  v_kind := p_payload->>'kind';
  if v_kind not in ('customer','test') then raise exception 'feya_pay_order_kind_invalid'; end if;
  v_key := (p_payload->>'idempotency_key')::uuid;
  v_req := p_payload->>'request_sha256';
  if v_req !~ '^[0-9a-f]{64}$' then raise exception 'feya_pay_order_payload_invalid'; end if;

  perform pg_advisory_xact_lock(hashtextextended('feya-pay-order:'||v_key::text,0));
  select * into o from public.feya_pay_orders_v1 where idempotency_key=v_key;
  if found then
    if o.request_sha256<>v_req then return jsonb_build_object('ok',false,'code','idempotency_conflict'); end if;
    return jsonb_build_object('ok',true,'replayed',true,'order_id',o.order_id,'order_number',o.order_number,
      'status',o.status,'provider_order_id',o.provider_order_id,'total_minor',o.total_minor,
      'invoice_id',o.invoice_id,'custom_id',o.custom_id);
  end if;

  select * into p from public.feya_pay_provider_v1 where id=1 for share;
  if (p_payload->>'config_version')::bigint is distinct from p.config_version
     or p_payload->>'engine' is distinct from p.engine
     or p_payload->>'environment' is distinct from p.environment then
    return jsonb_build_object('ok',false,'code','provider_configuration_changed');
  end if;
  if v_kind='customer' and not p.active then
    return jsonb_build_object('ok',false,'code','payments_not_active');
  end if;
  if v_kind='test' and p.active then
    return jsonb_build_object('ok',false,'code','pause_payments_before_test');
  end if;
  if p.store_key_vault_id is null or p.payee_email is null then
    return jsonb_build_object('ok',false,'code','provider_not_configured');
  end if;

  v_ip := p_payload->>'client_ip_sha256';
  if v_ip is not null then
    if v_ip !~ '^[0-9a-f]{64}$' then raise exception 'feya_pay_order_payload_invalid'; end if;
    select count(*) into v_recent from public.feya_pay_orders_v1
     where client_ip_sha256=v_ip and created_at>now()-interval '15 minutes';
    if v_recent>=8 then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
  end if;

  v_lines := p_payload#>'{snapshot,lines}';
  v_extras := coalesce(p_payload#>'{snapshot,extras}','[]'::jsonb);
  if jsonb_typeof(v_lines)<>'array' or jsonb_array_length(v_lines) not between 1 and 40
     or jsonb_typeof(v_extras)<>'array' or jsonb_array_length(v_extras)>45 then
    raise exception 'feya_pay_order_lines_invalid';
  end if;
  for line in select value from jsonb_array_elements(v_lines) loop
    v_unit := (line->>'unit_minor')::bigint; v_q := (line->>'quantity')::integer;
    if v_unit is null or v_unit<1 or v_q is null or v_q<1 or v_q>100
       or (line->>'line_minor')::bigint is distinct from v_unit*v_q then
      raise exception 'feya_pay_order_line_arithmetic_invalid';
    end if;
    v_merch := v_merch+v_unit*v_q; v_qty := v_qty+v_q;
  end loop;
  for line in select value from jsonb_array_elements(v_extras) loop
    if (line->>'amount_minor')::bigint is null or (line->>'amount_minor')::bigint<0 then
      raise exception 'feya_pay_order_extra_invalid';
    end if;
    v_extra := v_extra+(line->>'amount_minor')::bigint;
  end loop;
  if (p_payload#>>'{amounts,merchandise_minor}')::bigint is distinct from v_merch
     or (p_payload#>>'{amounts,extras_minor}')::bigint is distinct from v_extra then
    raise exception 'feya_pay_order_totals_mismatch';
  end if;

  v_number := 'FEYA-'||nextval('public.feya_pay_order_number_seq_v1')::text;
  insert into public.feya_pay_orders_v1(
    order_number,kind,engine,environment,config_version,
    merchandise_minor,extras_minor,shipping_minor,remote_minor,handling_minor,tax_minor,total_minor,
    item_quantity,snapshot,snapshot_sha256,buyer_email,buyer_name,country_code,
    expected_payee_email,expected_payee_merchant_id,custom_id,invoice_id,idempotency_key,request_sha256,
    client_ip_sha256,access_token_sha256)
  values(
    v_number,v_kind,p.engine,p.environment,p.config_version,
    v_merch,v_extra,
    (p_payload#>>'{amounts,shipping_minor}')::bigint,
    (p_payload#>>'{amounts,remote_minor}')::bigint,
    (p_payload#>>'{amounts,handling_minor}')::bigint,
    0,
    (p_payload#>>'{amounts,total_minor}')::bigint,
    v_qty,p_payload->'snapshot',p_payload->>'snapshot_sha256',
    nullif(lower(btrim(p_payload->>'buyer_email')),''),
    nullif(btrim(p_payload->>'buyer_name'),''),
    nullif(p_payload->>'country_code',''),
    p.payee_email,
    case when p.payee_verified_version=p.config_version then p.payee_merchant_id end,
    -- Seller Online store identification, as documented for CMS integrations:
    -- "<order reference>;opencart:<personal key>". The key never leaves the DB/server.
    left(v_number||';opencart:'||public.feya_pay_vault_get_v1(p.store_key_vault_id),127),
    v_number,
    v_key,v_req,v_ip,p_payload->>'access_token_sha256')
  returning * into o;

  if v_kind='test' then
    update public.feya_pay_provider_v1 set test_order_id=o.order_id where id=1;
  end if;
  return jsonb_build_object('ok',true,'replayed',false,'order_id',o.order_id,'order_number',o.order_number,
    'status',o.status,'provider_order_id',null,'total_minor',o.total_minor,
    'invoice_id',o.invoice_id,'custom_id',o.custom_id);
end $$;

create function public.feya_pay_order_attach_provider_v1(p_order_id uuid,p_provider_order_id text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o public.feya_pay_orders_v1%rowtype;
begin
  if p_provider_order_id is null or p_provider_order_id !~ '^[A-Za-z0-9-]{6,64}$' then
    raise exception 'feya_pay_provider_order_invalid';
  end if;
  select * into o from public.feya_pay_orders_v1 where order_id=p_order_id for update;
  if not found then return jsonb_build_object('ok',false,'code','order_not_found'); end if;
  if o.provider_order_id is not null and o.provider_order_id<>p_provider_order_id then
    return jsonb_build_object('ok',false,'code','provider_order_conflict');
  end if;
  update public.feya_pay_orders_v1 set provider_order_id=p_provider_order_id,updated_at=now()
   where order_id=p_order_id;
  return jsonb_build_object('ok',true);
end $$;

-- Server-side order facts needed to create/verify provider payments (no PII except
-- what PayPal itself needs, which is inside the snapshot the server already wrote).
create function public.feya_pay_order_get_v1(p_order_id uuid,p_provider_order_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o public.feya_pay_orders_v1%rowtype;
begin
  if p_order_id is not null then
    select * into o from public.feya_pay_orders_v1 where order_id=p_order_id;
  elsif p_provider_order_id is not null then
    select * into o from public.feya_pay_orders_v1 where provider_order_id=p_provider_order_id;
  end if;
  if o.order_id is null then return jsonb_build_object('ok',false,'code','order_not_found'); end if;
  return jsonb_build_object('ok',true,'order_id',o.order_id,'order_number',o.order_number,'kind',o.kind,
    'status',o.status,'engine',o.engine,'environment',o.environment,'config_version',o.config_version,
    'currency',o.currency,'total_minor',o.total_minor,'merchandise_minor',o.merchandise_minor,
    'extras_minor',o.extras_minor,'shipping_minor',o.shipping_minor,'remote_minor',o.remote_minor,
    'handling_minor',o.handling_minor,'snapshot',o.snapshot,
    'expected_payee_email',o.expected_payee_email,'expected_payee_merchant_id',o.expected_payee_merchant_id,
    'custom_id',o.custom_id,'invoice_id',o.invoice_id,
    'provider_order_id',o.provider_order_id,'capture_id',o.capture_id,'paid_at',o.paid_at,
    'created_at',o.created_at);
end $$;

create function public.feya_pay_order_id_by_invoice_v1(p_invoice_id text)
returns uuid language sql stable security definer set search_path='' as $$
  select o.order_id from public.feya_pay_orders_v1 o where o.invoice_id=p_invoice_id
$$;

-- ---------------------------------------------------------------------------
-- Payment confirmation (PayPal capture API / webhook / IPN), idempotent.
-- ---------------------------------------------------------------------------
create function public.feya_pay_record_payment_v1(p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  o public.feya_pay_orders_v1%rowtype;
  p public.feya_pay_provider_v1%rowtype;
  v_txn text; v_status text; v_amount bigint; v_currency text; v_payee text; v_merchant text;
  v_source text; v_env text; v_reason text := null; v_matched boolean; v_new_status text;
  v_existing public.feya_pay_transactions_v1%rowtype;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'feya_pay_payment_invalid'; end if;
  v_txn := p_payload->>'transaction_id';
  v_status := upper(coalesce(p_payload->>'status',''));
  v_amount := (p_payload->>'amount_minor')::bigint;
  v_currency := upper(coalesce(p_payload->>'currency',''));
  v_payee := nullif(lower(btrim(coalesce(p_payload->>'payee_email',''))),'');
  v_merchant := nullif(btrim(coalesce(p_payload->>'payee_merchant_id','')),'');
  v_source := p_payload->>'source';
  v_env := p_payload->>'environment';
  if v_txn is null or v_txn !~ '^[A-Za-z0-9-]{6,64}$' or v_amount is null or v_amount<0
     or v_currency !~ '^[A-Z]{3}$' or v_source not in ('capture_api','order_api','webhook','ipn')
     or v_env not in ('sandbox','live')
     or v_status not in ('COMPLETED','PENDING','DECLINED','FAILED') then
    raise exception 'feya_pay_payment_invalid';
  end if;

  if (p_payload->>'order_id') is not null then
    select * into o from public.feya_pay_orders_v1 where order_id=(p_payload->>'order_id')::uuid for update;
  else
    select * into o from public.feya_pay_orders_v1 where provider_order_id=p_payload->>'provider_order_id' for update;
  end if;
  if not found then return jsonb_build_object('ok',false,'code','order_not_found'); end if;

  if o.engine='paypal_checkout' and (p_payload->>'provider_order_id') is distinct from o.provider_order_id then
    v_reason := 'provider_order_mismatch';
  elsif o.environment<>v_env then v_reason := 'environment_mismatch';
  elsif v_currency<>o.currency then v_reason := 'currency_mismatch';
  elsif v_amount<>o.total_minor then v_reason := 'amount_mismatch';
  elsif (p_payload->>'invoice_id') is distinct from o.invoice_id then v_reason := 'invoice_mismatch';
  elsif (p_payload->>'custom_id') is distinct from o.custom_id then v_reason := 'custom_reference_mismatch';
  elsif v_payee is not null and v_payee is distinct from o.expected_payee_email
        and (v_merchant is null or v_merchant is distinct from o.expected_payee_merchant_id) then
    v_reason := 'payee_mismatch';
  elsif v_payee is null and (v_merchant is null or v_merchant is distinct from o.expected_payee_merchant_id) then
    v_reason := 'payee_unknown';
  end if;
  v_matched := v_reason is null;

  select * into v_existing from public.feya_pay_transactions_v1
   where environment=v_env and kind='capture' and provider_txn_id=v_txn for update;
  if found then
    if v_existing.order_id is distinct from o.order_id then
      return jsonb_build_object('ok',false,'code','transaction_bound_to_other_order');
    end if;
    -- Status only moves forward (PENDING -> COMPLETED); never regress a completed capture.
    if v_existing.status<>'COMPLETED' then
      update public.feya_pay_transactions_v1 set status=v_status,amount_minor=v_amount,
        matched=v_matched,mismatch_reason=v_reason,updated_at=now()
       where transaction_id=v_existing.transaction_id;
    end if;
  else
    insert into public.feya_pay_transactions_v1(order_id,environment,kind,provider_txn_id,status,
      amount_minor,currency,payee_email,payee_merchant_id,matched,mismatch_reason,source)
    values(o.order_id,v_env,'capture',v_txn,v_status,v_amount,v_currency,v_payee,v_merchant,
      v_matched,v_reason,v_source);
  end if;

  if not v_matched then
    if o.status<>'paid' then
      update public.feya_pay_orders_v1 set status='needs_review',review_reason=v_reason,updated_at=now()
       where order_id=o.order_id;
    end if;
    perform public.feya_pay_audit_write_v1('provider',v_source,'payment_mismatch',
      jsonb_build_object('order_number',o.order_number,'reason',v_reason,'status',v_status));
    return jsonb_build_object('ok',true,'outcome','mismatch','reason',v_reason,
      'order_number',o.order_number,'status',case when o.status='paid' then 'paid' else 'needs_review' end,'kind',o.kind);
  end if;

  if v_status='COMPLETED' then
    if o.status='paid' then
      if o.capture_id is distinct from v_txn then
        -- A second, different successful payment for one order: never silently accept.
        update public.feya_pay_orders_v1 set review_reason='duplicate_payment:'||v_txn,updated_at=now()
         where order_id=o.order_id;
        perform public.feya_pay_audit_write_v1('provider',v_source,'duplicate_payment',
          jsonb_build_object('order_number',o.order_number,'capture',v_txn));
        return jsonb_build_object('ok',true,'outcome','duplicate_payment','order_number',o.order_number,
          'status','paid','kind',o.kind);
      end if;
      return jsonb_build_object('ok',true,'outcome','already_paid','order_number',o.order_number,
        'status','paid','kind',o.kind);
    end if;
    if o.status in ('refunded','partially_refunded','reversed') then
      return jsonb_build_object('ok',true,'outcome','already_settled','order_number',o.order_number,
        'status',o.status,'kind',o.kind);
    end if;
    update public.feya_pay_orders_v1 set status='paid',paid_minor=v_amount,paid_at=now(),
      capture_id=v_txn,review_reason=null,updated_at=now()
     where order_id=o.order_id;
    if o.kind='test' then
      select * into p from public.feya_pay_provider_v1 where id=1 for update;
      if p.config_version=o.config_version and p.environment=o.environment then
        update public.feya_pay_provider_v1 set test_order_id=o.order_id,
          test_verified_version=o.config_version,test_environment=o.environment,test_paid_at=now(),
          last_error=null,updated_at=now()
         where id=1;
      end if;
    end if;
    perform public.feya_pay_audit_write_v1('provider',v_source,'order_paid',
      jsonb_build_object('order_number',o.order_number,'kind',o.kind,'amount_minor',v_amount,
        'environment',v_env));
    return jsonb_build_object('ok',true,'outcome','paid','order_number',o.order_number,
      'status','paid','kind',o.kind);
  end if;

  v_new_status := case when v_status='PENDING' then 'payment_pending' else 'payment_failed' end;
  if o.status in ('pending_payment','payment_pending','payment_failed','cancelled','needs_review') then
    update public.feya_pay_orders_v1 set status=v_new_status,updated_at=now() where order_id=o.order_id;
  end if;
  return jsonb_build_object('ok',true,'outcome',lower(v_status),'order_number',o.order_number,
    'status',case when o.status in ('pending_payment','payment_pending','payment_failed','cancelled','needs_review')
      then v_new_status else o.status end,'kind',o.kind);
end $$;

-- Refunds and reversals (chargebacks) reported by the provider.
create function public.feya_pay_record_refund_v1(p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  cap public.feya_pay_transactions_v1%rowtype;
  o public.feya_pay_orders_v1%rowtype;
  v_kind text; v_id text; v_parent text; v_env text; v_amount bigint; v_status text; v_total bigint;
begin
  v_kind := p_payload->>'kind'; v_id := p_payload->>'transaction_id';
  v_parent := p_payload->>'capture_id'; v_env := p_payload->>'environment';
  v_amount := (p_payload->>'amount_minor')::bigint; v_status := upper(coalesce(p_payload->>'status',''));
  if v_kind not in ('refund','reversal') or v_id !~ '^[A-Za-z0-9-]{6,64}$'
     or v_parent !~ '^[A-Za-z0-9-]{6,64}$' or v_env not in ('sandbox','live')
     or v_amount is null or v_amount<0 or length(v_status) not between 1 and 40 then
    raise exception 'feya_pay_refund_invalid';
  end if;
  select * into cap from public.feya_pay_transactions_v1
   where environment=v_env and kind='capture' and provider_txn_id=v_parent;
  if not found then return jsonb_build_object('ok',false,'code','capture_not_found'); end if;
  select * into o from public.feya_pay_orders_v1 where order_id=cap.order_id for update;
  insert into public.feya_pay_transactions_v1(order_id,environment,kind,provider_txn_id,parent_txn_id,
    status,amount_minor,currency,matched,source)
  values(o.order_id,v_env,v_kind,v_id,v_parent,v_status,v_amount,coalesce(p_payload->>'currency','EUR'),true,
    coalesce(p_payload->>'source','webhook'))
  on conflict(environment,kind,provider_txn_id) do update set status=excluded.status,
    amount_minor=excluded.amount_minor,updated_at=now();
  if v_kind='reversal' then
    update public.feya_pay_orders_v1 set status='reversed',updated_at=now() where order_id=o.order_id;
  else
    select coalesce(sum(amount_minor),0) into v_total from public.feya_pay_transactions_v1
     where order_id=o.order_id and kind='refund' and status in ('COMPLETED','REFUNDED');
    update public.feya_pay_orders_v1 set refunded_minor=v_total,
      status=case when v_total>=o.total_minor then 'refunded' when v_total>0 then 'partially_refunded' else status end,
      updated_at=now()
     where order_id=o.order_id;
  end if;
  perform public.feya_pay_audit_write_v1('provider',coalesce(p_payload->>'source','webhook'),'order_'||v_kind,
    jsonb_build_object('order_number',o.order_number,'amount_minor',v_amount));
  return jsonb_build_object('ok',true,'order_number',o.order_number);
end $$;

create function public.feya_pay_order_cancel_v1(p_provider_order_id text,p_order_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o public.feya_pay_orders_v1%rowtype;
begin
  if p_order_id is not null then
    select * into o from public.feya_pay_orders_v1 where order_id=p_order_id for update;
  else
    select * into o from public.feya_pay_orders_v1 where provider_order_id=p_provider_order_id for update;
  end if;
  if not found then return jsonb_build_object('ok',false,'code','order_not_found'); end if;
  if o.status in ('pending_payment','payment_failed') then
    update public.feya_pay_orders_v1 set status='cancelled',cancelled_at=now(),updated_at=now()
     where order_id=o.order_id;
    return jsonb_build_object('ok',true,'status','cancelled','order_number',o.order_number,'kind',o.kind);
  end if;
  return jsonb_build_object('ok',true,'status',o.status,'order_number',o.order_number,'kind',o.kind);
end $$;

-- Event de-duplication for webhooks / IPN.
create function public.feya_pay_event_claim_v1(p_event_key text,p_source text,p_event_type text,p_verified boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_rows integer; e public.feya_pay_events_v1%rowtype;
begin
  insert into public.feya_pay_events_v1(event_key,source,event_type,verified)
  values(p_event_key,p_source,left(p_event_type,80),p_verified)
  on conflict(event_key) do nothing;
  get diagnostics v_rows=row_count;
  if v_rows=1 then return jsonb_build_object('ok',true,'first',true); end if;
  select * into e from public.feya_pay_events_v1 where event_key=p_event_key;
  -- A previously failed (unprocessed) delivery may be retried by the provider.
  return jsonb_build_object('ok',true,'first',e.processed_at is null,'outcome',e.outcome);
end $$;

create function public.feya_pay_event_finish_v1(p_event_key text,p_order_id uuid,p_outcome text)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  update public.feya_pay_events_v1 set processed_at=now(),order_id=p_order_id,outcome=left(p_outcome,80)
   where event_key=p_event_key;
end $$;

-- Buyer receipt by opaque access token (no guessable order lookups).
create function public.feya_pay_order_for_buyer_v1(p_access_sha256 text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o public.feya_pay_orders_v1%rowtype;
begin
  if p_access_sha256 !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select * into o from public.feya_pay_orders_v1 where access_token_sha256=p_access_sha256;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'order_number',o.order_number,'kind',o.kind,'status',o.status,
    'currency',o.currency,'total_minor',o.total_minor,'merchandise_minor',o.merchandise_minor,
    'extras_minor',o.extras_minor,'shipping_minor',o.shipping_minor,'remote_minor',o.remote_minor,
    'handling_minor',o.handling_minor,'created_at',o.created_at,'paid_at',o.paid_at,
    'lines',coalesce((select jsonb_agg(jsonb_build_object('title',l->>'title','option',l->>'option_label',
      'color',l->>'color','size',l->>'size','quantity',(l->>'quantity')::integer,
      'line_minor',(l->>'line_minor')::bigint,'image',l->>'image'))
      from jsonb_array_elements(o.snapshot->'lines') l),'[]'::jsonb),
    'extras',coalesce(o.snapshot->'extras','[]'::jsonb),
    'shipping_method',o.snapshot#>>'{delivery,method}',
    'country_code',o.country_code);
end $$;

-- Owner console: full order list including fulfilment details.
create function public.feya_pay_orders_for_owner_v1(p_limit integer,p_include_tests boolean)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'order_id',o.order_id,'order_number',o.order_number,'kind',o.kind,'status',o.status,
    'environment',o.environment,'engine',o.engine,
    'total_minor',o.total_minor,'currency',o.currency,'paid_minor',o.paid_minor,
    'refunded_minor',o.refunded_minor,'review_reason',o.review_reason,
    'buyer_name',o.buyer_name,'buyer_email',o.buyer_email,'country_code',o.country_code,
    'snapshot',o.snapshot,'provider_order_id',o.provider_order_id,'capture_id',o.capture_id,
    'created_at',o.created_at,'paid_at',o.paid_at) order by o.created_at desc),'[]'::jsonb)
  from (select * from public.feya_pay_orders_v1
         where p_include_tests or kind='customer'
         order by created_at desc limit greatest(1,least(coalesce(p_limit,50),200))) o
$$;

create function public.feya_pay_audit_recent_v1(p_limit integer)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('at',a.at,'actor_role',a.actor_role,'actor',a.actor,
    'action',a.action,'details',a.details) order by a.at desc),'[]'::jsonb)
  from (select * from public.feya_pay_audit_v1 order by at desc limit greatest(1,least(coalesce(p_limit,30),100))) a
$$;

-- ---------------------------------------------------------------------------
-- Carry over anything the Seller Online technician already entered in the
-- previous (non-functional) setup panel, and keep a previously issued invitation
-- link working. Nothing is deleted.
-- ---------------------------------------------------------------------------
do $$
declare
  old record; v_email text; v_mode text; v_env text;
begin
  if to_regclass('public.feya_seller_online_payment_setup_v1') is null then return; end if;
  execute 'select * from public.feya_seller_online_payment_setup_v1 where id=1' into old;
  if old is null then return; end if;
  v_mode := old.integration_mode;
  v_env := coalesce(old.paypal_probe_environment,'live');
  v_email := lower(btrim(public.feya_pay_vault_get_v1(old.paypal_email_vault_id)));
  update public.feya_pay_provider_v1 set
    engine=case when v_mode='paypal_standard' then 'paypal_standard' else 'paypal_checkout' end,
    environment=v_env,
    payee_email=case when v_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then v_email end,
    store_key_vault_id=old.personal_key_vault_id,
    store_key_hint=public.feya_pay_hint_v1(public.feya_pay_vault_get_v1(old.personal_key_vault_id)),
    client_id_vault_id=case when old.paypal_client_id_vault_id is not null and old.paypal_client_secret_vault_id is not null then old.paypal_client_id_vault_id end,
    client_secret_vault_id=case when old.paypal_client_id_vault_id is not null and old.paypal_client_secret_vault_id is not null then old.paypal_client_secret_vault_id end,
    client_id_hint=case when old.paypal_client_id_vault_id is not null and old.paypal_client_secret_vault_id is not null
      then public.feya_pay_hint_v1(public.feya_pay_vault_get_v1(old.paypal_client_id_vault_id)) end,
    credential_source=case when old.paypal_client_id_vault_id is not null and old.paypal_client_secret_vault_id is not null then 'installer' else 'none' end,
    updated_by='migration_from_setup_v1',updated_at=now()
  where id=1;
exception when undefined_column or undefined_table then
  null;
end $$;

do $$
begin
  if to_regclass('public.feya_seller_online_setup_grants_v1') is null then return; end if;
  insert into public.feya_pay_access_grants_v1(token_sha256,role,label,created_by,created_at,expires_at)
  select g.token_sha256,'technician','Seller Online (ссылка из прежней панели)','migration',g.created_at,
    greatest(g.expires_at,now()+interval '14 days')
  from public.feya_seller_online_setup_grants_v1 g
  where g.revoked_at is null and g.expires_at>now()-interval '30 days'
  on conflict(token_sha256) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges: service_role only.
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'feya\_pay\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
-- Internal helpers are not part of the server API surface.
revoke execute on function public.feya_pay_vault_put_v1(uuid,text,text) from service_role;
revoke execute on function public.feya_pay_vault_get_v1(uuid) from service_role;
revoke execute on function public.feya_pay_audit_write_v1(text,text,text,jsonb) from service_role;

commit;
