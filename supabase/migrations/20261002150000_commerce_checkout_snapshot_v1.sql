-- M2 commerce authority: immutable checkout total snapshot.
-- Depends on:
--   commerce_order_intent_v2 (quote-bound merchandise + policy acceptance)
--   commerce_shipping_quote_v1 (server-owned shipping amount)
--
-- This snapshot is provider-neutral and is NOT an order/payment.
-- It computes exact total only from server authority, then stays fail-closed:
-- payment session, order creation and payment remain disabled.

begin;

create table public.feya_commerce_checkout_snapshots_v1(
  checkout_snapshot_id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_sha256 text not null check(request_sha256~'^[0-9a-f]{64}$'),
  order_intent_id uuid not null unique references public.feya_commerce_order_intents_v1(order_intent_id) on delete restrict,
  shipping_quote_receipt_id uuid not null unique references public.feya_commerce_shipping_quote_receipts_v1(shipping_quote_receipt_id) on delete restrict,
  policy_bundle_sha256 text not null check(policy_bundle_sha256~'^[0-9a-f]{64}$'),
  source_release_ref text not null check(length(btrim(source_release_ref)) between 1 and 200),
  currency text not null check(currency~'^[A-Z]{3}$'),
  line_count integer not null check(line_count>0 and line_count<=20),
  merchandise_subtotal_minor bigint not null check(merchandise_subtotal_minor>0 and merchandise_subtotal_minor<=9007199254740991),
  shipping_amount_minor bigint not null check(shipping_amount_minor>=0 and shipping_amount_minor<=9007199254740991),
  total_amount_minor bigint not null check(total_amount_minor>0 and total_amount_minor<=9007199254740991),
  checkout_status text not null default 'provider_pending'
    check(checkout_status in ('provider_pending','cancelled','converted')),
  order_creation_enabled boolean not null default false check(order_creation_enabled=false),
  payment_enabled boolean not null default false check(payment_enabled=false),
  provider_session_enabled boolean not null default false check(provider_session_enabled=false),
  response jsonb not null check(jsonb_typeof(response)='object'),
  created_at timestamptz not null default now(),
  check(total_amount_minor=merchandise_subtotal_minor+shipping_amount_minor)
);

create function public.feya_commerce_checkout_snapshot_history_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'commerce_checkout_snapshot_history_is_immutable';
end $$;

create trigger feya_checkout_snapshot_immutable
  before update or delete on public.feya_commerce_checkout_snapshots_v1
  for each row execute function public.feya_commerce_checkout_snapshot_history_immutable_v1();

create function public.feya_commerce_checkout_snapshot_health_v1() returns jsonb
language plpgsql stable set search_path='' as $$
declare
  ready boolean:=true;
  r text;
begin
  if not exists(
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='feya_commerce_checkout_snapshots_v1'
      and c.relrowsecurity
  ) then ready:=false; end if;

  foreach r in array array['anon','authenticated'] loop
    if has_table_privilege(r,'public.feya_commerce_checkout_snapshots_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      then ready:=false; end if;
  end loop;

  if not has_table_privilege('service_role','public.feya_commerce_checkout_snapshots_v1','SELECT,INSERT')
    or has_table_privilege('service_role','public.feya_commerce_checkout_snapshots_v1',
      'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    then ready:=false; end if;

  if to_regclass('public.feya_commerce_order_intents_v1') is null
    or to_regclass('public.feya_commerce_order_intent_items_v1') is null
    or to_regclass('public.feya_commerce_order_intent_policy_acceptance_v1') is null
    or to_regclass('public.feya_commerce_shipping_quote_receipts_v1') is null
    or to_regclass('public.feya_commerce_quote_receipts_v1') is null
    or to_regclass('public.feya_commerce_offer_heads_v1') is null
    or to_regclass('public.feya_commerce_offer_revisions_v1') is null
    or to_regclass('public.feya_commerce_offer_variant_items_v1') is null
    then ready:=false; end if;

  return jsonb_build_object(
    'contract_version','commerce_checkout_snapshot_v1',
    'ready',ready,
    'client_amounts_accepted',false,
    'quote_receipt_revalidation_required',true,
    'policy_bundle_current_required',true,
    'shipping_quote_required',true,
    'transaction_party_bound',false,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false
  );
end $$;

create function public.feya_commerce_create_checkout_snapshot_v1(p_payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_variable
declare
  v_request_id uuid;
  v_order_intent_id uuid;
  v_shipping_quote_id uuid;
  v_hash text;
  v_intent public.feya_commerce_order_intents_v1%rowtype;
  v_shipping public.feya_commerce_shipping_quote_receipts_v1%rowtype;
  v_policy public.feya_commerce_order_intent_policy_acceptance_v1%rowtype;
  v_existing public.feya_commerce_checkout_snapshots_v1%rowtype;
  v_current_policy jsonb;
  v_line_count integer;
  v_valid_line_count integer;
  v_recomputed_subtotal numeric;
  v_total numeric;
  v_snapshot_id uuid:=gen_random_uuid();
  v_response jsonb;
  k text;
begin
  if not (public.feya_commerce_checkout_snapshot_health_v1()->>'ready')::boolean
    then raise exception 'checkout_snapshot_contract_not_ready'; end if;

  if p_payload is null
    or jsonb_typeof(p_payload)<>'object'
    or octet_length(p_payload::text)>16384
    or (select count(*) from jsonb_object_keys(p_payload))<>4
    then raise exception 'checkout_snapshot_request_invalid'; end if;

  foreach k in array array['contract_version','request_id','order_intent_id','shipping_quote_receipt_id'] loop
    if not p_payload ? k then raise exception 'checkout_snapshot_request_invalid'; end if;
  end loop;
  if exists(
    select 1 from jsonb_object_keys(p_payload) x(k)
    where x.k<>all(array['contract_version','request_id','order_intent_id','shipping_quote_receipt_id'])
  ) then raise exception 'checkout_snapshot_request_invalid'; end if;

  if p_payload->>'contract_version'<>'commerce_checkout_snapshot_v1'
    then raise exception 'checkout_snapshot_request_invalid'; end if;

  foreach k in array array['request_id','order_intent_id','shipping_quote_receipt_id'] loop
    if jsonb_typeof(p_payload->k)<>'string'
      or not ((p_payload->>k)~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      then raise exception 'checkout_snapshot_request_invalid'; end if;
  end loop;

  v_request_id:=(p_payload->>'request_id')::uuid;
  v_order_intent_id:=(p_payload->>'order_intent_id')::uuid;
  v_shipping_quote_id:=(p_payload->>'shipping_quote_receipt_id')::uuid;
  v_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');

  perform pg_advisory_xact_lock(hashtextextended('commerce-checkout-snapshot:'||v_request_id::text,0));

  select * into v_existing
  from public.feya_commerce_checkout_snapshots_v1 s
  where s.request_id=v_request_id;
  if found then
    if v_existing.request_sha256<>v_hash then raise exception 'checkout_snapshot_request_conflict'; end if;
    return v_existing.response||'{"replayed":true}'::jsonb;
  end if;

  select * into v_intent
  from public.feya_commerce_order_intents_v1 i
  where i.order_intent_id=v_order_intent_id;
  if not found then raise exception 'checkout_snapshot_order_intent_not_found'; end if;
  if v_intent.intent_status<>'quote_bound_shipping_pending'
    then raise exception 'checkout_snapshot_order_intent_state_invalid'; end if;

  select * into v_policy
  from public.feya_commerce_order_intent_policy_acceptance_v1 p
  where p.order_intent_id=v_order_intent_id;
  if not found or v_policy.explicit_checkbox is not true
    then raise exception 'checkout_snapshot_policy_missing'; end if;

  v_current_policy:=public.feya_commerce_checkout_policy_bundle_v1();
  if v_policy.policy_bundle_sha256<>v_current_policy->>'bundle_sha256'
    then raise exception 'checkout_snapshot_policy_version_conflict'; end if;

  select * into v_shipping
  from public.feya_commerce_shipping_quote_receipts_v1 q
  where q.shipping_quote_receipt_id=v_shipping_quote_id;
  if not found then raise exception 'checkout_snapshot_shipping_quote_not_found'; end if;
  if v_shipping.order_intent_id<>v_order_intent_id
    then raise exception 'checkout_snapshot_shipping_quote_conflict'; end if;
  if v_shipping.shipping_method<>v_intent.shipping_method
    or v_shipping.currency<>v_intent.currency
    then raise exception 'checkout_snapshot_shipping_quote_conflict'; end if;
  if v_shipping.expires_at is not null and v_shipping.expires_at<=now()
    then raise exception 'checkout_snapshot_shipping_quote_expired'; end if;

  select count(*) into v_line_count
  from public.feya_commerce_order_intent_items_v1 oi
  where oi.order_intent_id=v_order_intent_id;

  select
    count(*),
    sum(q.line_amount_minor)::numeric
  into v_valid_line_count,v_recomputed_subtotal
  from public.feya_commerce_order_intent_items_v1 oi
  join public.feya_commerce_quote_receipts_v1 q
    on q.quote_receipt_id=oi.quote_receipt_id
   and q.offer_revision_id=oi.offer_revision_id
   and q.canonical_product_id=oi.canonical_product_id
   and q.product_revision=oi.product_revision
   and q.variant_id=oi.variant_id
   and q.configuration_price_id=oi.configuration_price_id
   and q.color_id is not distinct from oi.color_id
   and q.size_id is not distinct from oi.size_id
   and q.quantity=oi.quantity
   and q.unit_amount_minor=oi.unit_amount_minor
   and q.line_amount_minor=oi.line_amount_minor
   and q.currency=oi.currency
   and q.price_quote_id=oi.price_quote_id
   and q.price_revision=oi.price_revision
   and q.price_source=oi.price_source
  join public.feya_commerce_offer_heads_v1 h
    on h.canonical_product_id=q.canonical_product_id
   and h.current_offer_revision_id=q.offer_revision_id
  join public.feya_commerce_offer_revisions_v1 o
    on o.offer_revision_id=q.offer_revision_id
   and o.canonical_product_id=q.canonical_product_id
   and o.status='active'
   and o.product_revision=q.product_revision
   and o.release_ref=oi.source_release_ref
  join public.feya_commerce_offer_variant_items_v1 it
    on it.offer_revision_id=q.offer_revision_id
   and it.canonical_product_id=q.canonical_product_id
   and it.variant_id=q.variant_id
   and it.item_status='active'
   and it.configuration_price_id=q.configuration_price_id
   and it.color_id is not distinct from q.color_id
   and it.size_id is not distinct from q.size_id
   and it.amount_minor=q.unit_amount_minor
   and it.currency=q.currency
   and it.price_quote_id=q.price_quote_id
   and it.price_revision=q.price_revision
   and it.price_source=q.price_source
  where oi.order_intent_id=v_order_intent_id
    and (q.expires_at is null or q.expires_at>now());

  if v_line_count<1 or v_line_count<>v_valid_line_count
    then raise exception 'checkout_snapshot_quote_not_current'; end if;
  if v_recomputed_subtotal is null
    or v_recomputed_subtotal<>v_intent.merchandise_subtotal_minor
    then raise exception 'checkout_snapshot_subtotal_conflict'; end if;

  v_total:=v_recomputed_subtotal+v_shipping.amount_minor;
  if v_total<1 or v_total>9007199254740991 or v_total<>trunc(v_total)
    then raise exception 'checkout_snapshot_total_overflow'; end if;

  v_response:=jsonb_build_object(
    'contract_version','commerce_checkout_snapshot_v1',
    'checkout_snapshot_id',v_snapshot_id,
    'request_id',v_request_id,
    'order_intent_id',v_order_intent_id,
    'shipping_quote_receipt_id',v_shipping_quote_id,
    'policy_bundle_sha256',v_policy.policy_bundle_sha256,
    'source_release_ref',v_intent.source_release_ref,
    'currency',v_intent.currency,
    'line_count',v_line_count,
    'merchandise_subtotal_minor',v_recomputed_subtotal::bigint,
    'shipping_amount_minor',v_shipping.amount_minor,
    'total_amount_minor',v_total::bigint,
    'checkout_status','provider_pending',
    'transaction_party_bound',false,
    'order_creation_enabled',false,
    'payment_enabled',false,
    'provider_session_enabled',false,
    'replayed',false
  );

  insert into public.feya_commerce_checkout_snapshots_v1(
    checkout_snapshot_id,request_id,request_sha256,order_intent_id,shipping_quote_receipt_id,
    policy_bundle_sha256,source_release_ref,currency,line_count,merchandise_subtotal_minor,
    shipping_amount_minor,total_amount_minor,response
  ) values(
    v_snapshot_id,v_request_id,v_hash,v_order_intent_id,v_shipping_quote_id,
    v_policy.policy_bundle_sha256,v_intent.source_release_ref,v_intent.currency,v_line_count,
    v_recomputed_subtotal::bigint,v_shipping.amount_minor,v_total::bigint,v_response
  );

  return v_response;
end $$;

do $$
declare p text;
begin
  alter table public.feya_commerce_checkout_snapshots_v1 enable row level security;
  revoke all on public.feya_commerce_checkout_snapshots_v1
    from public,anon,authenticated,service_role;
  grant select,insert on public.feya_commerce_checkout_snapshots_v1 to service_role;

  foreach p in array array[
    'feya_commerce_checkout_snapshot_history_immutable_v1()',
    'feya_commerce_checkout_snapshot_health_v1()',
    'feya_commerce_create_checkout_snapshot_v1(jsonb)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
    execute 'grant execute on function public.'||p||' to service_role';
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
