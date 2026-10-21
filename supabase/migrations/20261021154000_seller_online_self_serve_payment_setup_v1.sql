-- TheFEYA: external Seller Online payment setup, *not* live checkout.
-- Grant is a random, nonguessable invitation. Only its SHA-256 is stored.
-- Provider inputs are persisted into Supabase Vault (encrypted); no secret
-- plaintext is returned to browser, owner UI, repository, or build logs.
begin;

create table public.feya_seller_online_setup_grants_v1 (
  token_sha256 text primary key check(token_sha256 ~ '^[0-9a-f]{64}$'),
  purpose text not null default 'seller_online_payment_setup'
    check(purpose = 'seller_online_payment_setup'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check(expires_at > created_at)
);
create index feya_seller_online_setup_grants_expiry_v1
  on public.feya_seller_online_setup_grants_v1(expires_at);

create table public.feya_seller_online_payment_setup_v1 (
  id smallint primary key default 1 check(id = 1),
  integration_mode text not null default 'unselected' check(
    integration_mode in ('unselected','paypal_standard','paypal_rest','seller_online_api_v2','hosted_redirect')
  ),
  paypal_email_vault_id uuid,
  personal_key_vault_id uuid,
  paypal_client_id_vault_id uuid,
  paypal_client_secret_vault_id uuid,
  seller_api_key_vault_id uuid,
  seller_webhook_url_vault_id uuid,
  connection_status text not null default 'awaiting_setup'
    check(connection_status in ('awaiting_setup','configuration_saved_not_verified')),
  live_payment_enabled boolean not null default false check(live_payment_enabled=false),
  payment_session_enabled boolean not null default false check(payment_session_enabled=false),
  order_submission_enabled boolean not null default false check(order_submission_enabled=false),
  updated_at timestamptz not null default now()
);

alter table public.feya_seller_online_setup_grants_v1 enable row level security;
alter table public.feya_seller_online_payment_setup_v1 enable row level security;
revoke all on public.feya_seller_online_setup_grants_v1 from public,anon,authenticated;
revoke all on public.feya_seller_online_payment_setup_v1 from public,anon,authenticated;
grant select,insert,update on public.feya_seller_online_setup_grants_v1 to service_role;
grant select,insert,update on public.feya_seller_online_payment_setup_v1 to service_role;

create function public.feya_seller_online_setup_status_v1(p_token_sha256 text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v public.feya_seller_online_payment_setup_v1%rowtype;
begin
  if p_token_sha256 is null or p_token_sha256 !~ '^[0-9a-f]{64}$'
  or not exists (
    select 1 from public.feya_seller_online_setup_grants_v1 g
    where g.token_sha256 = p_token_sha256
      and g.revoked_at is null and g.expires_at > now()
  ) then
    return pg_catalog.jsonb_build_object('ok',false,'code','invalid_or_expired_invitation');
  end if;
  select * into v from public.feya_seller_online_payment_setup_v1 where id=1;
  return pg_catalog.jsonb_build_object(
    'ok',true,
    'mode',coalesce(v.integration_mode,'unselected'),
    'status',coalesce(v.connection_status,'awaiting_setup'),
    'paypal_email_set',v.paypal_email_vault_id is not null,
    'personal_key_set',v.personal_key_vault_id is not null,
    'paypal_client_id_set',v.paypal_client_id_vault_id is not null,
    'paypal_client_secret_set',v.paypal_client_secret_vault_id is not null,
    'seller_api_key_set',v.seller_api_key_vault_id is not null,
    'seller_webhook_url_set',v.seller_webhook_url_vault_id is not null,
    'live_payment_enabled',false,
    'updated_at',v.updated_at
  );
end $$;
revoke all on function public.feya_seller_online_setup_status_v1(text) from public,anon,authenticated;
grant execute on function public.feya_seller_online_setup_status_v1(text) to service_role;

create function public.feya_seller_online_setup_save_v1(p_token_sha256 text, p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v public.feya_seller_online_payment_setup_v1%rowtype;
  mode_input text;
  pair record;
  prior_id uuid;
  fresh_id uuid;
  keyname text;
  cleaned text;
  fields constant text[] := array[
    'mode','paypal_email','personal_key','paypal_client_id','paypal_client_secret',
    'seller_api_key','seller_webhook_url'
  ];
begin
  if p_token_sha256 is null or p_token_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'seller_online_setup_invalid_or_expired_invitation';
  end if;
  perform 1 from public.feya_seller_online_setup_grants_v1 g
    where g.token_sha256=p_token_sha256 and g.revoked_at is null
      and g.expires_at>now() for update;
  if not found then raise exception 'seller_online_setup_invalid_or_expired_invitation'; end if;

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object'
     or pg_catalog.octet_length(p_payload::text) > 7000
     or (p_payload-fields) <> '{}'::jsonb
     or not (p_payload ? 'mode') then
    raise exception 'seller_online_setup_payload_invalid';
  end if;
  mode_input := p_payload->>'mode';
  if mode_input not in ('paypal_standard','paypal_rest','seller_online_api_v2','hosted_redirect') then
    raise exception 'seller_online_setup_mode_invalid';
  end if;
  -- No arbitrary PHP/JavaScript/upload, executable code, external requests, or payment activation.
  for pair in select key,value from pg_catalog.jsonb_each_text(p_payload) loop
    if pair.key<>'mode' then
      if pair.value is null or pg_catalog.length(pair.value)>600
        or pair.value ~ '[[:cntrl:]]' then
        raise exception 'seller_online_setup_field_invalid';
      end if;
    end if;
  end loop;
  if coalesce(p_payload->>'paypal_email','')<>'' and
    (p_payload->>'paypal_email') !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    then raise exception 'seller_online_setup_email_invalid';
  end if;
  if coalesce(p_payload->>'seller_webhook_url','')<>'' and not (
    p_payload->>'seller_webhook_url' ~* '^https://([A-Za-z0-9-]+\.)*seller-online\.com(/|$)'
  ) then
    raise exception 'seller_online_setup_webhook_domain_invalid';
  end if;
  insert into public.feya_seller_online_payment_setup_v1(id)
    values (1) on conflict (id) do nothing;
  select * into v from public.feya_seller_online_payment_setup_v1 where id=1 for update;

  for pair in select key,value from pg_catalog.jsonb_each_text(p_payload)
    where key <> 'mode' and value<>'' loop
    keyname := pair.key;
    cleaned := btrim(pair.value);
    case keyname
      when 'paypal_email' then prior_id := v.paypal_email_vault_id;
      when 'personal_key' then prior_id := v.personal_key_vault_id;
      when 'paypal_client_id' then prior_id := v.paypal_client_id_vault_id;
      when 'paypal_client_secret' then prior_id := v.paypal_client_secret_vault_id;
      when 'seller_api_key' then prior_id := v.seller_api_key_vault_id;
      when 'seller_webhook_url' then prior_id := v.seller_webhook_url_vault_id;
      else raise exception 'seller_online_setup_field_invalid';
    end case;
    if prior_id is null then
      select vault.create_secret(cleaned,
        'feya_seller_online_'||keyname||'_'||replace(gen_random_uuid()::text,'-',''),
        'Seller Online partner entered; no live checkout') into fresh_id;
    else
      perform vault.update_secret(prior_id,cleaned);
      fresh_id := prior_id;
    end if;
    case keyname
      when 'paypal_email' then v.paypal_email_vault_id := fresh_id;
      when 'personal_key' then v.personal_key_vault_id := fresh_id;
      when 'paypal_client_id' then v.paypal_client_id_vault_id := fresh_id;
      when 'paypal_client_secret' then v.paypal_client_secret_vault_id := fresh_id;
      when 'seller_api_key' then v.seller_api_key_vault_id := fresh_id;
      when 'seller_webhook_url' then v.seller_webhook_url_vault_id := fresh_id;
    end case;
  end loop;
  update public.feya_seller_online_payment_setup_v1
    set integration_mode = mode_input,
        paypal_email_vault_id=v.paypal_email_vault_id,
        personal_key_vault_id=v.personal_key_vault_id,
        paypal_client_id_vault_id=v.paypal_client_id_vault_id,
        paypal_client_secret_vault_id=v.paypal_client_secret_vault_id,
        seller_api_key_vault_id=v.seller_api_key_vault_id,
        seller_webhook_url_vault_id=v.seller_webhook_url_vault_id,
        connection_status='configuration_saved_not_verified',
        updated_at=now()
    where id=1;
  -- Never return the submitted credential values, vault references or payment identifiers.
  return public.feya_seller_online_setup_status_v1(p_token_sha256);
end $$;
revoke all on function public.feya_seller_online_setup_save_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.feya_seller_online_setup_save_v1(text,jsonb) to service_role;

insert into public.feya_seller_online_payment_setup_v1 (id) values (1)
  on conflict (id) do nothing;
commit;
