-- TheFEYA Seller Online PayPal OAuth connection verification.
-- This DOES NOT create orders, capture funds, expose vault secrets to browser, or enable checkout.
begin;

alter table public.feya_seller_online_payment_setup_v1
  add column if not exists paypal_probe_started_at timestamptz,
  add column if not exists paypal_probe_verified_at timestamptz,
  add column if not exists paypal_probe_environment text
    check(paypal_probe_environment in ('sandbox','live')),
  add column if not exists paypal_probe_config_updated_at timestamptz;

-- This function is callable ONLY using the server's service_role credential.
-- It returns vault-decrypted provider OAuth inputs exclusively to that server
-- after a valid expiring setup invitation; the HTTP endpoint never returns them.
create function public.feya_seller_online_paypal_credentials_for_probe_v1(p_token_sha256 text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v public.feya_seller_online_payment_setup_v1%rowtype;
  v_id text; v_secret text;
begin
  if p_token_sha256 is null or p_token_sha256 !~ '^[0-9a-f]{64}$'
    then return pg_catalog.jsonb_build_object('ok',false,'code','invalid_invitation'); end if;
  perform 1 from public.feya_seller_online_setup_grants_v1 g
    where g.token_sha256=p_token_sha256 and g.revoked_at is null
      and g.expires_at>now() for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok',false,'code','invalid_invitation');
  end if;
  select * into v from public.feya_seller_online_payment_setup_v1
    where id=1 for update;
  if v.integration_mode <> 'paypal_rest'
    or v.paypal_client_id_vault_id is null
    or v.paypal_client_secret_vault_id is null
    then return pg_catalog.jsonb_build_object('ok',false,'code','credentials_missing'); end if;
  if v.paypal_probe_started_at is not null
    and v.paypal_probe_started_at>now()-interval '30 seconds'
    then return pg_catalog.jsonb_build_object('ok',false,'code','rate_limited'); end if;

  select d.decrypted_secret into v_id
    from vault.decrypted_secrets d where d.id=v.paypal_client_id_vault_id;
  select d.decrypted_secret into v_secret
    from vault.decrypted_secrets d where d.id=v.paypal_client_secret_vault_id;

  if v_id is null or v_secret is null or pg_catalog.length(v_id)<5
    or pg_catalog.length(v_secret)<5
    then return pg_catalog.jsonb_build_object('ok',false,'code','credentials_missing'); end if;

  update public.feya_seller_online_payment_setup_v1
    set paypal_probe_started_at=now() where id=1;

  return pg_catalog.jsonb_build_object(
    'ok',true,'client_id',v_id,'client_secret',v_secret,
    'config_updated_at',v.updated_at
  );
end $$;
revoke all on function public.feya_seller_online_paypal_credentials_for_probe_v1(text)
  from public,anon,authenticated;
grant execute on function public.feya_seller_online_paypal_credentials_for_probe_v1(text)
  to service_role;

create function public.feya_seller_online_paypal_record_probe_v1(
  p_token_sha256 text, p_config_updated_at timestamptz,
  p_environment text, p_verified boolean
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v public.feya_seller_online_payment_setup_v1%rowtype;
begin
  if p_token_sha256 is null or p_token_sha256 !~ '^[0-9a-f]{64}$'
    or p_environment not in ('sandbox','live') or p_verified is null
    then return pg_catalog.jsonb_build_object('ok',false,'code','invalid_probe'); end if;
  perform 1 from public.feya_seller_online_setup_grants_v1 g
    where g.token_sha256=p_token_sha256 and g.revoked_at is null
      and g.expires_at>now() for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok',false,'code','invalid_invitation'); end if;
  select * into v from public.feya_seller_online_payment_setup_v1
    where id=1 for update;
  if v.integration_mode<>'paypal_rest' or v.updated_at is distinct from p_config_updated_at
    or v.paypal_probe_started_at is null
    or v.paypal_probe_started_at<now()-interval '60 seconds'
    then return pg_catalog.jsonb_build_object('ok',false,'code','stale_configuration'); end if;

  update public.feya_seller_online_payment_setup_v1
    set paypal_probe_verified_at=case when p_verified then now() else null end,
        paypal_probe_environment=case when p_verified then p_environment else null end,
        paypal_probe_config_updated_at=case when p_verified then v.updated_at else null end
    where id=1;

  return pg_catalog.jsonb_build_object(
    'ok',true,'verified',p_verified,
    'environment',case when p_verified then p_environment else null end
  );
end $$;
revoke all on function public.feya_seller_online_paypal_record_probe_v1(text,timestamptz,text,boolean)
  from public,anon,authenticated;
grant execute on function public.feya_seller_online_paypal_record_probe_v1(text,timestamptz,text,boolean)
  to service_role;

create function public.feya_seller_online_paypal_probe_status_v1(p_token_sha256 text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v public.feya_seller_online_payment_setup_v1%rowtype;
 v_verified boolean;
begin
 if p_token_sha256 is null or p_token_sha256 !~ '^[0-9a-f]{64}$'
 or not exists(
  select 1 from public.feya_seller_online_setup_grants_v1 g
  where g.token_sha256=p_token_sha256 and g.revoked_at is null
    and g.expires_at>now()
 ) then return pg_catalog.jsonb_build_object('ok',false,'code','invalid_invitation');
 end if;
 select * into v from public.feya_seller_online_payment_setup_v1 where id=1;
 v_verified := coalesce(v.integration_mode='paypal_rest'
   and v.paypal_probe_verified_at is not null
   and v.paypal_probe_config_updated_at=v.updated_at,false);
 return pg_catalog.jsonb_build_object(
  'ok',true,'verified',v_verified,
  'environment',case when v_verified then v.paypal_probe_environment else null end,
  'verified_at',case when v_verified then v.paypal_probe_verified_at else null end,
  'payment_enabled',false,
  'next_step',case when v_verified then 'checkout_integration_and_test_purchase'
    else 'provider_authorization' end
 );
end $$;
revoke all on function public.feya_seller_online_paypal_probe_status_v1(text) from public,anon,authenticated;
grant execute on function public.feya_seller_online_paypal_probe_status_v1(text) to service_role;
commit;
