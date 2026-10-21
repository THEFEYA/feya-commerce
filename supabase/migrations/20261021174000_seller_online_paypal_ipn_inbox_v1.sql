-- Verified Seller Online PayPal Standard IPN receipt inbox.
-- Safe staging of provider proof. No order is bound, no payment is marked paid.
-- No buyer names, addresses, email, phone, card data or raw PayPal IPN retained.
begin;
create table public.feya_seller_online_paypal_ipn_inbox_v1(
  event_sha256 text primary key check(event_sha256 ~ '^[0-9a-f]{64}$'),
  txn_sha256 text not null check(txn_sha256 ~ '^[0-9a-f]{64}$'),
  invoice_id uuid not null,
  amount_minor bigint not null check(amount_minor>0 and amount_minor<9007199254740991),
  currency text not null default 'EUR' check(currency='EUR'),
  environment text not null check(environment in ('sandbox','live')),
  verified_by_paypal boolean not null default true check(verified_by_paypal=true),
  order_bound boolean not null default false check(order_bound=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  added_at timestamptz not null default now()
);
create index feya_seller_online_ipn_invoice_v1
  on public.feya_seller_online_paypal_ipn_inbox_v1(invoice_id,added_at);
create index feya_seller_online_ipn_txn_v1
  on public.feya_seller_online_paypal_ipn_inbox_v1(txn_sha256);

alter table public.feya_seller_online_paypal_ipn_inbox_v1 enable row level security;
revoke all on public.feya_seller_online_paypal_ipn_inbox_v1 from public,anon,authenticated;
grant select,insert on public.feya_seller_online_paypal_ipn_inbox_v1 to service_role;

create function public.feya_seller_online_record_paypal_ipn_unbound_v1(
  p_event_sha256 text,p_txn_sha256 text,
  p_invoice_id uuid,p_custom text,
  p_receiver_email text,p_amount_minor bigint,
  p_currency text,p_environment text
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_paypal_email text;
  v_store_key text;
  v public.feya_seller_online_payment_setup_v1%rowtype;
  v_rows integer;
begin
  if coalesce(p_event_sha256,'') !~ '^[0-9a-f]{64}$'
    or coalesce(p_txn_sha256,'') !~ '^[0-9a-f]{64}$'
    or p_invoice_id is null
    or p_amount_minor is null or p_amount_minor<=0
    or p_currency is distinct from 'EUR'
    or p_environment not in ('sandbox','live')
    or p_receiver_email is null or pg_catalog.length(p_receiver_email)>320
    or p_custom is null or pg_catalog.length(p_custom)>240
    then return pg_catalog.jsonb_build_object('ok',false,'code','invalid_callback'); end if;

  select * into v from public.feya_seller_online_payment_setup_v1 where id=1;
  if not found or v.integration_mode<>'paypal_standard'
    or v.paypal_email_vault_id is null or v.personal_key_vault_id is null
    then return pg_catalog.jsonb_build_object('ok',false,'code','provider_not_configured'); end if;
  select d.decrypted_secret into v_paypal_email
    from vault.decrypted_secrets d where d.id=v.paypal_email_vault_id;
  select d.decrypted_secret into v_store_key
    from vault.decrypted_secrets d where d.id=v.personal_key_vault_id;
  if v_paypal_email is null or v_store_key is null
    or pg_catalog.lower(pg_catalog.btrim(p_receiver_email))
      is distinct from pg_catalog.lower(pg_catalog.btrim(v_paypal_email))
    or p_custom is distinct from (p_invoice_id::text||';opencart:'||v_store_key)
    then return pg_catalog.jsonb_build_object('ok',false,'code','receiver_or_order_reference_mismatch'); end if;

  insert into public.feya_seller_online_paypal_ipn_inbox_v1(
    event_sha256,txn_sha256,invoice_id,amount_minor,currency,environment
  ) values(
    p_event_sha256,p_txn_sha256,p_invoice_id,p_amount_minor,p_currency,p_environment
  ) on conflict(event_sha256) do nothing;
  get diagnostics v_rows=row_count;
  return pg_catalog.jsonb_build_object(
    'ok',true,'stored',v_rows>0,'replayed',v_rows=0,
    'bound_to_order',false,'payment_enabled',false
  );
end $$;
revoke all on function public.feya_seller_online_record_paypal_ipn_unbound_v1(
  text,text,uuid,text,text,bigint,text,text
) from public,anon,authenticated;
grant execute on function public.feya_seller_online_record_paypal_ipn_unbound_v1(
  text,text,uuid,text,text,bigint,text,text
) to service_role;
commit;